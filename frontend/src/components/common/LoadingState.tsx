import { LoaderCircle } from 'lucide-react';

export function LoadingState({ label = 'Loading…', compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-2 text-xs text-fg-muted ${compact ? 'py-3' : 'py-10'}`}>
      <LoaderCircle className="size-4 animate-spin text-cyan" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
