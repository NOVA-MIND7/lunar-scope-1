import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { LunarCoordinates } from '@/types';
import { CATEGORY_STYLE, PENDING_COLOR } from './constants';
import { SurfaceAnchor, useMarkerAssets } from './MarkerPrimitives';

interface SelectedLocationMarkerProps {
  coordinates: LunarCoordinates;
  /** pending: picked but unconfirmed (white, hollow). confirmed: the selected custom site (violet, solid). */
  status: 'pending' | 'confirmed';
}

/** Marker for a user-chosen location: either a pending pick or a confirmed custom site. */
export const SelectedLocationMarker = memo(function SelectedLocationMarker({ coordinates, status }: SelectedLocationMarkerProps) {
  const assets = useMarkerAssets();
  const pulse = useRef<Mesh>(null);
  const color = status === 'pending' ? PENDING_COLOR : CATEGORY_STYLE.custom.color;

  useFrame(({ clock }) => {
    const t = (clock.elapsedTime % 1.8) / 1.8;
    pulse.current?.scale.setScalar(1 + t * 1.6);
    const m = pulse.current?.material;
    if (m && !Array.isArray(m)) m.opacity = (1 - t) * 0.8;
  });

  return (
    <SurfaceAnchor latitude={coordinates.latitude_deg} longitude={coordinates.longitude_deg}>
      <mesh geometry={assets.ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]} material={assets.material(color)} raycast={() => null} />
      <mesh geometry={assets.stem} position={[0, 0.0175, 0]} material={assets.material(color)} raycast={() => null} />
      <mesh geometry={assets.head} position={[0, 0.04, 0]} scale={status === 'confirmed' ? 1.5 : 1.2} material={assets.material(color)} raycast={() => null} />
      <mesh ref={pulse} geometry={assets.halo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} raycast={() => null}>
        <meshBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} toneMapped={false} side={2} />
      </mesh>
    </SurfaceAnchor>
  );
});
