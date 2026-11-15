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
import { MEAN_LUNAR_RADIUS_KM, vector3ToLatLon } from '@/utils/lunarCoordinates';
import { useGlobeStore } from './globeStore';

// Satellite.obj scale/offset (shared 3D model for all satellites)
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

/** Shared 3D satellite model (satellite.obj) used for all lunar satellites */
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
          mesh.material = new MeshStandardMaterial({ color: '#1d4ed8', metalness: 0.85, roughness: 0.2 });
        } else if (mesh.name.includes('Couro')) {
          mesh.material = new MeshStandardMaterial({ color: '#d97706', metalness: 0.88, roughness: 0.25 });
        } else if (mesh.name.includes('Antenna')) {
          mesh.material = new MeshStandardMaterial({ color: '#f8fafc', metalness: 0.92, roughness: 0.15 });
        } else if (mesh.name.includes('Pinos')) {
          mesh.material = new MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9, roughness: 0.15 });
        } else {
          mesh.material = new MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8, roughness: 0.25 });
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

/** Fallback model while satellite.obj loads */
function SatelliteFallback() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.07, 0.1, 0.07]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0.13, 0, 0]}>
        <boxGeometry args={[0.14, 0.065, 0.006]} />
        <meshStandardMaterial color="#1d4ed8" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.13, 0, 0]}>
        <boxGeometry args={[0.14, 0.065, 0.006]} />
        <meshStandardMaterial color="#1d4ed8" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.07, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.05, 0.02, 24, 1, true]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.9} roughness={0.2} side={DoubleSide} />
      </mesh>
    </group>
  );
}

