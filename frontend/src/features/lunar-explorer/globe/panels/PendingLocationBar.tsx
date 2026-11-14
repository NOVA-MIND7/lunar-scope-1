import { Check, X } from 'lucide-react';
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
    <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded border border-fg/40 bg-bg/90 px-3 py-2 shadow-lg backdrop-blur-md" role="group" aria-label="Picked location" data-testid="pending-bar">
      <div className="min-w-0">
        <p className="label">Picked location · {classifyRegion(pending.latitude_deg, pending.longitude_deg).replace('-', ' ')}</p>
        <p className="font-mono text-sm">
          {formatLatitude(pending.latitude_deg)} · {formatLongitude(pending.longitude_deg)}
        </p>
      </div>
      <div className="ml-auto flex gap-2">
        <button type="button" className="btn btn-primary" onClick={confirm}>
          <Check className="size-3.5" aria-hidden /> SELECT THIS LOCATION
        </button>
        <button type="button" className="btn-icon" aria-label="Cancel picked location" onClick={clear}>
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
