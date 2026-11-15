import { useCallback, useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { MoonEarthVisibilityAnalysis } from './MoonEarthVisibilityAnalysis';
import { RelayConstellation3D } from './RelayConstellation3D';

export default function EarthVisibilityPage() {
  const [showRelayConstellation, setShowRelayConstellation] = useState(false);
  const [relayPaused, setRelayPaused] = useState(false);
  const relayFrameRef = useRef<HTMLIFrameElement>(null);
  const sendRelayState = useCallback((paused: boolean) => {
    relayFrameRef.current?.contentWindow?.postMessage({ type: 'relay-state', paused }, '*');
  }, []);
  const sendRelayFrame = useCallback((frame: number) => {
    relayFrameRef.current?.contentWindow?.postMessage({ type: 'relay-frame', frame }, '*');
  }, []);
  useEffect(() => {
    const handleRelayMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === 'relay-toggle') setRelayPaused(value => !value);
      if (event.data?.type === 'relay-ready') sendRelayState(relayPaused);
    };
    window.addEventListener('message', handleRelayMessage);
    return () => window.removeEventListener('message', handleRelayMessage);
  }, [relayPaused, sendRelayState]);
  useEffect(() => { sendRelayState(relayPaused); }, [relayPaused, sendRelayState]);
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
        <div className="mt-4 space-y-4">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-fg">3D Satellite Relay Constellation</h2>
            <RelayConstellation3D paused={relayPaused} onFrame={sendRelayFrame} />
          </section>
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 shadow-2xl">
            <h2 className="px-4 pt-4 text-lg font-semibold text-fg">2D Satellite Relay Constellation</h2>
            <iframe
              title="2D Satellite Relay Constellation"
              ref={relayFrameRef}
              src="/relay.html"
              onLoad={() => sendRelayState(relayPaused)}
              className="block h-[min(1100px,calc(100vh-180px))] min-h-[760px] w-full border-0"
            />
          </section>
        </div>
      )}
    </>
  );
}
