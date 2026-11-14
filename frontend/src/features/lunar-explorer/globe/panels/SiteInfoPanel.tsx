import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { MissionPanel } from '@/components/common/MissionPanel';
import { EmptyState } from '@/components/common/EmptyState';
import { DataRow } from '@/components/common/DataRow';
import { useAppStore } from '@/stores/appStore';
import { formatLatitude, formatLongitude } from '@/utils/format';
import { CATEGORY_STYLE, PRECISION_NOTE } from '../constants';

/** Detail panel for the selected landing site (catalogue or custom). */
export function SiteInfoPanel() {
  const site = useAppStore((s) => s.selectedLandingSite);
  const coords = useAppStore((s) => s.selectedCoordinates);
  const style = site ? CATEGORY_STYLE[site.category] : null;
  const note = site ? PRECISION_NOTE[site.precision] : null;

  return (
    <MissionPanel title="Site information" icon={MapPin}>
      {site && style ? (
        <div data-testid="site-info">
          <p className="text-sm font-semibold">{site.name}</p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: style.color }}>
            {style.label}
          </p>
          <dl className="mt-2">
            <DataRow label="Latitude">{formatLatitude(site.coordinates.latitude_deg)}</DataRow>
            <DataRow label="Longitude">{formatLongitude(site.coordinates.longitude_deg)}</DataRow>
            <DataRow label="Region" mono={false}>
              {site.region.replace('-', ' ')}
            </DataRow>
            <DataRow label="Provenance" mono={false}>
              {site.provenance}
            </DataRow>
          </dl>
          {note ? <p className="mt-2 rounded border border-warning/40 bg-warning/10 px-2 py-1.5 text-[11px] text-warning">{note}</p> : null}
          <p className="mt-2 text-xs text-fg-muted">{site.description}</p>
          {site.notes ? <p className="mt-1 text-[11px] text-fg-dim">{site.notes}</p> : null}
          <p className="mt-3 border-t border-line pt-2 text-[11px] text-fg-dim" data-testid="analysis-ready">
            Stored for analysis: {coords ? `${coords.latitude_deg.toFixed(4)}°, ${coords.longitude_deg.toFixed(4)}°` : '—'} ·{' '}
            <Link to="/solar" className="text-cyan hover:underline">
              Solar
            </Link>{' '}
            ·{' '}
            <Link to="/earth" className="text-cyan hover:underline">
              Earth
            </Link>{' '}
            ·{' '}
            <Link to="/terrain" className="text-cyan hover:underline">
              Terrain
            </Link>
          </p>
        </div>
      ) : (
        <EmptyState compact icon={MapPin} title="No site selected" message="Click a marker, click the Moon, or enter coordinates." />
      )}
    </MissionPanel>
  );
}
