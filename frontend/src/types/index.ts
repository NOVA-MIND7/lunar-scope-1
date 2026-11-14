/**
 * Strict domain types for LUNAR SCOPE.
 *
 * Time convention: every timestamp used in scientific calculations is an ISO-8601
 * string in UTC (UTCString, ending in "Z"). The UI must label the time standard.
 */

/** ISO-8601 UTC timestamp, e.g. "2027-03-14T06:30:00.000Z". */
export type UTCString = string;

export type DataMode = 'sample' | 'live';

export type VisualizationId =
  | 'globe'
  | 'terrain'
  | 'illumination'
  | 'earth-visibility'
  | 'timeline';

/** Selenographic coordinates in degrees (planetocentric, east-positive longitude). */
export interface LunarCoordinates {
  latitude_deg: number; // -90 .. 90
  longitude_deg: number; // -180 .. 180
}

export type SiteRegion = 'south-pole' | 'north-pole' | 'near-side' | 'far-side' | 'equatorial';

export type SiteCategory = 'historical' | 'candidate-region' | 'clps' | 'custom';

/**
 * site: published coordinates of a specific landing site; approximate: approximate coordinates of a
 * specific site; regional: approximate centre of a region (NOT a landing coordinate).
 */
export type LocationPrecision = 'site' | 'approximate' | 'regional';

export interface LandingSite {
  id: string;
  name: string;
  region: SiteRegion;
  category: SiteCategory;
  precision: LocationPrecision;
  coordinates: LunarCoordinates;
  /** Where the record comes from; sample data must be labelled as such. */
  provenance: 'sample' | 'published' | 'computed' | 'user';
  description: string;
  notes?: string;
}

export interface SiteListResponse {
  data_status: 'sample';
  disclaimer: string;
  count: number;
  sites: LandingSite[];
}

export interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  time_utc: UTCString;
  database: 'disabled' | 'connected' | 'unreachable';
}

export interface ComparisonScenario {
  id: string;
  label: string;
  siteId: string;
  coordinates: LunarCoordinates;
  landingTimeUtc: UTCString;
  missionDurationDays: number;
}

export type SimulationSpeed = 1 | 60 | 3600 | 86400 | 604800;

export interface SimulationState {
  simulationTime: UTCString;
  simulationSpeed: SimulationSpeed;
  isSimulationPlaying: boolean;
}

export interface MissionSelectionState {
  missionName: string;
  selectedLandingSite: LandingSite | null;
  selectedCoordinates: LunarCoordinates | null;
  /** Calendar date in UTC, "YYYY-MM-DD". */
  selectedLandingDate: string;
  /** Time of day in UTC, "HH:MM". */
  selectedLandingTime: string;
  selectedMissionDuration: number; // days
}

export interface AppState extends MissionSelectionState, SimulationState {
  comparisonScenarios: ComparisonScenario[];
  activeVisualization: VisualizationId;
  dataMode: DataMode;
}

export interface AppActions {
  setMissionName: (name: string) => void;
  selectLandingSite: (site: LandingSite | null) => void;
  setSelectedCoordinates: (coords: LunarCoordinates | null) => void;
  setLandingDate: (date: string) => void;
  setLandingTime: (time: string) => void;
  setMissionDuration: (days: number) => void;
  setSimulationTime: (time: UTCString) => void;
  setSimulationSpeed: (speed: SimulationSpeed) => void;
  setSimulationPlaying: (playing: boolean) => void;
  toggleSimulation: () => void;
  addComparisonScenario: (scenario: ComparisonScenario) => void;
  removeComparisonScenario: (id: string) => void;
  clearComparisonScenarios: () => void;
  setActiveVisualization: (id: VisualizationId) => void;
  setDataMode: (mode: DataMode) => void;
}

export type AppStore = AppState & AppActions;

/** Shape of error bodies returned by the backend. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Provenance/quality of a displayed value. Nothing may be shown as "verified" without a computation behind it. */
export type DataQuality = 'unavailable' | 'demo' | 'sample' | 'computed';
