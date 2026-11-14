import { create } from 'zustand';
import type { AppState, AppStore } from '@/types';
import { toUtcIso } from '@/utils/time';

const DEFAULT_DATE = '2027-01-01';
const DEFAULT_TIME = '00:00';

export function createInitialState(): AppState {
  return {
    missionName: 'Untitled mission',
    selectedLandingSite: null,
    selectedCoordinates: null,
    selectedLandingDate: DEFAULT_DATE,
    selectedLandingTime: DEFAULT_TIME,
    selectedMissionDuration: 14,
    simulationTime: toUtcIso(DEFAULT_DATE, DEFAULT_TIME),
    simulationSpeed: 3600,
    isSimulationPlaying: false,
    comparisonScenarios: [],
    activeVisualization: 'globe',
    dataMode: 'sample',
  };
}

export const useAppStore = create<AppStore>()((set) => ({
  ...createInitialState(),

  setMissionName: (name) => set({ missionName: name }),
  selectLandingSite: (site) =>
    set({
      selectedLandingSite: site,
      selectedCoordinates: site ? site.coordinates : null,
    }),
  setSelectedCoordinates: (coords) => set({ selectedCoordinates: coords }),

  setLandingDate: (date) =>
    set((s) => ({
      selectedLandingDate: date,
      simulationTime: toUtcIso(date, s.selectedLandingTime),
    })),
  setLandingTime: (time) =>
    set((s) => ({
      selectedLandingTime: time,
      simulationTime: toUtcIso(s.selectedLandingDate, time),
    })),
  setMissionDuration: (days) => set({ selectedMissionDuration: Math.max(1, Math.round(days)) }),

  setSimulationTime: (time) => set({ simulationTime: time }),
  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),
  setSimulationPlaying: (playing) => set({ isSimulationPlaying: playing }),
  toggleSimulation: () => set((s) => ({ isSimulationPlaying: !s.isSimulationPlaying })),

  addComparisonScenario: (scenario) =>
    set((s) =>
      s.comparisonScenarios.some((c) => c.id === scenario.id)
        ? s
        : { comparisonScenarios: [...s.comparisonScenarios, scenario] },
    ),
  removeComparisonScenario: (id) =>
    set((s) => ({ comparisonScenarios: s.comparisonScenarios.filter((c) => c.id !== id) })),
  clearComparisonScenarios: () => set({ comparisonScenarios: [] }),

  setActiveVisualization: (id) => set({ activeVisualization: id }),
  setDataMode: (mode) => set({ dataMode: mode }),
}));
