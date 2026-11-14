/**
 * LUNAR COORDINATE CONVENTION (single source of truth for the whole application)
 * ===========================================================================
 *
 * Geographic (selenographic) coordinates
 *   - Planetocentric latitude, degrees, -90 (south pole) .. +90 (north pole).
 *   - Longitude, degrees, EAST-POSITIVE (IAU/NASA convention for the Moon), normalised to (-180, 180].
 *   - Prime meridian (0°) passes through the mean sub-Earth point. The geometry is a sphere of
 *     MEAN_LUNAR_RADIUS_KM; flattening is ignored (the Moon is within ~0.1 % of a sphere).
 *   - This is a mean-Earth / mean-rotation-axis (ME) style body-fixed frame. It does not model
 *     libration; a SPICE Moon frame replaces it when the ephemeris engine arrives.
 *
 * Three.js scene frame (body-fixed, never rotated; the camera orbits instead)
 *   - +Y  = lunar north pole (rotation axis)
 *   - +Z  = (lat 0°, lon 0°)   -> faces the default camera
 *   - +X  = (lat 0°, lon +90°) -> east is to the RIGHT when viewed from outside with north up
 *   - Unit length = one lunar radius.
 *
 *   x = r cos(lat) sin(lon)
 *   y = r sin(lat)
 *   z = r cos(lat) cos(lon)
 *
 * Equirectangular textures: u = (lon + 180) / 360, v = (lat + 90) / 180 (v = 1 at the north pole).
 * Three's SphereGeometry puts u = 0.5 on +X, so the surface mesh must be rotated about Y by
 * TEXTURE_YAW (= -90°); utils/lunarCoordinates.test.ts verifies this against real SphereGeometry data.
 */
import { Vector3 } from 'three';
import type { LandingSite, LunarCoordinates, SiteRegion } from '@/types';

export const MEAN_LUNAR_RADIUS_KM = 1737.4;
/** Rotation (radians, about +Y) applied to the textured sphere so texture longitudes match this convention. */
export const TEXTURE_YAW = -Math.PI / 2;

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Wrap a longitude into (-180, 180]. 180 and -180 both map to 180. */
export function normalizeLongitude(longitudeDeg: number): number {
  if (!Number.isFinite(longitudeDeg)) throw new RangeError(`Longitude must be finite, got ${longitudeDeg}`);
  let lon = ((((longitudeDeg + 180) % 360) + 360) % 360) - 180; // [-180, 180)
  if (lon === -180) lon = 180;
  return lon === 0 ? 0 : lon; // avoid -0
}

export function isValidLatitude(latitudeDeg: number): boolean {
  return Number.isFinite(latitudeDeg) && latitudeDeg >= -90 && latitudeDeg <= 90;
}

/** Geographic -> scene vector (see convention above). Latitude must be within [-90, 90]. */
export function latLonToVector3(latitudeDeg: number, longitudeDeg: number, radius = 1): Vector3 {
  if (!isValidLatitude(latitudeDeg)) throw new RangeError(`Latitude must be within [-90, 90], got ${latitudeDeg}`);
  const lat = latitudeDeg * DEG;
  const lon = normalizeLongitude(longitudeDeg) * DEG;
  const cosLat = Math.cos(lat);
  return new Vector3(radius * cosLat * Math.sin(lon), radius * Math.sin(lat), radius * cosLat * Math.cos(lon));
}

/** Scene vector (any non-zero length) -> geographic coordinates. Longitude is 0 at the poles. */
export function vector3ToLatLon(position: Vector3): LunarCoordinates {
  const len = position.length();
  if (len === 0) throw new RangeError('Cannot derive coordinates from the zero vector');
  const lat = Math.asin(Math.max(-1, Math.min(1, position.y / len))) * RAD;
  const lon = Math.atan2(position.x, position.z) * RAD;
  const atPole = Math.abs(position.x) < 1e-12 * len && Math.abs(position.z) < 1e-12 * len;
  return { latitude_deg: lat, longitude_deg: atPole ? 0 : normalizeLongitude(lon) };
}

/** Outward unit surface normal at a location (identical to the unit position vector on a sphere). */
export function surfaceNormal(latitudeDeg: number, longitudeDeg: number): Vector3 {
  return latLonToVector3(latitudeDeg, longitudeDeg, 1);
}

/** Local tangent directions at a location: east (increasing longitude) and north (increasing latitude). */
export function surfaceTangents(latitudeDeg: number, longitudeDeg: number): { east: Vector3; north: Vector3; up: Vector3 } {
  const up = surfaceNormal(latitudeDeg, longitudeDeg);
  const lat = latitudeDeg * DEG;
  const lon = normalizeLongitude(longitudeDeg) * DEG;
  const east = new Vector3(Math.cos(lon), 0, -Math.sin(lon));
  const north = new Vector3(-Math.sin(lat) * Math.sin(lon), Math.cos(lat), -Math.sin(lat) * Math.cos(lon));
  return { east, north, up };
}

/** Round to 4 decimals (~3 m). Both globe clicks and typed input go through this so they agree exactly. */
export const COORDINATE_DECIMALS = 4;

/**
 * Canonical form for any user-chosen location: valid latitude, longitude in (-180, 180], rounded,
 * and longitude fixed to 0 at the poles where it is undefined.
 */
export function canonicalCoordinates(latitudeDeg: number, longitudeDeg: number): LunarCoordinates {
  if (!isValidLatitude(latitudeDeg)) throw new RangeError(`Latitude must be within [-90, 90], got ${latitudeDeg}`);
  const f = 10 ** COORDINATE_DECIMALS;
  const round = (n: number) => {
    const r = Math.round(n * f) / f;
    return r === 0 ? 0 : r;
  };
  const lat = round(latitudeDeg);
  const atPole = Math.abs(lat) === 90;
  return { latitude_deg: lat, longitude_deg: atPole ? 0 : round(normalizeLongitude(longitudeDeg)) };
}

/** Coarse region label. Mirrors backend classify_region. */
export function classifyRegion(latitudeDeg: number, longitudeDeg: number): SiteRegion {
  if (latitudeDeg >= 80) return 'north-pole';
  if (latitudeDeg <= -80) return 'south-pole';
  if (Math.abs(latitudeDeg) < 10) return 'equatorial';
  return Math.abs(longitudeDeg) > 90 ? 'far-side' : 'near-side';
}

/** Build the LandingSite record for a user-chosen point. Globe clicks and typed input both use this. */
export function createCustomSite(latitudeDeg: number, longitudeDeg: number): LandingSite {
  const coordinates = canonicalCoordinates(latitudeDeg, longitudeDeg);
  return {
    id: `custom-${coordinates.latitude_deg.toFixed(4)}_${coordinates.longitude_deg.toFixed(4)}`,
    name: 'Custom location',
    region: classifyRegion(coordinates.latitude_deg, coordinates.longitude_deg),
    category: 'custom',
    precision: 'site',
    coordinates,
    provenance: 'user',
    description: 'A point chosen by the user. It is a selected location, not a vetted or surveyed landing site.',
  };
}

/** Great-circle angular distance between two locations, in degrees. */
export function angularDistanceDeg(a: LunarCoordinates, b: LunarCoordinates): number {
  const va = latLonToVector3(a.latitude_deg, a.longitude_deg);
  const vb = latLonToVector3(b.latitude_deg, b.longitude_deg);
  return va.angleTo(vb) * RAD;
}
