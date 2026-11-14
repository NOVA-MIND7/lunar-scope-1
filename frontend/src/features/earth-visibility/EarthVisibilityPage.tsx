import { useCallback, useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { RelayConstellation3D } from './RelayConstellation3D';

export default function EarthVisibilityPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [paused, setPaused] = useState(false);
  const sendState = useCallback((nextPaused: boolean) => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'relay-state', paused: nextPaused }, '*');
  }, []);
  const sendFrame = useCallback((frame: number) => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'relay-frame', frame }, '*');
  }, []);
  useEffect(() => {
    const onMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === 'relay-toggle') setPaused(value => !value);
      if (event.data?.type === 'relay-ready') sendState(paused);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  useEffect(() => { sendState(paused); }, [paused, sendState]);
  return (
    <>
      <PageHeader title="Earth Visibility" description="Earth visibility from the selected site for communications planning." />
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-fg">Earth Satellite Relay Constellation</h2>
        <RelayConstellation3D paused={paused} onFrame={sendFrame} />
      </section>
      <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 shadow-2xl">
        <iframe
          title="Earth Satellite Relay Constellation"
          ref={iframeRef}
          src="/relay.html"
          onLoad={() => sendState(paused)}
          className="block h-[min(1100px,calc(100vh-180px))] min-h-[760px] w-full border-0"
        />
      </section>
    </>
  );
}
