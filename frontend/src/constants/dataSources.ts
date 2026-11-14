import type { DataQuality } from '@/types';

export interface DataSourceEntry {
  id: string;
  name: string;
  purpose: string;
  provider: string;
  status: DataQuality;
  note: string;
}

/** Mirrors docs/DATA_SOURCES.md. Update both together. */
export const DATA_SOURCES: readonly DataSourceEntry[] = [
  { id: 'sites', name: 'Landing-site metadata', purpose: 'Candidate sites and approximate coordinates', provider: 'Hand-entered sample records', status: 'sample', note: 'Approximate coordinates; replace with cited catalogue values.' },
  { id: 'ephemeris', name: 'Planetary ephemerides', purpose: 'Sun and Earth positions', provider: 'JPL DE series via Skyfield (planned)', status: 'unavailable', note: 'Not integrated.' },
  { id: 'orientation', name: 'Lunar orientation', purpose: 'Moon-fixed frame and libration', provider: 'NAIF lunar PCK / frame kernels (planned)', status: 'unavailable', note: 'Not integrated.' },
  { id: 'dem', name: 'Elevation model (DEM)', purpose: 'Terrain horizon and slopes', provider: 'LRO LOLA gridded products (planned)', status: 'unavailable', note: 'Not integrated.' },
  { id: 'textures', name: 'Surface textures', purpose: '3D Moon rendering', provider: 'NASA SVS / LRO imagery (planned)', status: 'unavailable', note: 'None bundled; licence check required.' },
] as const;
