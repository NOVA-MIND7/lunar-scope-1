import { Component, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { latLonToVector3, TEXTURE_YAW, vector3ToLatLon } from '@/utils/lunarCoordinates';
import { isWebGLAvailable } from '@/utils/webgl';

export type MoonTrekLayerMode = 'wac-relief' | 'lola-shade' | 'lola-color';
export type TerrainCameraTarget = 'south-pole' | 'north-pole' | 'near-side' | 'far-side';

export interface SouthPoleDemPoint {
  latitude_deg: number;
  longitude_deg: number;
  elevation_m: number;
  slope_deg: number;
}

interface MoonTrekTerrainGlobeProps {
  layerMode: MoonTrekLayerMode;
  exaggeration: number;
  sunAzimuthDeg: number;
  cameraPreset: { id: number; target: TerrainCameraTarget; zoomDelta?: number };
  selectedLat: number;
  selectedLon: number;
  demSamples: SouthPoleDemPoint[];
  showDemOverlay: boolean;
  onHoverCoords: (coords: { lat: number; lon: number } | null) => void;
  onSelectCoords: (coords: { lat: number; lon: number }) => void;
}

const MOON_RADIUS = 1.85;

class WebGLErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function TerrainCameraRig({
  cameraPreset,
}: {
  cameraPreset: { id: number; target: TerrainCameraTarget; zoomDelta?: number };
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const goalPosRef = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (cameraPreset.id === 0) return;

    if (cameraPreset.zoomDelta && cameraPreset.zoomDelta !== 0) {
      const len = camera.position.length();
      const nextLen = Math.max(2.5, Math.min(8.5, len + cameraPreset.zoomDelta));
      goalPosRef.current = camera.position.clone().normalize().multiplyScalar(nextLen);
      return;
    }

    if (cameraPreset.target === 'south-pole') {
      goalPosRef.current = new THREE.Vector3(0.02, -4.45, 0.45);
    } else if (cameraPreset.target === 'north-pole') {
      goalPosRef.current = new THREE.Vector3(0.02, 4.45, 0.45);
    } else if (cameraPreset.target === 'far-side') {
      goalPosRef.current = new THREE.Vector3(0.1, 0.35, -4.6);
    } else {
      goalPosRef.current = new THREE.Vector3(0.1, 0.35, 4.6);
    }
  }, [cameraPreset, camera]);

  useFrame((_, delta) => {
    if (!goalPosRef.current || !controlsRef.current) return;
    const t = Math.min(1, delta * 5.5);
    camera.position.lerp(goalPosRef.current, t);
    controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), t);
    controlsRef.current.update();
    if (camera.position.distanceTo(goalPosRef.current) < 0.02) {
      goalPosRef.current = null;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.07}
      minDistance={2.45}
      maxDistance={8.5}
      onStart={() => {
        goalPosRef.current = null;
      }}
    />
  );
}

/** Scatter point cloud rendered from bundled South Pole LOLA DEM CSV (`raw data/south_pole_terrain.txt`). */
function SouthPoleDemPointCloud({ samples }: { samples: SouthPoleDemPoint[] }) {
  const { geometry } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    if (samples.length === 0) return { geometry: geo };
    const positions = new Float32Array(samples.length * 3);
    const colors = new Float32Array(samples.length * 3);

    samples.forEach((s, i) => {
      const elevOffset = Math.max(-0.025, Math.min(0.025, (s.elevation_m / 8000) * 0.02));
      const v = latLonToVector3(s.latitude_deg, s.longitude_deg, MOON_RADIUS + 0.015 + elevOffset);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;

      // Color by slope severity: cyan-green (<8°), amber (8-18°), red (>18°)
      if (s.slope_deg <= 8) {
        colors[i * 3] = 0.13;
        colors[i * 3 + 1] = 0.82;
        colors[i * 3 + 2] = 0.65;
      } else if (s.slope_deg <= 18) {
        colors[i * 3] = 0.96;
        colors[i * 3 + 1] = 0.68;
        colors[i * 3 + 2] = 0.12;
      } else {
        colors[i * 3] = 0.94;
        colors[i * 3 + 1] = 0.27;
        colors[i * 3 + 2] = 0.27;
      }
    });

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return { geometry: geo };
  }, [samples]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  if (samples.length === 0) return null;

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.024} vertexColors transparent opacity={0.82} sizeAttenuation />
    </points>
  );
}

