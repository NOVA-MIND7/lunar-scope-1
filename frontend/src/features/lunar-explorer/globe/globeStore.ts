import { create } from 'zustand';
import { Vector3 } from 'three';
import type { LunarCoordinates, SiteCategory } from '@/types';
import { useAppStore } from '@/stores/appStore';
import { canonicalCoordinates, createCustomSite, vector3ToLatLon } from '@/utils/lunarCoordinates';
import { MAX_DISTANCE } from './constants';
import type { MoonTextureSource } from './moonTextureConfig';
import { SOUTH_POLE_FEATURES, type SouthPoleFeatureData } from './southPoleData';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export interface SatelliteTelemetry {
  latitude_deg: number;
  longitude_deg: number;
  altitude_km: number;
  speed_kms: number;
  isOverSouthPole: boolean;
  targetRegion: string;
}

export type CameraCommand = { id: number } & (
  | { kind: 'reset' }
  | { kind: 'southPole' }
  | { kind: 'focus'; latitude_deg: number; longitude_deg: number; distance?: number }
  | { kind: 'zoom'; factor: number }
);

export interface CameraReadout {
  distance: number;
  centerLatitude: number;
  centerLongitude: number;
  panOffset: number;
}

interface GlobeState {
  showGrid: boolean;
  showMarkers: boolean;
  southPoleMode: boolean;
  visibleCategories: Record<SiteCategory, boolean>;
  hoveredSiteId: string | null;
  /** Surface point under the mouse pointer. */
  cursor: LunarCoordinates | null;
  /** Picked (clicked or typed) but not yet confirmed location. */
  pending: LunarCoordinates | null;
  camera: CameraReadout;
  command: CameraCommand | null;
  textureSource: MoonTextureSource | null;
  /** Cassini 3D Satellite & Reconnaissance state */
  showSatellite: boolean;
  showOrbitPath: boolean;
  showScanBeam: boolean;
  satelliteSpeed: number;
  satelliteTelemetry: SatelliteTelemetry;
  selectedSouthPoleFeature: SouthPoleFeatureData | null;
  isScanningSouthPole: boolean;
  showSatellitePanel: boolean;
  trackSatellite: boolean;
  selectedSatelliteId: 'cassini' | 'lro' | 'gateway';
  eclipseFactor: number;
  /** Sun 3D Celestial model and illumination rays */
  showSun: boolean;
  showSolarRays: boolean;
  /** Earth 3D Celestial model and planetary rotation */
  showEarth: boolean;
  autoRotate: boolean;
  planetaryRotationSpeed: number;
  focusTarget: 'moon' | 'earth' | 'sun';
  /** Mouse interaction mode for 3D Moon: rotate (orbit) vs pan (drag view) */
  interactionMode: 'rotate' | 'pan';
  resetPanelPositionsKey: number;
}

interface GlobeActions {
  toggleGrid: () => void;
  toggleMarkers: () => void;
  toggleCategory: (category: SiteCategory) => void;
  setHoveredSite: (id: string | null) => void;
  setCursor: (coords: LunarCoordinates | null) => void;
  /**
   * Picks a location. Globe clicks and typed coordinates both come through here, so they yield the
   * same canonical value. Also publishes it as the global selectedCoordinates.
   */
  setPending: (latitudeDeg: number, longitudeDeg: number, options?: { focus?: boolean }) => LunarCoordinates;
  clearPending: () => void;
  /** SELECT THIS LOCATION: promotes the pending point to the global selected landing site. */
  confirmPending: () => void;
  setCamera: (camera: CameraReadout) => void;
  issueCommand: (command: DistributiveOmit<CameraCommand, 'id'>) => void;
  enterSouthPole: () => void;
  exitSouthPole: () => void;
  setTextureSource: (source: MoonTextureSource | null) => void;
  resetTransient: () => void;
  /** Satellite actions */
  toggleSatellite: () => void;
  toggleOrbitPath: () => void;
  toggleScanBeam: () => void;
  setSatelliteSpeed: (speed: number) => void;
  setSatelliteTelemetry: (telemetry: Partial<SatelliteTelemetry>) => void;
  selectSouthPoleFeature: (feature: SouthPoleFeatureData | null) => void;
  setIsScanningSouthPole: (scanning: boolean) => void;
  toggleSatellitePanel: (show?: boolean) => void;
  setTrackSatellite: (track: boolean) => void;
  setSelectedSatelliteId: (id: 'cassini' | 'lro' | 'gateway') => void;
  setEclipseFactor: (factor: number) => void;
  focusSouthPoleAndSatellite: () => void;
  /** Sun actions */
  toggleSun: () => void;
  toggleSolarRays: () => void;
  alignWithSun: (direction?: readonly [number, number, number]) => void;
  /** Earth & Rotation actions */
  toggleEarth: () => void;
  toggleAutoRotate: () => void;
  setPlanetaryRotationSpeed: (speed: number) => void;
  alignWithEarth: () => void;
  setFocusTarget: (target: 'moon' | 'earth' | 'sun') => void;
  /** Mouse interaction actions */
  setInteractionMode: (mode: 'rotate' | 'pan') => void;
  toggleInteractionMode: () => void;
  resetPanelPositions: () => void;
}

let commandCounter = 0;

const INITIAL_CAMERA: CameraReadout = { distance: 3.4, centerLatitude: 10, centerLongitude: 0, panOffset: 0 };

const INITIAL_TELEMETRY: SatelliteTelemetry = {
  latitude_deg: -89.9,
  longitude_deg: 0.0,
  altitude_km: 260.0,
  speed_kms: 1.63,
  isOverSouthPole: true,
  targetRegion: 'Shackleton Crater / South Pole',
};

