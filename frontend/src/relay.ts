import './style.css';

interface Win { a: number; b: number; minR: number; maxR: number }
interface NodeSeries { name: string; x: number[]; y: number[] }
interface RelayData {
  t0: number; step: number; periodMin: number; mx: number[]; my: number[];
  lunar: NodeSeries[]; earth: NodeSeries[]; range: number[];
  activeLunar: number[]; activeEarth: number[]; win: Win[];
}
interface TransferState { running: boolean; sizeMb: number; rateMbps: number; sentMb: number; receivedMb: number }
const C_KMS = 299792.458, GEO_R = 42164.17, R_EARTH = 6378.137, R_MOON = 1737.4;
const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`#${id} missing`);
  return element as T;
};
const css = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const fmt = (time: number): string => new Date(time).toISOString().slice(5, 16).replace('T', ' ');
const ctx = (id: string): CanvasRenderingContext2D => {
  const context = $<HTMLCanvasElement>(id).getContext('2d');
  if (!context) throw new Error('canvas unsupported');
  return context;
};

async function init(): Promise<void> {
  const data: RelayData = await (await fetch('/relay_series.json')).json();
  const N = data.mx.length, end = data.t0 + (N - 1) * data.step;
  const slider = $<HTMLInputElement>('sl'); slider.max = String(N - 1);
  let timer: number | null = null;
  const transfer: TransferState = { running: false, sizeMb: 0, rateMbps: 0, sentMb: 0, receivedMb: 0 };
  const visibleAt = (time: number): Win | undefined => data.win.find(w => time >= w.a && time < w.b);

  const drawEarth = (i: number): void => {
    const g = ctx('earth'), scale = 180 / 50000, cx = 200, cy = 200;
    const X = (x: number) => cx + x * scale, Y = (y: number) => cy - y * scale;
    g.clearRect(0, 0, 400, 400); g.fillStyle = css('--tx'); g.font = '13px sans-serif';
    g.fillText('Earth relay constellation', 8, 16);
    g.strokeStyle = css('--ln'); g.setLineDash([3, 3]); g.beginPath(); g.arc(cx, cy, GEO_R * scale, 0, 7); g.stroke(); g.setLineDash([]);
    g.fillStyle = css('--ac'); g.beginPath(); g.arc(cx, cy, R_EARTH * scale, 0, 7); g.fill();
    const moonDistance = Math.hypot(data.mx[i]!, data.my[i]!);
    const ux = data.mx[i]! / moonDistance, uy = data.my[i]! / moonDistance;
    g.strokeStyle = css('--mu'); g.beginPath(); g.moveTo(cx, cy); g.lineTo(X(ux * 50000), Y(uy * 50000)); g.stroke();
    const active = data.activeEarth[i]!;
    data.earth.forEach((node, index) => {
      const ok = index === active && visibleAt(data.t0 + i * data.step) !== undefined;
      const color = ok ? css('--ok') : css('--bad');
      g.fillStyle = color; g.beginPath(); g.arc(X(node.x[i]!), Y(node.y[i]!), 8, 0, 7); g.fill();
      g.fillStyle = css('--tx'); g.fillText(node.name, X(node.x[i]!) + 8, Y(node.y[i]!) - 6);
    });
    g.fillStyle = css('--mu'); g.fillText('Moon direction â†’', 8, 388);
  };

  const drawMoon = (i: number): void => {
    const g = ctx('moon'), scale = 180 / 11000, cx = 200, cy = 200;
    const X = (x: number) => cx + x * scale, Y = (y: number) => cy - y * scale;
    g.clearRect(0, 0, 400, 400); g.fillStyle = css('--tx'); g.font = '13px sans-serif';
    g.fillText('Moon relay constellation', 8, 16); g.fillStyle = css('--mu'); g.beginPath(); g.arc(cx, cy, R_MOON * scale, 0, 7); g.fill();
    data.lunar.forEach((node, index) => {
      g.strokeStyle = css('--ln'); g.beginPath();
      for (let k = 0; k < node.x.length; k++) { const x = X(node.x[k]!); const y = Y(node.y[k]!); k ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      const ok = index === data.activeLunar[i]! && visibleAt(data.t0 + i * data.step) !== undefined;
      g.fillStyle = ok ? css('--ok') : css('--bad'); g.beginPath(); g.arc(X(node.x[i]!), Y(node.y[i]!), 8, 0, 7); g.fill();
      g.fillStyle = css('--tx'); g.fillText(node.name, X(node.x[i]!) + 8, Y(node.y[i]!) - 6);
    });
    g.fillStyle = css('--mu'); g.fillText('line of sight toward Earth', 8, 388);
  };

  const drawTimeline = (time: number): void => {
    const g = ctx('tl'), W = 900, m = 40, X = (value: number) => m + (value - data.t0) / (end - data.t0) * (W - m - 8);
    g.clearRect(0, 0, W, 120); g.font = '11px sans-serif'; g.fillStyle = css('--mu'); g.fillText('NETWORK', 4, 30);
    g.fillStyle = css('--bad') + '44'; g.fillRect(m, 14, W - m - 8, 24); g.fillStyle = css('--ok');
    data.win.forEach(w => g.fillRect(X(w.a), 14, Math.max(1, X(w.b) - X(w.a)), 24));
    g.fillStyle = css('--mu'); for (let h = 0; h <= 48; h += 6) g.fillText(`+${h}h`, X(data.t0 + h * 3.6e6) - 8, 112);
    g.strokeStyle = css('--tx'); g.beginPath(); g.moveTo(X(time), 6); g.lineTo(X(time), 96); g.stroke();
  };

  const readouts = (i: number): void => {
    const time = data.t0 + i * data.step, link = visibleAt(time) !== undefined;
    $('status').textContent = link ? 'NETWORK LINK UP' : 'OUTAGE'; $('status').style.color = link ? css('--ok') : css('--bad');
    $('delay').textContent = link ? `${(data.range[i]! / C_KMS).toFixed(3)} s` : 'â€“';
    $('path').textContent = link ? `${data.lunar[data.activeLunar[i]!]!.name} â†’ ${data.earth[data.activeEarth[i]!]!.name}` : 'No path';
  };

  const renderTransfer = (i: number): void => {
    const percent = transfer.sizeMb ? Math.min(100, transfer.receivedMb / transfer.sizeMb * 100) : 0;
    $<HTMLElement>('progressBar').style.width = `${percent}%`;
    const link = visibleAt(data.t0 + i * data.step) !== undefined;
    const state = transfer.running ? (link ? 'TRANSMITTING' : 'WAITING FOR LINK') :
      (transfer.sizeMb && transfer.receivedMb >= transfer.sizeMb ? 'COMPLETE' : 'IDLE');
    const remaining = Math.max(0, transfer.sizeMb - transfer.sentMb);
    const estimate = transfer.running && link && transfer.rateMbps > 0 ?
      ` Â· estimated active-link time ${(remaining * 8 / transfer.rateMbps / 60).toFixed(1)} min` : '';
    $('transfer').innerHTML = `<b>${state}</b> Â· sent ${transfer.sentMb.toFixed(1)} / ${transfer.sizeMb.toFixed(1)} MB Â· ` +
      `received ${transfer.receivedMb.toFixed(1)} MB Â· ${percent.toFixed(1)}%${estimate}`;
  };

  const advanceTransfer = (i: number): void => {
    if (!transfer.running || transfer.receivedMb >= transfer.sizeMb) return;
    const link = visibleAt(data.t0 + i * data.step) !== undefined;
    if (!link) { renderTransfer(i); return; }
    const chunk = transfer.rateMbps * (data.step / 1000) / 8;
    transfer.sentMb = Math.min(transfer.sizeMb, transfer.sentMb + chunk);
    const delayMb = transfer.rateMbps * (data.range[i]! / C_KMS) / 8;
    transfer.receivedMb = Math.min(transfer.sizeMb, Math.max(transfer.receivedMb, transfer.sentMb - delayMb));
    if (transfer.receivedMb >= transfer.sizeMb) transfer.running = false;
  };

  const update = (): void => {
    const i = +slider.value, time = data.t0 + i * data.step;
    drawEarth(i); drawMoon(i); drawTimeline(time); readouts(i); renderTransfer(i);
  };
  const total = data.win.reduce((sum, w) => sum + w.b - w.a, 0);
  $('sum').innerHTML = `<b>Network coverage:</b> ${(total / (end - data.t0) * 100).toFixed(1)}%<br>` +
    `<b>Windows:</b> ${data.win.length}<br>Three lunar and three Earth relays; a window is available when any pair has line of sight.`;
  $('tb').innerHTML = '<tr><th>Start (UTC)</th><th>End (UTC)</th><th>Duration</th><th>Best delay</th></tr>' +
    data.win.map(w => `<tr><td>${fmt(w.a)}</td><td>${fmt(w.b)}</td><td>${((w.b - w.a) / 60000).toFixed(0)} min</td><td>${(w.minR / C_KMS).toFixed(3)}â€“${(w.maxR / C_KMS).toFixed(3)} s</td></tr>`).join('');
  slider.oninput = update;
  $('start').onclick = (): void => {
    transfer.sizeMb = Math.max(1, +$<HTMLInputElement>('dataSize').value || 1);
    transfer.rateMbps = Math.max(0.1, +$<HTMLInputElement>('rate').value || 0.1);
    transfer.sentMb = 0; transfer.receivedMb = 0; transfer.running = true;
    if (timer === null) $('pl').click();
    update();
  };
  $('pl').onclick = (): void => {
    if (timer !== null) { clearInterval(timer); timer = null; $('pl').textContent = 'â–¶ Play'; return; }
    $('pl').textContent = 'Pause'; timer = window.setInterval(() => {
      advanceTransfer(+slider.value); slider.value = String((+slider.value + 1) % N); update();
    }, 40);
  };
  update();
}
init().catch(error => document.body.append(`Failed to load: ${error}`));