function MoonTrekStage({
  layerMode,
  exaggeration,
  sunAzimuthDeg,
  cameraPreset,
  selectedLat,
  selectedLon,
  demSamples,
  showDemOverlay,
  onHoverCoords,
  onSelectCoords,
}: MoonTrekTerrainGlobeProps) {
  const [wacTex, setWacTex] = useState<THREE.Texture | null>(null);
  const [shadeTex, setShadeTex] = useState<THREE.Texture | null>(null);
  const [clrShadeTex, setClrShadeTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const base = import.meta.env.BASE_URL || '/';
    const mkUrl = (name: string) => `${base}textures/${name}`.replace(/\/+/g, '/');

    loader.load(mkUrl('moon_trek_wac.jpg'), (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      setWacTex(t);
    });
    loader.load(mkUrl('moon_trek_lola_shade.jpg'), (t) => {
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 8;
      setShadeTex(t);
    });
    loader.load(mkUrl('moon_trek_lola_clrshade.jpg'), (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      setClrShadeTex(t);
    });
  }, []);

  const activeMap = useMemo(() => {
    if (layerMode === 'lola-color') return clrShadeTex ?? wacTex;
    if (layerMode === 'lola-shade') return shadeTex ?? wacTex;
    return wacTex;
  }, [layerMode, wacTex, shadeTex, clrShadeTex]);

  const sunLightPos = useMemo<[number, number, number]>(() => {
    const rad = (sunAzimuthDeg * Math.PI) / 180;
    // Grazing raking south-polar illumination matching NASA Moon Trek contrast
    return [Math.cos(rad) * 10, -2.8, Math.sin(rad) * 10];
  }, [sunAzimuthDeg]);

  const selectedPos = useMemo(() => {
    const v = latLonToVector3(selectedLat, selectedLon, MOON_RADIUS + 0.028 * Math.max(0.5, exaggeration * 0.4));
    return [v.x, v.y, v.z] as [number, number, number];
  }, [selectedLat, selectedLon, exaggeration]);

  const selectedQuat = useMemo(() => {
    const normal = latLonToVector3(selectedLat, selectedLon, 1).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  }, [selectedLat, selectedLon]);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const c = vector3ToLatLon(e.point);
    onHoverCoords({
      lat: Number(c.latitude_deg.toFixed(2)),
      lon: Number(c.longitude_deg.toFixed(2)),
    });
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    const c = vector3ToLatLon(e.point);
    onSelectCoords({
      lat: Number(c.latitude_deg.toFixed(2)),
      lon: Number(c.longitude_deg.toFixed(2)),
    });
  };

  const dispScale = exaggeration > 0 && shadeTex ? 0.032 * exaggeration : 0;

  return (
    <>
      <color attach="background" args={['#04060c']} />
      <Stars radius={42} depth={24} count={2200} factor={2.6} fade speed={0.1} />

      <ambientLight intensity={0.28} color="#cbd5e1" />
      <directionalLight position={sunLightPos} intensity={2.15} color="#f8fafc" />
      <directionalLight position={[-sunLightPos[0], 4, -sunLightPos[2]]} intensity={0.35} color="#38bdf8" />

      <TerrainCameraRig cameraPreset={cameraPreset} />

      {/* NASA Moon Trek LRO WAC + LOLA Displaced Surface Sphere */}
      <mesh
        rotation={[0, TEXTURE_YAW, 0]}
        onPointerMove={handlePointerMove}
        onPointerOut={() => onHoverCoords(null)}
        onClick={handleClick}
      >
        <sphereGeometry args={[MOON_RADIUS, 160, 120]} />
        {activeMap ? (
          <meshStandardMaterial
            key={`${layerMode}-${Boolean(shadeTex)}`}
            map={activeMap}
            bumpMap={shadeTex}
            bumpScale={0.038 * Math.max(0.4, exaggeration)}
            displacementMap={shadeTex}
            displacementScale={dispScale}
            displacementBias={-dispScale * 0.5}
            roughness={0.9}
            metalness={0.05}
          />
        ) : (
          <meshStandardMaterial key="moon-loading" color="#475569" roughness={0.9} />
        )}
      </mesh>

      {/* Bundled South Pole LOLA DEM Scatter Overlay */}
      {showDemOverlay && <SouthPoleDemPointCloud samples={demSamples} />}

      {/* Active Selected Target Pin */}
      <group position={selectedPos} quaternion={selectedQuat}>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
        <mesh position={[0, 0.13, 0]}>
          <sphereGeometry args={[0.028, 12, 12]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.04, 0.068, 24]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </>
  );
}

export function MoonTrekTerrainGlobe(props: MoonTrekTerrainGlobeProps) {
  const webglOk = useMemo(() => isWebGLAvailable(), []);

  if (!webglOk) {
    return (
      <div className="flex h-full min-h-[460px] items-center justify-center rounded-card border border-line bg-bg/80 p-6 text-center text-sm text-fg-muted">
        WebGL is unavailable in this browser context. Terrain metrics and 360° horizon analysis remain available on the right.
      </div>
    );
  }

  return (
    <WebGLErrorBoundary
      fallback={
        <div className="flex h-full min-h-[460px] items-center justify-center rounded-card border border-danger/40 bg-bg/80 p-6 text-center text-sm text-danger">
          3D NASA Moon Trek terrain viewer failed to initialize. Check WebGL drivers or reload the page.
        </div>
      }
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0.02, -4.45, 0.45], fov: 42, near: 0.1, far: 100 }}
        className="h-full w-full"
      >
        <MoonTrekStage {...props} />
      </Canvas>
    </WebGLErrorBoundary>
  );
}
