import { PageHeader } from '@/components/common/PageHeader';
import { NotImplemented } from '@/components/common/NotImplemented';

export default function MissionReportsPage() {
  return (
    <>
      <PageHeader title="Mission Reports" description="Exportable mission reports." />
      <NotImplemented
        module="Mission reports"
        plannedInputs={['Completed analyses (solar, Earth visibility, terrain)', 'Export format (PDF / JSON)']}
      />
    </>
  );
}
