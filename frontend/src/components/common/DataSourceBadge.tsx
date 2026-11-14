import type { DataQuality } from '@/types';

const STYLE: Record<DataQuality, { label: string; cls: string }> = {
  unavailable: { label: 'No data', cls: 'border-line-strong bg-bg-secondary text-fg-muted' },
  demo: { label: 'Demo data', cls: 'border-warning/50 bg-warning/10 text-warning' },
  sample: { label: 'Sample data', cls: 'border-blue/50 bg-blue/10 text-blue' },
  computed: { label: 'Computed', cls: 'border-success/50 bg-success/10 text-success' },
};

export function DataSourceBadge({ kind, label }: { kind: DataQuality; label?: string }) {
  const s = STYLE[kind];
  return (
    <span className={`badge ${s.cls}`} data-quality={kind}>
      {label ?? s.label}
    </span>
  );
}

const SEGMENTS: Record<DataQuality, number> = { unavailable: 0, demo: 1, sample: 2, computed: 4 };
const SEGMENT_COLOR: Record<DataQuality, string> = {
  unavailable: 'bg-fg-dim',
  demo: 'bg-warning',
  sample: 'bg-blue',
  computed: 'bg-success',
};

/** Four-segment data-quality meter. Only "computed" fills it; demo/sample never look verified. */
export function DataQualityMeter({ quality }: { quality: DataQuality }) {
  const filled = SEGMENTS[quality];
  return (
    <span className="inline-flex items-center gap-2" data-quality={quality}>
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-2.5 w-1.5 rounded-[1px] ${i < filled ? SEGMENT_COLOR[quality] : 'bg-line-strong'}`} />
        ))}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">{STYLE[quality].label}</span>
    </span>
  );
}
