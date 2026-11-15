import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Compass,
  Eye,
  EyeOff,
  MapPin,
  Mountain,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Sun,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { useAppStore } from '@/stores/appStore';
import {
  buildCustomSolarSite,
  SOLAR_PRESET_SITES,
  type SolarSiteProfile,
} from '@/features/solar-analysis/solarPhysics';
import {
  DIRECT_BANDS,
  DIRECT_DSN_STATIONS,
  stepDirectCommsFrame,
  type DirectBand,
  type DirectCommsConfig,
  type DirectCommsFrame,
} from './directCommsPhysics';
import { DirectCommsScene3D, type DirectCameraPreset } from './DirectCommsScene3D';

const SYNODIC_PRESETS = [
  { label: 'Sunlit Direct Link', hours: 0, desc: 'Oblique sunlight + clear Earth-Moon link' },
  { label: 'Crater Shadow', hours: 84, desc: 'Low South Polar grazing ridge shadow' },
  { label: 'Lunar Night', hours: 332, desc: 'Sun behind Moon — night side shadow' },
  { label: 'Sun Blocking (Eclipse)', hours: 601, desc: 'Earth blocks Sun + solar RF blocking' },
] as const;

export default function DirectCommsPage() {
  const globalSite = useAppStore((s) => s.selectedLandingSite);
  const globalCoords = useAppStore((s) => s.selectedCoordinates);

  const [site, setSite] = useState<SolarSiteProfile>(() => {
    if (globalSite && globalSite.category !== 'custom') {
      const m = SOLAR_PRESET_SITES.find((s) => s.id === globalSite.id);
      if (m) return m;
    }
    if (globalCoords) {
      return buildCustomSolarSite(
        'direct-custom',
        globalSite?.name || 'Selected Site',
        globalCoords.latitude_deg,
        globalCoords.longitude_deg,
      );
    }
    return SOLAR_PRESET_SITES.find((s) => s.id === 'malapert-massif') ?? SOLAR_PRESET_SITES[0]!;
  });

  const [synodicHours, setSynodicHours] = useState<number>(0);
  const [band, setBand] = useState<DirectBand>('KA_BAND');
  const [txPowerWatts, setTxPowerWatts] = useState<number>(35);
  const [useTerrainHorizon, setUseTerrainHorizon] = useState<boolean>(true);
  const [rotateEarth, setRotateEarth] = useState<boolean>(true);
  const [enableGoldstone, setEnableGoldstone] = useState<boolean>(true);
  const [enableMadrid, setEnableMadrid] = useState<boolean>(true);
  const [enableCanberra, setEnableCanberra] = useState<boolean>(true);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedHoursPerSec, setSpeedHoursPerSec] = useState<number>(12);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [cameraRequest, setCameraRequest] = useState<{ id: number; target: DirectCameraPreset }>({
    id: 0,
    target: 'overview',
  });

  const simHoursRef = useRef<number>(0);

  const config: DirectCommsConfig = useMemo(
    () => ({
      site,
      synodicHours,
      band,
      txPowerWatts,
      useTerrainHorizon,
      rotateEarth,
      enableGoldstone,
      enableMadrid,
      enableCanberra,
    }),
    [site, synodicHours, band, txPowerWatts, useTerrainHorizon, rotateEarth, enableGoldstone, enableMadrid, enableCanberra],
  );

  const [frame, setFrame] = useState<DirectCommsFrame>(() => stepDirectCommsFrame(config));

  const handleFrameUpdate = useCallback((next: DirectCommsFrame) => {
    setFrame(next);
  }, []);

  const handleScrubHours = (nextHours: number) => {
    setIsPlaying(false);
    simHoursRef.current = nextHours;
    setSynodicHours(nextHours);
  };

  const handleReset = () => {
    setIsPlaying(false);
    simHoursRef.current = 0;
    setSynodicHours(0);
    setCameraRequest((p) => ({ id: p.id + 1, target: 'overview' }));
  };

  const handleSelectSiteCoords = useCallback((lat: number, lon: number) => {
    setSite(buildCustomSolarSite('direct-picked', 'Custom Moon Site', lat, lon));
  }, []);

  const cycleDays = (frame.synodicHours / 24).toFixed(1);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <PageHeader
        title="Direct Communication"
        description="3D direct Moon-to-Earth communication visualization with moving Sun illumination, terrain/eclipse shadows, and solar blocking analysis."
      />

      {/* Sun Motion Transport & Synodic Time Controls */}
      <section className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className={`btn py-1.5 px-4 text-xs font-semibold cursor-pointer ${
                isPlaying
                  ? 'border-warning/60 bg-warning/20 text-warning hover:bg-warning/30'
                  : 'btn-primary'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="size-3.5" /> Pause Sun Motion
                </>
              ) : (
                <>
                  <Play className="size-3.5" /> Animate Sun &amp; Link
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="btn py-1.5 px-3 text-xs cursor-pointer"
            >
              <RotateCcw className="size-3.5" /> Reset
            </button>

            <button
              type="button"
              onClick={() => setShowLabels((v) => !v)}
              className="btn py-1.5 px-3 text-xs cursor-pointer"
            >
              {showLabels ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              {showLabels ? 'Hide Labels' : 'Show Labels'}
            </button>

            <div className="flex items-center gap-1 rounded border border-line bg-bg/70 px-2 py-1 text-[11px]">
              <span className="text-fg-dim mr-1">Speed:</span>
              {[4, 12, 36, 72].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSpeedHoursPerSec(spd)}
                  className={`rounded px-1.5 py-0.5 font-mono transition cursor-pointer ${
                    speedHoursPerSec === spd ? 'bg-cyan text-bg font-bold' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {spd}h/s
                </button>
              ))}
            </div>
          </div>

          {/* Quick Scenario Jumps */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mr-1">
              Jump To:
            </span>
            {SYNODIC_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                title={p.desc}
                onClick={() => handleScrubHours(p.hours)}
                className={`rounded border px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                  Math.abs(frame.synodicHours - p.hours) < 8
                    ? 'border-cyan bg-cyan/15 text-cyan'
                    : 'border-line bg-bg/60 text-fg-muted hover:border-line-strong hover:text-fg'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Synodic Sun Timeline Scrubber */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
            <span className="flex items-center gap-1.5 text-warning">
              <Sun className="size-3.5" />
              Moving Sun Position Timeline (Synodic Cycle 0–708 hrs)
            </span>
            <span className="text-cyan">
              Day {cycleDays} / 29.5d • {Math.round(frame.synodicHours)} hrs • Phase{' '}
              {frame.synodicPhaseDeg.toFixed(1)}°
            </span>
          </div>
          <input
            type="range"
            aria-label="Synodic Sun timeline hours"
            min={0}
            max={707}
            step={1}
            value={Math.round(frame.synodicHours)}
            onChange={(e) => handleScrubHours(Number(e.target.value))}
            className="w-full accent-warning cursor-pointer"
          />
        </div>
      </section>

      {/* Main 3D Stage & Detailed Telemetry Panels */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left 8 Cols: 3D Earth-Moon Direct Communication & Terrain Shadow Canvas */}
        <div className="xl:col-span-8">
          <DirectCommsScene3D
            config={config}
            isPlaying={isPlaying}
            speedHoursPerSec={speedHoursPerSec}
            simHoursRef={simHoursRef}
            showLabels={showLabels}
            cameraRequest={cameraRequest}
            onSelectSiteCoords={handleSelectSiteCoords}
            onFrameUpdate={handleFrameUpdate}
          />
        </div>

        {/* Right 4 Cols: Sun Position Details, Communication Details & Config */}
        <div className="space-y-4 xl:col-span-4">
          {/* Card 1: Sun Position & Shadow Details */}
          <section className="card space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Sun className="size-4 text-warning" /> Sun Position &amp; Shadow Details
              </h2>
              <span
                className={`badge ${
                  frame.illumination === 'SUNLIT'
                    ? 'border-warning/60 bg-warning/15 text-warning'
                    : frame.earthUmbraShadowActive
                      ? 'border-danger/60 bg-danger/15 text-danger'
                      : 'border-cyan/60 bg-cyan/15 text-cyan'
                }`}
              >
                {frame.illumination.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="rounded border border-line bg-bg/60 p-2">
                <div className="text-[10px] text-fg-dim">SUN EL / AZ AT SITE</div>
                <div className="mt-0.5 text-sm font-bold text-warning">
                  {frame.sunElDeg.toFixed(1)}° <span className="text-[11px] font-normal text-fg-muted">/ {frame.sunAzDeg.toFixed(1)}°</span>
                </div>
                <div className="text-[10px] text-fg-dim">
                  Ridge Mask: {frame.sunHorizonElDeg.toFixed(1)}°
                </div>
              </div>

              <div className="rounded border border-line bg-bg/60 p-2">
                <div className="text-[10px] text-fg-dim">SUB-SOLAR POINT</div>
                <div className="mt-0.5 text-sm font-bold text-fg">
                  {frame.subSolarLatDeg.toFixed(1)}°, {frame.subSolarLonDeg.toFixed(1)}°
                </div>
                <div className="text-[10px] text-fg-dim">
                  Synodic Phase: {frame.synodicPhaseDeg.toFixed(0)}°
                </div>
              </div>

              <div className="rounded border border-line bg-bg/60 p-2">
                <div className="text-[10px] text-fg-dim">SUN–EARTH ANGLE (SEP)</div>
                <div
                  className={`mt-0.5 text-sm font-bold ${
                    frame.solarBlockingActive ? 'text-danger' : 'text-success'
                  }`}
                >
                  {frame.sunEarthSepDeg.toFixed(1)}°
                </div>
                <div className="text-[10px] text-fg-dim">
                  {frame.solarBlockingActive ? 'SOLAR BLOCKING (<7.5°)' : 'Clear RF Corridor'}
                </div>
              </div>

              <div className="rounded border border-line bg-bg/60 p-2">
                <div className="text-[10px] text-fg-dim">ECLIPSE UMBRA</div>
                <div
                  className={`mt-0.5 text-sm font-bold ${
                    frame.earthUmbraShadowActive ? 'text-danger' : 'text-cyan'
                  }`}
                >
                  {Math.round(frame.eclipseFraction * 100)}%
                </div>
                <div className="text-[10px] text-fg-dim">
                  {frame.earthUmbraShadowActive ? 'Earth Blocking Sun' : 'Direct Sunlight'}
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Direct Communication Details */}
          <section className="card space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Radio className="size-4 text-cyan" /> Direct Communication Details
              </h2>
              <span
                className={`badge ${
                  frame.linkUp
                    ? 'border-success/60 bg-success/15 text-success'
                    : 'border-danger/60 bg-danger/15 text-danger'
                }`}
              >
                {frame.linkUp ? <Wifi className="mr-1 size-3" /> : <WifiOff className="mr-1 size-3" />}
                {frame.linkUp ? 'LINK UP' : 'BLOCKED'}
              </span>
            </div>

            <p className={`font-mono text-[11px] ${frame.linkUp ? 'text-success' : 'text-danger'}`}>
              {frame.linkStatusDetail}
            </p>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="rounded border border-line bg-bg/60 p-2">
                <div className="text-[10px] text-fg-dim">ACTIVE DSN DISH</div>
                <div className="mt-0.5 truncate text-sm font-bold text-fg">
                  {frame.activeDish ? frame.activeDish.name : 'No Dish Locked'}
                </div>
                <div className="text-[10px] text-fg-dim">
                  {frame.activeDish
                    ? `Dish El: ${frame.activeDish.elevationToMoonDeg}°`
                    : 'Below 4° / Blocked'}
                </div>
              </div>

              <div className="rounded border border-line bg-bg/60 p-2">
                <div className="text-[10px] text-fg-dim">EARTH EL / RIDGE MASK</div>
                <div className="mt-0.5 text-sm font-bold text-cyan">
                  {frame.earthElDeg.toFixed(1)}° <span className="text-[11px] font-normal text-fg-muted">/ {frame.earthHorizonElDeg.toFixed(1)}°</span>
                </div>
                <div className="text-[10px] text-fg-dim">Azimuth {frame.earthAzDeg.toFixed(1)}°</div>
              </div>

              <div className="rounded border border-line bg-bg/60 p-2">
                <div className="text-[10px] text-fg-dim">THROUGHPUT / SNR</div>
                <div className={`mt-0.5 text-sm font-bold ${frame.linkUp ? 'text-success' : 'text-danger'}`}>
                  {frame.rateMbps} Mbps
                </div>
                <div className="text-[10px] text-fg-dim">
                  SNR {frame.snrDb} dB{frame.solarNoisePenaltyDb > 0 ? ` (-${frame.solarNoisePenaltyDb}dB sun)` : ''}
                </div>
              </div>

              <div className="rounded border border-line bg-bg/60 p-2">
                <div className="text-[10px] text-fg-dim">CISLUNAR DELAY</div>
                <div className="mt-0.5 text-sm font-bold text-fg">{frame.oneWayDelaySec} s</div>
                <div className="text-[10px] text-fg-dim">
                  RTT {frame.rttSec} s • {frame.slantRangeKm.toLocaleString()} km
                </div>
              </div>
            </div>
          </section>

          {/* Card 3: Lunar Site & Direct RF Configuration */}
          <section className="card space-y-3 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Compass className="size-4 text-cyan" /> Lunar Site &amp; RF Settings
            </h2>

            <div>
              <label className="label mb-1 flex items-center gap-1">
                <MapPin className="size-3 text-cyan" /> Landing Site (or Click 3D Moon)
              </label>
              <select
                value={site.isCustom ? '__custom__' : site.id}
                onChange={(e) => {
                  const found = SOLAR_PRESET_SITES.find((s) => s.id === e.target.value);
                  if (found) setSite(found);
                }}
                className="field py-1.5 text-xs"
              >
                {SOLAR_PRESET_SITES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.lat.toFixed(1)}°, {s.lon.toFixed(1)}°)
                  </option>
                ))}
                {site.isCustom && (
                  <option value="__custom__">
                    Custom ({site.lat.toFixed(2)}°, {site.lon.toFixed(2)}°)
                  </option>
                )}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {(Object.keys(DIRECT_BANDS) as DirectBand[]).map((bKey) => (
                <button
                  key={bKey}
                  type="button"
                  onClick={() => setBand(bKey)}
                  className={`rounded border px-2 py-1.5 text-[11px] font-medium transition cursor-pointer ${
                    band === bKey
                      ? 'border-cyan bg-cyan/15 text-cyan'
                      : 'border-line bg-bg/60 text-fg-muted hover:text-fg'
                  }`}
                >
                  {bKey === 'S_BAND' ? 'S-Band' : bKey === 'KA_BAND' ? 'Ka-Band' : 'Optical'}
                </button>
              ))}
            </div>

            <label className="flex items-center justify-between gap-2 text-xs">
              <span className="text-fg-muted">TX Power ({txPowerWatts} W)</span>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={txPowerWatts}
                onChange={(e) => setTxPowerWatts(Number(e.target.value))}
                className="w-36 accent-cyan cursor-pointer"
              />
            </label>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setUseTerrainHorizon((v) => !v)}
                className={`flex items-center justify-center gap-1.5 rounded border px-2 py-1.5 font-medium transition cursor-pointer ${
                  useTerrainHorizon
                    ? 'border-success/50 bg-success/15 text-success'
                    : 'border-line bg-bg/60 text-fg-muted'
                }`}
              >
                <Mountain className="size-3.5" />
                {useTerrainHorizon ? 'LOLA Mask ON' : 'Flat 0° Mask'}
              </button>
              <button
                type="button"
                onClick={() => setRotateEarth((v) => !v)}
                className={`rounded border px-2 py-1.5 font-medium transition cursor-pointer ${
                  rotateEarth
                    ? 'border-cyan/50 bg-cyan/15 text-cyan'
                    : 'border-line bg-bg/60 text-fg-muted'
                }`}
              >
                {rotateEarth ? 'Earth Spin: ON' : 'Earth Spin: OFF'}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-[11px]">
              <span className="text-fg-dim">DSN Dishes:</span>
              <div className="flex flex-wrap gap-3">
                {DIRECT_DSN_STATIONS.map((st) => {
                  const checked =
                    st.id === 'dsn-goldstone'
                      ? enableGoldstone
                      : st.id === 'dsn-madrid'
                        ? enableMadrid
                        : enableCanberra;
                  const toggle = () => {
                    if (st.id === 'dsn-goldstone') setEnableGoldstone((v) => !v);
                    else if (st.id === 'dsn-madrid') setEnableMadrid((v) => !v);
                    else setEnableCanberra((v) => !v);
                  };
                  return (
                    <label key={st.id} className="flex items-center gap-1 text-fg-muted cursor-pointer">
                      <input type="checkbox" checked={checked} onChange={toggle} className="accent-cyan" />
                      <span>{st.name.replace(' 70m', '')}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
