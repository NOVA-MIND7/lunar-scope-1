import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Mountain,
  Pause,
  Play,
  Sparkles,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/common/PageHeader';
import { useAppStore } from '@/stores/appStore';
import { toUtcIso } from '@/utils/time';
import { SolarGlobeSim } from './SolarGlobeSim';
import {
  buildCustomSolarSite,
  findBestSolarWindowDelay,
  simulateSolarWindow,
  SOLAR_PRESET_SITES,
  type SolarPanelMode,
  type SolarSiteProfile,
  type SolarSimulationSummary,
  type SolarTimeStepMinutes,
} from './solarPhysics';

const TIME_STEP_OPTIONS: { value: SolarTimeStepMinutes; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hr' },
  { value: 120, label: '2 hr' },
  { value: 360, label: '6 hr' },
];

type SiteSelection =
  | { mode: 'preset'; siteId: string }
  | { mode: 'custom'; label: string; lat: number; lon: number };

function resolveSite(sel: SiteSelection, idPrefix: string, fallbackIdx: number): SolarSiteProfile {
  if (sel.mode === 'preset') {
    return SOLAR_PRESET_SITES.find((s) => s.id === sel.siteId) ?? SOLAR_PRESET_SITES[fallbackIdx]!;
  }
  return buildCustomSolarSite(idPrefix, sel.label, sel.lat, sel.lon);
}

function addDaysToUtcInputs(dateStr: string, timeStr: string, days: number): { date: string; time: string } {
  const iso = toUtcIso(dateStr, timeStr);
  const shifted = new Date(Date.parse(iso) + days * 86_400_000).toISOString();
  return {
    date: shifted.slice(0, 10),
    time: shifted.slice(11, 16),
  };
}

function SiteControlCard({
  selection,
  resolvedSite,
  onSelectPreset,
  onChangeCustom,
  onImportGlobal,
  hasGlobalSelection,
}: {
  selection: SiteSelection;
  resolvedSite: SolarSiteProfile;
  onSelectPreset: (siteId: string) => void;
  onChangeCustom: (lat: number, lon: number) => void;
  onImportGlobal?: () => void;
  hasGlobalSelection?: boolean;
}) {
  return (
    <div className="rounded-card border border-cyan/50 bg-bg-secondary/75 p-3.5 shadow-[0_0_16px_rgba(0,217,255,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-cyan" />
          <span className="text-xs font-semibold uppercase tracking-wider text-fg">
            Landing Site Coordinates
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onImportGlobal && hasGlobalSelection && (
            <button
              type="button"
              onClick={onImportGlobal}
              className="rounded border border-cyan/40 bg-cyan/10 px-2 py-0.5 text-xs font-medium text-cyan hover:bg-cyan/20 cursor-pointer"
              title="Use coordinate selected in Lunar Explorer"
            >
              Use Explorer Pick
            </button>
          )}
          <span className="rounded border border-cyan/40 bg-cyan/10 px-2 py-0.5 text-xs font-medium text-cyan">
            Click Globe or Select Preset
          </span>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-12">
        <div className="sm:col-span-6">
          <label className="label mb-1 block">Preset Candidate Site</label>
          <select
            value={selection.mode === 'preset' ? selection.siteId : '__custom__'}
            onChange={(e) => {
              if (e.target.value === '__custom__') {
                onChangeCustom(resolvedSite.lat, resolvedSite.lon);
              } else {
                onSelectPreset(e.target.value);
              }
            }}
            className="field py-1.5 text-xs"
          >
            {SOLAR_PRESET_SITES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.lat.toFixed(1)}°, {s.lon.toFixed(1)}°)
              </option>
            ))}
            <option value="__custom__">Custom Globe Coordinates</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <label className="label mb-1 block">Latitude (°)</label>
          <input
            type="number"
            min={-90}
            max={90}
            step={0.1}
            value={resolvedSite.lat}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) {
                onChangeCustom(Math.max(-90, Math.min(90, v)), resolvedSite.lon);
              }
            }}
            className="field py-1.5 font-mono text-xs"
          />
        </div>

        <div className="sm:col-span-3">
          <label className="label mb-1 block">Longitude (°)</label>
          <input
            type="number"
            min={-180}
            max={180}
            step={0.1}
            value={resolvedSite.lon}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) {
                onChangeCustom(resolvedSite.lat, Math.max(-180, Math.min(180, v)));
              }
            }}
            className="field py-1.5 font-mono text-xs"
          />
        </div>
      </div>

      <p className="mt-2 text-sm text-fg-muted truncate" title={resolvedSite.description}>
        {resolvedSite.program} • Elev: {resolvedSite.elevationMeters}m • Slope: {resolvedSite.slopeDeg}°
      </p>
    </div>
  );
}

