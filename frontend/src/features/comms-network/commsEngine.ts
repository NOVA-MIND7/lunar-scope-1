import * as THREE from 'three';
import { latLonToVector3 } from '@/utils/lunarCoordinates';

export type FrequencyBand = 'S_BAND' | 'KA_BAND' | 'OPTICAL';
export type LunarOrbitType = 'LLO_POLAR' | 'FROZEN_ELLIPTICAL' | 'NRHO_HALO';
export type RoutingMode = 'AUTO_RELAY' | 'LUNAR_SAT_TO_DSN' | 'DIRECT_TO_EARTH';

export interface RoverSitePreset {
  id: string;
  name: string;
  lat: number;
  lon: number;
  note: string;
}

export interface BaseDishPreset {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lon: number;
}

export interface CommsSimConfig {
  roverName: string;
  roverSiteId: string;
  roverLat: number;
  roverLon: number;
  txPowerWatts: number;
  band: FrequencyBand;
  payloadMb: number;

  lunarSatCount: number; // 0..4
  lunarOrbitType: LunarOrbitType;
  lunarAltitudeKm: number; // 100..5000

  earthSatCount: number; // 0..4
  earthAltitudeKm: number; // 1200..35786
  rotateEarth: boolean;

  enableGoldstone: boolean;
  enableMadrid: boolean;
  enableCanberra: boolean;
  customDishEnabled: boolean;
  customDishName: string;
  customDishLat: number;
  customDishLon: number;

  routingMode: RoutingMode;
}

export interface NodeSnapshot {
  id: string;
  label: string;
  kind: 'ROVER' | 'LUNAR_SAT' | 'EARTH_SAT' | 'DSN_DISH';
  position: [number, number, number];
  normal?: [number, number, number];
  active: boolean;
  variant?: number;
}

export interface CommsHop {
  id: string;
  fromId: string;
  fromLabel: string;
  toId: string;
  toLabel: string;
  fromPos: [number, number, number];
  toPos: [number, number, number];
  distanceKm: number;
  latencyMs: number;
  snrDb: number;
  rateMbps: number;
  active: boolean;
  reason?: string;
}

export interface CommsFrameState {
  simTimeSec: number;
  earthSpinRad: number;
  rovers: NodeSnapshot[];
  lunarSats: NodeSnapshot[];
  earthSats: NodeSnapshot[];
  dsnDishes: NodeSnapshot[];
  activeHops: CommsHop[];
  blockedPreviewHop: CommsHop | null;
  linkUp: boolean;
  linkStateLabel: 'END-TO-END LINK UP' | 'DTN BUFFERING (LOS BLOCKED)' | 'NO SATELLITE / DISH ACTIVE';
  routePathText: string;
  totalDelaySec: number;
  effectiveRateMbps: number;
  minSnrDb: number;
  statusDetail: string;
}

// Scene stage geometry (world units)
export const MOON_CENTER: readonly [number, number, number] = [-6.2, 0, 0];
export const EARTH_CENTER: readonly [number, number, number] = [6.2, 0, 0];
export const MOON_RADIUS_SCENE = 1.55;
export const EARTH_RADIUS_SCENE = 2.0;

const MEAN_CISLUNAR_KM = 384_400;
const C_KM_S = 299_792.458;

export const ROVER_SITE_PRESETS: readonly RoverSitePreset[] = [
  {
    id: 'malapert-massif',
    name: 'Malapert Massif Crest (Near South)',
    lat: -86.0,
    lon: 0.0,
    note: 'Earth-facing mountain peak — good Direct-to-Earth and relay visibility.',
  },
  {
    id: 'shackleton-rim',
    name: 'Shackleton Crater Rim (South Pole)',
    lat: -89.68,
    lon: 129.0,
    note: 'Grazing Earth horizon at the South Pole — benefits strongly from Lunar Relays.',
  },
  {
    id: 'tranquility-base',
    name: 'Tranquility Base (Equatorial Near Side)',
    lat: 0.67,
    lon: 23.47,
    note: 'Direct Near-Side line of sight toward Earth.',
  },
  {
    id: 'mare-moscoviense',
    name: 'Mare Moscoviense (Lunar Far Side)',
    lat: 27.3,
    lon: 147.9,
    note: 'Far-Side basin — Earth is permanently hidden; requires Lunar Relay satellites.',
  },
  {
    id: 'oceanus-procellarum',
    name: 'Oceanus Procellarum (West Near Side)',
    lat: 18.4,
    lon: -57.4,
    note: 'Broad mare plains with wide orbital pass windows.',
  },
];

