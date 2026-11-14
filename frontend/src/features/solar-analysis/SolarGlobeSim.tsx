import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, Line, OrbitControls, Stars, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Compass, Eye, Globe2, Mountain, RotateCcw, Sun } from 'lucide-react';
import {
  latLonToVector3,
  vector3ToLatLon,
} from '@/utils/lunarCoordinates';
import { isWebGLAvailable } from '@/utils/webgl';
import {
  SOLAR_PRESET_SITES,
  type SolarEphemerisPoint,
  type SolarSiteProfile,
} from './solarPhysics';

export type GlobePickTarget = 'A' | 'B';
export type GlobeSimViewMode = 'ORBITAL' | 'TERRAIN_A' | 'TERRAIN_B';

interface SolarGlobeSimProps {
  siteA: SolarSiteProfile;
  siteB: SolarSiteProfile;
  pointA: SolarEphemerisPoint;
  pointB: SolarEphemerisPoint;
  pickTarget: GlobePickTarget;
  onPickTargetChange: (target: GlobePickTarget) => void;
  autoAdvancePick: boolean;
  onToggleAutoAdvance: () => void;
  onPickCoordinates: (target: GlobePickTarget, lat: number, lon: number) => void;
  onSelectPresetSite: (target: GlobePickTarget, siteId: string) => void;
  useTerrainHorizon: boolean;
}

type CameraFocusPreset = {
  id: number;
  position: [number, number, number];
};

const MOON_MODEL_SCALE = 1 / 1.2718640565872192;

function MoonGlbModel({
  onPointerDown,
  onClick,
  onPointerMove,
  onPointerOut,
}: {
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: () => void;
}) {
  const modelUrl = `${import.meta.env.BASE_URL}models/moon.glb`.replace(/\/+/g, '/');
  const gltf = useGLTF(modelUrl);
  const sceneClone = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
        if (mat) {
          mat.roughness = 0.92;
          mat.metalness = 0.04;
          mat.needsUpdate = true;
        }
      }
    });
    return clone;
  }, [gltf.scene]);

  return (
    <primitive
      object={sceneClone}
      scale={MOON_MODEL_SCALE}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
    />
  );
}

