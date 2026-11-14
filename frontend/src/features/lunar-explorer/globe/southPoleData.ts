import type { LunarCoordinates } from '@/types';

export interface SouthPoleFeatureData {
  id: string;
  name: string;
  coordinates: LunarCoordinates;
  classification: string;
  waterIceProbability: number; // 0 - 100 %
  waterIceWtPercent: number; // weight percent
  temperatureK: { min: number; max: number };
  laserElevationM: number; // LOLA surface elevation in meters
  slopeDeg: number;
  solarIlluminationPercent: number; // peak illumination window
  earthVisibilityPercent: number; // direct line-of-sight to Earth
  scientificSignificance: string;
  instrumentsDetected: string[];
}

export const SOUTH_POLE_FEATURES: SouthPoleFeatureData[] = [
  {
    id: 'shackleton',
    name: 'Shackleton Crater',
    coordinates: { latitude_deg: -89.9, longitude_deg: 0.0 },
    classification: 'Permanently Shadowed Region (PSR) / Peak of Eternal Light Rim',
    waterIceProbability: 86,
    waterIceWtPercent: 5.8,
    temperatureK: { min: 38, max: 215 },
    laserElevationM: -4200,
    slopeDeg: 28,
    solarIlluminationPercent: 88,
    earthVisibilityPercent: 94,
    scientificSignificance:
      'Ultra-cold cryogenic trap with confirmed hydrogen enrichment in floor; rim peaks offer almost continuous sunlight and direct Earth communication.',
    instrumentsDetected: ['LEND Neutron Spectrometer', 'LOLA Laser Altimeter', 'Diviner Thermal Radiometer', 'Mini-RF Synthetic Aperture Radar'],
  },
  {
    id: 'malapert-massif',
    name: 'Malapert Massif',
    coordinates: { latitude_deg: -85.9, longitude_deg: 0.1 },
    classification: 'High-Elevation Mountain Ridge / Artemis Landing Candidate',
    waterIceProbability: 38,
    waterIceWtPercent: 2.1,
    temperatureK: { min: 195, max: 230 },
    laserElevationM: 5100,
    slopeDeg: 7,
    solarIlluminationPercent: 91,
    earthVisibilityPercent: 96,
    scientificSignificance:
      'Towering 5 km plateau with prime line-of-sight to Earth for high-bandwidth telemetry and highest sustained solar power potential at the South Pole.',
    instrumentsDetected: ['LOLA Topographic Profiler', 'LROC Narrow Angle Camera', 'Diviner Thermal Mapper'],
  },
  {
    id: 'cabeus',
    name: 'Cabeus Crater',
    coordinates: { latitude_deg: -84.9, longitude_deg: -35.5 },
    classification: 'LCROSS Impact Confirmed Water-Ice Depository',
    waterIceProbability: 94,
    waterIceWtPercent: 5.6,
    temperatureK: { min: 42, max: 190 },
    laserElevationM: -3850,
    slopeDeg: 22,
    solarIlluminationPercent: 12,
    earthVisibilityPercent: 48,
    scientificSignificance:
      'Site of NASA LCROSS kinetic impact; direct spectral observation confirmed water vapor, ice grains, hydroxyl, and light hydrocarbons in the ejecta plume.',
    instrumentsDetected: ['LCROSS Near-IR Spectrometer', 'LEND Epithermal Neutron Detector', 'LAMP UV Spectrograph'],
  },
  {
    id: 'faustini',
    name: 'Faustini Crater',
    coordinates: { latitude_deg: -87.3, longitude_deg: 77.0 },
    classification: 'Cryogenic Deep Cold Trap',
    waterIceProbability: 79,
    waterIceWtPercent: 4.4,
    temperatureK: { min: 35, max: 195 },
    laserElevationM: -3400,
    slopeDeg: 24,
    solarIlluminationPercent: 76,
    earthVisibilityPercent: 70,
    scientificSignificance:
      'Deep south-polar crater interior sustained below 40 K over billions of years, capable of locking in pristine primordial cometary and asteroidal volatiles.',
    instrumentsDetected: ['Diviner Cryogenic Sensors', 'LOLA Altimeter', 'Mini-RF Polarimetry'],
  },
  {
    id: 'nobile',
    name: 'Nobile Crater',
    coordinates: { latitude_deg: -85.2, longitude_deg: 53.3 },
    classification: 'VIPER Polar Rover Exploration Target',
    waterIceProbability: 72,
    waterIceWtPercent: 3.9,
    temperatureK: { min: 45, max: 185 },
    laserElevationM: -2900,
    slopeDeg: 15,
    solarIlluminationPercent: 68,
    earthVisibilityPercent: 84,
    scientificSignificance:
      'Accessible micro-cold traps interspersed with gently sloping illuminated ridges, ideal for surface mobile exploration and shallow regolith core sampling.',
    instrumentsDetected: ['LEND Neutron Sensor', 'NIRVSS Spectrometer', 'LOLA Terrain Mapping'],
  },
  {
    id: 'de-gerlache',
    name: 'de Gerlache Crater',
    coordinates: { latitude_deg: -88.5, longitude_deg: -87.1 },
    classification: 'Connecting Ridge / Cold Trap System',
    waterIceProbability: 81,
    waterIceWtPercent: 4.8,
    temperatureK: { min: 39, max: 205 },
    laserElevationM: -3100,
    slopeDeg: 26,
    solarIlluminationPercent: 82,
    earthVisibilityPercent: 88,
    scientificSignificance:
      'Steep shadowed crater adjacent to the Shackleton-de Gerlache connecting ridge, identified as key Artemis transit corridor with long solar illumination periods.',
    instrumentsDetected: ['LOLA Altimeter', 'ShadowCam Optical Imager', 'Diviner Radiometer'],
  },
];