export const BASE_DISH_PRESETS: readonly BaseDishPreset[] = [
  { id: 'dsn-goldstone', name: 'Goldstone 70m (USA)', shortName: 'Goldstone', lat: 35.4267, lon: -116.89 },
  { id: 'dsn-madrid', name: 'Madrid 70m (Spain)', shortName: 'Madrid', lat: 40.4314, lon: -4.248 },
  { id: 'dsn-canberra', name: 'Canberra 70m (Australia)', shortName: 'Canberra', lat: -35.4014, lon: 148.9817 },
];

export const BAND_SPECS: Record<
  FrequencyBand,
  { label: string; baseRateMbps: number; baseSnrDb: number; hopOverheadMs: number; color: string }
> = {
  S_BAND: {
    label: 'S-Band (2.2 GHz)',
    baseRateMbps: 6,
    baseSnrDb: 14.5,
    hopOverheadMs: 28,
    color: '#38bdf8',
  },
  KA_BAND: {
    label: 'Ka-Band (26 GHz)',
    baseRateMbps: 120,
    baseSnrDb: 18.2,
    hopOverheadMs: 18,
    color: '#00d9ff',
  },
  OPTICAL: {
    label: 'Optical Laser (1550 nm)',
    baseRateMbps: 622,
    baseSnrDb: 22.0,
    hopOverheadMs: 12,
    color: '#22c55e',
  },
};

const _moonCenterVec = new THREE.Vector3(...MOON_CENTER);
const _earthCenterVec = new THREE.Vector3(...EARTH_CENTER);

/** Checks if the open line segment A->B intersects a sphere of radius R centered at C. */
function segmentHitsSphere(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, r: number): boolean {
  const ab = new THREE.Vector3().subVectors(b, a);
  const ac = new THREE.Vector3().subVectors(c, a);
  const abLenSq = ab.lengthSq();
  if (abLenSq < 1e-8) return false;
  const t = Math.max(0, Math.min(1, ac.dot(ab) / abLenSq));
  // Ignore tiny graze right at endpoints on the surface of this same body
  if (t < 0.02 || t > 0.98) return false;
  const closest = new THREE.Vector3().copy(a).addScaledVector(ab, t);
  return closest.distanceToSquared(c) < r * r;
}

/** True if point B sits above horizon mask from surface point A with outward unit normal N. */
function isAboveHorizon(a: THREE.Vector3, n: THREE.Vector3, b: THREE.Vector3, minElevDeg: number): boolean {
  const dir = new THREE.Vector3().subVectors(b, a).normalize();
  const minSin = Math.sin((minElevDeg * Math.PI) / 180);
  return dir.dot(n) > minSin;
}

function hasLineOfSight(
  a: THREE.Vector3,
  b: THREE.Vector3,
  aNormal?: THREE.Vector3,
  bNormal?: THREE.Vector3,
  minSurfaceElevDeg = 4,
): boolean {
  if (aNormal && !isAboveHorizon(a, aNormal, b, minSurfaceElevDeg)) return false;
  if (bNormal && !isAboveHorizon(b, bNormal, a, minSurfaceElevDeg)) return false;
  if (segmentHitsSphere(a, b, _moonCenterVec, MOON_RADIUS_SCENE * 0.97)) return false;
  if (segmentHitsSphere(a, b, _earthCenterVec, EARTH_RADIUS_SCENE * 0.97)) return false;
  return true;
}

