import { angularDistanceDeg, MEAN_LUNAR_RADIUS_KM } from '@/utils/lunarCoordinates';

export type CommsMode = 'DTE_ONLY' | 'LLO_MOTHERSHIP' | 'NRHO_CONSTELLATION';
export type SolarPanelMode = 'VERTICAL_TRACKING' | 'FLAT_HORIZONTAL';
export type DustRiskLevel =
  | 'LOW (STABLE)'
  | 'MODERATE (TERMINATOR)'
  | 'HIGH (ELECTROSTATIC LOFTING)';

export type MissionVerdict =
  | 'GO - OPTIMAL'
  | 'GO WITH ORBITAL RELAY'
  | 'GO (DUST / RELAY MITIGATION)'
  | 'NO-GO (COMMS BLACKOUT)'
  | 'NO-GO (POWER/THERMAL RISK)';

export interface ComparisonSite {
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
  terrainMask: number[];
  isCustom?: boolean;
}

export interface ComparisonEphemerisPoint {
  hourOffset: number;
  timestampUtc: string;
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
  dustIndex: number;
  earthMoonDistanceKm: number;
  oneWayLightTimeSec: number;
  roundTripLatencySec: number;
  dtnQueueWaitMin: number;
  downlinkRateMbps: number;
}

export interface SuitabilityBreakdown {
  solarPowerScore: number; // 0..100
  commsScore: number; // 0..100
  landingSafetyScore: number; // 0..100
  thermalSurvivalScore: number; // 0..100
  scienceAccessScore: number; // 0..100
  overallScore: number; // 0..100
}

export interface ScenarioEvaluation {
  site: ComparisonSite;
  landingUtc: string;
  effectiveStartUtc: string;
  durationDays: number;
  delayDays: number;
  commsMode: CommsMode;
  points: ComparisonEphemerisPoint[];
  sunlightPercent: number;
  dtePercent: number;
  effectiveCommsPercent: number;
  avgWatts: number;
  totalEnergyKwh: number;
  maxDarkHours: number;
  hoursUntilSunset: number;
  hoursUntilEarthset: number;
  minTempC: number;
  maxTempC: number;
  highDustHours: number;
  totalCommsHours: number;
  maxCommsBlackoutHours: number;
  avgRoundTripLatencySec: number;
  avgEarthDistanceKm: number;
  verdict: MissionVerdict;
  suitability: SuitabilityBreakdown;
}

export interface DurationCandidateScore {
  durationDays: number;
  sunlightPercent: number;
  effectiveCommsPercent: number;
  maxDarkHours: number;
  overallScore: number;
  verdict: MissionVerdict;
}

export interface SiteAndDurationRecommendation {
  recommendedPlace: 'A' | 'B';
  recommendedSite: ComparisonSite;
  winnerScore: number;
  runnerUpScore: number;
  scoreMargin: number;
  recommendedDurationDays: number;
  recommendedDelayDays: number;
  recommendedScore: number;
  recommendedLandingUtc: string;
  recommendedSummary: ScenarioEvaluation;
  bestWindowDurationDays: number;
  durationCandidates: DurationCandidateScore[];
  reasons: string[];
  tradeOffNote: string;
}

/**
 * Curated NASA/ISRO candidate and baseline landing sites from PrabashanaDev/lunar-landing-navigator.
 */
export const PRESET_COMPARISON_SITES: ComparisonSite[] = [
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
      'Located right at the Lunar South Pole on the elevated rim of Shackleton Crater, overlooking a deep Permanently Shadowed Region (PSR) holding water ice.',
    scienceValue: 'Direct access to ancient cold-trapped water ice & volatile deposits.',
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
    scienceValue: 'Ideal long-duration solar power station and lunar base camp location.',
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
      'Towering ~5 km mountain ridge aligned toward Earth (0° Longitude), acting as a natural radio tower for Direct-to-Earth (DTE) communication.',
    scienceValue: 'Highland crust geology and premier Direct-to-Earth relay station.',
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
      'Massive flat-topped mountain plateau near Nobile Crater. Its gentle 3.2° slope makes landing and rover driving much safer.',
    scienceValue: 'Safe landing zone with ancient lunar rocks and nearby cold traps.',
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
      'Surrounded by rugged crater walls and high peaks. High scientific reward for volatile hunting, but steep horizon ridges block low-angle Sun and DTE radio.',
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
    program: 'ISRO Chandrayaan-3 (Historical South Polar)',
    lat: -69.37,
    lon: 32.32,
    elevationMeters: 600,
    slopeDeg: 4.5,
    waterIceDistanceKm: 45.0,
    description:
      'Historical 2023 landing site at ~70°S. Experiences ~14 Earth days of sunlight followed by ~14 Earth days of freezing lunar night.',
    scienceValue: 'Proven mid-polar plains touchdown baseline with High DTE visibility.',
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
      'Equatorial baseline site where the Sun climbs nearly overhead (~90°) for 14 days and Earth hangs high at ~66° elevation.',
    scienceValue: 'Equatorial mare basalt baseline for comparing polar extremes.',
    terrainMask: new Array<number>(36).fill(0.2),
  },
];

