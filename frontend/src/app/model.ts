export const R_MOON = 1737.4;
export const C_KMS = 299792.458;
export const RAD = Math.PI / 180;

/** Precomputed by lunar_link.py: sub-Earth libration (deg) and Earth-Moon distance (km). */
export interface Series { t0: number; step: number; l: number[]; b: number[]; d: number[] }
export interface Link { el: number; dly: number; l: number; b: number }
export interface Win { a: number; b: number; dly: number }
export interface Transfer { done: boolean; start: number | null; end: number; delay: number; waitH: number }

export const endTime = (s: Series): number => s.t0 + (s.l.length - 1) * s.step;

export function sample(a: number[], s: Series, t: number): number {
  const x = (t - s.t0) / s.step;
  const i = Math.max(0, Math.min(a.length - 2, Math.floor(x)));
  const f = x - i;
  return a[i]! * (1 - f) + a[i + 1]! * f;
}

/** Earth elevation (deg) and one-way light-time (s) at a site (lat, lon east+) at epoch-ms t. */
export function linkAt(s: Series, t: number, lat: number, lon: number): Link {
  const l = sample(s.l, s, t), b = sample(s.b, s, t), d = sample(s.d, s, t);
  const sinEl = Math.sin(lat * RAD) * Math.sin(b * RAD) +
    Math.cos(lat * RAD) * Math.cos(b * RAD) * Math.cos((lon - l) * RAD);
  const range = Math.sqrt(d * d + R_MOON * R_MOON - 2 * d * R_MOON * sinEl);
  return { el: Math.asin(sinEl) / RAD, dly: range / C_KMS, l, b };
}

export function findWindows(s: Series, lat: number, lon: number, mask: number): Win[] {
  const out: Win[] = [];
  let cur: { a: number; dly: number } | null = null;
  const end = endTime(s);
  for (let t = s.t0; t <= end; t += 60_000) {
    const k = linkAt(s, t, lat, lon);
    if (k.el > mask) { cur ??= { a: t, dly: k.dly }; }
    else if (cur) { out.push({ ...cur, b: t }); cur = null; }
  }
  if (cur) out.push({ ...cur, b: end });
  return out;
}

/** Send `mb` megabytes at `kbps`; transmit only while Earth is above the mask. */
export function simulateTransfer(s: Series, lat: number, lon: number, mask: number,
                                 sendTime: number, mb: number, kbps: number): Transfer {
  let left = mb * 8e6, start: number | null = null, delay = 0, t = sendTime;
  const end = endTime(s);
  for (; t < end && left > 0; t += 60_000) {
    const k = linkAt(s, t, lat, lon);
    if (k.el > mask) { start ??= t; left -= kbps * 1000 * 60; delay = k.dly; }
  }
  return { done: left <= 0 && start !== null, start, end: t, delay,
           waitH: start === null ? 0 : (start - sendTime) / 3.6e6 };
}