/** Convert Moon-local lat/lon into world space (Moon's +Z prime meridian rotates +90° to face +X Earth). */
function moonLatLonToWorld(latDeg: number, lonDeg: number, radius = MOON_RADIUS_SCENE): {
  pos: THREE.Vector3;
  normal: THREE.Vector3;
} {
  const local = latLonToVector3(latDeg, lonDeg, 1);
  // Rotate +90° about +Y so local +Z (0° lon Near Side) faces +X (toward Earth)
  local.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const normal = local.clone().normalize();
  const pos = _moonCenterVec.clone().addScaledVector(normal, radius);
  return { pos, normal };
}

/** Convert Earth-local lat/lon + axial spin + 23.5° obliquity into world space. */
function earthLatLonToWorld(
  latDeg: number,
  lonDeg: number,
  earthSpinRad: number,
  radius = EARTH_RADIUS_SCENE,
): { pos: THREE.Vector3; normal: THREE.Vector3 } {
  const local = latLonToVector3(latDeg, lonDeg, 1);
  // Apply Earth axial spin, then face Goldstone hemisphere naturally, plus 23.5° tilt
  local.applyAxisAngle(new THREE.Vector3(0, 1, 0), earthSpinRad - Math.PI * 0.35);
  local.applyAxisAngle(new THREE.Vector3(1, 0, 0), (23.5 * Math.PI) / 180);
  const normal = local.clone().normalize();
  const pos = _earthCenterVec.clone().addScaledVector(normal, radius);
  return { pos, normal };
}

function computeOrbitVec(
  center: THREE.Vector3,
  radius: number,
  inclinationDeg: number,
  nodeRad: number,
  thetaRad: number,
  eccentricity = 0,
): THREE.Vector3 {
  const cosNode = Math.cos(nodeRad);
  const sinNode = Math.sin(nodeRad);
  const tilt = ((90 - inclinationDeg) * Math.PI) / 180;
  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);

  // Subtle elliptical shaping for frozen / NRHO orbits
  const r = eccentricity > 0 ? radius * (1 + eccentricity * Math.sin(thetaRad)) : radius;
  const x0 = r * Math.sin(thetaRad);
  const y0 = -r * Math.cos(thetaRad);
  const z0 = 0;

  const x1 = x0;
  const y1 = y0 * cosTilt - z0 * sinTilt;
  const z1 = y0 * sinTilt + z0 * cosTilt;

  const x = x1 * cosNode - z1 * sinNode;
  const z = x1 * sinNode + z1 * cosNode;
  const y = y1;

  return new THREE.Vector3(center.x + x, center.y + y, center.z + z);
}

/** Map scene distance to physical km & light-time latency. */
function estimatePhysicalDistanceKm(a: THREE.Vector3, b: THREE.Vector3, aKind: NodeSnapshot['kind'], bKind: NodeSnapshot['kind']): number {
  const isLunarA = aKind === 'ROVER' || aKind === 'LUNAR_SAT';
  const isLunarB = bKind === 'ROVER' || bKind === 'LUNAR_SAT';
  const sceneDist = a.distanceTo(b);
  if (isLunarA !== isLunarB) {
    // Crossing cislunar gap (~12.4 world units ~= 384,400 km)
    return Math.round((sceneDist / 12.4) * MEAN_CISLUNAR_KM);
  }
  if (isLunarA && isLunarB) {
    // Local Lunar system (1.55 world units ~= 1737.4 km)
    return Math.max(120, Math.round((sceneDist / MOON_RADIUS_SCENE) * 1737.4));
  }
  // Local Earth system (2.0 world units ~= 6371 km)
  return Math.max(450, Math.round((sceneDist / EARTH_RADIUS_SCENE) * 6371));
}

