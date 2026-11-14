import { memo, useMemo } from 'react';
import { Html, useCursor } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { LandingSite } from '@/types';
import { useAppStore } from '@/stores/appStore';
import { formatLatitude, formatLongitude } from '@/utils/format';
import { CATEGORY_STYLE, PRECISION_NOTE } from './constants';
import { useGlobeStore } from './globeStore';
import { SurfaceAnchor, useMarkerAssets, type MarkerAssets } from './MarkerPrimitives';
import { toMarkerModel, type MarkerModel } from './markerModel';

const CLICK_DRAG_TOLERANCE_PX = 4;

const Marker = memo(function Marker({ marker, site, assets }: { marker: MarkerModel; site: LandingSite; assets: MarkerAssets }) {
  const hovered = useGlobeStore((s) => s.hoveredSiteId === marker.id);
  useCursor(hovered, 'pointer');
  const emphasis = marker.selected ? 1.6 : hovered ? 1.35 : 1;

  return (
    <SurfaceAnchor latitude={marker.latitude} longitude={marker.longitude}>
      <mesh geometry={assets.ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]} material={assets.material(marker.color, 0.9)} raycast={() => null} />
      <mesh geometry={assets.stem} position={[0, 0.0175, 0]} material={assets.material(marker.color)} raycast={() => null} />
      <mesh geometry={assets.head} position={[0, 0.04, 0]} scale={emphasis} material={assets.material(marker.color)} raycast={() => null} />
      {marker.selected ? (
        <mesh geometry={assets.halo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} material={assets.material('#ffffff', 0.9)} raycast={() => null} />
      ) : null}
      {/* Invisible, generous hit area. */}
      <mesh
        geometry={assets.hit}
        position={[0, 0.025, 0]}
        material={assets.material('#000000', 0)}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          useGlobeStore.getState().setHoveredSite(marker.id);
        }}
        onPointerOut={() => {
          if (useGlobeStore.getState().hoveredSiteId === marker.id) useGlobeStore.getState().setHoveredSite(null);
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (e.delta > CLICK_DRAG_TOLERANCE_PX) return;
          e.stopPropagation();
          useGlobeStore.getState().clearPending();
          useAppStore.getState().selectLandingSite(site);
        }}
      />
      {hovered ? (
        <Html position={[0, 0.07, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          <div className="w-max max-w-[16rem] rounded border border-line-strong bg-bg/95 px-2.5 py-1.5 shadow-lg">
            <p className="text-xs font-semibold text-fg">{marker.name}</p>
            <p className="font-mono text-[10px] text-fg-muted">
              {formatLatitude(marker.latitude)} · {formatLongitude(marker.longitude)}
            </p>
            <p className="mt-0.5 text-[10px]" style={{ color: marker.color }}>
              {CATEGORY_STYLE[marker.category].label}
            </p>
            {PRECISION_NOTE[marker.precision] ? <p className="text-[10px] text-warning">{PRECISION_NOTE[marker.precision]}</p> : null}
          </div>
        </Html>
      ) : null}
      {/* In South Pole mode the markers sit within a few degrees of each other, so only the selected one is labelled; hover shows the rest. */}
      <PolarLabel marker={marker} />
    </SurfaceAnchor>
  );
});

function PolarLabel({ marker }: { marker: MarkerModel }) {
  const southPoleMode = useGlobeStore((s) => s.southPoleMode);
  if (!southPoleMode || marker.latitude > -75 || !marker.selected) return null;
  return (
    <Html position={[0, 0.075, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <span className="whitespace-nowrap rounded bg-bg/70 px-1 font-mono text-[9px] text-fg-muted">{marker.name.replace(/ region$/, '')}</span>
    </Html>
  );
}

/** Catalogue markers (historical, candidate regions, CLPS). Custom locations use SelectedLocationMarker. */
export const LunarMarkers = memo(function LunarMarkers({ sites }: { sites: LandingSite[] }) {
  const assets = useMarkerAssets();
  const selectedId = useAppStore((s) => s.selectedLandingSite?.id ?? null);
  const showMarkers = useGlobeStore((s) => s.showMarkers);
  const visible = useGlobeStore((s) => s.visibleCategories);

  const models = useMemo(
    () => sites.filter((s) => s.category !== 'custom').map((s) => ({ site: s, marker: toMarkerModel(s, selectedId) })),
    [sites, selectedId],
  );

  if (!showMarkers) return null;
  return (
    <group>
      {models
        .filter(({ marker }) => visible[marker.category])
        .map(({ site, marker }) => (
          <Marker key={marker.id} marker={marker} site={site} assets={assets} />
        ))}
    </group>
  );
});

