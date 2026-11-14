import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    refetchInterval: 15_000,
    retry: false,
  });
}

export function useSites() {
  return useQuery({
    queryKey: ['sites'],
    queryFn: api.listSites,
    staleTime: 5 * 60_000,
  });
}

export function useMissionTimeline(siteId?: string | null, landingTimeUtc?: string, durationDays: number = 14) {
  return useQuery({
    queryKey: ['mission-timeline', siteId, landingTimeUtc, durationDays],
    queryFn: () =>
      siteId && landingTimeUtc
        ? api.getMissionTimeline({
            site_id: siteId,
            landing_time_utc: landingTimeUtc,
            mission_duration_days: durationDays,
          })
        : null,
    enabled: Boolean(siteId && landingTimeUtc),
    staleTime: 60_000,
  });
}

export function useLandingWindows(
  siteId?: string | null,
  searchStartUtc?: string,
  searchEndUtc?: string,
  durationDays: number = 14,
) {
  return useQuery({
    queryKey: ['landing-windows', siteId, searchStartUtc, searchEndUtc, durationDays],
    queryFn: () =>
      siteId && searchStartUtc && searchEndUtc
        ? api.getLandingWindows({
            site_id: siteId,
            search_start_utc: searchStartUtc,
            search_end_utc: searchEndUtc,
            mission_duration_days: durationDays,
          })
        : null,
    enabled: Boolean(siteId && searchStartUtc && searchEndUtc),
    staleTime: 60_000,
  });
}

export function usePhysicsComparison(testMassKg: number = 60.0) {
  return useQuery({
    queryKey: ['physics-comparison', testMassKg],
    queryFn: () => api.getPhysicsComparison(testMassKg),
    staleTime: 5 * 60_000,
  });
}

export function useDSNStations() {
  return useQuery({
    queryKey: ['dsn-stations'],
    queryFn: api.getDSNStations,
    staleTime: 5 * 60_000,
  });
}

export function useDSNTracking() {
  return useQuery({
    queryKey: ['dsn-tracking'],
    queryFn: api.getDSNTracking,
    refetchInterval: 15_000,
  });
}
