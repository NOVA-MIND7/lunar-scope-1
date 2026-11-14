import { memo, useEffect, useMemo, useRef } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { SphereGeometry, type Mesh } from 'three';
import { TEXTURE_YAW, vector3ToLatLon } from '@/utils/lunarCoordinates';
import { MIN_DISTANCE } from './constants';
import { useGlobeStore } from './globeStore';
import type { MoonTextureSet } from './useMoonTextures';
import { useState } from 'react';

const CLICK_DRAG_TOLERANCE_PX = 4;
const CURSOR_THROTTLE_MS = 50;

/** The textured lunar sphere. Handles surface picking (click, double-click, hover coordinates). */
export const MoonSurface = memo(function MoonSurface({ textures }: { textures: MoonTextureSet }) {
  const meshRef = useRef<Mesh>(null);
  const lastMove = useRef(0);
  const [hovered, setHovered] = useState(false);
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());

  const geometry = useMemo(() => new SphereGeometry(1, 128, 64), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    textures.map.anisotropy = maxAnisotropy;
    textures.map.needsUpdate = true;
    if (textures.bump) textures.bump.anisotropy = maxAnisotropy;
  }, [textures, maxAnisotropy]);

  useCursor(hovered, 'crosshair');
  const isProcedural = textures.source.kind === 'procedural';

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[0, TEXTURE_YAW, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > CLICK_DRAG_TOLERANCE_PX) return; // a drag, not a click
        e.stopPropagation();
        const c = vector3ToLatLon(e.point);
        useGlobeStore.getState().setPending(c.latitude_deg, c.longitude_deg);
      }}
      onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const c = vector3ToLatLon(e.point);
        const { camera, issueCommand } = useGlobeStore.getState();
        issueCommand({
          kind: 'focus',
          latitude_deg: c.latitude_deg,
          longitude_deg: c.longitude_deg,
          distance: Math.max(MIN_DISTANCE + 0.2, camera.distance * 0.6),
        });
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation(); // also hides markers on the far side from hover events
        const now = performance.now();
        if (now - lastMove.current < CURSOR_THROTTLE_MS) return;
        lastMove.current = now;
        useGlobeStore.getState().setCursor(vector3ToLatLon(e.point));
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => {
        setHovered(false);
        useGlobeStore.getState().setCursor(null);
      }}
    >
      <meshStandardMaterial
        map={textures.map}
        bumpMap={textures.bump ?? undefined}
        bumpScale={isProcedural ? 5 : 2}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
});
