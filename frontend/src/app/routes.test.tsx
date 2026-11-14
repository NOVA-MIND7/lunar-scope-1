import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { routeObjects } from './router';
import { ROUTES } from '@/constants/routes';
import { createInitialState, useAppStore } from '@/stores/appStore';
import { useUiStore } from '@/stores/uiStore';

const SITES = {
  data_status: 'sample',
  disclaimer: 'Sample site metadata for development.',
  count: 2,
  sites: [
    { id: 'shackleton-rim', name: 'Shackleton Crater Rim', region: 'south-pole', coordinates: { latitude_deg: -89.9, longitude_deg: 0 }, provenance: 'sample', description: 'x' },
    { id: 'tranquility-base', name: 'Tranquility Base (Apollo 11)', region: 'equatorial', coordinates: { latitude_deg: 0.67, longitude_deg: 23.47 }, provenance: 'sample', description: 'y' },
  ],
};
const HEALTH = { status: 'ok', service: 'LUNAR SCOPE API', version: '0.1.0', time_utc: '2026-11-05T00:00:00Z', database: 'disabled' };

function stubFetch(mode: 'online' | 'offline') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (mode === 'offline') throw new TypeError('network down');
      const body = String(url).endsWith('/health') ? HEALTH : SITES;
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
}

function renderAt(path: string) {
  const router = createMemoryRouter(routeObjects, { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAppStore.setState(createInitialState());
  useUiStore.setState({ toasts: [], mobileNavOpen: false, sidebarCollapsed: false });
  stubFetch('online');
});

describe('routing and shell', () => {
  it('declares every route, including the footer pages', () => {
    expect(ROUTES.map((r) => r.path)).toEqual([
      '/', '/explorer', '/navigator', '/solar', '/earth', '/timeline', '/compare', '/terrain',
      '/recommendations', '/reports', '/data-sources', '/settings', '/status',
    ]);
  });

  it('shows branding and every navigation entry', () => {
    renderAt('/');
    expect(screen.getByText('LUNAR MISSION INTELLIGENCE')).toBeInTheDocument();
    const primary = screen.getByRole('navigation', { name: 'Primary' });
    const secondary = screen.getByRole('navigation', { name: 'Secondary' });
    for (const r of ROUTES) {
      const scope = r.group === 'main' ? primary : secondary;
      expect(within(scope).getByRole('link', { name: new RegExp(`^${r.label}`) })).toHaveAttribute('href', r.path);
    }
  });

  it('highlights the active route', async () => {
    renderAt('/earth');
    const link = within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Earth Visibility' });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByTestId('topbar-section')).toHaveTextContent('Earth Visibility');
  });

  it('collapses and expands the sidebar', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
  });

  it('opens and closes the mobile navigation drawer', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const drawer = screen.getByTestId('mobile-nav');
    await user.click(within(drawer).getByRole('link', { name: 'Solar Analysis' }));
    expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument();
    expect(await screen.findByTestId('not-implemented')).toBeInTheDocument();
  });

  it('shows the not-implemented notice instead of invented numbers on science pages', async () => {
    renderAt('/solar');
    expect(await screen.findByTestId('not-implemented')).toBeInTheDocument();
  });

  it.each([
    ['/data-sources', 'Data Sources'],
    ['/status', 'System Status'],
    ['/settings', 'Settings'],
  ])('renders %s', async (path, title) => {
    renderAt(path);
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });

  it('shows an error toast when the backend is unreachable', async () => {
    stubFetch('offline');
    renderAt('/');
    expect(await screen.findByText('Backend unreachable')).toBeInTheDocument();
  });
});
