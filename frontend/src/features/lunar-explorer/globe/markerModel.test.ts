import { describe, expect, it } from 'vitest';
import { toMarkerModel } from './markerModel';
import { CATEGORY_STYLE } from './constants';
import type { LandingSite } from '@/types';

const site: LandingSite = {
  id: 'a17', name: 'Apollo 17', region: 'near-side', category: 'historical', precision: 'site',
  coordinates: { latitude_deg: 20.19, longitude_deg: 30.77 }, provenance: 'sample', description: 'x',
};

describe('toMarkerModel', () => {
  it('carries id, name, lat, lon, category, colour and selection status', () => {
    const m = toMarkerModel(site, 'a17');
    expect(m).toMatchObject({ id: 'a17', name: 'Apollo 17', latitude: 20.19, longitude: 30.77, category: 'historical', selected: true });
    expect(m.color).toBe(CATEGORY_STYLE.historical.color);
  });
  it('is not selected for another id or none', () => {
    expect(toMarkerModel(site, 'x').selected).toBe(false);
    expect(toMarkerModel(site, null).selected).toBe(false);
  });
  it('keeps the precision so regional targets are never shown as exact', () => {
    expect(toMarkerModel({ ...site, precision: 'regional' }, null).precision).toBe('regional');
  });
});
