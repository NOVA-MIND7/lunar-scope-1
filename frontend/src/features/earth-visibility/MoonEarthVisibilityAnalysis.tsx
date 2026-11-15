import { useMemo, useState } from 'react';
import { Html, Line, OrbitControls, Stars, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { PlaneGeometry, Vector3 } from 'three';

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

function utcInput(date: Date): string { return date.toISOString().slice(0, 16); }
function normalizeDegrees(value: number): number { return ((value % 360) + 360) % 360; }

function directionForSite(latitude: number, longitude: number, date: Date) {
  const phase = date.getTime() / 86400000 * 2 * Math.PI / 27.2122;
  const subEarthLatitude = 6.7 * Math.sin(phase);
  const subEarthLongitude = 6.7 * Math.sin(phase + 1.1);
  const lat = latitude * Math.PI / 180;
  const subLat = subEarthLatitude * Math.PI / 180;
  const deltaLon = (longitude - subEarthLongitude) * Math.PI / 180;
  const cosine = Math.min(1, Math.max(-1, Math.sin(lat) * Math.sin(subLat) + Math.cos(lat) * Math.cos(subLat) * Math.cos(deltaLon)));
  const elevation = 90 - Math.acos(cosine) * 180 / Math.PI;
  const azimuth = normalizeDegrees(Math.atan2(Math.sin(deltaLon) * Math.cos(subLat), Math.cos(lat) * Math.sin(subLat) - Math.sin(lat) * Math.cos(subLat) * Math.cos(deltaLon)) * 180 / Math.PI);
  return { elevation, azimuth };
}

function LunarTerrain() {
  const geometry = useMemo(() => {
    const result = new PlaneGeometry(10, 7, 96, 64);
    const position = result.attributes.position!;
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const rolling = Math.sin(x * 1.1) * 0.12 + Math.cos(y * 1.6) * 0.1 + Math.sin((x + y) * 3.7) * 0.035;
      const ridge = Math.exp(-((x + 1.6) ** 2 + (y - 0.4) ** 2) * 0.7) * 0.34;
      const craterA = Math.exp(-((x - 1.8) ** 2 + (y + 0.9) ** 2) * 2.5) * -0.28;
      const craterB = Math.exp(-((x + 2.3) ** 2 + (y - 1.1) ** 2) * 3.2) * -0.22;
      position.setZ(index, rolling + ridge + craterA + craterB);
    }
    position.needsUpdate = true;
    result.computeVertexNormals();
    return result;
  }, []);
  return <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, -0.6]} receiveShadow><meshStandardMaterial color="#363330" roughness={1} flatShading /></mesh>;
}

