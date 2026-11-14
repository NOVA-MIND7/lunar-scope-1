import { memo, Suspense, useMemo, useState } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import {
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { useGlobeStore } from './globeStore';

// Position slightly above the crust and clouds (1.67) so the foundation pad sits cleanly on top
const MOUNT_RADIUS = 1.67;

// Exact surface normal vector situated directly on the North American continent (USA)
// Centered over the United States (Latitude ~+35° N, Longitude ~-100° W)
const USA_SURFACE_NORMAL = new Vector3(1.70, 1.50, 0.80).normalize();

// Balanced, realistic scale so the 70m dish is clearly visible without overwhelming Earth
const DISH_SCALE = 0.0035;
// Base elevation offset so the concrete pedestal rests solidly on Earth's surface
const DISH_BASE_OFFSET_Y = 16.42 * DISH_SCALE;

/** Official NASA 70-meter Deep Space Network Antenna loaded from dsn_dish.glb */
function DSNDishModel() {
  const modelUrl = `${import.meta.env.BASE_URL}models/dsn_dish.glb`.replace(/\/+/g, '/');
  const gltf = useGLTF(modelUrl);

  const sceneClone = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Space-grade clean white reflective coating for 70m parabolic dish
        mesh.material = new MeshStandardMaterial({
          color: '#f8fafc',
          metalness: 0.35,
          roughness: 0.25,
          side: DoubleSide,
        });
      }
    });
    return clone;
  }, [gltf.scene]);

  return (
    <group position={[0, DISH_BASE_OFFSET_Y, 0]}>
      <primitive object={sceneClone} scale={DISH_SCALE} />
    </group>
  );
}

/** High-detail procedural 70-meter dish fallback (matching realistic scale) */
function DSNDishFallback() {
  return (
    <group position={[0, 0.08, 0]} scale={0.42}>
      {/* Octagonal Concrete Pedestal Base */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.12, 24]} />
        <meshStandardMaterial color="#475569" metalness={0.2} roughness={0.8} />
      </mesh>

      {/* Elevation Gantry & Turret Assembly */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.09, 24]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Parabolic Main Reflector Dish */}
      <mesh position={[0, 0.1, 0]} rotation={[0.45, 0, 0]}>
        <coneGeometry args={[0.34, 0.1, 36, 1, true]} />
        <meshStandardMaterial
          color="#f8fafc"
          metalness={0.4}
          roughness={0.2}
          side={DoubleSide}
        />
      </mesh>

      {/* Cassegrain Sub-reflector Feed Horn */}
      <mesh position={[0, 0.22, 0.06]}>
        <coneGeometry args={[0.05, 0.08, 16]} />
        <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Feed Horn Support Struts (Quadripod) */}
      <mesh position={[0.08, 0.16, 0.03]} rotation={[0, 0, -0.4]}>
        <cylinderGeometry args={[0.006, 0.006, 0.2, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[-0.08, 0.16, 0.03]} rotation={[0, 0, 0.4]}>
        <cylinderGeometry args={[0.006, 0.006, 0.2, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

export const DSNDish = memo(function DSNDish() {
  const [hovered, setHovered] = useState(false);
  const showTelemetryLabels = useGlobeStore((s) => s.showTelemetryLabels);

  // Surface position exactly on America (California / Western USA inside user's circle)
  const { position, quaternion } = useMemo(() => {
    const pos = USA_SURFACE_NORMAL.clone().multiplyScalar(MOUNT_RADIUS);
    const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), USA_SURFACE_NORMAL);
    return { position: pos, quaternion: quat };
  }, []);

  return (
    <group
      position={position.toArray()}
      quaternion={quaternion}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* 70 Meter DSN Antenna 3D Model (Prominent Large Scale) */}
      <Suspense fallback={<DSNDishFallback />}>
        <DSNDishModel />
      </Suspense>

      {/* Circular Foundation Launchpad Ring on Earth's crust */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.04, 0.08, 32]} />
        <meshBasicMaterial
          color="#00e5ff"
          transparent
          opacity={0.75}
          side={DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Outer Glow Halo Ring */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.13, 32]} />
        <meshBasicMaterial
          color="#00e5ff"
          transparent
          opacity={0.25}
          side={DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Deep Space High-Power Communication Beam pointing into space */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.008, 0.07, 0.7, 16, 1, true]} />
        <meshBasicMaterial
          color="#00e5ff"
          transparent
          opacity={hovered ? 0.6 : 0.3}
          side={DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* 3D Label & Telemetry Badge */}
      {showTelemetryLabels ? (
        <Html position={[0, 0.55, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[45, 0]}>
          <div className="flex items-center gap-1.5 whitespace-nowrap rounded border border-cyan/60 bg-bg/90 px-1.5 py-0.5 shadow-md backdrop-blur">
            <span className="size-1.5 rounded-full bg-cyan animate-pulse" />
            <span className="font-mono text-[8px] font-bold text-cyan">DSN 01 · 70M DISH</span>
            <span className="font-mono text-[7px] text-fg-muted">USA</span>
          </div>
        </Html>
      ) : null}
    </group>
  );
});
