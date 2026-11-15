import { useMemo, useState } from 'react';
import {
  Sun,
  Satellite,
  Timer,
  Radio,
  Sparkles,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  X,
  Eye,
  EyeOff,
  BarChart3,
} from 'lucide-react';
import { MetricCard } from '@/components/common/MetricCard';
import { VisualizationPanel } from '@/components/dashboard/VisualizationPanel';
import { MissionControls } from '@/components/dashboard/MissionControls';
import { EarthConditions, MissionStatus, SolarConditions } from '@/components/dashboard/MissionConditions';
import { TimelinePreview } from '@/components/dashboard/TimelinePreview';
import { useMissionTimeline } from '@/hooks/useApi';
import { useAppStore } from '@/stores/appStore';
import type { TimelineResponse } from '@/types';
import { toUtcIso, formatUtc } from '@/utils/time';

const J2000_MS = 946_728_000_000;
const LUNAR_SYNODIC_MONTH = 29.530588853;
const LUNAR_SIDEREAL_MONTH = 27.321661;
const LUNAR_OBLIQUITY_DEG = 1.5424;
const SUN_ANGULAR_RADIUS_DEG = 0.26;
const RAD = Math.PI / 180;

const DEFAULT_BASELINE_SITE = {
  id: 'shackleton',
  name: 'Shackleton crater region',
  latitude_deg: -89.9,
  longitude_deg: 0.0,
} as const;

function calculateSolarElevationDeg(latDeg: number, lonDeg: number, timestampMs: number): number {
  const days = (timestampMs - J2000_MS) / 86_400_000;
  const sunDeclination = LUNAR_OBLIQUITY_DEG * Math.sin((2 * Math.PI * (days - 80)) / 365.25);
  const subsolarLon = (((218.316 - 360 * (days / LUNAR_SYNODIC_MONTH)) % 360) + 360) % 360;
  const phi = latDeg * RAD;
  const delta = sunDeclination * RAD;
  const hAngle = (lonDeg - subsolarLon) * RAD;
  const sinElev = Math.max(-1, Math.min(1, Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(hAngle)));
  return Math.asin(sinElev) / RAD;
}

function calculateEarthElevationDeg(latDeg: number, lonDeg: number, timestampMs: number): number {
  const days = (timestampMs - J2000_MS) / 86_400_000;
  const libLat = 6.68 * Math.sin((2 * Math.PI * days) / LUNAR_SIDEREAL_MONTH);
  const libLon = 7.91 * Math.sin((2 * Math.PI * (days - 5)) / LUNAR_SIDEREAL_MONTH);
  const phi = latDeg * RAD;
  const deltaE = libLat * RAD;
  const hEarth = (lonDeg - libLon) * RAD;
  const sinElev = Math.max(-1, Math.min(1, Math.sin(phi) * Math.sin(deltaE) + Math.cos(phi) * Math.cos(deltaE) * Math.cos(hEarth)));
  return Math.asin(sinElev) / RAD;
}

function computeDashboardMetrics(
  latDeg: number,
  lonDeg: number,
  landingUtc: string,
  durationDays: number,
  timelineData?: TimelineResponse | null,
) {
  const startMs = Date.parse(landingUtc);
  const safeStartMs = Number.isFinite(startMs) ? startMs : Date.now();
  const solarElevDeg = calculateSolarElevationDeg(latDeg, lonDeg, safeStartMs);
  const earthElevDeg = calculateEarthElevationDeg(latDeg, lonDeg, safeStartMs);

  let maxContinuousSunHours: number | null = null;
  let earthVisiblePct: number | null = null;

  const intervals = timelineData?.sunlight_track?.intervals;
  if (Array.isArray(intervals) && typeof timelineData?.earth_visible_fraction === 'number') {
    let bestHours = 0;
    for (const iv of intervals) {
      if (iv.state === 'sunlit') {
        const spanH = (Date.parse(iv.end_utc) - Date.parse(iv.start_utc)) / 3_600_000;
        if (Number.isFinite(spanH) && spanH > bestHours) bestHours = spanH;
      }
    }
    maxContinuousSunHours = bestHours;
    earthVisiblePct = timelineData.earth_visible_fraction * 100;
  }

  if (maxContinuousSunHours === null || earthVisiblePct === null) {
    const totalHours = Math.max(1, durationDays) * 24;
    const stepHours = durationDays <= 30 ? 1 : 3;
    const steps = Math.max(1, Math.floor(totalHours / stepHours));
    let currentSunStreak = 0;
    let bestSunStreak = 0;
    let earthVisibleSteps = 0;

    for (let i = 0; i <= steps; i++) {
      const tMs = safeStartMs + i * stepHours * 3_600_000;
      const sunEl = calculateSolarElevationDeg(latDeg, lonDeg, tMs);
      const earthEl = calculateEarthElevationDeg(latDeg, lonDeg, tMs);

      if (i < steps) {
        if (sunEl > -SUN_ANGULAR_RADIUS_DEG) {
          currentSunStreak += stepHours;
          if (currentSunStreak > bestSunStreak) bestSunStreak = currentSunStreak;
        } else {
          currentSunStreak = 0;
        }
        if (earthEl > 0) earthVisibleSteps += 1;
      }
    }

    maxContinuousSunHours = Math.min(totalHours, bestSunStreak);
    earthVisiblePct = (earthVisibleSteps / steps) * 100;
  }

  return {
    solarElevation: solarElevDeg.toFixed(1),
    earthElevation: earthElevDeg.toFixed(1),
    sunlightDuration: maxContinuousSunHours.toFixed(1),
    earthVisibility: earthVisiblePct.toFixed(1),
  };
}

function SimpleUserGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="rounded-lg border border-cyan/30 bg-cyan/5 p-3.5 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-cyan" />
          <h2 className="text-base font-semibold text-fg">Quick guide: plan a lunar landing</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-fg-muted hover:text-cyan flex items-center gap-1 cursor-pointer"
          aria-label="Close guide"
        >
          <ChevronUp className="size-4" />
        </button>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-3 pt-3 border-t border-cyan/15 text-sm">
        <div className="flex flex-col gap-1 rounded bg-bg/60 p-2.5 border border-line">
          <span className="font-semibold text-cyan">1. Choose a landing site</span>
          <p className="text-fg-muted leading-relaxed">Pick where your spacecraft will touch down on the Moon.</p>
        </div>
        <div className="flex flex-col gap-1 rounded bg-bg/60 p-2.5 border border-line">
          <span className="font-semibold text-cyan">2. Set date and duration</span>
          <p className="text-fg-muted leading-relaxed">Choose touchdown time and how long the mission will stay.</p>
        </div>
        <div className="flex flex-col gap-1 rounded bg-bg/60 p-2.5 border border-line">
          <span className="font-semibold text-cyan">3. Check conditions</span>
          <p className="text-fg-muted leading-relaxed">Review sunlight for power and Earth visibility for radio.</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const site = useAppStore((s) => s.selectedLandingSite);
  const coords = useAppStore((s) => s.selectedCoordinates);
  const date = useAppStore((s) => s.selectedLandingDate);
  const time = useAppStore((s) => s.selectedLandingTime);
  const duration = useAppStore((s) => s.selectedMissionDuration);

  const [openDrawer, setOpenDrawer] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showMissionSetupButton, setShowMissionSetupButton] = useState(true);

  const landingUtc = toUtcIso(date, time);
  const activeCoords = site?.coordinates ?? coords;
  const evalLat = activeCoords?.latitude_deg ?? DEFAULT_BASELINE_SITE.latitude_deg;
  const evalLon = activeCoords?.longitude_deg ?? DEFAULT_BASELINE_SITE.longitude_deg;
  const timelineSiteId = site
    ? site.category === 'custom'
      ? null
      : site.id
    : activeCoords
      ? null
      : DEFAULT_BASELINE_SITE.id;

  const timeline = useMissionTimeline(timelineSiteId, landingUtc, duration);

  const metrics = useMemo(() => {
    return computeDashboardMetrics(evalLat, evalLon, landingUtc, duration, timeline.data);
  }, [evalLat, evalLon, landingUtc, duration, timeline.data]);

  const quality = 'computed' as const;
  const context = site
    ? `${site.name} · ${formatUtc(landingUtc)}`
    : activeCoords
      ? `${activeCoords.latitude_deg.toFixed(2)}°, ${activeCoords.longitude_deg.toFixed(2)}° · ${formatUtc(landingUtc)}`
      : `Default: ${DEFAULT_BASELINE_SITE.name} · ${formatUtc(landingUtc)}`;

  return (
    <div className="mx-auto flex h-[calc(100vh-5.25rem)] max-w-[1800px] flex-col gap-2 overflow-hidden">
      {/* Optional details panel (hidden by default to reduce complexity) */}
      {showDetails ? (
        <div className="flex shrink-0 flex-col gap-3 rounded-lg border border-line bg-bg-secondary/60 p-3 transition-all duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-cyan" />
              <h2 className="text-base font-semibold text-fg">Mission details</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowGuide((v) => !v)}
                className="flex items-center gap-1.5 rounded-md border border-cyan/40 bg-cyan/10 px-2.5 py-1.5 text-sm font-medium text-cyan hover:bg-cyan/20 transition cursor-pointer"
              >
                <Sparkles className="size-4" />
                <span>{showGuide ? 'Hide guide' : 'Show guide'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="flex items-center gap-1.5 rounded-md border border-line bg-surface-elevated/80 px-2.5 py-1.5 text-sm font-medium text-fg-muted hover:text-cyan hover:border-cyan/40 transition cursor-pointer"
                title="Hide details"
              >
                <EyeOff className="size-4" />
                <span>Hide</span>
              </button>
            </div>
          </div>

          {showGuide ? <SimpleUserGuide onClose={() => setShowGuide(false)} /> : null}

          <section aria-label="Key metrics" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <MetricCard
              compact
              label="Solar elevation"
              value={metrics.solarElevation}
              unit="°"
              icon={Sun}
              quality={quality}
              description="Sun angle above local horizon (solar panel energy)."
              context={context}
            />
            <MetricCard
              compact
              label="Earth elevation"
              value={metrics.earthElevation}
              unit="°"
              icon={Satellite}
              quality={quality}
              description="Earth angle above horizon (direct radio comms)."
              context={context}
            />
            <MetricCard
              compact
              label="Sunlight duration"
              value={metrics.sunlightDuration}
              unit="h"
              icon={Timer}
              quality={quality}
              description={`Hours of continuous sunlight over ${duration} days.`}
              context={context}
            />
            <MetricCard
              compact
              label="Earth visibility"
              value={metrics.earthVisibility}
              unit="%"
              icon={Radio}
              quality={quality}
              description="Direct line-of-sight share to Earth for radio."
              context={context}
            />
          </section>
        </div>
      ) : null}

      {/* 3D Simulation Card fills remaining screen */}
      <div className="relative flex-1 min-h-[460px] overflow-hidden rounded-lg border border-line bg-bg shadow-2xl">
        <div className="absolute inset-0">
          <VisualizationPanel />
        </div>

        {/* Show details toggle (keeps dashboard simple by default) */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-cyan/50 bg-bg/95 px-3.5 py-1.5 text-sm font-medium text-cyan shadow-xl backdrop-blur-md hover:bg-cyan/15 transition cursor-pointer"
            title={showDetails ? 'Hide mission details' : 'Show mission details'}
          >
            {showDetails ? <ChevronUp className="size-4" /> : <Eye className="size-4" />}
            <span>{showDetails ? 'Hide details' : 'Show details'}</span>
          </button>
        </div>

        {/* Mission Setup controls (hideable) */}
        {showMissionSetupButton ? (
          <div className="absolute top-14 left-3 z-30 flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              className={`flex items-center gap-2 rounded-lg border border-line bg-bg/90 px-3 py-2 text-sm font-medium shadow-xl backdrop-blur-md transition cursor-pointer ${
                openDrawer
                  ? 'border-cyan bg-cyan/20 text-cyan ring-1 ring-cyan/50'
                  : 'text-fg-muted hover:text-fg hover:bg-surface-elevated'
              }`}
              onClick={() => setOpenDrawer((v) => !v)}
              title="Open mission setup panels"
              aria-expanded={openDrawer}
            >
              <SlidersHorizontal className="size-4 text-cyan" />
              <span>Mission setup</span>
              {openDrawer ? <X className="size-4 text-fg-dim hover:text-fg" /> : <ChevronDown className="size-4" />}
            </button>

            <button
              type="button"
              className="btn-icon size-8 rounded-lg border border-line/60 bg-bg/85 text-fg-dim hover:text-fg cursor-pointer"
              onClick={() => setShowMissionSetupButton(false)}
              title="Hide mission setup button"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="absolute top-14 left-3 z-30 pointer-events-auto">
            <button
              type="button"
              className="btn-icon size-9 rounded-lg border border-cyan/40 bg-bg/90 text-cyan shadow-xl backdrop-blur-md hover:bg-cyan/20 cursor-pointer"
              onClick={() => setShowMissionSetupButton(true)}
              title="Show mission setup button"
            >
              <SlidersHorizontal className="size-4 text-cyan" />
            </button>
          </div>
        )}

        <div
          className={`absolute top-14 left-3 z-30 w-96 max-w-[calc(100vw-2.5rem)] max-h-[calc(100%-4.5rem)] overflow-y-auto rounded-lg border border-line bg-bg-secondary/95 p-3 shadow-2xl backdrop-blur-md transition-all duration-300 space-y-3 ${
            openDrawer
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="text-sm font-semibold text-cyan">Mission setup and analysis</span>
            <button
              type="button"
              className="btn-icon size-7"
              onClick={() => setOpenDrawer(false)}
              title="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <MissionControls />
          <SolarConditions />
          <EarthConditions />
          <MissionStatus />
          <TimelinePreview startUtc={landingUtc} durationDays={duration} />
        </div>
      </div>
    </div>
  );
}
