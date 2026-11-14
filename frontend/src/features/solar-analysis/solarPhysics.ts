import { angularDistanceDeg, MEAN_LUNAR_RADIUS_KM } from '@/utils/lunarCoordinates';

export type SolarPanelMode = 'VERTICAL_TRACKING' | 'FLAT_HORIZONTAL';
export type DustRiskLevel =
  | 'LOW (STABLE)'
  | 'MODERATE (TERMINATOR)'
  | 'HIGH (ELECTROSTATIC LOFTING)';
export type SolarTimeStepMinutes = 15 | 30 | 60 | 120 | 360;

export interface SolarSiteProfile {
  id: string;
  name: string;
  program: string;
  lat: number;
  lon: number;
  elevationMeters: number;
  slopeDeg: number;
  waterIceDistanceKm: number;
  description: string;
  scienceValue: string;
  /** 36-point LOLA terrain horizon elevation mask in degrees (one sample every 10° azimuth). */
  terrainMask: number[];
  isCustom?: boolean;
}

export interface SolarEphemerisPoint {
  stepIndex: number;
  hourOffset: number;
  timestampMs: number;
  timestampUtc: string;
  shortLabelUtc: string;
  sunAz: number;
  sunEl: number;
  rawHorizonEl: number;
  effectiveHorizonEl: number;
  isSunlit: boolean;
  solarWatts: number;
  surfaceTempC: number;
  dustRisk: DustRiskLevel;
  dustIndex: number;
  orbitalSensorNote: string;
  subSolarLatDeg: number;
  subSolarLonDeg: number;
}

export type SolarVerdict =
  | 'GO - OPTIMAL'
  | 'GO (TERRAIN / DUST MITIGATION)'
  | 'NO-GO (POWER/THERMAL RISK)';

export interface SolarSimulationSummary {
  site: SolarSiteProfile;
  points: SolarEphemerisPoint[];
  durationHours: number;
  timeStepMinutes: SolarTimeStepMinutes;
  useTerrainHorizon: boolean;
  sunlightPercent: number;
  idealSunlightPercent: number;
  terrainShadowLossPercent: number;
  sunlitHours: number;
  darkHours: number;
  avgWatts: number;
  peakWatts: number;
  totalEnergyKwh: number;
  maxDarkHours: number;
  hoursUntilSunset: number;
  minTempC: number;
  maxTempC: number;
  highDustHours: number;
  verdict: SolarVerdict;
}

export interface SolarSimulationOptions {
  startUtc: string;
  endUtc: string;
  delayDays: number;
  timeStepMinutes: SolarTimeStepMinutes;
  useTerrainHorizon: boolean;
  panelMode: SolarPanelMode;
}

/**
 * Curated NASA/ISRO candidate and baseline landing sites with 36-point LOLA horizon masks
 * (ported from AstraRelay / PrabashanaDev/lunar-landing-navigator).
 */
