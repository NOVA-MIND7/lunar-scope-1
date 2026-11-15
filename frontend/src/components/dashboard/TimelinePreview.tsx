import { useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { MissionPanel } from '@/components/common/MissionPanel';
import { DataSourceBadge } from '@/components/common/DataSourceBadge';
import { useAppStore } from '@/stores/appStore';
import { useMissionTimeline } from '@/hooks/useApi';
import { addMilliseconds, formatUtc, formatUtcMonthDay } from '@/utils/time';
import { pluralDays } from '@/utils/format';

interface TimelinePreviewProps {
  /** Selected landing time, ISO UTC. */
  startUtc: string;
  durationDays: number;
}

type Segment = readonly [number, number];

/** Arbitrary illustrative segments (only used when demo mode is enabled). */
const DEMO_SUNLIGHT: readonly Segment[] = [[0, 0.22], [0.3, 0.58], [0.66, 0.93]];
const DEMO_EARTH: readonly Segment[] = [[0.05, 0.4], [0.47, 0.52], [0.58, 0.85]];

function Track({
  label,
  segments,
  colorClass,
  isDemo,
}: {
  label: string;
  segments: readonly Segment[];
  colorClass: string;
  isDemo: boolean;
}) {
  const hasData = segments.length > 0;
  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-center gap-3 sm:grid-cols-[8rem_1fr]">
      <p className="label">{label}</p>
      <div
        className="relative h-5 rounded-sm border border-line-strong overflow-hidden bg-surface-elevated/40"
        data-testid={`track-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {hasData
          ? segments.map(([a, b], i) => (
              <span
                key={i}
                className={`absolute inset-y-0 ${
                  isDemo
                    ? 'hatch-demo border border-warning/60'
                    : `${colorClass} border-r border-line/40`
                }`}
                style={{ left: `${a * 100}%`, width: `${Math.max(0.8, (b - a) * 100)}%` }}
                data-testid="demo-segment"
              />
            ))
          : (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-wider text-fg-dim">
              No computed data
            </span>
          )}
      </div>
    </div>
  );
}

export function TimelinePreview({ startUtc, durationDays }: TimelinePreviewProps) {
  const [showDemo, setShowDemo] = useState(false);
  const site = useAppStore((s) => s.selectedLandingSite);
  const siteId = site?.id ?? 'shackleton';

  const timelineQuery = useMissionTimeline(siteId, startUtc, durationDays);
  const timeline = timelineQuery.data;

  const totalMs = durationDays * 86_400_000;
  const startMs = Date.parse(startUtc) || Date.now();

  const computedSunlightSegments: Segment[] = useMemo(() => {
    if (!timeline?.sunlight_track?.intervals) return [];
    return timeline.sunlight_track.intervals
      .filter((iv) => iv.state === 'sunlit')
      .map((iv) => [
        Math.max(0, Math.min(1, (Date.parse(iv.start_utc) - startMs) / totalMs)),
        Math.max(0, Math.min(1, (Date.parse(iv.end_utc) - startMs) / totalMs)),
      ]);
  }, [timeline, startMs, totalMs]);

  const computedEarthSegments: Segment[] = useMemo(() => {
    if (!timeline?.earth_track?.intervals) return [];
    return timeline.earth_track.intervals
      .filter((iv) => iv.state === 'visible')
      .map((iv) => [
        Math.max(0, Math.min(1, (Date.parse(iv.start_utc) - startMs) / totalMs)),
        Math.max(0, Math.min(1, (Date.parse(iv.end_utc) - startMs) / totalMs)),
      ]);
  }, [timeline, startMs, totalMs]);

  const hasComputedData = computedSunlightSegments.length > 0 || computedEarthSegments.length > 0;
  const isDemoActive = showDemo && !hasComputedData;

  const sunlightSegments = isDemoActive ? DEMO_SUNLIGHT : computedSunlightSegments;
  const earthSegments = isDemoActive ? DEMO_EARTH : computedEarthSegments;

  const endUtc = addMilliseconds(startUtc, durationDays * 86_400_000);
  const tickCount = Math.min(Math.max(durationDays, 1), 7);
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const frac = i / tickCount;
    return { frac, label: formatUtcMonthDay(addMilliseconds(startUtc, frac * durationDays * 86_400_000)) };
  });

  return (
    <MissionPanel
      title="Mission timeline preview"
      icon={CalendarClock}
      aside={
        <div className="flex items-center gap-2">
          {hasComputedData ? (
            <DataSourceBadge kind="computed" label="EPHEMERIS COMPUTED" />
          ) : showDemo ? (
            <DataSourceBadge kind="demo" label="DEMO DATA" />
          ) : (
            <DataSourceBadge kind="unavailable" />
          )}
          {!hasComputedData && (
            <button
              type="button"
              role="switch"
              aria-checked={showDemo}
              onClick={() => setShowDemo((v) => !v)}
              className="btn px-2 py-0.5 text-[10px]"
            >
              {showDemo ? 'Hide demo' : 'Show demo'}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-3">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
          <div className="flex justify-between gap-3 sm:block">
            <dt className="label">Landing</dt>
            <dd className="font-mono" data-testid="timeline-start">{formatUtc(startUtc)}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:block">
            <dt className="label">End of mission</dt>
            <dd className="font-mono">{formatUtc(endUtc)}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:block">
            <dt className="label">Duration</dt>
            <dd className="font-mono">{pluralDays(durationDays)}</dd>
          </div>
        </dl>

        <div className="grid grid-cols-[5.5rem_1fr] items-center gap-3 sm:grid-cols-[8rem_1fr]">
          <p className="label">Mission window</p>
          <div className="relative h-5 rounded-sm border border-cyan/50 bg-cyan/10" data-testid="mission-window">
            <span className="absolute -left-px top-[-5px] h-[calc(100%+10px)] w-px bg-cyan" aria-hidden />
            <span className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold uppercase tracking-wider text-cyan">
              Landing ▸ {pluralDays(durationDays)}
            </span>
          </div>
        </div>

        <Track
          label="Sunlight"
          segments={sunlightSegments}
          colorClass="bg-amber-400/80"
          isDemo={isDemoActive}
        />
        <Track
          label="Earth visibility"
          segments={earthSegments}
          colorClass="bg-blue-500/80"
          isDemo={isDemoActive}
        />

        <div className="grid grid-cols-[5.5rem_1fr] items-center gap-3 sm:grid-cols-[8rem_1fr]">
          <span />
          <div className="relative h-4 border-t border-line-strong">
            {ticks.map((t, i) => (
              <span
                key={i}
                className={`absolute top-0 flex-col ${
                  i === 0 || i === ticks.length - 1 ? 'flex' : 'hidden sm:flex'
                } ${i === 0 ? 'items-start' : i === ticks.length - 1 ? 'items-end' : 'items-center'}`}
                style={{
                  left: `${t.frac * 100}%`,
                  transform: i === 0 ? 'none' : i === ticks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
                }}
              >
                <span className="h-1.5 w-px bg-line-strong" />
                <span className="whitespace-nowrap font-mono text-[10px] text-fg-muted">{t.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </MissionPanel>
  );
}
