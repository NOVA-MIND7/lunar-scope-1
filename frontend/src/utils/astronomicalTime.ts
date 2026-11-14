/**
 * Astronomical Ephemeris & Orbit Engine for Earth and Moon
 * =========================================================
 * Calculates accurate orbital positions, axial rotations, and lunar phases
 * from UTC date and time based on the J2000.0 epoch standard.
 */

export interface AstronomicalState {
  date: Date;
  daysSinceJ2000: number;
  earthOrbitAngleRad: number;
  earthPosition: [number, number, number];
  moonOrbitAngleRad: number;
  moonPosition: [number, number, number];
  moonSpinAngleRad: number;
  earthSpinAngleRad: number;
  elongationDeg: number;
  moonPhasePercent: number;
  moonPhaseName: string;
}

/** J2000.0 epoch: 2000-01-01 12:00:00 UTC in milliseconds */
export const J2000_EPOCH_MS = 946728000000;

/** Length of a day in milliseconds */
export const MS_PER_DAY = 86400000;

/** Earth orbit radius in scene units */
export const EARTH_ORBIT_RADIUS = 20.0;

/** Moon orbit radius around Earth in scene units */
export const MOON_ORBIT_RADIUS = 5.2;

/**
 * Computes the real-time celestial and orbital mechanics of Earth and Moon
 * for any given UTC timestamp in milliseconds.
 */
export function computeAstronomicalState(timestampMs: number): AstronomicalState {
  // Days elapsed since J2000.0
  const D = (timestampMs - J2000_EPOCH_MS) / MS_PER_DAY;

  // 1. Earth mean orbital longitude around the Sun (deg)
  // Period = 365.256363 days (~0.9856474 deg/day)
  const L_earth_deg = ((100.46 + 0.9856474 * D) % 360 + 360) % 360;
  const ea = (L_earth_deg * Math.PI) / 180;
  const ex = Math.sin(ea) * EARTH_ORBIT_RADIUS;
  const ez = Math.cos(ea) * EARTH_ORBIT_RADIUS;
  const ey = 0;

  // 2. Moon mean orbital longitude around Earth (deg)
  // Sidereal orbit period = 27.321661 days (~13.176396 deg/day)
  const L_moon_deg = ((218.316 + 13.176396 * D) % 360 + 360) % 360;
  const ma = (L_moon_deg * Math.PI) / 180;

  // Moon's orbital plane longitude of ascending node (deg)
  // Regresses with period of 18.61 years (~0.0529538 deg/day)
  const node_deg = ((125.044 - 0.0529538 * D) % 360 + 360) % 360;
  const node_rad = (node_deg * Math.PI) / 180;

  // Moon relative position to Earth with 5.145° orbital inclination
  const rel_mx = Math.sin(ma) * MOON_ORBIT_RADIUS;
  const rel_mz = Math.cos(ma) * MOON_ORBIT_RADIUS;
  const rel_my = Math.sin(ma - node_rad) * 0.466; // 5.2 * sin(5.145°) ≈ 0.466

  // Moon world position in solar system
  const mx = ex + rel_mx;
  const my = ey + rel_my;
  const mz = ez + rel_mz;

  // 3. Moon's axial rotation:
  // Tidally locked (synchronous rotation with orbital period ~27.32 days).
  // The Moon completes exactly one axial rotation per orbit around Earth,
  // keeping its near side facing Earth.
  const moonSpin = -ma;

  // 4. Earth's diurnal axial rotation (24h period)
  // Mean sidereal day = 86164.09 seconds
  const earthSpin = ((D * 360 * (366.25 / 365.25)) % 360) * (Math.PI / 180);

  // 5. Lunar phase (Sun-Earth-Moon elongation angle in degrees)
  const elongationDeg = ((L_moon_deg - L_earth_deg + 180) % 360 + 360) % 360;
  // Phase illumination percentage (0% = New Moon, 100% = Full Moon)
  const phaseFraction = (1 - Math.cos((elongationDeg * Math.PI) / 180)) / 2;
  const moonPhasePercent = Math.round(phaseFraction * 100);

  let moonPhaseName = 'New Moon';
  if (elongationDeg >= 22.5 && elongationDeg < 67.5) moonPhaseName = 'Waxing Crescent';
  else if (elongationDeg >= 67.5 && elongationDeg < 112.5) moonPhaseName = 'First Quarter';
  else if (elongationDeg >= 112.5 && elongationDeg < 157.5) moonPhaseName = 'Waxing Gibbous';
  else if (elongationDeg >= 157.5 && elongationDeg < 202.5) moonPhaseName = 'Full Moon';
  else if (elongationDeg >= 202.5 && elongationDeg < 247.5) moonPhaseName = 'Waning Gibbous';
  else if (elongationDeg >= 247.5 && elongationDeg < 292.5) moonPhaseName = 'Last Quarter';
  else if (elongationDeg >= 292.5 && elongationDeg < 337.5) moonPhaseName = 'Waning Crescent';

  return {
    date: new Date(timestampMs),
    daysSinceJ2000: D,
    earthOrbitAngleRad: ea,
    earthPosition: [ex, ey, ez],
    moonOrbitAngleRad: ma,
    moonPosition: [mx, my, mz],
    moonSpinAngleRad: moonSpin,
    earthSpinAngleRad: earthSpin,
    elongationDeg,
    moonPhasePercent,
    moonPhaseName,
  };
}
