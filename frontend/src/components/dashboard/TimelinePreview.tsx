import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { MissionPanel } from '@/components/common/MissionPanel';
import { DataSourceBadge } from '@/components/common/DataSourceBadge';
import { addMilliseconds, formatUtc, formatUtcMonthDay } from '@/utils/time';
import { pluralDays } from '@/utils/format';

interface TimelinePreviewProps {
  /** Selected landing time, ISO UTC. */
  startUtc: string;
  durationDays: number;
}

type Segment = readonly [number, number];

/** Arbitrary illustrative segments (fractions of the mission window). Only ever drawn when labelled DEMO DATA. */
const DEMO_SUNLIGHT: readonly Segment[] = [[0, 0.22], [0.3, 0.58], [0.66, 0.93]];
const DEMO_EARTH: readonly Segment[] = [[0.05, 0.4], [0.47, 0.52], [0.58, 0.85]];

function Track({ label, segments, demo }: { label: string; segments: readonly Segment[]; demo: boolean }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-center gap-3 sm:grid-cols-[8rem_1fr]">
      <p className="label">{label}</p>
      <div
        className="relative h-5 rounded-sm border border-dashed border-line-strong"
        data-testid={`track-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {demo
          ? segments.map(([a, b], i) => (
              <span
                key={i}
                className="hatch-demo absolute inset-y-0 border border-warning/60"
                style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%` }}
                data-testid="demo-segment"
              />
            ))
          : null}
        {!demo ? (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-wider text-fg-dim">
            No computed data
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function TimelinePreview({ startUtc, durationDays }: TimelinePreviewProps) {
  const [showDemo, setShowDemo] = useState(false);
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
        <div className="flex items-center gap-3">
          {showDemo ? <DataSourceBadge kind="demo" label="DEMO DATA" /> : <DataSourceBadge kind="unavailable" />}
          <button
            type="button"
            role="switch"
            aria-checked={showDemo}
            onClick={() => setShowDemo((v) => !v)}
            className="btn px-2.5 py-1 text-[11px]"
          >
            {showDemo ? 'Hide demo data' : 'Show demo data'}
          </button>
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

        <Track label="Sunlight" segments={DEMO_SUNLIGHT} demo={showDemo} />
        <Track label="Earth visibility" segments={DEMO_EARTH} demo={showDemo} />

        <div className="grid grid-cols-[5.5rem_1fr] gap-3 sm:grid-cols-[8rem_1fr]">
          <p className="label">UTC</p>
          <div className="relative h-6 border-t border-line-strong">
            {ticks.map((t, i) => (
              <span
                key={i}
                className={`absolute top-0 flex-col ${i === 0 || i === ticks.length - 1 || (i % 2 === 0 && ticks.length - 1 - i >= 2) ? 'flex' : 'hidden sm:flex'} ${i === 0 ? 'items-start' : i === ticks.length - 1 ? 'items-end' : 'items-center'}`}
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

        <p className="text-[11px] text-fg-dim">
          {showDemo
            ? 'DEMO DATA: hatched bars are illustrative only and were not computed from any ephemeris.'
            : 'Sunlight and Earth-visibility periods appear here once the scientific engine is connected.'}
        </p>
      </div>
    </MissionPanel>
  );
}
