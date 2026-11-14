import { memo, useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';
import { latLonToVector3 } from '@/utils/lunarCoordinates';
import { buildGridPositions, GRID_LAYERS, type GridSpec } from './gridGeometry';
import { Label3D } from './Label3D';

function useGridGeometry(spec: GridSpec): BufferGeometry {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(buildGridPositions(spec), 3));
    return g;
  }, [spec]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function GridLines({ spec, color, opacity }: { spec: GridSpec; color: string; opacity: number }) {
  const geometry = useGridGeometry(spec);
  return (
    <lineSegments geometry={geometry} raycast={() => null}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </lineSegments>
  );
}

const NORTH_POLE = latLonToVector3(90, 0, 1.07).toArray() as [number, number, number];
const SOUTH_POLE = latLonToVector3(-90, 0, 1.07).toArray() as [number, number, number];
const EQUATOR_LABEL = latLonToVector3(0, 62, 1.02).toArray() as [number, number, number];

/** Subtle latitude/longitude grid. The equator and prime meridian are emphasised; poles are labelled. */
export const CoordinateGrid = memo(function CoordinateGrid({ southPolar }: { southPolar: boolean }) {
  return (
    <group>
      <GridLines spec={GRID_LAYERS.minor} color="#8fb8d8" opacity={0.2} />
      <GridLines spec={GRID_LAYERS.major} color="#00d9ff" opacity={0.5} />
      {southPolar ? <GridLines spec={GRID_LAYERS.southPolar} color="#00d9ff" opacity={0.32} /> : null}
      <Label3D position={NORTH_POLE}>N POLE · 90°N</Label3D>
      <Label3D position={SOUTH_POLE}>S POLE · 90°S</Label3D>
      <Label3D position={EQUATOR_LABEL} className="text-cyan">
        EQUATOR 0°
      </Label3D>
    </group>
  );
});
