import { memo, Suspense, useMemo, useState } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import {
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';

// Position slightly above the crust and clouds (1.67) so the foundation pad sits cleanly on top
const MOUNT_RADIUS = 1.67;

// Exact surface normal vector for North America (California / Western USA inside the user's circle)
// Latitude ~+37.6° N, Longitude ~-110° W on Earth's surface
const USA_SURFACE_NORMAL = new Vector3(-0.45, 1.0, 1.22).normalize();

// Enlarged, prominent scale so the 70m dish is big, prominent, and clearly visible on America
const DISH_SCALE = 0.0085;
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

/** High-detail procedural 70-meter dish fallback (matching large scale) */
function DSNDishFallback() {
  return (
    <group position={[0, 0.22, 0]}>
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

      {/* Giant 70-Meter Parabolic Main Reflector Dish */}
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
        <ringGeometry args={[0.12, 0.22, 32]} />
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
        <ringGeometry args={[0.22, 0.35, 32]} />
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
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.02, 0.18, 1.4, 16, 1, true]} />
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
      <Html position={[0, 1.25, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[45, 0]}>
        <div className="flex flex-col items-center whitespace-nowrap rounded border border-cyan/80 bg-bg/95 px-3 py-1.5 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider text-cyan">
            <span className="size-2 rounded-full bg-cyan animate-pulse" />
            DSN 01 – GOLDSTONE 70M DISH
          </div>
          <div className="font-mono text-[9px] text-fg-muted">
            California, USA · Deep Space Network
          </div>
          <div className="font-mono text-[9px] text-emerald-400 font-medium">
            Active 70-Meter Antenna (DSS-14) · Lunar Uplink
          </div>
        </div>
      </Html>
    </group>
  );
});