function makeHop(
  from: NodeSnapshot,
  to: NodeSnapshot,
  cfg: CommsSimConfig,
  active: boolean,
  reason?: string,
): CommsHop {
  const a = new THREE.Vector3(...from.position);
  const b = new THREE.Vector3(...to.position);
  const distKm = estimatePhysicalDistanceKm(a, b, from.kind, to.kind);
  const spec = BAND_SPECS[cfg.band];
  const powerBoostDb = 10 * Math.log10(Math.max(5, cfg.txPowerWatts) / 25);
  const distancePenaltyDb = distKm > 50_000 ? 6.5 : 0;
  const snrDb = Number((spec.baseSnrDb + powerBoostDb - distancePenaltyDb + (active ? 0 : -24)).toFixed(1));
  const rateScale = Math.max(0.35, Math.min(1.6, 0.7 + powerBoostDb * 0.12));
  const rateMbps = active
    ? Number((spec.baseRateMbps * rateScale * (distKm > 50_000 ? 0.78 : 1)).toFixed(1))
    : 0;
  const lightMs = (distKm / C_KM_S) * 1000;
  const latencyMs = Number((lightMs + (active ? spec.hopOverheadMs : 0)).toFixed(1));

  return {
    id: `${from.id}->${to.id}`,
    fromId: from.id,
    fromLabel: from.label,
    toId: to.id,
    toLabel: to.label,
    fromPos: from.position,
    toPos: to.position,
    distanceKm: distKm,
    latencyMs,
    snrDb,
    rateMbps,
    active,
    reason,
  };
}

