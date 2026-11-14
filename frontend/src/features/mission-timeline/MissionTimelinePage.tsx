import { PageHeader } from '@/components/common/PageHeader';
import { NotImplemented } from '@/components/common/NotImplemented';

export default function MissionTimelinePage() {
  return (
    <>
      <PageHeader title="Mission Timeline" description="Landing windows and mission phases." />
      <NotImplemented
        module="Mission timeline"
        endpoint="POST /api/missions/windows"
        plannedInputs={['Selected site', 'Search range (UTC)', 'Mission duration', 'Illumination and Earth-visibility constraints']}
      />
    </>
  );
}
