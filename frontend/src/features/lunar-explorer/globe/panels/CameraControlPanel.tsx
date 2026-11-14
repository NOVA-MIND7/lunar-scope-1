import { Grid3x3, Maximize2, Minimize2, MapPinned, RotateCcw, ZoomIn, ZoomOut, LocateFixed, Snowflake } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useGlobeStore } from '../globeStore';

export interface FullscreenControl {
  supported: boolean;
  isFullscreen: boolean;
  toggle: () => void;
}

/** Camera and view controls. `compact` shows icon buttons only. */
export function CameraControlPanel({ compact = false, fullscreen }: { compact?: boolean; fullscreen?: FullscreenControl }) {
  const issue = useGlobeStore((s) => s.issueCommand);
  const showGrid = useGlobeStore((s) => s.showGrid);
  const toggleGrid = useGlobeStore((s) => s.toggleGrid);
  const southPoleMode = useGlobeStore((s) => s.southPoleMode);
  const enterSouthPole = useGlobeStore((s) => s.enterSouthPole);
  const exitSouthPole = useGlobeStore((s) => s.exitSouthPole);
  const site = useAppStore((s) => s.selectedLandingSite);
  const camera = useGlobeStore((s) => s.camera);

  const focusSite = () => site && issue({ kind: 'focus', latitude_deg: site.coordinates.latitude_deg, longitude_deg: site.coordinates.longitude_deg });
  const southLabel = southPoleMode ? 'EXIT SOUTH POLE MODE' : 'EXPLORE LUNAR SOUTH POLE';
  const toggleSouth = southPoleMode ? exitSouthPole : enterSouthPole;

  const iconBtn = (label: string, onClick: () => void, icon: React.ReactNode, opts?: { disabled?: boolean; pressed?: boolean; title?: string }) => (
    <button
      type="button"
      className={`btn-icon ${opts?.pressed ? 'border-cyan/70 text-cyan' : ''}`}
      aria-label={label}
      title={opts?.title ?? label}
      aria-pressed={opts?.pressed}
      disabled={opts?.disabled}
      onClick={onClick}
    >
      {icon}
    </button>
  );

  return (
    <div className="pointer-events-auto flex flex-col gap-1.5" role="group" aria-label="Camera controls">
      <div className={`flex gap-1.5 ${compact ? 'flex-col' : 'flex-wrap'}`}>
        {iconBtn('Zoom in', () => issue({ kind: 'zoom', factor: 0.7 }), <ZoomIn className="size-4" aria-hidden />, { disabled: camera.distance <= 1.06 })}
        {iconBtn('Zoom out', () => issue({ kind: 'zoom', factor: 1 / 0.7 }), <ZoomOut className="size-4" aria-hidden />, { disabled: camera.distance >= 7.9 })}
        {iconBtn('Reset view', () => issue({ kind: 'reset' }), <RotateCcw className="size-4" aria-hidden />)}
        {iconBtn('Focus selected site', focusSite, <LocateFixed className="size-4" aria-hidden />, { disabled: !site, title: site ? 'Focus selected site' : 'Select a site first' })}
        {iconBtn(showGrid ? 'Hide coordinate grid' : 'Show coordinate grid', toggleGrid, <Grid3x3 className="size-4" aria-hidden />, { pressed: showGrid })}
        {compact
          ? iconBtn(southLabel, toggleSouth, <Snowflake className="size-4" aria-hidden />, { pressed: southPoleMode })
          : null}
        {fullscreen?.supported
          ? iconBtn(
              fullscreen.isFullscreen ? 'Exit full screen' : 'Full screen',
              fullscreen.toggle,
              fullscreen.isFullscreen ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />,
            )
          : null}
      </div>
      {compact ? null : (
        <button type="button" className={`btn ${southPoleMode ? 'btn-primary' : ''}`} aria-pressed={southPoleMode} onClick={toggleSouth}>
          <MapPinned className="size-3.5" aria-hidden /> {southLabel}
        </button>
      )}
    </div>
  );
}
