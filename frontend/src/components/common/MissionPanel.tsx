import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface MissionPanelProps {
  title: string;
  icon?: LucideIcon;
  /** Right-aligned header content, e.g. a badge. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** Generic glass panel with a titled header. All dashboard side panels are built from it. */
export function MissionPanel({ title, icon: Icon, aside, children, className = '', bodyClassName = 'p-4' }: MissionPanelProps) {
  return (
    <section className={`panel flex flex-col ${className}`} aria-label={title}>
      <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-b border-line px-4 py-2.5">
        <h2 className="label flex items-center gap-2 text-fg">
          {Icon ? <Icon className="size-3.5 text-cyan" aria-hidden /> : null}
          {title}
        </h2>
        {aside}
      </header>
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
