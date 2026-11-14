import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoordinateEntryPanel } from './CoordinateEntryPanel';
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
  });
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
