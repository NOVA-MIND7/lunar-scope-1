import type { SiteCategory } from '@/types';

export const MIN_DISTANCE = 1.05; // ~87 km above the surface: close enough to inspect craters
export const MAX_DISTANCE = 8;
export const DEFAULT_DISTANCE = 3.4;
export const DEFAULT_VIEW = { latitude_deg: 10, longitude_deg: 0 };
/** Keep the camera this far (radians) from the poles so OrbitControls never hits its singularity. */
export const POLAR_MARGIN = 0.02;
export const MAX_PAN = 0.8;

export const SOUTH_POLE_VIEW = { latitude_deg: -86, longitude_deg: 0, distance: 2.6 };
/** Illustrative boundary of the "south polar region" overlay. Not a formal definition. */
export const SOUTH_POLAR_REGION_LAT = -80;

/**
 * ILLUSTRATIVE sun direction (scene frame, from the Moon towards the Sun). It is NOT computed from an
 * ephemeris. The lighting component takes this as a prop so the astronomy engine can replace it later.
 */
export const ILLUSTRATIVE_SUN = {
  direction: [0.55, 0.25, 0.8] as [number, number, number],
  visible: true,
  intensity: 3.4,
};

export const CATEGORY_STYLE: Record<SiteCategory, { label: string; color: string; plural: string }> = {
  historical: { label: 'Historical mission site', plural: 'Historical mission sites', color: '#FFB547' },
  'candidate-region': { label: 'Candidate region', plural: 'Candidate landing regions', color: '#00D9FF' },
  clps: { label: 'CLPS-related target', plural: 'CLPS-related target regions', color: '#42D392' },
  custom: { label: 'Custom location', plural: 'Custom user locations', color: '#B388FF' },
};

export const CATEGORY_ORDER: SiteCategory[] = ['historical', 'candidate-region', 'clps', 'custom'];

export const PRECISION_NOTE = {
  site: null,
  approximate: 'Approximate coordinates of a specific site.',
  regional: 'Approximate centre of a region. This is not a landing coordinate.',
} as const;

export const PENDING_COLOR = '#F4F7FC';
