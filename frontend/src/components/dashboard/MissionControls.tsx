import { useEffect } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { MissionPanel } from '@/components/common/MissionPanel';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { useSites } from '@/hooks/useApi';
import { useAppStore } from '@/stores/appStore';
import { useUiStore } from '@/stores/uiStore';
import { CATEGORY_ORDER, CATEGORY_STYLE } from '@/features/lunar-explorer/globe/constants';
import { formatLatitude, formatLongitude } from '@/utils/format';

/** Landing-site, date, time and duration selection, bound directly to global state. */
export function MissionControls() {
  const sites = useSites();
  const site = useAppStore((s) => s.selectedLandingSite);
  const date = useAppStore((s) => s.selectedLandingDate);
  const time = useAppStore((s) => s.selectedLandingTime);
  const duration = useAppStore((s) => s.selectedMissionDuration);
  const selectLandingSite = useAppStore((s) => s.selectLandingSite);
  const setLandingDate = useAppStore((s) => s.setLandingDate);
  const setLandingTime = useAppStore((s) => s.setLandingTime);
  const setMissionDuration = useAppStore((s) => s.setMissionDuration);
  const pushToast = useUiStore((s) => s.pushToast);

  useEffect(() => {
    if (sites.isError) {
      pushToast({ id: 'sites-error', tone: 'error', title: 'Could not load landing sites', message: sites.error.message });
    }
  }, [sites.isError, sites.error, pushToast]);

  return (
    <MissionPanel title="Mission setup" icon={SlidersHorizontal}>
      {sites.isPending ? (
        <LoadingState label="Loading landing sites…" compact />
      ) : sites.isError ? (
        <ErrorState compact title="Landing sites unavailable" message={sites.error.message} onRetry={() => void sites.refetch()} />
      ) : (
        <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="site-select" className="label mb-1 block">
              Landing site
            </label>
            <select
              id="site-select"
              className="field"
              value={site?.id ?? ''}
              onChange={(e) => {
                const next = sites.data.sites.find((s) => s.id === e.target.value);
                if (next || e.target.value === '') selectLandingSite(next ?? null);
              }}
            >
              <option value="">Select landing site…</option>
              {site?.category === 'custom' ? (
                <option value={site.id}>
                  Custom location ({formatLatitude(site.coordinates.latitude_deg)} {formatLongitude(site.coordinates.longitude_deg)})
                </option>
              ) : null}
              {CATEGORY_ORDER.filter((c) => c !== 'custom').map((c) => (
                <optgroup key={c} label={CATEGORY_STYLE[c].plural}>
                  {sites.data.sites
                    .filter((s) => s.category === c)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-fg-dim">Quick Pick:</span>
              <button
                type="button"
                className="rounded bg-surface-elevated/70 px-2 py-0.5 text-[11px] text-cyan hover:bg-cyan/15 border border-line transition"
                onClick={() => {
                  const apollo = sites.data.sites.find((s) => s.id === 'apollo-11' || s.name.includes('Apollo 11'));
                  if (apollo) selectLandingSite(apollo);
                }}
                title="Select Apollo 11 historic landing site"
              >
                Apollo 11
              </button>
              <button
                type="button"
                className="rounded bg-surface-elevated/70 px-2 py-0.5 text-[11px] text-cyan hover:bg-cyan/15 border border-line transition"
                onClick={() => {
                  const south = sites.data.sites.find((s) => s.id.includes('shackleton') || s.region === 'south-pole');
                  if (south) selectLandingSite(south);
                }}
                title="Select Shackleton Crater Rim at the South Pole"
              >
                South Pole Rim
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="landing-date" className="label mb-1 block">
                Date (UTC)
              </label>
              <input
                id="landing-date"
                type="date"
                className="field"
                value={date}
                onChange={(e) => e.target.value && setLandingDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="landing-time" className="label mb-1 block">
                Time (UTC)
              </label>
              <input
                id="landing-time"
                type="time"
                className="field"
                value={time}
                onChange={(e) => e.target.value && setLandingTime(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="mission-duration" className="label mb-1 block">
              Mission duration (days)
            </label>
            <input
              id="mission-duration"
              type="number"
              min={1}
              max={365}
              step={1}
              className="field"
              value={duration}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n >= 1) setMissionDuration(Math.min(n, 365));
              }}
            />
          </div>
        </form>
      )}
    </MissionPanel>
  );
}
