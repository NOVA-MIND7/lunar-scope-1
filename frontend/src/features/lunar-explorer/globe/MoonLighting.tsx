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
  eclipseFactor = 0,
}: MoonLightingProps) {
  const position = useMemo(
    () => new Vector3(...sunDirection).normalize().multiplyScalar(SUN_DISTANCE).toArray() as [number, number, number],
    [sunDirection],
  );

  const isEclipsed = eclipseFactor > 0.1;
  const lightIntensity = sunVisible ? intensity * Math.max(0.04, 1.0 - eclipseFactor * 0.96) : 0;
  // Blood-moon crimson tint during lunar eclipse, crisp solar white otherwise
  const lightColor = isEclipsed ? '#b91c1c' : '#fff8ee';

  return (
    <>
      <ambientLight intensity={isEclipsed ? 0.04 : 0.08} color={isEclipsed ? '#450a0a' : '#9db4d0'} />
      <directionalLight position={position} intensity={lightIntensity} color={lightColor} />
    </>
  );
});
