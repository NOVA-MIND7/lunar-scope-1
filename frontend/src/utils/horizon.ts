/**
 * HORIZON COORDINATES
 * ===========================================================================
 *
 * Computes celestial body (Sun/Earth) elevation and azimuth relative to a
 * lunar landing site's local horizon, for a given UTC instant.
 *
 * All angles in degrees. Elevation: -90 (below horizon) to +90 (zenith).
 * Azimuth: 0 = north, 90 = east, 180 = south, 270 = west (measured clockwise
 * from north when looking toward the horizon).
 */
import type { LunarCoordinates } from '@/types';
import { surfaceTangents } from './lunarCoordinates';
import { computeAstronomicalState } from './astronomicalTime';

const RAD = 180 / Math.PI;

/** Horizon frame at a selenographic location. */
export interface HorizonFrame {
  up: [number, number, number];
  east: [number, number, number];
  north: [number, number, number];
}

/** Build the local horizon (ENU) frame at a selenographic location. */
export function horizonFrame(latDeg: number, lonDeg: number): HorizonFrame {
  const tangents = surfaceTangents(latDeg, lonDeg);
  return {
    up: [tangents.up.x, tangents.up.y, tangents.up.z],
    east: [tangents.east.x, tangents.east.y, tangents.east.z],
    north: [tangents.north.x, tangents.north.y, tangents.north.z],
  };
}

/** Dot product of two 3-vectors. */
function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Normalize a 3-vector. */
function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len === 0) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

/** Wrap angle to [-180, 180]. */
function wrap180(deg: number): number {
  let a = ((deg % 360) + 360) % 360;
  if (a > 180) a -= 360;
  return a;
}

/** Position of a celestial body relative to the Moon center, in scene units. */
export interface BodyPosition {
  name: string;
  position: [number, number, number];
}

/** Compute Sun and Earth positions relative to the Moon at a UTC instant. */
export function celestialPositions(timestampMs: number): BodyPosition[] {
  const astro = computeAstronomicalState(timestampMs);
  return [
    { name: 'Sun', position: [0, 0, 0] }, // Sun is at origin; we compute direction from Moon to Sun
    { name: 'Earth', position: astro.earthPosition },
    { name: 'Moon', position: astro.moonPosition },
  ];
}

/**
 * Direction from the Moon surface site toward the Sun.
 * The Sun is at the origin; the Moon is at moonPosition. The vector from
 * the site to the Sun is approximately -moonPosition (normalized), because
 * the Sun is very far away compared to the Earth-Moon distance.
 */
export function sunDirectionFromMoon(moonPosition: [number, number, number]): [number, number, number] {
  return normalize([-moonPosition[0], -moonPosition[1], -moonPosition[2]]);
}

/**
 * Direction from the Moon surface site toward Earth.
 * Earth position relative to Moon center.
 */
export function earthDirectionFromMoon(earthPosition: [number, number, number], moonPosition: [number, number, number]): [number, number, number] {
  return normalize([
    earthPosition[0] - moonPosition[0],
    earthPosition[1] - moonPosition[1],
    earthPosition[2] - moonPosition[2],
  ]);
}

/**
 * Compute elevation and azimuth of a direction vector in the local horizon frame.
 * Returns { elevationDeg, azimuthDeg } where azimuth is 0=north, 90=east, 180=south, 270=west.
 */
export function directionToHorizon(
  dir: [number, number, number],
  frame: HorizonFrame,
): { elevationDeg: number; azimuthDeg: number } {
  const up = dot(dir, frame.up);
  const east = dot(dir, frame.east);
  const north = dot(dir, frame.north);

  // Elevation: angle above the horizon plane
  const horizontal = Math.sqrt(east * east + north * north);
  const elevationDeg = Math.atan2(up, horizontal) * RAD;

  // Azimuth: clockwise from north
  let azimuthDeg = Math.atan2(east, north) * RAD;
  azimuthDeg = wrap180(azimuthDeg);
  if (azimuthDeg < 0) azimuthDeg += 360;

  return { elevationDeg, azimuthDeg };
}

/**
 * Full horizon computation for Sun and Earth at a landing site and UTC instant.
 */
export interface HorizonSolution {
  timestampMs: number;
  site: LunarCoordinates;
  sun: { elevationDeg: number; azimuthDeg: number; aboveHorizon: boolean };
  earth: { elevationDeg: number; azimuthDeg: number; aboveHorizon: boolean };
  moonPhase: { percent: number; name: string; elongationDeg: number };
}

export function computeHorizonSolution(
  site: LunarCoordinates,
  timestampMs: number,
): HorizonSolution {
  const frame = horizonFrame(site.latitude_deg, site.longitude_deg);
  const astro = computeAstronomicalState(timestampMs);

  const sunDir = sunDirectionFromMoon(astro.moonPosition);
  const earthDir = earthDirectionFromMoon(astro.earthPosition, astro.moonPosition);

  const sun = directionToHorizon(sunDir, frame);
  const earth = directionToHorizon(earthDir, frame);

  return {
    timestampMs,
    site,
    sun: {
      ...sun,
      aboveHorizon: sun.elevationDeg > 0,
    },
    earth: {
      ...earth,
      aboveHorizon: earth.elevationDeg > 0,
    },
    moonPhase: {
      percent: astro.moonPhasePercent,
      name: astro.moonPhaseName,
      elongationDeg: astro.elongationDeg,
    },
  };
}

/** Minutes until the Sun sets (elevation crosses 0°) assuming fixed geometry — illustrative only. */
export function minutesUntilSunset(site: LunarCoordinates, timestampMs: number): number | null {
  const sol = computeHorizonSolution(site, timestampMs);
  if (!sol.sun.aboveHorizon) return null;
  // Approximate: lunar day/night cycle is ~29.5 Earth days; sun moves ~12.2°/day across the sky.
  // This is a rough linear estimate, not an ephemeris.
  const degPerHour = 12.2 / 24;
  const hours = sol.sun.elevationDeg / degPerHour;
  return Math.max(0, Math.round(hours * 60));
}

/** Minutes until Earth sets (elevation crosses 0°) — illustrative only. */
export function minutesUntilEarthset(site: LunarCoordinates, timestampMs: number): number | null {
  const sol = computeHorizonSolution(site, timestampMs);
  if (!sol.earth.aboveHorizon) return null;
  const degPerHour = 12.2 / 24;
  const hours = sol.earth.elevationDeg / degPerHour;
  return Math.max(0, Math.round(hours * 60));
}
