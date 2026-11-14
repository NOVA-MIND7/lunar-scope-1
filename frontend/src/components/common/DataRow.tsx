import type { ReactNode } from 'react';

/** One label/value line inside a MissionPanel. */
export function DataRow({ label, children, mono = true }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/60 py-2 last:border-b-0">
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className={`min-w-0 truncate text-right text-sm ${mono ? 'font-mono' : ''}`}>{children}</dd>
    </div>
  );
}
