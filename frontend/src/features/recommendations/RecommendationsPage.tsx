import { PageHeader } from '@/components/common/PageHeader';
import { NotImplemented } from '@/components/common/NotImplemented';

export default function RecommendationsPage() {
  return (
    <>
      <PageHeader title="Recommendations" description="Ranked site and window recommendations." />
      <NotImplemented
        module="Recommendations"
        endpoint="POST /api/missions/recommend"
        plannedInputs={['Candidate sites', 'Mission constraints and weights', 'Search range (UTC)']}
      />
    </>
  );
}
