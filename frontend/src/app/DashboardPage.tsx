import { useState } from 'react';
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
  EyeOff,
} from 'lucide-react';
import { MetricCard } from '@/components/common/MetricCard';
import { VisualizationPanel } from '@/components/dashboard/VisualizationPanel';
import { MissionControls } from '@/components/dashboard/MissionControls';
import { EarthConditions, MissionStatus, SolarConditions } from '@/components/dashboard/MissionConditions';
import { TimelinePreview } from '@/components/dashboard/TimelinePreview';
import { useAppStore } from '@/stores/appStore';
import { toUtcIso, formatUtc } from '@/utils/time';

function SimpleUserGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="rounded-lg border border-cyan/30 bg-cyan/5 p-3.5 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-cyan" />
          <h2 className="text-sm font-semibold text-fg">Simple Guide: How to Plan a Lunar Landing</h2>
          <span className="rounded bg-cyan/20 px-2 py-0.5 text-[10px] font-semibold text-cyan">3 Easy Steps</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-fg-muted hover:text-cyan flex items-center gap-1 cursor-pointer"
          aria-label="Close guide"
        >
          <ChevronUp className="size-3.5" />
        </button>
      </div>

      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3 pt-2.5 border-t border-cyan/15 text-xs">
        <div className="flex flex-col gap-0.5 rounded bg-bg/60 p-2 border border-line">
          <span className="font-semibold text-cyan">1. Choose a Landing Site</span>
          <p className="text-fg-muted text-[11px] leading-relaxed">
            Pick where your spacecraft will touch down on the Moon via Mission Setup.
          </p>
        </div>
        <div className="flex flex-col gap-0.5 rounded bg-bg/60 p-2 border border-line">
          <span className="font-semibold text-cyan">2. Set Date & Duration</span>
          <p className="text-fg-muted text-[11px] leading-relaxed">
            Choose your touchdown date and how many days your crew or rover will stay.
          </p>
        </div>
        <div className="flex flex-col gap-0.5 rounded bg-bg/60 p-2 border border-line">
          <span className="font-semibold text-cyan">3. Check Conditions</span>
          <p className="text-fg-muted text-[11px] leading-relaxed">
            Verify solar light for power and direct line-of-sight for Earth radio link.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const site = useAppStore((s) => s.selectedLandingSite);
  const date = useAppStore((s) => s.selectedLandingDate);
  const time = useAppStore((s) => s.selectedLandingTime);
  const duration = useAppStore((s) => s.selectedMissionDuration);

  const [openDrawer, setOpenDrawer] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showTopSection, setShowTopSection] = useState(true);
  const [showMissionSetupButton, setShowMissionSetupButton] = useState(true);

  const landingUtc = toUtcIso(date, time);
  // Metric values come from the scientific engine, which is not connected yet, so they are unavailable.
  const context = site ? `${site.name} · ${formatUtc(landingUtc)}` : 'Select a landing site to begin';

  return (
    <div className="mx-auto flex h-[calc(100vh-5.25rem)] max-w-[1800px] flex-col gap-2 overflow-hidden">
      {/* Top Header & Metrics Bar (Hide & Show toggleable) */}
      {showTopSection ? (
        <div className="flex shrink-0 flex-col gap-2 transition-all duration-300">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="label text-[10px] text-cyan">Lunar Landing Intelligence</p>
              <h1 id="mc-title" className="text-lg font-bold uppercase tracking-[0.12em] sm:text-xl">
                Mission Control
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowGuide((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-1 text-xs font-semibold text-cyan hover:bg-cyan/20 transition cursor-pointer"
              >
                <Sparkles className="size-3.5" />
                <span>{showGuide ? 'Hide Guide' : '3-Step Guide'}</span>
                {showGuide ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </button>

              <button
                type="button"
                onClick={() => setShowTopSection(false)}
                className="flex items-center gap-1.5 rounded-full border border-line bg-surface-elevated/80 px-2.5 py-1 text-xs font-semibold text-fg-muted hover:text-cyan hover:border-cyan/40 transition cursor-pointer"
                title="Hide overview and metric cards to expand simulation view"
              >
                <EyeOff className="size-3.5" />
                <span className="hidden sm:inline">Hide Overview</span>
              </button>
            </div>
          </div>

          {showGuide ? <SimpleUserGuide onClose={() => setShowGuide(false)} /> : null}

          {/* Slim compact metric cards */}
          <section aria-label="Key metrics" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <MetricCard
              compact
              label="Solar elevation"
              value={null}
              unit="°"
              icon={Sun}
              quality="unavailable"
              description="Sun angle above local horizon (solar panel energy)."
              context={context}
            />
            <MetricCard
              compact
              label="Earth elevation"
              value={null}
              unit="°"
              icon={Satellite}
              quality="unavailable"
              description="Earth angle above horizon (direct radio comms)."
              context={context}
            />
            <MetricCard
              compact
              label="Sunlight duration"
              value={null}
              unit="h"
              icon={Timer}
              quality="unavailable"
              description={`Hours of continuous sunlight over ${duration} days.`}
              context={context}
            />
            <MetricCard
              compact
              label="Earth visibility"
              value={null}
              unit="%"
              icon={Radio}
              quality="unavailable"
              description="Direct line-of-sight share to Earth for radio."
              context={context}
            />
          </section>
        </div>
      ) : null}

      {/* 3D Simulation Card fills remaining screen; no page up/down scrolling */}
      <div className="relative flex-1 min-h-[460px] overflow-hidden rounded-lg border border-line bg-bg shadow-2xl">
        {/* Full-bleed 3D Canvas */}
        <div className="absolute inset-0">
          <VisualizationPanel />
        </div>

        {/* Floating Restore Button when Top Section is Hidden */}
        {!showTopSection ? (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
            <button
              type="button"
              onClick={() => setShowTopSection(true)}
              className="flex items-center gap-1.5 rounded-full border border-cyan/60 bg-bg/95 px-3 py-1 font-mono text-xs font-bold text-cyan shadow-2xl backdrop-blur-md hover:bg-cyan/20 transition cursor-pointer"
              title="Show overview header and metric cards"
            >
              <ChevronDown className="size-3.5 text-cyan animate-bounce" />
              <span>SHOW MISSION OVERVIEW & METRICS</span>
            </button>
          </div>
        ) : null}

        {/* Floating Icon Dock for Mission Planning Panels (Auto-Hide toggle) */}
        {showMissionSetupButton ? (
          <div className="absolute top-12 left-3 z-30 flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              className={`flex items-center gap-2 rounded-lg border border-line bg-bg/90 px-3 py-1.5 text-xs font-semibold shadow-xl backdrop-blur-md transition cursor-pointer ${
                openDrawer
                  ? 'border-cyan bg-cyan/20 text-cyan ring-1 ring-cyan/50 shadow-cyan/20'
                  : 'text-fg-muted hover:text-fg hover:bg-surface-elevated'
              }`}
              onClick={() => setOpenDrawer((v) => !v)}
              title="Open or auto-hide mission planning panels"
              aria-expanded={openDrawer}
            >
              <SlidersHorizontal className="size-3.5 text-cyan" />
              <span>Mission Setup & Controls</span>
              {openDrawer ? <X className="size-3 text-fg-dim hover:text-fg" /> : <ChevronDown className="size-3" />}
            </button>

            <button
              type="button"
              className="btn-icon size-7 rounded-lg border border-line/60 bg-bg/85 text-fg-dim hover:text-fg cursor-pointer"
              onClick={() => setShowMissionSetupButton(false)}
              title="Hide Mission Setup button"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <div className="absolute top-12 left-3 z-30 pointer-events-auto">
            <button
              type="button"
              className="btn-icon size-8 rounded-lg border border-cyan/40 bg-bg/90 text-cyan shadow-xl backdrop-blur-md hover:bg-cyan/20 cursor-pointer"
              onClick={() => setShowMissionSetupButton(true)}
              title="Show Mission Setup button"
            >
              <SlidersHorizontal className="size-3.5 text-cyan" />
            </button>
          </div>
        )}

        {/* Floating Glassmorphic Overlay Drawer (Auto-Hides) */}
        <div
          className={`absolute top-12 left-3 z-30 w-92 max-w-[calc(100vw-2.5rem)] max-h-[calc(100%-4rem)] overflow-y-auto rounded-lg border border-line bg-bg-secondary/95 p-3 shadow-2xl backdrop-blur-md transition-all duration-300 space-y-3 ${
            openDrawer
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan">Mission Setup & Analysis</span>
            <button
              type="button"
              className="btn-icon size-6 text-xs"
              onClick={() => setOpenDrawer(false)}
              title="Close / Auto-hide"
            >
              <X className="size-3.5" />
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
