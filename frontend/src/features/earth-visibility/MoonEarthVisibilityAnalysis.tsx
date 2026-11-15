import { useMemo, useRef, useState } from 'react';
import { Html, Line, OrbitControls, Stars, useGLTF } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const C_KM_S = 299792.458;
const EARTH_MOON_DISTANCE_KM = 384400;
const sites = [
  { id: 'south-pole', name: 'Moon South Pole', latitude: -89, longitude: 0, mask: 3 },
  { id: 'shackleton', name: 'Shackleton Crater', latitude: -89.9, longitude: 0, mask: 5 },
  { id: 'malapert', name: 'Malapert Massif', latitude: -85.9, longitude: -5.5, mask: 4 },
  { id: 'apollo-11', name: 'Apollo 11 Site', latitude: 0.7, longitude: 23.5, mask: 1 },
  { id: 'apollo-15', name: 'Apollo 15 Site', latitude: 26.1, longitude: 3.6, mask: 2 },
  { id: 'near-side', name: 'Near-side Equatorial Site', latitude: 2, longitude: -30, mask: 1 },
];

function utcInput(date: Date): string {
  return date.toISOString().slice(0, 16);
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function directionForSite(latitude: number, longitude: number, date: Date) {
  const phase = (date.getTime() / 86400000) * 2 * Math.PI / 27.2122;
  const subEarthLatitude = 6.7 * Math.sin(phase);
  const subEarthLongitude = 6.7 * Math.sin(phase + 1.1);
  const lat = (latitude * Math.PI) / 180;
  const subLat = (subEarthLatitude * Math.PI) / 180;
  const deltaLon = ((longitude - subEarthLongitude) * Math.PI) / 180;
  const cosine = Math.min(
    1,
    Math.max(-1, Math.sin(lat) * Math.sin(subLat) + Math.cos(lat) * Math.cos(subLat) * Math.cos(deltaLon)),
  );
  const elevation = 90 - (Math.acos(cosine) * 180) / Math.PI;
  const azimuth = normalizeDegrees(
    (Math.atan2(
      Math.sin(deltaLon) * Math.cos(subLat),
      Math.cos(lat) * Math.sin(subLat) - Math.sin(lat) * Math.cos(subLat) * Math.cos(deltaLon),
    ) *
      180) /
      Math.PI,
  );
  return { elevation, azimuth };
}

function sunDirectionForSite(latitude: number, date: Date): [number, number, number] {
  // Low grazing lunar sunlight (~4°–8.5° el) so crater ridges and the lander cast dramatic shadows
  const synodicHours = (date.getTime() / 3600000) % 708;
  const azRad = (synodicHours / 708) * Math.PI * 2 + 5.1;
  const polarFactor = 1 - Math.min(1, Math.abs(latitude) / 90);
  const elDeg = 3.8 + polarFactor * 4.5;
  const elRad = (elDeg * Math.PI) / 180;
  const dist = 120;
  return [
    Math.sin(azRad) * Math.cos(elRad) * dist,
    Math.sin(elRad) * dist,
    -Math.cos(azRad) * Math.cos(elRad) * dist,
  ];
}

function sampleSiteTerrainHeight(worldX: number, worldZ: number, terrainMaskDeg: number): number {
  const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ);
  const azDeg = ((Math.atan2(worldX, -worldZ) * 180) / Math.PI + 360) % 360;
  const azRad = (azDeg * Math.PI) / 180;
  // Multi-harmonic LOLA crater rim relief + undulating ridge field (matches 3D Site Terrain Shadows)
  const ridgeHarmonic =
    0.78 +
    0.45 * Math.sin(azRad * 3 + 0.6) +
    0.32 * Math.cos(azRad * 7 + 1.4) +
    0.2 * Math.sin(azRad * 13 + 0.3);
  const baseMask = Math.max(1.8, terrainMaskDeg);
  const rimBelt = Math.exp(-Math.pow((distFromCenter - 46) / 16, 2)) * baseMask * ridgeHarmonic * 2.15;
  const craterField =
    Math.sin(worldX * 0.075) * Math.cos(worldZ * 0.075) * 1.45 +
    Math.sin(worldX * 0.15 + 1.2) * Math.sin(worldZ * 0.15 + 0.7) * 0.65;
  const padBlend = Math.min(1, distFromCenter / 10);
  return (rimBelt + craterField) * padBlend;
}

