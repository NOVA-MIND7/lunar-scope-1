import { Check, X, MapPin } from 'lucide-react';
import { formatLatitude, formatLongitude } from '@/utils/format';
import { classifyRegion } from '@/utils/lunarCoordinates';
import { useGlobeStore } from '../globeStore';

/** Appears after a point is picked; SELECT THIS LOCATION promotes it to the global mission state. */
export function PendingLocationBar() {
  const pending = useGlobeStore((s) => s.pending);
  const confirm = useGlobeStore((s) => s.confirmPending);
  const clear = useGlobeStore((s) => s.clearPending);
  if (!pending) return null;
  return (
    <div
      className="pointer-events-auto flex items-center gap-3 sm:gap-4 rounded-xl border border-cyan/60 bg-bg/95 px-4 py-2.5 shadow-2xl shadow-cyan/15 backdrop-blur-md ring-1 ring-cyan/40"
      role="group"
      aria-label="Picked location"
      data-testid="pending-bar"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-cyan/15 text-cyan border border-cyan/40">
          <MapPin className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="label text-[10px] uppercase tracking-wider text-cyan font-mono">
            Picked location · {classifyRegion(pending.latitude_deg, pending.longitude_deg).replace('-', ' ')}
          </p>
          <p className="font-mono text-sm font-semibold text-fg whitespace-nowrap">
            {formatLatitude(pending.latitude_deg)} · {formatLongitude(pending.longitude_deg)}
          </p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <button
          type="button"
          className="btn btn-primary font-semibold tracking-wide shadow-md shadow-cyan/20 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
          onClick={confirm}
        >
          <Check className="size-3.5 text-cyan" aria-hidden /> SELECT THIS LOCATION
        </button>
        <button
          type="button"
          className="btn-icon hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/40 cursor-pointer transition-colors"
          aria-label="Cancel picked location"
          onClick={clear}
          title="Cancel picked location"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
