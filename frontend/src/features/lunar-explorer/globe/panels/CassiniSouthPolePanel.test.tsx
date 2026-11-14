import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CassiniSouthPolePanel } from './CassiniSouthPolePanel';
import { useGlobeStore } from '../globeStore';
import { createInitialState, useAppStore } from '@/stores/appStore';
import { SOUTH_POLE_FEATURES } from '../southPoleData';

beforeEach(() => {
  useAppStore.setState(createInitialState());
  useGlobeStore.getState().resetTransient();
});

describe('CassiniSouthPolePanel', () => {
  it('renders telemetry and locates South Pole', async () => {
    const user = userEvent.setup();
    render(<CassiniSouthPolePanel />);

    expect(screen.getByText('Cassini · South Pole Reconnaissance')).toBeInTheDocument();
    expect(screen.getByText('ORBITAL TELEMETRY')).toBeInTheDocument();

    const locateBtn = screen.getByRole('button', { name: /Locate South Pole/i });
    await user.click(locateBtn);
    expect(useGlobeStore.getState().southPoleMode).toBe(true);
    expect(useGlobeStore.getState().command?.kind).toBe('southPole');
  });

  it('allows selecting a South Pole feature and setting it as mission target', async () => {
    const user = userEvent.setup();
    render(<CassiniSouthPolePanel />);

    // Click on Cabeus feature
    const cabeusBtn = screen.getByRole('button', { name: 'Cabeus' });
    await user.click(cabeusBtn);
    expect(useGlobeStore.getState().selectedSouthPoleFeature?.name).toBe('Cabeus Crater');

    // Click "Select for Mission Analysis"
    const selectTargetBtn = screen.getByRole('button', { name: /Select for Mission Analysis/i });
    await user.click(selectTargetBtn);

    const activeSite = useAppStore.getState().selectedLandingSite;
    expect(activeSite).not.toBeNull();
    expect(activeSite?.name).toBe('Cabeus Crater');
    expect(activeSite?.coordinates.latitude_deg).toBe(SOUTH_POLE_FEATURES.find(f => f.id === 'cabeus')!.coordinates.latitude_deg);
  });

  it('switches to sensors & controls tab and toggles satellite settings', async () => {
    const user = userEvent.setup();
    render(<CassiniSouthPolePanel />);

    const controlsTab = screen.getByRole('button', { name: 'Sensors & Controls' });
    await user.click(controlsTab);

    expect(screen.getByText('DISPLAY & VISIBILITY')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE SENSING INSTRUMENTS')).toBeInTheDocument();

    const speed2xBtn = screen.getByRole('button', { name: '2x' });
    await user.click(speed2xBtn);
    expect(useGlobeStore.getState().satelliteSpeed).toBe(2);
  });
});
