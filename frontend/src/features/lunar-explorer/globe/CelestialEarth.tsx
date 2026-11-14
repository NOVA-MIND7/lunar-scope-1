import { memo, Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import {
  DoubleSide,
  Group,
  Mesh,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';
import { useGlobeStore } from './globeStore';

const EARTH_RADIUS = 1.65; // Visual size in scene units
const AXIAL_TILT_RAD = (23.5 * Math.PI) / 180; // 23.5 degrees Earth obliquity

/** Fallback procedural sphere if GLTF is loading or in test environments */
function EarthFallback() {
  const [earthTex, setEarthTex] = useState<Texture | null>(null);

  useEffect(() => {
    const loader = new TextureLoader();
    const base = import.meta.env.BASE_URL || '/';
    loader.load(
      `${base}textures/earth_color.png`.replace(/\/+/g, '/'),
      (tex) => {
        tex.colorSpace = SRGBColorSpace;
        setEarthTex(tex);
      },
    );
  }, []);

  return (
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[EARTH_RADIUS, 36, 36]} />
      {earthTex ? (
        <meshStandardMaterial map={earthTex} roughness={0.85} metalness={0.1} />
      ) : (
        <meshStandardMaterial color="#1e40af" roughness={0.7} />
      )}
    </mesh>
  );
}

/** Official NASA 3D Earth Model loaded from Earth_1_12756.glb */
function EarthGLBModel() {
  const modelUrl = `${import.meta.env.BASE_URL}models/earth.glb`.replace(/\/+/g, '/');
  const gltf = useGLTF(modelUrl);

  const sceneClone = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          const mat = mesh.material as any;
          mat.roughness = 0.82;
          mat.metalness = 0.12;
          mat.needsUpdate = true;
        }
      }
    });
    return clone;
  }, [gltf.scene]);

  // Earth_1_12756.glb diameter is 1000 units. Scale to diameter 3.3 (radius 1.65):
  const scale = (EARTH_RADIUS * 2) / 1000;

  return <primitive object={sceneClone} scale={scale} />;
}

export interface CelestialEarthProps {
  position?: readonly [number, number, number];
}

export const CelestialEarth = memo(function CelestialEarth({
  position = [16, 2.2, 0],
}: CelestialEarthProps) {
  const showEarth = useGlobeStore((s) => s.showEarth);
  const autoRotate = useGlobeStore((s) => s.autoRotate);
  const planetarySpeed = useGlobeStore((s) => s.planetaryRotationSpeed);
  const setFocusTarget = useGlobeStore((s) => s.setFocusTarget);

  const earthSpinRef = useRef<Group>(null);
  const cloudsRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [cloudTex, setCloudTex] = useState<Texture | null>(null);

  // Load atmospheric clouds
  useMemo(() => {
    if (typeof window === 'undefined') return;
    const loader = new TextureLoader();
    const base = import.meta.env.BASE_URL || '/';
    loader.load(
      `${base}textures/earth_clouds.png`.replace(/\/+/g, '/'),
      (tex) => {
        tex.colorSpace = SRGBColorSpace;
        setCloudTex(tex);
      },
    );
  }, []);

  // Earth axial spin (thana kerakena) around its 23.5° tilted axis
  useFrame((_, delta) => {
    if (!autoRotate) return;
    const dt = Math.min(delta, 0.1);

    if (earthSpinRef.current) {
      earthSpinRef.current.rotation.y += dt * 0.18 * planetarySpeed;
    }

    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += dt * 0.22 * planetarySpeed;
    }
  });

  if (!showEarth) return null;

  return (
    <group position={[position[0], position[1], position[2]]}>
      {/* 23.5° Axial Tilt Group */}
      <group
        rotation={[AXIAL_TILT_RAD, 0, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          setFocusTarget('earth');
        }}
      >
        {/* Spinning Earth 3D Core Body */}
        <group ref={earthSpinRef}>
          <Suspense fallback={<EarthFallback />}>
            <EarthGLBModel />
          </Suspense>

          {/* Atmospheric Cloud Shell */}
          <mesh ref={cloudsRef} raycast={() => null}>
            <sphereGeometry args={[EARTH_RADIUS * 1.02, 36, 36]} />
            {cloudTex ? (
              <meshStandardMaterial
                map={cloudTex}
                transparent
                opacity={0.65}
                depthWrite={false}
                side={DoubleSide}
              />
            ) : (
              <meshBasicMaterial color="#ffffff" transparent opacity={0.2} depthWrite={false} />
            )}
          </mesh>
        </group>

        {/* Rayleigh Scattering Atmospheric Blue Rim Glow */}
        <mesh raycast={() => null}>
          <sphereGeometry args={[EARTH_RADIUS * 1.05, 32, 32]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.25}
            side={DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* 3D Label & Telemetry Badge */}
        <Html position={[0, EARTH_RADIUS + 0.8, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[35, 0]}>
          <div className="flex flex-col items-center whitespace-nowrap rounded border border-blue-400/60 bg-bg/95 px-2.5 py-1 shadow-lg backdrop-blur">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider text-blue-400">
              <span className="size-2 rounded-full bg-blue-400 animate-pulse" />
              PLANET EARTH · 12,756 KM
            </div>
            <div className="font-mono text-[9px] text-fg-muted">
              Orbiting Sun · Axial Tilt: 23.5°
            </div>
            {hovered ? (
              <div className="mt-0.5 text-[9px] text-cyan font-mono">Click to focus on Earth</div>
            ) : null}
          </div>
        </Html>
      </group>
    </group>
  );
});
