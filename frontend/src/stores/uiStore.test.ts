import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => useUiStore.setState({ toasts: [], mobileNavOpen: false, sidebarCollapsed: false }));

  it('replaces a toast with the same id instead of duplicating it', () => {
    const { pushToast } = useUiStore.getState();
    pushToast({ id: 'x', tone: 'error', title: 'one' });
    pushToast({ id: 'x', tone: 'error', title: 'two' });
    expect(useUiStore.getState().toasts).toHaveLength(1);
    expect(useUiStore.getState().toasts[0]?.title).toBe('two');
  });
  it('dismisses toasts', () => {
    useUiStore.getState().pushToast({ id: 'y', tone: 'info', title: 't' });
    useUiStore.getState().dismissToast('y');
    expect(useUiStore.getState().toasts).toHaveLength(0);
  });
  it('toggles the sidebar', () => {
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });
});
