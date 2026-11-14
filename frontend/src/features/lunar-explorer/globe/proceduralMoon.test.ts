import { describe, expect, it } from 'vitest';
import { generateProceduralMoon } from './proceduralMoon';

describe('generateProceduralMoon', () => {
  const a = generateProceduralMoon(128, 7);
  it('has equirectangular 2:1 dimensions and RGBA buffers', () => {
    expect(a.height).toBe(a.width / 2);
    expect(a.color.length).toBe(a.width * a.height * 4);
    expect(a.elevation.length).toBe(a.width * a.height * 4);
  });
  it('is deterministic for a seed and differs between seeds', () => {
    expect(Array.from(generateProceduralMoon(128, 7).color)).toEqual(Array.from(a.color));
    expect(Array.from(generateProceduralMoon(128, 8).color)).not.toEqual(Array.from(a.color));
  });
  it('is opaque grey-ish (no strong colour cast)', () => {
    for (let i = 0; i < a.color.length; i += 4 * 97) {
      expect(a.color[i + 3]).toBe(255);
      expect(Math.abs((a.color[i] ?? 0) - (a.color[i + 2] ?? 0))).toBeLessThan(40);
    }
  });
  it('wraps seamlessly: the seam differs no more than typical neighbouring columns', () => {
    const px = (x: number, y: number) => a.color[(y * a.width + x) * 4] ?? 0;
    const colDiff = (x0: number, x1: number) => {
      let d = 0;
      for (let y = 0; y < a.height; y++) d += Math.abs(px(x0, y) - px(x1, y));
      return d;
    };
    let typical = 0;
    for (let x = 1; x < a.width; x++) typical += colDiff(x - 1, x);
    typical /= a.width - 1;
    expect(colDiff(a.width - 1, 0)).toBeLessThan(typical * 2.5);
  });
});
