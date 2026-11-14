import { useEffect } from 'react';
import { useHealth } from './useApi';
import { useUiStore } from '@/stores/uiStore';

/** Surfaces backend connectivity changes as notifications. */
export function useErrorToasts(): void {
  const { isError, isSuccess, error } = useHealth();
  const pushToast = useUiStore((s) => s.pushToast);
  const dismissToast = useUiStore((s) => s.dismissToast);

  useEffect(() => {
    if (isError) {
      pushToast({
        id: 'backend-offline',
        tone: 'error',
        title: 'Backend unreachable',
        message: error instanceof Error ? error.message : 'The LUNAR SCOPE API did not respond.',
      });
    } else if (isSuccess) {
      dismissToast('backend-offline');
    }
  }, [isError, isSuccess, error, pushToast, dismissToast]);
}
