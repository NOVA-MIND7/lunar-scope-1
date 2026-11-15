import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Compass,
  Eye,
  EyeOff,
  Globe2,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Satellite,
  Send,
  Signal,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import {
  BAND_SPECS,
  BASE_DISH_PRESETS,
  ROVER_SITE_PRESETS,
  stepCommsFrame,
  type CommsFrameState,
  type CommsSimConfig,
  type FrequencyBand,
  type LunarOrbitType,
  type RoutingMode,
} from './commsEngine';
import { CommsScene3D, type CommsCameraFocus } from './CommsScene3D';

type ConfigTab = 'rover' | 'satellites' | 'dishes';

function formatDurationSec(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--';
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  const hrs = seconds / 3600;
  if (hrs < 24) return `${hrs.toFixed(2)} hrs`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return `${days}d ${remHrs.toFixed(1)}h`;
}

function formatMissionHours(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return '--';
  if (hours < 0.1) return `${hours.toFixed(3)} hrs`;
  if (hours < 24) return `${hours.toFixed(1)} hrs`;
  const days = hours / 24;
  return `${days.toFixed(1)} d (${hours.toFixed(0)} hrs)`;
}

function formatUtcArrival(hoursFromNow: number): string {
  if (!Number.isFinite(hoursFromNow)) return 'No LOS Window';
  const target = new Date(Date.now() + hoursFromNow * 3_600_000);
  const yyyy = target.getUTCFullYear();
  const mm = String(target.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(target.getUTCDate()).padStart(2, '0');
  const hh = String(target.getUTCHours()).padStart(2, '0');
  const mi = String(target.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} UTC`;
}

/** Controlled numeric input that lets users clear or type '-' / decimals smoothly. */
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
    if (!focused) setDraft(String(value));
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
        if (Number.isFinite(parsed)) onCommit(clampVal(parsed));
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

const DEFAULT_CONFIG: CommsSimConfig = {
  roverName: 'Artemis Rover 1',
  roverSiteId: 'malapert-massif',
  roverLat: -86.0,
  roverLon: 0.0,
  txPowerWatts: 35,
  band: 'KA_BAND',
  payloadMb: 250,

  lunarSatCount: 3,
  lunarOrbitType: 'FROZEN_ELLIPTICAL',
  lunarAltitudeKm: 1200,

  earthSatCount: 3,
  earthAltitudeKm: 20200,
  rotateEarth: true,

  enableGoldstone: true,
  enableMadrid: true,
  enableCanberra: true,
  customDishEnabled: false,
  customDishName: 'Colombo Ground Dish',
  customDishLat: 6.9,
  customDishLon: 79.9,

  routingMode: 'AUTO_RELAY',
};

export default function CommsNetworkPage() {
  const [config, setConfig] = useState<CommsSimConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<ConfigTab>('rover');

  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [cameraFocus, setCameraFocus] = useState<{ id: number; target: CommsCameraFocus }>({
    id: 0,
    target: 'overview',
  });
  const [packetBurstTick, setPacketBurstTick] = useState(0);

  const simTimeRef = useRef(0);
  const [frame, setFrame] = useState<CommsFrameState>(() => stepCommsFrame(DEFAULT_CONFIG, 0));

  // Payload transmission tracker
  const [deliveredMb, setDeliveredMb] = useState(0);
  const [burstStartSimSec, setBurstStartSimSec] = useState(0);
  const [burstEndSimSec, setBurstEndSimSec] = useState<number | null>(null);
  const [activeTxSec, setActiveTxSec] = useState(0);
  const [completedUtcStr, setCompletedUtcStr] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([
    '[T+0.0s] Cislunar network ready. Press Play to start orbital motion & live packet flow.',
  ]);
  const deliveredMbRef = useRef(0);
  const burstStartSimSecRef = useRef(0);
  const burstEndSimSecRef = useRef<number | null>(null);
  const activeTxSecRef = useRef(0);
  const lastSampleTimeRef = useRef(0);
  const lastRouteKeyRef = useRef('');

  const appendLog = useCallback((msg: string) => {
    setEventLog((prev) => [msg, ...prev].slice(0, 8));
  }, []);

  const handleFrameSample = useCallback(
    (nextFrame: CommsFrameState) => {
      setFrame(nextFrame);

      const dt = Math.max(0, nextFrame.simTimeSec - lastSampleTimeRef.current);
      lastSampleTimeRef.current = nextFrame.simTimeSec;

      if (dt > 0 && nextFrame.linkUp && deliveredMbRef.current < config.payloadMb) {
        const mbPerSimSec = Math.max(0.8, nextFrame.effectiveRateMbps / 8);
        const prevMb = deliveredMbRef.current;
        const nextMb = Math.min(config.payloadMb, prevMb + mbPerSimSec * dt);
        const nextTxSec = activeTxSecRef.current + dt;

        deliveredMbRef.current = nextMb;
        activeTxSecRef.current = nextTxSec;
        setDeliveredMb(nextMb);
        setActiveTxSec(nextTxSec);

        if (prevMb < config.payloadMb && nextMb >= config.payloadMb && burstEndSimSecRef.current === null) {
          const totalTaken = Math.max(0, nextFrame.simTimeSec - burstStartSimSecRef.current);
          const nowStr = formatUtcArrival(0);
          burstEndSimSecRef.current = nextFrame.simTimeSec;
          setBurstEndSimSec(nextFrame.simTimeSec);
          setCompletedUtcStr(nowStr);
          appendLog(
            `[T+${nextFrame.simTimeSec.toFixed(1)}s] Complete: ${config.payloadMb} MB sent in ${totalTaken.toFixed(1)}s total (${nextTxSec.toFixed(1)}s active TX) via ${nextFrame.dsnDishes.find((d) => d.active)?.label ?? 'DSN'}.`,
          );
        }
      }

      if (nextFrame.routePathText !== lastRouteKeyRef.current) {
        lastRouteKeyRef.current = nextFrame.routePathText;
        appendLog(
          `[T+${nextFrame.simTimeSec.toFixed(1)}s] ${nextFrame.linkUp ? 'Route active' : 'DTN Queue'}: ${nextFrame.routePathText}`,
        );
      }
    },
    [appendLog, config.payloadMb],
  );

  const handleReset = () => {
    setIsPlaying(false);
    simTimeRef.current = 0;
    lastSampleTimeRef.current = 0;
    lastRouteKeyRef.current = '';
    deliveredMbRef.current = 0;
    burstStartSimSecRef.current = 0;
    burstEndSimSecRef.current = null;
    activeTxSecRef.current = 0;
    setDeliveredMb(0);
    setBurstStartSimSec(0);
    setBurstEndSimSec(null);
    setActiveTxSec(0);
    setCompletedUtcStr(null);
    const resetFrame = stepCommsFrame(config, 0);
    setFrame(resetFrame);
    setEventLog(['[T+0.0s] Simulation reset. Press Play to begin telemetry transmission.']);
  };

  const handleSendBurst = () => {
    const startSec = frame.simTimeSec;
    deliveredMbRef.current = 0;
    burstStartSimSecRef.current = startSec;
    burstEndSimSecRef.current = null;
    activeTxSecRef.current = 0;
    setDeliveredMb(0);
    setBurstStartSimSec(startSec);
    setBurstEndSimSec(null);
    setActiveTxSec(0);
    setCompletedUtcStr(null);
    setPacketBurstTick((t) => t + 1);
    if (!isPlaying) setIsPlaying(true);
    appendLog(`[T+${startSec.toFixed(1)}s] Initiated ${config.payloadMb} MB telemetry burst from ${config.roverName}.`);
  };

  // If user increases payload size above already-delivered amount, resume timing cleanly
  useEffect(() => {
    if (deliveredMbRef.current >= config.payloadMb && burstEndSimSecRef.current === null && config.payloadMb > 0) {
      deliveredMbRef.current = config.payloadMb;
    } else if (deliveredMbRef.current < config.payloadMb && burstEndSimSecRef.current !== null) {
      burstEndSimSecRef.current = null;
      setBurstEndSimSec(null);
      setCompletedUtcStr(null);
    }
  }, [config.payloadMb]);

  const progressPct = useMemo(
    () => (config.payloadMb > 0 ? Math.min(100, Math.round((deliveredMb / config.payloadMb) * 100)) : 0),
    [deliveredMb, config.payloadMb],
  );

  // Steady baseline schedule computed purely from network config (never flickers frame-to-frame)
  const orbitalPlan = useMemo(() => {
    const spec = BAND_SPECS[config.band];
    const powerBoostDb = 10 * Math.log10(Math.max(5, config.txPowerWatts) / 25);
    const rateScale = Math.max(0.35, Math.min(1.6, 0.7 + powerBoostDb * 0.12));
    const nominalDirectMbps = Number((spec.baseRateMbps * rateScale * 0.78).toFixed(1));
    const nominalMbPerSec = Math.max(0.8, nominalDirectMbps / 8);
    const nominalDelaySec = Number((1.282 + spec.hopOverheadMs / 1000).toFixed(2));

    // Deterministic high-resolution scan across one full 24h Earth rotation cycle (120 samples from t = 0)
    const cycleSimSec = (Math.PI * 2) / 0.16;
    const hoursPerSimSec = 24 / cycleSimSec;
    const scanSamples = 120;
    let visibleCount = 0;
    let rateSum = 0;
    let firstClearStep: number | null = null;

    for (let i = 0; i < scanSamples; i++) {
      const sample = stepCommsFrame(config, (i / scanSamples) * cycleSimSec);
      if (sample.linkUp) {
        visibleCount++;
        rateSum += Math.max(0.8, sample.effectiveRateMbps / 8);
        if (firstClearStep === null) firstClearStep = i;
      }
    }

    const avgActiveMbPerSec = visibleCount > 0 ? rateSum / visibleCount : nominalMbPerSec;
    const activeRfFullSec = config.payloadMb / avgActiveMbPerSec + nominalDelaySec;
    const losAvailabilityPct = Math.round((visibleCount / scanSamples) * 100);

    let missionTotalHours: number | null = null;
    let initialWaitHours = 0;
    if (visibleCount > 0) {
      const dutyFraction = visibleCount / scanSamples;
      initialWaitHours = firstClearStep !== null ? (firstClearStep / scanSamples) * cycleSimSec * hoursPerSimSec : 0;
      missionTotalHours = activeRfFullSec / 3600 / dutyFraction + initialWaitHours;
    }

    const steadyArrivalUtc =
      missionTotalHours !== null ? formatUtcArrival(missionTotalHours) : 'Blocked (No LOS)';

    return {
      nominalMbPerSec,
      avgActiveMbPerSec,
      activeRfFullSec,
      losAvailabilityPct,
      initialWaitHours,
      missionTotalHours,
      steadyArrivalUtc,
      hoursPerSimSec,
    };
  }, [config]);

  // Monotonic elapsed time & completion tracking for the current/latest message burst
  const elapsedTotalSec =
    burstEndSimSec !== null
      ? Math.max(0, burstEndSimSec - burstStartSimSec)
      : Math.max(0, frame.simTimeSec - burstStartSimSec);
  const dtWaitSec = Math.max(0, elapsedTotalSec - activeTxSec);
  const isComplete = deliveredMb >= config.payloadMb && config.payloadMb > 0;

  // Derive 4-tier visual status for the hop pipeline strip
  const activeLunarSat = frame.lunarSats.find((s) => s.active);
  const activeEarthSat = frame.earthSats.find((s) => s.active);
  const activeDish = frame.dsnDishes.find((d) => d.active);
  const roverToLunarHop = frame.activeHops[0];
  const hasEarthRelayInRoute = frame.activeHops.length === 3;

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <PageHeader
        title="Comms Network"
        description="3D Cislunar relay simulation: Moon Rover ↔ Lunar Satellites ↔ Earth Satellites ↔ DSN Base Dishes."
      />

      {/* Simulation Transport & Camera Bar */}
      <section className="card flex flex-wrap items-center justify-between gap-3 p-3.5">
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
                <Pause className="size-3.5" /> Pause Simulation
              </>
            ) : (
              <>
                <Play className="size-3.5" /> Play Simulation
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSendBurst}
            className="btn border-cyan/50 bg-cyan/15 py-1.5 px-3 text-xs text-cyan hover:bg-cyan/25 cursor-pointer"
            title="Start or restart payload packet burst and auto-play"
          >
            <Send className="size-3.5" /> Send Burst ({config.payloadMb} MB)
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="btn py-1.5 px-2.5 text-xs cursor-pointer"
            title="Reset clock and payload counters"
          >
            <RotateCcw className="size-3.5" /> Reset
          </button>

          {/* Speed Pills */}
          <div className="flex items-center gap-1 rounded border border-line bg-bg/80 p-0.5 font-mono text-[11px]">
            <span className="px-1.5 text-fg-dim">Speed:</span>
            {[0.5, 1, 2, 5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSpeedMultiplier(spd)}
                className={`rounded px-2 py-0.5 transition cursor-pointer ${
                  speedMultiplier === spd
                    ? 'bg-cyan text-bg font-bold'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                {spd}×
              </button>
            ))}
          </div>

          <span className="rounded border border-line-strong bg-bg/70 px-2.5 py-1 font-mono text-xs text-fg">
            T+ {frame.simTimeSec.toFixed(1)}s
          </span>
        </div>

        {/* Camera Focus & Labels */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['overview', 'Full Cislunar'],
              ['moon', 'Moon & Rover'],
              ['earth', 'Earth & Dishes'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCameraFocus((prev) => ({ id: prev.id + 1, target: key }))}
              className={`rounded border px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                cameraFocus.target === key && cameraFocus.id > 0
                  ? 'border-cyan/60 bg-cyan/15 text-cyan'
                  : 'border-line bg-bg/70 text-fg-muted hover:text-fg'
              }`}
            >
              {label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowLabels((s) => !s)}
            className="inline-flex items-center gap-1 rounded border border-line bg-bg/70 px-2.5 py-1 text-[11px] text-fg-muted hover:text-fg cursor-pointer"
          >
            {showLabels ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
            Labels
          </button>
        </div>
      </section>

      {/* Main Grid: 3D Stage + Live Hop Visualizer (left) & Custom Inputs + Telemetry (right) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left 8 Columns: 3D Canvas & Signal Flow Pipeline */}
        <div className="space-y-4 xl:col-span-8">
          <section className="card relative h-[500px] overflow-hidden p-0 sm:h-[560px]">
            <CommsScene3D
              config={config}
              isPlaying={isPlaying}
              speedMultiplier={speedMultiplier}
              simTimeRef={simTimeRef}
              packetBurstTick={packetBurstTick}
              cameraFocus={cameraFocus}
              showLabels={showLabels}
              onFrameSample={handleFrameSample}
            />

            {/* Overlay Live Status Pill */}
            <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
              <span
                className={`badge backdrop-blur ${
                  frame.linkUp
                    ? 'border-success/60 bg-bg/85 text-success'
                    : 'border-warning/60 bg-bg/85 text-warning'
                }`}
              >
                {frame.linkUp ? <Wifi className="mr-1 size-3" /> : <WifiOff className="mr-1 size-3" />}
                {frame.linkStateLabel}
              </span>
              <span className="rounded border border-line-strong bg-bg/85 px-2 py-0.5 font-mono text-[11px] text-fg-muted backdrop-blur">
                {BAND_SPECS[config.band].label} • {frame.effectiveRateMbps} Mbps • Delay {frame.totalDelaySec}s
              </span>
            </div>

            {/* Legend Overlay */}
            <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-3 rounded border border-line bg-bg/85 px-3 py-1.5 font-mono text-[10px] text-fg-muted backdrop-blur">
              <span className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-full bg-success" /> Rover Up-Link
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-full bg-cyan" /> Orbital Relay Trunk
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-full bg-warning" /> Earth Base Downlink
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-full bg-danger" /> Blocked LOS
              </span>
            </div>
          </section>

          {/* 4-Node Signal Relay Chain Visualizer */}
          <section className="card space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Radio className="size-4 text-cyan" /> End-to-End Signal Path & Hop Visualizer
              </h2>
              <span className="font-mono text-xs text-cyan">{frame.routePathText}</span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-center">
              {/* Node 1: Moon Rover */}
              <div className="min-w-0 rounded border border-success/50 bg-success/10 p-2.5">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-success">
                  <Compass className="size-3" /> Moon Rover
                </div>
                <div className="mt-0.5 truncate font-mono text-xs font-bold text-fg">{config.roverName}</div>
                <div className="font-mono text-[10px] text-fg-muted">
                  {config.roverLat.toFixed(1)}°, {config.roverLon.toFixed(1)}° • {config.txPowerWatts}W
                </div>
              </div>

              <div className="hidden justify-center sm:flex">
                <ArrowRight className={`size-4 ${frame.linkUp ? 'text-success animate-pulse' : 'text-danger'}`} />
              </div>

              {/* Node 2: Lunar Satellite */}
              <div
                className={`min-w-0 rounded border p-2.5 ${
                  activeLunarSat
                    ? 'border-cyan/60 bg-cyan/10'
                    : 'border-line bg-bg/60 opacity-65'
                }`}
              >
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-cyan">
                  <Satellite className="size-3" /> Lunar Sat
                </div>
                <div className="mt-0.5 truncate font-mono text-xs font-bold text-fg">
                  {activeLunarSat ? activeLunarSat.label : config.routingMode === 'DIRECT_TO_EARTH' ? 'Bypassed (DTE)' : 'No Relay Active'}
                </div>
                <div className="font-mono text-[10px] text-fg-muted">
                  {roverToLunarHop && activeLunarSat
                    ? `${roverToLunarHop.distanceKm.toLocaleString()} km • ${roverToLunarHop.latencyMs}ms`
                    : `${config.lunarSatCount} deployed`}
                </div>
              </div>

              <div className="hidden justify-center sm:flex">
                <ArrowRight className={`size-4 ${frame.linkUp ? 'text-cyan animate-pulse' : 'text-danger'}`} />
              </div>

              {/* Node 3: Earth Satellite */}
              <div
                className={`min-w-0 rounded border p-2.5 ${
                  activeEarthSat
                    ? 'border-cyan/60 bg-cyan/10'
                    : 'border-line bg-bg/60 opacity-65'
                }`}
              >
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-blue">
                  <Globe2 className="size-3" /> Earth Sat
                </div>
                <div className="mt-0.5 truncate font-mono text-xs font-bold text-fg">
                  {activeEarthSat
                    ? activeEarthSat.label
                    : hasEarthRelayInRoute
                      ? 'Active'
                      : 'Direct Downlink'}
                </div>
                <div className="font-mono text-[10px] text-fg-muted">
                  {config.earthSatCount > 0 ? `${config.earthSatCount} in orbit` : '0 Earth sats'}
                </div>
              </div>

              <div className="hidden justify-center sm:flex">
                <ArrowRight className={`size-4 ${frame.linkUp ? 'text-warning animate-pulse' : 'text-danger'}`} />
              </div>

              {/* Node 4: Earth Base DSN Dish */}
              <div
                className={`min-w-0 rounded border p-2.5 ${
                  activeDish
                    ? 'border-warning/60 bg-warning/10'
                    : 'border-danger/40 bg-danger/10 opacity-75'
                }`}
              >
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-warning">
                  <Signal className="size-3" /> Base Dish
                </div>
                <div className="mt-0.5 truncate font-mono text-xs font-bold text-fg">
                  {activeDish ? activeDish.label : 'Waiting for LOS'}
                </div>
                <div className="font-mono text-[10px] text-fg-muted">
                  {frame.dsnDishes.length} DSN stations online
                </div>
              </div>
            </div>

            {/* Data Packet Transfer Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                <span className="text-fg-muted">
                  Payload Delivery:{' '}
                  <strong className="text-fg">
                    {deliveredMb.toFixed(1)} / {config.payloadMb} MB
                  </strong>{' '}
                  ({progressPct}%)
                  <span className="ml-2 text-cyan">
                    •{' '}
                    {isComplete
                      ? `Sent in ${formatDurationSec(elapsedTotalSec)} (${activeTxSec.toFixed(1)}s TX${dtWaitSec > 0.2 ? ` + ${dtWaitSec.toFixed(1)}s LOS wait` : ''}) • Est. Mission Window: ${orbitalPlan.missionTotalHours !== null ? formatMissionHours(orbitalPlan.missionTotalHours) : 'LOS Blocked'}${completedUtcStr ? ` • Done ${completedUtcStr}` : ''}`
                      : elapsedTotalSec > 0 || isPlaying
                        ? `Elapsed: ${formatDurationSec(elapsedTotalSec)} (${activeTxSec.toFixed(1)}s TX) • Est. Full: ${orbitalPlan.missionTotalHours !== null ? `${formatMissionHours(orbitalPlan.missionTotalHours)} (${orbitalPlan.losAvailabilityPct}% LOS)` : 'Blocked'}`
                        : `Est. Full Delivery: ${orbitalPlan.missionTotalHours !== null ? `${formatMissionHours(orbitalPlan.missionTotalHours)} • ${orbitalPlan.steadyArrivalUtc} (${orbitalPlan.losAvailabilityPct}% LOS)` : 'Blocked (0% LOS over 24h)'}`}
                  </span>
                </span>
                <span className={frame.linkUp ? 'text-success' : 'text-warning'}>
                  {frame.statusDetail}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-bg-secondary">
                <div
                  className={`h-full transition-all duration-150 ${
                    progressPct >= 100
                      ? 'bg-success'
                      : frame.linkUp
                        ? 'bg-cyan'
                        : 'bg-warning'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right 4 Columns: Custom Inputs & Live Telemetry */}
        <div className="space-y-4 xl:col-span-4">
          {/* Custom Simulation Parameters Card */}
          <section className="card space-y-3 p-4">
            <h2 className="text-sm font-semibold text-fg">Custom Network Parameters</h2>

            {/* 3 Tabs: Rover & Signal | Satellites | Base Dishes */}
            <div className="grid grid-cols-3 gap-1 rounded border border-line bg-bg/70 p-1 text-[11px] font-semibold">
              {(
                [
                  ['rover', 'Rover & Band'],
                  ['satellites', 'Satellites'],
                  ['dishes', 'Base Dishes'],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded py-1 transition cursor-pointer ${
                    activeTab === tab
                      ? 'border border-cyan/40 bg-panel text-cyan'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'rover' && (
              <div className="space-y-3">
                <div>
                  <label className="label mb-1 block">Rover Preset Location</label>
                  <select
                    value={config.roverSiteId}
                    onChange={(e) => {
                      const preset = ROVER_SITE_PRESETS.find((s) => s.id === e.target.value);
                      if (!preset) return;
                      setConfig((prev) => ({
                        ...prev,
                        roverSiteId: preset.id,
                        roverLat: preset.lat,
                        roverLon: preset.lon,
                      }));
                    }}
                    className="field py-1.5 text-xs"
                  >
                    {ROVER_SITE_PRESETS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.lat.toFixed(1)}°, {s.lon.toFixed(1)}°)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                  <div className="col-span-2 sm:col-span-6">
                    <label className="label mb-1 block">Rover Name</label>
                    <input
                      type="text"
                      value={config.roverName}
                      onChange={(e) => setConfig((p) => ({ ...p, roverName: e.target.value }))}
                      className="field py-1.5 px-2 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="label mb-1 block">Lat (°)</label>
                    <NumericField
                      ariaLabel="Rover latitude"
                      value={config.roverLat}
                      min={-90}
                      max={90}
                      step={0.5}
                      onCommit={(v) => setConfig((p) => ({ ...p, roverLat: v }))}
                      className="field py-1.5 px-2 font-mono text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="label mb-1 block">Lon (°)</label>
                    <NumericField
                      ariaLabel="Rover longitude"
                      value={config.roverLon}
                      min={-180}
                      max={180}
                      step={0.5}
                      onCommit={(v) => setConfig((p) => ({ ...p, roverLon: v }))}
                      className="field py-1.5 px-2 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label mb-1 block">TX Power (W)</label>
                    <NumericField
                      ariaLabel="Rover TX Power"
                      value={config.txPowerWatts}
                      min={5}
                      max={100}
                      integer
                      onCommit={(v) => setConfig((p) => ({ ...p, txPowerWatts: v }))}
                      className="field py-1.5 px-2 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="label mb-1 block">Payload Size (MB)</label>
                    <NumericField
                      ariaLabel="Payload Size MB"
                      value={config.payloadMb}
                      min={10}
                      max={500000}
                      integer
                      onCommit={(v) => {
                        setConfig((p) => ({ ...p, payloadMb: v }));
                        setDeliveredMb(0);
                      }}
                      className="field py-1.5 px-2 font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="label mb-1 block">Carrier Band</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(Object.keys(BAND_SPECS) as FrequencyBand[]).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setConfig((p) => ({ ...p, band: b }))}
                        className={`rounded border py-1.5 font-mono text-[11px] transition cursor-pointer ${
                          config.band === b
                            ? 'border-cyan bg-cyan/20 text-cyan font-bold'
                            : 'border-line bg-bg/70 text-fg-muted hover:text-fg'
                        }`}
                      >
                        {b === 'S_BAND' ? 'S-Band' : b === 'KA_BAND' ? 'Ka-Band' : 'Optical'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label mb-1 block">Routing Mode</label>
                  <select
                    value={config.routingMode}
                    onChange={(e) => setConfig((p) => ({ ...p, routingMode: e.target.value as RoutingMode }))}
                    className="field py-1.5 text-xs"
                  >
                    <option value="AUTO_RELAY">Auto Multi-Hop (Rover → Lunar Sat → Earth Sat → DSN)</option>
                    <option value="LUNAR_SAT_TO_DSN">Lunar Satellite → DSN Dish Direct</option>
                    <option value="DIRECT_TO_EARTH">Direct-to-Earth Only (No Relays)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'satellites' && (
              <div className="space-y-3">
                <div className="rounded border border-line bg-bg/50 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-cyan">Lunar Relay Constellation</span>
                    <span className="font-mono text-xs text-fg">{config.lunarSatCount} Active</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[0, 1, 2, 3, 4].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setConfig((p) => ({ ...p, lunarSatCount: cnt }))}
                        className={`rounded border py-1 font-mono text-xs cursor-pointer ${
                          config.lunarSatCount === cnt
                            ? 'border-cyan bg-cyan/20 text-cyan font-bold'
                            : 'border-line bg-bg/70 text-fg-muted hover:text-fg'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label mb-1 block">Orbit Regime</label>
                      <select
                        value={config.lunarOrbitType}
                        onChange={(e) =>
                          setConfig((p) => ({ ...p, lunarOrbitType: e.target.value as LunarOrbitType }))
                        }
                        className="field py-1.5 text-xs"
                      >
                        <option value="FROZEN_ELLIPTICAL">Frozen Elliptical</option>
                        <option value="LLO_POLAR">Polar LLO</option>
                        <option value="NRHO_HALO">NRHO Halo</option>
                      </select>
                    </div>
                    <div>
                      <label className="label mb-1 block">Altitude (km)</label>
                      <NumericField
                        ariaLabel="Lunar satellite altitude km"
                        value={config.lunarAltitudeKm}
                        min={100}
                        max={5000}
                        step={100}
                        integer
                        onCommit={(v) => setConfig((p) => ({ ...p, lunarAltitudeKm: v }))}
                        className="field py-1.5 px-2 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded border border-line bg-bg/50 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue">Earth Relay Satellites</span>
                    <span className="font-mono text-xs text-fg">{config.earthSatCount} Active</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[0, 1, 2, 3, 4].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setConfig((p) => ({ ...p, earthSatCount: cnt }))}
                        className={`rounded border py-1 font-mono text-xs cursor-pointer ${
                          config.earthSatCount === cnt
                            ? 'border-blue bg-blue/25 text-fg font-bold'
                            : 'border-line bg-bg/70 text-fg-muted hover:text-fg'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="label mb-1 block">Orbital Altitude (km)</label>
                    <NumericField
                      ariaLabel="Earth satellite altitude km"
                      value={config.earthAltitudeKm}
                      min={1200}
                      max={35786}
                      step={500}
                      integer
                      onCommit={(v) => setConfig((p) => ({ ...p, earthAltitudeKm: v }))}
                      className="field py-1.5 px-2 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dishes' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="label block">NASA Deep Space Network (70m Dishes)</span>
                  {[
                    { key: 'enableGoldstone' as const, meta: BASE_DISH_PRESETS[0]! },
                    { key: 'enableMadrid' as const, meta: BASE_DISH_PRESETS[1]! },
                    { key: 'enableCanberra' as const, meta: BASE_DISH_PRESETS[2]! },
                  ].map(({ key, meta }) => (
                    <label
                      key={meta.id}
                      className="flex cursor-pointer items-center justify-between rounded border border-line bg-bg/60 px-3 py-2 text-xs hover:border-cyan/40"
                    >
                      <div>
                        <span className="font-medium text-fg">{meta.name}</span>
                        <span className="ml-2 font-mono text-[10px] text-fg-muted">
                          ({meta.lat.toFixed(1)}°, {meta.lon.toFixed(1)}°)
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config[key]}
                        onChange={(e) => setConfig((p) => ({ ...p, [key]: e.target.checked }))}
                        className="accent-cyan"
                      />
                    </label>
                  ))}
                </div>

                {/* Custom Ground Dish */}
                <div className="rounded border border-line bg-bg/50 p-3 space-y-2">
                  <label className="flex cursor-pointer items-center justify-between text-xs font-semibold text-warning">
                    <span>Add Custom Earth Base Dish</span>
                    <input
                      type="checkbox"
                      checked={config.customDishEnabled}
                      onChange={(e) => setConfig((p) => ({ ...p, customDishEnabled: e.target.checked }))}
                      className="accent-warning"
                    />
                  </label>
                  {config.customDishEnabled && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                      <div className="col-span-2 sm:col-span-6">
                        <label className="label mb-1 block">Dish Name</label>
                        <input
                          type="text"
                          value={config.customDishName}
                          onChange={(e) => setConfig((p) => ({ ...p, customDishName: e.target.value }))}
                          className="field py-1.5 px-2 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="label mb-1 block">Lat (°)</label>
                        <NumericField
                          ariaLabel="Custom dish latitude"
                          value={config.customDishLat}
                          min={-90}
                          max={90}
                          step={0.5}
                          onCommit={(v) => setConfig((p) => ({ ...p, customDishLat: v }))}
                          className="field py-1.5 px-2 font-mono text-xs"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="label mb-1 block">Lon (°)</label>
                        <NumericField
                          ariaLabel="Custom dish longitude"
                          value={config.customDishLon}
                          min={-180}
                          max={180}
                          step={0.5}
                          onCommit={(v) => setConfig((p) => ({ ...p, customDishLon: v }))}
                          className="field py-1.5 px-2 font-mono text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <label className="flex cursor-pointer items-center justify-between rounded border border-line bg-bg/60 px-3 py-2 text-xs">
                  <span className="text-fg-muted">Rotate Earth (Real-Time DSN Handoff)</span>
                  <input
                    type="checkbox"
                    checked={config.rotateEarth}
                    onChange={(e) => setConfig((p) => ({ ...p, rotateEarth: e.target.checked }))}
                    className="accent-cyan"
                  />
                </label>
              </div>
            )}
          </section>

          {/* Live Link Telemetry & Hop Breakdown */}
          <section className="card space-y-3 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Activity className="size-4 text-cyan" /> Link Telemetry & Event Log
            </h3>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-4">
              <div className="rounded border border-line bg-bg/60 p-2">
                <div className="text-[10px] text-fg-dim">SIGNAL DELAY</div>
                <div className="mt-0.5 text-sm font-bold text-cyan">{frame.totalDelaySec} s</div>
              </div>
              <div className="rounded border border-line bg-bg/60 p-2">
                <div className="text-[10px] text-fg-dim">THROUGHPUT</div>
                <div className="mt-0.5 text-sm font-bold text-success">{frame.effectiveRateMbps} Mbps</div>
              </div>
              <div className="rounded border border-line bg-bg/60 p-2">
                <div className="text-[10px] text-fg-dim">MIN SNR</div>
                <div className="mt-0.5 text-sm font-bold text-warning">{frame.minSnrDb} dB</div>
              </div>
              <div className="rounded border border-line bg-bg/60 p-2">
                <div className="text-[10px] text-fg-dim">
                  {isComplete ? 'TIME TAKEN' : elapsedTotalSec > 0 ? 'ELAPSED / EST. FULL' : 'EST. FULL DELIVERY'}
                </div>
                <div className="mt-0.5 text-sm font-bold text-fg">
                  {isComplete
                    ? formatDurationSec(elapsedTotalSec)
                    : elapsedTotalSec > 0
                      ? formatDurationSec(elapsedTotalSec)
                      : orbitalPlan.missionTotalHours !== null
                        ? formatMissionHours(orbitalPlan.missionTotalHours)
                        : 'Blocked'}
                </div>
                <div className="text-[9px] text-fg-dim">
                  {isComplete
                    ? `Active TX ${activeTxSec.toFixed(1)}s • ${completedUtcStr ?? orbitalPlan.steadyArrivalUtc}`
                    : orbitalPlan.missionTotalHours !== null
                      ? `Est. ${formatMissionHours(orbitalPlan.missionTotalHours)} • ${orbitalPlan.losAvailabilityPct}% LOS`
                      : '0% Earth LOS (Needs Relay)'}
                </div>
              </div>
            </div>

            {frame.activeHops.length > 0 && (
              <div className="space-y-1 font-mono text-[11px]">
                {frame.activeHops.map((h, i) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded border border-line bg-bg/50 px-2.5 py-1.5"
                  >
                    <span className="truncate text-fg">
                      Hop {i + 1}: {h.fromLabel} → {h.toLabel}
                    </span>
                    <span className="shrink-0 text-cyan">
                      {h.latencyMs}ms · {h.snrDb}dB
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="max-h-32 space-y-1 overflow-y-auto rounded border border-line bg-bg/70 p-2 font-mono text-[10px] text-fg-muted">
              {eventLog.map((entry, idx) => (
                <div key={`${idx}-${entry.slice(0, 12)}`}>{entry}</div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
