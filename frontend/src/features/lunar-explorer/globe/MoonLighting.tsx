import { memo, useMemo } from 'react';
import { Vector3 } from 'three';

export interface MoonLightingProps {
  /** Direction from the Moon towards the Sun in the body-fixed scene frame (need not be normalised). */
  sunDirection: readonly [number, number, number];
  /** False when the Sun is below the horizon / unavailable: only faint ambient light remains. */
  sunVisible: boolean;
  intensity: number;
  /** 0 = full sunlight, 1 = total lunar eclipse (Earth blocks sunlight) */
  eclipseFactor?: number;
}

const SUN_DISTANCE = 30;

/**
 * Directional sunlight. When the Moon passes behind Earth in line with the Sun,
 * sunlight is occluded by Earth's umbral shadow (Lunar Eclipse).
 */
export const MoonLighting = memo(function MoonLighting({
  sunDirection,
  sunVisible,
  intensity,
}: MoonLightingProps) {
  const position = useMemo(
    () => new Vector3(...sunDirection).normalize().multiplyScalar(SUN_DISTANCE).toArray() as [number, number, number],
    [sunDirection],
  );

  return (
    <>
      {/* Constant solar system ambient light so Earth and celestial objects stay clearly lit */}
      <ambientLight intensity={0.4} color="#cbd5e1" />
      {/* Directional sunlight from Sun */}
      <directionalLight position={position} intensity={sunVisible ? intensity : 0} color="#fffbee" />
    </>
  );
});
