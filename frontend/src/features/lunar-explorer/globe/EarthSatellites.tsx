import { memo, Suspense, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { useGlobeStore } from './globeStore';

// Center offset of Satellite.obj bounding box: [0.883378, 0, 0]
// Scaling factor to scale 10-unit raw OBJ span down to ~0.20 scene units
const SATELLITE_SCALE = 0.02;
const SATELLITE_CENTER_OFFSET: [number, number, number] = [-0.883378 * SATELLITE_SCALE, 0, 0];

/** Generate a 3D orbital trajectory loop for a given radius, inclination, and nodal longitude */
function useOrbitGeometry(radius: number, inclinationDeg: number, nodeLongitude: number) {
  return useMemo(() => {
    const geometry = new BufferGeometry();
    const points: number[] = [];
    const segments = 120;
    const cosNode = Math.cos(nodeLongitude);
    const sinNode = Math.sin(nodeLongitude);
    const tilt = ((90 - inclinationDeg) * Math.PI) / 180;
    const cosTilt = Math.cos(tilt);
    const sinTilt = Math.sin(tilt);

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x0 = radius * Math.sin(theta);
      const y0 = -radius * Math.cos(theta);
      const z0 = 0;

      const x1 = x0;
      const y1 = y0 * cosTilt - z0 * sinTilt;
      const z1 = y0 * sinTilt + z0 * cosTilt;

      const x = x1 * cosNode - z1 * sinNode;
      const z = x1 * sinNode + z1 * cosNode;
      const y = y1;

      points.push(x, y, z);
    }

    geometry.setAttribute('position', new BufferAttribute(new Float32Array(points), 3));
    return geometry;
  }, [radius, inclinationDeg, nodeLongitude]);
}

/** Compute 3D position vector on an orbital path at angle theta */
function computeOrbitPosition(radius: number, inclinationDeg: number, nodeLongitude: number, theta: number): Vector3 {
  const cosNode = Math.cos(nodeLongitude);
  const sinNode = Math.sin(nodeLongitude);
  const tilt = ((90 - inclinationDeg) * Math.PI) / 180;
  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);

  const x0 = radius * Math.sin(theta);
  const y0 = -radius * Math.cos(theta);
  const z0 = 0;

  const x1 = x0;
  const y1 = y0 * cosTilt - z0 * sinTilt;
  const z1 = y0 * sinTilt + z0 * cosTilt;

  const x = x1 * cosNode - z1 * sinNode;
  const z = x1 * sinNode + z1 * cosNode;
  const y = y1;

  return new Vector3(x, y, z);
}

/** Official 3D Satellite loaded from satellite.obj with space-grade PBR materials */
function SatelliteModel() {
  const modelUrl = `${import.meta.env.BASE_URL}models/satellite.obj`.replace(/\/+/g, '/');
  const obj = useLoader(OBJLoader, modelUrl);

  const sceneClone = useMemo(() => {
    const clone = obj.clone(true);
    clone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.name.includes('Placas')) {
          // Solar panel arrays: deep photovoltaic blue with metallic reflection
          mesh.material = new MeshStandardMaterial({
            color: '#1d4ed8',
            metalness: 0.85,
            roughness: 0.2,
          });
        } else if (mesh.name.includes('Couro')) {
          // MLI thermal insulation blanket: golden amber foil
          mesh.material = new MeshStandardMaterial({
            color: '#d97706',
            metalness: 0.88,
            roughness: 0.25,
          });
        } else if (mesh.name.includes('Antenna')) {
          // High-gain communications dish & antenna boom: clean reflective white/silver
          mesh.material = new MeshStandardMaterial({
            color: '#f8fafc',
            metalness: 0.92,
            roughness: 0.15,
          });
        } else if (mesh.name.includes('Pinos')) {
          // Titanium thrusters and alignment pins
          mesh.material = new MeshStandardMaterial({
            color: '#cbd5e1',
            metalness: 0.9,
            roughness: 0.15,
          });
        } else {
          // Spacecraft main bus chassis
          mesh.material = new MeshStandardMaterial({
            color: '#94a3b8',
            metalness: 0.8,
            roughness: 0.25,
          });
        }
      }
    });
    return clone;
  }, [obj]);

  return (
    <group position={SATELLITE_CENTER_OFFSET}>
      <primitive object={sceneClone} scale={SATELLITE_SCALE} />
    </group>
  );
}

