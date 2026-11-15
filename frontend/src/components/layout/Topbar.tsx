import { useLocation } from 'react-router-dom';
import { Menu, MapPin, Flag, FlaskConical } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { useAppStore } from '@/stores/appStore';
import { useUiStore } from '@/stores/uiStore';
import { useUtcClock } from '@/hooks/useUtcClock';
import { formatLatitude, formatLongitude } from '@/utils/format';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function Topbar() {
  const { pathname } = useLocation();
  const section = ROUTES.find((r) => r.path === pathname)?.label ?? 'Not found';
  const missionName = useAppStore((s) => s.missionName);
  const site = useAppStore((s) => s.selectedLandingSite);
  const uiMode = useAppStore((s) => s.uiMode);
  const setUIMode = useAppStore((s) => s.setUIMode);
  const setMobileOpen = useUiStore((s) => s.setMobileNavOpen);
  const now = useUtcClock();

  const time = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
  const date = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-bg-secondary/70 px-3 backdrop-blur-md md:px-5">
      <button
        type="button"
        className="btn-icon md:hidden"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="size-4" aria-hidden />
      </button>

      <div className="min-w-0">
        <p className="label hidden sm:block">Section</p>
        <p className="truncate text-sm font-semibold text-fg" data-testid="topbar-section">
          {section}
        </p>
      </div>

      <div className="mx-1 hidden h-8 w-px bg-line lg:block" aria-hidden />

      <div className="hidden min-w-0 lg:block">
        <p className="label flex items-center gap-1.5">
          <Flag className="size-3" aria-hidden /> Mission
        </p>
        <p className="truncate text-sm" data-testid="topbar-mission">
          {missionName}
        </p>
      </div>

      <div className="hidden min-w-0 xl:block">
        <p className="label flex items-center gap-1.5">
          <MapPin className="size-3" aria-hidden /> Landing location
        </p>
        <p className="truncate text-sm" data-testid="topbar-location">
          {site ? (
            <>
              {site.name}{' '}
              <span className="font-mono text-xs text-fg-muted">
                {formatLatitude(site.coordinates.latitude_deg)} {formatLongitude(site.coordinates.longitude_deg)}
              </span>
            </>
          ) : (
            <span className="text-fg-dim">No site selected</span>
          )}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-3 md:gap-4">
        <div className="hidden sm:flex items-center rounded border border-line bg-bg/60 p-0.5 text-sm" role="group" aria-label="UI mode">
          <button
            type="button"
            onClick={() => setUIMode('basic')}
            className={`rounded px-2 py-0.5 font-medium transition ${uiMode === 'basic' ? 'bg-cyan/20 text-cyan' : 'text-fg-muted hover:text-fg'}`}
            title="Basic mode: simplified views and core features"
          >
            Basic
          </button>
          <button
            type="button"
            onClick={() => setUIMode('scientific')}
            className={`flex items-center gap-1 rounded px-2 py-0.5 font-medium transition ${uiMode === 'scientific' ? 'bg-cyan/20 text-cyan' : 'text-fg-muted hover:text-fg'}`}
            title="Scientific mode: full analysis and telemetry"
          >
            <FlaskConical className="size-3" aria-hidden /> Scientific
          </button>
        </div>

        <div className="text-right leading-tight" title="Coordinated Universal Time (current wall clock)">
          <p className="font-mono text-sm tabular-nums text-fg" data-testid="utc-clock">
            {time} <span className="text-xs text-cyan">UTC</span>
          </p>
          <p className="hidden font-mono text-xs text-fg-muted sm:block">{date}</p>
        </div>
      </div>
    </header>
  );
}
