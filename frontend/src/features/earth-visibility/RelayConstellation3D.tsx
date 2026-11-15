import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Line, OrbitControls, Stars, useGLTF } from '@react-three/drei';
import { Box3, Group, Quaternion, Vector3 } from 'three';

interface NodeSeries { name: string; x: number[]; y: number[] }          // km, relative to Earth (or Moon for lunar nodes)
interface RelaySeries { mx: number[]; my: number[]; lunar: NodeSeries[]; earth: NodeSeries[]; activeLunar: number[]; activeEarth: number[] }
interface Station { name: string; latitude: number; longitude: number; color: string }

/* ---------------- tuning knobs ---------------- */
const R_EARTH_KM = 6378.137, R_MOON_KM = 1737.4, GEO_KM = 42164.17;
const EARTH_SIZE = 2;                    // Earth diameter in scene units, so radius = 1 exactly
const MOON_SIZE = 0.54, MOON_R = MOON_SIZE / 2, MOON_DIST = 3.8;
const SAT_SIZE = 0.3, DISH_SIZE = 0.09;  // largest dimension of each model, in scene units
const FRAME_SECONDS = 120;               // simulated seconds per data frame (match your series step)
const EARTH_SPIN = 7.2921159e-5;         // Earth rotation, rad per simulated second
const LON_OFFSET = 0;                    // degrees: adjust until the dishes sit on the right countries
const Y_AXIS = new Vector3(0, 1, 0);

const STATIONS: Station[] = [
  { name: 'North America', latitude: 38, longitude: -100, color: '#4ade80' },
  { name: 'Australia', latitude: -25, longitude: 134, color: '#facc15' },
  { name: 'Europe', latitude: 50, longitude: 10, color: '#60a5fa' },
];

function latLonVector(latitude: number, longitude: number, radius: number): [number, number, number] {
  const lat = latitude * Math.PI / 180, lon = (longitude + LON_OFFSET) * Math.PI / 180;
  return [radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), radius * Math.cos(lat) * Math.sin(lon)];
}

/** km -> scene units with radial compression. Never closer than minRatio x body radius, so nothing enters a planet. */
function compress(xKm: number, yKm: number, bodyKm: number, bodyR: number, power: number, minRatio: number): Vector3 {
  const r = Math.hypot(xKm, yKm) || 1;
  const k = bodyR * Math.max(Math.pow(r / bodyKm, power), minRatio) / r;
  return new Vector3(xKm * k, 0, yKm * k);            // orbits live in the equatorial (XZ) plane; Y is Earth's north pole
}
const earthOrbit = (x: number, y: number): Vector3 => compress(x, y, R_EARTH_KM, 1, 0.45, 1.08);
const moonOrbit = (x: number, y: number): Vector3 => compress(x, y, R_MOON_KM, MOON_R, 0.6, 1.3);
const GEO_RING = Math.pow(GEO_KM / R_EARTH_KM, 0.45);

/** Loads a GLB, centres it and rescales it so its largest side equals `size`. `base` puts its bottom at the origin. */
function Model({ url, size, label, base = false, rotation, small = false }:
  { url: string; size: number; label?: string; base?: boolean; rotation?: [number, number, number]; small?: boolean }) {
  const { scene } = useGLTF(url);
  const fitted = useMemo(() => {
    const c = scene.clone(true);
    if (rotation) c.rotation.set(...rotation);
    c.updateMatrixWorld(true);
    const box = new Box3().setFromObject(c), dim = box.getSize(new Vector3()), ctr = box.getCenter(new Vector3());
    c.position.set(-ctr.x, base ? -box.min.y : -ctr.y, -ctr.z);
    const wrap = new Group();
    wrap.add(c);
    wrap.scale.setScalar(size / Math.max(dim.x, dim.y, dim.z, 1e-6));
    return wrap;
  }, [scene, size, base, rotation]);
  return <>
    <primitive object={fitted} />
    {label && <Html distanceFactor={8} center style={{ pointerEvents: 'none' }}>
      <span className={`whitespace-nowrap rounded bg-slate-950/80 px-1.5 py-0.5 text-white ${small ? 'text-[8px]' : 'text-xs'}`}>{label}</span>
    </Html>}
  </>;
}

/** Ground dish standing on the surface, tilted to the local "up", with a marker dot that turns red when it is the active link. */
function Dish({ st, active }: { st: Station; active: boolean }) {
  const normal = useMemo(() => new Vector3(...latLonVector(st.latitude, st.longitude, 1)), [st]);
  const tilt = useMemo(() => new Quaternion().setFromUnitVectors(Y_AXIS, normal), [normal]);
  return <group position={normal.toArray() as [number, number, number]} quaternion={tilt}>
    <Model url="/models/dish.glb" size={DISH_SIZE} base small label={st.name} />
    <mesh><sphereGeometry args={[0.02, 16, 16]} /><meshBasicMaterial color={active ? '#ef4444' : st.color} /></mesh>
  </group>;
}

function MovingDottedRoute({ points }: { points: Vector3[] }) {
  const ref = useRef<{ material?: { dashOffset: number } }>(null);
  useFrame(({ clock }) => { if (ref.current?.material) ref.current.material.dashOffset = -clock.elapsedTime * 2; });
  return <Line ref={ref as never} points={points} color="#ef4444" lineWidth={3} dashed dashSize={0.08} gapSize={0.06} />;
}

