import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoordinateEntryPanel } from './CoordinateEntryPanel';
import { LandingNavigatorPanel, getDecadeCluster, getSiteYear } from './LandingNavigatorPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PendingLocationBar } from './PendingLocationBar';
import { WebGLFallback } from '../WebGLFallback';
import { useGlobeStore } from '../globeStore';
import { createInitialState, useAppStore } from '@/stores/appStore';

beforeEach(() => {
  useAppStore.setState(createInitialState());
  useGlobeStore.getState().resetTransient();
});

describe('CoordinateEntryPanel', () => {
  it('rejects out-of-range values with a message and no selection', async () => {
    const user = userEvent.setup();
    render(<CoordinateEntryPanel />);
    await user.type(screen.getByLabelText('Latitude (°)'), '95');
    await user.type(screen.getByLabelText('Longitude (°E)'), '10');
    await user.click(screen.getByRole('button', { name: 'Locate on Moon' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Latitude must be between');
    expect(useGlobeStore.getState().pending).toBeNull();
    await user.clear(screen.getByLabelText('Latitude (°)'));
    await user.type(screen.getByLabelText('Latitude (°)'), '0');
    await user.clear(screen.getByLabelText('Longitude (°E)'));
    await user.type(screen.getByLabelText('Longitude (°E)'), '181');
    await user.click(screen.getByRole('button', { name: 'Locate on Moon' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Longitude must be between');
  }, 15000);
  it('valid entry sets pending and global selectedCoordinates', async () => {
    const user = userEvent.setup();
    render(<CoordinateEntryPanel />);
    await user.type(screen.getByLabelText('Latitude (°)'), '-89.5');
    await user.type(screen.getByLabelText('Longitude (°E)'), '-180');
    await user.click(screen.getByRole('button', { name: 'Locate on Moon' }));
    expect(useGlobeStore.getState().pending).toEqual({ latitude_deg: -89.5, longitude_deg: 180 });
    expect(useAppStore.getState().selectedCoordinates).toEqual({ latitude_deg: -89.5, longitude_deg: 180 });
  });
});

describe('PendingLocationBar', () => {
  it('appears for a pending pick and SELECT THIS LOCATION confirms it', async () => {
    const user = userEvent.setup();
    render(<PendingLocationBar />);
    expect(screen.queryByTestId('pending-bar')).toBeNull();
    useGlobeStore.getState().setPending(5, 5);
    await user.click(await screen.findByRole('button', { name: /SELECT THIS LOCATION/i }));
    expect(useAppStore.getState().selectedLandingSite?.category).toBe('custom');
  });
});

describe('WebGLFallback', () => {
  it('explains why the 3D view is unavailable', () => {
    render(<WebGLFallback reason="no context" />);
    expect(screen.getByRole('alert')).toHaveTextContent('no context');
  });
});

describe('LandingNavigatorPanel & 10-year decade clustering', () => {
  it('clusters years accurately into 10-year intervals', () => {
    expect(getDecadeCluster(1969)).toBe('1960s');
    expect(getDecadeCluster(1972)).toBe('1970s');
    expect(getDecadeCluster(1985)).toBe('1980s');
    expect(getDecadeCluster(1998)).toBe('1990s');
    expect(getDecadeCluster(2000)).toBe('2000s');
    expect(getDecadeCluster(2009)).toBe('2000s');
    expect(getDecadeCluster(2013)).toBe('2010s');
    expect(getDecadeCluster(2024)).toBe('2020s');
    expect(getDecadeCluster(2032)).toBe('2030s+');
  });

  it('correctly associates landing sites with accurate eras', () => {
    expect(getSiteYear({ id: 'apollo-11', description: '' } as any)).toBe(1969);
    expect(getSiteYear({ id: 'apollo-17', description: '' } as any)).toBe(1972);
    expect(getSiteYear({ id: 'south-pole-horizons', description: '' } as any)).toBe(2000);
    expect(getSiteYear({ id: 'cabeus', description: '' } as any)).toBe(2009);
    expect(getSiteYear({ id: 'change-3', description: '' } as any)).toBe(2013);
    expect(getSiteYear({ id: 'chandrayaan-3', description: '' } as any)).toBe(2023);
    expect(getSiteYear({ id: 'slim', description: '' } as any)).toBe(2024);
  });

  it('renders landing navigator with 10-year decade cluster buttons', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <LandingNavigatorPanel />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Landing Navigator')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1960s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1970s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2000s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2020s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2030s\+/i })).toBeInTheDocument();
  });
});
