import type { LandingSite, LocationPrecision, SiteCategory } from '@/types';
import { CATEGORY_STYLE } from './constants';

/** Render model for one marker. */
export interface MarkerModel {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: SiteCategory;
  precision: LocationPrecision;
  color: string;
  selected: boolean;
}

export function toMarkerModel(site: LandingSite, selectedId: string | null): MarkerModel {
  return {
    id: site.id,
    name: site.name,
    latitude: site.coordinates.latitude_deg,
    longitude: site.coordinates.longitude_deg,
    category: site.category,
    precision: site.precision,
    color: CATEGORY_STYLE[site.category].color,
    selected: site.id === selectedId,
  };
}
