import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { MoonEarthVisibilityAnalysis } from './MoonEarthVisibilityAnalysis';

export default function EarthVisibilityPage() {
  const [showRelayConstellation, setShowRelayConstellation] = useState(false);
  return (
    <>
      <PageHeader title="Earth Visibility" description="View Earth from a selected lunar landing site and analyze elevation, azimuth, and direct communication visibility." />
      <section className="mt-6">
        <MoonEarthVisibilityAnalysis />
      </section>
      <section className="mt-5">
        <button
          type="button"
          className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20"
          onClick={() => setShowRelayConstellation(value => !value)}
        >
          {showRelayConstellation ? 'Hide Satellite Relay Constellation' : 'Satellite Relay Constellation'}
        </button>
      </section>
      {showRelayConstellation && (
        <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 shadow-2xl">
          <iframe
            title="Satellite Relay Constellation"
            src="/relay.html"
            className="block h-[min(1100px,calc(100vh-180px))] min-h-[760px] w-full border-0"
          />
        </section>
      )}
    </>
  );
}
