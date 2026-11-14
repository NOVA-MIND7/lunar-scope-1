import {
  Play,
  Pause,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useGlobeStore } from '../globeStore';
import { useAppStore } from '@/stores/appStore';

export function AstronomicalTimeBar({ onClose }: { onClose?: () => void }) {
  const timeTrackingMode = useGlobeStore((s) => s.timeTrackingMode);
  const setTimeTrackingMode = useGlobeStore((s) => s.setTimeTrackingMode);
  const activeTimestampMs = useGlobeStore((s) => s.activeTimestampMs);
  const isTimePlaying = useGlobeStore((s) => s.isTimePlaying);
  const toggleTimePlaying = useGlobeStore((s) => s.toggleTimePlaying);
  const timeMultiplier = useGlobeStore((s) => s.timeMultiplier);
  const setTimeMultiplier = useGlobeStore((s) => s.setTimeMultiplier);
  const astronomicalPhase = useGlobeStore((s) => s.astronomicalPhase);

  const selectedLandingDate = useAppStore((s) => s.selectedLandingDate);
  const selectedLandingTime = useAppStore((s) => s.selectedLandingTime);
  const setLandingDate = useAppStore((s) => s.setLandingDate);
  const setLandingTime = useAppStore((s) => s.setLandingTime);

  const currentDateObj = new Date(activeTimestampMs);
  const currentDateStr = currentDateObj.toISOString().slice(0, 10);
  const currentTimeStr = currentDateObj.toISOString().slice(11, 16);

  const handleSetLive = () => {
    setTimeTrackingMode('realtime');
    const now = new Date();
    setLandingDate(now.toISOString().slice(0, 10));
    setLandingTime(now.toISOString().slice(11, 16));
  };

  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    setTimeTrackingMode('manual');
    setLandingDate(newDate);
  };

  const handleTimeChange = (newTime: string) => {
    if (!newTime) return;
    setTimeTrackingMode('manual');
    setLandingTime(newTime);
  };

  const handleOffsetDays = (days: number) => {
    setTimeTrackingMode('manual');
    const next = new Date(activeTimestampMs + days * 86_400_000);
    setLandingDate(next.toISOString().slice(0, 10));
    setLandingTime(next.toISOString().slice(11, 16));
  };

  const isRealtime = timeTrackingMode === 'realtime';

  return (
    <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-lg border border-line bg-bg/95 px-2.5 py-1.5 shadow-xl backdrop-blur text-xs">
      {/* Live Real-Time & Custom Toggle */}
      <div className="flex items-center gap-1.5 border-b md:border-b-0 md:border-r border-line pb-1.5 md:pb-0 md:pr-2">
        <button
          type="button"
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[11px] font-semibold transition ${
            isRealtime
              ? 'border border-cyan bg-cyan/20 text-cyan shadow-sm'
              : 'border border-line bg-surface-elevated/40 text-fg-muted hover:text-cyan'
          }`}
          onClick={handleSetLive}
          title="Synchronize Moon and Earth rotation and position to real-time live clock"
        >
          <span className={`size-2 rounded-full ${isRealtime ? 'bg-cyan animate-pulse' : 'bg-fg-dim'}`} />
          LIVE REAL-TIME
        </button>

        <button
          type="button"
          className={`rounded px-2 py-1 font-mono text-[11px] font-medium transition ${
            !isRealtime
              ? 'border border-amber-400/80 bg-amber-400/15 text-amber-400'
              : 'text-fg-muted hover:text-fg'
          }`}
          onClick={() => setTimeTrackingMode('manual')}
          title="Switch to custom date/time simulation"
        >
          Custom Date
        </button>
      </div>

      {/* Date & Time Picker */}
      <div className="flex items-center gap-1.5">
        <Clock className="size-3.5 text-cyan shrink-0" aria-hidden />

        <input
          type="date"
          className="field h-7 px-2 py-0 text-xs font-mono"
          value={isRealtime ? currentDateStr : selectedLandingDate}
          onChange={(e) => handleDateChange(e.target.value)}
        />

        <input
          type="time"
          className="field h-7 px-1.5 py-0 text-xs font-mono"
          value={isRealtime ? currentTimeStr : selectedLandingTime}
          onChange={(e) => handleTimeChange(e.target.value)}
        />

        {/* Quick Day Skips */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="btn-icon size-7 text-xs"
            onClick={() => handleOffsetDays(-1)}
            title="Previous Day (-24h)"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            className="btn-icon size-7 text-[10px] font-mono"
            onClick={handleSetLive}
            title="Reset to Now"
          >
            Now
          </button>
          <button
            type="button"
            className="btn-icon size-7 text-xs"
            onClick={() => handleOffsetDays(1)}
            title="Next Day (+24h)"
          >
            <ChevronRight className="size-3.5" />
          </button>
          <button
            type="button"
            className="btn h-7 px-1.5 py-0 text-[10px] font-mono text-cyan"
            onClick={() => handleOffsetDays(7)}
            title="Advance 1 Lunar Quarter (+7 Days)"
          >
            +7d
          </button>
        </div>
      </div>

      {/* Simulation Play / Pause & Speed Multipliers */}
      <div className="flex items-center gap-1.5 border-t md:border-t-0 md:border-l border-line pt-1.5 md:pt-0 md:pl-2">
        <button
          type="button"
          className={`btn-icon size-7 ${isTimePlaying ? 'border-cyan/60 text-cyan bg-cyan/10' : ''}`}
          onClick={toggleTimePlaying}
          title={isTimePlaying ? 'Pause planetary motion' : 'Play planetary motion'}
        >
          {isTimePlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>

        <select
          className="field h-7 px-1 py-0 text-[11px] font-mono"
          value={timeMultiplier}
          onChange={(e) => {
            setTimeMultiplier(Number(e.target.value));
            if (timeTrackingMode === 'realtime') setTimeTrackingMode('simulated');
          }}
          title="Simulation Speed Multiplier"
        >
          <option value={1}>1x (Real-time)</option>
          <option value={60}>60x (1m/s)</option>
          <option value={3600}>3,600x (1h/s)</option>
          <option value={86400}>86,400x (1d/s)</option>
          <option value={604800}>604,800x (7d/s)</option>
        </select>

        {/* Lunar Phase Telemetry */}
        <div className="hidden lg:flex items-center gap-1.5 rounded bg-surface-elevated/60 px-2 py-0.5 border border-line/60">
          <Sparkles className="size-3 text-amber-400" />
          <span className="font-mono text-[10px] text-fg">
            {astronomicalPhase.name} · {astronomicalPhase.percent}%
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            className="btn-icon size-7 text-fg-dim hover:text-fg ml-1 cursor-pointer"
            onClick={onClose}
            title="Close / Auto-hide Time Bar"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
