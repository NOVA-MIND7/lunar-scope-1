import * as THREE from 'three';
import { latLonToVector3 } from '@/utils/lunarCoordinates';
import {
  getTerrainElevationAtAzimuth,
  type SolarSiteProfile,
} from '@/features/solar-analysis/solarPhysics';

export type DirectBand = 'KA_BAND' | 'S_BAND' | 'OPTICAL';

export interface DirectBandSpec {
  id: DirectBand;
  label: string;
  freqLabel: string;
  baseRateMbps: number;
  baseSnrDb: number;
  color: string;
}

export const DIRECT_BANDS: Record<DirectBand, DirectBandSpec> = {
  S_BAND: {
    id: 'S_BAND',
    label: 'S-Band (2.2 GHz)',
    freqLabel: '2.2 GHz',
    baseRateMbps: 8,
    baseSnrDb: 15.0,
    color: '#38bdf8',
  },
  KA_BAND: {
    id: 'KA_BAND',
    label: 'Ka-Band (26 GHz)',
    freqLabel: '26 GHz',
    baseRateMbps: 95,
    baseSnrDb: 18.6,
    color: '#22c55e',
  },
  OPTICAL: {
    id: 'OPTICAL',
    label: 'Optical Laser (1550 nm)',
    freqLabel: '1550 nm',
    baseRateMbps: 420,
    baseSnrDb: 21.4,
    color: '#00d9ff',
  },
};

export interface DirectDsnPreset {
  id: 'dsn-goldstone' | 'dsn-madrid' | 'dsn-canberra';
  name: string;
  lat: number;
  lon: number;
}

export const DIRECT_DSN_STATIONS: readonly DirectDsnPreset[] = [
  { id: 'dsn-goldstone', name: 'Goldstone 70m', lat: 35.4267, lon: -116.89 },
  { id: 'dsn-madrid', name: 'Madrid 70m', lat: 40.4314, lon: -4.248 },
  { id: 'dsn-canberra', name: 'Canberra 70m', lat: -35.4014, lon: 148.9817 },
];

export interface DirectCommsConfig {
  site: SolarSiteProfile;
  synodicHours: number; // 0..708 hours (~29.53d synodic month)
  band: DirectBand;
  txPowerWatts: number;
  payloadMb: number;
  batteryCapacityWh: number;
  batterySocPct: number;
  useTerrainHorizon: boolean;
  rotateEarth: boolean;
  enableGoldstone: boolean;
  enableMadrid: boolean;
  enableCanberra: boolean;
}

export interface DsnDishState {
  id: string;
  name: string;
  position: [number, number, number];
  normal: [number, number, number];
  elevationToMoonDeg: number;
  visible: boolean;
  active: boolean;
}

export type DirectLinkState =
  | 'DIRECT_UP'
  | 'BLOCKED_SOLAR_CONJUNCTION'
  | 'BLOCKED_TERRAIN_HORIZON'
  | 'BLOCKED_MOON_LIMB'
  | 'BLOCKED_NO_DSN';

export type IlluminationStatus =
  | 'SUNLIT'
  | 'TERRAIN_SHADOW'
  | 'NIGHT_TERMINATOR'
  | 'EARTH_UMBRA_ECLIPSE';

export interface DirectCommsFrame {
  synodicHours: number;
  synodicPhaseDeg: number;
  sunWorldPos: [number, number, number];
  sunUnitFromMoon: [number, number, number];
  subSolarLatDeg: number;
  subSolarLonDeg: number;
  sunElDeg: number;
  sunAzDeg: number;
  sunHorizonElDeg: number;
  illumination: IlluminationStatus;
  earthUmbraShadowActive: boolean;
  eclipseFraction: number; // 0..1

  siteWorldPos: [number, number, number];
  siteNormal: [number, number, number];
  earthSpinRad: number;
  earthElDeg: number;
  earthAzDeg: number;
  earthHorizonElDeg: number;
  sunEarthSepDeg: number;
  solarBlockingActive: boolean;

  dsnDishes: DsnDishState[];
  activeDish: DsnDishState | null;
  previewDish: DsnDishState | null;

