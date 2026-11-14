import type { LandingSite } from '../data/landingSites';

export type CommsMode = 'DTE_ONLY' | 'LLO_MOTHERSHIP' | 'NRHO_CONSTELLATION';
export type SolarPanelMode = 'VERTICAL_TRACKING' | 'FLAT_HORIZONTAL';
export type DustRiskLevel = 'LOW (STABLE)' | 'MODERATE (TERMINATOR)' | 'HIGH (ELECTROSTATIC LOFTING)';

export interface EphemerisPoint {
  hourOffset: number;
  timestamp: string;
  sunAz: number;
  sunEl: number;
  sunTerrainEl: number;
  isSunlit: boolean;
  earthAz: number;
  earthEl: number;
  earthTerrainEl: number;
  hasDirectEarth: boolean;
  hasOrbitalRelay: boolean;
  commsActive: boolean;
  solarWatts: number;
  surfaceTempC: number;
  dustRisk: DustRiskLevel;
  dustIndex: number; // 0 to 100 scale
  orbitalSensorNote: string;
}

export interface MissionSummary {
  points: EphemerisPoint[];
  sunlightPercent: number;
  dtePercent: number;
  effectiveCommsPercent: number;
  avgWatts: number;
  maxDarkHours: number;
  hoursUntilSunset: number;
  hoursUntilEarthset: number;
  minTempC: number;
  maxTempC: number;
  highDustHours: number;
  verdict: 'GO - OPTIMAL' | 'GO WITH ORBITAL RELAY' | 'NO-GO (POWER/THERMAL RISK)';
}

// Interpolate the 36-point LOLA terrain horizon mask for any compass azimuth (0-360°)
export function getTerrainElevationAtAzimuth(terrainMask: number[], azimuthDeg: number): number {
  const normAz = ((azimuthDeg % 360) + 360) % 360;
  const exactIndex = normAz / 10;
  const idx0 = Math.floor(exactIndex) % 36;
  const idx1 = (idx0 + 1) % 36;
  const frac = exactIndex - Math.floor(exactIndex);
  return terrainMask[idx0] * (1 - frac) + terrainMask[idx1] * frac;
}

