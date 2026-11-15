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
  compact?: boolean;
}

export function MetricCard({ label, value, unit, description, icon: Icon, quality, context, compact = false }: MetricCardProps) {
  const unavailable = value === null;

  if (compact) {
    return (
      <article className="panel flex flex-col justify-between p-2 px-3 gap-1 shadow-sm" aria-label={label} data-testid="metric-card">
        <header className="flex items-center justify-between gap-1.5">
          <h3 className="label text-xs tracking-wider truncate">{label}</h3>
          <Icon className="size-3.5 text-cyan shrink-0" aria-hidden />
        </header>
        <div className="flex items-baseline justify-between gap-2">
          <p className="flex items-baseline gap-1 font-mono">
            <span className={`text-xl font-light tracking-tight ${unavailable ? 'text-fg-dim' : 'text-fg'}`} data-testid="metric-value">
              {unavailable ? '—' : value}
            </span>
            <span className="text-xs text-fg-muted">{unit}</span>
            {unavailable ? <span className="sr-only">Unavailable</span> : null}
          </p>
          <DataQualityMeter quality={quality} />
        </div>
        <p className="truncate text-xs text-fg-muted leading-tight" title={description}>
          {description}
        </p>
        {context ? <p className="truncate text-xs text-fg-dim border-t border-line/60 pt-0.5">{context}</p> : null}
      </article>
    );
  }

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
        {context ? <p className="truncate text-sm text-fg-dim">{context}</p> : null}
      </footer>
    </article>
  );
}
