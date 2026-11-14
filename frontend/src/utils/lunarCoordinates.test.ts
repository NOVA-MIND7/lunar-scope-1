import { describe, expect, it } from 'vitest';
import { Matrix4, SphereGeometry, Vector3 } from 'three';
import {
  angularDistanceDeg,
  canonicalCoordinates,
  classifyRegion,
  createCustomSite,
  latLonToVector3,
  normalizeLongitude,
  surfaceTangents,
  TEXTURE_YAW,
  vector3ToLatLon,
} from './lunarCoordinates';

const close = (v: Vector3, x: number, y: number, z: number) => {
  expect(v.x).toBeCloseTo(x, 9);
  expect(v.y).toBeCloseTo(y, 9);
  expect(v.z).toBeCloseTo(z, 9);
};

describe('latLonToVector3', () => {
  it('maps (0°, 0°) to +Z, facing the default camera', () => close(latLonToVector3(0, 0), 0, 0, 1));
  it('maps the north pole to +Y', () => close(latLonToVector3(90, 0), 0, 1, 0));
  it('maps the south pole to -Y', () => close(latLonToVector3(-90, 0), 0, -1, 0));
  it('puts positive (east) longitudes on +X and negative (west) on -X', () => {
    close(latLonToVector3(0, 90), 1, 0, 0);
    close(latLonToVector3(0, -90), -1, 0, 0);
    close(latLonToVector3(0, 180), 0, 0, -1);
  });
  it('scales with radius', () => expect(latLonToVector3(33, 44, 2.5).length()).toBeCloseTo(2.5, 12));
  it('rejects invalid latitudes', () => {
    expect(() => latLonToVector3(91, 0)).toThrow(RangeError);
    expect(() => latLonToVector3(NaN, 0)).toThrow(RangeError);
  });
  it('ignores longitude at the poles', () => {
    close(latLonToVector3(90, 123), 0, 1, 0);
  });
});

describe('vector3ToLatLon', () => {
  it('inverts known points', () => {
    expect(vector3ToLatLon(new Vector3(0, 0, 1))).toEqual({ latitude_deg: 0, longitude_deg: 0 });
    expect(vector3ToLatLon(new Vector3(1, 0, 0))).toEqual({ latitude_deg: 0, longitude_deg: 90 });
    expect(vector3ToLatLon(new Vector3(-1, 0, 0))).toEqual({ latitude_deg: 0, longitude_deg: -90 });
    expect(vector3ToLatLon(new Vector3(0, 0, -1))).toEqual({ latitude_deg: 0, longitude_deg: 180 });
  });
  it('handles the poles with longitude 0', () => {
    expect(vector3ToLatLon(new Vector3(0, 1, 0))).toEqual({ latitude_deg: 90, longitude_deg: 0 });
    expect(vector3ToLatLon(new Vector3(0, -3, 0))).toEqual({ latitude_deg: -90, longitude_deg: 0 });
  });
  it('is independent of vector length', () => {
    const a = vector3ToLatLon(latLonToVector3(-45, 100, 1));
    const b = vector3ToLatLon(latLonToVector3(-45, 100, 7));
    expect(a.latitude_deg).toBeCloseTo(b.latitude_deg, 9);
    expect(a.longitude_deg).toBeCloseTo(b.longitude_deg, 9);
  });
  it('round-trips a global grid', () => {
    for (let lat = -90; lat <= 90; lat += 7.5)
      for (let lon = -175; lon <= 180; lon += 12.5) {
        const back = vector3ToLatLon(latLonToVector3(lat, lon, 3));
        expect(back.latitude_deg).toBeCloseTo(lat, 9);
        if (Math.abs(lat) < 90) expect(back.longitude_deg).toBeCloseTo(lon, 9);
      }
  });
  it('rejects the zero vector', () => expect(() => vector3ToLatLon(new Vector3())).toThrow(RangeError));
});

describe('normalizeLongitude', () => {
  it.each([
    [0, 0], [45, 45], [-45, -45], [180, 180], [-180, 180], [181, -179], [-181, 179], [190, -170],
    [-190, 170], [360, 0], [-360, 0], [540, 180], [720, 0], [359.5, -0.5],
  ])('%d -> %d', (input, expected) => expect(normalizeLongitude(input)).toBe(expected));
  it('rejects non-finite input', () => expect(() => normalizeLongitude(Infinity)).toThrow(RangeError));
});

describe('local frame', () => {
  it('east points toward increasing longitude and north toward increasing latitude', () => {
    const { east, north, up } = surfaceTangents(0, 0);
    close(east, 1, 0, 0);
    close(north, 0, 1, 0);
    close(up, 0, 0, 1);
  });
  it('tangents are orthonormal everywhere', () => {
    for (const [lat, lon] of [[10, 20], [-80, 150], [45, -120]] as const) {
      const { east, north, up } = surfaceTangents(lat, lon);
      expect(east.dot(north)).toBeCloseTo(0, 12);
      expect(east.dot(up)).toBeCloseTo(0, 12);
      expect(north.dot(up)).toBeCloseTo(0, 12);
      expect(east.clone().cross(north).dot(up)).toBeCloseTo(1, 12);
    }
  });
});

describe('texture orientation', () => {
  it('SphereGeometry UVs, after TEXTURE_YAW, land on the same point as latLonToVector3', () => {
    const geometry = new SphereGeometry(1, 48, 24);
    const pos = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    const yaw = new Matrix4().makeRotationY(TEXTURE_YAW);
    let checked = 0;
    for (let i = 0; i < pos.count; i += 7) {
      const lat = (uv.getY(i) - 0.5) * 180; // equirectangular: v = 1 at the north pole
      const lon = uv.getX(i) * 360 - 180; //  u = 0.5 at lon 0
      const actual = new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(yaw);
      const expected = latLonToVector3(lat, lon);
      expect(actual.distanceTo(expected)).toBeLessThan(1e-6);
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
    geometry.dispose();
  });
});

describe('custom locations', () => {
  it('canonicalises to 4 decimals, wraps longitude, and fixes longitude at the poles', () => {
    expect(canonicalCoordinates(12.345678, 190.123456)).toEqual({ latitude_deg: 12.3457, longitude_deg: -169.8765 });
    expect(canonicalCoordinates(-90, 45)).toEqual({ latitude_deg: -90, longitude_deg: 0 });
    expect(canonicalCoordinates(90, -45)).toEqual({ latitude_deg: 90, longitude_deg: 0 });
    expect(() => canonicalCoordinates(90.0001, 0)).toThrow(RangeError);
  });
  it('typed coordinates and a globe click at the same place produce the identical site', () => {
    const typed = createCustomSite(-33.3333, 120.5);
    const v = latLonToVector3(-33.3333, 120.5, 1.0); // what a raycast hit on the sphere returns
    const click = vector3ToLatLon(v);
    expect(createCustomSite(click.latitude_deg, click.longitude_deg)).toEqual(typed);
  });
  it('classifies regions and measures angular distance', () => {
    expect(classifyRegion(-85, 10)).toBe('south-pole');
    expect(classifyRegion(0.5, 23)).toBe('equatorial');
    expect(classifyRegion(40, 150)).toBe('far-side');
    expect(classifyRegion(40, 20)).toBe('near-side');
    expect(angularDistanceDeg({ latitude_deg: 0, longitude_deg: 0 }, { latitude_deg: 0, longitude_deg: 90 })).toBeCloseTo(90, 9);
    expect(angularDistanceDeg({ latitude_deg: 90, longitude_deg: 0 }, { latitude_deg: -90, longitude_deg: 0 })).toBeCloseTo(180, 9);
  });
});
