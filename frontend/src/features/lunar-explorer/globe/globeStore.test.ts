import { beforeEach, describe, expect, it } from 'vitest';
import { useGlobeStore } from './globeStore';
import { createInitialState, useAppStore } from '@/stores/appStore';
import { getCelestialBodyPosition } from './MoonControls';

beforeEach(() => {
  useAppStore.setState(createInitialState());
  useGlobeStore.getState().resetTransient();
});

describe('globeStore', () => {
  it('setPending publishes canonical coordinates to the global store', () => {
    useGlobeStore.getState().setPending(10.123456, 190);
    expect(useGlobeStore.getState().pending).toEqual({ latitude_deg: 10.1235, longitude_deg: -170 });
    expect(useAppStore.getState().selectedCoordinates).toEqual(useGlobeStore.getState().pending);
  });
  it('typed and clicked picks are identical', () => {
    useGlobeStore.getState().setPending(-45.00004, 359.99996 - 360 + 0.5);
    const clicked = useGlobeStore.getState().pending;
    useGlobeStore.getState().clearPending();
    useGlobeStore.getState().setPending(-45.00004, 0.49996, { focus: true });
    expect(useGlobeStore.getState().pending).toEqual(clicked);
  });
  it('confirmPending selects a custom site and clears the pending point', () => {
    useGlobeStore.getState().setPending(-89, 12);
    useGlobeStore.getState().confirmPending();
    const site = useAppStore.getState().selectedLandingSite;
    expect(site?.category).toBe('custom');
    expect(site?.provenance).toBe('user');
    expect(site?.coordinates).toEqual({ latitude_deg: -89, longitude_deg: 12 });
    expect(useGlobeStore.getState().pending).toBeNull();
  });
  it('confirmPending without a pending point does nothing', () => {
    useGlobeStore.getState().confirmPending();
    expect(useAppStore.getState().selectedLandingSite).toBeNull();
  });
  it('South Pole mode issues a command and exit issues a reset', () => {
    useGlobeStore.getState().enterSouthPole();
    expect(useGlobeStore.getState().southPoleMode).toBe(true);
    expect(useGlobeStore.getState().command?.kind).toBe('southPole');
    useGlobeStore.getState().exitSouthPole();
    expect(useGlobeStore.getState().southPoleMode).toBe(false);
    expect(useGlobeStore.getState().command?.kind).toBe('reset');
  });
  it('toggles grid and category visibility', () => {
    useGlobeStore.getState().toggleGrid();
    expect(useGlobeStore.getState().showGrid).toBe(false);
    useGlobeStore.getState().toggleCategory('clps');
    expect(useGlobeStore.getState().visibleCategories.clps).toBe(false);
  });

  it('manages Cassini satellite state and telemetry', () => {
    expect(useGlobeStore.getState().showSatellite).toBe(true);
    useGlobeStore.getState().toggleSatellite();
    expect(useGlobeStore.getState().showSatellite).toBe(false);

    useGlobeStore.getState().setSatelliteTelemetry({
      latitude_deg: -89.9,
      longitude_deg: 0,
      altitude_km: 250,
      isOverSouthPole: true,
      targetRegion: 'Shackleton Crater',
    });
    expect(useGlobeStore.getState().satelliteTelemetry.latitude_deg).toBe(-89.9);
    expect(useGlobeStore.getState().satelliteTelemetry.isOverSouthPole).toBe(true);

    useGlobeStore.getState().focusSouthPoleAndSatellite();
    expect(useGlobeStore.getState().southPoleMode).toBe(true);
    expect(useGlobeStore.getState().showSatellitePanel).toBe(true);
    expect(useGlobeStore.getState().command?.kind).toBe('southPole');
  });

  it('alignWithEarth and alignWithSun set focusTarget and issue command on single call', () => {
    useGlobeStore.getState().alignWithEarth();
    expect(useGlobeStore.getState().focusTarget).toBe('earth');
    expect(useGlobeStore.getState().command?.kind).toBe('focus');

    useGlobeStore.getState().alignWithSun();
    expect(useGlobeStore.getState().focusTarget).toBe('sun');
    expect(useGlobeStore.getState().command?.kind).toBe('focus');
  });

  it('toggleAutoRotate and toggleTimePlaying stay synchronized', () => {
    expect(useGlobeStore.getState().autoRotate).toBe(true);
    expect(useGlobeStore.getState().isTimePlaying).toBe(true);

    useGlobeStore.getState().toggleAutoRotate();
    expect(useGlobeStore.getState().autoRotate).toBe(false);
    expect(useGlobeStore.getState().isTimePlaying).toBe(false);

    useGlobeStore.getState().toggleTimePlaying();
    expect(useGlobeStore.getState().autoRotate).toBe(true);
    expect(useGlobeStore.getState().isTimePlaying).toBe(true);
  });

  it('getCelestialBodyPosition returns correct 3D positions for bodies immediately', () => {
    const sunPos = getCelestialBodyPosition('sun');
    expect(sunPos.x).toBe(0);
    expect(sunPos.y).toBe(0);
    expect(sunPos.z).toBe(0);

    const earthPos = getCelestialBodyPosition('earth', 946728000000);
    expect(earthPos.length()).toBeCloseTo(20.0, 1);

    const moonPos = getCelestialBodyPosition('moon', 946728000000);
    expect(moonPos.length()).toBeGreaterThan(15);
  });
});
