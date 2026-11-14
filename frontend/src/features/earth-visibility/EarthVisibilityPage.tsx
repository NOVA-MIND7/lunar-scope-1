import { PageHeader } from '@/components/common/PageHeader';

export default function EarthVisibilityPage() {
  return (
    <>
      <PageHeader title="Earth Visibility" description="Earth visibility from the selected site for communications planning." />
      <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 shadow-2xl">
        <iframe
          title="Earth Satellite Relay Constellation"
          src="/relay.html"
          className="block h-[min(1100px,calc(100vh-180px))] min-h-[760px] w-full border-0"
        />
      </section>
    </>
  );
}