export const SOLAR_PRESET_SITES: SolarSiteProfile[] = [
  {
    id: 'shackleton-rim',
    name: 'Shackleton Crater Rim',
    program: 'Artemis III / LRO Peak of Eternal Light',
    lat: -89.68,
    lon: 129.0,
    elevationMeters: 3100,
    slopeDeg: 7.2,
    waterIceDistanceKm: 0.4,
    description:
      'Located at the Lunar South Pole on the elevated rim of Shackleton Crater, overlooking a deep Permanently Shadowed Region (PSR) holding water ice.',
    scienceValue: 'Direct access to cold-trapped water ice & volatile deposits.',
    terrainMask: [
      1.2, 1.5, 2.1, 2.8, 3.4, 3.1, 2.5, 1.8, 1.2, 0.9, 1.1, 1.6,
      2.2, 2.9, 3.8, 4.2, 3.9, 3.0, 2.1, 1.5, 1.0, 0.8, 0.9, 1.3,
      1.9, 2.4, 2.8, 2.5, 2.0, 1.6, 1.3, 1.1, 1.0, 0.9, 1.0, 1.1,
    ],
  },
  {
    id: 'connecting-ridge',
    name: 'Connecting Ridge (Shackleton–de Gerlache)',
    program: 'Artemis III Candidate',
    lat: -89.5,
    lon: -138.0,
    elevationMeters: 2450,
    slopeDeg: 5.8,
    waterIceDistanceKm: 1.1,
    description:
      'Elevated ridge bridging Shackleton and de Gerlache craters. High altitude minimizes horizon blockage from neighboring massifs.',
    scienceValue: 'Long-duration solar power corridor and polar base camp candidate.',
    terrainMask: [
      0.8, 0.9, 1.2, 1.5, 1.8, 2.2, 2.5, 2.1, 1.6, 1.2, 0.9, 0.7,
      0.8, 1.1, 1.5, 1.9, 2.3, 2.0, 1.5, 1.1, 0.8, 0.6, 0.7, 0.9,
      1.2, 1.6, 1.9, 1.7, 1.3, 1.0, 0.8, 0.7, 0.6, 0.7, 0.7, 0.8,
    ],
  },
  {
    id: 'malapert-massif',
    name: 'Malapert Massif Crest',
    program: 'CLPS IM-1 Region / Artemis III',
    lat: -86.0,
    lon: 0.0,
    elevationMeters: 4800,
    slopeDeg: 6.4,
    waterIceDistanceKm: 3.5,
    description:
      'Towering ~5 km mountain ridge aligned toward Earth (0° Longitude), offering sustained grazing sunlight and direct line-of-sight.',
    scienceValue: 'Highland crust geology and premier polar illumination peak.',
    terrainMask: [
      0.4, 0.5, 0.7, 1.0, 1.4, 1.8, 2.1, 1.9, 1.5, 1.1, 0.8, 0.6,
      0.9, 1.4, 2.0, 2.6, 3.1, 2.8, 2.2, 1.6, 1.2, 0.9, 0.7, 0.6,
      0.8, 1.1, 1.4, 1.2, 0.9, 0.7, 0.5, 0.4, 0.3, 0.3, 0.4, 0.4,
    ],
  },
  {
    id: 'mons-mouton',
    name: 'Mons Mouton Plateau',
    program: 'CLPS IM-4 / VIPER Region',
    lat: -84.6,
    lon: 31.0,
    elevationMeters: 5400,
    slopeDeg: 3.2,
    waterIceDistanceKm: 2.8,
    description:
      'Massive flat-topped plateau near Nobile Crater with gentle slopes and elevated solar access.',
    scienceValue: 'Safe landing zone with ancient highland regolith and nearby cold traps.',
    terrainMask: [
      0.6, 0.8, 1.1, 1.3, 1.6, 1.9, 1.7, 1.4, 1.0, 0.8, 0.7, 0.9,
      1.3, 1.8, 2.4, 2.9, 2.7, 2.1, 1.6, 1.2, 0.9, 0.7, 0.6, 0.8,
      1.1, 1.5, 1.8, 1.6, 1.2, 0.9, 0.7, 0.6, 0.5, 0.5, 0.6, 0.6,
    ],
  },
  {
    id: 'nobile-rim-1',
    name: 'Nobile Crater Rim 1 (Deep Valley Edge)',
    program: 'Artemis III / CLPS Target',
    lat: -85.2,
    lon: 53.5,
    elevationMeters: 1650,
    slopeDeg: 9.1,
    waterIceDistanceKm: 0.6,
    description:
      'Surrounded by steep crater walls and peaks. High volatile science value, but ridges cast multi-day grazing solar shadows.',
    scienceValue: 'High concentration of subsurface hydrogen & water ice signatures.',
    terrainMask: [
      3.5, 4.2, 5.1, 5.8, 4.9, 3.8, 2.9, 2.2, 1.8, 2.4, 3.6, 4.8,
      5.5, 6.2, 5.9, 4.7, 3.5, 2.8, 2.1, 1.9, 2.5, 3.4, 4.1, 4.6,
      3.9, 3.1, 2.4, 1.8, 1.5, 1.9, 2.6, 3.2, 3.8, 4.0, 3.7, 3.4,
    ],
  },
  {
    id: 'shiv-shakti',
    name: 'Statio Shiv Shakti (Chandrayaan-3)',
    program: 'ISRO Chandrayaan-3 (Mid-Polar)',
    lat: -69.37,
    lon: 32.32,
    elevationMeters: 600,
    slopeDeg: 4.5,
    waterIceDistanceKm: 45.0,
    description:
      'Mid-polar baseline at ~69.4°S experiencing ~14 Earth days of sunlight followed by ~14 Earth days of lunar night.',
    scienceValue: 'Proven mid-polar touchdown baseline for day/night thermal cycling.',
    terrainMask: [
      0.5, 0.6, 0.8, 1.0, 1.1, 0.9, 0.7, 0.5, 0.4, 0.5, 0.7, 0.9,
      1.2, 1.4, 1.3, 1.0, 0.8, 0.6, 0.5, 0.4, 0.5, 0.7, 0.9, 1.1,
      1.0, 0.8, 0.6, 0.5, 0.4, 0.4, 0.5, 0.6, 0.6, 0.5, 0.5, 0.5,
    ],
  },
  {
    id: 'apollo-11',
    name: 'Tranquility Base (Apollo 11 Baseline)',
    program: 'NASA Apollo 11 (Equatorial Reference)',
    lat: 0.67,
    lon: 23.47,
    elevationMeters: -1900,
    slopeDeg: 1.4,
    waterIceDistanceKm: 2600.0,
    description:
      'Equatorial baseline site where the Sun climbs nearly overhead (~90°) for 14 days before setting for 14 days.',
    scienceValue: 'Equatorial mare baseline for contrasting grazing polar illumination.',
    terrainMask: new Array<number>(36).fill(0.2),
  },
];

