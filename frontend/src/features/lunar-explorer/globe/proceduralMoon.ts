/**
 * Procedural lunar-looking surface used ONLY as a labelled fallback when no real texture is installed.
 * It is deterministic (seeded) and pure so it can be unit-tested. It does not reproduce real lunar
 * geography: crater and mare positions are random.
 */
export interface ProceduralMoonData {
  width: number;
  height: number;
  /** RGBA, equirectangular (u = (lon+180)/360, row 0 = north). */
  color: Uint8ClampedArray;
  /** RGBA greyscale height map for bump mapping. */
  elevation: Uint8ClampedArray;
}

function hash3(ix: number, iy: number, iz: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(iz, 1274126177) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  const c = (dx: number, dy: number, dz: number) => hash3(ix + dx, iy + dy, iz + dz, seed);
  const x00 = c(0, 0, 0) + (c(1, 0, 0) - c(0, 0, 0)) * sx;
  const x10 = c(0, 1, 0) + (c(1, 1, 0) - c(0, 1, 0)) * sx;
  const x01 = c(0, 0, 1) + (c(1, 0, 1) - c(0, 0, 1)) * sx;
  const x11 = c(0, 1, 1) + (c(1, 1, 1) - c(0, 1, 1)) * sx;
  const y0 = x00 + (x10 - x00) * sy;
  const y1 = x01 + (x11 - x01) * sy;
  return y0 + (y1 - y0) * sz;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function generateProceduralMoon(width = 2048, seed = 1): ProceduralMoonData {
  const w = Math.round(width);
  const h = Math.round(width / 2);
  const n = w * h;
  const rnd = mulberry32(seed);

  // Per-column / per-row trig tables (equirectangular -> unit sphere).
  const lonCos = new Float32Array(w), lonSin = new Float32Array(w);
  for (let i = 0; i < w; i++) {
    const lon = ((i + 0.5) / w) * 2 * Math.PI - Math.PI;
    lonCos[i] = Math.cos(lon);
    lonSin[i] = Math.sin(lon);
  }
  const latCos = new Float32Array(h), latSin = new Float32Array(h);
  for (let j = 0; j < h; j++) {
    const lat = Math.PI / 2 - ((j + 0.5) / h) * Math.PI;
    latCos[j] = Math.cos(lat);
    latSin[j] = Math.sin(lat);
  }

  const height = new Float32Array(n);
  const bright = new Float32Array(n);
  const maria = new Float32Array(n);
  const fine = new Float32Array(n);

  // Terrain noise on the sphere (seamless: sampled in 3D).
  for (let j = 0; j < h; j++) {
    const y = latSin[j]!;
    for (let i = 0; i < w; i++) {
      const x = latCos[j]! * lonSin[i]!;
      const z = latCos[j]! * lonCos[i]!;
      const idx = j * w + i;
      let amp = 0.5, freq = 2.2, sum = 0, low = 0;
      for (let o = 0; o < 6; o++) {
        const v = valueNoise(x * freq + 11, y * freq + 7, z * freq + 3, seed + o) - 0.5;
        sum += v * amp;
        if (o < 2) low += v * amp;
        amp *= 0.5;
        freq *= 2.1;
      }
      height[idx] = sum * 0.35;
      maria[idx] = smoothstep(0.02, 0.10, low);
      fine[idx] = sum;
    }
  }

  // Craters: power-law size distribution, random positions on the sphere.
  const craterCount = Math.round((w / 2048) * 3600);
  const RMIN = 0.28, RMAX = 9; // degrees
  for (let c = 0; c < craterCount; c++) {
    const u = rnd();
    const rDeg = Math.min(RMAX, RMIN / Math.pow(1 - u * 0.985, 0.8));
    const r = (rDeg * Math.PI) / 180;
    const clat = Math.asin(2 * rnd() - 1);
    const clon = rnd() * 2 * Math.PI - Math.PI;
    const cx = Math.cos(clat) * Math.sin(clon), cy = Math.sin(clat), cz = Math.cos(clat) * Math.cos(clon);
    const depth = 0.10 * Math.pow(rDeg / RMAX, 0.55);
    const fresh = rnd() < 0.18;
    const reach = r * 2.4;

    const latMinRow = Math.max(0, Math.floor(((Math.PI / 2 - (clat + reach)) / Math.PI) * h));
    const latMaxRow = Math.min(h - 1, Math.ceil(((Math.PI / 2 - (clat - reach)) / Math.PI) * h));
    const cosLatC = Math.max(Math.cos(clat), 1e-3);
    const dLon = Math.min(Math.PI, reach / cosLatC);
    const colCenter = ((clon + Math.PI) / (2 * Math.PI)) * w;
    const colSpan = Math.ceil((dLon / (2 * Math.PI)) * w) + 1;
    const fullRow = colSpan * 2 >= w;

    for (let j = latMinRow; j <= latMaxRow; j++) {
      const c0 = fullRow ? 0 : Math.floor(colCenter) - colSpan;
      const c1 = fullRow ? w - 1 : Math.floor(colCenter) + colSpan;
      for (let ci = c0; ci <= c1; ci++) {
        const i = ((ci % w) + w) % w;
        const dot = latCos[j]! * lonSin[i]! * cx + latSin[j]! * cy + latCos[j]! * lonCos[i]! * cz;
        const d = Math.acos(Math.min(1, Math.max(-1, dot)));
        if (d > reach) continue;
        const rho = d / r;
        let dh: number;
        if (rho < 1) {
          const bowl = 1 - rho * rho;
          dh = -depth * bowl + depth * 0.18 * Math.exp(-((rho - 0.02) * (rho - 0.02)) / 0.01) * (r > 0.05 ? 0.5 : 0); // central peak
        } else {
          const t = (rho - 1) / 0.14;
          dh = depth * 0.55 * Math.exp(-t * t) + depth * 0.12 / (rho * rho * rho);
        }
        const idx = j * w + i;
        height[idx] = height[idx]! + dh;
        if (fresh) bright[idx] = bright[idx]! + 0.22 * Math.exp(-((rho - 1.2) * (rho - 1.2)) / 0.9) * Math.min(1, 2.6 / (rho + 0.4));
      }
    }
  }

  // Normalise height and colourise.
  let hMin = Infinity, hMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const v = height[i]!;
    if (v < hMin) hMin = v;
    if (v > hMax) hMax = v;
  }
  const hRange = hMax - hMin || 1;

  const color = new Uint8ClampedArray(n * 4);
  const elevation = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const hn = (height[i]! - hMin) / hRange;
    const albedo = 0.5 + fine[i]! * 0.22 + bright[i]! + (hn - 0.5) * 0.35 - maria[i]! * 0.13;
    const a = Math.min(1, Math.max(0.08, albedo)) * 255;
    const o = i * 4;
    color[o] = a * 1.0;
    color[o + 1] = a * 0.985;
    color[o + 2] = a * 0.95;
    color[o + 3] = 255;
    const e = hn * 255;
    elevation[o] = e;
    elevation[o + 1] = e;
    elevation[o + 2] = e;
    elevation[o + 3] = 255;
  }

  return { width: w, height: h, color, elevation };
}
