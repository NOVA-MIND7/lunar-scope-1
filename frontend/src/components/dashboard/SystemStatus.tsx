import { useHealth } from '@/hooks/useApi';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusIndicator } from '@/components/common/StatusIndicator';
import { MissionPanel } from '@/components/common/MissionPanel';
import { DataRow } from '@/components/common/DataRow';
import { formatUtc } from '@/utils/time';
import { Activity } from 'lucide-react';

export function SystemStatus() {
  const { data, error, isPending, refetch } = useHealth();

  return (
    <MissionPanel title="Backend API" icon={Activity}>
      {isPending ? (
        <LoadingState label="Contacting backend…" compact />
      ) : error ? (
        <ErrorState compact title="Backend offline" message={error.message} onRetry={() => void refetch()} />
      ) : data ? (
        <dl>
          <DataRow label="Status" mono={false}>
            <StatusIndicator state="online" label={data.status} />
          </DataRow>
          <DataRow label="Service" mono={false}>{data.service}</DataRow>
          <DataRow label="Version">{data.version}</DataRow>
          <DataRow label="Server time">{formatUtc(data.time_utc)}</DataRow>
          <DataRow label="Database" mono={false}>{data.database}</DataRow>
        </dl>
      ) : null}
    </MissionPanel>
  );
}
