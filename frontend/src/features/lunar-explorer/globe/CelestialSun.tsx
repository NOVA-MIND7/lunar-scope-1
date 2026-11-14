import { memo, Suspense, useMemo, useState } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import {
  Mesh,
  Vector3,
} from 'three';
import { formatLatitude, formatLongitude } from '@/utils/format';
import { vector3ToLatLon } from '@/utils/lunarCoordinates';
import { useGlobeStore } from './globeStore';

const SUN_MODEL_SCALE = 0.0055; // Grand massive glowing star at the center of the solar system

/** Procedural glowing sphere fallback if GLTF is loading or in test environments */
function SunFallback() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[2.75, 32, 32]} />
        <meshBasicMaterial color="#fff0a0" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Sun 3D model loaded from Sun_1_1391000.glb */
function SunModel() {
  const modelUrl = `${import.meta.env.BASE_URL}models/sun.glb`.replace(/\/+/g, '/');
  const gltf = useGLTF(modelUrl);

  const sceneClone = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh;
        if (mesh.material) {
          // Keep the solar surface bright and emissive regardless of external lighting
          const mat = mesh.material as any;
          if ('toneMapped' in mat) mat.toneMapped = false;
          if ('emissive' in mat && 'map' in mat && mat.map) {
            mat.emissiveMap = mat.map;
            mat.emissive = mat.emissive ?? { r: 1, g: 1, b: 1 };
            mat.emissiveIntensity = 1.0;
          }
          mat.needsUpdate = true;
        }
      }
    });
    return clone;
  }, [gltf.scene]);

  return (
    <group>
      <primitive object={sceneClone} scale={SUN_MODEL_SCALE} />
    </group>
  );
}

export const CelestialSun = memo(function CelestialSun({
  sunDirection,
  visible = true,
  position = [0, 0, 0],
}: {
  sunDirection: readonly [number, number, number];
  visible?: boolean;
  position?: readonly [number, number, number];
}) {
  const showSun = useGlobeStore((s) => s.showSun);
  const setFocusTarget = useGlobeStore((s) => s.setFocusTarget);
  const showTelemetryLabels = useGlobeStore((s) => s.showTelemetryLabels);
  const [hovered, setHovered] = useState(false);

  // Position of the Sun in 3D scene space (center of solar system)
  const sunPos = useMemo(
    () => new Vector3(...position),
    [position],
  );

  // Subsolar point on the lunar surface (radius = 1.0)
  const subsolarPos = useMemo(
    () => new Vector3(...sunDirection).normalize(),
    [sunDirection],
  );

  // Subsolar selenographic coordinates
  const subsolarCoords = useMemo(
    () => vector3ToLatLon(subsolarPos),
    [subsolarPos],
  );

  if (!showSun || !visible) return null;

  return (
    <group>
      {/* Celestial Sun Body */}
      <group
        position={sunPos.toArray()}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          setFocusTarget('sun');
          // Focus camera on the illuminated hemisphere of the Moon facing the Sun
          useGlobeStore.getState().setPending(subsolarCoords.latitude_deg, subsolarCoords.longitude_deg, { focus: true });
        }}
      >
        {/* Core 3D Sun Model */}
        <Suspense fallback={<SunFallback />}>
          <SunModel />
        </Suspense>

        {/* 3D Label & Telemetry Badge */}
        {showTelemetryLabels ? (
          <Html position={[0, 3.2, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[35, 0]}>
            <div className="flex flex-col items-center whitespace-nowrap rounded border border-amber-400/60 bg-bg/95 px-2.5 py-1 shadow-lg backdrop-blur">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider text-amber-400">
                <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                THE SUN · ILLUMINATION SOURCE
              </div>
              <div className="font-mono text-[9px] text-fg-muted">
                Subsolar Zenith: {formatLatitude(subsolarCoords.latitude_deg)}, {formatLongitude(subsolarCoords.longitude_deg)}
              </div>
              {hovered ? (
                <div className="mt-0.5 text-[9px] text-cyan font-mono">Click to view illuminated hemisphere</div>
              ) : null}
            </div>
          </Html>
        ) : null}
      </group>
    </group>
  );
});
