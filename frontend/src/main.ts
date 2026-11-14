import './style.css';
import type { Series, Link, Win } from './app/model';
import { RAD, endTime, linkAt, findWindows, simulateTransfer } from './app/model';

declare global { interface Window { __SERIES__?: Series } }

const $ = <T extends HTMLElement>(id: string): T => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} missing`);
  return e as T;
};
const ctx = (c: HTMLCanvasElement): CanvasRenderingContext2D => {
  const g = c.getContext('2d');
  if (!g) throw new Error('canvas unsupported');
  return g;
};
const css = (v: string): string => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const fmt = (t: number): string => new Date(t).toISOString().slice(0, 16).replace('T', ' ');

const SITES: Record<string, [number, number] | null> = {
  'Shackleton rim (approx)': [-89.9, 0], 'Malapert massif (approx)': [-85.9, 0],
  'Mons Mouton / IM-2 (approx)': [-84.8, 29.2], 'Apollo 11': [0.67, 23.47], 'Custom': null,
};

interface Params { lat: number; lon: number; mask: number }

async function init(): Promise<void> {
  const S: Series = window.__SERIES__ ?? await (await fetch('lunar_link_series.json')).json();
  const N = S.l.length, TE = endTime(S);
  const site = $<HTMLSelectElement>('site'), slider = $<HTMLInputElement>('sl');
  let P: Params = { lat: 0, lon: 0, mask: 0 };
  let wins: Win[] = [];
  let timer: number | null = null;

  Object.keys(SITES).forEach(k => site.add(new Option(k)));
  slider.max = String(N - 1);

  const readParams = (): void => {
    P = { lat: +$<HTMLInputElement>('lat').value, lon: +$<HTMLInputElement>('lon').value,
          mask: +$<HTMLInputElement>('mask').value };
    const preset = SITES[site.value];
    if (preset && (preset[0] !== P.lat || preset[1] !== P.lon)) site.value = 'Custom';
  };

  const run = (): void => {
    readParams();
    wins = findWindows(S, P.lat, P.lon, P.mask);
    $('tb').innerHTML = '<tr><th>Start (UTC)</th><th>End (UTC)</th><th>Duration</th><th>One-way delay</th></tr>' +
      (wins.map(w => `<tr><td>${fmt(w.a)}</td><td>${fmt(w.b)}</td><td>${((w.b - w.a) / 3.6e6).toFixed(1)} h</td><td>${w.dly.toFixed(3)} s</td></tr>`).join('')
        || '<tr><td>No visibility in range</td></tr>');
    draw(); simulate();
  };

  const simulate = (): void => {
    let t = new Date($<HTMLInputElement>('ts').value + 'Z').getTime();
    if (Number.isNaN(t)) t = S.t0;
    const r = simulateTransfer(S, P.lat, P.lon, P.mask, t, +$<HTMLInputElement>('mb').value, +$<HTMLInputElement>('kb').value);
    $('res').innerHTML = !r.done || r.start === null
      ? 'Transfer does not finish inside the 45-day data range (or no visibility).'
      : `Transmission starts <b>${fmt(r.start)}</b> UTC, last bit sent <b>${fmt(r.end)}</b> UTC.<br>` +
        `Arrives at Earth ≈ <b>${fmt(r.end + r.delay * 1000)}</b> UTC (+${r.delay.toFixed(3)} s light-time). ` +
        `Wait for first window: ${r.waitH.toFixed(1)} h. Excludes ground-network latency and protocol overhead.`;
  };

  const drawChart = (): void => {
    const c = $<HTMLCanvasElement>('ch'), g = ctx(c), W = c.width, H = c.height, m = 34;
    const els = Array.from({ length: N }, (_, i) => linkAt(S, S.t0 + i * S.step, P.lat, P.lon).el);
    const lo = Math.min(...els, P.mask) - 1, hi = Math.max(...els, P.mask) + 1;
    const X = (t: number): number => m + (t - S.t0) / (TE - S.t0) * (W - m - 8);
    const Y = (e: number): number => H - 22 - (e - lo) / (hi - lo) * (H - 34);
    g.clearRect(0, 0, W, H);
    g.fillStyle = css('--ok') + '33';
    wins.forEach(w => g.fillRect(X(w.a), 6, X(w.b) - X(w.a), H - 28));
    g.strokeStyle = css('--ln'); g.fillStyle = css('--mu'); g.font = '11px sans-serif';
    g.beginPath(); g.moveTo(m, 6); g.lineTo(m, H - 22); g.lineTo(W - 8, H - 22); g.stroke();
    g.fillText(hi.toFixed(1) + '°', 2, 14); g.fillText(lo.toFixed(1) + '°', 2, H - 24);
    for (let d = 0; d <= 45; d += 5) g.fillText(`+${d}d`, X(S.t0 + d * 864e5) - 8, H - 6);
    g.strokeStyle = css('--bad'); g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(m, Y(P.mask)); g.lineTo(W - 8, Y(P.mask)); g.stroke(); g.setLineDash([]);
    g.strokeStyle = css('--ac'); g.lineWidth = 2; g.beginPath();
    els.forEach((e, i) => { const x = X(S.t0 + i * S.step); i ? g.lineTo(x, Y(e)) : g.moveTo(x, Y(e)); });
    g.stroke(); g.lineWidth = 1;
    g.strokeStyle = css('--tx'); const cx = X(S.t0 + +slider.value * S.step);
    g.beginPath(); g.moveTo(cx, 6); g.lineTo(cx, H - 22); g.stroke();
    g.fillStyle = css('--tx'); g.fillText('Earth elevation at site (green = link available)', m + 6, 16);
  };

  const drawMoon = (): void => {
    const t = S.t0 + +slider.value * S.step, k: Link = linkAt(S, t, P.lat, P.lon);
    const g = ctx($<HTMLCanvasElement>('moon')), r0 = 130, cx = 160, cy = 160, ok = k.el > P.mask;
    g.clearRect(0, 0, 320, 320);
    g.fillStyle = css('--ln'); g.beginPath(); g.arc(cx, cy, r0, 0, 7); g.fill();
    g.fillStyle = css('--tx'); g.font = '12px sans-serif';
    g.fillText('Moon as seen from Earth (N up)', 8, 16); g.fillText(fmt(t) + ' UTC', 8, 312);
    const p = P.lat * RAD, dl = (P.lon - k.l) * RAD, b = k.b * RAD;
    const x = Math.cos(p) * Math.sin(dl);
    const y = Math.cos(b) * Math.sin(p) - Math.sin(b) * Math.cos(p) * Math.cos(dl);
    if (k.el > 0) {
      g.fillStyle = ok ? css('--ok') : css('--bad'); g.beginPath(); g.arc(cx + x * r0, cy - y * r0, 7, 0, 7); g.fill();
    } else { g.fillStyle = css('--bad'); g.fillText('Site beyond the limb: Earth below horizon', 8, 286); }
    $('el').textContent = k.el.toFixed(2) + '°';
    $('dl').textContent = k.dly.toFixed(3) + ' s';
    const st = $('st'); st.textContent = ok ? 'LINK UP' : 'NO LINK'; st.style.color = ok ? css('--ok') : css('--bad');
  };
  const draw = (): void => { drawChart(); drawMoon(); };

  site.onchange = (): void => {
    const v = SITES[site.value];
    if (v) { $<HTMLInputElement>('lat').value = String(v[0]); $<HTMLInputElement>('lon').value = String(v[1]); }
    run();
  };
  (['lat', 'lon', 'mask'] as const).forEach(id => { $<HTMLInputElement>(id).onchange = run; });
  $('go').onclick = simulate;
  slider.oninput = draw;
  $('pl').onclick = (): void => {
    if (timer !== null) { clearInterval(timer); timer = null; $('pl').textContent = '▶ Play'; return; }
    $('pl').textContent = '⏸ Pause';
    timer = window.setInterval(() => { slider.value = String((+slider.value + 1) % N); draw(); }, 40);
  };

  $<HTMLInputElement>('ts').value = new Date(S.t0).toISOString().slice(0, 16);
  site.value = 'Shackleton rim (approx)'; site.onchange(new Event('change'));
}
init().catch(e => { document.body.append(`Failed to load: ${e}`); });
