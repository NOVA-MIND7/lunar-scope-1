import { TriangleAlert } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, compact = false }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-start gap-2 rounded border border-danger/40 bg-danger/5 ${compact ? 'p-3' : 'p-5'}`}
    >
      <div className="flex items-center gap-2 text-danger">
        <TriangleAlert className="size-4" aria-hidden />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="text-xs text-fg-muted">{message}</p>
      {onRetry ? (
        <button type="button" className="btn mt-1" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