function Lander({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF('/models/lander.glb');
  return <group position={position}><primitive object={scene.clone()} scale={0.080} /><Html distanceFactor={6} center style={{ pointerEvents: 'none' }}><span className="whitespace-nowrap rounded bg-slate-950/85 px-2 py-1 text-[10px] text-yellow-200"> Lander</span></Html></group>;
}

function EarthModel({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF('/models/earth.glb');
  return <primitive object={scene.clone()} position={position} scale={0.00100} />;
}

function MoonPerspectiveScene({ earthPosition, elevation, azimuth, visible }: { earthPosition: [number, number, number]; elevation: number; azimuth: number; visible: boolean }) {
  const lander: [number, number, number] = [0, 0.24, 0.15];
  return <>
    <ambientLight intensity={1.1} /><directionalLight position={[3, 5, 4]} intensity={4} color="#dbeafe" /><Stars radius={30} depth={18} count={800} factor={1.5} fade />
    <LunarTerrain /><Lander position={lander} /><EarthModel position={earthPosition} />
    <Line points={[new Vector3(...lander), new Vector3(...earthPosition)]} color={visible ? '#22c55e' : '#ef4444'} lineWidth={2} dashed dashSize={0.08} gapSize={0.06} />
    <Html position={earthPosition} distanceFactor={6} center style={{ pointerEvents: 'none' }}><span className="whitespace-nowrap rounded bg-slate-950/85 px-2 py-1 text-[10px] text-cyan-200">Earth · Elev {elevation.toFixed(1)}° · Az {azimuth.toFixed(0)}°</span></Html>
    <OrbitControls enablePan={false} minDistance={4} maxDistance={14} target={[0, 0.7, -1.4]} />
  </>;
}

useGLTF.preload('/models/earth.glb');
useGLTF.preload('/models/lander.glb');

export function MoonEarthVisibilityAnalysis() {
  const [siteId, setSiteId] = useState('south-pole');
  const site = sites.find(item => item.id === siteId) ?? sites[0]!;
  const [latitude, setLatitude] = useState(site.latitude);
  const [longitude, setLongitude] = useState(site.longitude);
  const [observerHeight, setObserverHeight] = useState(2);
  const [terrainMask, setTerrainMask] = useState(site.mask);
  const [dateTime, setDateTime] = useState(utcInput(new Date()));
  const [timeOffset, setTimeOffset] = useState(0);
  const date = useMemo(() => new Date(`${dateTime}:00Z`), [dateTime]);
  const analysisDate = useMemo(() => new Date(date.getTime() + timeOffset * 3600000), [date, timeOffset]);
  const direction = useMemo(() => directionForSite(latitude, longitude, analysisDate), [latitude, longitude, analysisDate]);
  const visible = direction.elevation > terrainMask;
  const earthPosition: [number, number, number] = [Math.sin(direction.azimuth * Math.PI / 180) * Math.cos(direction.elevation * Math.PI / 180) * 4.6, 0.35 + Math.sin(direction.elevation * Math.PI / 180) * 4.6, -Math.cos(direction.azimuth * Math.PI / 180) * Math.cos(direction.elevation * Math.PI / 180) * 4.6];
  const timeline = Array.from({ length: 24 }, (_, hour) => directionForSite(latitude, longitude, new Date(date.getTime() + hour * 3600000)).elevation > terrainMask);
  const selectSite = (id: string) => { const next = sites.find(item => item.id === id) ?? sites[0]!; setSiteId(next.id); setLatitude(next.latitude); setLongitude(next.longitude); setTerrainMask(next.mask); };

  return <div className="space-y-5">
    <section className="grid gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4 shadow-2xl lg:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        <div><h2 className="text-lg font-semibold text-fg">Earth Visibility Analysis</h2><p className="mt-1 text-xs text-muted">Close-up lunar lander perspective with Earth above the local horizon.</p></div>
        <label className="block text-xs text-muted">Landing-site preset
          <select className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-fg" value={siteId} onChange={event => selectSite(event.target.value)}>{sites.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </label>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs text-muted">Latitude<input className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-fg" type="number" min={-90} max={90} step={0.1} value={latitude} onChange={event => { setSiteId('custom'); setLatitude(Number(event.target.value)); }} /></label><label className="text-xs text-muted">Longitude<input className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-fg" type="number" min={-180} max={180} step={0.1} value={longitude} onChange={event => { setSiteId('custom'); setLongitude(Number(event.target.value)); }} /></label></div>
        <label className="block text-xs text-muted">Date and UTC time<input className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-fg" type="datetime-local" value={dateTime} onChange={event => setDateTime(event.target.value)} /></label>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs text-muted">Lander height (m)<input className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-fg" type="number" min={0} value={observerHeight} onChange={event => setObserverHeight(Number(event.target.value))} /></label><label className="text-xs text-muted">Terrain mask (°)<input className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-fg" type="number" min={0} step={0.5} value={terrainMask} onChange={event => setTerrainMask(Number(event.target.value))} /></label></div>
        <div className="rounded-lg border border-white/10 bg-slate-900/70 p-3 text-xs text-muted">Generated local lunar terrain with crater markers. Connect a lunar DEM later for measured terrain obstruction.</div>
      </div>
      <div className="relative h-[min(560px,65vh)] min-h-[400px] overflow-hidden rounded-xl border border-cyan-300/20 bg-[#020617]"><Canvas camera={{ position: [0, 1.8, 8], fov: 48 }} dpr={[1, 2]}><MoonPerspectiveScene earthPosition={earthPosition} elevation={direction.elevation} azimuth={direction.azimuth} visible={visible} /></Canvas><div className="pointer-events-none absolute left-3 top-3 rounded border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-200">Lunar lander viewpoint · generated Moon surface</div></div>
    </section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Earth elevation" value={`${direction.elevation.toFixed(1)}°`} good={visible} /><Metric label="Earth azimuth" value={`${direction.azimuth.toFixed(0)}°`} /><Metric label="Visibility" value={visible ? 'DIRECT' : 'BLOCKED'} good={visible} /><Metric label="One-way light time" value={`${(EARTH_MOON_DISTANCE_KM / C_KM_S).toFixed(3)} s`} /></section>
    <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-fg">24-hour communication timeline</h3><p className="text-xs text-muted">Green means Earth is above the configured terrain mask.</p></div><div className="text-xs text-muted">Observer height: {observerHeight} m · Analysis time: +{timeOffset.toFixed(1)} h</div></div><div className="mt-4 grid grid-cols-24 gap-1">{timeline.map((isVisible, hour) => <div key={hour} className={`h-7 rounded-sm ${isVisible ? 'bg-emerald-500' : 'bg-rose-500/70'}`} title={`${hour}:00 UTC · ${isVisible ? 'Visible' : 'Blocked'}`} />)}</div><input className="mt-4 w-full accent-cyan-400" type="range" min={0} max={24} step={0.5} value={timeOffset} onChange={event => setTimeOffset(Number(event.target.value))} /><div className="mt-1 flex justify-between text-[11px] text-muted"><span>Now</span><span>+12 hours</span><span>+24 hours</span></div></section>
  </div>;
}

function Metric({ label, value, good = false }: { label: string; value: string; good?: boolean }) { return <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4"><div className="text-xs uppercase tracking-wide text-muted">{label}</div><div className={`mt-1 text-2xl font-semibold ${good ? 'text-emerald-400' : 'text-fg'}`}>{value}</div></div>; }
