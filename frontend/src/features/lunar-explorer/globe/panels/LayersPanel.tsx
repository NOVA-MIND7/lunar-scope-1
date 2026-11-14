import { Layers, Satellite, Sun, Globe, RotateCw } from 'lucide-react';
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
  const showSatellite = useGlobeStore((s) => s.showSatellite);
  const toggleSatellite = useGlobeStore((s) => s.toggleSatellite);
  const showOrbitPath = useGlobeStore((s) => s.showOrbitPath);
  const toggleOrbitPath = useGlobeStore((s) => s.toggleOrbitPath);
  const showSun = useGlobeStore((s) => s.showSun);
  const toggleSun = useGlobeStore((s) => s.toggleSun);
  const showSolarRays = useGlobeStore((s) => s.showSolarRays);
  const toggleSolarRays = useGlobeStore((s) => s.toggleSolarRays);
  const showEarth = useGlobeStore((s) => s.showEarth);
  const toggleEarth = useGlobeStore((s) => s.toggleEarth);
  const autoRotate = useGlobeStore((s) => s.autoRotate);
  const toggleAutoRotate = useGlobeStore((s) => s.toggleAutoRotate);
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
        <li className="pt-1.5 border-t border-line">
          <label className="flex cursor-pointer items-center gap-2 text-blue-400">
            <input type="checkbox" className="accent-blue-400" checked={showEarth} onChange={toggleEarth} />
            <Globe className="size-3.5" />
            <span className="flex-1 font-medium">Earth 3D Body (between Sun & Moon)</span>
          </label>
        </li>
        <li className="pt-1 border-t border-line">
          <label className="flex cursor-pointer items-center gap-2 text-amber-400">
            <input type="checkbox" className="accent-amber-400" checked={showSun} onChange={toggleSun} />
            <Sun className="size-3.5" />
            <span className="flex-1 font-medium">Sun 3D Celestial Body</span>
          </label>
        </li>
        {showSun ? (
          <li className="pl-5">
            <label className="flex cursor-pointer items-center gap-2 text-fg-dim">
              <input type="checkbox" className="accent-amber-400" checked={showSolarRays} onChange={toggleSolarRays} />
              <span>Solar rays & subsolar point</span>
            </label>
          </li>
        ) : null}
        <li className="pt-1 border-t border-line">
          <label className="flex cursor-pointer items-center gap-2 text-cyan">
            <input type="checkbox" className="accent-cyan" checked={showSatellite} onChange={toggleSatellite} />
            <Satellite className="size-3.5" />
            <span className="flex-1 font-medium">Cassini Satellite (Polar Orbit)</span>
          </label>
        </li>
        {showSatellite ? (
          <li className="pl-5">
            <label className="flex cursor-pointer items-center gap-2 text-fg-dim">
              <input type="checkbox" className="accent-cyan" checked={showOrbitPath} onChange={toggleOrbitPath} />
              <span>Orbital trajectory loop</span>
            </label>
          </li>
        ) : null}
        <li className="pt-1 border-t border-line">
          <label className="flex cursor-pointer items-center gap-2 text-fg">
            <input type="checkbox" className="accent-cyan" checked={autoRotate} onChange={toggleAutoRotate} />
            <RotateCw className="size-3.5 text-cyan" />
            <span className="flex-1 font-medium">Planetary Motion (Moon & Earth Rotation)</span>
          </label>
        </li>
      </ul>
      {southPoleMode ? (
        <p className="mt-3 border-t border-line pt-2 text-[11px] text-fg-dim" data-testid="south-pole-note">
          South polar region outlined poleward of 80°S. Cassini reconnaissance orbiter actively scanning polar cold traps.
        </p>
      ) : null}
    </MissionPanel>
  );
}
