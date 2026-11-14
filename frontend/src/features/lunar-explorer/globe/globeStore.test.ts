import { beforeEach, describe, expect, it } from 'vitest';
import { useGlobeStore } from './globeStore';
import { createInitialState, useAppStore } from '@/stores/appStore';

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
});