  linkState: DirectLinkState;
  linkUp: boolean;
  linkStatusLabel: string;
  linkStatusDetail: string;

  slantRangeKm: number;
  oneWayDelaySec: number;
  rttSec: number;
  rateMbps: number;
  effectiveGoodputMbps: number;
  snrDb: number;
  solarNoisePenaltyDb: number;

  // Rover Solar Power Generation, Consumption & Endurance
  solarIrradianceWm2: number;
  sunlightReceivingPct: number;
  solarGeneratedW: number;
  baseRoverLoadW: number;
  txPowerDrawW: number;
  totalLoadW: number;
  netPowerW: number;
  batterySocPct: number;
  batteryRemainingWh: number;
  isCharging: boolean;
  powerLastsHours: number | null; // null => Sustained (netPowerW >= 0)
  hoursToFullCharge: number | null;

  // Payload Communication Time & Energy
  payloadMb: number;
  txDurationSec: number | null;
  txEnergyWh: number | null;
}

// 3D Stage constants (Earth–Moon co-rotating direct link axis)
export const DC_MOON_CENTER: readonly [number, number, number] = [-5.2, 0, 0];
export const DC_EARTH_CENTER: readonly [number, number, number] = [5.2, 0, 0];
export const DC_MOON_RADIUS = 1.48;
export const DC_EARTH_RADIUS = 1.9;

const SYNODIC_PERIOD_HRS = 708;
const BASE_PHASE_OFFSET_RAD = 0.95; // t=0 => Sun at ~54° oblique phase (sunlit + clear direct link)
const SUN_ORBIT_RADIUS = 13.5;
const MEAN_CISLUNAR_KM = 384_400;
const TRUE_MOON_EARTH_PARALLAX_R = 221.25; // Earth center distance in lunar radii (384,400 / 1,737.4)
const TRUE_EARTH_MOON_PARALLAX_R = 60.34; // Moon center distance in Earth radii (384,400 / 6,371)
const C_KM_S = 299_792.458;

const _moonCenter = new THREE.Vector3(...DC_MOON_CENTER);
const _earthCenter = new THREE.Vector3(...DC_EARTH_CENTER);

function moonLatLonToWorld(latDeg: number, lonDeg: number, radius = DC_MOON_RADIUS) {
  const local = latLonToVector3(latDeg, lonDeg, 1);
  // Rotate +90° around +Y so local +Z (0° Near Side) faces +X toward Earth
  local.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const normal = local.clone().normalize();
  const pos = _moonCenter.clone().addScaledVector(normal, radius);
  return { pos, normal };
}

function earthLatLonToWorld(latDeg: number, lonDeg: number, earthSpinRad: number, radius = DC_EARTH_RADIUS) {
  const local = latLonToVector3(latDeg, lonDeg, 1);
  local.applyAxisAngle(new THREE.Vector3(0, 1, 0), earthSpinRad - Math.PI * 0.35);
  local.applyAxisAngle(new THREE.Vector3(1, 0, 0), (23.5 * Math.PI) / 180);
  const normal = local.clone().normalize();
  const pos = _earthCenter.clone().addScaledVector(normal, radius);
  return { pos, normal };
}

function localAzEl(siteNormal: THREE.Vector3, latDeg: number, targetVecFromSite: THREE.Vector3): {
  azDeg: number;
  elDeg: number;
} {
  const dir = targetVecFromSite.clone().normalize();
  const elRad = Math.asin(Math.max(-1, Math.min(1, dir.dot(siteNormal))));
  const elDeg = (elRad * 180) / Math.PI;

  // Construct local East-North-Up tangent basis on the Moon surface
  const worldUpPole = new THREE.Vector3(0, 1, 0);
  let east = new THREE.Vector3().crossVectors(worldUpPole, siteNormal);
  if (east.lengthSq() < 1e-6) {
    // Near poles, anchor East cleanly from +Z / +X
    east = new THREE.Vector3(0, 0, latDeg < 0 ? -1 : 1);
  }
  east.normalize();
  const north = new THREE.Vector3().crossVectors(siteNormal, east).normalize();

  const eastComp = dir.dot(east);
  const northComp = dir.dot(north);
  const azDeg = ((Math.atan2(eastComp, northComp) * 180) / Math.PI + 360) % 360;

  return { azDeg, elDeg };
}

