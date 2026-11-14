import { PageHeader } from '@/components/common/PageHeader';
import { NotImplemented } from '@/components/common/NotImplemented';

export default function TerrainAnalysisPage() {
  return (
    <>
      <PageHeader title="Terrain Analysis" description="Horizon and slope analysis from elevation data." />
      <NotImplemented
        module="Terrain analysis"
        endpoint="POST /api/terrain/horizon"
        plannedInputs={['Selected coordinates', 'Digital elevation model (DEM) source', 'Observer height', 'Azimuth resolution']}
      />
    </>
  );
}
