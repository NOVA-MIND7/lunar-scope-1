import { memo, useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry, DoubleSide, SphereGeometry } from 'three';
import { latLonToVector3 } from '@/utils/lunarCoordinates';
import { SOUTH_POLAR_REGION_LAT } from './constants';
import { Label3D } from './Label3D';

/**
 * Outlines the south polar region (poleward of SOUTH_POLAR_REGION_LAT). The tint marks an area of
 * interest only: it does NOT depict illumination, which varies strongly with terrain and time.
 */
export const SouthPoleHighlight = memo(function SouthPoleHighlight() {
  const capAngle = ((90 + SOUTH_POLAR_REGION_LAT) * Math.PI) / 180;
  const cap = useMemo(() => new SphereGeometry(1.004, 96, 6, 0, Math.PI * 2, Math.PI - capAngle, capAngle), [capAngle]);
  const ring = useMemo(() => {
    const g = new BufferGeometry();
    const pts: number[] = [];
    for (let lon = -180; lon <= 180; lon += 3) {
      const v = latLonToVector3(SOUTH_POLAR_REGION_LAT, lon, 1.006);
      pts.push(v.x, v.y, v.z);
    }
    g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
    return g;
  }, []);
  useEffect(
    () => () => {
      cap.dispose();
      ring.dispose();
    },
    [cap, ring],
  );

  const labelPos = latLonToVector3(SOUTH_POLAR_REGION_LAT, 90, 1.02).toArray() as [number, number, number];

  return (
    <group>
      <mesh geometry={cap} raycast={() => null} renderOrder={2}>
        <meshBasicMaterial color="#00d9ff" transparent opacity={0.1} depthWrite={false} side={DoubleSide} toneMapped={false} />
      </mesh>
      <lineLoop geometry={ring} raycast={() => null}>
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.85} depthWrite={false} toneMapped={false} />
      </lineLoop>
      <Label3D position={labelPos} className="text-cyan">
        SOUTH POLAR REGION · POLEWARD OF {Math.abs(SOUTH_POLAR_REGION_LAT)}°S
      </Label3D>
    </group>
  );
});
