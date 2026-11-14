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
