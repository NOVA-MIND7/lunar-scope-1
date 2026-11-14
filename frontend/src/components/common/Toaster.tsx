import { useEffect } from 'react';
import { CircleAlert, Info, TriangleAlert, CircleCheck, X } from 'lucide-react';
import { useUiStore, type Toast, type ToastTone } from '@/stores/uiStore';

const TONE: Record<ToastTone, { cls: string; icon: typeof Info }> = {
  error: { cls: 'border-danger/50 text-danger', icon: CircleAlert },
  warning: { cls: 'border-warning/50 text-warning', icon: TriangleAlert },
  info: { cls: 'border-cyan/50 text-cyan', icon: Info },
  success: { cls: 'border-success/50 text-success', icon: CircleCheck },
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useUiStore((s) => s.dismissToast);
  useEffect(() => {
    const t = window.setTimeout(() => dismiss(toast.id), 9000);
    return () => window.clearTimeout(t);
  }, [toast.id, dismiss]);

  const { cls, icon: Icon } = TONE[toast.tone];
  return (
    <li
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={`toast-in pointer-events-auto flex items-start gap-3 rounded border bg-bg-secondary/95 p-3 shadow-lg backdrop-blur ${cls}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">{toast.title}</p>
        {toast.message ? <p className="mt-0.5 text-xs text-fg-muted">{toast.message}</p> : null}
      </div>
      <button type="button" className="text-fg-muted hover:text-fg" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>
        <X className="size-4" aria-hidden />
      </button>
    </li>
  );
}

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  return (
    <ul className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-label="Notifications">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </ul>
  );
}