function SiteTelemetryCard({
  summary,
  stepIdx,
}: {
  summary: SolarSimulationSummary;
  stepIdx: number;
}) {
  const pt = summary.points[stepIdx] ?? summary.points[0]!;
  const isOptimal = summary.verdict === 'GO - OPTIMAL';
  const isCaution = summary.verdict.startsWith('GO (');

  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-cyan" />
            <h3 className="truncate text-sm font-semibold text-fg">{summary.site.name}</h3>
          </div>
          <p className="mt-0.5 font-mono text-sm text-fg-muted">
            Lat {summary.site.lat.toFixed(2)}° • Lon {summary.site.lon.toFixed(2)}°
          </p>
        </div>

        <span
          className={`badge ${
            isOptimal
              ? 'border-success/50 bg-success/15 text-success'
              : isCaution
                ? 'border-warning/50 bg-warning/15 text-warning'
                : 'border-danger/50 bg-danger/15 text-danger'
          }`}
        >
          {isOptimal ? (
            <CheckCircle2 className="mr-1 size-3" />
          ) : (
            <AlertTriangle className="mr-1 size-3" />
          )}
          {summary.verdict}
        </span>
      </div>

      {/* Instantaneous Telemetry at Scrubbed UTC Step */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded border border-line bg-bg/60 p-2">
          <div className="text-xs text-fg-muted flex items-center gap-1">
            <Sun className="size-3 text-warning" /> Sun Position
          </div>
          <div className="mt-0.5 font-mono text-sm font-bold text-fg">
            {pt.sunEl.toFixed(1)}° <span className="text-xs text-fg-dim">el</span>
          </div>
          <div className="font-mono text-xs text-fg-muted">Az {pt.sunAz.toFixed(1)}°</div>
        </div>

        <div className="rounded border border-line bg-bg/60 p-2">
          <div className="text-xs text-fg-muted flex items-center gap-1">
            <BatteryCharging className="size-3 text-success" /> Solar Power
          </div>
          <div
            className={`mt-0.5 font-mono text-sm font-bold ${
              pt.isSunlit ? 'text-success' : 'text-danger'
            }`}
          >
            {pt.solarWatts} W
          </div>
          <div className="font-mono text-xs text-fg-muted">
            {pt.isSunlit ? 'SUNLIT' : 'SHADOWED'} (Mask {pt.effectiveHorizonEl.toFixed(1)}°)
          </div>
        </div>

        <div className="rounded border border-line bg-bg/60 p-2">
          <div className="text-xs text-fg-muted flex items-center gap-1">
            <Thermometer className="size-3 text-cyan" /> Surface Temp
          </div>
          <div
            className={`mt-0.5 font-mono text-sm font-bold ${
              pt.surfaceTempC < -140 ? 'text-cyan' : 'text-warning'
            }`}
          >
            {pt.surfaceTempC}°C
          </div>
          <div className="font-mono text-xs text-fg-muted">
            {summary.minTempC}°..{summary.maxTempC}°C
          </div>
        </div>

        <div className="rounded border border-line bg-bg/60 p-2">
          <div className="text-xs text-fg-muted flex items-center gap-1">
            <Wind className="size-3 text-warning" /> Dust Lofting
          </div>
          <div
            className={`mt-0.5 font-mono text-sm font-bold ${
              pt.dustIndex >= 75
                ? 'text-danger'
                : pt.dustIndex >= 40
                  ? 'text-warning'
                  : 'text-success'
            }`}
          >
            {pt.dustIndex}/100
          </div>
          <div className="truncate font-mono text-xs text-fg-muted">{pt.dustRisk}</div>
        </div>
      </div>

      {/* Window Aggregate Metrics */}
      <div className="grid grid-cols-2 gap-2 border-t border-line pt-2.5 text-xs sm:grid-cols-4">
        <div>
          <div className="text-xs text-fg-dim">Sunlight</div>
          <div className="font-mono font-bold text-warning">
            {summary.sunlightPercent}% ({summary.sunlitHours}h)
          </div>
        </div>
        <div>
          <div className="text-xs text-fg-dim">Max Darkness</div>
          <div className="font-mono font-bold text-fg">{summary.maxDarkHours} hrs</div>
        </div>
        <div>
          <div className="text-xs text-fg-dim">Avg / Energy</div>
          <div className="font-mono font-bold text-success">
            {summary.avgWatts} W • {summary.totalEnergyKwh} kWh
          </div>
        </div>
        <div>
          <div className="text-xs text-fg-dim">Terrain Loss</div>
          <div className="font-mono font-bold text-cyan">
            {summary.useTerrainHorizon ? `${summary.terrainShadowLossPercent}%` : 'Disabled'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SolarAnalysisPage() {
  const globalCoords = useAppStore((s) => s.selectedCoordinates);
  const globalSite = useAppStore((s) => s.selectedLandingSite);
  const globalDate = useAppStore((s) => s.selectedLandingDate);
  const globalTime = useAppStore((s) => s.selectedLandingTime);
  const globalDuration = useAppStore((s) => s.selectedMissionDuration);

  // Initialize selected landing site from Explorer selection if available, otherwise Malapert Massif
  const [siteSel, setSiteSel] = useState<SiteSelection>(() => {
    if (globalSite && globalSite.category !== 'custom') {
      const match = SOLAR_PRESET_SITES.find((s) => s.id === globalSite.id);
      if (match) return { mode: 'preset', siteId: match.id };
    }
    if (globalCoords) {
      return {
        mode: 'custom',
        label: globalSite?.name || 'Selected Site',
        lat: globalCoords.latitude_deg,
        lon: globalCoords.longitude_deg,
      };
    }
    return { mode: 'preset', siteId: 'malapert-massif' };
  });

  // Planned inputs: Start/end time (UTC), Time step, Terrain horizon (optional)
  const [startDate, setStartDate] = useState<string>(globalDate || '2027-01-01');
  const [startTime, setStartTime] = useState<string>(globalTime || '00:00');
  const initialEnd = useMemo(
    () => addDaysToUtcInputs(globalDate || '2027-01-01', globalTime || '00:00', globalDuration || 14),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [endDate, setEndDate] = useState<string>(initialEnd.date);
  const [endTime, setEndTime] = useState<string>(initialEnd.time);
  const [delayDays, setDelayDays] = useState<number>(0);
  const [timeStepMinutes, setTimeStepMinutes] = useState<SolarTimeStepMinutes>(120);
  const [useTerrainHorizon, setUseTerrainHorizon] = useState<boolean>(true);
  const [panelMode, setPanelMode] = useState<SolarPanelMode>('VERTICAL_TRACKING');

  const [stepIdx, setStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const site = useMemo(() => resolveSite(siteSel, 'selected-site', 2), [siteSel]);

  const startUtc = useMemo(() => toUtcIso(startDate, startTime), [startDate, startTime]);
  const endUtc = useMemo(() => toUtcIso(endDate, endTime), [endDate, endTime]);

  const simOptions = useMemo(
    () => ({
      startUtc,
      endUtc,
      delayDays,
      timeStepMinutes,
      useTerrainHorizon,
      panelMode,
    }),
    [startUtc, endUtc, delayDays, timeStepMinutes, useTerrainHorizon, panelMode],
  );

  const sim = useMemo(() => simulateSolarWindow(site, simOptions), [site, simOptions]);

  const clampedStepIdx = Math.min(stepIdx, Math.max(0, sim.points.length - 1));
  const currentPoint = sim.points[clampedStepIdx] ?? sim.points[0]!;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setStepIdx((prev) => (prev + 1 >= sim.points.length ? 0 : prev + 1));
    }, 180);
    return () => window.clearInterval(timer);
  }, [isPlaying, sim.points.length]);

  const handleGlobePickCoordinates = (lat: number, lon: number) => {
    setSiteSel({
      mode: 'custom',
      label: 'Selected Site',
      lat,
      lon,
    });
  };

  const handleSelectPresetSite = (siteId: string) => {
    setSiteSel({ mode: 'preset', siteId });
  };

  const handleImportGlobalSite = () => {
    if (!globalCoords) return;
    setSiteSel({
      mode: 'custom',
      label: globalSite?.name || 'Explorer Location',
      lat: globalCoords.latitude_deg,
      lon: globalCoords.longitude_deg,
    });
  };

  const handleSetDurationDays = (days: number) => {
    const next = addDaysToUtcInputs(startDate, startTime, days);
    setEndDate(next.date);
    setEndTime(next.time);
    setStepIdx(0);
  };

  const handleFindBestDate = () => {
    const best = findBestSolarWindowDelay(site, {
      startUtc,
      endUtc,
      timeStepMinutes,
      useTerrainHorizon,
      panelMode,
    });
    setDelayDays(best.bestDelayDays);
    setStepIdx(0);
  };

  // Build 360° LOLA horizon SVG polygon for selected site
  const buildHorizonPolygon = (mask: number[]) => {
    const pts = mask.map((elDeg, idx) => {
      const x = ((idx * 10) / 360) * 720;
      const y = 165 - elDeg * 12;
      return `${x},${y}`;
    });
    pts.push(`720,${165 - (mask[0] ?? 0) * 12}`);
    return `0,210 ${pts.join(' ')} 720,210`;
  };

  const horizonPoly = useMemo(() => buildHorizonPolygon(site.terrainMask), [site.terrainMask]);

  // Recharts dataset (decimated if >250 points for smooth rendering)
  const chartData = useMemo(() => {
    const stride = Math.max(1, Math.floor(sim.points.length / 220));
    const rows = [];
    for (let i = 0; i < sim.points.length; i += stride) {
      const a = sim.points[i];
      if (!a) continue;
      rows.push({
        label: a.shortLabelUtc,
        sunEl: a.sunEl,
        watts: a.solarWatts,
      });
    }
    return rows;
  }, [sim.points]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader
        title="Solar Analysis"
        description="Sun position, LOLA terrain horizon shadows, and illumination simulation for your selected lunar landing site."
      />

      {/* PLANNED INPUTS & COORDINATE SELECTION PANEL */}
      <section className="card space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Compass className="size-4 text-cyan" />
            <h2 className="text-sm font-semibold text-fg">
              Simulation Inputs (Coordinates, UTC Window, Time Step & Terrain Horizon)
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-mono">
            <span className="rounded border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-warning">
              Client-Side AstraRelay Physics • API POST /api/astronomy/sunlight (501)
            </span>
          </div>
        </div>

        {/* Row 1: Single Selected Place */}
        <SiteControlCard
          selection={siteSel}
          resolvedSite={site}
          onSelectPreset={(id) => setSiteSel({ mode: 'preset', siteId: id })}
          onChangeCustom={(lat, lon) =>
            setSiteSel({ mode: 'custom', label: 'Selected Site', lat, lon })
          }
          onImportGlobal={handleImportGlobalSite}
          hasGlobalSelection={Boolean(globalCoords)}
        />

        {/* Row 2: Start/End Time (UTC), Time Step, Terrain Horizon (Optional), Array & Optimizer */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
          {/* Start Time UTC */}
          <div className="xl:col-span-3 rounded border border-line bg-bg/50 p-3">
            <label className="label mb-1.5 flex items-center gap-1">
              <Calendar className="size-3 text-cyan" /> Start Time (UTC)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  if (e.target.value) setStartDate(e.target.value);
                }}
                className="field py-1.5 font-mono text-xs"
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => {
                  if (e.target.value) setStartTime(e.target.value);
                }}
                className="field py-1.5 font-mono text-xs"
              />
            </div>
          </div>

          {/* End Time UTC */}
          <div className="xl:col-span-3 rounded border border-line bg-bg/50 p-3">
            <div className="mb-1.5 flex items-center justify-between gap-1">
              <label className="label flex items-center gap-1">
                <Clock className="size-3 text-warning" /> End Time (UTC)
              </label>
              <div className="flex gap-1">
                {[3, 7, 14, 28].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSetDurationDays(d)}
                    className="rounded border border-line px-1.5 py-0.5 font-mono text-xs text-fg-muted hover:border-cyan/60 hover:text-cyan"
                  >
                    +{d}d
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  if (e.target.value) setEndDate(e.target.value);
                }}
                className="field py-1.5 font-mono text-xs"
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => {
                  if (e.target.value) setEndTime(e.target.value);
                }}
                className="field py-1.5 font-mono text-xs"
              />
            </div>
          </div>

          {/* Time Step */}
          <div className="xl:col-span-2 rounded border border-line bg-bg/50 p-3">
            <label className="label mb-1.5 block">Time Step</label>
            <select
              value={timeStepMinutes}
              onChange={(e) => {
                setTimeStepMinutes(Number(e.target.value) as SolarTimeStepMinutes);
                setStepIdx(0);
              }}
              className="field py-1.5 font-mono text-xs"
            >
              {TIME_STEP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({sim.points.length} pts)
                </option>
              ))}
            </select>
            <div className="mt-1.5 font-mono text-xs text-fg-dim">
              Window: {sim.durationHours} hrs
            </div>
          </div>

          {/* Terrain Horizon (Optional) & Solar Array */}
          <div className="xl:col-span-2 rounded border border-line bg-bg/50 p-3">
            <label className="label mb-1.5 flex items-center gap-1">
              <Mountain className="size-3 text-success" /> Terrain Horizon (Optional)
            </label>
            <button
              type="button"
              onClick={() => setUseTerrainHorizon((v) => !v)}
              className={`w-full rounded border px-2.5 py-1.5 text-xs font-semibold transition ${
                useTerrainHorizon
                  ? 'border-success/60 bg-success/15 text-success'
                  : 'border-line-strong bg-bg-secondary text-fg-muted'
              }`}
            >
              {useTerrainHorizon ? 'ON: 360° LOLA Mask' : 'OFF: Ideal 0° Sphere'}
            </button>
            <select
              value={panelMode}
              onChange={(e) => setPanelMode(e.target.value as SolarPanelMode)}
              className="mt-1.5 w-full rounded border border-line bg-bg px-2 py-1 text-sm text-fg-muted"
            >
              <option value="VERTICAL_TRACKING">Array: Vertical Tracking (400W)</option>
              <option value="FLAT_HORIZONTAL">Array: Flat Horizontal (400W)</option>
            </select>
          </div>

          {/* Launch Delay Scrubber + Best Window Optimizer */}
          <div className="xl:col-span-2 rounded border border-line bg-bg/50 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="label text-warning">Delay: +{delayDays}d</span>
              <button
                type="button"
                onClick={handleFindBestDate}
                className="inline-flex items-center gap-1 rounded bg-cyan px-2 py-0.5 text-xs font-bold text-bg hover:opacity-90"
              >
                <Sparkles className="size-3" /> Best Date
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={29}
              value={delayDays}
              onChange={(e) => {
                setDelayDays(Number(e.target.value));
                setStepIdx(0);
              }}
              className="w-full accent-cyan cursor-pointer"
            />
            <div className="mt-1 font-mono text-xs text-fg-dim">
              Shifts window +{delayDays} Earth days
            </div>
          </div>
        </div>
      </section>

      {/* MAIN SIMULATION VIEWPORT: 3D INTERACTIVE GLOBE + SITE SOLAR TELEMETRY */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SolarGlobeSim
            site={site}
            point={currentPoint}
            onPickCoordinates={handleGlobePickCoordinates}
            onSelectPresetSite={handleSelectPresetSite}
            useTerrainHorizon={useTerrainHorizon}
          />
        </div>

        <div className="flex flex-col gap-4 xl:col-span-5">
          <SiteTelemetryCard summary={sim} stepIdx={clampedStepIdx} />

          {/* Selected Site Science & Window Overview */}
          <div className="card space-y-2 p-4 text-xs text-fg-muted">
            <div className="label text-cyan">Site Science & Illumination Notes</div>
            <p className="leading-relaxed text-fg">{site.scienceValue}</p>
            <p className="text-sm text-fg-dim">{site.description}</p>
          </div>
        </div>
      </section>

      {/* TIMELINE SCRUBBER + 360° LOLA HORIZON MASK PANORAMA */}
      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Clock className="size-4 text-warning" />
              Solar Timeline Scrubber & 360° Terrain Horizon Mask Panorama
            </h3>
            <p className="text-xs text-fg-muted">
              Play or scrub across every {timeStepMinutes}-minute step to inspect grazing Sun paths
              at {site.name} against the LOLA ridge horizon.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="btn btn-primary py-1.5 px-3 text-xs"
            >
              {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <span className="rounded border border-line-strong bg-bg px-3 py-1.5 font-mono text-xs text-cyan">
              +{currentPoint.hourOffset}h • {currentPoint.timestampUtc}
            </span>
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(0, sim.points.length - 1)}
          value={clampedStepIdx}
          onChange={(e) => {
            setIsPlaying(false);
            setStepIdx(Number(e.target.value));
          }}
          className="w-full accent-cyan cursor-pointer"
        />

        <div className="overflow-hidden rounded border border-line bg-bg">
          <svg viewBox="0 0 720 215" className="block h-52 w-full">
            {/* Reference Elevation Grid */}
            <line x1="0" y1="45" x2="720" y2="45" stroke="#1c2b42" strokeDasharray="4 4" />
            <line x1="0" y1="105" x2="720" y2="105" stroke="#1c2b42" strokeDasharray="4 4" />
            <line x1="0" y1="165" x2="720" y2="165" stroke="#2b4262" strokeWidth="1.5" />

            <text x="8" y="42" fill="#64748b" fontSize="9" fontFamily="monospace">
              +10°
            </text>
            <text x="8" y="102" fill="#64748b" fontSize="9" fontFamily="monospace">
              +5°
            </text>
            <text x="8" y="161" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              0° Horizon
            </text>

            {/* Terrain Horizon Mask */}
            {useTerrainHorizon && (
              <polygon
                points={horizonPoly}
                fill="rgba(0, 217, 255, 0.16)"
                stroke="#00d9ff"
                strokeWidth="1.6"
              />
            )}

            {/* Full-Window Sun Path Samples */}
            {sim.points.map((pt, i) => (
              <circle
                key={`sun-${i}`}
                cx={(pt.sunAz / 360) * 720}
                cy={Math.max(12, Math.min(202, 165 - pt.sunEl * 12))}
                r="1.8"
                fill={pt.isSunlit ? '#00d9ff' : '#ff5263'}
                opacity="0.55"
              />
            ))}

            {/* Current Sun Position Marker */}
            <g
              transform={`translate(${(currentPoint.sunAz / 360) * 720}, ${Math.max(
                16,
                Math.min(198, 165 - currentPoint.sunEl * 12),
              )})`}
            >
              <circle r="6.5" fill={currentPoint.isSunlit ? '#00d9ff' : '#ff5263'} stroke="#fff" />
              <text x="9" y="4" fill="#00d9ff" fontSize="11" fontWeight="bold">
                Sun ({currentPoint.sunEl.toFixed(1)}°)
              </text>
            </g>

            {/* Azimuth Compass Labels */}
            <text x="12" y="208" fill="#64748b" fontSize="9" fontFamily="monospace">
              0° N
            </text>
            <text x="180" y="208" fill="#64748b" fontSize="9" fontFamily="monospace">
              90° E
            </text>
            <text x="352" y="208" fill="#64748b" fontSize="9" fontFamily="monospace">
              180° S
            </text>
            <text x="530" y="208" fill="#64748b" fontSize="9" fontFamily="monospace">
              270° W
            </text>
            <text x="688" y="208" fill="#64748b" fontSize="9" fontFamily="monospace">
              360° N
            </text>
          </svg>
        </div>
      </section>

      {/* TIME-SERIES SOLAR ELEVATION & POWER CHARTS */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Sun className="size-4 text-warning" /> Sun Elevation Profile (°)
            </h3>
            <span className="font-mono text-xs text-fg-dim">UTC timeline</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#1c2b42" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} minTickGap={28} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="°" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0d1422',
                    borderColor: '#2b4262',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" />
                <ReferenceLine x={currentPoint.shortLabelUtc} stroke="#f4f7fc" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="sunEl"
                  name={`${site.name} Sun El (°)`}
                  stroke="#00d9ff"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <BatteryCharging className="size-4 text-success" /> Solar Array Power Output (W)
            </h3>
            <span className="font-mono text-xs text-fg-dim">400 W peak array</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#1c2b42" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} minTickGap={28} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="W" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0d1422',
                    borderColor: '#2b4262',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <ReferenceLine x={currentPoint.shortLabelUtc} stroke="#f4f7fc" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="watts"
                  name={`${site.name} Power (W)`}
                  stroke="#00d9ff"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
