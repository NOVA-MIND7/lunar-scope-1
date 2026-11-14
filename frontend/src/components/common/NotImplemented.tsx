import { Construction } from 'lucide-react';

interface NotImplementedProps {
  module: string;
  plannedInputs: string[];
  endpoint?: string;
}

/**
 * Honest placeholder for scientific modules that are scheduled for a later phase.
 * It intentionally displays no numbers: no results are invented before the calculations exist.
 */
export function NotImplemented({ module, plannedInputs, endpoint }: NotImplementedProps) {
  return (
    <div className="card" data-testid="not-implemented">
      <div className="flex items-center gap-3">
        <Construction className="size-5 text-warning" aria-hidden />
        <h2 className="text-base font-semibold">{module} is in development</h2>
      </div>
      <p className="mt-3 text-sm text-fg-muted">
        This scientific computation module is scheduled for the upcoming phase. To ensure mission-grade accuracy,
        no simulated or invented numbers are displayed until real orbital models are calculated.
      </p>
      <div className="mt-4 rounded-lg bg-surface-elevated/40 border border-line p-3">
        <p className="label text-cyan mb-1.5">What this module will calculate:</p>
        <ul className="list-inside list-disc text-xs space-y-1 text-fg">
          {plannedInputs.map((input) => (
            <li key={input}>{input}</li>
          ))}
        </ul>
      </div>
      {endpoint ? (
        <p className="mt-4 text-xs text-fg-dim">
          API Endpoint: <code className="font-mono text-cyan">{endpoint}</code> (returns HTTP 501 until active)
        </p>
      ) : null}
    </div>
  );
}
