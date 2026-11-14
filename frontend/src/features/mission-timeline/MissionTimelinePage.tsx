import {
  CalendarClock,
  Sun,
  Satellite,
  CheckCircle2,
  Compass,
  ArrowRight,
  Sparkles,
  Layers,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { MissionPanel } from '@/components/common/MissionPanel';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { DataSourceBadge } from '@/components/common/DataSourceBadge';
import { useSites, useMissionTimeline, useLandingWindows } from '@/hooks/useApi';
import { useAppStore } from '@/stores/appStore';
import { formatUtc, formatUtcMonthDay, addMilliseconds } from '@/utils/time';
import { formatLatitude, formatLongitude, pluralDays } from '@/utils/format';
import { CATEGORY_ORDER, CATEGORY_STYLE } from '@/features/lunar-explorer/globe/constants';

export default function MissionTimelinePage() {
  const sitesQuery = useSites();
  const sites = sitesQuery.data?.sites ?? [];

  const selectedSite = useAppStore((s) => s.selectedLandingSite);
  const selectLandingSite = useAppStore((s) => s.selectLandingSite);
  const date = useAppStore((s) => s.selectedLandingDate);
  const time = useAppStore((s) => s.selectedLandingTime);
  const duration = useAppStore((s) => s.selectedMissionDuration);
  const setLandingDate = useAppStore((s) => s.setLandingDate);
  const setLandingTime = useAppStore((s) => s.setLandingTime);
  const setMissionDuration = useAppStore((s) => s.setMissionDuration);

  // Fallback to first site if none selected
  const activeSite = selectedSite ?? sites[0] ?? null;
  const siteId = activeSite?.id ?? 'shackleton';
  const landingTimeUtc = `${date}T${time}:00.000Z`;

  // Search range for landing windows (defaults to 60 days from landing date)
  const searchStart = `${date}T00:00:00.000Z`;
  const searchEnd = addMilliseconds(`${date}T00:00:00.000Z`, 60 * 86_400_000);

  const timelineQuery = useMissionTimeline(siteId, landingTimeUtc, duration);
  const windowsQuery = useLandingWindows(siteId, searchStart, searchEnd, duration);

  const timeline = timelineQuery.data;
  const windows = windowsQuery.data?.windows ?? [];

  const startUtc = landingTimeUtc;
  const endUtc = addMilliseconds(startUtc, duration * 86_400_000);
  const tickCount = Math.min(Math.max(duration, 1), 8);
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const frac = i / tickCount;
    return {
      frac,
      label: formatUtcMonthDay(addMilliseconds(startUtc, frac * duration * 86_400_000)),
    };
  });

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <PageHeader
        title="Mission Timeline"
        description="Scientific ephemeris calculations of illumination, Earth communications, and optimal landing windows."
      />

      {/* Mission Setup & Parameters */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MissionPanel title="Target Site & Parameters" icon={Compass}>
          <div className="space-y-3">
            <div>
              <label htmlFor="timeline-site" className="label mb-1 block">
                Landing Site
              </label>
              <select
                id="timeline-site"
                className="field"
                value={activeSite?.id ?? ''}
                onChange={(e) => {
                  const s = sites.find((x) => x.id === e.target.value);
                  if (s) selectLandingSite(s);
                }}
              >
                {CATEGORY_ORDER.filter((c) => c !== 'custom').map((c) => (
                  <optgroup key={c} label={CATEGORY_STYLE[c].plural}>
                    {sites
                      .filter((s) => s.category === c)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {activeSite ? (
              <div className="rounded border border-line bg-surface-elevated/40 p-2 text-xs">
                <div className="font-medium text-fg">{activeSite.name}</div>
                <div className="font-mono text-fg-dim">
                  {formatLatitude(activeSite.coordinates.latitude_deg)}, {formatLongitude(activeSite.coordinates.longitude_deg)}
                </div>
                <div className="mt-1 text-fg-muted">{activeSite.description}</div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="timeline-date" className="label mb-1 block">
                  Landing Date (UTC)
                </label>
                <input
                  id="timeline-date"
                  type="date"
                  className="field"
                  value={date}
                  onChange={(e) => e.target.value && setLandingDate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="timeline-time" className="label mb-1 block">
                  Time (UTC)
                </label>
                <input
                  id="timeline-time"
                  type="time"
                  className="field"
                  value={time}
                  onChange={(e) => e.target.value && setLandingTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="timeline-duration" className="label mb-1 block">
                Mission Duration: <span className="font-mono text-cyan">{duration} days</span>
              </label>
              <input
                id="timeline-duration"
                type="range"
                min="1"
                max="60"
                step="1"
                className="w-full accent-cyan"
                value={duration}
                onChange={(e) => setMissionDuration(Number(e.target.value))}
              />
            </div>
          </div>
        </MissionPanel>

        {/* Scientific Mission Metrics */}
        <MissionPanel
          title="Illumination & LOS Metrics"
          icon={CalendarClock}
          aside={<DataSourceBadge kind="computed" label="EPHEMERIS COMPUTED" />}
        >
          {timelineQuery.isPending ? (
            <LoadingState label="Computing ephemeris timeline..." compact />
          ) : timelineQuery.isError ? (
            <ErrorState compact title="Calculation error" message={timelineQuery.error.message} />
          ) : timeline ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded border border-amber-400/30 bg-amber-400/10 p-2.5">
                  <div className="font-mono text-xl font-bold text-amber-400">
                    {Math.round(timeline.sunlit_fraction * 100)}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-fg-muted">Sunlight Share</div>
                </div>

                <div className="rounded border border-blue-400/30 bg-blue-400/10 p-2.5">
                  <div className="font-mono text-xl font-bold text-blue-400">
                    {Math.round(timeline.earth_visible_fraction * 100)}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-fg-muted">Earth Visibility</div>
                </div>

                <div className="rounded border border-line bg-surface-elevated/40 p-2.5">
                  <div className="font-mono text-xl font-bold text-fg">
                    {timeline.longest_darkness_hours}h
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-fg-muted">Max Darkness</div>
                </div>
              </div>

              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between border-b border-line/60 pb-1">
                  <dt className="text-fg-muted">Calculation Method</dt>
                  <dd className="font-mono text-cyan">{timeline.method}</dd>
                </div>
                <div className="flex justify-between border-b border-line/60 pb-1">
                  <dt className="text-fg-muted">Landing Touchdown</dt>
                  <dd className="font-mono">{formatUtc(timeline.start_utc)}</dd>
                </div>
                <div className="flex justify-between border-b border-line/60 pb-1">
                  <dt className="text-fg-muted">End of Mission</dt>
                  <dd className="font-mono">{formatUtc(timeline.end_utc)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-fg-muted">Continuous Shadow Risk</dt>
                  <dd className="font-mono text-amber-400">
                    {timeline.longest_darkness_hours > 0
                      ? `${timeline.longest_darkness_hours} hours (${(timeline.longest_darkness_hours / 24).toFixed(1)} days)`
                      : 'None (Perpetual Sunlight)'}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </MissionPanel>

        {/* Operational Phases */}
        <MissionPanel title="Mission Operational Phases" icon={Layers}>
          {timeline?.phases ? (
            <div className="space-y-2 text-xs">
              {timeline.phases.map((phase, idx) => (
                <div key={idx} className="rounded border border-line/80 bg-surface-elevated/30 p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg">
                      {idx + 1}. {phase.name}
                    </span>
                    <span className="font-mono text-[10px] text-cyan">
                      {formatUtcMonthDay(phase.start_utc)} ▸ {formatUtcMonthDay(phase.end_utc)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-fg-dim">{phase.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-fg-dim">Select a site to inspect operational phases.</p>
          )}
        </MissionPanel>
      </div>

      {/* Main Interactive Timeline Visualizer */}
      <MissionPanel
        title={`Mission Timeline · ${activeSite?.name ?? 'Site'}`}
        icon={CalendarClock}
        aside={
          <span className="font-mono text-xs text-fg-dim">
            {formatUtc(startUtc)} — {formatUtc(endUtc)}
          </span>
        }
      >
        <div className="space-y-4 py-2">
          {/* Timeline Mission Window Bar */}
          <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 sm:grid-cols-[9rem_1fr]">
            <span className="text-xs font-medium text-fg">Mission Window</span>
            <div className="relative h-6 rounded border border-cyan/60 bg-cyan/15 flex items-center px-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan">
                Landing ▸ {pluralDays(duration)} Nominal Mission
              </span>
            </div>
          </div>

          {/* Sunlight Track */}
          <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 sm:grid-cols-[9rem_1fr]">
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <Sun className="size-3.5" />
              <span>Sunlight</span>
            </div>
            <div className="relative h-6 w-full rounded bg-surface-elevated/60 overflow-hidden border border-line flex">
              {timeline?.sunlight_track.intervals.map((inv, idx) => {
                const totalMs = duration * 86_400_000;
                const startMs = Date.parse(inv.start_utc) - Date.parse(startUtc);
                const endMs = Date.parse(inv.end_utc) - Date.parse(startUtc);
                const left = `${Math.max(0, Math.min(100, (startMs / totalMs) * 100))}%`;
                const width = `${Math.max(0.5, Math.min(100, ((endMs - startMs) / totalMs) * 100))}%`;
                const isSun = inv.state === 'sunlit';

                return (
                  <div
                    key={idx}
                    className={`absolute top-0 bottom-0 ${
                      isSun ? 'bg-amber-400/80 border-r border-amber-500' : 'bg-slate-900/90'
                    }`}
                    style={{ left, width }}
                    title={`${inv.state.toUpperCase()}: ${formatUtc(inv.start_utc)} to ${formatUtc(inv.end_utc)}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Earth Visibility Track */}
          <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 sm:grid-cols-[9rem_1fr]">
            <div className="flex items-center gap-1.5 text-xs text-blue-400">
              <Satellite className="size-3.5" />
              <span>Earth Visibility</span>
            </div>
            <div className="relative h-6 w-full rounded bg-surface-elevated/60 overflow-hidden border border-line flex">
              {timeline?.earth_track.intervals.map((inv, idx) => {
                const totalMs = duration * 86_400_000;
                const startMs = Date.parse(inv.start_utc) - Date.parse(startUtc);
                const endMs = Date.parse(inv.end_utc) - Date.parse(startUtc);
                const left = `${Math.max(0, Math.min(100, (startMs / totalMs) * 100))}%`;
                const width = `${Math.max(0.5, Math.min(100, ((endMs - startMs) / totalMs) * 100))}%`;
                const isVis = inv.state === 'visible';

                return (
                  <div
                    key={idx}
                    className={`absolute top-0 bottom-0 ${
                      isVis ? 'bg-blue-500/80 border-r border-blue-400' : 'bg-slate-900/90'
                    }`}
                    style={{ left, width }}
                    title={`${isVis ? 'EARTH VISIBLE' : 'OCCLUDED'}: ${formatUtc(inv.start_utc)} to ${formatUtc(inv.end_utc)}`}
                  />
                );
              })}
            </div>
          </div>

          {/* UTC Axis Ticks */}
          <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 sm:grid-cols-[9rem_1fr]">
            <span className="text-xs text-fg-dim font-mono">UTC Ticks</span>
            <div className="relative h-6 border-t border-line-strong">
              {ticks.map((t, i) => (
                <span
                  key={i}
                  className={`absolute top-0 flex-col ${
                    i === 0 || i === ticks.length - 1 || (i % 2 === 0 && ticks.length - 1 - i >= 2)
                      ? 'flex'
                      : 'hidden sm:flex'
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

      {/* Landing Windows Search Results */}
      <MissionPanel
        title="Computed Landing Windows"
        icon={Sparkles}
        aside={<span className="font-mono text-xs text-cyan">{windows.length} Windows Found</span>}
      >
        {windowsQuery.isPending ? (
          <LoadingState label="Searching optimal landing windows across ephemeris..." compact />
        ) : windowsQuery.isError ? (
          <ErrorState compact title="Could not search landing windows" message={windowsQuery.error.message} />
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-fg-dim">
              The algorithm evaluates astronomical sun elevation and direct Earth line-of-sight to identify the
              safest and highest-power surface landing opportunities.
            </p>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {windows.map((win, idx) => {
                const sDate = win.start_utc.slice(0, 10);
                const sTime = win.start_utc.slice(11, 16);
                const isSelected = date === sDate;

                return (
                  <div
                    key={idx}
                    className={`rounded border p-3 transition ${
                      isSelected
                        ? 'border-cyan bg-cyan/10 shadow-sm'
                        : 'border-line bg-surface-elevated/40 hover:border-line-strong'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-fg">
                        Window #{idx + 1}
                      </span>
                      <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-cyan">
                        {pluralDays(duration)}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1 font-mono text-xs">
                      <div className="text-fg">
                        <span className="text-fg-dim">Start: </span>
                        {formatUtc(win.start_utc)}
                      </div>
                      <div className="text-fg-muted">
                        <span className="text-fg-dim">End: </span>
                        {formatUtc(win.end_utc)}
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1 text-amber-400">
                        <Sun className="size-3" />
                        <span className="font-mono">{Math.round(win.sunlit_fraction * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-400">
                        <Satellite className="size-3" />
                        <span className="font-mono">{Math.round(win.earth_visible_fraction * 100)}%</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`btn mt-3 w-full justify-center text-xs ${
                        isSelected ? 'btn-primary' : ''
                      }`}
                      onClick={() => {
                        setLandingDate(sDate);
                        setLandingTime(sTime);
                      }}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="size-3.5" /> Active Target Window
                        </>
                      ) : (
                        <>
                          Select Window <ArrowRight className="size-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </MissionPanel>
    </div>
  );
}
