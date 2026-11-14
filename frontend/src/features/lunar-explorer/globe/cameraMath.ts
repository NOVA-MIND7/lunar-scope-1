import { Vector3 } from 'three';
import { DEFAULT_DISTANCE, DEFAULT_VIEW, MAX_DISTANCE, MIN_DISTANCE, POLAR_MARGIN, SOUTH_POLE_VIEW } from './constants';
import { latLonToVector3, vector3ToLatLon } from '@/utils/lunarCoordinates';

export const clampDistance = (d: number) => Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, d));

/** Keeps a camera direction away from the poles (where OrbitControls degenerates). Returns a unit vector. */
export function clampPolar(dir: Vector3): Vector3 {
  const d = dir.clone().normalize();
  const polar = Math.acos(Math.max(-1, Math.min(1, d.y)));
  const clamped = Math.min(Math.PI - POLAR_MARGIN, Math.max(POLAR_MARGIN, polar));
  if (clamped === polar) return d;
  let hx = d.x, hz = d.z;
  const hl = Math.hypot(hx, hz);
  if (hl < 1e-9) {
    hx = 0;
    hz = 1;
  } else {
    hx /= hl;
    hz /= hl;
  }
  const s = Math.sin(clamped);
  return new Vector3(hx * s, Math.cos(clamped), hz * s);
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export interface CameraGoal {
  direction: Vector3;
  distance: number;
  /** Where the camera looks; the origin unless the goal keeps the current pan (zoom). */
  target: Vector3;
}

/** Default (reset) camera goal. */
export const resetGoal = (): CameraGoal => ({
  direction: clampPolar(latLonToVector3(DEFAULT_VIEW.latitude_deg, DEFAULT_VIEW.longitude_deg)),
  distance: DEFAULT_DISTANCE,
  target: new Vector3(),
});

export const southPoleGoal = (): CameraGoal => ({
  direction: clampPolar(latLonToVector3(SOUTH_POLE_VIEW.latitude_deg, SOUTH_POLE_VIEW.longitude_deg)),
  distance: SOUTH_POLE_VIEW.distance,
  target: new Vector3(),
});

/** Centre a location in view. Never moves the camera farther away than it already is, unless a distance is given. */
export function focusGoal(lat: number, lon: number, currentDistance: number, distance?: number): CameraGoal {
  return {
    direction: clampPolar(latLonToVector3(lat, lon)),
    distance: clampDistance(distance ?? Math.min(currentDistance, 2.6)),
    target: new Vector3(),
  };
}

/** Sub-camera point (the surface location the camera is directly above). */
export function viewCenter(cameraPosition: Vector3) {
  return vector3ToLatLon(cameraPosition);
}
