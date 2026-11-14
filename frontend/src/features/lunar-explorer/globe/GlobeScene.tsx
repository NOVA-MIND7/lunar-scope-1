import { memo } from 'react';
import { Stars } from '@react-three/drei';
import type { LandingSite } from '@/types';
import { useAppStore } from '@/stores/appStore';
import { CoordinateGrid } from './CoordinateGrid';
import { LunarMarkers } from './LunarMarkers';
import { MoonAtmosphere } from './MoonAtmosphere';
import { MoonControls } from './MoonControls';
import { MoonLighting } from './MoonLighting';
import { MoonSurface } from './MoonSurface';
import { SelectedLocationMarker } from './SelectedLocationMarker';
import { SouthPoleHighlight } from './SouthPoleHighlight';
import { useGlobeStore } from './globeStore';
import type { MoonTextureSet } from './useMoonTextures';

export interface SunSettings {
  direction: readonly [number, number, number];
  visible: boolean;
  intensity: number;
}

/** Everything inside the <Canvas>. Reads UI state from stores (React context does not cross the canvas). */
export const GlobeScene = memo(function GlobeScene({ textures, sites, sun }: { textures: MoonTextureSet; sites: LandingSite[]; sun: SunSettings }) {
  const showGrid = useGlobeStore((s) => s.showGrid);
  const southPoleMode = useGlobeStore((s) => s.southPoleMode);
  const pending = useGlobeStore((s) => s.pending);
  const selectedSite = useAppStore((s) => s.selectedLandingSite);
  const customSelected = selectedSite?.category === 'custom' ? selectedSite : null;

  return (
    <>
      <color attach="background" args={['#04070d']} />
      <MoonLighting sunDirection={sun.direction} sunVisible={sun.visible} intensity={sun.intensity} />
      <Stars radius={60} depth={40} count={2500} factor={2.2} saturation={0} fade speed={0} />
      <MoonSurface textures={textures} />
      <MoonAtmosphere sunDirection={sun.direction} />
      {showGrid ? <CoordinateGrid southPolar={southPoleMode} /> : null}
      {southPoleMode ? <SouthPoleHighlight /> : null}
      <LunarMarkers sites={sites} />
      {customSelected ? <SelectedLocationMarker coordinates={customSelected.coordinates} status="confirmed" /> : null}
      {pending ? <SelectedLocationMarker coordinates={pending} status="pending" /> : null}
      <MoonControls />
    </>
  );
});
