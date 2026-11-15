/**
 * Moon surface texture configuration.
 *
 * To use real NASA imagery, place equirectangular images (longitude -180..180 left to right, north up)
 * in frontend/public/textures/ — see public/textures/README.md — or point these variables at other URLs:
 *
 *   VITE_MOON_COLOR_TEXTURE      default /textures/moon_color.jpg
 *   VITE_MOON_ELEVATION_TEXTURE  default /textures/moon_elevation.jpg   (greyscale; used as a bump map)
 *   VITE_MOON_TEXTURE_CREDIT     credit line shown in the UI for your files
 *
 * If the colour texture is not found, a clearly labelled procedural fallback is generated instead.
 */
export interface MoonTextureSource {
  kind: 'nasa' | 'custom' | 'procedural';
  label: string;
  credit: string;
  /** True only for user-supplied image files. Never true for the procedural fallback. */
  isRealImagery: boolean;
}

const env = import.meta.env as Record<string, string | undefined>;

export const MOON_TEXTURE_CONFIG = {
  colorUrl: env.VITE_MOON_COLOR_TEXTURE ?? '/textures/moon_color.jpg',
  elevationUrl: env.VITE_MOON_ELEVATION_TEXTURE ?? '/textures/moon_elevation.jpg',
  credit: env.VITE_MOON_TEXTURE_CREDIT ?? 'Credit not configured (set VITE_MOON_TEXTURE_CREDIT)',
  proceduralWidth: Math.min(4096, Math.max(512, Number(env.VITE_MOON_PROCEDURAL_WIDTH) || 2048)),
} as const;

export const PROCEDURAL_SOURCE: MoonTextureSource = {
  kind: 'procedural',
  label: 'Procedural fallback surface',
  credit: 'Generated in the browser. Illustrative only: crater positions do not correspond to real lunar features. Not NASA data.',
  isRealImagery: false,
};

export const MOON_SMALL_SOURCE: MoonTextureSource = {
  kind: 'custom',
  label: 'NASA Moon Trek 3D Surface (LRO WAC + LOLA)',
  credit: 'NASA Moon Trek LRO WAC mosaic with LOLA shaded-relief elevation (bump/displacement).',
  isRealImagery: true,
};