/** Procedural fallback satellite in case OBJ is loading or in test environments */
function SatelliteFallback() {
  return (
    <group>
      {/* Central instrumentation chassis */}
      <mesh>
        <boxGeometry args={[0.07, 0.1, 0.07]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Solar Panel Wings */}
      <mesh position={[0.13, 0, 0]}>
        <boxGeometry args={[0.14, 0.065, 0.006]} />
        <meshStandardMaterial color="#1d4ed8" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.13, 0, 0]}>
        <boxGeometry args={[0.14, 0.065, 0.006]} />
        <meshStandardMaterial color="#1d4ed8" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* High-gain dish antenna */}
      <mesh position={[0, -0.07, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.05, 0.02, 24, 1, true]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.9} roughness={0.2} side={DoubleSide} />
      </mesh>
    </group>
  );
}

/** Dynamic Sensor Beam from Satellite towards Earth surface */
function EarthSensorBeam({
  from,
  to,
  color,
  opacity,
}: {
  from: Vector3;
  to: Vector3;
  color: string;
  opacity: number;
}) {
  const mid = useMemo(() => new Vector3().addVectors(from, to).multiplyScalar(0.5), [from, to]);
  const len = from.distanceTo(to);
  const quat = useMemo(() => {
    const dir = new Vector3().subVectors(to, from).normalize();
    return new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir);
  }, [from, to]);

  const ringQuat = useMemo(() => {
    return new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), to.clone().normalize());
  }, [to]);

  return (
    <group>
      <mesh position={mid.toArray()} quaternion={quat} raycast={() => null}>
        <cylinderGeometry args={[0.01, 0.08, len, 16, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          side={DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={to.toArray()} quaternion={ringQuat} raycast={() => null}>
        <ringGeometry args={[0.04, 0.08, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 2}
          side={DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** 3 Earth Orbital Paths specifications */
const PATH_1 = {
  id: 1 as const,
  name: 'Path 1 · LEO (Low Earth Orbit)',
  shortName: 'PATH 1 · LEO',
  radius: 2.25,
  inclination: 28.5,
  node: 0.0,
  color: '#00e5ff',
  speedMult: 1.25,
  altitude: '450 km',
  period: '93 min',
  velocity: '7.66 km/s',
  purpose: 'Atmospheric & Oceanic Remote Sensing',
};

const PATH_2 = {
  id: 2 as const,
  name: 'Path 2 · SSO (Sun-Synchronous Polar)',
  shortName: 'PATH 2 · SSO',
  radius: 2.65,
  inclination: 98.0,
  node: 2.09,
  color: '#10b981',
  speedMult: 0.95,
  altitude: '850 km',
  period: '102 min',
  velocity: '7.42 km/s',
  purpose: 'Global Multispectral Surface Mapping',
};

const PATH_3 = {
  id: 3 as const,
  name: 'Path 3 · HEO (Molniya High-Inclination)',
  shortName: 'PATH 3 · HEO',
  radius: 3.20,
  inclination: 63.4,
  node: 4.18,
  color: '#f59e0b',
  speedMult: 0.70,
  altitude: '3,200 km',
  period: '195 min',
  velocity: '5.25 km/s',
  purpose: 'Deep Space Telemetry & Lunar Relay',
};

export const EARTH_PATHS = [PATH_1, PATH_2, PATH_3];

export const EarthSatellites = memo(function EarthSatellites() {
  const showEarthSatellites = useGlobeStore((s) => s.showEarthSatellites);
  const showEarthOrbitPath = useGlobeStore((s) => s.showEarthOrbitPath);
  const selectedEarthPath = useGlobeStore((s) => s.selectedEarthPath);
  const setSelectedEarthPath = useGlobeStore((s) => s.setSelectedEarthPath);
  const autoRotate = useGlobeStore((s) => s.autoRotate);
  const planetarySpeed = useGlobeStore((s) => s.planetaryRotationSpeed);
  const showTelemetryLabels = useGlobeStore((s) => s.showTelemetryLabels);

  // Satellite node group references
  const sat1Ref = useRef<Group>(null);
  const sat2Ref = useRef<Group>(null);
  const sat3Ref = useRef<Group>(null);

  // Orbital angles along 3 paths
  const angle1Ref = useRef(0.2);
  const angle2Ref = useRef(2.3);
  const angle3Ref = useRef(4.5);

  const [pos1, setPos1] = useState(() => computeOrbitPosition(PATH_1.radius, PATH_1.inclination, PATH_1.node, 0.2));
  const [pos2, setPos2] = useState(() => computeOrbitPosition(PATH_2.radius, PATH_2.inclination, PATH_2.node, 2.3));
  const [pos3, setPos3] = useState(() => computeOrbitPosition(PATH_3.radius, PATH_3.inclination, PATH_3.node, 4.5));

  const [hoveredPath, setHoveredPath] = useState<number | null>(null);

  // 3 distinct orbital trajectories geometry
  const orbit1Geo = useOrbitGeometry(PATH_1.radius, PATH_1.inclination, PATH_1.node);
  const orbit2Geo = useOrbitGeometry(PATH_2.radius, PATH_2.inclination, PATH_2.node);
  const orbit3Geo = useOrbitGeometry(PATH_3.radius, PATH_3.inclination, PATH_3.node);

  useFrame((_, delta) => {
    if (!showEarthSatellites) return;
    const dt = Math.min(delta, 0.1);
    const baseSpeed = autoRotate ? dt * 0.22 * planetarySpeed : 0;

    // Advance 3 satellites along their respective 3 orbital paths
    angle1Ref.current = (angle1Ref.current + baseSpeed * PATH_1.speedMult) % (Math.PI * 2);
    angle2Ref.current = (angle2Ref.current + baseSpeed * PATH_2.speedMult) % (Math.PI * 2);
    angle3Ref.current = (angle3Ref.current + baseSpeed * PATH_3.speedMult) % (Math.PI * 2);

    const p1 = computeOrbitPosition(PATH_1.radius, PATH_1.inclination, PATH_1.node, angle1Ref.current);
    const p2 = computeOrbitPosition(PATH_2.radius, PATH_2.inclination, PATH_2.node, angle2Ref.current);
    const p3 = computeOrbitPosition(PATH_3.radius, PATH_3.inclination, PATH_3.node, angle3Ref.current);

    if (sat1Ref.current) {
      sat1Ref.current.position.copy(p1);
      sat1Ref.current.lookAt(0, 0, 0);
    }
    if (sat2Ref.current) {
      sat2Ref.current.position.copy(p2);
      sat2Ref.current.lookAt(0, 0, 0);
    }
    if (sat3Ref.current) {
      sat3Ref.current.position.copy(p3);
      sat3Ref.current.lookAt(0, 0, 0);
    }

    setPos1(p1);
    setPos2(p2);
    setPos3(p3);
  });

  if (!showEarthSatellites) return null;

  // Earth radius is 1.65
  const surfacePoint1 = pos1.clone().normalize().multiplyScalar(1.65);
  const surfacePoint2 = pos2.clone().normalize().multiplyScalar(1.65);
  const surfacePoint3 = pos3.clone().normalize().multiplyScalar(1.65);

  return (
    <group>
      {/* 3 Distinct Orbital Trajectory Loops around Earth */}
      {showEarthOrbitPath ? (
        <>
          {/* Path 1: Low Earth Orbit (Cyan) */}
          <lineLoop geometry={orbit1Geo}>
            <lineBasicMaterial
              color="#00e5ff"
              transparent
              opacity={selectedEarthPath === 1 ? 0.75 : 0.35}
              depthWrite={false}
              toneMapped={false}
            />
          </lineLoop>
          {/* Path 2: Polar Sun-Synchronous Orbit (Emerald) */}
          <lineLoop geometry={orbit2Geo}>
            <lineBasicMaterial
              color="#10b981"
              transparent
              opacity={selectedEarthPath === 2 ? 0.75 : 0.35}
              depthWrite={false}
              toneMapped={false}
            />
          </lineLoop>
          {/* Path 3: High-Eccentricity Orbit (Amber) */}
          <lineLoop geometry={orbit3Geo}>
            <lineBasicMaterial
              color="#f59e0b"
              transparent
              opacity={selectedEarthPath === 3 ? 0.75 : 0.35}
              depthWrite={false}
              toneMapped={false}
            />
          </lineLoop>
        </>
      ) : null}

      {/* Dynamic Earth Surface Scan Beams */}
      <EarthSensorBeam
        from={pos1}
        to={surfacePoint1}
        color="#00e5ff"
        opacity={selectedEarthPath === 1 ? 0.35 : 0.15}
      />
      <EarthSensorBeam
        from={pos2}
        to={surfacePoint2}
        color="#10b981"
        opacity={selectedEarthPath === 2 ? 0.35 : 0.15}
      />
      <EarthSensorBeam
        from={pos3}
        to={surfacePoint3}
        color="#f59e0b"
        opacity={selectedEarthPath === 3 ? 0.35 : 0.15}
      />

      {/* SATELLITE 1: PATH 1 (LEO) */}
      <group
        ref={sat1Ref}
        position={pos1.toArray()}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredPath(1);
        }}
        onPointerOut={() => setHoveredPath(null)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedEarthPath(1);
        }}
      >
        <Suspense fallback={<SatelliteFallback />}>
          <SatelliteModel />
        </Suspense>

        {showTelemetryLabels && (hoveredPath === 1 || selectedEarthPath === 1) && (
          <Html position={[0, 0.16, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[40, 0]}>
            <div className="flex items-center gap-1 whitespace-nowrap rounded border border-cyan/60 bg-bg/95 px-1.5 py-0.5 shadow-md backdrop-blur">
              <span className="size-1.5 rounded-full bg-cyan animate-pulse" />
              <span className="font-mono text-[8px] font-bold text-cyan">PATH 1 · LEO</span>
              <span className="font-mono text-[7px] text-fg-muted">450 km · 7.66 km/s</span>
            </div>
          </Html>
        )}
      </group>

      {/* SATELLITE 2: PATH 2 (SSO Polar) */}
      <group
        ref={sat2Ref}
        position={pos2.toArray()}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredPath(2);
        }}
        onPointerOut={() => setHoveredPath(null)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedEarthPath(2);
        }}
      >
        <Suspense fallback={<SatelliteFallback />}>
          <SatelliteModel />
        </Suspense>

        {showTelemetryLabels && (hoveredPath === 2 || selectedEarthPath === 2) && (
          <Html position={[0, 0.16, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[40, 0]}>
            <div className="flex items-center gap-1 whitespace-nowrap rounded border border-emerald-400/60 bg-bg/95 px-1.5 py-0.5 shadow-md backdrop-blur">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[8px] font-bold text-emerald-400">PATH 2 · SSO</span>
              <span className="font-mono text-[7px] text-fg-muted">850 km · 98°</span>
            </div>
          </Html>
        )}
      </group>

      {/* SATELLITE 3: PATH 3 (HEO Molniya) */}
      <group
        ref={sat3Ref}
        position={pos3.toArray()}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredPath(3);
        }}
        onPointerOut={() => setHoveredPath(null)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedEarthPath(3);
        }}
      >
        <Suspense fallback={<SatelliteFallback />}>
          <SatelliteModel />
        </Suspense>

        {showTelemetryLabels && (hoveredPath === 3 || selectedEarthPath === 3) && (
          <Html position={[0, 0.16, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[40, 0]}>
            <div className="flex items-center gap-1 whitespace-nowrap rounded border border-amber-400/60 bg-bg/95 px-1.5 py-0.5 shadow-md backdrop-blur">
              <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-mono text-[8px] font-bold text-amber-400">PATH 3 · HEO</span>
              <span className="font-mono text-[7px] text-fg-muted">3,200 km · 63.4°</span>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
});