function FrontLabel({
  position,
  visible = true,
  children,
  className = '',
}: {
  position: [number, number, number];
  visible?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFrame(({ camera }) => {
    const el = ref.current;
    if (!el) return;
    if (!visible) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    const [x, y, z] = position;
    const len = Math.hypot(x, y, z) || 1;
    const dot = (camera.position.x * x + camera.position.y * y + camera.position.z * z) / len;
    el.style.opacity = dot > len * 0.2 ? '1' : '0.15';
  });

  return (
    <Html position={position} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div
        ref={ref}
        className={`whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider shadow transition-opacity ${className}`}
      >
        {children}
      </div>
    </Html>
  );
}

function SiteBeacon({
  site,
  badge,
  color,
  isSunlit,
  labelsVisible,
}: {
  site: SolarSiteProfile;
  badge: 'A' | 'B';
  color: string;
  isSunlit: boolean;
  labelsVisible: boolean;
}) {
  const pos = useMemo(() => latLonToVector3(site.lat, site.lon, 1.008), [site.lat, site.lon]);
  const normal = useMemo(() => pos.clone().normalize(), [pos]);
  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return q;
  }, [normal]);
  const labelPos = useMemo(
    () => normal.clone().multiplyScalar(1.13).toArray() as [number, number, number],
    [normal],
  );

  return (
    <group>
      <mesh position={pos}>
        <sphereGeometry args={[0.026, 18, 18]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={pos} quaternion={quat}>
        <ringGeometry args={[0.042, 0.062, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>
      <Line
        points={[pos.toArray(), normal.clone().multiplyScalar(1.1).toArray()]}
        color={color}
        lineWidth={1.5}
      />
      <FrontLabel
        position={labelPos}
        visible={labelsVisible}
        className={
          badge === 'A'
            ? 'border-cyan/70 bg-bg/90 text-cyan'
            : 'border-warning/70 bg-bg/90 text-warning'
        }
      >
        {badge}: {site.lat.toFixed(1)}°, {site.lon.toFixed(1)}° {isSunlit ? '☀' : '☾'}
      </FrontLabel>
    </group>
  );
}

function GreatCircleArc({ siteA, siteB }: { siteA: SolarSiteProfile; siteB: SolarSiteProfile }) {
  const points = useMemo(() => {
    const va = latLonToVector3(siteA.lat, siteA.lon, 1).normalize();
    const vb = latLonToVector3(siteB.lat, siteB.lon, 1).normalize();
    const dot = Math.max(-1, Math.min(1, va.dot(vb)));
    const omega = Math.acos(dot);
    const steps = 48;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      let v: THREE.Vector3;
      if (omega < 0.001) {
        v = va.clone();
      } else {
        const sinOmega = Math.sin(omega);
        v = va
          .clone()
          .multiplyScalar(Math.sin((1 - t) * omega) / sinOmega)
          .add(vb.clone().multiplyScalar(Math.sin(t * omega) / sinOmega));
      }
      v.normalize().multiplyScalar(1.012);
      pts.push([v.x, v.y, v.z]);
    }
    return pts;
  }, [siteA.lat, siteA.lon, siteB.lat, siteB.lon]);

  return <Line points={points} color="#38bdf8" lineWidth={1.5} dashed dashSize={0.04} gapSize={0.025} />;
}

const MOON_MODEL_SCALE = 1 / 1.2718640565872192;

/** Authentic NASA 3D Moon model loaded from moon.glb with photorealistic topography */
function Moon3DGLBModel({
  onPointerDown,
  onClick,
  onPointerMove,
  onPointerOut,
}: {
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: () => void;
}) {
  const modelUrl = `${import.meta.env.BASE_URL}models/moon.glb`.replace(/\/+/g, '/');
  const gltf = useGLTF(modelUrl);

  const sceneClone = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          const mat = mesh.material as any;
          mat.roughness = 0.92;
          mat.metalness = 0.04;
          mat.needsUpdate = true;
        }
      }
    });
    return clone;
  }, [gltf.scene]);

  return (
    <primitive
      object={sceneClone}
      scale={MOON_MODEL_SCALE}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
    />
  );
}

