import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { routeObjects } from './router';
import { createInitialState, useAppStore } from '@/stores/appStore';
import { useUiStore } from '@/stores/uiStore';

const SITES = {
  data_status: 'sample', disclaimer: 'Sample', count: 1,
  sites: [{ id: 'shackleton-rim', name: 'Shackleton Crater Rim', region: 'south-pole', category: 'candidate-region', precision: 'regional', coordinates: { latitude_deg: -89.9, longitude_deg: 0 }, provenance: 'sample', description: 'x' }],
};

beforeEach(() => {
  useAppStore.setState(createInitialState());
  useUiStore.setState({ toasts: [], mobileNavOpen: false, sidebarCollapsed: false });
  vi.stubGlobal('fetch', vi.fn(async (url: string) =>
    new Response(JSON.stringify(String(url).endsWith('/health')
      ? { status: 'ok', service: 'LUNAR SCOPE API', version: '0.1.0', time_utc: '2026-11-05T00:00:00Z', database: 'disabled' }
      : SITES), { status: 200 })));
});

function renderDashboard() {
  const router = createMemoryRouter(routeObjects, { initialEntries: ['/'] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
}

describe('Mission Control dashboard', () => {
  it('shows the four required metric cards, all unavailable (no fabricated values)', async () => {
    renderDashboard();
    const cards = await screen.findAllByTestId('metric-card');
    expect(cards.map((c) => c.getAttribute('aria-label'))).toEqual([
      'Solar elevation', 'Earth elevation', 'Sunlight duration', 'Earth visibility',
    ]);
    for (const card of cards) {
      expect(within(card).getByTestId('metric-value')).toHaveTextContent('—');
      expect(within(card).getByText('Unavailable')).toBeInTheDocument();
      expect(card.querySelector('[data-quality="unavailable"]')).not.toBeNull();
    }
  });

  it('shows empty states for conditions until a site is selected, then updates from state', async () => {
    const user = userEvent.setup();
    renderDashboard();
    expect(await screen.findAllByText('No landing site selected')).toHaveLength(2);
    await user.selectOptions(await screen.findByLabelText('Landing site'), 'shackleton-rim');
    expect(screen.queryByText('No landing site selected')).not.toBeInTheDocument();
    expect(screen.getByTestId('topbar-location')).toHaveTextContent('Shackleton Crater Rim');
    expect(screen.getByTestId('coordinate-readout')).toHaveTextContent('Shackleton Crater Rim');
    expect(screen.getAllByTestId('metric-card')[0]).toHaveTextContent('Shackleton Crater Rim');
    expect(useAppStore.getState().selectedCoordinates).toEqual({ latitude_deg: -89.9, longitude_deg: 0 });
  });

  it('updates the mission date and duration in state and the timeline', async () => {
    renderDashboard();
    const dateInput = await screen.findByLabelText('Date (UTC)');
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(dateInput, { target: { value: '2028-03-10' } });
    fireEvent.change(screen.getByLabelText('Mission duration (days)'), { target: { value: '21' } });
    expect(useAppStore.getState().selectedLandingDate).toBe('2028-03-10');
    expect(useAppStore.getState().selectedMissionDuration).toBe(21);
    expect(screen.getByTestId('timeline-start')).toHaveTextContent('2028-03-10 00:00:00 UTC');
  });

  it('timeline shows no data by default and labelled DEMO DATA only when toggled', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await screen.findAllByTestId('metric-card');
    expect(screen.queryAllByTestId('demo-segment')).toHaveLength(0);
    await user.click(screen.getByRole('switch'));
    expect(screen.getAllByTestId('demo-segment').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DEMO DATA').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('switch'));
    expect(screen.queryAllByTestId('demo-segment')).toHaveLength(0);
  });

  it('embeds the shared globe and shows the fallback when WebGL is unavailable (jsdom)', async () => {
    renderDashboard();
    const globe = await screen.findByTestId('lunar-globe');
    expect(globe).toHaveAttribute('data-webgl', 'false');
    expect(await screen.findByTestId('webgl-fallback')).toHaveTextContent('3D view unavailable');
  });

  it('links Explore Moon to the explorer route', async () => {
    renderDashboard();
    expect(await screen.findByRole('link', { name: /Explore Moon/ })).toHaveAttribute('href', '/explorer');
  });
});
