import { PageHeader } from '@/components/common/PageHeader';
import { NotImplemented } from '@/components/common/NotImplemented';

export default function SolarAnalysisPage() {
  return (
    <>
      <PageHeader title="Solar Analysis" description="Sun position and illumination at the selected site." />
      <NotImplemented
        module="Solar analysis"
        endpoint="POST /api/astronomy/sunlight"
        plannedInputs={['Selected coordinates', 'Start/end time (UTC)', 'Time step', 'Terrain horizon (optional)']}
      />
    </>
  );
}