export const useGlobeStore = create<GlobeState & GlobeActions>()((set, get) => ({
  showGrid: true,
  showMarkers: true,
  southPoleMode: false,
  visibleCategories: { historical: true, 'candidate-region': true, clps: true, custom: true },
  hoveredSiteId: null,
  cursor: null,
  pending: null,
  camera: INITIAL_CAMERA,
  command: null,
  textureSource: null,

  showSatellite: true,
  showOrbitPath: true,
  showScanBeam: true,
  satelliteSpeed: 1.0,
  satelliteTelemetry: INITIAL_TELEMETRY,
  selectedSouthPoleFeature: SOUTH_POLE_FEATURES[0] ?? null,
  isScanningSouthPole: true,
  showSatellitePanel: false,
  trackSatellite: false,
  selectedSatelliteId: 'cassini',
  eclipseFactor: 0,
  showSun: true,
  showSolarRays: true,
  showEarth: true,
  autoRotate: true,
  planetaryRotationSpeed: 1.0,
  focusTarget: 'moon',
  interactionMode: 'rotate',
  resetPanelPositionsKey: 0,

  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleMarkers: () => set((s) => ({ showMarkers: !s.showMarkers })),
  toggleCategory: (category) =>
    set((s) => ({ visibleCategories: { ...s.visibleCategories, [category]: !s.visibleCategories[category] } })),
  setHoveredSite: (id) => set({ hoveredSiteId: id }),
  setCursor: (coords) => set({ cursor: coords }),

  setPending: (latitudeDeg, longitudeDeg, options) => {
    const coords = canonicalCoordinates(latitudeDeg, longitudeDeg);
    set({ pending: coords });
    useAppStore.getState().setSelectedCoordinates(coords);
    if (options?.focus) get().issueCommand({ kind: 'focus', ...coords });
    return coords;
  },
  clearPending: () => set({ pending: null }),
  confirmPending: () => {
    const { pending } = get();
    if (!pending) return;
    useAppStore.getState().selectLandingSite(createCustomSite(pending.latitude_deg, pending.longitude_deg));
    set({ pending: null });
  },

  setCamera: (camera) => set({ camera }),
  issueCommand: (command) => set({ command: { ...command, id: ++commandCounter } as CameraCommand }),

  enterSouthPole: () => {
    set({ southPoleMode: true, focusTarget: 'moon' });
    get().issueCommand({ kind: 'southPole' });
  },
  exitSouthPole: () => {
    set({ southPoleMode: false, focusTarget: 'moon' });
    get().issueCommand({ kind: 'reset' });
  },

  setTextureSource: (source) => set({ textureSource: source }),
  resetTransient: () =>
    set({ pending: null, cursor: null, hoveredSiteId: null, southPoleMode: false, command: null, camera: INITIAL_CAMERA }),

  toggleSatellite: () => set((s) => ({ showSatellite: !s.showSatellite })),
  toggleOrbitPath: () => set((s) => ({ showOrbitPath: !s.showOrbitPath })),
  toggleScanBeam: () => set((s) => ({ showScanBeam: !s.showScanBeam })),
  setSatelliteSpeed: (speed) => set({ satelliteSpeed: speed }),
  setSatelliteTelemetry: (telemetry) =>
    set((s) => ({ satelliteTelemetry: { ...s.satelliteTelemetry, ...telemetry } })),
  selectSouthPoleFeature: (feature) => set({ selectedSouthPoleFeature: feature }),
  setIsScanningSouthPole: (scanning) => set({ isScanningSouthPole: scanning }),
  toggleSatellitePanel: (show) =>
    set((s) => ({ showSatellitePanel: show !== undefined ? show : !s.showSatellitePanel })),
  setTrackSatellite: (track) => set({ trackSatellite: track, focusTarget: 'moon' }),
  setSelectedSatelliteId: (id) => set({ selectedSatelliteId: id, trackSatellite: true, focusTarget: 'moon' }),
  setEclipseFactor: (factor) => set({ eclipseFactor: factor }),
  focusSouthPoleAndSatellite: () => {
    set({ southPoleMode: true, showSatellite: true, showSatellitePanel: true, focusTarget: 'moon' });
    get().issueCommand({ kind: 'southPole' });
  },
  toggleSun: () => set((s) => ({ showSun: !s.showSun })),
  toggleSolarRays: () => set((s) => ({ showSolarRays: !s.showSolarRays })),
  toggleEarth: () => set((s) => ({ showEarth: !s.showEarth })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  setPlanetaryRotationSpeed: (speed) => set({ planetaryRotationSpeed: speed }),
  alignWithEarth: () => {
    get().issueCommand({ kind: 'focus', latitude_deg: 0, longitude_deg: 0, distance: 3.2 });
  },
  setFocusTarget: (target) => set({ focusTarget: target }),
  alignWithSun: (direction = [0.55, 0.25, 0.8]) => {
    const v = new Vector3(...direction).normalize();
    const coords = vector3ToLatLon(v);
    get().issueCommand({
      kind: 'focus',
      latitude_deg: coords.latitude_deg,
      longitude_deg: coords.longitude_deg,
      distance: 3.2,
    });
  },
  setInteractionMode: (mode) => set({ interactionMode: mode }),
  toggleInteractionMode: () => set((s) => ({ interactionMode: s.interactionMode === 'rotate' ? 'pan' : 'rotate' })),
  resetPanelPositions: () => set((s) => ({ resetPanelPositionsKey: s.resetPanelPositionsKey + 1 })),
}));

export const MAX_ZOOM_OUT = MAX_DISTANCE;