/** Generate a deterministic 36-point horizon mask for any arbitrary globe coordinate. */
export function buildProceduralTerrainMask(latDeg: number, lonDeg: number): number[] {
  const absLat = Math.abs(latDeg);
  const polarFactor = absLat >= 80 ? 1.0 : absLat >= 60 ? 0.55 : 0.25;
  return Array.from({ length: 36 }, (_, i) => {
    const wave =
      1.35 +
      1.05 * Math.sin((i * Math.PI) / 9 + lonDeg * 0.05) +
      0.55 * Math.cos((i * Math.PI) / 6 + latDeg * 0.12);
    return Number(Math.max(0.2, wave * polarFactor).toFixed(2));
  });
}

/** Build a SolarSiteProfile from any clicked or entered lunar coordinates. */
export function buildCustomSolarSite(
  id: string,
  label: string,
  latDeg: number,
  lonDeg: number,
  elevationMeters = 2200,
): SolarSiteProfile {
  const clampedLat = Math.max(-90, Math.min(90, Number(latDeg.toFixed(4))));
  const normLon = Number(((((lonDeg + 180) % 360) + 360) % 360 - 180).toFixed(4));
  const absLat = Math.abs(clampedLat);
  return {
    id,
    name: `${label} (${clampedLat.toFixed(2)}°, ${normLon.toFixed(2)}°)`,
    program: 'Globe Coordinate Selection',
    lat: clampedLat,
    lon: normLon,
    elevationMeters,
    slopeDeg: absLat > 80 ? 6.5 : 3.2,
    waterIceDistanceKm: absLat > 82 ? 1.5 : 420.0,
    description: 'User-selected lunar surface coordinate evaluated with synodic solar ephemeris and regional terrain mask.',
    scienceValue: 'Custom coordinate solar illumination & thermal trade-off.',
    terrainMask: buildProceduralTerrainMask(clampedLat, normLon),
    isCustom: true,
  };
}

/** Interpolate the 36-point LOLA terrain horizon mask for any compass azimuth (0–360°). */
export function getTerrainElevationAtAzimuth(terrainMask: number[], azimuthDeg: number): number {
  if (terrainMask.length === 0) return 0;
  const normAz = ((azimuthDeg % 360) + 360) % 360;
  const exactIndex = normAz / 10;
  const idx0 = Math.floor(exactIndex) % terrainMask.length;
  const idx1 = (idx0 + 1) % terrainMask.length;
  const frac = exactIndex - Math.floor(exactIndex);
  const v0 = terrainMask[idx0] ?? 0;
  const v1 = terrainMask[idx1] ?? 0;
  return v0 * (1 - frac) + v1 * frac;
}

/** Compute instantaneous lunar sub-solar lat/lon (deg) at UTC epoch ms. */
export function computeSubSolarPoint(dateMs: number): { subSolarLatDeg: number; subSolarLonDeg: number } {
  const daysSinceJ2000 = (dateMs - Date.UTC(2000, 0, 1, 12, 0, 0)) / 86400000;
  const rawLon = ((360 / 29.530589) * daysSinceJ2000) % 360;
  const subSolarLonDeg = ((rawLon + 540) % 360) - 180;
  const subSolarLatDeg = 1.5424 * Math.sin(((2 * Math.PI) / 346.62) * daysSinceJ2000);
  return { subSolarLatDeg, subSolarLonDeg };
}

