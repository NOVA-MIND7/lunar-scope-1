import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { FOOTER_ROUTES, MAIN_ROUTES, type RouteDef } from '@/constants/routes';
import { useUiStore } from '@/stores/uiStore';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { StatusIndicator } from '@/components/common/StatusIndicator';

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={`flex h-16 shrink-0 items-center border-b border-line ${collapsed ? 'justify-center' : 'gap-3 px-4'}`}>
      <img src="/icons/favicon.svg" alt="" className="size-8 shrink-0" />
      {collapsed ? null : (
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-semibold tracking-[0.22em] text-fg">LUNAR SCOPE</p>
          <p className="whitespace-nowrap text-[8px] font-medium tracking-[0.12em] text-fg-muted">LUNAR MISSION INTELLIGENCE</p>
        </div>
      )}
    </div>
  );
}

function NavItem({ route, collapsed, onNavigate }: { route: RouteDef; collapsed: boolean; onNavigate?: () => void }) {
  const { path, label, icon: Icon } = route;
  const backend = useBackendStatus();
  return (
    <NavLink
      to={path}
      end={path === '/'}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded px-3 py-2 text-[13px] transition-colors ${collapsed ? 'justify-center' : ''} ${
          isActive ? 'bg-cyan/10 text-cyan' : 'text-fg-muted hover:bg-panel/70 hover:text-fg'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-cyan" aria-hidden /> : null}
          <Icon className="size-4 shrink-0" aria-hidden />
          {collapsed ? null : <span className="truncate">{label}</span>}
          {path === '/status' ? (
            <span className={collapsed ? 'absolute right-1.5 top-1.5' : 'ml-auto'}>
              <StatusIndicator state={backend.state} label={backend.label} dotOnly />
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

export function SidebarContent({
  collapsed,
  onNavigate,
  showCollapseToggle,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  showCollapseToggle?: boolean;
}) {
  const toggle = useUiStore((s) => s.toggleSidebar);
  return (
    <>
      <Brand collapsed={collapsed} />
      <nav className="flex-1 overflow-y-auto p-2.5" aria-label="Primary">
        <ul className="space-y-0.5">
          {MAIN_ROUTES.map((r) => (
            <li key={r.path}>
              <NavItem route={r} collapsed={collapsed} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>
      <nav className="border-t border-line p-2.5" aria-label="Secondary">
        <ul className="space-y-0.5">
          {FOOTER_ROUTES.map((r) => (
            <li key={r.path}>
              <NavItem route={r} collapsed={collapsed} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>
      {showCollapseToggle ? (
        <div className="border-t border-line p-2.5">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex w-full items-center gap-3 rounded px-3 py-2 text-[13px] text-fg-muted transition-colors hover:bg-panel/70 hover:text-fg ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? <PanelLeftOpen className="size-4" aria-hidden /> : <PanelLeftClose className="size-4" aria-hidden />}
            {collapsed ? null : <span>Collapse</span>}
          </button>
        </div>
      ) : null}
    </>
  );
}

/** Desktop/tablet sidebar (collapsible rail) plus the mobile off-canvas drawer. */
export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const mobileOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileOpen = useUiStore((s) => s.setMobileNavOpen);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      <aside
        data-testid="sidebar"
        data-collapsed={collapsed}
        className={`hidden shrink-0 flex-col border-r border-line bg-bg-secondary/80 backdrop-blur-md transition-[width] duration-200 md:flex ${
          collapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        <SidebarContent collapsed={collapsed} showCollapseToggle />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" data-testid="mobile-nav">
          <button
            type="button"
            className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-line bg-bg-secondary">
            <button
              type="button"
              className="btn-icon absolute right-3 top-4"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-4" aria-hidden />
            </button>
            <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
