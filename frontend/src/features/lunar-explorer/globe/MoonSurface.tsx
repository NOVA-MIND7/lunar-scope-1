import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { Color, SphereGeometry, TextureLoader, SRGBColorSpace, NoColorSpace, type Texture } from 'three';
import { TEXTURE_YAW, vector3ToLatLon } from '@/utils/lunarCoordinates';
import { MIN_DISTANCE } from './constants';
import { useGlobeStore } from './globeStore';
import { MOON_SMALL_SOURCE } from './moonTextureConfig';
import type { MoonTextureSet } from './useMoonTextures';

const CLICK_DRAG_TOLERANCE_PX = 4;
const CURSOR_THROTTLE_MS = 50;

interface SurfaceInteractionProps {
  textures?: MoonTextureSet;
  onSurfaceClick: (e: ThreeEvent<MouseEvent>) => void;
  onSurfaceDoubleClick: (e: ThreeEvent<MouseEvent>) => void;
  onSurfacePointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}

/** Terrain Analysis moon: NASA Moon Trek LRO WAC + LOLA displaced surface (same as Terrain Analysis tab). */
function TerrainMoonModel({
  textures,
  onSurfaceClick,
  onSurfaceDoubleClick,
  onSurfacePointerMove,
  onPointerOver,
  onPointerOut,
}: SurfaceInteractionProps) {
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const geometry = useMemo(() => new SphereGeometry(1, 160, 120), []);
  const [localWacTex, setLocalWacTex] = useState<Texture | null>(null);
  const [localShadeTex, setLocalShadeTex] = useState<Texture | null>(null);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    if (textures?.map && textures?.bump) return;
    const loader = new TextureLoader();
    const base = import.meta.env.BASE_URL || '/';
    const mkUrl = (name: string) => `${base}textures/${name}`.replace(/\/+/g, '/');
    if (!textures?.map) {
      loader.load(mkUrl('moon_trek_wac.jpg'), (t) => {
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = maxAnisotropy;
        setLocalWacTex(t);
      });
    }
    if (!textures?.bump) {
      loader.load(mkUrl('moon_trek_lola_shade.jpg'), (t) => {
        t.colorSpace = NoColorSpace;
        t.anisotropy = maxAnisotropy;
        setLocalShadeTex(t);
      });
    }
  }, [textures, maxAnisotropy]);

  const wacTex = textures?.map ?? localWacTex;
  const shadeTex = textures?.bump ?? localShadeTex;

  const eclipseFactor = useGlobeStore((s) => s.eclipseFactor);
  const eclipseColor = useMemo(() => {
    const factor = eclipseFactor;
    return new Color(
      Math.max(0.16, 1.0 - factor * 0.84),
      Math.max(0.04, 1.0 - factor * 0.96),
      Math.max(0.04, 1.0 - factor * 0.96),
    );
  }, [eclipseFactor]);

  useEffect(() => {
    // Notify the UI that the Terrain Analysis moon surface is active
    useGlobeStore.getState().setTextureSource(MOON_SMALL_SOURCE);
  }, []);

  const dispScale = shadeTex ? 0.032 * 1.5 : 0;

  return (
    <mesh
      geometry={geometry}
      rotation={[0, TEXTURE_YAW, 0]}
      onClick={onSurfaceClick}
      onDoubleClick={onSurfaceDoubleClick}
      onPointerMove={onSurfacePointerMove}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {wacTex ? (
        <meshStandardMaterial
          key="moon-textured"
          map={wacTex}
          bumpMap={shadeTex ?? undefined}
          bumpScale={0.038 * 1.5}
          displacementMap={shadeTex ?? undefined}
          displacementScale={dispScale}
          displacementBias={-dispScale * 0.5}
          roughness={0.9}
          metalness={0.05}
          color={eclipseColor}
        />
      ) : (
        <meshStandardMaterial key="moon-loading" color="#475569" roughness={0.9} />
      )}
    </mesh>
  );
}

/** The 3D lunar sphere. Handles surface picking (click, double-click, hover coordinates). */
export const MoonSurface = memo(function MoonSurface(props: { textures: MoonTextureSet }) {
  const lastMove = useRef(0);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered, 'crosshair');

  const handleSurfaceClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > CLICK_DRAG_TOLERANCE_PX) return; // a drag, not a click
    e.stopPropagation();
    useGlobeStore.getState().setFocusTarget('moon');
    const local = e.object.worldToLocal(e.point.clone()).normalize();
    const c = vector3ToLatLon(local);
    useGlobeStore.getState().setPending(c.latitude_deg, c.longitude_deg);
  };

  const handleSurfaceDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    useGlobeStore.getState().setFocusTarget('moon');
    const local = e.object.worldToLocal(e.point.clone()).normalize();
    const c = vector3ToLatLon(local);
    const { camera, issueCommand } = useGlobeStore.getState();
    issueCommand({
      kind: 'focus',
      latitude_deg: c.latitude_deg,
      longitude_deg: c.longitude_deg,
      distance: Math.max(MIN_DISTANCE + 0.2, camera.distance * 0.6),
    });
  };

  const handleSurfacePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const now = performance.now();
    if (now - lastMove.current < CURSOR_THROTTLE_MS) return;
    lastMove.current = now;
    const local = e.object.worldToLocal(e.point.clone()).normalize();
    useGlobeStore.getState().setCursor(vector3ToLatLon(local));
  };

  const handlePointerOver = () => setHovered(true);
  const handlePointerOut = () => {
    setHovered(false);
    useGlobeStore.getState().setCursor(null);
  };

  return (
    <TerrainMoonModel
      textures={props.textures}
      onSurfaceClick={handleSurfaceClick}
      onSurfaceDoubleClick={handleSurfaceDoubleClick}
      onSurfacePointerMove={handleSurfacePointerMove}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
});
