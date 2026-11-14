import { MonitorX } from 'lucide-react';

export function WebGLFallback({ reason }: { reason: string }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 bg-bg-secondary/60 p-6 text-center" data-testid="webgl-fallback" role="alert">
      <MonitorX className="size-8 text-warning" aria-hidden />
      <p className="text-sm font-semibold">3D view unavailable</p>
      <p className="max-w-sm text-xs text-fg-muted">{reason}</p>
      <p className="max-w-sm text-xs text-fg-dim">
        Everything else still works: enter coordinates manually or choose a landing site from the lists.
      </p>
    </div>
  );
}