function LunarTerrain({ terrainMask }: { terrainMask: number }) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(150, 150, 100, 100);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    if (pos) {
      for (let i = 0; i < pos.count; i += 1) {
        pos.setY(i, sampleSiteTerrainHeight(pos.getX(i), pos.getZ(i), terrainMask));
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }
    return geo;
  }, [terrainMask]);

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial color="#64748b" roughness={0.94} metalness={0.05} />
    </mesh>
  );
}

function Lander({ observerHeight }: { observerHeight: number }) {
  const { scene } = useGLTF('/models/lander.glb');
  const landerObj = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  const yLift = Math.max(0, Math.min(2, (observerHeight - 2) * 0.08));

  return (
    <group position={[0, yLift, 0]}>
      <primitive object={landerObj} scale={0.44} />
      <Html position={[0, 4.8, 0]} center style={{ pointerEvents: 'none' }}>
        <span className="whitespace-nowrap rounded border border-warning/40 bg-slate-950/85 px-2 py-0.5 text-[10px] text-yellow-200">
          Lunar Lander
        </span>
      </Html>
    </group>
  );
}

function EarthModel({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF('/models/earth.glb');
  const earthObj = useMemo(() => scene.clone(), [scene]);
  return (
    <group position={position}>
      <primitive object={earthObj} scale={0.0036} />
      <mesh>
        <sphereGeometry args={[4.4, 24, 24]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.14} depthWrite={false} />
      </mesh>
    </group>
  );
}

function SignalPackets({
  origin,
  target,
  visible,
}: {
  origin: THREE.Vector3;
  target: THREE.Vector3;
  visible: boolean;
}) {
  const phaseRef = useRef(0);
  const refs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame((_, delta) => {
    if (!visible) return;
    phaseRef.current = (phaseRef.current + Math.min(delta, 0.1) * 0.65) % 1;
    for (let i = 0; i < 6; i += 1) {
      const mesh = refs.current[i];
      if (!mesh) continue;
      mesh.position.lerpVectors(origin, target, (phaseRef.current + i / 6) % 1);
    }
  });

  if (!visible) return null;
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.5, 10, 10]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
      ))}
    </>
  );
}