function OrbitalMoonScene({
  active,
  siteA,
  siteB,
  pointA,
  pointB,
  pickTarget,
  onPickCoordinates,
  onSelectPresetSite,
  onHoverCoords,
  focusPreset,
}: {
  active: boolean;
  siteA: SolarSiteProfile;
  siteB: SolarSiteProfile;
  pointA: SolarEphemerisPoint;
  pointB: SolarEphemerisPoint;
  pickTarget: GlobePickTarget;
  onPickCoordinates: (target: GlobePickTarget, lat: number, lon: number) => void;
  onSelectPresetSite: (target: GlobePickTarget, siteId: string) => void;
  onHoverCoords: (coords: { lat: number; lon: number } | null) => void;
  focusPreset: CameraFocusPreset | null;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const pointerDownXY = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!active || !focusPreset) return;
    camera.position.set(...focusPreset.position);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [active, focusPreset, camera]);

  const sunVec = useMemo(
    () => latLonToVector3(pointA.subSolarLatDeg, pointA.subSolarLonDeg, 6.5),
    [pointA.subSolarLatDeg, pointA.subSolarLonDeg],
  );
  const sunMarkerPos = useMemo(
    () => sunVec.clone().normalize().multiplyScalar(2.6),
    [sunVec],
  );

  // South pole 80°S reference ring
  const southPolarCircle = useMemo(() => {
    const r = Math.cos((-80 * Math.PI) / 180) * 1.005;
    const y = Math.sin((-80 * Math.PI) / 180) * 1.005;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push([Math.sin(a) * r, y, Math.cos(a) * r]);
    }
    return pts;
  }, []);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    pointerDownXY.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (pointerDownXY.current) {
      const dist = Math.hypot(
        e.clientX - pointerDownXY.current.x,
        e.clientY - pointerDownXY.current.y,
      );
      if (dist > 5) return;
    }
    const coords = vector3ToLatLon(e.point);
    onPickCoordinates(pickTarget, coords.latitude_deg, coords.longitude_deg);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    const coords = vector3ToLatLon(e.point);
    onHoverCoords({
      lat: Number(coords.latitude_deg.toFixed(2)),
      lon: Number(coords.longitude_deg.toFixed(2)),
    });
  };

  return (
    <group visible={active}>
      {active && <color attach="background" args={['#050914']} />}
      {active && <Stars radius={45} depth={30} count={1400} factor={2.2} saturation={0} fade />}
      {active && <ambientLight intensity={0.14} />}
      {active && <directionalLight position={sunVec.toArray()} intensity={2.6} color="#fff7ed" />}

<<<<<<< HEAD
      {/* 3D Moon model (same GLB used across the system) */}
      <Suspense fallback={null}>
        <MoonGlbModel
=======
      {/* 3D Real Moon Model from moon.glb with authentic lunar topography */}
      <Suspense
        fallback={
          <mesh
            rotation={[0, TEXTURE_YAW, 0]}
            onPointerDown={handlePointerDown}
            onClick={handleClick}
            onPointerMove={handlePointerMove}
            onPointerOut={() => onHoverCoords(null)}
          >
            <sphereGeometry args={[1, 64, 64]} />
            <meshStandardMaterial
              map={moonMap}
              bumpMap={moonBump ?? undefined}
              bumpScale={moonBump ? 0.015 : 0}
              color={moonMap ? '#eef2f6' : '#94a3b8'}
              roughness={0.94}
              metalness={0.03}
            />
          </mesh>
        }
      >
        <Moon3DGLBModel
>>>>>>> 31d48e2a7f4c2ee434424eff4bc96e02566a7f3b
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          onPointerMove={handlePointerMove}
          onPointerOut={() => onHoverCoords(null)}
        />
      </Suspense>

      {/* -80°S Polar Reference Ring */}
      <Line points={southPolarCircle} color="#00d9ff" lineWidth={1} transparent opacity={0.45} />

      {/* Preset NASA/ISRO Landing Site Pins */}
      {SOLAR_PRESET_SITES.map((preset) => {
        const isA = !siteA.isCustom && siteA.id === preset.id;
        const isB = !siteB.isCustom && siteB.id === preset.id;
        if (isA || isB) return null;
        const p = latLonToVector3(preset.lat, preset.lon, 1.006);
        return (
          <mesh
            key={preset.id}
            position={p}
            onClick={(e) => {
              e.stopPropagation();
              onSelectPresetSite(pickTarget, preset.id);
            }}
          >
            <sphereGeometry args={[0.016, 12, 12]} />
            <meshBasicMaterial color="#94a3b8" />
          </mesh>
        );
      })}

      {/* Selected Site A & Site B Beacons + Geodesic Arc */}
      <SiteBeacon site={siteA} badge="A" color="#00d9ff" isSunlit={pointA.isSunlit} labelsVisible={active} />
      <SiteBeacon site={siteB} badge="B" color="#ffb547" isSunlit={pointB.isSunlit} labelsVisible={active} />
      <GreatCircleArc siteA={siteA} siteB={siteB} />

      {/* Live Sun Direction Indicator */}
      <mesh position={sunMarkerPos}>
        <sphereGeometry args={[0.11, 24, 24]} />
        <meshBasicMaterial color="#fde047" />
      </mesh>
      <Line
        points={[
          sunMarkerPos.clone().multiplyScalar(0.55).toArray(),
          sunMarkerPos.toArray(),
        ]}
        color="#fde047"
        lineWidth={1.2}
        dashed
        dashSize={0.06}
        gapSize={0.04}
      />

      <OrbitControls
        ref={controlsRef}
        enabled={active}
        enablePan={false}
        minDistance={1.45}
        maxDistance={5.2}
        rotateSpeed={0.65}
        zoomSpeed={0.85}
      />
    </group>
  );
}