/** Dynamic Sensor Beam from Satellite to Lunar Surface */
function SensorScanBeam({
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

  return (
    <group>
      <mesh position={mid.toArray()} quaternion={quat} raycast={() => null}>
        <cylinderGeometry args={[0.008, 0.075, len, 16, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} side={DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Surface Scan Footprint Target */}
      <mesh position={to.toArray()} quaternion={useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), to.clone().normalize()), [to])} raycast={() => null}>
        <ringGeometry args={[0.03, 0.06, 24]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 2} side={DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

export const CassiniSatellite = memo(function CassiniSatellite() {
  const showSatellite = useGlobeStore((s) => s.showSatellite);
  const showOrbitPath = useGlobeStore((s) => s.showOrbitPath);
  const showScanBeam = useGlobeStore((s) => s.showScanBeam);
  const satelliteSpeed = useGlobeStore((s) => s.satelliteSpeed);
  const trackSatellite = useGlobeStore((s) => s.trackSatellite);
  const selectedSatelliteId = useGlobeStore((s) => s.selectedSatelliteId);
  const setSelectedSatelliteId = useGlobeStore((s) => s.setSelectedSatelliteId);
  const showTelemetryLabels = useGlobeStore((s) => s.showTelemetryLabels);

  // Group refs for 3 satellites
  const sat1Ref = useRef<Group>(null);
  const sat2Ref = useRef<Group>(null);
  const sat3Ref = useRef<Group>(null);

  // Orbital angles for 3 sides/inclinations
  const angle1Ref = useRef(0);
  const angle2Ref = useRef(1.8);
  const angle3Ref = useRef(3.6);

  const [pos1, setPos1] = useState(() => new Vector3(0, -1.25, 0));
  const [pos2, setPos2] = useState(() => new Vector3(1.35, 0, 0));
  const [pos3, setPos3] = useState(() => new Vector3(0, 0, 1.52));

  const [hoveredSat, setHoveredSat] = useState<string | null>(null);

  // 3 distinct orbital planes
  const orbit1Geo = useOrbitGeometry(1.25, 89.2, 0); // Side 1: Polar orbit (over South Pole)
  const orbit2Geo = useOrbitGeometry(1.38, 65.0, 2.09); // Side 2: Inclined mapping orbit (~120 deg offset)
  const orbit3Geo = useOrbitGeometry(1.52, 30.0, 4.18); // Side 3: Equatorial / Halo orbit (~240 deg offset)

  const lastTelemetryTime = useRef(0);
  const lastTrackCmdTime = useRef(0);

  useFrame((_, delta) => {
    if (!showSatellite) return;
    const dt = Math.min(delta, 0.1);
    const speed = dt * 0.28 * satelliteSpeed;

    // Advance 3 satellites
    angle1Ref.current = (angle1Ref.current + speed) % (Math.PI * 2);
    angle2Ref.current = (angle2Ref.current + speed * 0.88) % (Math.PI * 2);
    angle3Ref.current = (angle3Ref.current + speed * 0.72) % (Math.PI * 2);

    // Compute Satellite 1 (Cassini - Polar)
    const t1 = angle1Ref.current;
    const p1 = new Vector3(1.25 * Math.sin(t1), -1.25 * Math.cos(t1), 0);
    if (sat1Ref.current) {
      sat1Ref.current.position.copy(p1);
      sat1Ref.current.lookAt(0, 0, 0);
    }

    // Compute Satellite 2 (LRO - 65° inclination, offset plane)
    const t2 = angle2Ref.current;
    const tilt2 = ((90 - 65) * Math.PI) / 180;
    const x0_2 = 1.38 * Math.sin(t2);
    const y0_2 = -1.38 * Math.cos(t2);
    const y1_2 = y0_2 * Math.cos(tilt2);
    const z1_2 = y0_2 * Math.sin(tilt2);
    const node2 = 2.09;
    const p2 = new Vector3(
      x0_2 * Math.cos(node2) - z1_2 * Math.sin(node2),
      y1_2,
      x0_2 * Math.sin(node2) + z1_2 * Math.cos(node2),
    );
    if (sat2Ref.current) {
      sat2Ref.current.position.copy(p2);
      sat2Ref.current.lookAt(0, 0, 0);
    }

    // Compute Satellite 3 (Gateway - 30° inclination, offset plane)
    const t3 = angle3Ref.current;
    const tilt3 = ((90 - 30) * Math.PI) / 180;
    const x0_3 = 1.52 * Math.sin(t3);
    const y0_3 = -1.52 * Math.cos(t3);
    const y1_3 = y0_3 * Math.cos(tilt3);
    const z1_3 = y0_3 * Math.sin(tilt3);
    const node3 = 4.18;
    const p3 = new Vector3(
      x0_3 * Math.cos(node3) - z1_3 * Math.sin(node3),
      y1_3,
      x0_3 * Math.sin(node3) + z1_3 * Math.cos(node3),
    );
    if (sat3Ref.current) {
      sat3Ref.current.position.copy(p3);
      sat3Ref.current.lookAt(0, 0, 0);
    }

    setPos1(p1);
    setPos2(p2);
    setPos3(p3);

    // Update active telemetry based on selected satellite
    const now = performance.now();
    if (now - lastTelemetryTime.current > 120) {
      lastTelemetryTime.current = now;

      const activePos = selectedSatelliteId === 'lro' ? p2 : selectedSatelliteId === 'gateway' ? p3 : p1;
      const selenographic = vector3ToLatLon(activePos.clone().normalize());
      const altKm = Math.round((activePos.length() - 1.0) * MEAN_LUNAR_RADIUS_KM * 10) / 10;
      const isSouthPole = selenographic.latitude_deg <= -75;

      useGlobeStore.getState().setSatelliteTelemetry({
        latitude_deg: selenographic.latitude_deg,
        longitude_deg: selenographic.longitude_deg,
        altitude_km: altKm,
        speed_kms: 1.63,
        isOverSouthPole: isSouthPole,
        targetRegion:
          selectedSatelliteId === 'cassini'
            ? isSouthPole ? 'Shackleton / South Pole Core' : 'Polar Mapping Corridor'
            : selectedSatelliteId === 'lro'
              ? 'High-Latitude Science Orbit'
              : 'Near-Rectilinear Halo Transit',
      });

      // Camera dynamic tracking if enabled
      if (trackSatellite && now - lastTrackCmdTime.current > 1200) {
        lastTrackCmdTime.current = now;
        useGlobeStore.getState().issueCommand({
          kind: 'focus',
          latitude_deg: selenographic.latitude_deg,
          longitude_deg: selenographic.longitude_deg,
          distance: 1.8,
        });
      }
    }
  });

  if (!showSatellite) return null;

  return (
    <group>
      {/* Orbit Trajectory Loops for 3 Sides */}
      {showOrbitPath ? (
        <>
          <lineLoop geometry={orbit1Geo}>
            <lineBasicMaterial color="#00e5ff" transparent opacity={0.5} depthWrite={false} toneMapped={false} />
          </lineLoop>
          <lineLoop geometry={orbit2Geo}>
            <lineBasicMaterial color="#10b981" transparent opacity={0.4} depthWrite={false} toneMapped={false} />
          </lineLoop>
          <lineLoop geometry={orbit3Geo}>
            <lineBasicMaterial color="#f59e0b" transparent opacity={0.4} depthWrite={false} toneMapped={false} />
          </lineLoop>
        </>
      ) : null}

      {/* Active Sensor Beams */}
      {showScanBeam ? (
        <>
          <SensorScanBeam from={pos1} to={pos1.clone().normalize()} color="#00e5ff" opacity={selectedSatelliteId === 'cassini' ? 0.35 : 0.18} />
          <SensorScanBeam from={pos2} to={pos2.clone().normalize()} color="#10b981" opacity={selectedSatelliteId === 'lro' ? 0.35 : 0.18} />
          <SensorScanBeam from={pos3} to={pos3.clone().normalize()} color="#f59e0b" opacity={selectedSatelliteId === 'gateway' ? 0.35 : 0.18} />
        </>
      ) : null}

      {/* SATELLITE 1: CASSINI (Polar South Pole Orbit) */}
      <group
        ref={sat1Ref}
        position={pos1.toArray()}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredSat('cassini');
        }}
        onPointerOut={() => setHoveredSat(null)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedSatelliteId('cassini');
          useGlobeStore.getState().toggleSatellitePanel(true);
        }}
      >
        <Suspense fallback={<SatelliteFallback />}>
          <SatelliteModel />
        </Suspense>

        {showTelemetryLabels && (hoveredSat === 'cassini' || selectedSatelliteId === 'cassini') ? (
          <Html position={[0, 0.08, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[40, 0]}>
            <div className="flex flex-col items-center whitespace-nowrap rounded border border-cyan/70 bg-bg/95 px-2 py-0.5 shadow-lg backdrop-blur">
              <span className="font-mono text-xs font-semibold text-cyan">🛰️ CASSINI · POLAR ORBIT</span>
            </div>
          </Html>
        ) : null}
      </group>

      {/* SATELLITE 2: LRO (Inclined Mapping Orbit) */}
      <group
        ref={sat2Ref}
        position={pos2.toArray()}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredSat('lro');
        }}
        onPointerOut={() => setHoveredSat(null)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedSatelliteId('lro');
          useGlobeStore.getState().toggleSatellitePanel(true);
        }}
      >
        <Suspense fallback={<SatelliteFallback />}>
          <SatelliteModel />
        </Suspense>

        {showTelemetryLabels && (hoveredSat === 'lro' || selectedSatelliteId === 'lro') ? (
          <Html position={[0, 0.08, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[40, 0]}>
            <div className="flex flex-col items-center whitespace-nowrap rounded border border-emerald-400/70 bg-bg/95 px-2 py-0.5 shadow-lg backdrop-blur">
              <span className="font-mono text-xs font-semibold text-emerald-400">🛰️ LRO · INCLINED ORBIT</span>
            </div>
          </Html>
        ) : null}
      </group>

      {/* SATELLITE 3: ARTEMIS GATEWAY (Equatorial Halo Orbit) */}
      <group
        ref={sat3Ref}
        position={pos3.toArray()}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredSat('gateway');
        }}
        onPointerOut={() => setHoveredSat(null)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedSatelliteId('gateway');
          useGlobeStore.getState().toggleSatellitePanel(true);
        }}
      >
        <Suspense fallback={<SatelliteFallback />}>
          <SatelliteModel />
        </Suspense>

        {showTelemetryLabels && (hoveredSat === 'gateway' || selectedSatelliteId === 'gateway') ? (
          <Html position={[0, 0.08, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[40, 0]}>
            <div className="flex flex-col items-center whitespace-nowrap rounded border border-amber-400/70 bg-bg/95 px-2 py-0.5 shadow-lg backdrop-blur">
              <span className="font-mono text-xs font-semibold text-amber-400">🛰️ GATEWAY · HALO ORBIT</span>
            </div>
          </Html>
        ) : null}
      </group>
    </group>
  );
});
