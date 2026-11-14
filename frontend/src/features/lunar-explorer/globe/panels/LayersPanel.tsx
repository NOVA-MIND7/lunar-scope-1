import { Layers } from 'lucide-react';
import { MissionPanel } from '@/components/common/MissionPanel';
import type { LandingSite, SiteCategory } from '@/types';
import { CATEGORY_ORDER, CATEGORY_STYLE } from '../constants';
import { useGlobeStore } from '../globeStore';

/** Marker legend and layer toggles. */
export function LayersPanel({ sites }: { sites: LandingSite[] }) {
  const visible = useGlobeStore((s) => s.visibleCategories);
  const toggleCategory = useGlobeStore((s) => s.toggleCategory);
  const showMarkers = useGlobeStore((s) => s.showMarkers);
  const toggleMarkers = useGlobeStore((s) => s.toggleMarkers);
  const showGrid = useGlobeStore((s) => s.showGrid);
  const toggleGrid = useGlobeStore((s) => s.toggleGrid);
  const southPoleMode = useGlobeStore((s) => s.southPoleMode);
  const count = (c: SiteCategory) => sites.filter((s) => s.category === c).length;

  return (
    <MissionPanel title="Layers" icon={Layers}>
      <ul className="space-y-1.5 text-xs">
        <li>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="accent-cyan" checked={showGrid} onChange={toggleGrid} /> Coordinate grid
          </label>
        </li>
        <li>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="accent-cyan" checked={showMarkers} onChange={toggleMarkers} /> Site markers
          </label>
        </li>
        {CATEGORY_ORDER.map((c) => (
          <li key={c} className="pl-5">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" className="accent-cyan" checked={visible[c]} disabled={!showMarkers} onChange={() => toggleCategory(c)} />
              <span className="size-2.5 rounded-full" style={{ background: CATEGORY_STYLE[c].color }} aria-hidden />
              <span className="flex-1">{CATEGORY_STYLE[c].plural}</span>
              {c !== 'custom' ? <span className="font-mono text-fg-dim">{count(c)}</span> : null}
            </label>
          </li>
        ))}
      </ul>
      {southPoleMode ? (
        <p className="mt-3 border-t border-line pt-2 text-[11px] text-fg-dim" data-testid="south-pole-note">
          South polar region outlined poleward of 80°S. The tint only marks the area of interest; polar illumination varies strongly with terrain and time and is not shown.
        </p>
      ) : null}
    </MissionPanel>
  );
}
