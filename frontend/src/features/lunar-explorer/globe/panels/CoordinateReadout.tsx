import { useAppStore } from '@/stores/appStore';
import { DataSourceBadge } from '@/components/common/DataSourceBadge';
import { formatLatitude, formatLongitude } from '@/utils/format';
import { MEAN_LUNAR_RADIUS_KM } from '@/utils/lunarCoordinates';
import type { LunarCoordinates } from '@/types';
import { useGlobeStore } from '../globeStore';

const fmt = (c: LunarCoordinates | null) => (c ? `${formatLatitude(c.latitude_deg)}  ${formatLongitude(c.longitude_deg)}` : '—');

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-14 shrink-0 text-fg-dim">{label}</dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </div>
  );
}

/** Floating coordinate display: pointer position, picked point, selected site, camera. */
export function CoordinateReadout({ compact = false }: { compact?: boolean }) {
  const cursor = useGlobeStore((s) => s.cursor);
  const pending = useGlobeStore((s) => s.pending);
  const camera = useGlobeStore((s) => s.camera);
  const source = useGlobeStore((s) => s.textureSource);
  const site = useAppStore((s) => s.selectedLandingSite);
  const altitudeKm = Math.max(0, (camera.distance - 1) * MEAN_LUNAR_RADIUS_KM);

  return (
    <dl className="pointer-events-auto w-max max-w-[min(100%,20rem)] rounded border border-line-strong bg-bg/80 px-3 py-2 font-mono text-sm backdrop-blur-md" data-testid="coordinate-readout">
      <Row label="CURSOR">{cursor ? fmt(cursor) : <span className="text-fg-dim">move over the Moon</span>}</Row>
      <Row label="PICKED">{pending ? <span data-testid="picked-coordinates">{fmt(pending)}</span> : '—'}</Row>
      <Row label="SITE">{site ? `${site.name}` : 'None selected'}</Row>
      {compact ? null : (
        <>
          <Row label="COORD">{site ? fmt(site.coordinates) : '—'}</Row>
          <Row label="VIEW">
            <span data-testid="view-center">
              {formatLatitude(camera.centerLatitude)} {formatLongitude(camera.centerLongitude)}
            </span>
          </Row>
          <Row label="ALT">
            <span data-testid="camera-altitude">≈ {Math.round(altitudeKm).toLocaleString()} km</span>
          </Row>
        </>
      )}
      <div className="mt-1.5 flex flex-wrap gap-1.5 border-t border-line pt-1.5">
        {source ? <DataSourceBadge kind={source.isRealImagery ? 'sample' : 'demo'} label={source.isRealImagery ? 'Installed imagery' : 'Procedural surface'} /> : null}
        <DataSourceBadge kind="demo" label="Illustrative light" />
      </div>
    </dl>
  );
}
