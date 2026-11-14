export type IndicatorState = 'online' | 'degraded' | 'offline' | 'pending' | 'idle';

const DOT: Record<IndicatorState, string> = {
  online: 'bg-success',
  degraded: 'bg-warning',
  offline: 'bg-danger',
  pending: 'bg-cyan',
  idle: 'bg-fg-dim',
};

const TEXT: Record<IndicatorState, string> = {
  online: 'text-success',
  degraded: 'text-warning',
  offline: 'text-danger',
  pending: 'text-cyan',
  idle: 'text-fg-muted',
};

interface StatusIndicatorProps {
  state: IndicatorState;
  label?: string;
  /** Hide the text and keep only the dot (the label stays available to screen readers). */
  dotOnly?: boolean;
}

export function StatusIndicator({ state, label, dotOnly = false }: StatusIndicatorProps) {
  const text = label ?? state;
  return (
    <span className="inline-flex items-center gap-2" data-state={state}>
      <span className="relative flex size-2" aria-hidden>
        {state === 'pending' || state === 'online' ? (
          <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-40 ${DOT[state]}`} />
        ) : null}
        <span className={`relative inline-flex size-2 rounded-full ${DOT[state]}`} />
      </span>
      <span className={dotOnly ? 'sr-only' : `text-xs font-medium ${TEXT[state]}`}>{text}</span>
    </span>
  );
}