function MoonPerspectiveScene({
  earthPosition,
  sunPosition,
  elevation,
  azimuth,
  terrainMask,
  observerHeight,
  visible,
}: {
  earthPosition: [number, number, number];
  sunPosition: [number, number, number];
  elevation: number;
  azimuth: number;
  terrainMask: number;
  observerHeight: number;
  visible: boolean;
}) {
  const originVec = useMemo(
    () => new THREE.Vector3(0, 2.4 + Math.max(0, Math.min(2, (observerHeight - 2) * 0.08)), 0),
    [observerHeight],
  );
  const earthVec = useMemo(() => new THREE.Vector3(...earthPosition), [earthPosition]);
  const sunOrbPos = useMemo(
    () => new THREE.Vector3(...sunPosition).normalize().multiplyScalar(88),
    [sunPosition],
  );

  return (
    <>
      <color attach="background" args={['#030612']} />
      <Stars radius={170} depth={45} count={1100} factor={2} saturation={0} fade />
      <hemisphereLight args={['#cbd5e1', '#0f172a', 0.2]} />
      <directionalLight
        position={sunPosition}
        intensity={3.1}
        color="#fffbeb"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={8}
        shadow-camera-far={270}
        shadow-camera-left={-75}
        shadow-camera-right={75}
        shadow-camera-top={75}
        shadow-camera-bottom={-75}
        shadow-bias={-0.0005}
      />
      <mesh position={sunOrbPos}>
        <sphereGeometry args={[2.8, 24, 24]} />
        <meshBasicMaterial color="#fde047" />
      </mesh>
      <LunarTerrain terrainMask={terrainMask} />
      <Lander observerHeight={observerHeight} />
      <EarthModel position={earthPosition} />
      <Line
        points={[originVec.toArray(), earthPosition]}
        color={visible ? '#22c55e' : '#ef4444'}
        lineWidth={visible ? 2.4 : 1.6}
        dashed={!visible}
        dashSize={1.6}
        gapSize={1.2}
      />
      <SignalPackets origin={originVec} target={earthVec} visible={visible} />
      <Html position={[earthPosition[0], earthPosition[1] + 5.2, earthPosition[2]]} center style={{ pointerEvents: 'none' }}>
        <span className="whitespace-nowrap rounded border border-cyan-400/40 bg-slate-950/85 px-2 py-0.5 text-[10px] text-cyan-200">
          Earth · Elev {elevation.toFixed(1)}° · Az {azimuth.toFixed(0)}°
        </span>
      </Html>
      <OrbitControls
        enablePan={false}
        minDistance={12}
        maxDistance={105}
        maxPolarAngle={Math.PI / 2 - 0.03}
        target={[0, 8, -2]}
      />
    </>
  );
}

useGLTF.preload('/models/earth.glb');
useGLTF.preload('/models/lander.glb');

