import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { GripHorizontal, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useGlobeStore } from '../globeStore';

export interface DraggablePanelProps {
  id: string;
  title: string;
  icon?: LucideIcon;
  dock?: 'left' | 'right';
  initialX?: number;
  initialY?: number;
  widthClassName?: string;
  maxHeightClassName?: string;
  children: ReactNode;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
  onClose?: () => void;
  badge?: ReactNode;
  headerRight?: ReactNode;
}

export function DraggablePanel({
  title,
  icon: Icon,
  dock = 'left',
  initialX,
  initialY,
  widthClassName = 'w-72',
  maxHeightClassName = 'max-h-[calc(100vh-12rem)]',
  children,
  defaultCollapsed = false,
  collapsible = true,
  onClose,
  badge,
  headerRight,
}: DraggablePanelProps) {
  // Support relative offset (translate) from default dock position
  const [offset, setOffset] = useState({
    x: initialX !== undefined && dock === 'left' ? initialX - 12 : 0,
    y: initialY !== undefined ? initialY - 12 : 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startOffsetX: 0, startOffsetY: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Watch global reset signal to snap back to default dock position
  const resetKey = useGlobeStore((s) => s.resetPanelPositionsKey);
  useEffect(() => {
    setOffset({
      x: initialX !== undefined && dock === 'left' ? initialX - 12 : 0,
      y: initialY !== undefined ? initialY - 12 : 0,
    });
  }, [resetKey, initialX, initialY, dock]);

  const handleMouseDown = useCallback((e: ReactMouseEvent) => {
    // Only drag with left click and ignore clicks on buttons or interactive inputs in header
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) return;

    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
  }, [offset.x, offset.y]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;

      const newX = dragStartRef.current.startOffsetX + deltaX;
      const newY = dragStartRef.current.startOffsetY + deltaY;

      // Bound checks based on window dimensions
      const panelWidth = panelRef.current?.offsetWidth || 300;
      const maxNegativeX = dock === 'right' ? -(window.innerWidth - panelWidth - 24) : -4;
      const maxPositiveX = dock === 'right' ? 4 : window.innerWidth - panelWidth - 24;

      const clampedX = Math.min(maxPositiveX, Math.max(maxNegativeX, newX));
      const clampedY = Math.min(window.innerHeight - 100, Math.max(-8, newY));

      setOffset({ x: clampedX, y: clampedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dock]);

  const dockClass = dock === 'right' ? 'top-3 right-3' : 'top-3 left-3';
  const hasTransform = offset.x !== 0 || offset.y !== 0;

  return (
    <div
      ref={panelRef}
      className={`absolute z-20 flex flex-col rounded-lg border border-line bg-bg-secondary/95 shadow-2xl backdrop-blur-md select-none ${dockClass} ${
        isDragging ? 'shadow-cyan/25 ring-1 ring-cyan cursor-grabbing' : ''
      } ${widthClassName}`}
      style={{
        transform: hasTransform ? `translate3d(${offset.x}px, ${offset.y}px, 0)` : undefined,
      }}
    >
      {/* Draggable Header Bar */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={() => collapsible && setIsCollapsed(!isCollapsed)}
        className="flex cursor-grab items-center justify-between gap-1.5 border-b border-line bg-surface/60 px-3 py-2 text-xs font-semibold text-fg active:cursor-grabbing hover:bg-surface-raised/60 transition-colors"
        title="Click and drag with mouse to move this panel anywhere. Double click to collapse/expand."
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripHorizontal className="size-3.5 text-fg-dim shrink-0" aria-hidden="true" />
          {Icon ? <Icon className="size-3.5 text-cyan shrink-0" aria-hidden="true" /> : null}
          <span className="truncate">{title}</span>
          {badge}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {headerRight}
          {collapsible ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
              className="rounded p-0.5 text-fg-dim hover:bg-surface hover:text-fg"
              aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
            </button>
          ) : null}
          {onClose ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="rounded p-0.5 text-fg-dim hover:bg-surface hover:text-fg"
              aria-label="Close panel"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Panel Body */}
      {!isCollapsed ? (
        <div className={`overflow-y-auto p-2.5 ${maxHeightClassName}`}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
