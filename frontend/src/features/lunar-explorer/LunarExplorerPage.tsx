import { PageHeader } from '@/components/common/PageHeader';
import { LunarGlobe } from './globe/LunarGlobe';
import { useGlobeStore } from './globe/globeStore';

function SurfaceCredit() {
  const source = useGlobeStore((s) => s.textureSource);
  if (!source) return null;
  return (
    <p className="mt-3 text-[11px] text-fg-dim" data-testid="surface-credit">
      <span className="font-semibold text-fg-muted">Surface:</span> {source.label}. {source.credit}{' '}
      <span className="font-semibold text-fg-muted">Lighting:</span> illustrative default direction, not computed from an ephemeris.
    </p>
  );
}

export default function LunarExplorerPage() {
  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        title="Lunar Explorer"
        description="Rotate, zoom and pan the Moon, pick any location, or choose a landing-site candidate."
      />
      <LunarGlobe variant="full" className="panel h-auto lg:h-[calc(100vh-14rem)] lg:min-h-[640px]" />
      <SurfaceCredit />
    </div>
  );
}
