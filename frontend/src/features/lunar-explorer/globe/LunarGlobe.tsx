import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Globe2 } from 'lucide-react';
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
  const failure = !webgl
    ? 'Your browser or device could not create a WebGL context, which the 3D Moon requires.'
    : contextLost
      ? 'The graphics context was lost (the GPU may have been reset).'
      : status === 'error'
        ? (error ?? 'The lunar surface could not be prepared.')
        : null;

  const stage = (
    <div
      className={floating ? 'absolute inset-0' : 'relative h-[56vh] min-h-[340px]'}
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
    >
      <CameraProbe />
      {/* Floating Astronomical Real-Time & Date Control Bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-[95vw]">
        <AstronomicalTimeBar />
      </div>
      {stage}

      {isFull && floating ? (
        <>
          <DraggablePanel
            id="nav-layers"
            title="Navigation & Layers"
            dock="left"
            widthClassName="w-72"
            maxHeightClassName="max-h-[calc(100vh-13.5rem)]"
          >
            <div className="flex flex-col gap-3">
              <CoordinateEntryPanel />
              <LayersPanel sites={sites} />
            </div>
          </DraggablePanel>

          <DraggablePanel
            id="mission-controls"
            title="Mission & Controls"
            dock="right"
            widthClassName="w-80"
            maxHeightClassName="max-h-[calc(100vh-10rem)]"
          >
            <div className="flex flex-col gap-3">
              <CameraControlPanel compact={false} fullscreen={isFull ? fullscreen : undefined} />
              {showSatellitePanel ? <CassiniSouthPolePanel /> : null}
              <SiteInfoPanel />
            </div>
          </DraggablePanel>

          <div className="pointer-events-none absolute bottom-3 left-3 z-10">
            <CoordinateReadout />
          </div>
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
            <PendingLocationBar />
          </div>
        </>
      ) : null}

      {isFull && !floating ? (
        <div className="grid gap-3 p-3 md:grid-cols-2">
          <div className="space-y-3">
            {cameraPanel}
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
