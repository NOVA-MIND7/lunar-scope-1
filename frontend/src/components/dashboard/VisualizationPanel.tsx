import { Globe2 } from 'lucide-react';
import { MissionPanel } from '@/components/common/MissionPanel';
import { DataSourceBadge } from '@/components/common/DataSourceBadge';
import { LunarGlobe } from '@/features/lunar-explorer/globe/LunarGlobe';
import { useGlobeStore } from '@/features/lunar-explorer/globe/globeStore';

/** Dashboard panel hosting the shared 3D Moon (compact variant). */
export function VisualizationPanel() {
  const source = useGlobeStore((s) => s.textureSource);
  return (
    <MissionPanel
      title="Lunar globe"
      icon={Globe2}
      aside={
        source ? (
          <DataSourceBadge kind={source.isRealImagery ? 'sample' : 'demo'} label={source.isRealImagery ? 'Installed imagery' : 'Procedural surface'} />
        ) : null
      }
      className="h-full flex flex-col"
      bodyClassName="flex-1 flex p-0 min-h-0 relative"
    >
      <LunarGlobe variant="compact" showExploreLink className="h-full w-full flex-1 min-h-0" />
    </MissionPanel>
  );
}
