import { create } from 'zustand';

export type ToastTone = 'error' | 'warning' | 'info' | 'success';

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
}

interface UiState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  toasts: Toast[];
}

interface UiActions {
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  /** Adds a toast; a toast with an existing id is replaced rather than duplicated. */
  pushToast: (toast: Omit<Toast, 'id'> & { id?: string }) => void;
  dismissToast: (id: string) => void;
}

const STORAGE_KEY = 'lunar-scope:sidebar-collapsed';

function readInitialCollapsed(): boolean {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'true' || saved === 'false') return saved === 'true';
  } catch {
    /* storage unavailable */
  }
  // Tablet widths start with the compact rail.
  return typeof window !== 'undefined' && window.innerWidth < 1280;
}

let toastCounter = 0;

export const useUiStore = create<UiState & UiActions>()((set, get) => ({
  sidebarCollapsed: readInitialCollapsed(),
  mobileNavOpen: false,
  toasts: [],

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
    set({ sidebarCollapsed: next });
  },
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

  pushToast: ({ id, ...toast }) =>
    set((s) => {
      const toastId = id ?? `toast-${++toastCounter}`;
      return { toasts: [...s.toasts.filter((t) => t.id !== toastId), { id: toastId, ...toast }] };
    }),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
