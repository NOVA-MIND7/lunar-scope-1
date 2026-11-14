import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useAppStore } from './appStore';
import type { LandingSite } from '@/types';

const site: LandingSite = {
  id: 'test-site',
  name: 'Test Site',
  region: 'south-pole',
  category: 'candidate-region',
  precision: 'regional',
  coordinates: { latitude_deg: -89.5, longitude_deg: 10 },
  provenance: 'sample',
  description: 'fixture',
};

describe('appStore', () => {
  beforeEach(() => useAppStore.setState(createInitialState()));

  it('selecting a site also sets the selected coordinates', () => {
    useAppStore.getState().selectLandingSite(site);
    expect(useAppStore.getState().selectedCoordinates).toEqual(site.coordinates);
    useAppStore.getState().selectLandingSite(null);
    expect(useAppStore.getState().selectedCoordinates).toBeNull();
  });

  it('keeps simulation time in UTC and in sync with the landing date/time', () => {
    useAppStore.getState().setLandingDate('2028-02-29');
    useAppStore.getState().setLandingTime('06:30');
    expect(useAppStore.getState().simulationTime).toBe('2028-02-29T06:30:00.000Z');
  });

  it('toggles simulation playback', () => {
    expect(useAppStore.getState().isSimulationPlaying).toBe(false);
    useAppStore.getState().toggleSimulation();
    expect(useAppStore.getState().isSimulationPlaying).toBe(true);
  });

  it('does not add duplicate comparison scenarios', () => {
    const scenario = {
      id: 's1',
      label: 'A',
      siteId: site.id,
      coordinates: site.coordinates,
      landingTimeUtc: '2027-01-01T00:00:00.000Z',
      missionDurationDays: 14,
    };
    useAppStore.getState().addComparisonScenario(scenario);
    useAppStore.getState().addComparisonScenario(scenario);
    expect(useAppStore.getState().comparisonScenarios).toHaveLength(1);
    useAppStore.getState().removeComparisonScenario('s1');
    expect(useAppStore.getState().comparisonScenarios).toHaveLength(0);
  });

  it('clamps mission duration to at least one whole day', () => {
    useAppStore.getState().setMissionDuration(0.2);
    expect(useAppStore.getState().selectedMissionDuration).toBe(1);
  });
});
