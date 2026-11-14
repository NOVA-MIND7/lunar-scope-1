import { PageHeader } from '@/components/common/PageHeader';
import { NotImplemented } from '@/components/common/NotImplemented';

export default function EarthVisibilityPage() {
  return (
    <>
      <PageHeader title="Earth Visibility" description="Earth visibility from the selected site for communications planning." />
      <NotImplemented
        module="Earth visibility"
        endpoint="POST /api/astronomy/earth-visibility"
        plannedInputs={['Selected coordinates', 'Start/end time (UTC)', 'Time step', 'Terrain horizon (optional)']}
      />
    </>
  );
}
