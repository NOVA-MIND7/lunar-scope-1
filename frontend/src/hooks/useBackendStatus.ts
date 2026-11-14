import type { IndicatorState } from '@/components/common/StatusIndicator';
import { useHealth } from './useApi';

export interface BackendStatus {
  state: IndicatorState;
  label: string;
  isPending: boolean;
  isOnline: boolean;
}

export function useBackendStatus(): BackendStatus {
  const health = useHealth();
  if (health.isPending) return { state: 'pending', label: 'Connecting', isPending: true, isOnline: false };
  if (health.isError) return { state: 'offline', label: 'Offline', isPending: false, isOnline: false };
  return { state: 'online', label: 'Online', isPending: false, isOnline: true };
}
