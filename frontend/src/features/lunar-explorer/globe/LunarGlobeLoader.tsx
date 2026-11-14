import { LoaderCircle } from 'lucide-react';

export function LunarGlobeLoader({ message = 'Preparing lunar surface…', detail }: { message?: string; detail?: string }) {
  return (
    <div role="status" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-bg/90 backdrop-blur-sm" data-testid="globe-loader">
      <LoaderCircle className="size-7 animate-spin text-cyan" aria-hidden />
      <p className="label text-fg">{message}</p>
      {detail ? <p className="max-w-xs text-center text-xs text-fg-dim">{detail}</p> : null}
    </div>
  );
}
