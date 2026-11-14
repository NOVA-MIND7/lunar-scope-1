import { Globe, Globe2, Sun, Map } from 'lucide-react';
import { MissionPanel } from '@/components/common/MissionPanel';
import { useGlobeStore } from '../globe/globeStore';

type VisualizationMode = 'globe' | 'map2d' | 'solarsystem';

const MODE_LABELS: Record<VisualizationMode, { label: string; description: string; icon: any }> = {
  globe: { label: '3D Globe', description: 'Interactive lunar surface with rotate/zoom/pan', icon: Globe2 },
  map2d: { label: '2D Map', description: 'Equirectangular projection with terminator and sites', icon: Map },
  solarsystem: { label: 'Sun–Earth–Moon', description: 'Spatial relationships and Earth visibility', icon: Sun },
};

/** Compact mode switcher shown in the Lunar Explorer header. */
export function VisualizationModeSelector() {
  const mode = useGlobeStore((s) => s.visualizationMode);
  const setMode = useGlobeStore((s) => s.setVisualizationMode);

  return (
    <MissionPanel title="Visualization" icon={Globe} className="w-80">
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-fg-muted">
          Choose how to view the Moon, landing sites, the Sun and Earth.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          {(['globe', 'map2d', 'solarsystem'] as VisualizationMode[]).map((m) => {
            const { label, description, icon: Icon } = MODE_LABELS[m];
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs transition-colors ${
                  active
                    ? 'border-cyan bg-cyan/10 text-cyan'
                    : 'border-transparent bg-surface-elevated/50 text-fg-muted hover:bg-surface-elevated hover:text-fg'
                }`}
              >
                <Icon className={`size-5 shrink-0 ${active ? 'text-cyan' : 'text-fg-muted'}`} />
                <span className="font-medium leading-tight">{label}</span>
                <span className="text-[9px] leading-none">{description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </MissionPanel>
  );
}
