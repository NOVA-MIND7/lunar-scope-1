import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { SystemStatus } from '@/components/dashboard/SystemStatus';
import { MissionPanel } from '@/components/common/MissionPanel';
import { DataRow } from '@/components/common/DataRow';
import { StatusIndicator } from '@/components/common/StatusIndicator';
import { useHealth } from '@/hooks/useApi';
import { useBackendStatus } from '@/hooks/useBackendStatus';

export default function SystemStatusPage() {
  const health = useHealth();
  const backend = useBackendStatus();
  const db = health.data?.database;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="System Status"
        description="Health of the services LUNAR SCOPE depends on."
        actions={
          <button type="button" className="btn" onClick={() => void health.refetch()} disabled={health.isFetching}>
            <RefreshCw className={`size-3.5 ${health.isFetching ? 'animate-spin' : ''}`} aria-hidden /> Refresh
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <SystemStatus />
        <MissionPanel title="Services">
          <dl>
            <DataRow label="Web application" mono={false}>
              <StatusIndicator state="online" label="Running" />
            </DataRow>
            <DataRow label="Backend API" mono={false}>
              <StatusIndicator state={backend.state} label={backend.label} />
            </DataRow>
            <DataRow label="Database" mono={false}>
              <StatusIndicator
                state={db === 'connected' ? 'online' : db === 'unreachable' ? 'offline' : 'idle'}
                label={db ?? 'Unknown'}
              />
            </DataRow>
            <DataRow label="Scientific engine" mono={false}>
              <StatusIndicator state="idle" label="Not connected" />
            </DataRow>
            <DataRow label="3D Moon renderer" mono={false}>
              <StatusIndicator state="idle" label="Placeholder" />
            </DataRow>
          </dl>
        </MissionPanel>
      </div>
    </div>
  );
}
