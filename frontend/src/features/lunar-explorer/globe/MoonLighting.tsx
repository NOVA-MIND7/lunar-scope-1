import { memo, useMemo } from 'react';
import { Vector3 } from 'three';

export interface MoonLightingProps {
  /** Direction from the Moon towards the Sun in the body-fixed scene frame (need not be normalised). */
  sunDirection: readonly [number, number, number];
  /** False when the Sun is below the horizon / unavailable: only faint ambient light remains. */
  sunVisible: boolean;
  intensity: number;
}

const SUN_DISTANCE = 30;

/**
 * Directional sunlight, fixed in the world (the camera orbits independently of it).
 * Today the direction is the illustrative default; the astronomy engine will feed real values.
 */
export const MoonLighting = memo(function MoonLighting({ sunDirection, sunVisible, intensity }: MoonLightingProps) {
  const position = useMemo(
    () => new Vector3(...sunDirection).normalize().multiplyScalar(SUN_DISTANCE).toArray() as [number, number, number],
    [sunDirection],
  );
  return (
    <>
      <ambientLight intensity={0.07} color="#9db4d0" />
      <directionalLight position={position} intensity={sunVisible ? intensity : 0} color="#fff8ee" />
    </>
  );
});
