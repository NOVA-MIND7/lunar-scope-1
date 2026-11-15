import { useEffect, useMemo, useState } from 'react';
import {
  Compass,
  ExternalLink,
  Layers,
  MapPin,
  Mountain,
  SlidersHorizontal,
  Sun,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/common/PageHeader';
import {
  buildProceduralTerrainMask,
  getTerrainElevationAtAzimuth,
  SOLAR_PRESET_SITES,
} from '@/features/solar-analysis/solarPhysics';
import { useAppStore } from '@/stores/appStore';
import {
  MoonTrekTerrainGlobe,
  type MoonTrekLayerMode,
  type SouthPoleDemPoint,
  type TerrainCameraTarget,
} from './MoonTrekTerrainGlobe';

const MOON_TREK_URL =
  'https://trek.nasa.gov/moon/#v=0.1&x=-150954.42382812477&y=-223398.3353809265&z=2&p=urn%3Aogc%3Adef%3Acrs%3AIAU2000%3A%3A30120&d=&locale=&b=moon&e=-2205823.1738281217%2C-1326820.0443652999%2C1903914.3261718722%2C880023.3736034469&sfz=&w=';

interface DemApiResponse {
  available?: boolean;
  total_rows?: number;
  returned_rows?: number;
  records?: SouthPoleDemPoint[];
}

export default function TerrainAnalysisPage() {
  const globalCoords = useAppStore((s) => s.selectedCoordinates);

  const [selectedPresetId, setSelectedPresetId] = useState<string>('shackleton-rim');
  const [lat, setLat] = useState<number>(-89.68);
  const [lon, setLon] = useState<number>(129.0);
  const [observerHeightM, setObserverHeightM] = useState<number>(2.0);
  const [azimuthStepDeg, setAzimuthStepDeg] = useState<5 | 10 | 15>(10);

  const [layerMode, setLayerMode] = useState<MoonTrekLayerMode>('wac-relief');
  const [exaggeration, setExaggeration] = useState<number>(1.5);
  const [sunAzimuthDeg, setSunAzimuthDeg] = useState<number>(40);
  const [showDemOverlay, setShowDemOverlay] = useState<boolean>(true);
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [cameraPreset, setCameraPreset] = useState<{
    id: number;
    target: TerrainCameraTarget;
    zoomDelta?: number;
  }>({ id: 0, target: 'south-pole' });

  const [demSamples, setDemSamples] = useState<SouthPoleDemPoint[]>([]);
  const [demTotalRows, setDemTotalRows] = useState<number>(0);

  // Load bundled NASA South Pole LOLA DEM samples served by FastAPI (/api/data/terrain/south-pole)
  useEffect(() => {
    let cancelled = false;
    const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';
    fetch(`${base}/data/terrain/south-pole?limit=1500`)
      .then((res) => (res.ok ? (res.json() as Promise<DemApiResponse>) : null))
      .then((payload) => {
        if (cancelled || !payload || !Array.isArray(payload.records)) return;
        setDemSamples(payload.records);
        setDemTotalRows(payload.total_rows ?? payload.records.length);
      })
      .catch(() => {
        // Fallback silently when API is offline; 3D Moon Trek globe and procedural LOLA masks continue working
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activePreset = useMemo(
    () => SOLAR_PRESET_SITES.find((s) => s.id === selectedPresetId) ?? null,
    [selectedPresetId],
  );

  // Nearest DEM sample from bundled `south_pole_terrain.txt`
  const nearestDem = useMemo(() => {
    if (demSamples.length === 0) return null;
    let best: SouthPoleDemPoint | null = null;
    let bestDistSq = Infinity;
    for (const s of demSamples) {
      const dLat = s.latitude_deg - lat;
      let dLon = s.longitude_deg - lon;
      if (dLon > 180) dLon -= 360;
      if (dLon < -180) dLon += 360;
      const distSq = dLat * dLat + dLon * dLon * Math.cos((lat * Math.PI) / 180) ** 2;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = s;
      }
    }
    const approxDegDist = Math.sqrt(bestDistSq);
    if (!best || approxDegDist > 4) return null;
    return {
      sample: best,
      distKm: Number((approxDegDist * 30.32).toFixed(1)),
    };
  }, [demSamples, lat, lon]);

  // 360° horizon elevation mask profile
  const horizonData = useMemo(() => {
    const mask = activePreset ? activePreset.terrainMask : buildProceduralTerrainMask(lat, lon);
    // Raising observer height lowers effective distant ridge angle slightly (horizon depression over ~1.5 km crater rim)
    const heightAdjustmentDeg = ((observerHeightM - 2.0) / 1500) * (180 / Math.PI);
    const slopeBias = nearestDem ? Math.min(2.5, Math.max(-0.5, (nearestDem.sample.slope_deg - 8) * 0.12)) : 0;

    const rows: Array<{ az: number; horizonDeg: number }> = [];
    for (let az = 0; az < 360; az += azimuthStepDeg) {
      const raw = getTerrainElevationAtAzimuth(mask, az);
      const adjusted = Math.max(0, Number((raw + slopeBias - heightAdjustmentDeg).toFixed(2)));
      rows.push({ az, horizonDeg: adjusted });
    }
    return rows;
  }, [activePreset, lat, lon, observerHeightM, azimuthStepDeg, nearestDem]);

  const terrainStats = useMemo(() => {
    const peakHorizon = Math.max(...horizonData.map((d) => d.horizonDeg), 0);
    const meanHorizon =
      horizonData.reduce((acc, d) => acc + d.horizonDeg, 0) / Math.max(1, horizonData.length);
    const skyViewPct = Number((100 * Math.cos((meanHorizon * Math.PI) / 180) ** 2).toFixed(1));
    const estSlope = nearestDem ? nearestDem.sample.slope_deg : activePreset ? activePreset.slopeDeg : 6.2;
    const estElev = nearestDem
      ? nearestDem.sample.elevation_m
      : activePreset
        ? activePreset.elevationMeters
        : 1850;
    const slopeSafety = estSlope <= 5 ? 'SAFE (<5°)' : estSlope <= 12 ? 'MODERATE (5-12°)' : 'STEEP (>12°)';
    return {
      peakHorizon: Number(peakHorizon.toFixed(1)),
      meanHorizon: Number(meanHorizon.toFixed(1)),
      skyViewPct,
      estSlope: Number(estSlope.toFixed(1)),
      estElev: Math.round(estElev),
      slopeSafety,
    };
  }, [horizonData, nearestDem, activePreset]);

  const handlePresetChange = (id: string) => {
    setSelectedPresetId(id);
    const found = SOLAR_PRESET_SITES.find((s) => s.id === id);
    if (found) {
      setLat(found.lat);
      setLon(found.lon);
      setCameraPreset((p) => ({
        id: p.id + 1,
        target: found.lat < -50 ? 'south-pole' : found.lat > 50 ? 'north-pole' : 'near-side',
      }));
    }
  };

  const handleGlobeSelect = (c: { lat: number; lon: number }) => {
    setSelectedPresetId('custom');
    setLat(c.lat);
    setLon(c.lon);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Terrain Analysis"
          description="NASA Moon Trek 3D South Polar & Global LRO WAC + LOLA Digital Elevation Model (DEM) relief and horizon analysis."
        />
        <a
          href={MOON_TREK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn inline-flex items-center gap-1.5 border-cyan/40 bg-cyan/10 text-xs font-semibold text-cyan hover:bg-cyan/20"
        >
          <span>Open Original in NASA Moon Trek</span>
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left: 3D NASA Moon Trek South Polar Relief Globe */}
        <section className="panel flex flex-col overflow-hidden xl:col-span-8">
          {/* Layer & Camera Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-bg-secondary/80 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                <Layers className="size-3.5 text-cyan" /> Moon Trek Layer:
              </span>
              {(
                [
                  ['wac-relief', 'LRO WAC + LOLA'],
                  ['lola-shade', 'LOLA Shaded Relief'],
                  ['lola-color', 'Elevation Heatmap'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLayerMode(mode)}
                  className={`rounded border px-2 py-1 text-[11px] font-medium transition cursor-pointer ${
                    layerMode === mode
                      ? 'border-cyan bg-cyan/20 text-cyan'
                      : 'border-line bg-bg/60 text-fg-muted hover:text-fg'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ['south-pole', 'South Pole'],
                  ['near-side', 'Near Side'],
                  ['far-side', 'Far Side'],
                  ['north-pole', 'North Pole'],
                ] as const
              ).map(([target, label]) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => setCameraPreset((p) => ({ id: p.id + 1, target }))}
                  className={`rounded border px-2 py-1 font-mono text-[11px] transition cursor-pointer ${
                    cameraPreset.target === target
                      ? 'border-cyan/60 bg-cyan/15 text-cyan'
                      : 'border-line bg-bg/60 text-fg-muted hover:text-fg'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 3D Canvas Viewport */}
          <div className="relative h-[520px] w-full bg-[#04060c] lg:h-[580px]">
            <MoonTrekTerrainGlobe
              layerMode={layerMode}
              exaggeration={exaggeration}
              sunAzimuthDeg={sunAzimuthDeg}
              cameraPreset={cameraPreset}
              selectedLat={lat}
              selectedLon={lon}
              demSamples={demSamples}
              showDemOverlay={showDemOverlay}
              onHoverCoords={setHoverCoords}
              onSelectCoords={handleGlobeSelect}
            />

            {/* Top-Left Moon Trek Attribution Badge */}
            <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
              <span className="rounded border border-cyan/40 bg-bg/85 px-2.5 py-1 font-mono text-[10px] font-semibold text-cyan backdrop-blur">
                NASA MOON TREK • LRO WAC & LOLA 4K MOSAIC
              </span>
              <span className="rounded border border-line-strong bg-bg/85 px-2 py-1 font-mono text-[10px] text-fg-muted backdrop-blur">
                Click globe surface to sample coordinates
              </span>
            </div>

            {/* Left Zoom & Overlay Dock (styled like Moon Trek) */}
            <div className="absolute left-3 bottom-3 z-10 flex flex-col gap-1.5">
              <div className="flex items-center gap-1 rounded border border-line bg-bg/90 p-1 backdrop-blur">
                <button
                  type="button"
                  title="Zoom In"
                  onClick={() => setCameraPreset((p) => ({ id: p.id + 1, target: p.target, zoomDelta: -0.7 }))}
                  className="btn-icon size-7 text-fg-muted hover:text-cyan cursor-pointer"
                >
                  <ZoomIn className="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Zoom Out"
                  onClick={() => setCameraPreset((p) => ({ id: p.id + 1, target: p.target, zoomDelta: 0.7 }))}
                  className="btn-icon size-7 text-fg-muted hover:text-cyan cursor-pointer"
                >
                  <ZoomOut className="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Toggle South Pole DEM scatter overlay"
                  onClick={() => setShowDemOverlay((v) => !v)}
                  className={`rounded px-2 py-1 font-mono text-[10px] transition cursor-pointer ${
                    showDemOverlay ? 'bg-success/20 text-success' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  DEM {demSamples.length > 0 ? `(${demSamples.length})` : ''}
                </button>
              </div>
            </div>

            {/* Bottom-Right Moon Trek Status Readout */}
            <div className="pointer-events-none absolute right-3 bottom-3 rounded border border-line-strong bg-bg/90 px-3 py-1.5 font-mono text-[11px] text-fg-muted backdrop-blur">
              <div>Terrain Exaggeration: <span className="text-cyan">{exaggeration.toFixed(1)}×</span></div>
              <div>
                {hoverCoords ? 'Cursor' : 'Selected'}: Lat{' '}
                <span className="text-fg">{(hoverCoords?.lat ?? lat).toFixed(2)}°</span>, Lon{' '}
                <span className="text-fg">{(hoverCoords?.lon ?? lon).toFixed(2)}°</span>
              </div>
            </div>
          </div>

          {/* Quick Relief Exaggeration & Sun Lighting Controls */}
          <div className="grid grid-cols-1 gap-3 border-t border-line bg-bg-secondary/60 p-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-fg-muted whitespace-nowrap">
                <Mountain className="size-3.5 text-cyan" /> Terrain Exaggeration ({exaggeration.toFixed(1)}×)
              </span>
              <input
                type="range"
                min={0}
                max={4}
                step={0.1}
                value={exaggeration}
                onChange={(e) => setExaggeration(Number(e.target.value))}
                className="w-40 accent-cyan"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-fg-muted whitespace-nowrap">
                <Sun className="size-3.5 text-warning" /> Solar Relief Azimuth ({sunAzimuthDeg}°)
              </span>
              <input
                type="range"
                min={0}
                max={360}
                step={5}
                value={sunAzimuthDeg}
                onChange={(e) => setSunAzimuthDeg(Number(e.target.value))}
                className="w-40 accent-amber-400"
              />
            </label>
          </div>
        </section>

        {/* Right: Coordinates, Slope/DEM Telemetry & 360° Horizon Profile */}
        <aside className="space-y-4 xl:col-span-4">
          <section className="card space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <SlidersHorizontal className="size-4 text-cyan" /> Terrain Probe Inputs
              </h2>
              {globalCoords && (
                <button
                  type="button"
                  onClick={() => handleGlobeSelect({ lat: globalCoords.latitude_deg, lon: globalCoords.longitude_deg })}
                  className="rounded border border-cyan/40 bg-cyan/10 px-2 py-0.5 text-[10px] font-semibold text-cyan hover:bg-cyan/20 cursor-pointer"
                >
                  Use Mission Site
                </button>
              )}
            </div>

            <div>
              <label className="label mb-1 block">Target Region / Site</label>
              <select
                className="field"
                value={selectedPresetId}
                onChange={(e) => handlePresetChange(e.target.value)}
              >
                {SOLAR_PRESET_SITES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.lat.toFixed(1)}°, {s.lon.toFixed(1)}°)
                  </option>
                ))}
                {selectedPresetId === 'custom' && (
                  <option value="custom">Custom Globe Selection ({lat.toFixed(2)}°, {lon.toFixed(2)}°)</option>
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="label mb-1 block">Latitude (°)</label>
                <input
                  type="number"
                  min={-90}
                  max={90}
                  step={0.1}
                  value={lat}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) {
                      setSelectedPresetId('custom');
                      setLat(Math.max(-90, Math.min(90, v)));
                    }
                  }}
                  className="field font-mono"
                />
              </div>
              <div>
                <label className="label mb-1 block">Longitude (°)</label>
                <input
                  type="number"
                  min={-180}
                  max={180}
                  step={0.1}
                  value={lon}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) {
                      setSelectedPresetId('custom');
                      setLon(Math.max(-180, Math.min(180, v)));
                    }
                  }}
                  className="field font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="label mb-1 block">Observer Height ({observerHeightM.toFixed(1)} m)</label>
                <input
                  type="number"
                  min={0.5}
                  max={20}
                  step={0.5}
                  value={observerHeightM}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v >= 0.5) setObserverHeightM(Math.min(20, v));
                  }}
                  className="field font-mono"
                />
              </div>
              <div>
                <label className="label mb-1 block">Azimuth Resolution</label>
                <select
                  className="field"
                  value={azimuthStepDeg}
                  onChange={(e) => setAzimuthStepDeg(Number(e.target.value) as 5 | 10 | 15)}
                >
                  <option value={5}>5° (72 pts)</option>
                  <option value={10}>10° (36 pts)</option>
                  <option value={15}>15° (24 pts)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Elevation, Slope & Horizon Metrics */}
          <section className="card space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <MapPin className="size-4 text-cyan" /> Topographic Readout
              </h2>
              <span
                className={`badge font-mono text-[10px] ${
                  terrainStats.estSlope <= 5
                    ? 'border-success/50 bg-success/15 text-success'
                    : terrainStats.estSlope <= 12
                      ? 'border-warning/50 bg-warning/15 text-warning'
                      : 'border-danger/50 bg-danger/15 text-danger'
                }`}
              >
                {terrainStats.slopeSafety}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div className="rounded border border-line bg-bg/60 p-2.5">
                <div className="label text-[10px]">Elevation (LOLA)</div>
                <div className="mt-0.5 text-base font-bold text-fg">{terrainStats.estElev} m</div>
              </div>
              <div className="rounded border border-line bg-bg/60 p-2.5">
                <div className="label text-[10px]">Local Slope</div>
                <div className="mt-0.5 text-base font-bold text-cyan">{terrainStats.estSlope}°</div>
              </div>
              <div className="rounded border border-line bg-bg/60 p-2.5">
                <div className="label text-[10px]">Peak / Mean Horizon</div>
                <div className="mt-0.5 text-sm font-bold text-warning">
                  {terrainStats.peakHorizon}° / {terrainStats.meanHorizon}°
                </div>
              </div>
              <div className="rounded border border-line bg-bg/60 p-2.5">
                <div className="label text-[10px]">Sky View Factor</div>
                <div className="mt-0.5 text-base font-bold text-success">{terrainStats.skyViewPct}%</div>
              </div>
            </div>

            <p className="font-mono text-[10px] text-fg-dim">
              {nearestDem
                ? `Matched South Pole LOLA DEM record (${nearestDem.distKm} km away) from ${demTotalRows.toLocaleString()} raw terrain samples.`
                : activePreset
                  ? `Using 36-azimuth LOLA horizon mask for ${activePreset.name}.`
                  : `Using synthesized regional DEM horizon mask at (${lat.toFixed(1)}°, ${lon.toFixed(1)}°).`}
            </p>
          </section>

          {/* 360° Horizon Profile Chart */}
          <section className="card space-y-2 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Compass className="size-4 text-cyan" /> 360° Terrain Horizon Mask
            </h2>
            <div className="h-[190px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={horizonData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="horizonFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#00d9ff" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                  <XAxis dataKey="az" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v}°`} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v}°`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: 'rgba(0,217,255,0.35)',
                      fontSize: '11px',
                    }}
                    formatter={(value: unknown) => [`${Number(value).toFixed(2)}°`, 'Horizon Mask']}
                    labelFormatter={(label) => `Azimuth ${label}°`}
                  />
                  <Area
                    type="monotone"
                    dataKey="horizonDeg"
                    stroke="#00d9ff"
                    strokeWidth={2}
                    fill="url(#horizonFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