export function MoonEarthVisibilityAnalysis() {
  const [siteId, setSiteId] = useState('south-pole');
  const site = sites.find((item) => item.id === siteId) ?? sites[0]!;
  const [latitude, setLatitude] = useState(site.latitude);
  const [longitude, setLongitude] = useState(site.longitude);
  const [observerHeight, setObserverHeight] = useState(2);
  const [terrainMask, setTerrainMask] = useState(site.mask);
  const [dateTime, setDateTime] = useState(utcInput(new Date()));
  const [timeOffset, setTimeOffset] = useState(0);
  const date = useMemo(() => new Date(`${dateTime}:00Z`), [dateTime]);
  const analysisDate = useMemo(() => new Date(date.getTime() + timeOffset * 3600000), [date, timeOffset]);
  const direction = useMemo(() => directionForSite(latitude, longitude, analysisDate), [latitude, longitude, analysisDate]);
  const sunPosition = useMemo(() => sunDirectionForSite(latitude, analysisDate), [latitude, analysisDate]);
  const visible = direction.elevation > terrainMask;

  const earthPosition: [number, number, number] = useMemo(() => {
    const az = (direction.azimuth * Math.PI) / 180;
    const el = (direction.elevation * Math.PI) / 180;
    const dist = 500;
    return [
      Math.sin(az) * Math.cos(el) * dist,
      Math.max(4, Math.sin(el) * 26 + 5),
      -Math.cos(az) * Math.cos(el) * dist,
    ];
  }, [direction.azimuth, direction.elevation]);

  const timeline = Array.from({ length: 24 }, (_, hour) =>
    directionForSite(latitude, longitude, new Date(date.getTime() + hour * 3600000)).elevation > terrainMask,
  );
  const selectSite = (id: string) => {
    const next = sites.find((item) => item.id === id) ?? sites[0]!;
    setSiteId(next.id);
    setLatitude(next.latitude);
    setLongitude(next.longitude);
    setTerrainMask(next.mask);
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4 shadow-2xl lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-fg">Earth Visibility Analysis</h2>
            <p className="mt-1 text-xs text-muted">Close-up lunar lander perspective with Earth above the local horizon.</p>
          </div>
          <label className="block text-xs text-muted">
            Landing-site preset
            <select
              className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-fg"
              value={siteId}
              onChange={(event) => selectSite(event.target.value)}
            >
              {sites.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted">
              Latitude
              <input
                className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-fg"
                type="number"
                min={-90}
                max={90}
                step={0.1}
                value={latitude}
                onChange={(event) => {
                  setSiteId('custom');
                  setLatitude(Number(event.target.value));
                }}
              />
            </label>
            <label className="text-xs text-muted">
              Longitude
              <input
                className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-fg"
                type="number"
                min={-180}
                max={180}
                step={0.1}
                value={longitude}
                onChange={(event) => {
                  setSiteId('custom');
                  setLongitude(Number(event.target.value));
                }}
              />
            </label>
          </div>
          <label className="block text-xs text-muted">
            Date and UTC time
            <input
              className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-fg"
              type="datetime-local"
              value={dateTime}
              onChange={(event) => setDateTime(event.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted">
              Lander height (m)
              <input
                className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-fg"
                type="number"
                min={0}
                value={observerHeight}
                onChange={(event) => setObserverHeight(Number(event.target.value))}
              />
            </label>
            <label className="text-xs text-muted">
              Terrain mask (°)
              <input
                className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-fg"
                type="number"
                min={0}
                step={0.5}
                value={terrainMask}
                onChange={(event) => setTerrainMask(Number(event.target.value))}
              />
            </label>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-900/70 p-3 text-xs text-muted">
            Generated local lunar crater ridges with real-time solar shadow relief. Connect a lunar DEM later for measured terrain obstruction.
          </div>
        </div>
        <div className="relative h-[min(560px,65vh)] min-h-[400px] overflow-hidden rounded-xl border border-cyan-300/20 bg-[#030612]">
          <Canvas shadows camera={{ position: [0, 18, 52], fov: 54 }} dpr={[1, 2]}>
            <MoonPerspectiveScene
              earthPosition={earthPosition}
              sunPosition={sunPosition}
              elevation={direction.elevation}
              azimuth={direction.azimuth}
              terrainMask={terrainMask}
              observerHeight={observerHeight}
              visible={visible}
            />
          </Canvas>
          <div className="pointer-events-none absolute left-3 top-3 rounded border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-200">
            Lunar lander viewpoint · crater ridge shadows
          </div>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Earth elevation" value={`${direction.elevation.toFixed(1)}°`} good={visible} />
        <Metric label="Earth azimuth" value={`${direction.azimuth.toFixed(0)}°`} />
        <Metric label="Visibility" value={visible ? 'DIRECT' : 'BLOCKED'} good={visible} />
        <Metric label="One-way light time" value={`${(EARTH_MOON_DISTANCE_KM / C_KM_S).toFixed(3)} s`} />
      </section>
      <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-fg">24-hour communication timeline</h3>
            <p className="text-xs text-muted">Green means Earth is above the configured terrain mask.</p>
          </div>
          <div className="text-xs text-muted">
            Observer height: {observerHeight} m · Analysis time: +{timeOffset.toFixed(1)} h
          </div>
        </div>
        <div className="mt-4 grid grid-cols-24 gap-1">
          {timeline.map((isVisible, hour) => (
            <div
              key={hour}
              className={`h-7 rounded-sm ${isVisible ? 'bg-emerald-500' : 'bg-rose-500/70'}`}
              title={`${hour}:00 UTC · ${isVisible ? 'Visible' : 'Blocked'}`}
            />
          ))}
        </div>
        <input
          className="mt-4 w-full accent-cyan-400"
          type="range"
          min={0}
          max={24}
          step={0.5}
          value={timeOffset}
          onChange={(event) => setTimeOffset(Number(event.target.value))}
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          <span>Now</span>
          <span>+12 hours</span>
          <span>+24 hours</span>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, good = false }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${good ? 'text-emerald-400' : 'text-fg'}`}>{value}</div>
    </div>
  );
}
