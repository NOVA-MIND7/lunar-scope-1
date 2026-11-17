import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Globe2, Clock, Layers, Compass, Tag, Crosshair } from 'lucide-react';
import type { LandingSite } from '@/types';
import { useSites } from '@/hooks/useApi';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAppStore } from '@/stores/appStore';
import { isWebGLAvailable } from '@/utils/webgl';
import { ILLUSTRATIVE_SUN } from './constants';
import { GlobeErrorBoundary } from './GlobeErrorBoundary';
import { GlobeScene, type SunSettings } from './GlobeScene';
import { LunarGlobeLoader } from './LunarGlobeLoader';
import { WebGLFallback } from './WebGLFallback';
import { useGlobeStore } from './globeStore';
import { useMoonTextures } from './useMoonTextures';
import { AstronomicalTimeBar } from './panels/AstronomicalTimeBar';
import { CameraControlPanel } from './panels/CameraControlPanel';
import { CassiniSouthPolePanel } from './panels/CassiniSouthPolePanel';
import { CoordinateEntryPanel } from './panels/CoordinateEntryPanel';
import { CoordinateReadout } from './panels/CoordinateReadout';
import { DraggablePanel } from './panels/DraggablePanel';
import { LandingNavigatorPanel } from './panels/LandingNavigatorPanel';
import { LayersPanel } from './panels/LayersPanel';
import { PendingLocationBar } from './panels/PendingLocationBar';
import { SiteInfoPanel } from './panels/SiteInfoPanel';

export interface LunarGlobeProps {
  /** full: all panels (Lunar Explorer). compact: map + essential controls (dashboard, navigator). */
  variant?: 'full' | 'compact';
  className?: string;
  /** Show an "Explore Moon" link to the Lunar Explorer page (compact variant). */
  showExploreLink?: boolean;
  /** Sun lighting. Defaults to the explicitly illustrative direction until the astronomy engine exists. */
  sun?: SunSettings;
}

const NO_SITES: LandingSite[] = [];

function QuickNavHelper({ onToggleNavigator }: { onToggleNavigator?: () => void }) {
  const issue = useGlobeStore((s) => s.issueCommand);
  const setFocusTarget = useGlobeStore((s) => s.setFocusTarget);
  const enterSouthPole = useGlobeStore((s) => s.enterSouthPole);
  const alignWithEarth = useGlobeStore((s) => s.alignWithEarth);
  const alignWithSun = useGlobeStore((s) => s.alignWithSun);
  const setPending = useGlobeStore((s) => s.setPending);

  return (
    <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-line bg-bg/90 px-3 py-1 shadow-xl backdrop-blur-md text-sm whitespace-nowrap">
      <span className="hidden 2xl:inline text-fg-dim font-mono text-xs">
        🖱️ Rotate: Drag &nbsp;|&nbsp; 🔄 Zoom: Scroll &nbsp;|&nbsp; 📍 Click: Pick
      </span>
      <div className="hidden 2xl:inline h-3 w-px bg-line" />
      {onToggleNavigator ? (
        <>
          <button
            type="button"
            className="flex items-center gap-1 rounded-full border border-cyan/40 bg-cyan/15 px-2.5 py-0.5 font-mono text-xs font-semibold text-cyan hover:bg-cyan/30 transition cursor-pointer shadow-sm"
            onClick={onToggleNavigator}
            title="Open Landing Navigator sites list"
          >
            <Crosshair className="size-3 text-cyan" />
            <span>Sites List</span>
          </button>
          <div className="h-3 w-px bg-line" />
        </>
      ) : null}
      <span className="text-fg-muted font-medium text-xs">Quick Jump:</span>
      <button
        type="button"
        className="rounded px-2 py-0.5 font-medium text-cyan hover:bg-cyan/15 transition cursor-pointer"
        onClick={() => {
          setFocusTarget('moon');
          setPending(0.6741, 23.473, { focus: true });
        }}
        title="Fly to Apollo 11 landing site"
      >
        Apollo 11
      </button>
      <button
        type="button"
        className="rounded px-2 py-0.5 font-medium text-cyan hover:bg-cyan/15 transition cursor-pointer"
        onClick={() => {
          setFocusTarget('moon');
          enterSouthPole();
        }}
        title="Explore Lunar South Pole"
      >
        South Pole
      </button>
      <button
        type="button"
        className="rounded px-2 py-0.5 font-medium text-blue-400 hover:bg-blue-400/15 transition cursor-pointer"
        onClick={() => {
          setFocusTarget('earth');
          alignWithEarth();
        }}
        title="View Planet Earth"
      >
        Earth
      </button>
      <button
        type="button"
        className="rounded px-2 py-0.5 font-medium text-amber-400 hover:bg-amber-400/15 transition cursor-pointer"
        onClick={() => {
          setFocusTarget('sun');
          alignWithSun();
        }}
        title="View the Sun"
      >
        Sun
      </button>
      <button
        type="button"
        className="rounded px-2 py-0.5 font-medium text-fg-muted hover:text-fg hover:bg-surface-elevated transition cursor-pointer"
        onClick={() => {
          setFocusTarget('moon');
          issue({ kind: 'reset' });
        }}
        title="Reset camera view to default"
      >
        Reset
      </button>
    </div>
  );
}

