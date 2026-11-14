import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  MapPin,
  Plus,
  Radio,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/common/PageHeader';
import { useAppStore } from '@/stores/appStore';
import type { ComparisonScenario } from '@/types';
import { toUtcIso } from '@/utils/time';
import {
  buildCustomComparisonSite,
  buildSiteAndDurationRecommendation,
  computeSitePairDistanceKm,
  evaluateMissionScenario,
  PRESET_COMPARISON_SITES,
  type CommsMode,
  type ComparisonSite,
  type MissionVerdict,
  type ScenarioEvaluation,
} from './comparisonEngine';

type ScenarioInputMode = 'preset' | 'custom' | 'queued';

interface ScenarioConfig {
  mode: ScenarioInputMode;
  presetId: string;
  queuedId: string;
  customName: string;
  customLat: number;
  customLon: number;
  customElevM: number;
  customSlopeDeg: number;
  landingDate: string;
  landingTime: string;
  durationDays: number;
  delayDays: number;
}

function safeToUtcIso(dateStr: string, timeStr: string): string {
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : '2027-01-01';
  const hhmm = timeStr.slice(0, 5);
  const validTime = /^\d{2}:\d{2}$/.test(hhmm) ? hhmm : '00:00';
  try {
    return toUtcIso(validDate, validTime);
  } catch {
    return '2027-01-01T00:00:00.000Z';
  }
}

/** Controlled numeric input that permits typing '-', clearing, and decimals without cursor jumps. */
function NumericField({
  value,
  min,
  max,
  step = 1,
  integer = false,
  onCommit,
  className = '',
  ariaLabel,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  onCommit: (next: number) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(String(value));
    }
  }, [value, focused]);

  const clampVal = (num: number) => {
    let out = integer ? Math.round(num) : num;
    if (min !== undefined) out = Math.max(min, out);
    if (max !== undefined) out = Math.min(max, out);
    return out;
  };

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      value={focused ? draft : String(value)}
      onFocus={() => {
        setFocused(true);
        setDraft(String(value));
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw === '' || raw === '-' || raw.endsWith('.')) return;
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) {
          onCommit(clampVal(parsed));
        }
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = Number(draft);
        const committed = draft.trim() === '' || !Number.isFinite(parsed) ? value : clampVal(parsed);
        onCommit(committed);
        setDraft(String(committed));
      }}
      className={className}
    />
  );
}

function resolveComparisonSite(
  cfg: ScenarioConfig,
  idPrefix: string,
  queuedScenarios: ComparisonScenario[],
  fallbackIdx: number,
): ComparisonSite {
  if (cfg.mode === 'queued') {
    const q = queuedScenarios.find((s) => s.id === cfg.queuedId);
    if (q) {
      const presetMatch = PRESET_COMPARISON_SITES.find((p) => p.id === q.siteId);
      if (presetMatch) return presetMatch;
      return buildCustomComparisonSite(
        q.id,
        q.label,
        q.coordinates.latitude_deg,
        q.coordinates.longitude_deg,
      );
    }
  }
  if (cfg.mode === 'custom') {
    return buildCustomComparisonSite(
      `${idPrefix}-custom`,
      cfg.customName,
      cfg.customLat,
      cfg.customLon,
      cfg.customElevM,
      cfg.customSlopeDeg,
    );
  }
  return PRESET_COMPARISON_SITES.find((s) => s.id === cfg.presetId) ?? PRESET_COMPARISON_SITES[fallbackIdx]!;
}

function verdictBadgeClass(verdict: MissionVerdict): string {
  if (verdict === 'GO - OPTIMAL') return 'border-success/50 bg-success/15 text-success';
  if (verdict.startsWith('GO')) return 'border-cyan/50 bg-cyan/15 text-cyan';
  return 'border-danger/50 bg-danger/15 text-danger';
}

