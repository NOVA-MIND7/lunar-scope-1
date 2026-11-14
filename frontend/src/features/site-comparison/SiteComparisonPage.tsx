import { PageHeader } from '@/components/common/PageHeader';
import { NotImplemented } from '@/components/common/NotImplemented';
import { useAppStore } from '@/stores/appStore';

export default function SiteComparisonPage() {
  const scenarios = useAppStore((s) => s.comparisonScenarios);

  return (
    <>
      <PageHeader title="Site Comparison" description="Compare mission scenarios side by side." />
      <p className="mb-4 text-sm text-fg-muted" data-testid="scenario-count">
        Scenarios queued: {scenarios.length}
      </p>
      <NotImplemented
        module="Site comparison"
        endpoint="POST /api/missions/compare"
        plannedInputs={['Two or more scenarios (site, landing time, duration)', 'Comparison metrics']}
      />
    </>
  );
}