export function stepCommsFrame(cfg: CommsSimConfig, simTimeSec: number): CommsFrameState {
  const spec = BAND_SPECS[cfg.band];
  const earthSpinRad = cfg.rotateEarth ? simTimeSec * 0.16 : 0;

  // 1. Moon Rover
  const roverLat = Math.max(-90, Math.min(90, cfg.roverLat));
  const roverLon = ((cfg.roverLon + 180) % 360 + 360) % 360 - 180;
  const { pos: roverPos, normal: roverNorm } = moonLatLonToWorld(roverLat, roverLon, MOON_RADIUS_SCENE + 0.02);
  const roverNode: NodeSnapshot = {
    id: 'rover-1',
    label: cfg.roverName.trim() || 'Lunar Rover',
    kind: 'ROVER',
    position: [roverPos.x, roverPos.y, roverPos.z],
    normal: [roverNorm.x, roverNorm.y, roverNorm.z],
    active: true,
  };

  // 2. Lunar Relay Satellites (0..4)
  const lunarRadiusScene = MOON_RADIUS_SCENE + 0.35 + ((Math.max(100, Math.min(5000, cfg.lunarAltitudeKm)) - 100) / 4900) * 1.1;
  const lunarEcc = cfg.lunarOrbitType === 'NRHO_HALO' ? 0.28 : cfg.lunarOrbitType === 'FROZEN_ELLIPTICAL' ? 0.18 : 0.0;
  const lunarBaseInc = cfg.lunarOrbitType === 'LLO_POLAR' ? 86 : cfg.lunarOrbitType === 'FROZEN_ELLIPTICAL' ? 62 : 76;
  const lunarAngSpeed = 0.55 - (lunarRadiusScene - MOON_RADIUS_SCENE) * 0.16;

  const lunarSats: NodeSnapshot[] = [];
  const lunarCount = Math.max(0, Math.min(4, Math.round(cfg.lunarSatCount)));
  for (let i = 0; i < lunarCount; i++) {
    const theta = simTimeSec * lunarAngSpeed + (i * Math.PI * 2) / Math.max(1, lunarCount);
    const nodeRad = i * ((Math.PI * 2) / Math.max(2, lunarCount)) * 0.65;
    const p = computeOrbitVec(
      _moonCenterVec,
      lunarRadiusScene,
      lunarBaseInc + (i % 2 === 0 ? 0 : -14),
      nodeRad,
      theta,
      lunarEcc,
    );
    lunarSats.push({
      id: `lunar-sat-${i + 1}`,
      label: i === 0 ? 'LunarSat-1 (Cassini)' : i === 1 ? 'LunarSat-2 (LRO)' : `LunarSat-${i + 1} (Gateway)`,
      kind: 'LUNAR_SAT',
      position: [p.x, p.y, p.z],
      active: false,
      variant: i % 3,
    });
  }

  // 3. Earth Base DSN Dishes
  const dishSpecs: Array<{ id: string; name: string; lat: number; lon: number }> = [];
  if (cfg.enableGoldstone) dishSpecs.push({ id: 'dsn-goldstone', name: 'Goldstone 70m', lat: 35.4267, lon: -116.89 });
  if (cfg.enableMadrid) dishSpecs.push({ id: 'dsn-madrid', name: 'Madrid 70m', lat: 40.4314, lon: -4.248 });
  if (cfg.enableCanberra) dishSpecs.push({ id: 'dsn-canberra', name: 'Canberra 70m', lat: -35.4014, lon: 148.9817 });
  if (cfg.customDishEnabled) {
    dishSpecs.push({
      id: 'dsn-custom',
      name: cfg.customDishName.trim() || 'Custom Dish',
      lat: Math.max(-90, Math.min(90, cfg.customDishLat)),
      lon: ((cfg.customDishLon + 180) % 360 + 360) % 360 - 180,
    });
  }

  const dsnDishes: NodeSnapshot[] = dishSpecs.map((d) => {
    const { pos, normal } = earthLatLonToWorld(d.lat, d.lon, earthSpinRad, EARTH_RADIUS_SCENE + 0.02);
    return {
      id: d.id,
      label: d.name,
      kind: 'DSN_DISH',
      position: [pos.x, pos.y, pos.z],
      normal: [normal.x, normal.y, normal.z],
      active: false,
    };
  });

  // 4. Earth Relay Satellites (0..4)
  const earthRadiusScene =
    EARTH_RADIUS_SCENE + 0.48 + ((Math.max(1200, Math.min(35786, cfg.earthAltitudeKm)) - 1200) / 34586) * 1.15;
  const earthAngSpeed = 0.42 - (earthRadiusScene - EARTH_RADIUS_SCENE) * 0.1;
  const earthSats: NodeSnapshot[] = [];
  const earthCount = Math.max(0, Math.min(4, Math.round(cfg.earthSatCount)));
  for (let i = 0; i < earthCount; i++) {
    const theta = simTimeSec * earthAngSpeed + (i * Math.PI * 2) / Math.max(1, earthCount) + 0.7;
    const nodeRad = i * 1.35 + 0.3;
    const inc = i % 2 === 0 ? 28.5 : 63.4;
    const p = computeOrbitVec(_earthCenterVec, earthRadiusScene, inc, nodeRad, theta, 0);
    earthSats.push({
      id: `earth-sat-${i + 1}`,
      label: `EarthRelay-${i + 1}`,
      kind: 'EARTH_SAT',
      position: [p.x, p.y, p.z],
      active: false,
      variant: i,
    });
  }

  // 5. Route Selection Solver
  const canSee = (a: NodeSnapshot, b: NodeSnapshot) =>
    hasLineOfSight(
      new THREE.Vector3(...a.position),
      new THREE.Vector3(...b.position),
      a.normal ? new THREE.Vector3(...a.normal) : undefined,
      b.normal ? new THREE.Vector3(...b.normal) : undefined,
      4,
    );

  let selectedHops: CommsHop[] = [];
  let blockedPreviewHop: CommsHop | null = null;

  // Candidate strategies ordered cleanly per routingMode
  const tryFullFourHop = (): boolean => {
    for (const lSat of lunarSats) {
      if (!canSee(roverNode, lSat)) continue;
      for (const eSat of earthSats) {
        if (!canSee(lSat, eSat)) continue;
        for (const dish of dsnDishes) {
          if (!canSee(eSat, dish)) continue;
          lSat.active = true;
          eSat.active = true;
          dish.active = true;
          selectedHops = [
            makeHop(roverNode, lSat, cfg, true),
            makeHop(lSat, eSat, cfg, true),
            makeHop(eSat, dish, cfg, true),
          ];
          return true;
        }
      }
    }
    return false;
  };

  const tryLunarSatToDsn = (): boolean => {
    for (const lSat of lunarSats) {
      if (!canSee(roverNode, lSat)) continue;
      for (const dish of dsnDishes) {
        if (!canSee(lSat, dish)) continue;
        lSat.active = true;
        dish.active = true;
        selectedHops = [
          makeHop(roverNode, lSat, cfg, true),
          makeHop(lSat, dish, cfg, true),
        ];
        return true;
      }
    }
    return false;
  };

  const tryDirectDte = (): boolean => {
    for (const dish of dsnDishes) {
      if (!canSee(roverNode, dish)) continue;
      dish.active = true;
      selectedHops = [makeHop(roverNode, dish, cfg, true)];
      return true;
    }
    return false;
  };

  let routed = false;
  if (cfg.routingMode === 'DIRECT_TO_EARTH') {
    routed = tryDirectDte();
  } else if (cfg.routingMode === 'LUNAR_SAT_TO_DSN') {
    routed = tryLunarSatToDsn();
  } else {
    // AUTO_RELAY: prioritize full Rover -> Lunar Sat -> Earth Sat -> DSN Dish when Earth sats exist,
    // falling back to Lunar Sat -> DSN Dish, then Direct-to-Earth.
    routed =
      (earthSats.length > 0 && tryFullFourHop()) ||
      tryLunarSatToDsn() ||
      tryDirectDte();
  }

  // If currently occluded/blacked out, construct a dashed blocked preview hop so user sees WHY it's blocked
  let statusDetail = '';
  if (!routed) {
    if (dsnDishes.length === 0) {
      statusDetail = 'Enable at least one Earth Base DSN Dish to receive telemetry.';
    } else if (cfg.routingMode === 'DIRECT_TO_EARTH') {
      const targetDish = dsnDishes[0]!;
      blockedPreviewHop = makeHop(roverNode, targetDish, cfg, false, 'Planet / horizon occlusion');
      statusDetail = `${roverNode.label} lacks direct Moon-to-Earth line of sight to ${targetDish.label}. Switch to Auto Multi-Hop Relay or add Lunar Satellites.`;
    } else if (lunarSats.length === 0) {
      const targetDish = dsnDishes[0]!;
      blockedPreviewHop = makeHop(roverNode, targetDish, cfg, false, 'No lunar relay overhead');
      statusDetail = 'Direct Earth LOS blocked and 0 Lunar Satellites deployed. Increase Lunar Relays.';
    } else {
      const nearestLunarSat = lunarSats[0]!;
      blockedPreviewHop = makeHop(roverNode, nearestLunarSat, cfg, false, 'Waiting for orbital pass (DTN queued)');
      statusDetail = `DTN Store-and-Forward buffering: waiting for ${lunarSats[0]!.label} or ${dsnDishes[0]!.label} to rotate into view.`;
    }
  } else {
    statusDetail = `Active ${spec.label} link established across ${selectedHops.length} hop${selectedHops.length > 1 ? 's' : ''}.`;
  }

  const totalDelaySec = Number(
    (selectedHops.reduce((acc, h) => acc + h.latencyMs, 0) / 1000).toFixed(3),
  );
  const effectiveRateMbps =
    selectedHops.length > 0 ? Math.min(...selectedHops.map((h) => h.rateMbps)) : 0;
  const minSnrDb =
    selectedHops.length > 0 ? Math.min(...selectedHops.map((h) => h.snrDb)) : 0;

  const routePathText =
    selectedHops.length > 0
      ? [selectedHops[0]!.fromLabel, ...selectedHops.map((h) => h.toLabel)].join('  →  ')
      : blockedPreviewHop
        ? `${blockedPreviewHop.fromLabel}  ✕  ${blockedPreviewHop.toLabel} (Blocked)`
        : 'No Active Ground Station';

  const linkStateLabel: CommsFrameState['linkStateLabel'] =
    dsnDishes.length === 0
      ? 'NO SATELLITE / DISH ACTIVE'
      : routed
        ? 'END-TO-END LINK UP'
        : 'DTN BUFFERING (LOS BLOCKED)';

  return {
    simTimeSec,
    earthSpinRad,
    rovers: [roverNode],
    lunarSats,
    earthSats,
    dsnDishes,
    activeHops: selectedHops,
    blockedPreviewHop,
    linkUp: routed,
    linkStateLabel,
    routePathText,
    totalDelaySec,
    effectiveRateMbps,
    minSnrDb,
    statusDetail,
  };
}