/** Deterministic local crater + LOLA ridge heightfield (from AstraRelay Lunar3DView). */
function sampleLocalTerrainHeight(
  worldX: number,
  worldZ: number,
  site: SolarSiteProfile,
  useTerrainHorizon: boolean,
): number {
  const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ);
  const azDeg = ((Math.atan2(worldX, -worldZ) * 180) / Math.PI + 360) % 360;
  const maskIdx = Math.floor(azDeg / 10) % 36;
  const ridgeElDeg = useTerrainHorizon ? (site.terrainMask[maskIdx] ?? 1.5) : 0.15;

  const rimBelt = Math.exp(-Math.pow((distFromCenter - 46) / 16, 2)) * ridgeElDeg * 2.1;
  const craterFieldA =
    Math.sin(worldX * 0.075) * Math.cos(worldZ * 0.075) * 1.4 +
    Math.sin(worldX * 0.15 + 1.2) * Math.sin(worldZ * 0.15 + 0.7) * 0.65;
  const padBlend = Math.min(1, distFromCenter / 10);
  return (rimBelt + craterFieldA) * padBlend;
}

function LocalTerrainShadowScene({
  active,
  site,
  point,
  useTerrainHorizon,
  badge,
}: {
  active: boolean;
  site: SolarSiteProfile;
  point: SolarEphemerisPoint;
  useTerrainHorizon: boolean;
  badge: 'A' | 'B';
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    if (!active) return;
    camera.position.set(0, 24, 38);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [active, camera, badge]);

  const terrainGeometry = useMemo(() => {
    const size = 140;
    const segs = 96;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    if (pos) {
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        pos.setY(i, sampleLocalTerrainHeight(x, z, site, useTerrainHorizon));
      }
      geo.computeVertexNormals();
    }
    return geo;
  }, [site, useTerrainHorizon]);

  useEffect(() => () => terrainGeometry.dispose(), [terrainGeometry]);

  const sunRadAz = (point.sunAz * Math.PI) / 180;
  const sunRadEl = (point.sunEl * Math.PI) / 180;
  const sunDirVec = useMemo(() => {
    const dist = 120;
    return new THREE.Vector3(
      Math.sin(sunRadAz) * Math.cos(sunRadEl) * dist,
      Math.max(-4, Math.sin(sunRadEl) * dist),
      -Math.cos(sunRadAz) * Math.cos(sunRadEl) * dist,
    );
  }, [sunRadAz, sunRadEl]);

  const accentColor = badge === 'A' ? '#00d9ff' : '#ffb547';

  return (
    <group visible={active}>
      {active && <color attach="background" args={['#030712']} />}
      {active && <Stars radius={160} depth={40} count={900} factor={2} saturation={0} fade />}
      {active && <hemisphereLight args={['#cbd5e1', '#0f172a', 0.35]} />}
      {active && (
        <directionalLight
          position={sunDirVec.toArray()}
          intensity={point.isSunlit ? 2.9 : 0.4}
          color={point.isSunlit ? '#fffbeb' : '#64748b'}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={10}
          shadow-camera-far={260}
          shadow-camera-left={-70}
          shadow-camera-right={70}
          shadow-camera-top={70}
          shadow-camera-bottom={-70}
        />
      )}

      {/* Local Lunar Crater & Ridge Terrain */}
      <mesh geometry={terrainGeometry} receiveShadow castShadow>
        <meshStandardMaterial color="#64748b" roughness={0.94} metalness={0.05} />
      </mesh>

      {/* Lander & Vertical Solar Mast at (0, 0) */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.35, 0.55, 2.8, 12]} />
          <meshStandardMaterial color={accentColor} roughness={0.45} metalness={0.4} />
        </mesh>
        <mesh position={[0, 3.1, 0]} castShadow>
          <boxGeometry args={[2.8, 0.14, 1.1]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.3} metalness={0.6} />
        </mesh>
      </group>

      {/* Sun Orb in Sky */}
      <mesh position={sunDirVec.clone().normalize().multiplyScalar(95)}>
        <sphereGeometry args={[3.2, 20, 20]} />
        <meshBasicMaterial color={point.isSunlit ? '#fde047' : '#ef4444'} />
      </mesh>

      <OrbitControls
        ref={controlsRef}
        enabled={active}
        enablePan={false}
        minDistance={12}
        maxDistance={95}
        maxPolarAngle={Math.PI / 2 - 0.04}
      />
    </group>
  );
}

