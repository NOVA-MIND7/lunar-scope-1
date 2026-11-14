import { Sun, Satellite, Timer, Radio } from 'lucide-react';
import { MetricCard } from '@/components/common/MetricCard';
import { VisualizationPanel } from '@/components/dashboard/VisualizationPanel';
import { MissionControls } from '@/components/dashboard/MissionControls';
import { EarthConditions, MissionStatus, SolarConditions } from '@/components/dashboard/MissionConditions';
import { TimelinePreview } from '@/components/dashboard/TimelinePreview';
import { useAppStore } from '@/stores/appStore';
import { toUtcIso, formatUtc } from '@/utils/time';

export default function DashboardPage() {
  const site = useAppStore((s) => s.selectedLandingSite);
  const date = useAppStore((s) => s.selectedLandingDate);
  const time = useAppStore((s) => s.selectedLandingTime);
  const duration = useAppStore((s) => s.selectedMissionDuration);

  const landingUtc = toUtcIso(date, time);
  // Metric values come from the scientific engine, which is not connected yet, so they are unavailable.
  const context = site ? `${site.name} · ${formatUtc(landingUtc)}` : 'Select a landing site to begin';

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 lg:space-y-5">
      <section aria-labelledby="mc-title">
        <p className="label text-cyan">Lunar Landing Intelligence Platform</p>
        <h1 id="mc-title" className="mt-1 text-2xl font-semibold uppercase tracking-[0.12em] sm:text-3xl">
          Mission Control
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-fg-muted">
          Evaluate landing scenarios through lunar geometry, solar illumination, Earth visibility, and terrain analysis.
        </p>
      </section>

      <section aria-label="Key metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Solar elevation"
          value={null}
          unit="°"
          icon={Sun}
          quality="unavailable"
          description="Angle of the Sun above the local horizon at the selected site and time."
          context={context}
        />
        <MetricCard
          label="Earth elevation"
          value={null}
          unit="°"
          icon={Satellite}
          quality="unavailable"
          description="Angle of Earth above the local horizon, which sets the communications geometry."
          context={context}
        />
        <MetricCard
          label="Sunlight duration"
          value={null}
          unit="h"
          icon={Timer}
          quality="unavailable"
          description={`Continuous sunlit time across the ${duration}-day mission window.`}
          context={context}
        />
        <MetricCard
          label="Earth visibility"
          value={null}
          unit="%"
          icon={Radio}
          quality="unavailable"
          description={`Share of the ${duration}-day window with Earth above the horizon.`}
          context={context}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_22rem] lg:gap-5">
        <div className="md:col-span-2 xl:col-span-1">
          <VisualizationPanel />
        </div>
        <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2 xl:col-span-1 xl:grid-cols-1 lg:gap-5">
          <div className="md:col-span-2 xl:col-span-1">
            <MissionControls />
          </div>
          <SolarConditions />
          <EarthConditions />
          <div className="md:col-span-2 xl:col-span-1">
            <MissionStatus />
          </div>
        </div>
      </div>

      <TimelinePreview startUtc={landingUtc} durationDays={duration} />
    </div>
  );
}
