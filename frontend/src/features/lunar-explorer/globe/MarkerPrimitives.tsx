import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderGeometry, Group, MeshBasicMaterial, Quaternion, RingGeometry, SphereGeometry, Vector3 } from 'three';
import { surfaceNormal } from '@/utils/lunarCoordinates';

const UP = new Vector3(0, 1, 0);

/** Positions children on the surface at (lat, lon), local +Y along the outward normal, and keeps them a constant apparent size. */
export function SurfaceAnchor({ latitude, longitude, children }: { latitude: number; longitude: number; children: ReactNode }) {
  const { position, quaternion } = useMemo(() => {
    const n = surfaceNormal(latitude, longitude);
    return { position: n.toArray() as [number, number, number], quaternion: new Quaternion().setFromUnitVectors(UP, n) };
  }, [latitude, longitude]);
  const scaled = useRef<Group>(null);
  useFrame(({ camera }) => {
    const d = camera.position.length();
    scaled.current?.scale.setScalar(Math.min(1, Math.max(0.06, (d - 1) * 0.35)));
  });
  return (
    <group position={position} quaternion={quaternion}>
      <group ref={scaled}>{children}</group>
    </group>
  );
}

export interface MarkerAssets {
  stem: CylinderGeometry;
  head: SphereGeometry;
  hit: SphereGeometry;
  ring: RingGeometry;
  halo: RingGeometry;
  materials: Map<string, MeshBasicMaterial>;
  material: (color: string, opacity?: number) => MeshBasicMaterial;
}

/** Geometries/materials shared by every marker, disposed together. */
export function useMarkerAssets(): MarkerAssets {
  const assets = useMemo<MarkerAssets>(() => {
    const materials = new Map<string, MeshBasicMaterial>();
    return {
      stem: new CylinderGeometry(0.0016, 0.0016, 0.035, 6),
      head: new SphereGeometry(0.011, 16, 12),
      hit: new SphereGeometry(0.038, 8, 6),
      ring: new RingGeometry(0.015, 0.021, 40),
      halo: new RingGeometry(0.03, 0.036, 48),
      materials,
      material: (color, opacity = 1) => {
        const key = `${color}:${opacity}`;
        let m = materials.get(key);
        if (!m) {
          m = new MeshBasicMaterial({ color, transparent: opacity < 1, opacity, toneMapped: false, side: 2 });
          materials.set(key, m);
        }
        return m;
      },
    };
  }, []);
  useEffect(
    () => () => {
      assets.stem.dispose();
      assets.head.dispose();
      assets.hit.dispose();
      assets.ring.dispose();
      assets.halo.dispose();
      assets.materials.forEach((m) => m.dispose());
      assets.materials.clear();
    },
    [assets],
  );
  return assets;
}
