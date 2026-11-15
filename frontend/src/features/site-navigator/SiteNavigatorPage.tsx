import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { LunarGlobe } from '@/features/lunar-explorer/globe/LunarGlobe';
import { CATEGORY_ORDER, CATEGORY_STYLE, PRECISION_NOTE } from '@/features/lunar-explorer/globe/constants';
import { useSites } from '@/hooks/useApi';
import { useAppStore } from '@/stores/appStore';
import { useGlobeStore } from '@/features/lunar-explorer/globe/globeStore';
import { formatLatitude, formatLongitude } from '@/utils/format';
import type { LandingSite, SiteCategory } from '@/types';

export default function SiteNavigatorPage() {
  const { data, error, isPending, refetch } = useSites();
  const selected = useAppStore((s) => s.selectedLandingSite);
  const selectLandingSite = useAppStore((s) => s.selectLandingSite);
  const [filter, setFilter] = useState<SiteCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const sites = useMemo(() => {
    const list = data?.sites ?? [];
    return list.filter((s) => {
      const matchCategory = filter === 'all' || s.category === filter;
      const query = search.trim().toLowerCase();
      const matchSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.region.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query);
      return matchCategory && matchSearch;
    });
  }, [data, filter, search]);

  const handleSelectSite = (site: LandingSite) => {
    const isSelected = selected?.id === site.id;
    if (isSelected) {
      selectLandingSite(null);
      useGlobeStore.getState().clearPending();
    } else {
      selectLandingSite(site);
      useGlobeStore.getState().setFocusTarget('moon');
      useGlobeStore.getState().setPending(
        site.coordinates.latitude_deg,
        site.coordinates.longitude_deg,
        { focus: true },
      );
    }
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader title="Landing Navigator" description="Browse candidate landing sites and regions; selecting one centres it on the Moon." />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="order-2 lg:order-1">
          {data ? (
            <p className="mb-3 rounded border border-warning/40 bg-warning/10 p-3 text-xs text-warning" role="note">
              {data.disclaimer}
            </p>
          ) : null}

          {/* User-friendly search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-fg-dim" aria-hidden />
            <input
              type="search"
              className="field pl-8 text-xs"
              placeholder="Search landing sites (e.g. Apollo, Shackleton, Artemis)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search landing sites"
            />
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
            {(['all', ...CATEGORY_ORDER.filter((c) => c !== 'custom')] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={filter === c}
                onClick={() => setFilter(c)}
                className={`btn px-2.5 py-1 text-[11px] ${filter === c ? 'btn-primary' : ''}`}
              >
                {c === 'all' ? 'All' : CATEGORY_STYLE[c].plural}
              </button>
            ))}
          </div>

          {isPending ? <LoadingState label="Loading sites…" /> : null}
          {error ? <ErrorState title="Landing sites unavailable" message={error.message} onRetry={() => void refetch()} /> : null}

          <ul className="max-h-none space-y-2 lg:max-h-[calc(100vh-20rem)] lg:overflow-y-auto lg:pr-1">
            {sites.map((site) => {
              const isSelected = selected?.id === site.id;
              const style = CATEGORY_STYLE[site.category];
              const note = PRECISION_NOTE[site.precision];
              return (
                <li
                  key={site.id}
                  className={`panel p-3 cursor-pointer transition hover:border-cyan/50 ${isSelected ? 'border-cyan/70 shadow-glow' : ''}`}
                  onClick={() => handleSelectSite(site)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold">{site.name}</h2>
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: style.color }} title={style.label} aria-label={style.label} />
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-fg-muted">
                    {formatLatitude(site.coordinates.latitude_deg)} · {formatLongitude(site.coordinates.longitude_deg)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <StatusBadge tone="info">{style.label}</StatusBadge>
                    {note ? <StatusBadge tone="warning">{site.precision}</StatusBadge> : null}
                    <StatusBadge tone="neutral">{site.provenance}</StatusBadge>
                  </div>
                  {note ? <p className="mt-1.5 text-[11px] text-warning">{note}</p> : null}
                  <p className="mt-1.5 text-xs text-fg-muted">{site.description}</p>
                  <button
                    type="button"
                    className={`btn mt-2 ${isSelected ? 'btn-primary' : ''}`}
                    aria-pressed={isSelected}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectSite(site);
                    }}
                  >
                    {isSelected ? 'Selected' : 'Select site & focus'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="order-1 lg:sticky lg:top-0 lg:order-2 lg:self-start">
          <LunarGlobe variant="compact" showExploreLink className="panel h-[420px] lg:h-[calc(100vh-14rem)] lg:min-h-[480px]" />
        </div>
      </div>
    </div>
  );
}
