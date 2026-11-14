import {
  Grid3x3,
  Maximize2,
  Minimize2,
  MapPinned,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  LocateFixed,
  Snowflake,
  Satellite,
  Sun,
  Hand,
  Orbit,
  LayoutGrid,
  Globe,
  Play,
  Pause,
  Tag,
} from 'lucide-react';
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
  const showSatellitePanel = useGlobeStore((s) => s.showSatellitePanel);
  const toggleSatellitePanel = useGlobeStore((s) => s.toggleSatellitePanel);
  const focusSouthPoleAndSatellite = useGlobeStore((s) => s.focusSouthPoleAndSatellite);
  const alignWithSun = useGlobeStore((s) => s.alignWithSun);
  const alignWithEarth = useGlobeStore((s) => s.alignWithEarth);
  const focusTarget = useGlobeStore((s) => s.focusTarget);
  const setFocusTarget = useGlobeStore((s) => s.setFocusTarget);
  const autoRotate = useGlobeStore((s) => s.autoRotate);
  const toggleAutoRotate = useGlobeStore((s) => s.toggleAutoRotate);
  const interactionMode = useGlobeStore((s) => s.interactionMode);
  const setInteractionMode = useGlobeStore((s) => s.setInteractionMode);
  const resetPanelPositions = useGlobeStore((s) => s.resetPanelPositions);
  const showTelemetryLabels = useGlobeStore((s) => s.showTelemetryLabels);
  const toggleTelemetryLabels = useGlobeStore((s) => s.toggleTelemetryLabels);
  const site = useAppStore((s) => s.selectedLandingSite);
  const camera = useGlobeStore((s) => s.camera);

  const focusSite = () => site && issue({ kind: 'focus', latitude_deg: site.coordinates.latitude_deg, longitude_deg: site.coordinates.longitude_deg });
  const southLabel = southPoleMode ? 'Exit South Pole' : 'Explore South Pole';
  const toggleSouth = southPoleMode ? exitSouthPole : enterSouthPole;

  const iconBtn = (label: string, onClick: () => void, icon: React.ReactNode, opts?: { disabled?: boolean; pressed?: boolean; title?: string }) => (
    <button
      type="button"
      className={`btn-icon shrink-0 ${opts?.pressed ? 'border-cyan/70 text-cyan bg-cyan/10' : ''}`}
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
    <div className="pointer-events-auto flex flex-col gap-2" role="group" aria-label="Camera controls">
      <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-6'} gap-1.5 justify-items-center`}>
        {iconBtn('Rotate mode (Left drag rotates)', () => setInteractionMode('rotate'), <Orbit className="size-4" aria-hidden />, {
          pressed: interactionMode === 'rotate',
          title: 'Rotate mode: Left mouse button rotates Moon',
        })}
        {iconBtn('Pan mode (Left drag moves Moon)', () => setInteractionMode('pan'), <Hand className="size-4" aria-hidden />, {
          pressed: interactionMode === 'pan',
          title: 'Pan mode: Left mouse button moves Moon across screen',
        })}
        {iconBtn(
          autoRotate ? 'Pause planetary rotation' : 'Resume planetary rotation',
          toggleAutoRotate,
          autoRotate ? <Pause className="size-4 text-cyan" aria-hidden /> : <Play className="size-4 text-cyan" aria-hidden />,
          { pressed: autoRotate, title: autoRotate ? 'Pause Moon & Earth rotation' : 'Start Moon & Earth rotation' },
        )}
        {iconBtn('Reset view (Focus Moon)', () => { setFocusTarget('moon'); issue({ kind: 'reset' }); }, <RotateCcw className="size-4" aria-hidden />, { pressed: focusTarget === 'moon', title: 'Focus on the Moon' })}
        {iconBtn('Focus Planet Earth', () => { setFocusTarget('earth'); alignWithEarth(); }, <Globe className="size-4 text-blue-400" aria-hidden />, { pressed: focusTarget === 'earth', title: 'Focus on Planet Earth (Orbiting Sun)' })}
        {iconBtn('Focus Sun (Solar System Priority)', () => { setFocusTarget('sun'); alignWithSun(); }, <Sun className="size-4 text-amber-400" aria-hidden />, { pressed: focusTarget === 'sun', title: 'Focus on Sun (Center of Solar System)' })}

        {iconBtn('Zoom in', () => issue({ kind: 'zoom', factor: 0.7 }), <ZoomIn className="size-4" aria-hidden />, { disabled: camera.distance <= 1.06 })}
        {iconBtn('Zoom out', () => issue({ kind: 'zoom', factor: 1 / 0.7 }), <ZoomOut className="size-4" aria-hidden />, { disabled: camera.distance >= 80 })}
        {iconBtn('Focus selected site', () => { setFocusTarget('moon'); focusSite(); }, <LocateFixed className="size-4" aria-hidden />, { disabled: !site, title: site ? 'Focus selected site' : 'Select a site first' })}
        {iconBtn(showGrid ? 'Hide coordinate grid' : 'Show coordinate grid', toggleGrid, <Grid3x3 className="size-4" aria-hidden />, { pressed: showGrid })}
        {iconBtn('Reset panel positions', resetPanelPositions, <LayoutGrid className="size-4" aria-hidden />, { title: 'Reset all movable panels to default positions' })}
        {iconBtn(
          showSatellitePanel ? 'Hide Cassini South Pole Telemetry' : 'Show Cassini South Pole Telemetry',
          () => toggleSatellitePanel(),
          <Satellite className="size-4" aria-hidden />,
          { pressed: showSatellitePanel, title: 'Cassini Satellite & South Pole Reconnaissance' },
        )}
        {iconBtn(
          showTelemetryLabels ? 'Hide satellite & body labels/tabs' : 'Show satellite & body labels/tabs',
          toggleTelemetryLabels,
          <Tag className="size-4" aria-hidden />,
          { pressed: showTelemetryLabels, title: showTelemetryLabels ? 'Hide satellite & body labels/tabs' : 'Show satellite & body labels/tabs' },
        )}
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
        <div className="flex gap-1.5">
          <button type="button" className={`btn flex-1 text-xs justify-center ${southPoleMode ? 'btn-primary' : ''}`} aria-pressed={southPoleMode} onClick={toggleSouth}>
            <MapPinned className="size-3.5" aria-hidden /> {southLabel}
          </button>
          <button
            type="button"
            className={`btn text-xs ${showSatellitePanel ? 'border-cyan text-cyan' : ''}`}
            title="Cassini Satellite Reconnaissance"
            onClick={focusSouthPoleAndSatellite}
          >
            <Satellite className="size-3.5" aria-hidden /> Cassini
          </button>
        </div>
      )}
    </div>
  );
}