/** Compute instantaneous Sun position, power output, temperature, and dust lofting at a site. */
export function computeSolarPoint(
  site: SolarSiteProfile,
  dateMs: number,
  stepIndex: number,
  hourOffset: number,
  useTerrainHorizon: boolean,
  panelMode: SolarPanelMode,
): SolarEphemerisPoint {
  const deg2rad = Math.PI / 180;
  const rad2deg = 180 / Math.PI;
  const latRad = site.lat * deg2rad;

  const { subSolarLatDeg, subSolarLonDeg } = computeSubSolarPoint(dateMs);

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

  const rawHorizonEl = getTerrainElevationAtAzimuth(site.terrainMask, sunAz);
  const effectiveHorizonEl = useTerrainHorizon ? rawHorizonEl : 0;
  const isSunlit = sunEl > effectiveHorizonEl;

  // 400 W peak solar array
  let solarWatts = 0;
  if (isSunlit) {
    const clampedElRad = Math.max(0.5, sunEl) * deg2rad;
    solarWatts =
      panelMode === 'VERTICAL_TRACKING'
        ? Math.round(400 * Math.cos(clampedElRad))
        : Math.round(400 * Math.sin(clampedElRad));
  }

  // Electrostatic dust lofting model near terminator crossings (±0.65° of effective horizon)
  const sunAngleFromRidge = sunEl - effectiveHorizonEl;
  const isTerminatorCrossing = Math.abs(sunAngleFromRidge) <= 0.65;
  const dustIndex = isTerminatorCrossing
    ? Math.round(75 + (0.65 - Math.abs(sunAngleFromRidge)) * 38)
    : Math.abs(sunAngleFromRidge) <= 1.3
      ? 48
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

  const surfaceTempC = isSunlit ? Math.round(-25 + Math.max(0, sunEl) * 4.5) : -165;

  const orbitalSensorNote =
    dustIndex >= 75
      ? 'Terminator electrostatic dust cloud active (~18% array attenuation).'
      : !isSunlit
        ? 'Shadow cooling active; thermal survival heaters required.'
        : 'Nominal solar illumination & stable regolith thermal equilibrium.';

  const iso = new Date(dateMs).toISOString();

  return {
    stepIndex,
    hourOffset: Number(hourOffset.toFixed(2)),
    timestampMs: dateMs,
    timestampUtc: `${iso.slice(0, 16).replace('T', ' ')} UTC`,
    shortLabelUtc: `${iso.slice(5, 10)} ${iso.slice(11, 16)}`,
    sunAz: Number(sunAz.toFixed(1)),
    sunEl: Number(sunEl.toFixed(2)),
    rawHorizonEl: Number(rawHorizonEl.toFixed(2)),
    effectiveHorizonEl: Number(effectiveHorizonEl.toFixed(2)),
    isSunlit,
    solarWatts,
    surfaceTempC,
    dustRisk,
    dustIndex,
    orbitalSensorNote,
    subSolarLatDeg,
    subSolarLonDeg,
  };
}