export function stepDirectCommsFrame(cfg: DirectCommsConfig): DirectCommsFrame {
  const h = ((cfg.synodicHours % SYNODIC_PERIOD_HRS) + SYNODIC_PERIOD_HRS) % SYNODIC_PERIOD_HRS;
  const orbitRad = (h / SYNODIC_PERIOD_HRS) * Math.PI * 2 + BASE_PHASE_OFFSET_RAD;
  const synodicPhaseDeg = ((orbitRad * 180) / Math.PI + 360) % 360;

  // Moving Sun orbits in 3D with Moon's ~5.8° orbital/obliquity inclination so shadows sweep craters & polar ridges
  const eclipticTiltRad = (5.8 * Math.PI) / 180;
  const sunX = Math.cos(orbitRad) * SUN_ORBIT_RADIUS;
  const sunZ = Math.sin(orbitRad) * SUN_ORBIT_RADIUS;
  const sunY = -Math.sin(orbitRad) * Math.sin(eclipticTiltRad) * SUN_ORBIT_RADIUS;
  const sunWorld = new THREE.Vector3(sunX, sunY, sunZ);

  const { pos: siteWorld, normal: siteNormal } = moonLatLonToWorld(
    cfg.site.lat,
    cfg.site.lon,
    DC_MOON_RADIUS + 0.02,
  );

  // Sun vector from Moon center & sub-solar Lat/Lon in Moon coordinates
  const sunFromMoon = new THREE.Vector3().subVectors(sunWorld, _moonCenter).normalize();
  // Inverse the +90° Y Moon alignment to convert back to selenographic Lat/Lon
  const sunMoonLocal = sunFromMoon.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
  const subSolarLatDeg = (Math.asin(Math.max(-1, Math.min(1, sunMoonLocal.y))) * 180) / Math.PI;
  const subSolarLonDeg = ((Math.atan2(sunMoonLocal.x, sunMoonLocal.z) * 180) / Math.PI);

  // Sun Azimuth & Elevation at Landing Site
  const sunFromSite = new THREE.Vector3().subVectors(sunWorld, siteWorld);
  const { azDeg: sunAzDeg, elDeg: sunElRaw } = localAzEl(siteNormal, cfg.site.lat, sunFromSite);
  const sunHorizonElDeg = cfg.useTerrainHorizon
    ? getTerrainElevationAtAzimuth(cfg.site.terrainMask, sunAzDeg)
    : 0;

  // Check Earth Umbra Eclipse Shadow on the Moon (Sun -> Earth -> Moon alignment along +X)
  // Ray from Moon toward Sun passes near Earth center when sunX > earthX and perpendicular distance < R_earth
  const moonToEarth = new THREE.Vector3().subVectors(_earthCenter, _moonCenter);
  const projOnSun = moonToEarth.dot(sunFromMoon);
  let eclipseFraction = 0;
  if (projOnSun > 0) {
    const closestPt = _moonCenter.clone().addScaledVector(sunFromMoon, projOnSun);
    const radialMiss = closestPt.distanceTo(_earthCenter);
    const umbraRadius = DC_EARTH_RADIUS * 1.05;
    if (radialMiss < umbraRadius * 1.35) {
      eclipseFraction = Math.max(
        0,
        Math.min(1, 1 - (radialMiss - umbraRadius * 0.65) / (umbraRadius * 0.7)),
      );
    }
  }
  const earthUmbraShadowActive = eclipseFraction >= 0.45;

  let illumination: IlluminationStatus = 'SUNLIT';
  if (earthUmbraShadowActive) {
    illumination = 'EARTH_UMBRA_ECLIPSE';
  } else if (sunElRaw <= 0) {
    illumination = 'NIGHT_TERMINATOR';
  } else if (cfg.useTerrainHorizon && sunElRaw < sunHorizonElDeg) {
    illumination = 'TERRAIN_SHADOW';
  }

  // Earth rotation (24h real Earth day per 24 synodicHours when enabled)
  const earthSpinRad = cfg.rotateEarth ? ((h % 24) / 24) * Math.PI * 2 : 0;

  // Earth Direction & Elevation from Moon Landing Site (using true 384,400 km / 1,737 km parallax ratio)
  const earthTrueCenter = _moonCenter
    .clone()
    .add(new THREE.Vector3(DC_MOON_RADIUS * TRUE_MOON_EARTH_PARALLAX_R, 0, 0));
  const earthFromSite = new THREE.Vector3().subVectors(earthTrueCenter, siteWorld);
  const { azDeg: earthAzDeg, elDeg: earthElRaw } = localAzEl(siteNormal, cfg.site.lat, earthFromSite);
  const earthHorizonElDeg = cfg.useTerrainHorizon
    ? getTerrainElevationAtAzimuth(cfg.site.terrainMask, earthAzDeg)
    : 0;

  // Sun–Earth–Probe / Solar Conjunction blocking angle from Moon site
  const earthDirUnit = earthFromSite.clone().normalize();
  const sunDirUnit = sunFromSite.clone().normalize();
  const sepDot = Math.max(-1, Math.min(1, earthDirUnit.dot(sunDirUnit)));
  const sunEarthSepDeg = (Math.acos(sepDot) * 180) / Math.PI;
  const solarBlockingActive = sunEarthSepDeg < 7.5;

  // DSN Ground Stations on Earth
  const enabledPresets = DIRECT_DSN_STATIONS.filter((st) => {
    if (st.id === 'dsn-goldstone') return cfg.enableGoldstone;
    if (st.id === 'dsn-madrid') return cfg.enableMadrid;
    return cfg.enableCanberra;
  });

  // Physical Moon direction vector from Earth using true 60.34 R_earth parallax (avoids compressed-scale horizon dropouts)
  const moonTrueCenterFromEarth = _earthCenter
    .clone()
    .add(new THREE.Vector3(-DC_EARTH_RADIUS * TRUE_EARTH_MOON_PARALLAX_R, 0, 0));

  const dsnDishes: DsnDishState[] = enabledPresets.map((st) => {
    const { pos, normal } = earthLatLonToWorld(st.lat, st.lon, earthSpinRad, DC_EARTH_RADIUS + 0.02);
    const toMoon = new THREE.Vector3().subVectors(moonTrueCenterFromEarth, pos).normalize();
    const elDeg = (Math.asin(Math.max(-1, Math.min(1, toMoon.dot(normal)))) * 180) / Math.PI;
    return {
      id: st.id,
      name: st.name,
      position: [pos.x, pos.y, pos.z],
      normal: [normal.x, normal.y, normal.z],
      elevationToMoonDeg: Number(elDeg.toFixed(1)),
      visible: elDeg >= 4.0,
      active: false,
    };
  });

  const bestVisibleDish =
    dsnDishes
      .filter((d) => d.visible)
      .sort((a, b) => b.elevationToMoonDeg - a.elevationToMoonDeg)[0] ?? null;

  const fallbackDish =
    [...dsnDishes].sort((a, b) => b.elevationToMoonDeg - a.elevationToMoonDeg)[0] ?? null;

  // Determine Direct Communication Link State
  let linkState: DirectLinkState = 'DIRECT_UP';
  let linkStatusLabel = 'DIRECT DTE LINK UP';
  let linkStatusDetail = 'Clear line of sight between lunar site and Earth DSN station.';

  if (earthElRaw <= 0) {
    linkState = 'BLOCKED_MOON_LIMB';
    linkStatusLabel = 'BLOCKED (FAR SIDE / BELOW LIMB)';
    linkStatusDetail = `Earth sits below the geometric lunar horizon (${earthElRaw.toFixed(1)}°).`;
  } else if (cfg.useTerrainHorizon && earthElRaw < earthHorizonElDeg) {
    linkState = 'BLOCKED_TERRAIN_HORIZON';
    linkStatusLabel = 'BLOCKED (LOLA CRATER RIDGE)';
    linkStatusDetail = `Earth at ${earthElRaw.toFixed(1)}° el is occluded by ${earthHorizonElDeg.toFixed(1)}° terrain ridge.`;
  } else if (!bestVisibleDish) {
    linkState = 'BLOCKED_NO_DSN';
    linkStatusLabel = 'BLOCKED (NO DSN DISH FACING MOON)';
    linkStatusDetail =
      dsnDishes.length === 0
        ? 'Enable at least one DSN Ground Dish.'
        : 'All enabled Earth DSN stations have rotated below 4° Moon elevation.';
  } else if (solarBlockingActive) {
    linkState = 'BLOCKED_SOLAR_CONJUNCTION';
    linkStatusLabel = 'BLOCKED (SUN BLOCKING / SOLAR RFI)';
    linkStatusDetail = `Sun is ${sunEarthSepDeg.toFixed(1)}° from Earth line of sight — solar plasma noise disrupts direct RF lock.`;
  }

  const linkUp = linkState === 'DIRECT_UP';
  if (linkUp && bestVisibleDish) {
    bestVisibleDish.active = true;
    linkStatusDetail = `${bestVisibleDish.name} locked at ${bestVisibleDish.elevationToMoonDeg.toFixed(1)}° Moon el • Earth ${earthElRaw.toFixed(1)}° above lunar ridge.`;
  }

  // Link Budget & Light Delay
  const spec = DIRECT_BANDS[cfg.band];
  const slantRangeKm = Math.round(
    MEAN_CISLUNAR_KM - Math.cos((cfg.site.lat * Math.PI) / 180) * Math.cos((cfg.site.lon * Math.PI) / 180) * 1737,
  );
  const oneWayDelaySec = Number((slantRangeKm / C_KM_S).toFixed(3));
  const rttSec = Number((oneWayDelaySec * 2).toFixed(3));

  const powerBoostDb = 10 * Math.log10(Math.max(5, cfg.txPowerWatts) / 30);
  const solarNoisePenaltyDb =
    sunEarthSepDeg < 18
      ? Number(((1 - sunEarthSepDeg / 18) * 14).toFixed(1))
      : 0;
  const terrainFadeDb = cfg.useTerrainHorizon && earthElRaw < earthHorizonElDeg + 2.5 ? 2.5 : 0;
  const snrDb = linkUp
    ? Number(Math.max(2.0, spec.baseSnrDb + powerBoostDb - solarNoisePenaltyDb - terrainFadeDb).toFixed(1))
    : Number(Math.max(-12, spec.baseSnrDb - 22 - solarNoisePenaltyDb).toFixed(1));

  const rateFactor = Math.max(0.25, Math.min(1.5, 0.78 + powerBoostDb * 0.14 - solarNoisePenaltyDb * 0.05));
  const rateMbps = linkUp ? Number((spec.baseRateMbps * rateFactor).toFixed(1)) : 0;
  const effectiveGoodputMbps = linkUp ? Number((rateMbps * 0.85).toFixed(1)) : 0;

  // Rover Solar Power Generation, Load & Battery Endurance
  // Vertical tracking array receives cos(sunEl) across azimuth; dimmed/cut off in shadows or Earth eclipse
  const sunReceivingFactor =
    illumination === 'SUNLIT'
      ? Math.max(0.72, Math.cos((Math.max(0, sunElRaw) * Math.PI) / 180)) * (1 - eclipseFraction * 0.92)
      : illumination === 'EARTH_UMBRA_ECLIPSE'
        ? Math.max(0, 1 - eclipseFraction) * 0.35
        : 0;
  const solarIrradianceWm2 = Math.round(1361 * sunReceivingFactor);
  const sunlightReceivingPct = Math.round(sunReceivingFactor * 100);
  // 1.35 m² GaAs triple-junction vertical-tracking array @ ~30% efficiency -> ~550 W peak
  const solarGeneratedW = Math.round(solarIrradianceWm2 * 1.35 * 0.3);

  // Avionics + thermal survival heater increases load during lunar darkness / deep shadow
  const baseRoverLoadW = illumination === 'SUNLIT' ? 135 : 210;
  const paEfficiency = cfg.band === 'OPTICAL' ? 0.28 : cfg.band === 'KA_BAND' ? 0.38 : 0.42;
  const txPowerDrawW = linkUp ? Math.round(cfg.txPowerWatts / paEfficiency + 14) : 12;
  const totalLoadW = baseRoverLoadW + txPowerDrawW;
  const netPowerW = solarGeneratedW - totalLoadW;

  const batteryCap = Math.max(200, cfg.batteryCapacityWh);
  const clampedSoc = Math.max(0, Math.min(100, cfg.batterySocPct));
  const batteryRemainingWh = Number(((batteryCap * clampedSoc) / 100).toFixed(1));
  const isCharging = solarGeneratedW > 0 && netPowerW > 0 && clampedSoc < 99.9;
  const powerLastsHours =
    netPowerW < 0 ? Number((batteryRemainingWh / Math.abs(netPowerW)).toFixed(2)) : null;
  const hoursToFullCharge =
    netPowerW > 0 && clampedSoc < 100
      ? Number(((batteryCap - batteryRemainingWh) / netPowerW).toFixed(2))
      : null;

  // Direct Communication Payload Transfer Time & Energy
  const payloadMb = Math.max(1, cfg.payloadMb);
  const txDurationSec =
    linkUp && effectiveGoodputMbps > 0
      ? Number(((payloadMb * 8) / effectiveGoodputMbps).toFixed(1))
      : null;
  const txEnergyWh =
    txDurationSec !== null ? Number(((totalLoadW * txDurationSec) / 3600).toFixed(2)) : null;

  return {
    synodicHours: h,
    synodicPhaseDeg: Number(synodicPhaseDeg.toFixed(1)),
    sunWorldPos: [sunWorld.x, sunWorld.y, sunWorld.z],
    sunUnitFromMoon: [sunFromMoon.x, sunFromMoon.y, sunFromMoon.z],
    subSolarLatDeg: Number(subSolarLatDeg.toFixed(2)),
    subSolarLonDeg: Number(subSolarLonDeg.toFixed(2)),
    sunElDeg: Number(sunElRaw.toFixed(1)),
    sunAzDeg: Number(sunAzDeg.toFixed(1)),
    sunHorizonElDeg: Number(sunHorizonElDeg.toFixed(1)),
    illumination,
    earthUmbraShadowActive,
    eclipseFraction: Number(eclipseFraction.toFixed(2)),

    siteWorldPos: [siteWorld.x, siteWorld.y, siteWorld.z],
    siteNormal: [siteNormal.x, siteNormal.y, siteNormal.z],
    earthSpinRad,
    earthElDeg: Number(earthElRaw.toFixed(1)),
    earthAzDeg: Number(earthAzDeg.toFixed(1)),
    earthHorizonElDeg: Number(earthHorizonElDeg.toFixed(1)),
    sunEarthSepDeg: Number(sunEarthSepDeg.toFixed(1)),
    solarBlockingActive,

    dsnDishes,
    activeDish: bestVisibleDish,
    previewDish: bestVisibleDish ?? fallbackDish,

    linkState,
    linkUp,
    linkStatusLabel,
    linkStatusDetail,

    slantRangeKm,
    oneWayDelaySec,
    rttSec,
    rateMbps,
    effectiveGoodputMbps,
    snrDb,
    solarNoisePenaltyDb,

    solarIrradianceWm2,
    sunlightReceivingPct,
    solarGeneratedW,
    baseRoverLoadW,
    txPowerDrawW,
    totalLoadW,
    netPowerW,
    batterySocPct: Number(clampedSoc.toFixed(1)),
    batteryRemainingWh,
    isCharging,
    powerLastsHours,
    hoursToFullCharge,

    payloadMb,
    txDurationSec,
    txEnergyWh,
  };
}
