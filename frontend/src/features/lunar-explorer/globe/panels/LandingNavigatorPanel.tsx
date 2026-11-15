import { useMemo, useState } from 'react';
import { Search, Crosshair, Calendar, MapPin, Database, CheckCircle2, Sparkles } from 'lucide-react';
import { MissionPanel } from '@/components/common/MissionPanel';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { CATEGORY_ORDER, CATEGORY_STYLE, PRECISION_NOTE } from '../constants';
import { useSites } from '@/hooks/useApi';
import { useAppStore } from '@/stores/appStore';
import { useGlobeStore } from '../globeStore';
import { formatLatitude, formatLongitude } from '@/utils/format';
import type { LandingSite, SiteCategory } from '@/types';

export type DecadeCluster = 'all' | '1960s' | '1970s' | '1980s' | '1990s' | '2000s' | '2010s' | '2020s' | '2030s+';

export const DECADE_CLUSTERS: { id: DecadeCluster; label: string; period: string; description: string }[] = [
  { id: 'all', label: 'All Eras', period: 'All Years', description: 'All historical & planned candidate landing sites' },
  { id: '1960s', label: '1960s', period: '1960–1969', description: 'Early Apollo human landings (Apollo 11, 12)' },
  { id: '1970s', label: '1970s', period: '1970–1979', description: 'Lunar surface science era (Apollo 14, 15, 16, 17)' },
  { id: '1980s', label: '1980s', period: '1980–1989', description: 'Interim lunar orbital exploration era' },
  { id: '1990s', label: '1990s', period: '1990–1999', description: 'Clementine and Lunar Prospector polar mapping era' },
  { id: '2000s', label: '2000s', period: '2000–2009', description: 'NASA JPL Horizons 2000-2030 Ephemeris baseline & LCROSS Cabeus' },
  { id: '2010s', label: '2010s', period: '2010–2019', description: 'Robotic & far-side landings (Chang\'e 3, 4)' },
  { id: '2020s', label: '2020s', period: '2020–2029', description: 'Artemis & Commercial CLPS era (Chandrayaan-3, SLIM, IM-1, Firefly, IM-2)' },
  { id: '2030s+', label: '2030s+', period: 'Future / Polar', description: 'Artemis Base Camp & permanently shadowed south polar craters' },
];

export function getSiteYear(site: LandingSite): number {
  if (site.year) return site.year;
  if (site.id.includes('apollo-11') || site.id.includes('apollo-12')) return 1969;
  if (site.id.includes('apollo-14') || site.id.includes('apollo-15')) return 1971;
  if (site.id.includes('apollo-16') || site.id.includes('apollo-17')) return 1972;
  if (site.id === 'south-pole-horizons') return 2000;
  if (site.id.includes('cabeus')) return 2009;
  if (site.id.includes('change-3')) return 2013;
  if (site.id.includes('change-4')) return 2019;
  if (site.id.includes('chandrayaan-3')) return 2023;
  if (site.id.includes('slim') || site.id.includes('im-1')) return 2024;
  if (site.id.includes('blue-ghost') || site.id.includes('im-2')) return 2025;
  const match = site.description.match(/\b(19\d\d|20\d\d)\b/);
  if (match?.[1]) return parseInt(match[1], 10);
  return 2030;
}

export function getDecadeCluster(year: number): DecadeCluster {
  if (year >= 1960 && year <= 1969) return '1960s';
  if (year >= 1970 && year <= 1979) return '1970s';
  if (year >= 1980 && year <= 1989) return '1980s';
  if (year >= 1990 && year <= 1999) return '1990s';
  if (year >= 2000 && year <= 2009) return '2000s';
  if (year >= 2010 && year <= 2019) return '2010s';
  if (year >= 2020 && year <= 2029) return '2020s';
  return '2030s+';
}