// Compute Sun and Earth sky positions, surface temperature, and electrostatic dust lofting
export function computeSkyPositions(
  site: LandingSite,
  dateMs: number,
  commsMode: CommsMode,
  panelMode: SolarPanelMode,
  hourOffset: number
): EphemerisPoint {
  const daysSinceJ2000 = (dateMs - Date.UTC(2000, 0, 1, 12, 0, 0)) / 86400000;
  const deg2rad = Math.PI / 180;
  const rad2deg = 180 / Math.PI;

  const latRad = site.lat * deg2rad;

  // 1. Lunar Solar Ephemeris (Synodic period = 29.53059 days, Axial tilt to ecliptic = 1.5424°)
  const subSolarLonDeg = ((360 / 29.530589) * daysSinceJ2000) % 360;
  const subSolarLatDeg = 1.5424 * Math.sin(((2 * Math.PI) / 346.62) * daysSinceJ2000);

  const hourAngleRad = (site.lon - subSolarLonDeg) * deg2rad;
  const decRad = subSolarLatDeg * deg2rad;

  const sinSunEl =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngleRad);
  const altitudeDipDeg = 0.032 * Math.sqrt(Math.max(0, site.elevationMeters));
  const sunEl = Math.asin(Math.max(-1, Math.min(1, sinSunEl))) * rad2deg + altitudeDipDeg * 0.35;

  const ySun = -Math.sin(hourAngleRad) * Math.cos(decRad);
  const xSun =
    Math.cos(latRad) * Math.sin(decRad) -
    Math.sin(latRad) * Math.cos(decRad) * Math.cos(hourAngleRad);
  const sunAz = ((Math.atan2(ySun, xSun) * rad2deg) % 360 + 360) % 360;

  // 2. Earth Ephemeris with 27.3-day Lunar Libration Wobble (±6.68° lat, ±7.9° lon)
  const librationLatDeg = -6.68 * Math.sin(((2 * Math.PI) / 27.2122) * daysSinceJ2000);
  const librationLonDeg = 7.9 * Math.sin(((2 * Math.PI) / 27.5545) * daysSinceJ2000 + 0.8);

  const earthHourAngleRad = (site.lon - librationLonDeg) * deg2rad;
  const earthDecRad = librationLatDeg * deg2rad;

  const sinEarthEl =
    Math.sin(latRad) * Math.sin(earthDecRad) +
    Math.cos(latRad) * Math.cos(earthDecRad) * Math.cos(earthHourAngleRad);
  const earthEl = Math.asin(Math.max(-1, Math.min(1, sinEarthEl))) * rad2deg + altitudeDipDeg * 0.25;

  const yEarth = -Math.sin(earthHourAngleRad) * Math.cos(earthDecRad);
  const xEarth =
    Math.cos(latRad) * Math.sin(earthDecRad) -
    Math.sin(latRad) * Math.cos(earthDecRad) * Math.cos(earthHourAngleRad);
  const earthAz = ((Math.atan2(yEarth, xEarth) * rad2deg) % 360 + 360) % 360;

  // 3. Terrain Horizon Mask Check
  const sunTerrainEl = getTerrainElevationAtAzimuth(site.terrainMask, sunAz);
  const earthTerrainEl = getTerrainElevationAtAzimuth(site.terrainMask, earthAz);

  const isSunlit = sunEl > sunTerrainEl;
  const hasDirectEarth = earthEl > earthTerrainEl + 1.0;

  // 4. Orbital Mothership & Relay Satellite Coverage
  let hasOrbitalRelay = false;
  if (commsMode === 'LLO_MOTHERSHIP') {
    hasOrbitalRelay = hourOffset % 2 === 0;
  } else if (commsMode === 'NRHO_CONSTELLATION') {
    hasOrbitalRelay = true;
  }

  const commsActive = hasDirectEarth || hasOrbitalRelay;

  // 5. Solar Power Generation (400W Peak Array)
  let solarWatts = 0;
  if (isSunlit) {
    const clampedElRad = Math.max(0.5, sunEl) * deg2rad;
    if (panelMode === 'VERTICAL_TRACKING') {
      solarWatts = Math.round(400 * Math.cos(clampedElRad));
    } else {
      solarWatts = Math.round(400 * Math.sin(clampedElRad));
    }
  }

  // 6. Electrostatic Dust Lofting Model (Terminator UV Charging + Solar/Comms Impact)
  const sunAngleFromRidge = sunEl - sunTerrainEl;
  const isTerminatorCrossing = Math.abs(sunAngleFromRidge) <= 2.2;
  const dustIndex = isTerminatorCrossing
    ? Math.round(72 + (2.2 - Math.abs(sunAngleFromRidge)) * 12)
    : isSunlit
    ? 18
    : 12;

  const dustRisk: DustRiskLevel =
    dustIndex >= 75
      ? 'HIGH (ELECTROSTATIC LOFTING)'
      : dustIndex >= 40
      ? 'MODERATE (TERMINATOR)'
      : 'LOW (STABLE)';

  if (dustIndex >= 75 && solarWatts > 0) {
    solarWatts = Math.round(solarWatts * 0.82);
  }

  // 7. Instantaneous Surface Temperature (°C) & Orbiter Sensor Telemetry
  const surfaceTempC = isSunlit ? Math.round(-25 + Math.max(0, sunEl) * 4.5) : -165;

  const orbitalSensorNote =
    dustIndex >= 75
      ? 'LADEE-class Orbiter Alert: Terminator electrostatic dust cloud detected; Optical/Ka-Band scatter risk.'
      : !isSunlit
      ? 'IR Radiometer Alert: Rapid regolith cooling in ridge shadow; survival heaters active.'
      : 'Nominal: Clear regolith surface & stable thermal equilibrium.';

  return {
    hourOffset,
    timestamp: new Date(dateMs).toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    sunAz: Number(sunAz.toFixed(1)),
    sunEl: Number(sunEl.toFixed(2)),
    sunTerrainEl: Number(sunTerrainEl.toFixed(2)),
    isSunlit,
    earthAz: Number(earthAz.toFixed(1)),
    earthEl: Number(earthEl.toFixed(2)),
    earthTerrainEl: Number(earthTerrainEl.toFixed(2)),
    hasDirectEarth,
    hasOrbitalRelay,
    commsActive,
    solarWatts,
    surfaceTempC,
    dustRisk,
    dustIndex,
    orbitalSensorNote,
  };
}

