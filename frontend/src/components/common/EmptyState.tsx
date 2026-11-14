import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ title, message, icon: Icon = Inbox, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'gap-1.5 py-4' : 'gap-2 py-10'}`} data-testid="empty-state">
      <Icon className="size-5 text-fg-dim" aria-hidden />
      <p className="text-sm font-medium text-fg">{title}</p>
      {message ? <p className="max-w-xs text-xs text-fg-muted">{message}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
