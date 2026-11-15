import { useEffect, useState } from 'react';
import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { MOON_TEXTURE_CONFIG, PROCEDURAL_SOURCE, type MoonTextureSource } from './moonTextureConfig';
import { generateProceduralMoon } from './proceduralMoon';

export interface MoonTextureSet {
  map: Texture;
  bump: Texture | null;
  source: MoonTextureSource;
  /** Why real imagery was not used (shown in the UI), if applicable. */
  note?: string;
}

function canvasTexture(data: Uint8ClampedArray, width: number, height: number, srgb: boolean): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available to generate the fallback surface.');
  ctx.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.anisotropy = 8;
  return tex;
}

async function buildProcedural(note?: string): Promise<MoonTextureSet> {
  // Yield once so the loading state can paint before the (synchronous) generation work.
  await new Promise((r) => setTimeout(r, 30));
  const data = generateProceduralMoon(MOON_TEXTURE_CONFIG.proceduralWidth);
  return {
    map: canvasTexture(data.color, data.width, data.height, true),
    bump: canvasTexture(data.elevation, data.width, data.height, false),
    source: PROCEDURAL_SOURCE,
    note,
  };
}

async function loadReal(): Promise<MoonTextureSet | null> {
  const { colorUrl, elevationUrl, credit } = MOON_TEXTURE_CONFIG;
  const loader = new TextureLoader();
  try {
    const [map, bump] = await Promise.all([
      loader.loadAsync(colorUrl).then((t) => {
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = 8;
        return t;
      }),
      loader.loadAsync(elevationUrl).then((t) => {
        t.colorSpace = NoColorSpace;
        t.anisotropy = 8;
        return t;
      }).catch(() => null),
    ]);
    return { map, bump, source: { kind: 'custom', label: 'NASA Moon Trek 3D Surface (LRO WAC + LOLA)', credit, isRealImagery: true } };
  } catch {
    return null;
  }
}

let cache: Promise<MoonTextureSet> | null = null;

/**
 * Resolves the Moon textures once per page load and shares them between globe instances.
 * (Textures are kept for the app's lifetime by design; three.js re-uploads them if a context is recreated.)
 */
export function loadMoonTextures(): Promise<MoonTextureSet> {
  cache ??= (async () => {
    try {
      const real = await loadReal();
      if (real) return real;
      return await buildProcedural(`No image found at ${MOON_TEXTURE_CONFIG.colorUrl}.`);
    } catch (err) {
      return await buildProcedural(err instanceof Error ? `Could not load installed imagery: ${err.message}` : undefined);
    }
  })();
  return cache;
}

export type TextureStatus = 'loading' | 'ready' | 'error';

export function useMoonTextures(enabled = true): { status: TextureStatus; textures: MoonTextureSet | null; error: string | null } {
  const [state, setState] = useState<{ status: TextureStatus; textures: MoonTextureSet | null; error: string | null }>({
    status: 'loading',
    textures: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadMoonTextures().then(
      (textures) => !cancelled && setState({ status: 'ready', textures, error: null }),
      (err: unknown) => {
        cache = null; // allow a retry on next mount
        if (!cancelled) setState({ status: 'error', textures: null, error: err instanceof Error ? err.message : 'Texture loading failed.' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