function ScenarioEditorCard({
  badge,
  cfg,
  resolvedSite,
  queuedScenarios,
  isWinner,
  score,
  hasExplorerCoords,
  onChange,
  onImportExplorer,
  onSaveToQueue,
}: {
  badge: 'A' | 'B';
  cfg: ScenarioConfig;
  resolvedSite: ComparisonSite;
  queuedScenarios: ComparisonScenario[];
  isWinner: boolean;
  score: number;
  hasExplorerCoords: boolean;
  onChange: (next: ScenarioConfig) => void;
  onImportExplorer: () => void;
  onSaveToQueue: () => void;
}) {
  const effectiveMode: ScenarioInputMode =
    cfg.mode === 'queued' && !queuedScenarios.some((q) => q.id === cfg.queuedId) ? 'preset' : cfg.mode;

  const accentBorder =
    badge === 'A'
      ? isWinner
        ? 'border-cyan/80 shadow-[0_0_16px_rgba(0,217,255,0.14)]'
        : 'border-cyan/35'
      : isWinner
        ? 'border-warning/80 shadow-[0_0_16px_rgba(255,181,71,0.14)]'
        : 'border-warning/35';

  return (
    <div className={`card space-y-3 p-4 ${accentBorder}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex size-6 items-center justify-center rounded font-mono text-xs font-bold ${
              badge === 'A' ? 'bg-cyan text-bg' : 'bg-warning text-bg'
            }`}
          >
            {badge}
          </span>
          <div>
            <h2 className="text-sm font-semibold text-fg">Plan {badge}</h2>
            <p className="font-mono text-[11px] text-fg-muted">
              Score: <strong className="text-fg">{score}/100</strong>
              {isWinner && <span className="ml-1.5 text-success">• RECOMMENDED</span>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {hasExplorerCoords && (
            <button
              type="button"
              onClick={onImportExplorer}
              className="rounded border border-cyan/40 bg-cyan/10 px-2 py-1 text-[10px] font-medium text-cyan hover:bg-cyan/20 cursor-pointer"
            >
              Use Explorer Pick
            </button>
          )}
          <button
            type="button"
            onClick={onSaveToQueue}
            className="inline-flex items-center gap-1 rounded border border-line-strong bg-bg/70 px-2 py-1 text-[10px] font-medium text-fg-muted hover:border-cyan/60 hover:text-cyan cursor-pointer"
          >
            <Plus className="size-3" /> Queue
          </button>
        </div>
      </div>

      {/* Source Tabs */}
      <div className="grid grid-cols-3 gap-1 rounded border border-line bg-bg/70 p-1 text-[11px] font-semibold">
        <button
          type="button"
          onClick={() => onChange({ ...cfg, mode: 'preset' })}
          className={`rounded py-1 transition cursor-pointer ${
            effectiveMode === 'preset' ? 'border border-cyan/40 bg-panel text-cyan' : 'text-fg-muted hover:text-fg'
          }`}
        >
          Preset Sites
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...cfg, mode: 'custom' })}
          className={`rounded py-1 transition cursor-pointer ${
            effectiveMode === 'custom' ? 'border border-cyan/40 bg-panel text-cyan' : 'text-fg-muted hover:text-fg'
          }`}
        >
          Custom Place
        </button>
        <button
          type="button"
          onClick={() => {
            const first = queuedScenarios[0];
            if (!first) return;
            onChange({
              ...cfg,
              mode: 'queued',
              queuedId: queuedScenarios.some((q) => q.id === cfg.queuedId) ? cfg.queuedId : first.id,
              landingDate: first.landingTimeUtc.slice(0, 10),
              landingTime: first.landingTimeUtc.slice(11, 16),
              durationDays: first.missionDurationDays,
            });
          }}
          disabled={queuedScenarios.length === 0}
          className={`rounded py-1 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
            effectiveMode === 'queued' ? 'border border-cyan/40 bg-panel text-cyan' : 'text-fg-muted hover:text-fg'
          }`}
        >
          Queued ({queuedScenarios.length})
        </button>
      </div>

      {/* Place Selector */}
      {effectiveMode === 'preset' && (
        <div>
          <label className="label mb-1 block">Landing Site</label>
          <select
            value={cfg.presetId}
            onChange={(e) => onChange({ ...cfg, presetId: e.target.value })}
            className="field py-1.5 text-xs"
          >
            {PRESET_COMPARISON_SITES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.lat.toFixed(1)}°, {s.lon.toFixed(1)}°)
              </option>
            ))}
          </select>
        </div>
      )}

      {effectiveMode === 'custom' && (
        <div className="space-y-2">
          <div>
            <label className="label mb-1 block">Custom Place Name</label>
            <input
              type="text"
              value={cfg.customName}
              onChange={(e) => onChange({ ...cfg, customName: e.target.value })}
              placeholder={`Custom Site ${badge}`}
              className="field py-1.5 px-2.5 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label className="label mb-1 block">Lat (°)</label>
              <NumericField
                ariaLabel={`Plan ${badge} latitude`}
                value={cfg.customLat}
                min={-90}
                max={90}
                step={0.1}
                onCommit={(v) => onChange({ ...cfg, customLat: v })}
                className="field py-1.5 px-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="label mb-1 block">Lon (°)</label>
              <NumericField
                ariaLabel={`Plan ${badge} longitude`}
                value={cfg.customLon}
                min={-180}
                max={180}
                step={0.1}
                onCommit={(v) => onChange({ ...cfg, customLon: v })}
                className="field py-1.5 px-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="label mb-1 block">Elev (m)</label>
              <NumericField
                ariaLabel={`Plan ${badge} elevation`}
                value={cfg.customElevM}
                step={100}
                onCommit={(v) => onChange({ ...cfg, customElevM: v })}
                className="field py-1.5 px-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="label mb-1 block">Slope (°)</label>
              <NumericField
                ariaLabel={`Plan ${badge} slope`}
                value={cfg.customSlopeDeg}
                min={0}
                max={45}
                step={0.5}
                onCommit={(v) => onChange({ ...cfg, customSlopeDeg: v })}
                className="field py-1.5 px-2 font-mono text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {effectiveMode === 'queued' && (
        <div>
          <label className="label mb-1 block">Pre-Added Scenario</label>
          <select
            value={cfg.queuedId}
            onChange={(e) => {
              const q = queuedScenarios.find((s) => s.id === e.target.value);
              if (!q) return;
              onChange({
                ...cfg,
                queuedId: q.id,
                landingDate: q.landingTimeUtc.slice(0, 10),
                landingTime: q.landingTimeUtc.slice(11, 16),
                durationDays: q.missionDurationDays,
              });
            }}
            className="field py-1.5 text-xs"
          >
            {queuedScenarios.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label} ({q.coordinates.latitude_deg.toFixed(1)}°, {q.coordinates.longitude_deg.toFixed(1)}° •{' '}
                {q.missionDurationDays}d)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Landing Window & Duration */}
      <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-12">
        <div className="col-span-2 sm:col-span-4">
          <label className="label mb-1 flex items-center gap-1 whitespace-nowrap">
            <Calendar className="size-3 text-cyan" /> Landing Date
          </label>
          <input
            type="date"
            value={cfg.landingDate}
            onChange={(e) => {
              if (e.target.value) onChange({ ...cfg, landingDate: e.target.value });
            }}
            className="field py-1.5 px-2 font-mono text-xs"
          />
        </div>

        <div className="sm:col-span-3">
          <label className="label mb-1 block whitespace-nowrap">Time (UTC)</label>
          <input
            type="time"
            value={cfg.landingTime}
            onChange={(e) => {
              if (e.target.value) onChange({ ...cfg, landingTime: e.target.value });
            }}
            className="field py-1.5 px-2 font-mono text-xs"
          />
        </div>

        <div className="sm:col-span-3">
          <label className="label mb-1 flex items-center gap-1 whitespace-nowrap">
            <Clock className="size-3 text-warning" /> Duration (d)
          </label>
          <NumericField
            ariaLabel={`Plan ${badge} duration days`}
            value={cfg.durationDays}
            min={1}
            max={45}
            integer
            onCommit={(v) => onChange({ ...cfg, durationDays: v })}
            className="field py-1.5 px-2 font-mono text-xs"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label mb-1 block whitespace-nowrap">Delay (+d)</label>
          <NumericField
            ariaLabel={`Plan ${badge} launch offset days`}
            value={cfg.delayDays}
            min={0}
            max={29}
            integer
            onCommit={(v) => onChange({ ...cfg, delayDays: v })}
            className="field py-1.5 px-2 font-mono text-xs"
          />
        </div>
      </div>

      <p className="truncate font-mono text-[10px] text-fg-muted">
        {resolvedSite.program} • Slope {resolvedSite.slopeDeg}° • Water Ice {resolvedSite.waterIceDistanceKm} km
      </p>
    </div>
  );
}