// Simulate a full 14-day (336-hour) surface mission window
export function simulateMissionWindow(
  site: LandingSite,
  startDateIso: string,
  delayDays: number,
  commsMode: CommsMode,
  panelMode: SolarPanelMode,
  durationHours = 336
): MissionSummary {
  const baseStartMs = new Date(startDateIso).getTime() + delayDays * 86400000;
  const points: EphemerisPoint[] = [];

  let sunlitCount = 0;
  let dteCount = 0;
  let commsCount = 0;
  let totalWatts = 0;
  let currentDarkStreak = 0;
  let maxDarkHours = 0;
  let minTempC = 100;
  let maxTempC = -273;
  let highDustHours = 0;

  for (let h = 0; h < durationHours; h += 2) {
    const pt = computeSkyPositions(site, baseStartMs + h * 3600000, commsMode, panelMode, h);

    if (pt.isSunlit) {
      sunlitCount++;
      currentDarkStreak = 0;
    } else {
      currentDarkStreak += 2;
      if (currentDarkStreak > maxDarkHours) maxDarkHours = currentDarkStreak;
      pt.surfaceTempC = Math.round(-225 + 65 * Math.exp(-currentDarkStreak / 18));
    }

    if (pt.surfaceTempC < minTempC) minTempC = pt.surfaceTempC;
    if (pt.surfaceTempC > maxTempC) maxTempC = pt.surfaceTempC;
    if (pt.dustIndex >= 75) highDustHours += 2;

    points.push(pt);
    if (pt.hasDirectEarth) dteCount++;
    if (pt.commsActive) commsCount++;
    totalWatts += pt.solarWatts;
  }

  const totalSteps = points.length;
  const sunlightPercent = Math.round((sunlitCount / totalSteps) * 100);
  const dtePercent = Math.round((dteCount / totalSteps) * 100);
  const effectiveCommsPercent = Math.round((commsCount / totalSteps) * 100);
  const avgWatts = Math.round(totalWatts / totalSteps);

  let hoursUntilSunset = 0;
  for (const p of points) {
    if (p.isSunlit) hoursUntilSunset += 2;
    else break;
  }
  let hoursUntilEarthset = 0;
  for (const p of points) {
    if (p.hasDirectEarth) hoursUntilEarthset += 2;
    else break;
  }

  let verdict: MissionSummary['verdict'] = 'GO - OPTIMAL';
  if (sunlightPercent < 65 || maxDarkHours > 50) {
    verdict = 'NO-GO (POWER/THERMAL RISK)';
  } else if (dtePercent < 60) {
    verdict = 'GO WITH ORBITAL RELAY';
  }

  return {
    points,
    sunlightPercent,
    dtePercent,
    effectiveCommsPercent,
    avgWatts,
    maxDarkHours,
    hoursUntilSunset,
    hoursUntilEarthset,
    minTempC,
    maxTempC,
    highDustHours,
    verdict,
  };
}

// Orbital Mothership Release Optimizer: Scans next 30 days to find best undocking day
export function findBestOrbitalReleaseDelay(
  site: LandingSite,
  startDateIso: string,
  commsMode: CommsMode,
  panelMode: SolarPanelMode
): { bestDelayDays: number; bestScore: number; summary: MissionSummary } {
  let bestDelayDays = 0;
  let bestScore = -1;
  let bestSummary = simulateMissionWindow(site, startDateIso, 0, commsMode, panelMode);

  for (let d = 0; d <= 29; d++) {
    const sim = simulateMissionWindow(site, startDateIso, d, commsMode, panelMode);
    const score = sim.sunlightPercent * 0.65 + sim.effectiveCommsPercent * 0.35 - sim.maxDarkHours * 0.5;
    if (score > bestScore) {
      bestScore = score;
      bestDelayDays = d;
      bestSummary = sim;
    }
  }

  return { bestDelayDays, bestScore: Math.round(bestScore), summary: bestSummary };
}