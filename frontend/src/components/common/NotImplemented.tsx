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
        <h2 className="text-base font-semibold">{module} is not implemented yet</h2>
      </div>
      <p className="mt-3 text-sm text-fg-muted">
        The scientific calculations for this module arrive in a later development phase. No placeholder or
        invented values are shown.
      </p>
      <p className="label mt-5">Planned inputs</p>
      <ul className="mt-2 list-inside list-disc text-sm text-fg">
        {plannedInputs.map((input) => (
          <li key={input}>{input}</li>
        ))}
      </ul>
      {endpoint ? (
        <p className="mt-5 text-xs text-fg-muted">
          Backend interface: <code className="font-mono text-cyan">{endpoint}</code> (documented, returns HTTP 501
          until implemented)
        </p>
      ) : null}
    </div>
  );
}
