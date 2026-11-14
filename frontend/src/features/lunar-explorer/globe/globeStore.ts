import { create } from 'zustand';
import type { LunarCoordinates, SiteCategory } from '@/types';
import { useAppStore } from '@/stores/appStore';
import { canonicalCoordinates, createCustomSite } from '@/utils/lunarCoordinates';
import { MAX_DISTANCE } from './constants';
import type { MoonTextureSource } from './moonTextureConfig';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

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
}

let commandCounter = 0;

const INITIAL_CAMERA: CameraReadout = { distance: 3.4, centerLatitude: 10, centerLongitude: 0, panOffset: 0 };

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
    set({ southPoleMode: true });
    get().issueCommand({ kind: 'southPole' });
  },
  exitSouthPole: () => {
    set({ southPoleMode: false });
    get().issueCommand({ kind: 'reset' });
  },

  setTextureSource: (source) => set({ textureSource: source }),
  resetTransient: () =>
    set({ pending: null, cursor: null, hoveredSiteId: null, southPoleMode: false, command: null, camera: INITIAL_CAMERA }),
}));

export const MAX_ZOOM_OUT = MAX_DISTANCE;