useGLTF.preload('/models/earth.glb');
useGLTF.preload('/models/moon.glb');
useGLTF.preload('/models/dish.glb');
useGLTF.preload('/models/satellite.glb');

function Scene({ data, paused, onFrame }: { data: RelaySeries; paused: boolean; onFrame?: (frame: number) => void }) {
  const [frame, setFrame] = useState(0);
  useFrame(({ clock }) => {
    if (paused) return;
    const nextFrame = Math.floor(clock.elapsedTime * 25) % data.mx.length;
    setFrame(current => current === nextFrame ? current : nextFrame);
    onFrame?.(nextFrame);
  });

  const trails = useMemo(() => data.earth.map(n => {
    const pts: Vector3[] = [];
    for (let i = 0; i < n.x.length; i += 3) pts.push(earthOrbit(n.x[i] ?? 0, n.y[i] ?? 0));
    return pts;
  }), [data]);
  const normals = useMemo(() => STATIONS.map(s => new Vector3(...latLonVector(s.latitude, s.longitude, 1))), []);

  const earthRelay = data.earth[data.activeEarth[frame] ?? 0];
  const lunarRelay = data.lunar[data.activeLunar[frame] ?? 0];
  if (!earthRelay || !lunarRelay) return null;

  // Moon sits in the direction Earth->Moon given by the data; lunar satellite orbits it in the same plane.
  const mm = Math.hypot(data.mx[frame] ?? 1, data.my[frame] ?? 0) || 1;
  const moon = new Vector3((data.mx[frame] ?? 1) / mm * MOON_DIST, 0, (data.my[frame] ?? 0) / mm * MOON_DIST);
  const lunarPosition = moon.clone().add(moonOrbit(lunarRelay.x[frame] ?? 0, lunarRelay.y[frame] ?? 0));
  const earthPosition = earthOrbit(earthRelay.x[frame] ?? 0, earthRelay.y[frame] ?? 0);

  // The Earth turns with time; the dishes ride on it. Pick the dish that can actually see the Earth satellite.
  const spin = frame * FRAME_SECONDS * EARTH_SPIN;
  let best = -1, bestDot = 1;                       // visible when sat is above the local horizon: n·p > 1
  const world = normals.map((n, i) => {
    const w = n.clone().applyAxisAngle(Y_AXIS, -spin);
    const d = w.dot(earthPosition);
    if (d > bestDot) { bestDot = d; best = i; }
    return w;
  });
  const route = [lunarPosition, earthPosition];
  if (best >= 0) route.push(world[best]!.clone().multiplyScalar(1 + DISH_SIZE * 0.8));

  return <>
    <ambientLight intensity={1.5} /><pointLight position={[4, 5, 5]} intensity={20} color="#dbeafe" />
    <Stars radius={35} depth={20} count={900} factor={1.5} fade />

    <group rotation={[0, -spin, 0]}>
      <Model url="/models/earth.glb" size={EARTH_SIZE} label="Earth" />
      {STATIONS.map((s, i) => <Dish key={s.name} st={s} active={i === best} />)}
    </group>

    <group position={moon.toArray() as [number, number, number]}><Model url="/models/moon.glb" size={MOON_SIZE} label="Moon" /></group>
    <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[GEO_RING, 0.006, 8, 128]} /><meshBasicMaterial color="#4b9cff" transparent opacity={0.4} /></mesh>
    {trails.map((pts, i) => pts.length > 1 && <Line key={i} points={pts} color="#4b9cff" lineWidth={1} transparent opacity={0.3} />)}

    <MovingDottedRoute points={route} />
    <group position={lunarPosition.toArray() as [number, number, number]}><Model url="/models/satellite.glb" size={SAT_SIZE} label={lunarRelay.name} /></group>
    <group position={earthPosition.toArray() as [number, number, number]}><Model url="/models/satellite.glb" size={SAT_SIZE} label={earthRelay.name} /></group>

    <Html position={[-1.1, -1.35, 0]} center style={{ pointerEvents: 'none' }}>
      <div className="rounded border border-cyan-300/30 bg-slate-950/85 px-3 py-2 text-center text-xs text-white shadow-xl">
        <div className="font-semibold text-cyan-300">ACTIVE DATA ROUTE</div>
        <div>{lunarRelay.name} → {earthRelay.name} → {best >= 0 ? STATIONS[best]!.name : 'no ground station in view'}</div>
      </div>
    </Html>
    <OrbitControls enablePan={false} minDistance={2.2} maxDistance={9} />
  </>;
}

export function RelayConstellation3D({ paused = false, onFrame }: { paused?: boolean; onFrame?: (frame: number) => void }) {
  const [data, setData] = useState<RelaySeries | null>(null);
  useEffect(() => { fetch('/relay_series.json').then(r => r.json()).then(setData).catch(() => setData(null)); }, []);
  return <div className="relative h-[min(620px,70vh)] min-h-[440px] overflow-hidden rounded-xl border border-cyan-300/20 bg-[#020617]">
    {data ? <Canvas camera={{ position: [0, 2.4, 7], fov: 42 }} dpr={[1, 2]}><Scene data={data} paused={paused} onFrame={onFrame} /></Canvas>
          : <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading relay constellation…</div>}
    <div className="pointer-events-none absolute left-4 top-4 rounded border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-200">3D relay constellation · drag to rotate · scroll to zoom</div>
  </div>;
}