function CameraProbe() {
  const camera = useGlobeStore((s) => s.camera);
  return (
    <div
      hidden
      data-testid="camera-probe"
      data-distance={camera.distance.toFixed(3)}
      data-center-lat={camera.centerLatitude.toFixed(2)}
      data-center-lon={camera.centerLongitude.toFixed(2)}
      data-pan={camera.panOffset.toFixed(3)}
    />
  );
}

/**
 * The single reusable 3D Moon. Every page (Mission Control, Lunar Explorer, Landing Navigator) renders
 * this component; they differ only in `variant` and size.
 */
export function LunarGlobe({ variant = 'full', className = '', showExploreLink = false, sun = ILLUSTRATIVE_SUN }: LunarGlobeProps) {
  const containerRef = useRef<HTMLElement>(null);
  const fullscreen = useFullscreen(containerRef);
  const isLg = useMediaQuery('(min-width: 1024px)');
  const webgl = useMemo(() => isWebGLAvailable(), []);
  const [contextLost, setContextLost] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);

  const sitesQuery = useSites();
  const sites = sitesQuery.data?.sites ?? NO_SITES;
  const { status, textures, error } = useMoonTextures(webgl);
  const setTextureSource = useGlobeStore((s) => s.setTextureSource);
  const showSatellitePanel = useGlobeStore((s) => s.showSatellitePanel);

  const selectedSite = useAppStore((s) => s.selectedLandingSite);
  const previousSiteId = useRef(selectedSite?.id ?? null);

  useEffect(() => {
    if (textures) setTextureSource(textures.source);
  }, [textures, setTextureSource]);

  // Fly to a site when the selection changes from anywhere (marker, list, dropdown, confirmed pick).
  useEffect(() => {
    const id = selectedSite?.id ?? null;
    if (id === previousSiteId.current) return;
    previousSiteId.current = id;
    if (!selectedSite) return;
    const g = useGlobeStore.getState();
    if (g.pending && selectedSite.category !== 'custom') g.clearPending();
    g.issueCommand({ kind: 'focus', ...selectedSite.coordinates });
  }, [selectedSite]);

  useEffect(() => () => useGlobeStore.getState().resetTransient(), []);

  const isFull = variant === 'full';
  const floating = !isFull || isLg || fullscreen.isFullscreen;

  // Flyout drawer states (collapsed by default so simulation card fills the view cleanly)
  const [showTimeFlyout, setShowTimeFlyout] = useState(false);
  const [showNavLayers, setShowNavLayers] = useState(false);
  const [showLandingNavigator, setShowLandingNavigator] = useState(false);
  const [showMissionFlyout, setShowMissionFlyout] = useState(false);

  const showTelemetryLabels = useGlobeStore((s) => s.showTelemetryLabels);
  const toggleTelemetryLabels = useGlobeStore((s) => s.toggleTelemetryLabels);
  const activeTimestampMs = useGlobeStore((s) => s.activeTimestampMs);
  const timeTrackingMode = useGlobeStore((s) => s.timeTrackingMode);

  // Stop parent window from scrolling only when mouse wheel is scrolled directly on the 3D canvas simulation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const preventWindowScroll = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      // Allow scrolling inside all UI panels, flyouts, dropdowns, and scrollable containers
      if (
        target?.closest(
          '.overflow-y-auto, .overflow-y-scroll, .overflow-auto, [data-panel], .panel, [role="group"], [role="dialog"], [role="region"], input, select, textarea, button, form, [data-testid="landing-navigator-panel"]',
        )
      ) {
        return;
      }
      e.preventDefault();
    };
    el.addEventListener('wheel', preventWindowScroll, { passive: false });
    return () => el.removeEventListener('wheel', preventWindowScroll);
  }, []);

  const failure = !webgl
    ? 'Your browser or device could not create a WebGL context, which the 3D Moon requires.'
    : contextLost
      ? 'The graphics context was lost (the GPU may have been reset).'
      : status === 'error'
        ? (error ?? 'The lunar surface could not be prepared.')
        : null;

  const stage = (
    <div
      className={floating ? 'absolute inset-0 touch-none overscroll-none' : 'relative h-[56vh] min-h-[340px] touch-none overscroll-none'}
      role="application"
      aria-label="Interactive 3D Moon. Drag to rotate, scroll to zoom, right-drag to pan, double-click to focus, click to pick a location."
    >
      {failure ? (
        <div className="flex h-full flex-col">
          <WebGLFallback reason={failure} />
          {contextLost ? (
            <button
              type="button"
              className="btn absolute bottom-4 left-1/2 -translate-x-1/2"
              onClick={() => {
                setContextLost(false);
                setCanvasReady(false);
                setCanvasKey((k) => k + 1);
              }}
            >
              Reload 3D view
            </button>
          ) : null}
        </div>
      ) : (
        <GlobeErrorBoundary fallback={(message) => <WebGLFallback reason={`The 3D scene failed to start: ${message}`} />}>
          {textures ? (
            <Canvas
              key={canvasKey}
              camera={{ fov: 40, near: 0.01, far: 400, position: [0, 0.6, 3.3] }}
              dpr={[1, 2]}
              gl={{ antialias: true, powerPreference: 'high-performance' }}
              onCreated={({ gl }) => {
                gl.domElement.addEventListener('webglcontextlost', (e) => {
                  e.preventDefault();
                  setContextLost(true);
                });
                setCanvasReady(true);
              }}
            >
              <GlobeScene textures={textures} sites={sites} sun={sun} />
            </Canvas>
          ) : null}
          {!canvasReady || !textures ? <LunarGlobeLoader detail="Loading surface imagery" /> : null}
        </GlobeErrorBoundary>
      )}
    </div>
  );

  const cameraPanel = (
    <div className={isFull ? 'panel p-3' : ''}>
      <CameraControlPanel compact={!isFull} fullscreen={isFull ? fullscreen : undefined} />
    </div>
  );

  return (
    <section
      ref={containerRef}
      data-testid="lunar-globe"
      data-variant={variant}
      data-webgl={webgl && !contextLost ? 'true' : 'false'}
      data-ready={canvasReady && Boolean(textures) ? 'true' : 'false'}
      aria-label="3D lunar globe"
      className={`relative isolate bg-bg ${floating ? 'overflow-hidden' : ''} ${fullscreen.isFullscreen ? 'h-screen w-screen' : className}`}
      style={{ overscrollBehavior: 'none' }}
    >
      <CameraProbe />
      {stage}

      {/* Primary Simulation HUD Icon Toolbar pinned on top of the simulation card */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 pointer-events-auto">
        {/* Time & Clock Icon Button */}
        <button
          type="button"
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono backdrop-blur transition cursor-pointer shadow-lg ${
            showTimeFlyout
              ? 'border-cyan bg-cyan/25 text-cyan font-bold shadow-cyan/20'
              : 'border-line/80 bg-bg/90 text-fg-muted hover:text-cyan hover:border-cyan/50'
          }`}
          onClick={() => {
            setShowTimeFlyout((v) => !v);
            if (showNavLayers) setShowNavLayers(false);
            if (showMissionFlyout) setShowMissionFlyout(false);
          }}
          title="Toggle Astronomical Time & Orbit Controller"
        >
          <Clock className="size-3.5 text-cyan" />
          <span className="hidden sm:inline">
            {timeTrackingMode === 'realtime' ? '● LIVE' : 'TIME'}
          </span>
          <span className="text-sm text-fg-dim font-normal">
            {new Date(activeTimestampMs).toISOString().slice(0, 16).replace('T', ' ')} UTC
          </span>
        </button>

        {/* Navigation & Layers Icon Button */}
        <button
          type="button"
          className={`btn-icon size-8 rounded-lg border backdrop-blur transition cursor-pointer shadow-lg ${
            showNavLayers
              ? 'border-cyan bg-cyan/25 text-cyan font-bold shadow-cyan/20'
              : 'border-line/80 bg-bg/90 text-fg-muted hover:text-cyan hover:border-cyan/50'
          }`}
          onClick={() => {
            setShowNavLayers((v) => !v);
            if (showTimeFlyout) setShowTimeFlyout(false);
            if (showMissionFlyout) setShowMissionFlyout(false);
          }}
          title="Navigation, Coordinates & Surface Layers"
        >
          <Layers className="size-4" />
        </button>

        {/* Landing Navigator Icon Button */}
        <button
          type="button"
          className={`btn-icon size-8 rounded-lg border backdrop-blur transition cursor-pointer shadow-lg ${
            showLandingNavigator
              ? 'border-cyan bg-cyan/25 text-cyan font-bold shadow-cyan/20 ring-1 ring-cyan/50'
              : 'border-line/80 bg-bg/90 text-fg-muted hover:text-cyan hover:border-cyan/50'
          }`}
          onClick={() => {
            setShowLandingNavigator((v) => !v);
            if (showTimeFlyout) setShowTimeFlyout(false);
          }}
          title="Landing Navigator & Candidate Sites (10-Year Clusters)"
          aria-label="Landing Navigator & Candidate Sites"
        >
          <Crosshair className="size-4" />
        </button>

        {/* Mission Controls & Sites Icon Button */}
        <button
          type="button"
          className={`btn-icon size-8 rounded-lg border backdrop-blur transition cursor-pointer shadow-lg ${
            showMissionFlyout
              ? 'border-cyan bg-cyan/25 text-cyan font-bold shadow-cyan/20'
              : 'border-line/80 bg-bg/90 text-fg-muted hover:text-cyan hover:border-cyan/50'
          }`}
          onClick={() => {
            setShowMissionFlyout((v) => !v);
            if (showTimeFlyout) setShowTimeFlyout(false);
            if (showNavLayers) setShowNavLayers(false);
          }}
          title="Mission Controls & Cassini South Pole Reconnaissance"
        >
          <Compass className="size-4" />
        </button>

        {/* Satellite Labels / Tabs Toggle Button */}
        <button
          type="button"
          className={`btn-icon size-8 rounded-lg border backdrop-blur transition cursor-pointer shadow-lg ${
            showTelemetryLabels
              ? 'border-cyan bg-cyan/25 text-cyan shadow-cyan/20'
              : 'border-line/80 bg-bg/90 text-fg-dim hover:text-cyan'
          }`}
          onClick={toggleTelemetryLabels}
          title={showTelemetryLabels ? 'Hide satellite & body labels/tabs' : 'Show satellite & body labels/tabs'}
        >
          <Tag className="size-4" />
        </button>
      </div>

      {/* Top Right Camera & View Controls Toolbar */}
      <div className="absolute top-3 right-3 z-20 pointer-events-auto">
        {cameraPanel}
      </div>

      {/* Floating Astronomical Time Bar Flyout */}
      {showTimeFlyout ? (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 max-w-[95vw]">
          <AstronomicalTimeBar onClose={() => setShowTimeFlyout(false)} />
        </div>
      ) : null}

      {isFull && floating ? (
        <>
          {showNavLayers && (
            <DraggablePanel
              id="nav-layers"
              title="Navigation & Layers"
              dock="left"
              widthClassName="w-72"
              maxHeightClassName="max-h-[calc(100vh-10rem)]"
              onClose={() => setShowNavLayers(false)}
            >
              <div className="flex flex-col gap-3">
                <CoordinateEntryPanel />
                <LayersPanel sites={sites} />
              </div>
            </DraggablePanel>
          )}

          {showLandingNavigator && (
            <DraggablePanel
              id="landing-navigator"
              title="Landing Navigator"
              dock="left"
              widthClassName="w-88"
              maxHeightClassName="max-h-[calc(100vh-10rem)]"
              onClose={() => setShowLandingNavigator(false)}
            >
              <LandingNavigatorPanel />
            </DraggablePanel>
          )}

          {showSatellitePanel && !showMissionFlyout && (
            <DraggablePanel
              id="cassini-telemetry"
              title="Cassini Polar Reconnaissance"
              dock="right"
              widthClassName="w-80"
              maxHeightClassName="max-h-[calc(100vh-10rem)]"
              onClose={() => useGlobeStore.getState().toggleSatellitePanel(false)}
            >
              <CassiniSouthPolePanel />
            </DraggablePanel>
          )}

          {showMissionFlyout && (
            <DraggablePanel
              id="mission-controls"
              title="Mission & Controls"
              dock="right"
              widthClassName="w-80"
              maxHeightClassName="max-h-[calc(100vh-10rem)]"
              onClose={() => setShowMissionFlyout(false)}
            >
              <div className="flex flex-col gap-3">
                <CameraControlPanel compact={false} fullscreen={isFull ? fullscreen : undefined} />
                {showSatellitePanel ? <CassiniSouthPolePanel /> : null}
                <SiteInfoPanel />
              </div>
            </DraggablePanel>
          )}

          <div className="pointer-events-none absolute bottom-3 left-3 z-10">
            <CoordinateReadout />
          </div>
          <div className="pointer-events-none absolute bottom-14 sm:bottom-16 left-1/2 z-30 -translate-x-1/2 max-w-[calc(100%-2rem)]">
            <PendingLocationBar />
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 z-10 hidden sm:block">
            <QuickNavHelper onToggleNavigator={() => setShowLandingNavigator((v) => !v)} />
          </div>
        </>
      ) : null}

      {isFull && !floating ? (
        <div className="grid gap-3 p-3 md:grid-cols-2">
          <div className="space-y-3">
            {cameraPanel}
            {showLandingNavigator ? <LandingNavigatorPanel /> : null}
            {showSatellitePanel ? <CassiniSouthPolePanel /> : null}
            <PendingLocationBar />
            <CoordinateEntryPanel />
            <CoordinateReadout />
          </div>
          <div className="space-y-3">
            <SiteInfoPanel />
            <LayersPanel sites={sites} />
          </div>
        </div>
      ) : null}

      {!isFull ? (
        <>
          <div className="absolute right-3 top-3 z-10">{cameraPanel}</div>
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex flex-wrap items-end justify-between gap-2">
            <CoordinateReadout compact />
            <div className="flex flex-col items-end gap-2">
              <PendingLocationBar />
              {showExploreLink ? (
                <Link to="/explorer" className="btn btn-primary pointer-events-auto">
                  <Globe2 className="size-4" aria-hidden /> Explore Moon
                </Link>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