export function SolarGlobeSim({
  siteA,
  siteB,
  pointA,
  pointB,
  pickTarget,
  onPickTargetChange,
  autoAdvancePick,
  onToggleAutoAdvance,
  onPickCoordinates,
  onSelectPresetSite,
  useTerrainHorizon,
}: SolarGlobeSimProps) {
  const webgl = useMemo(() => isWebGLAvailable(), []);
  const [viewMode, setViewMode] = useState<GlobeSimViewMode>('ORBITAL');
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [focusPreset, setFocusPreset] = useState<CameraFocusPreset | null>({
    id: 0,
    position: [0.4, -2.5, 1.4],
  });

  const focusOnSite = (site: SolarSiteProfile) => {
    const pos = latLonToVector3(site.lat, site.lon, 2.75);
    setFocusPreset((prev) => ({
      id: (prev?.id ?? 0) + 1,
      position: [pos.x, pos.y, pos.z],
    }));
  };

  return (
    <div className="panel flex h-full min-h-[470px] flex-col overflow-hidden">
      {/* Top Bar: View Switcher & Dual-Coordinate Picker Mode */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-bg-secondary/90 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode('ORBITAL')}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition ${
              viewMode === 'ORBITAL'
                ? 'bg-cyan/20 text-cyan border border-cyan/60'
                : 'border border-line text-fg-muted hover:text-fg'
            }`}
          >
            <Globe2 className="size-3.5" />
            3D Moon Globe
          </button>
          <button
            type="button"
            onClick={() => setViewMode('TERRAIN_A')}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition ${
              viewMode === 'TERRAIN_A'
                ? 'bg-cyan/20 text-cyan border border-cyan/60'
                : 'border border-line text-fg-muted hover:text-fg'
            }`}
          >
            <Mountain className="size-3.5" />
            Site A Shadows
          </button>
          <button
            type="button"
            onClick={() => setViewMode('TERRAIN_B')}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition ${
              viewMode === 'TERRAIN_B'
                ? 'bg-warning/20 text-warning border border-warning/60'
                : 'border border-line text-fg-muted hover:text-fg'
            }`}
          >
            <Mountain className="size-3.5" />
            Site B Shadows
          </button>
        </div>

        {viewMode === 'ORBITAL' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-fg-muted">Click globe sets:</span>
            <div className="inline-flex rounded border border-line-strong bg-bg/80 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => onPickTargetChange('A')}
                className={`rounded px-2 py-0.5 font-semibold transition ${
                  pickTarget === 'A' ? 'bg-cyan text-bg' : 'text-fg-muted hover:text-fg'
                }`}
              >
                Place A
              </button>
              <button
                type="button"
                onClick={() => onPickTargetChange('B')}
                className={`rounded px-2 py-0.5 font-semibold transition ${
                  pickTarget === 'B' ? 'bg-warning text-bg' : 'text-fg-muted hover:text-fg'
                }`}
              >
                Place B
              </button>
            </div>
            <button
              type="button"
              onClick={onToggleAutoAdvance}
              className={`rounded border px-2 py-0.5 text-[11px] font-mono transition ${
                autoAdvancePick
                  ? 'border-success/60 bg-success/15 text-success'
                  : 'border-line text-fg-dim hover:text-fg'
              }`}
              title="Automatically alternate A → B on each globe click"
            >
              A→B Auto: {autoAdvancePick ? 'ON' : 'OFF'}
            </button>
          </div>
        )}
      </div>

      {/* 3D Viewport */}
      <div className="relative flex-1 min-h-[360px]">
        {!webgl ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-fg-muted">
            WebGL is unavailable in this browser. Use the coordinate inputs to run the solar simulation.
          </div>
        ) : (
          <Canvas shadows camera={{ position: [0.4, -2.5, 1.4], fov: 42 }}>
            <OrbitalMoonScene
              active={viewMode === 'ORBITAL'}
              siteA={siteA}
              siteB={siteB}
              pointA={pointA}
              pointB={pointB}
              pickTarget={pickTarget}
              onPickCoordinates={onPickCoordinates}
              onSelectPresetSite={onSelectPresetSite}
              onHoverCoords={setHoverCoords}
              focusPreset={focusPreset}
            />
            <LocalTerrainShadowScene
              active={viewMode !== 'ORBITAL'}
              site={viewMode === 'TERRAIN_B' ? siteB : siteA}
              point={viewMode === 'TERRAIN_B' ? pointB : pointA}
              useTerrainHorizon={useTerrainHorizon}
              badge={viewMode === 'TERRAIN_B' ? 'B' : 'A'}
            />
          </Canvas>
        )}

        {/* Top-left Live Cursor & Sub-Solar Telemetry HUD */}
        <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1.5">
          <div className="rounded border border-line-strong bg-bg/85 px-2.5 py-1.5 font-mono text-[11px] backdrop-blur">
            <span className="text-warning flex items-center gap-1.5">
              <Sun className="size-3.5" />
              Sub-Solar: {pointA.subSolarLatDeg.toFixed(2)}°, {pointA.subSolarLonDeg.toFixed(1)}°
            </span>
          </div>
          {hoverCoords && viewMode === 'ORBITAL' && (
            <div className="rounded border border-cyan/50 bg-bg/85 px-2.5 py-1 font-mono text-[11px] text-cyan backdrop-blur">
              Cursor: {hoverCoords.lat.toFixed(2)}°, {hoverCoords.lon.toFixed(2)}° (click to set{' '}
              {pickTarget})
            </div>
          )}
          {viewMode !== 'ORBITAL' && (
            <div className="rounded border border-line-strong bg-bg/85 px-2.5 py-1 font-mono text-[11px] text-fg-muted backdrop-blur">
              {viewMode === 'TERRAIN_A' ? 'Site A' : 'Site B'} 3D Terrain Shadows •{' '}
              {useTerrainHorizon ? 'LOLA Horizon Mask Active' : 'Flat 0° Horizon'}
            </div>
          )}
        </div>

        {/* Bottom Camera Controls */}
        {viewMode === 'ORBITAL' && (
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={() =>
                  setFocusPreset((p) => ({ id: (p?.id ?? 0) + 1, position: [0.4, -2.5, 1.4] }))
                }
                className="btn py-1 px-2 text-[11px]"
              >
                <Compass className="size-3" /> South Pole
              </button>
              <button
                type="button"
                onClick={() => focusOnSite(siteA)}
                className="btn py-1 px-2 text-[11px] border-cyan/50 text-cyan"
              >
                <Eye className="size-3" /> Focus A
              </button>
              <button
                type="button"
                onClick={() => focusOnSite(siteB)}
                className="btn py-1 px-2 text-[11px] border-warning/50 text-warning"
              >
                <Eye className="size-3" /> Focus B
              </button>
              <button
                type="button"
                onClick={() =>
                  setFocusPreset((p) => ({ id: (p?.id ?? 0) + 1, position: [0, 0.3, 3.0] }))
                }
                className="btn py-1 px-2 text-[11px]"
              >
                <RotateCcw className="size-3" /> Reset
              </button>
            </div>
            <div className="rounded border border-line bg-bg/80 px-2 py-1 font-mono text-[10px] text-fg-muted">
              Drag: Rotate • Scroll: Zoom • Click Moon/Pins: Select {pickTarget}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
