import { latLonToVector3 } from '@/utils/lunarCoordinates';

export interface GridSpec {
  parallels: number[]; // latitudes (deg)
  meridians: number[]; // longitudes (deg)
  /** Latitude span drawn for each meridian. */
  meridianLatRange?: [number, number];
  /** Longitude sampling step along parallels, degrees. */
  step?: number;
  radius?: number;
}

/** Line-segment positions (pairs of xyz) for a lat/lon grid on a sphere, in the scene frame. */
export function buildGridPositions(spec: GridSpec): Float32Array {
  const { parallels, meridians, meridianLatRange = [-90, 90], step = 3, radius = 1.0015 } = spec;
  const out: number[] = [];
  const push = (lat: number, lon: number) => {
    const v = latLonToVector3(lat, lon, radius);
    out.push(v.x, v.y, v.z);
  };
  for (const lat of parallels) {
    for (let lon = -180; lon < 180; lon += step) {
      push(lat, lon);
      push(lat, lon + step);
    }
  }
  const [lo, hi] = meridianLatRange;
  for (const lon of meridians) {
    for (let lat = lo; lat < hi; lat += step) {
      push(lat, lon);
      push(Math.min(hi, lat + step), lon);
    }
  }
  return new Float32Array(out);
}

const range = (from: number, to: number, step: number) => {
  const r: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) r.push(v);
  return r;
};

/** Standard layers: subtle 30° grid, highlighted equator/prime meridian, and a dense south polar grid. */
export const GRID_LAYERS = {
  minor: { parallels: [-60, -30, 30, 60], meridians: range(-150, 180, 30).filter((l) => l !== 0 && l !== 180) },
  major: { parallels: [0], meridians: [0, 180] },
  southPolar: {
    parallels: [-82, -84, -86, -88],
    meridians: range(-180, 165, 15),
    meridianLatRange: [-90, -75] as [number, number],
    step: 1.5,
    radius: 1.002,
  },
} satisfies Record<string, GridSpec>;
