import { describe, expect, it } from 'vitest';
import { computeAstronomicalState, J2000_EPOCH_MS } from './astronomicalTime';

describe('astronomicalTime', () => {
  it('computes astronomical state for J2000 epoch', () => {
    const state = computeAstronomicalState(J2000_EPOCH_MS);
    expect(state.daysSinceJ2000).toBe(0);
    expect(state.earthPosition).toHaveLength(3);
    expect(state.moonPosition).toHaveLength(3);
    expect(state.moonPhasePercent).toBeGreaterThanOrEqual(0);
    expect(state.moonPhasePercent).toBeLessThanOrEqual(100);
  });

  it('updates moon position and rotation when time changes by 1 day', () => {
    const t0 = J2000_EPOCH_MS;
    const t1 = t0 + 86400000; // +1 day
    const s0 = computeAstronomicalState(t0);
    const s1 = computeAstronomicalState(t1);

    // Earth moves ~1 degree
    expect(s1.earthOrbitAngleRad).not.toEqual(s0.earthOrbitAngleRad);
    // Moon moves ~13.2 degrees
    expect(s1.moonOrbitAngleRad).not.toEqual(s0.moonOrbitAngleRad);
    // Moon spin changes synchronously
    expect(s1.moonSpinAngleRad).not.toEqual(s0.moonSpinAngleRad);
    // Moon position vector changes
    expect(s1.moonPosition).not.toEqual(s0.moonPosition);
  });

  it('progresses through lunar phases over a 29.5-day synodic month', () => {
    const t0 = J2000_EPOCH_MS;
    const states = [];
    for (let day = 0; day < 30; day += 7) {
      states.push(computeAstronomicalState(t0 + day * 86400000));
    }
    const phaseNames = states.map((s) => s.moonPhaseName);
    // Across 4 weeks, phase names should vary
    const uniquePhases = new Set(phaseNames);
    expect(uniquePhases.size).toBeGreaterThanOrEqual(3);
  });
});
