import { PageHeader } from '@/components/common/PageHeader';
import { MoonEarthVisibilityAnalysis } from './MoonEarthVisibilityAnalysis';

export default function EarthVisibilityPage() {
  return (
    <>
      <PageHeader title="Earth Visibility" description="View Earth from a selected lunar landing site and analyze elevation, azimuth, and direct communication visibility." />
      <section className="mt-6">
        <MoonEarthVisibilityAnalysis />
      </section>
    </>
  );
}