/** Run solar simulation across [startUtc + delayDays, endUtc + delayDays] at the chosen time step. */
export function simulateSolarWindow(
  site: SolarSiteProfile,
  options: SolarSimulationOptions,
): SolarSimulationSummary {
  const stepMs = options.timeStepMinutes * 60_000;
  const stepHours = options.timeStepMinutes / 60;
  const delayMs = options.delayDays * 86_400_000;

  const parsedStart = Date.parse(options.startUtc);
  const parsedEnd = Date.parse(options.endUtc);
  const baseStartMs = (Number.isFinite(parsedStart) ? parsedStart : Date.UTC(2027, 0, 1, 0, 0, 0)) + delayMs;
  const rawEndMs = (Number.isFinite(parsedEnd) ? parsedEnd : baseStartMs + 14 * 86_400_000) + delayMs;
  const clampedEndMs = Math.max(baseStartMs + stepMs, Math.min(baseStartMs + 45 * 86_400_000, rawEndMs));

  const points: SolarEphemerisPoint[] = [];
  let sunlitCount = 0;
  let idealSunlitCount = 0;
  let totalWatts = 0;
  let peakWatts = 0;
  let currentDarkStreakHrs = 0;
  let maxDarkHours = 0;
  let minTempC = 200;
  let maxTempC = -273;
  let highDustHours = 0;

  let idx = 0;
  for (let ms = baseStartMs; ms <= clampedEndMs + 1; ms += stepMs) {
    const hourOffset = (ms - baseStartMs) / 3_600_000;
    const pt = computeSolarPoint(
      site,
      ms,
      idx,
      hourOffset,
      options.useTerrainHorizon,
      options.panelMode,
    );

    if (pt.sunEl > 0) idealSunlitCount++;

    if (pt.isSunlit) {
      sunlitCount++;
      currentDarkStreakHrs = 0;
    } else {
      currentDarkStreakHrs += stepHours;
      if (currentDarkStreakHrs > maxDarkHours) maxDarkHours = currentDarkStreakHrs;
      pt.surfaceTempC = Math.round(-225 + 65 * Math.exp(-currentDarkStreakHrs / 18));
    }

    if (pt.surfaceTempC < minTempC) minTempC = pt.surfaceTempC;
    if (pt.surfaceTempC > maxTempC) maxTempC = pt.surfaceTempC;
    if (pt.dustIndex >= 75) highDustHours += stepHours;
    if (pt.solarWatts > peakWatts) peakWatts = pt.solarWatts;

    totalWatts += pt.solarWatts;
    points.push(pt);
    idx++;
    if (points.length >= 1500) break;
  }

  const totalSteps = Math.max(1, points.length);
  const durationHours = Number(((totalSteps * stepHours)).toFixed(1));
  const sunlightPercent = Math.round((sunlitCount / totalSteps) * 100);
  const idealSunlightPercent = Math.round((idealSunlitCount / totalSteps) * 100);
  const terrainShadowLossPercent = options.useTerrainHorizon
    ? Math.max(0, idealSunlightPercent - sunlightPercent)
    : 0;
  const sunlitHours = Number((sunlitCount * stepHours).toFixed(1));
  const darkHours = Number(((totalSteps - sunlitCount) * stepHours).toFixed(1));
  const avgWatts = Math.round(totalWatts / totalSteps);
  const totalEnergyKwh = Number(((totalWatts * stepHours) / 1000).toFixed(1));

  let hoursUntilSunset = 0;
  for (const p of points) {
    if (p.isSunlit) hoursUntilSunset += stepHours;
    else break;
  }

  let verdict: SolarVerdict = 'GO - OPTIMAL';
  if (sunlightPercent < 65 || maxDarkHours > 50 || minTempC < -215) {
    verdict = 'NO-GO (POWER/THERMAL RISK)';
  } else if (highDustHours >= 12 || terrainShadowLossPercent >= 10) {
    verdict = 'GO (TERRAIN / DUST MITIGATION)';
  }

  return {
    site,
    points,
    durationHours,
    timeStepMinutes: options.timeStepMinutes,
    useTerrainHorizon: options.useTerrainHorizon,
    sunlightPercent,
    idealSunlightPercent,
    terrainShadowLossPercent,
    sunlitHours,
    darkHours,
    avgWatts,
    peakWatts,
    totalEnergyKwh,
    maxDarkHours: Number(maxDarkHours.toFixed(1)),
    hoursUntilSunset: Number(hoursUntilSunset.toFixed(1)),
    minTempC,
    maxTempC,
    highDustHours: Number(highDustHours.toFixed(1)),
    verdict,
  };
}

/** Scan +0..+29 days to recommend the launch/deployment delay with optimal sunlight for Site A. */
export function findBestSolarWindowDelay(
  site: SolarSiteProfile,
  options: Omit<SolarSimulationOptions, 'delayDays'>,
): { bestDelayDays: number; bestScore: number; summary: SolarSimulationSummary } {
  let bestDelayDays = 0;
  let bestScore = -9999;
  let bestSummary = simulateSolarWindow(site, { ...options, delayDays: 0 });

  for (let d = 0; d <= 29; d++) {
    const sim = simulateSolarWindow(site, { ...options, delayDays: d });
    const touchdownSunBonus = sim.points[0]?.isSunlit ? 15 : -15;
    const score =
      sim.sunlightPercent * 0.75 +
      (sim.avgWatts / 400) * 20 -
      sim.maxDarkHours * 0.45 +
      touchdownSunBonus;

    if (score > bestScore) {
      bestScore = score;
      bestDelayDays = d;
      bestSummary = sim;
    }
  }

  return { bestDelayDays, bestScore: Math.round(bestScore), summary: bestSummary };
}

/** Compute surface great-circle separation in degrees and km between two sites. */
export function computeSiteSeparation(
  siteA: SolarSiteProfile,
  siteB: SolarSiteProfile,
): { angleDeg: number; distanceKm: number } {
  const angleDeg = angularDistanceDeg(
    { latitude_deg: siteA.lat, longitude_deg: siteA.lon },
    { latitude_deg: siteB.lat, longitude_deg: siteB.lon },
  );
  const distanceKm = angleDeg * (Math.PI / 180) * MEAN_LUNAR_RADIUS_KM;
  return {
    angleDeg: Number(angleDeg.toFixed(1)),
    distanceKm: Math.round(distanceKm),
  };
}