export function LandingNavigatorPanel() {
  const { data, error, isPending, refetch } = useSites();
  const selected = useAppStore((s) => s.selectedLandingSite);
  const selectLandingSite = useAppStore((s) => s.selectLandingSite);
  const [decade, setDecade] = useState<DecadeCluster>('all');
  const [filter, setFilter] = useState<SiteCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const sites = useMemo(() => {
    const list = data?.sites ?? [];
    return list.filter((s) => {
      const siteYear = getSiteYear(s);
      const siteDecade = getDecadeCluster(siteYear);
      const matchDecade = decade === 'all' || siteDecade === decade;
      const matchCategory = filter === 'all' || s.category === filter;
      const query = search.trim().toLowerCase();
      const matchSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.region.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        String(siteYear).includes(query);
      return matchDecade && matchCategory && matchSearch;
    });
  }, [data, decade, filter, search]);

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
    <MissionPanel title="Landing Navigator" icon={Crosshair}>
      <div className="space-y-3" data-testid="landing-navigator-panel">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-fg-dim" aria-hidden />
          <input
            type="search"
            className="field pl-8 text-xs font-mono"
            placeholder="Search sites (Apollo, Shackleton, Artemis)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search landing sites"
          />
        </div>

        {/* 10-Year Interval / Decade Clusters */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="label text-[10px] flex items-center gap-1 text-cyan">
              <Calendar className="size-3 text-cyan" />
              10-Year Clusters (Decades)
            </span>
            <span className="text-[9px] text-fg-dim font-mono">1960s – 2030s+</span>
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="10-year decade clusters">
            {DECADE_CLUSTERS.map((c) => {
              const active = decade === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDecade(c.id)}
                  className={`rounded px-2 py-0.5 text-[10px] font-mono font-medium transition cursor-pointer ${
                    active
                      ? 'border border-cyan bg-cyan/25 text-cyan font-bold shadow-sm'
                      : 'border border-line/60 bg-surface-elevated/40 text-fg-muted hover:border-cyan/40 hover:text-cyan'
                  }`}
                  title={`${c.label} (${c.period}) - ${c.description}`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1 border-t border-line/50 pt-2" role="group" aria-label="Filter by category">
          {(['all', ...CATEGORY_ORDER.filter((c) => c !== 'custom')] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
              className={`rounded px-2 py-0.5 text-[10px] font-mono transition cursor-pointer ${
                filter === c ? 'bg-cyan/20 border border-cyan/60 text-cyan font-bold' : 'bg-surface-elevated/40 border border-line/50 text-fg-dim hover:text-fg'
              }`}
            >
              {c === 'all' ? 'All Types' : CATEGORY_STYLE[c].label}
            </button>
          ))}
        </div>

        {/* Ephemeris & Terrain Data Note */}
        <div className="rounded-lg border border-cyan/30 bg-cyan/5 p-2 text-[10px] text-cyan/90 font-mono flex items-start gap-1.5">
          <Database className="size-3.5 text-cyan shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-fg">JPL Horizons & Terrain Ephemeris (2000–2030)</p>
            <p className="text-fg-muted text-[9px] mt-0.5">
              CSV files in <code className="text-cyan">Data/processed</code> verify 30-year Sun/Earth ephemeris & LOLA South Pole terrain for site analysis.
            </p>
          </div>
        </div>

        {isPending ? <LoadingState label="Loading candidate sites…" /> : null}
        {error ? <ErrorState title="Landing sites unavailable" message={error.message} onRetry={() => void refetch()} /> : null}

        {/* Sites List */}
        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
          {sites.length === 0 ? (
            <p className="p-3 text-center text-xs text-fg-dim font-mono">No matching sites found for this era</p>
          ) : (
            sites.map((site) => {
              const isSelected = selected?.id === site.id;
              const style = CATEGORY_STYLE[site.category];
              const note = PRECISION_NOTE[site.precision];
              const year = getSiteYear(site);
              const decadeTag = getDecadeCluster(year);
              const hasEphemerisCoverage = year >= 2000 && year <= 2030;

              return (
                <div
                  key={site.id}
                  className={`rounded-lg border p-2.5 transition cursor-pointer ${
                    isSelected
                      ? 'border-cyan bg-cyan/15 shadow-md shadow-cyan/15 ring-1 ring-cyan/50'
                      : 'border-line/70 bg-bg/60 hover:border-cyan/50 hover:bg-bg-secondary/60'
                  }`}
                  onClick={() => handleSelectSite(site)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-semibold text-fg">{site.name}</h4>
                        <span className="rounded bg-surface-elevated border border-line px-1.5 py-0.2 text-[9px] font-mono text-cyan">
                          {year} ({decadeTag})
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] text-fg-dim flex items-center gap-1">
                        <MapPin className="size-2.5 text-cyan shrink-0" />
                        {formatLatitude(site.coordinates.latitude_deg)} · {formatLongitude(site.coordinates.longitude_deg)}
                      </p>
                    </div>
                    <span className="size-2 shrink-0 rounded-full mt-1" style={{ background: style.color }} title={style.label} />
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                    <StatusBadge tone="info">{style.label}</StatusBadge>
                    {hasEphemerisCoverage ? (
                      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="size-2.5" /> Data/ 2000-2030 Ephem
                      </span>
                    ) : null}
                    {note ? <StatusBadge tone="warning">{site.precision}</StatusBadge> : null}
                  </div>

                  <p className="mt-1 text-[11px] text-fg-muted line-clamp-2">{site.description}</p>

                  <div className="mt-2 flex items-center justify-between border-t border-line/40 pt-1.5">
                    <span className="text-[9px] font-mono text-fg-dim uppercase">{site.region.replace('-', ' ')}</span>
                    <button
                      type="button"
                      className={`btn px-2 py-0.5 text-[10px] font-mono ${isSelected ? 'btn-primary shadow-sm font-bold' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSite(site);
                      }}
                    >
                      <Sparkles className="size-2.5" />
                      {isSelected ? 'Focused on Moon' : 'Select & Focus'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </MissionPanel>
  );
}
