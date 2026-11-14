import type { LucideIcon } from 'lucide-react';
import type { DataQuality } from '@/types';
import { DataQualityMeter } from './DataSourceBadge';

interface MetricCardProps {
  label: string;
  /** null renders the unavailable state. Never pass an invented number. */
  value: string | null;
  unit: string;
  description: string;
  icon: LucideIcon;
  quality: DataQuality;
  /** What the value refers to, e.g. the selected site and time. */
  context?: string;
}

export function MetricCard({ label, value, unit, description, icon: Icon, quality, context }: MetricCardProps) {
  const unavailable = value === null;
  return (
    <article className="panel flex flex-col gap-3 p-4" aria-label={label} data-testid="metric-card">
      <header className="flex items-center justify-between gap-2">
        <h3 className="label">{label}</h3>
        <Icon className="size-4 text-cyan" aria-hidden />
      </header>
      <p className="flex items-baseline gap-1.5 font-mono">
        <span className={`text-3xl font-light tracking-tight ${unavailable ? 'text-fg-dim' : 'text-fg'}`} data-testid="metric-value">
          {unavailable ? '—' : value}
        </span>
        <span className="text-sm text-fg-muted">{unit}</span>
        {unavailable ? <span className="sr-only">Unavailable</span> : null}
      </p>
      <p className="text-xs leading-relaxed text-fg-muted">{description}</p>
      <footer className="mt-auto flex flex-col gap-1.5 border-t border-line pt-3">
        <DataQualityMeter quality={quality} />
        {context ? <p className="truncate text-[11px] text-fg-dim">{context}</p> : null}
      </footer>
    </article>
  );
}
