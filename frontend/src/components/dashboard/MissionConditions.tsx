import { Sun, Satellite, ClipboardList, Crosshair } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MissionPanel } from '@/components/common/MissionPanel';
import { DataRow } from '@/components/common/DataRow';
import { EmptyState } from '@/components/common/EmptyState';
import { DataSourceBadge } from '@/components/common/DataSourceBadge';
import { StatusIndicator } from '@/components/common/StatusIndicator';
import { useAppStore } from '@/stores/appStore';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { pluralDays } from '@/utils/format';

const UNAVAILABLE = <span className="text-fg-dim">—</span>;

function NoSite() {
  return (
    <EmptyState
      compact
      icon={Crosshair}
      title="No landing site selected"
      message="Choose a site in Mission setup to see conditions."
    />
  );
}

function Unavailable({ children }: { children: string }) {
  return <StatusIndicator state="idle" label={children} />;
}

export function SolarConditions() {
  const site = useAppStore((s) => s.selectedLandingSite);
  return (
    <MissionPanel title="Solar conditions" icon={Sun}>
      {site ? (
        <dl>
          <DataRow label="Solar elevation">{UNAVAILABLE}</DataRow>
          <DataRow label="Solar azimuth">{UNAVAILABLE}</DataRow>
          <DataRow label="Sunlight status" mono={false}>
            <Unavailable>Awaiting engine</Unavailable>
          </DataRow>
        </dl>
      ) : (
        <NoSite />
      )}
    </MissionPanel>
  );
}

export function EarthConditions() {
  const site = useAppStore((s) => s.selectedLandingSite);
  return (
    <MissionPanel title="Earth conditions" icon={Satellite}>
      {site ? (
        <dl>
          <DataRow label="Earth elevation">{UNAVAILABLE}</DataRow>
          <DataRow label="Earth azimuth">{UNAVAILABLE}</DataRow>
          <DataRow label="Direct visibility" mono={false}>
            <Unavailable>Awaiting engine</Unavailable>
          </DataRow>
        </dl>
      ) : (
        <NoSite />
      )}
    </MissionPanel>
  );
}

export function MissionStatus() {
  const site = useAppStore((s) => s.selectedLandingSite);
  const date = useAppStore((s) => s.selectedLandingDate);
  const time = useAppStore((s) => s.selectedLandingTime);
  const duration = useAppStore((s) => s.selectedMissionDuration);
  const dataMode = useAppStore((s) => s.dataMode);
  const backend = useBackendStatus();

  return (
    <MissionPanel title="Mission status" icon={ClipboardList}>
      <dl>
        <DataRow label="Landing site" mono={false}>
          {site ? site.name : <span className="text-fg-dim">None selected</span>}
        </DataRow>
        <DataRow label="Date (UTC)">
          {date} · {time}
        </DataRow>
        <DataRow label="Duration">{pluralDays(duration)}</DataRow>
        <DataRow label="Data source" mono={false}>
          <span className="inline-flex items-center gap-2">
            <DataSourceBadge kind={dataMode === 'sample' ? 'sample' : 'computed'} label={dataMode === 'sample' ? 'Sample' : 'Live'} />
            <StatusIndicator state={backend.state} label={`API ${backend.label.toLowerCase()}`} />
          </span>
        </DataRow>
      </dl>
      <p className="mt-3 text-[11px] text-fg-dim">
        See <Link to="/data-sources" className="text-cyan hover:underline">Data Sources</Link> for integration status.
      </p>
    </MissionPanel>
  );
}