interface TimelineRun<T extends string> {
  state: T;
  count: number;
  startUtc: string;
  endUtc: string;
}

function buildRuns<T extends string>(
  points: ScenarioEvaluation['points'],
  getState: (pt: ScenarioEvaluation['points'][number]) => T,
): TimelineRun<T>[] {
  const runs: TimelineRun<T>[] = [];
  for (const pt of points) {
    const st = getState(pt);
    const prev = runs[runs.length - 1];
    if (prev && prev.state === st) {
      prev.count += 1;
      prev.endUtc = pt.timestampUtc;
    } else {
      runs.push({ state: st, count: 1, startUtc: pt.timestampUtc, endUtc: pt.timestampUtc });
    }
  }
  return runs;
}

function StripTimelineRow({
  label,
  evalData,
  accentClass,
}: {
  label: string;
  evalData: ScenarioEvaluation;
  accentClass: string;
}) {
  const sunRuns = useMemo(
    () => buildRuns(evalData.points, (pt) => (pt.isSunlit ? 'sun' : 'dark')),
    [evalData.points],
  );
  const commsRuns = useMemo(
    () =>
      buildRuns(evalData.points, (pt) =>
        pt.hasDirectEarth ? 'dte' : pt.hasOrbitalRelay ? 'relay' : 'blackout',
      ),
    [evalData.points],
  );

  return (
    <div className="space-y-1.5 rounded border border-line bg-bg/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={`font-semibold ${accentClass}`}>
          {label}: {evalData.site.name} ({evalData.durationDays}d)
        </span>
        <span className="font-mono text-[11px] text-fg-muted">
          Sun {evalData.sunlightPercent}% • Comms {evalData.effectiveCommsPercent}% • Max Dark{' '}
          {evalData.maxDarkHours}h
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex h-2.5 overflow-hidden rounded bg-bg-secondary" title="Sunlight strip">
          {sunRuns.map((run, i) => (
            <div
              key={`sun-${i}`}
              style={{ flexGrow: run.count }}
              className={run.state === 'sun' ? 'bg-warning' : 'bg-line'}
              title={`${run.startUtc} → ${run.endUtc}: ${run.state === 'sun' ? 'Sunlit' : 'Shadowed'}`}
            />
          ))}
        </div>
        <div className="flex h-2.5 overflow-hidden rounded bg-bg-secondary" title="Comms strip">
          {commsRuns.map((run, i) => (
            <div
              key={`com-${i}`}
              style={{ flexGrow: run.count }}
              className={
                run.state === 'dte'
                  ? 'bg-cyan'
                  : run.state === 'relay'
                    ? 'bg-success'
                    : 'bg-danger/75'
              }
              title={`${run.startUtc} → ${run.endUtc}: ${
                run.state === 'dte'
                  ? 'Direct-to-Earth'
                  : run.state === 'relay'
                    ? 'Orbital Relay'
                    : 'Comms Blackout'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SiteComparisonPage() {
  const scenarios = useAppStore((s) => s.comparisonScenarios);
  const addComparisonScenario = useAppStore((s) => s.addComparisonScenario);
  const removeComparisonScenario = useAppStore((s) => s.removeComparisonScenario);
  const selectedCoords = useAppStore((s) => s.selectedCoordinates);
  const selectedSite = useAppStore((s) => s.selectedLandingSite);
  const storeDate = useAppStore((s) => s.selectedLandingDate);
  const storeTime = useAppStore((s) => s.selectedLandingTime);
  const storeDuration = useAppStore((s) => s.selectedMissionDuration);

  const [commsMode, setCommsMode] = useState<CommsMode>('LLO_MOTHERSHIP');

  const [cfgA, setCfgA] = useState<ScenarioConfig>(() => {
    const first = scenarios[0];
    return {
      mode: first ? 'queued' : selectedCoords && selectedSite?.category === 'custom' ? 'custom' : 'preset',
      presetId:
        selectedSite && PRESET_COMPARISON_SITES.some((p) => p.id === selectedSite.id)
          ? selectedSite.id
          : 'malapert-massif',
      queuedId: first?.id ?? '',
      customName: selectedSite?.name || 'Custom Target A',
      customLat: selectedCoords?.latitude_deg ?? -88.5,
      customLon: selectedCoords?.longitude_deg ?? 15.0,
      customElevM: 2400,
      customSlopeDeg: 5.5,
      landingDate: first ? first.landingTimeUtc.slice(0, 10) : storeDate || '2027-01-01',
      landingTime: first ? first.landingTimeUtc.slice(11, 16) : storeTime || '00:00',
      durationDays: first ? first.missionDurationDays : storeDuration || 14,
      delayDays: 0,
    };
  });

  const [cfgB, setCfgB] = useState<ScenarioConfig>(() => {
    const second = scenarios[1];
    return {
      mode: second ? 'queued' : 'preset',
      presetId: 'nobile-rim-1',
      queuedId: second?.id ?? '',
      customName: 'Custom Target B',
      customLat: -85.2,
      customLon: 53.5,
      customElevM: 1650,
      customSlopeDeg: 9.1,
      landingDate: second ? second.landingTimeUtc.slice(0, 10) : storeDate || '2027-01-01',
      landingTime: second ? second.landingTimeUtc.slice(11, 16) : storeTime || '00:00',
      durationDays: second ? second.missionDurationDays : storeDuration || 14,
      delayDays: 0,
    };
  });

  const siteA = useMemo(() => resolveComparisonSite(cfgA, 'plan-a', scenarios, 2), [cfgA, scenarios]);
  const siteB = useMemo(() => resolveComparisonSite(cfgB, 'plan-b', scenarios, 4), [cfgB, scenarios]);

  const landingUtcA = useMemo(() => safeToUtcIso(cfgA.landingDate, cfgA.landingTime), [cfgA.landingDate, cfgA.landingTime]);
  const landingUtcB = useMemo(() => safeToUtcIso(cfgB.landingDate, cfgB.landingTime), [cfgB.landingDate, cfgB.landingTime]);

  const evalA = useMemo(
    () => evaluateMissionScenario(siteA, landingUtcA, cfgA.durationDays, cfgA.delayDays, commsMode),
    [siteA, landingUtcA, cfgA.durationDays, cfgA.delayDays, commsMode],
  );
  const evalB = useMemo(
    () => evaluateMissionScenario(siteB, landingUtcB, cfgB.durationDays, cfgB.delayDays, commsMode),
    [siteB, landingUtcB, cfgB.durationDays, cfgB.delayDays, commsMode],
  );

  const recommendation = useMemo(() => buildSiteAndDurationRecommendation(evalA, evalB), [evalA, evalB]);
  const pairDistanceKm = useMemo(() => computeSitePairDistanceKm(siteA, siteB), [siteA, siteB]);

  const activeWinnerDuration =
    recommendation.recommendedPlace === 'A' ? cfgA.durationDays : cfgB.durationDays;
  const activeWinnerDelay =
    recommendation.recommendedPlace === 'A' ? cfgA.delayDays : cfgB.delayDays;
  const isOptimalApplied =
    activeWinnerDuration === recommendation.recommendedDurationDays &&
    activeWinnerDelay === recommendation.recommendedDelayDays;

  const radarBarData = useMemo(
    () => [
      { metric: 'Solar', planA: evalA.suitability.solarPowerScore, planB: evalB.suitability.solarPowerScore },
      { metric: 'Comms', planA: evalA.suitability.commsScore, planB: evalB.suitability.commsScore },
      { metric: 'Safety', planA: evalA.suitability.landingSafetyScore, planB: evalB.suitability.landingSafetyScore },
      { metric: 'Thermal', planA: evalA.suitability.thermalSurvivalScore, planB: evalB.suitability.thermalSurvivalScore },
      { metric: 'Science', planA: evalA.suitability.scienceAccessScore, planB: evalB.suitability.scienceAccessScore },
      { metric: 'Overall', planA: evalA.suitability.overallScore, planB: evalB.suitability.overallScore },
    ],
    [evalA, evalB],
  );

  const savePlanToQueue = (badge: 'A' | 'B') => {
    const ev = badge === 'A' ? evalA : evalB;
    addComparisonScenario({
      id: `${ev.site.id}-${ev.effectiveStartUtc.slice(0, 10)}-${ev.durationDays}d-${badge.toLowerCase()}`,
      label: `Plan ${badge}: ${ev.site.name}`,
      siteId: ev.site.id,
      coordinates: { latitude_deg: ev.site.lat, longitude_deg: ev.site.lon },
      landingTimeUtc: ev.effectiveStartUtc,
      missionDurationDays: ev.durationDays,
    });
  };

  const handleRemoveQueued = (id: string) => {
    const remaining = scenarios.filter((s) => s.id !== id);
    removeComparisonScenario(id);
    if (cfgA.mode === 'queued' && cfgA.queuedId === id) {
      setCfgA((prev) => ({
        ...prev,
        mode: remaining[0] ? 'queued' : 'preset',
        queuedId: remaining[0]?.id ?? '',
      }));
    }
    if (cfgB.mode === 'queued' && cfgB.queuedId === id) {
      setCfgB((prev) => ({
        ...prev,
        mode: remaining[0] ? 'queued' : 'preset',
        queuedId: remaining[0]?.id ?? '',
      }));
    }
  };

  const applyRecommendedDurationAndWindow = () => {
    const patch = {
      durationDays: recommendation.recommendedDurationDays,
      delayDays: recommendation.recommendedDelayDays,
    };
    if (recommendation.recommendedPlace === 'A') {
      setCfgA((prev) => ({ ...prev, ...patch }));
    } else {
      setCfgB((prev) => ({ ...prev, ...patch }));
    }
  };

  const syncWindowFromAToB = () => {
    setCfgB((prev) => ({
      ...prev,
      landingDate: cfgA.landingDate,
      landingTime: cfgA.landingTime,
      durationDays: cfgA.durationDays,
      delayDays: cfgA.delayDays,
    }));
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader title="Site Comparison" description="Compare two landing places, mission windows, and durations side by side." />

      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-fg-muted" data-testid="scenario-count">
            Scenarios queued: <strong className="font-mono text-fg">{scenarios.length}</strong>
          </p>
          <span className="rounded border border-line-strong bg-bg/70 px-2.5 py-0.5 font-mono text-[11px] text-cyan">
            A↔B Separation: {pairDistanceKm.toLocaleString()} km
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={syncWindowFromAToB}
            className="btn py-1.5 px-2.5 text-xs cursor-pointer"
            title="Copy Plan A landing date, time, duration, and offset to Plan B"
          >
            Sync Window A→B
          </button>

          <div className="flex items-center gap-1 rounded border border-line-strong bg-bg/80 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCommsMode('DTE_ONLY')}
              className={`rounded px-2.5 py-1 transition cursor-pointer ${
                commsMode === 'DTE_ONLY' ? 'bg-cyan text-bg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              Direct DTE
            </button>
            <button
              type="button"
              onClick={() => setCommsMode('LLO_MOTHERSHIP')}
              className={`rounded px-2.5 py-1 transition cursor-pointer ${
                commsMode === 'LLO_MOTHERSHIP' ? 'bg-success text-bg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              LLO 100km Relay
            </button>
            <button
              type="button"
              onClick={() => setCommsMode('NRHO_CONSTELLATION')}
              className={`rounded px-2.5 py-1 transition cursor-pointer ${
                commsMode === 'NRHO_CONSTELLATION' ? 'bg-blue text-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              NRHO Halo
            </button>
          </div>
        </div>
      </div>

      {/* Queued Scenarios Bar */}
      {scenarios.length > 0 && (
        <section className="card p-3.5">
          <span className="label mb-2 flex items-center gap-1.5">
            <Layers className="size-3.5 text-cyan" /> Queued Scenarios
          </span>
          <div className="flex flex-wrap gap-2">
            {scenarios.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-1.5 rounded border border-line-strong bg-bg/70 px-2.5 py-1 text-xs"
              >
                <span className="font-medium text-fg">{q.label}</span>
                <span className="font-mono text-[10px] text-fg-muted">({q.missionDurationDays}d)</span>
                <button
                  type="button"
                  onClick={() =>
                    setCfgA((prev) => ({
                      ...prev,
                      mode: 'queued',
                      queuedId: q.id,
                      landingDate: q.landingTimeUtc.slice(0, 10),
                      landingTime: q.landingTimeUtc.slice(11, 16),
                      durationDays: q.missionDurationDays,
                      delayDays: 0,
                    }))
                  }
                  className="rounded bg-cyan/15 px-1.5 py-0.5 text-[10px] font-semibold text-cyan hover:bg-cyan/25 cursor-pointer"
                >
                  Load A
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCfgB((prev) => ({
                      ...prev,
                      mode: 'queued',
                      queuedId: q.id,
                      landingDate: q.landingTimeUtc.slice(0, 10),
                      landingTime: q.landingTimeUtc.slice(11, 16),
                      durationDays: q.missionDurationDays,
                      delayDays: 0,
                    }))
                  }
                  className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning hover:bg-warning/25 cursor-pointer"
                >
                  Load B
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveQueued(q.id)}
                  className="text-fg-dim hover:text-danger cursor-pointer"
                  aria-label={`Remove ${q.label}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Plan A & Plan B Editors */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ScenarioEditorCard
          badge="A"
          cfg={cfgA}
          resolvedSite={siteA}
          queuedScenarios={scenarios}
          isWinner={recommendation.recommendedPlace === 'A'}
          score={evalA.suitability.overallScore}
          hasExplorerCoords={Boolean(selectedCoords)}
          onChange={setCfgA}
          onImportExplorer={() => {
            if (!selectedCoords) return;
            setCfgA((prev) => ({
              ...prev,
              mode: 'custom',
              customName: selectedSite?.name || 'Explorer Pick A',
              customLat: selectedCoords.latitude_deg,
              customLon: selectedCoords.longitude_deg,
            }));
          }}
          onSaveToQueue={() => savePlanToQueue('A')}
        />

        <ScenarioEditorCard
          badge="B"
          cfg={cfgB}
          resolvedSite={siteB}
          queuedScenarios={scenarios}
          isWinner={recommendation.recommendedPlace === 'B'}
          score={evalB.suitability.overallScore}
          hasExplorerCoords={Boolean(selectedCoords)}
          onChange={setCfgB}
          onImportExplorer={() => {
            if (!selectedCoords) return;
            setCfgB((prev) => ({
              ...prev,
              mode: 'custom',
              customName: selectedSite?.name || 'Explorer Pick B',
              customLat: selectedCoords.latitude_deg,
              customLon: selectedCoords.longitude_deg,
            }));
          }}
          onSaveToQueue={() => savePlanToQueue('B')}
        />
      </section>

      {/* Recommended Site & Optimal Duration */}
      <section className="card border-success/50 bg-panel/75 p-5">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="space-y-3 xl:col-span-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge border-success/50 bg-success/15 text-success">
                <Award className="mr-1 size-3.5" /> Recommended Site & Duration
              </span>
              <span className="font-mono text-xs text-fg-muted">
                +{recommendation.scoreMargin} pts over Plan {recommendation.recommendedPlace === 'A' ? 'B' : 'A'}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-lg font-bold text-fg">
                Plan {recommendation.recommendedPlace}: {recommendation.recommendedSite.name}
              </h2>
              <span className="font-mono text-sm font-bold text-success">
                Score {recommendation.winnerScore}/100
              </span>
            </div>

            <ul className="space-y-1 text-xs text-fg-muted">
              {recommendation.reasons.map((r) => (
                <li key={r} className="flex items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>

            <p className="rounded border border-cyan/35 bg-cyan/10 px-3 py-2 text-xs text-cyan">
              <Sparkles className="mr-1.5 inline size-3.5" />
              {recommendation.tradeOffNote}
            </p>
          </div>

          <div className="flex flex-col justify-between gap-3.5 rounded-card border border-line-strong bg-bg/70 p-4 xl:col-span-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="label">Optimal Duration & Launch Window</div>
                <div className="mt-1 flex flex-wrap items-baseline gap-2 font-mono">
                  <span className="text-xl font-bold text-warning">
                    {recommendation.recommendedDurationDays} Days
                  </span>
                  <span className="text-xs text-fg-muted">
                    (+{recommendation.recommendedDelayDays}d offset • {recommendation.recommendedScore}/100)
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-fg-muted">
                  Window: {recommendation.recommendedLandingUtc.slice(0, 16).replace('T', ' ')} UTC
                </div>
              </div>

              <button
                type="button"
                onClick={applyRecommendedDurationAndWindow}
                disabled={isOptimalApplied}
                className={`btn py-1.5 px-3 text-xs ${
                  isOptimalApplied
                    ? 'border-success/50 bg-success/15 text-success cursor-default'
                    : 'btn-primary cursor-pointer'
                }`}
              >
                {isOptimalApplied ? (
                  <>
                    <Check className="size-3.5" /> Optimal Active
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" /> Apply Optimal
                  </>
                )}
              </button>
            </div>

            {/* Duration Sweep for active window */}
            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-fg-dim">
                <span>
                  Duration Sweep · Plan {recommendation.recommendedPlace} (+{activeWinnerDelay}d offset)
                </span>
                <span className="font-mono normal-case text-[10px]">
                  <span className="text-cyan">● Selected</span> · <span className="text-success">★ Best</span>
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                {recommendation.durationCandidates.map((cand) => {
                  const isSelected = cand.durationDays === activeWinnerDuration;
                  const isBest = cand.durationDays === recommendation.bestWindowDurationDays;
                  return (
                    <button
                      key={cand.durationDays}
                      type="button"
                      aria-pressed={isSelected}
                      title={`${cand.durationDays} days at +${activeWinnerDelay}d offset — Score ${cand.overallScore}/100${isBest ? ' (Best for this window)' : ''}`}
                      onClick={() => {
                        if (recommendation.recommendedPlace === 'A') {
                          setCfgA((p) => ({ ...p, durationDays: cand.durationDays }));
                        } else {
                          setCfgB((p) => ({ ...p, durationDays: cand.durationDays }));
                        }
                      }}
                      className={`relative rounded border px-1.5 py-1.5 text-center font-mono transition cursor-pointer ${
                        isSelected && isBest
                          ? 'border-success bg-success/25 text-success ring-1 ring-success/60'
                          : isSelected
                            ? 'border-cyan bg-cyan/20 text-cyan ring-1 ring-cyan/60'
                            : isBest
                              ? 'border-success/60 bg-success/10 text-success hover:bg-success/20'
                              : 'border-line bg-bg-secondary/70 text-fg-muted hover:border-cyan/50 hover:text-fg'
                      }`}
                    >
                      {isBest && (
                        <span
                          aria-hidden="true"
                          className="absolute right-1 top-0.5 text-[9px] leading-none text-success"
                        >
                          ★
                        </span>
                      )}
                      <div className="whitespace-nowrap text-[11px] font-bold">{cand.durationDays}d</div>
                      <div className="text-[9px]">{cand.overallScore}pt</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Side-by-Side Comparison Table */}
      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
            <Compass className="size-4 text-cyan" /> Side-by-Side Trade-Off Summary
          </h2>
          <div className="flex flex-wrap gap-2">
            <span className={`badge ${verdictBadgeClass(evalA.verdict)}`}>Plan A: {evalA.verdict}</span>
            <span className={`badge ${verdictBadgeClass(evalB.verdict)}`}>Plan B: {evalB.verdict}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-line-strong text-[11px] uppercase tracking-wider text-fg-muted">
                <th className="py-2 px-3">Metric</th>
                <th className="py-2 px-3 text-cyan">
                  Plan A: {siteA.name} ({evalA.durationDays}d)
                </th>
                <th className="py-2 px-3 text-warning">
                  Plan B: {siteB.name} ({evalB.durationDays}d)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-mono text-xs">
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-fg">Suitability Score</td>
                <td className={`py-2 px-3 font-bold ${evalA.suitability.overallScore >= evalB.suitability.overallScore ? 'text-cyan' : 'text-fg-muted'}`}>
                  {evalA.suitability.overallScore} / 100
                </td>
                <td className={`py-2 px-3 font-bold ${evalB.suitability.overallScore > evalA.suitability.overallScore ? 'text-warning' : 'text-fg-muted'}`}>
                  {evalB.suitability.overallScore} / 100
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-fg">Landing Window (UTC)</td>
                <td className="py-2 px-3 text-fg-muted">{evalA.effectiveStartUtc.slice(0, 16).replace('T', ' ')} UTC</td>
                <td className="py-2 px-3 text-fg-muted">{evalB.effectiveStartUtc.slice(0, 16).replace('T', ' ')} UTC</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-fg">Solar Illumination</td>
                <td className={`py-2 px-3 font-bold ${evalA.sunlightPercent >= evalB.sunlightPercent ? 'text-success' : 'text-fg'}`}>
                  {evalA.sunlightPercent}%
                </td>
                <td className={`py-2 px-3 font-bold ${evalB.sunlightPercent > evalA.sunlightPercent ? 'text-success' : 'text-fg'}`}>
                  {evalB.sunlightPercent}%
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-fg">Avg Power & Energy Yield</td>
                <td className="py-2 px-3">{evalA.avgWatts} W • {evalA.totalEnergyKwh} kWh</td>
                <td className="py-2 px-3">{evalB.avgWatts} W • {evalB.totalEnergyKwh} kWh</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-fg">
                  Comms Uptime ({commsMode === 'DTE_ONLY' ? 'DTE' : commsMode === 'LLO_MOTHERSHIP' ? 'LLO Relay' : 'NRHO Halo'})
                </td>
                <td className={`py-2 px-3 font-bold ${evalA.effectiveCommsPercent >= evalB.effectiveCommsPercent ? 'text-success' : 'text-fg'}`}>
                  {evalA.effectiveCommsPercent}% (DTE {evalA.dtePercent}%)
                </td>
                <td className={`py-2 px-3 font-bold ${evalB.effectiveCommsPercent > evalA.effectiveCommsPercent ? 'text-success' : 'text-fg'}`}>
                  {evalB.effectiveCommsPercent}% (DTE {evalB.dtePercent}%)
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-fg">Max Continuous Darkness</td>
                <td className={`py-2 px-3 ${evalA.maxDarkHours <= evalB.maxDarkHours ? 'text-success font-semibold' : ''}`}>
                  {evalA.maxDarkHours} hrs
                </td>
                <td className={`py-2 px-3 ${evalB.maxDarkHours < evalA.maxDarkHours ? 'text-success font-semibold' : ''}`}>
                  {evalB.maxDarkHours} hrs
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-fg">Surface Temperature Range</td>
                <td className="py-2 px-3">{evalA.minTempC}°C to {evalA.maxTempC}°C</td>
                <td className="py-2 px-3">{evalB.minTempC}°C to {evalB.maxTempC}°C</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-fg">Dust / Avg RTT</td>
                <td className="py-2 px-3">{evalA.highDustHours}h dust • {evalA.avgRoundTripLatencySec}s RTT</td>
                <td className="py-2 px-3">{evalB.highDustHours}h dust • {evalB.avgRoundTripLatencySec}s RTT</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-fg">Water Ice (PSR) & Slope</td>
                <td className="py-2 px-3">{siteA.waterIceDistanceKm} km • {siteA.slopeDeg}° slope</td>
                <td className="py-2 px-3">{siteB.waterIceDistanceKm} km • {siteB.slopeDeg}° slope</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Visual Timelines & Suitability Chart */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="card space-y-3 p-5 lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Sun className="size-4 text-warning" />
              <Radio className="size-4 text-cyan" />
              Sunlight & Comms Timelines
            </h3>
            <span className="font-mono text-[10px] text-fg-dim">
              Amber: Sun • Cyan: DTE • Green: Relay • Red: Blackout
            </span>
          </div>
          <StripTimelineRow label="Plan A" evalData={evalA} accentClass="text-cyan" />
          <StripTimelineRow label="Plan B" evalData={evalB} accentClass="text-warning" />
          <div className="grid grid-cols-1 gap-2 pt-1 text-[11px] text-fg-muted sm:grid-cols-2">
            <div className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-cyan" />
              <span>{siteA.scienceValue}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-warning" />
              <span>{siteB.scienceValue}</span>
            </div>
          </div>
        </div>

        <div className="card space-y-3 p-5 lg:col-span-6">
          <h3 className="text-sm font-semibold text-fg">Suitability Breakdown (0–100)</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={radarBarData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#1c2b42" strokeDasharray="3 3" />
                <XAxis dataKey="metric" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0d1422',
                    borderColor: '#2b4262',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="planA" name={`Plan A (${siteA.name.split('(')[0]?.trim()})`} fill="#00d9ff" radius={[3, 3, 0, 0]} />
                <Bar dataKey="planB" name={`Plan B (${siteB.name.split('(')[0]?.trim()})`} fill="#ffb547" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