export function buildCustomComparisonSite(
  id: string,
  name: string,
  latDeg: number,
  lonDeg: number,
  elevationMeters = 2200,
  slopeDeg = 6.2,
  waterIceDistanceKm?: number,
): ComparisonSite {
  const lat = Math.max(-90, Math.min(90, Number(latDeg.toFixed(4))));
  const lon = Number(((((lonDeg + 180) % 360) + 360) % 360 - 180).toFixed(4));
  const absLat = Math.abs(lat);
  const polarFactor = absLat >= 80 ? 1.0 : absLat >= 60 ? 0.55 : 0.25;
  const estIceDist =
    waterIceDistanceKm ??
    (absLat >= 85 ? 1.4 : absLat >= 75 ? 12.0 : absLat >= 60 ? 65.0 : Math.round((90 - absLat) * 30));

  return {
    id,
    name: name.trim() ? name : `Custom Site (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
    program: 'Custom Coordinate Target',
    lat,
    lon,
    elevationMeters,
    slopeDeg,
    waterIceDistanceKm: estIceDist,
    description: 'User-defined lunar surface target evaluated with JPL-style synodic geometry & regional terrain mask.',
    scienceValue: absLat >= 80 ? 'Polar volatile exploration target.' : 'Regional surface science target.',
    terrainMask: Array.from({ length: 36 }, (_, i) =>
      Number(
        Math.max(
          0.2,
          (1.35 + 1.15 * Math.sin((i * Math.PI) / 9 + lon * 0.05) + 0.45 * Math.cos((i * Math.PI) / 6 + lat * 0.1)) *
            polarFactor,
        ).toFixed(2),
      ),
    ),
    isCustom: true,
  };
}

function getTerrainElevationAtAzimuth(terrainMask: number[], azimuthDeg: number): number {
  if (terrainMask.length === 0) return 0;
  const normAz = ((azimuthDeg % 360) + 360) % 360;
  const exactIndex = normAz / 10;
  const idx0 = Math.floor(exactIndex) % terrainMask.length;
  const idx1 = (idx0 + 1) % terrainMask.length;
  const frac = exactIndex - Math.floor(exactIndex);
  return (terrainMask[idx0] ?? 0) * (1 - frac) + (terrainMask[idx1] ?? 0) * frac;
}

function computeSkyPoint(
  site: ComparisonSite,
  dateMs: number,
  commsMode: CommsMode,
  panelMode: SolarPanelMode,
  hourOffset: number,
): ComparisonEphemerisPoint {
  const daysSinceJ2000 = (dateMs - Date.UTC(2000, 0, 1, 12, 0, 0)) / 86400000;
  const deg2rad = Math.PI / 180;
  const rad2deg = 180 / Math.PI;
  const latRad = site.lat * deg2rad;

  // 1. Lunar Solar Ephemeris (Synodic period = 29.530589 days, Axial tilt = 1.5424°)
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

  // 4. Orbital Relay Coverage (steps increment by 2h, so odd/even 2h slots alternate LLO passes)
  let hasOrbitalRelay = false;
  if (commsMode === 'LLO_MOTHERSHIP') {
    hasOrbitalRelay = Math.floor(hourOffset / 2) % 2 === 0;
  } else if (commsMode === 'NRHO_CONSTELLATION') {
    hasOrbitalRelay = true;
  }
  const commsActive = hasDirectEarth || hasOrbitalRelay;

  // 5. Solar Power Generation (400W Peak Array)
  let solarWatts = 0;
  if (isSunlit) {
    const clampedElRad = Math.max(0.5, sunEl) * deg2rad;
    solarWatts =
      panelMode === 'VERTICAL_TRACKING'
        ? Math.round(400 * Math.cos(clampedElRad))
        : Math.round(400 * Math.sin(clampedElRad));
  }

  // 6. Electrostatic Dust Lofting Model
  const sunAngleFromRidge = sunEl - sunTerrainEl;
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

  // 7. Earth-Moon Distance & Speed-of-Light Latency
  const moonMeanAnomalyRad = ((134.963 + 13.064993 * daysSinceJ2000) % 360) * deg2rad;
  const earthMoonDistanceKm = Math.round(385000 - 20905 * Math.cos(moonMeanAnomalyRad));
  const oneWayLightTimeSec = Number((earthMoonDistanceKm / 299792.458).toFixed(2));

  let roundTripLatencySec = 0;
  let dtnQueueWaitMin = 0;
  if (hasDirectEarth) {
    roundTripLatencySec = Number((oneWayLightTimeSec * 2 + 0.08).toFixed(2));
  } else if (commsMode === 'NRHO_CONSTELLATION') {
    roundTripLatencySec = Number((oneWayLightTimeSec * 2 + 0.45).toFixed(2));
  } else if (commsMode === 'LLO_MOTHERSHIP') {
    if (hasOrbitalRelay) {
      roundTripLatencySec = Number((oneWayLightTimeSec * 2 + 0.25).toFixed(2));
    } else {
      dtnQueueWaitMin = 59;
    }
  }

  let downlinkRateMbps = 0;
  if (commsActive) {
    if (dustIndex >= 75) {
      downlinkRateMbps = hasDirectEarth ? 2 : 10;
    } else {
      downlinkRateMbps = hasDirectEarth
        ? 50
        : commsMode === 'NRHO_CONSTELLATION'
          ? 150
          : 250;
    }
  }

  return {
    hourOffset,
    timestampUtc: `${new Date(dateMs).toISOString().slice(0, 16).replace('T', ' ')} UTC`,
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
    earthMoonDistanceKm,
    oneWayLightTimeSec,
    roundTripLatencySec,
    dtnQueueWaitMin,
    downlinkRateMbps,
  };
}

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function evaluateMissionScenario(
  site: ComparisonSite,
  landingUtc: string,
  durationDays: number,
  delayDays = 0,
  commsMode: CommsMode = 'LLO_MOTHERSHIP',
  panelMode: SolarPanelMode = 'VERTICAL_TRACKING',
): ScenarioEvaluation {
  const clampedDays = Math.max(1, Math.min(45, Math.round(durationDays)));
  const durationHours = clampedDays * 24;
  const parsedMs = Date.parse(landingUtc);
  const startMs = (Number.isFinite(parsedMs) ? parsedMs : Date.UTC(2027, 0, 1, 0, 0, 0)) + delayDays * 86_400_000;
  const points: ComparisonEphemerisPoint[] = [];

  let sunlitCount = 0;
  let dteCount = 0;
  let commsCount = 0;
  let totalWatts = 0;
  let currentDarkStreak = 0;
  let maxDarkHours = 0;
  let currentCommsBlackout = 0;
  let maxCommsBlackoutHours = 0;
  let totalRttSec = 0;
  let liveLinkSteps = 0;
  let totalDistanceKm = 0;
  let minTempC = 150;
  let maxTempC = -273;
  let highDustHours = 0;

  for (let h = 0; h < durationHours; h += 2) {
    const pt = computeSkyPoint(site, startMs + h * 3_600_000, commsMode, panelMode, h);
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

    if (pt.hasDirectEarth) dteCount++;
    if (pt.commsActive) {
      commsCount++;
      currentCommsBlackout = 0;
    } else {
      currentCommsBlackout += 2;
      if (currentCommsBlackout > maxCommsBlackoutHours) maxCommsBlackoutHours = currentCommsBlackout;
    }

    if (pt.roundTripLatencySec > 0) {
      totalRttSec += pt.roundTripLatencySec;
      liveLinkSteps++;
    }

    totalDistanceKm += pt.earthMoonDistanceKm;
    totalWatts += pt.solarWatts;
    points.push(pt);
  }

  const totalSteps = Math.max(1, points.length);
  const sunlightPercent = Math.round((sunlitCount / totalSteps) * 100);
  const dtePercent = Math.round((dteCount / totalSteps) * 100);
  const effectiveCommsPercent = Math.round((commsCount / totalSteps) * 100);
  const avgWatts = Math.round(totalWatts / totalSteps);
  const totalEnergyKwh = Number(((totalWatts * 2) / 1000).toFixed(1));
  const totalCommsHours = commsCount * 2;
  const avgRoundTripLatencySec =
    liveLinkSteps > 0 ? Number((totalRttSec / liveLinkSteps).toFixed(2)) : 0;
  const avgEarthDistanceKm = Math.round(totalDistanceKm / totalSteps);

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

  let verdict: MissionVerdict = 'GO - OPTIMAL';
  if (sunlightPercent < 65 || maxDarkHours > 50 || minTempC < -215) {
    verdict = 'NO-GO (POWER/THERMAL RISK)';
  } else if (effectiveCommsPercent < 35) {
    verdict = 'NO-GO (COMMS BLACKOUT)';
  } else if (highDustHours >= 12) {
    verdict = 'GO (DUST / RELAY MITIGATION)';
  } else if (dtePercent < 60) {
    verdict = 'GO WITH ORBITAL RELAY';
  }

  // Composite suitability breakdown (0..100 each)
  const solarPowerScore = clampScore(sunlightPercent * 0.72 + (avgWatts / 400) * 28);
  const commsScore = clampScore(
    effectiveCommsPercent * 0.7 + dtePercent * 0.3 - maxCommsBlackoutHours * 0.35,
  );
  // Safe landing slopes <= 5° score near 100; > 15° drops sharply
  const landingSafetyScore = clampScore(100 - Math.max(0, site.slopeDeg - 2) * 5.5);
  // Thermal survival penalizes long continuous darkness and deep cryogenic drops
  const thermalSurvivalScore = clampScore(
    100 - maxDarkHours * 0.85 - Math.max(0, -170 - minTempC) * 0.65,
  );
  // Science access favors proximity to PSR water ice (< 5 km)
  const scienceAccessScore = clampScore(100 / (1 + site.waterIceDistanceKm / 4));

  const overallScore = clampScore(
    solarPowerScore * 0.32 +
      commsScore * 0.24 +
      landingSafetyScore * 0.18 +
      thermalSurvivalScore * 0.16 +
      scienceAccessScore * 0.1,
  );

  return {
    site,
    landingUtc,
    effectiveStartUtc: new Date(startMs).toISOString(),
    durationDays: clampedDays,
    delayDays,
    commsMode,
    points,
    sunlightPercent,
    dtePercent,
    effectiveCommsPercent,
    avgWatts,
    totalEnergyKwh,
    maxDarkHours,
    hoursUntilSunset,
    hoursUntilEarthset,
    minTempC,
    maxTempC,
    highDustHours,
    totalCommsHours,
    maxCommsBlackoutHours,
    avgRoundTripLatencySec,
    avgEarthDistanceKm,
    verdict,
    suitability: {
      solarPowerScore,
      commsScore,
      landingSafetyScore,
      thermalSurvivalScore,
      scienceAccessScore,
      overallScore,
    },
  };
}

const CANDIDATE_DURATIONS = [3, 5, 7, 10, 14, 18, 21, 28];

function pickBestCandidate(candidates: DurationCandidateScore[]): DurationCandidateScore {
  return candidates.reduce((best, curr) => {
    if (curr.overallScore !== best.overallScore) {
      return curr.overallScore > best.overallScore ? curr : best;
    }
    // Tie-breaker: favor practical Artemis surface endurance (7-14 days over 3-5 days)
    const currScore = curr.durationDays >= 7 && curr.durationDays <= 14 ? 2 : 1;
    const bestScore = best.durationDays >= 7 && best.durationDays <= 14 ? 2 : 1;
    if (currScore !== bestScore) return currScore > bestScore ? curr : best;
    return curr.durationDays > best.durationDays ? curr : best;
  });
}

/**
 * Recommends the most suitable place (Plan A vs Plan B), finds the best landing epoch
 * (+0..+29 days) + duration, and sweeps candidate durations at the active plan's window.
 */
export function buildSiteAndDurationRecommendation(
  evalA: ScenarioEvaluation,
  evalB: ScenarioEvaluation,
): SiteAndDurationRecommendation {
  const recommendedPlace: 'A' | 'B' =
    evalA.suitability.overallScore >= evalB.suitability.overallScore ? 'A' : 'B';
  const winner = recommendedPlace === 'A' ? evalA : evalB;
  const runnerUp = recommendedPlace === 'A' ? evalB : evalA;

  // 1. Scan launch window delays (+0..+29 days) over practical mission arcs (7d & 10d)
  //    so the optimal epoch recommendation stays steady while inspecting different durations.
  let bestDelayDays = winner.delayDays;
  let bestWindowRank = -9999;
  for (let d = 0; d <= 29; d++) {
    const sim7 = evaluateMissionScenario(winner.site, winner.landingUtc, 7, d, winner.commsMode);
    const sim10 = evaluateMissionScenario(winner.site, winner.landingUtc, 10, d, winner.commsMode);
    const touchdownCommsBonus = sim7.points[0]?.commsActive ? 8 : -8;
    const rank = (sim7.suitability.overallScore + sim10.suitability.overallScore) / 2 + touchdownCommsBonus;
    if (rank > bestWindowRank) {
      bestWindowRank = rank;
      bestDelayDays = d;
    }
  }

  // 2. Find optimal duration at bestDelayDays
  const optimalEpochCandidates = CANDIDATE_DURATIONS.map((days) => {
    const sim = evaluateMissionScenario(winner.site, winner.landingUtc, days, bestDelayDays, winner.commsMode);
    return {
      durationDays: days,
      sunlightPercent: sim.sunlightPercent,
      effectiveCommsPercent: sim.effectiveCommsPercent,
      maxDarkHours: sim.maxDarkHours,
      overallScore: sim.suitability.overallScore,
      verdict: sim.verdict,
    } satisfies DurationCandidateScore;
  });
  const bestGlobalEntry = pickBestCandidate(optimalEpochCandidates);
  const recommendedSummary = evaluateMissionScenario(
    winner.site,
    winner.landingUtc,
    bestGlobalEntry.durationDays,
    bestDelayDays,
    winner.commsMode,
  );

  // 3. Sweep durations at the winning plan's CURRENT launch offset so pill scores
  //    always match the displayed Plan A/B suitability score to the exact point.
  const durationCandidates: DurationCandidateScore[] = CANDIDATE_DURATIONS.map((days) => {
    const sim = evaluateMissionScenario(
      winner.site,
      winner.landingUtc,
      days,
      winner.delayDays,
      winner.commsMode,
    );
    return {
      durationDays: days,
      sunlightPercent: sim.sunlightPercent,
      effectiveCommsPercent: sim.effectiveCommsPercent,
      maxDarkHours: sim.maxDarkHours,
      overallScore: sim.suitability.overallScore,
      verdict: sim.verdict,
    };
  });
  const bestWindowDurationDays = pickBestCandidate(durationCandidates).durationDays;

  const reasons: string[] = [];
  if (winner.suitability.overallScore > runnerUp.suitability.overallScore) {
    reasons.push(
      `${winner.site.name} leads ${winner.suitability.overallScore}/100 vs ${runnerUp.site.name}'s ${runnerUp.suitability.overallScore}/100.`,
    );
  } else {
    reasons.push(
      `Both sites tie at ${winner.suitability.overallScore}/100; Plan A is selected as baseline.`,
    );
  }
  if (winner.sunlightPercent !== runnerUp.sunlightPercent) {
    reasons.push(
      `Solar availability: ${winner.sunlightPercent}% vs ${runnerUp.sunlightPercent}% (${winner.avgWatts} W vs ${runnerUp.avgWatts} W avg).`,
    );
  }
  if (winner.maxDarkHours !== runnerUp.maxDarkHours) {
    reasons.push(
      `Thermal risk: max continuous darkness ${winner.maxDarkHours}h vs ${runnerUp.maxDarkHours}h.`,
    );
  }
  reasons.push(
    `Landing & science: ${winner.site.slopeDeg}° slope and ${winner.site.waterIceDistanceKm} km to PSR water ice.`,
  );

  const isAlreadyOptimal =
    bestGlobalEntry.durationDays === winner.durationDays && bestDelayDays === winner.delayDays;
  const tradeOffNote = isAlreadyOptimal
    ? `Current ${winner.durationDays}-day duration and +${bestDelayDays}d launch offset are optimal for ${winner.site.name}.`
    : `Best timing: ${bestGlobalEntry.durationDays}-day mission at +${bestDelayDays}d offset (${recommendedSummary.suitability.overallScore}/100 score, ${recommendedSummary.sunlightPercent}% sun, ${recommendedSummary.maxDarkHours}h max darkness).`;

  return {
    recommendedPlace,
    recommendedSite: winner.site,
    winnerScore: winner.suitability.overallScore,
    runnerUpScore: runnerUp.suitability.overallScore,
    scoreMargin: Math.abs(winner.suitability.overallScore - runnerUp.suitability.overallScore),
    recommendedDurationDays: bestGlobalEntry.durationDays,
    recommendedDelayDays: bestDelayDays,
    recommendedScore: recommendedSummary.suitability.overallScore,
    recommendedLandingUtc: recommendedSummary.effectiveStartUtc,
    recommendedSummary,
    bestWindowDurationDays,
    durationCandidates,
    reasons,
    tradeOffNote,
  };
}

export function computeSitePairDistanceKm(a: ComparisonSite, b: ComparisonSite): number {
  const deg = angularDistanceDeg(
    { latitude_deg: a.lat, longitude_deg: a.lon },
    { latitude_deg: b.lat, longitude_deg: b.lon },
  );
  return Math.round(deg * (Math.PI / 180) * MEAN_LUNAR_RADIUS_KM);
}
