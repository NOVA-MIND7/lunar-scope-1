import { useMemo } from 'react';
import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { useMissionTimeline } from '@/hooks/useApi';
import { useAppStore } from '@/stores/appStore';
import type { TimelineResponse } from '@/types';
import { formatLatitude, formatLongitude } from '@/utils/format';
import { formatUtc, toUtcIso } from '@/utils/time';

const J2000_MS = 946_728_000_000;
const LUNAR_SYNODIC_MONTH = 29.530588853;
const LUNAR_SIDEREAL_MONTH = 27.321661;
const LUNAR_OBLIQUITY_DEG = 1.5424;
const SUN_ANGULAR_RADIUS_DEG = 0.26;
const RAD = Math.PI / 180;

function solarElevationDeg(latDeg: number, lonDeg: number, timestampMs: number): number {
  const days = (timestampMs - J2000_MS) / 86_400_000;
  const sunDeclination = LUNAR_OBLIQUITY_DEG * Math.sin((2 * Math.PI * (days - 80)) / 365.25);
  const subsolarLon = (((218.316 - 360 * (days / LUNAR_SYNODIC_MONTH)) % 360) + 360) % 360;
  const phi = latDeg * RAD;
  const delta = sunDeclination * RAD;
  const hAngle = (lonDeg - subsolarLon) * RAD;
  const sinElev = Math.max(-1, Math.min(1, Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(hAngle)));
  return Math.asin(sinElev) / RAD;
}

function earthElevationDeg(latDeg: number, lonDeg: number, timestampMs: number): number {
  const days = (timestampMs - J2000_MS) / 86_400_000;
  const libLat = 6.68 * Math.sin((2 * Math.PI * days) / LUNAR_SIDEREAL_MONTH);
  const libLon = 7.91 * Math.sin((2 * Math.PI * (days - 5)) / LUNAR_SIDEREAL_MONTH);
  const phi = latDeg * RAD;
  const deltaE = libLat * RAD;
  const hEarth = (lonDeg - libLon) * RAD;
  const sinElev = Math.max(-1, Math.min(1, Math.sin(phi) * Math.sin(deltaE) + Math.cos(phi) * Math.cos(deltaE) * Math.cos(hEarth)));
  return Math.asin(sinElev) / RAD;
}

function computeMetrics(latDeg: number, lonDeg: number, landingUtc: string, durationDays: number, timeline?: TimelineResponse | null) {
  const startMs = Date.parse(landingUtc);
  const safeStartMs = Number.isFinite(startMs) ? startMs : Date.now();
  const solarNow = solarElevationDeg(latDeg, lonDeg, safeStartMs);
  const earthNow = earthElevationDeg(latDeg, lonDeg, safeStartMs);

  let sunlightHours: number | null = null;
  let earthPct: number | null = null;
  const intervals = timeline?.sunlight_track?.intervals;
  if (Array.isArray(intervals) && typeof timeline?.earth_visible_fraction === 'number') {
    let bestHours = 0;
    for (const iv of intervals) {
      if (iv.state === 'sunlit') {
        const spanH = (Date.parse(iv.end_utc) - Date.parse(iv.start_utc)) / 3_600_000;
        if (Number.isFinite(spanH) && spanH > bestHours) bestHours = spanH;
      }
    }
    sunlightHours = bestHours;
    earthPct = timeline.earth_visible_fraction * 100;
  }
  if (sunlightHours === null || earthPct === null) {
    const totalHours = Math.max(1, durationDays) * 24;
    const stepHours = durationDays <= 30 ? 1 : 3;
    const steps = Math.max(1, Math.floor(totalHours / stepHours));
    let currentStreak = 0;
    let bestStreak = 0;
    let earthSteps = 0;
    for (let i = 0; i <= steps; i++) {
      const tMs = safeStartMs + i * stepHours * 3_600_000;
      const sunEl = solarElevationDeg(latDeg, lonDeg, tMs);
      const earthEl = earthElevationDeg(latDeg, lonDeg, tMs);
      if (i < steps) {
        if (sunEl > -SUN_ANGULAR_RADIUS_DEG) {
          currentStreak += stepHours;
          if (currentStreak > bestStreak) bestStreak = currentStreak;
        } else currentStreak = 0;
        if (earthEl > 0) earthSteps += 1;
      }
    }
    sunlightHours = Math.min(totalHours, bestStreak);
    earthPct = (earthSteps / steps) * 100;
  }
  return {
    solarNowDeg: solarNow,
    earthNowDeg: earthNow,
    maxContinuousSunHours: sunlightHours,
    earthVisiblePct: earthPct,
    sunlitFraction: timeline?.sunlit_fraction ?? null,
    longestDarknessHours: timeline?.longest_darkness_hours ?? null,
  };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type ReportData = ReturnType<typeof buildReportData>;

function buildReportData(args: {
  missionName: string;
  site: ReturnType<typeof useAppStore.getState>['selectedLandingSite'];
  coords: { latitude_deg: number; longitude_deg: number } | null;
  landingUtc: string;
  durationDays: number;
  timeline: TimelineResponse | null | undefined;
  generatedUtc: string;
}) {
  const { missionName, site, coords, landingUtc, durationDays, timeline, generatedUtc } = args;
  const activeCoords = site?.coordinates ?? coords;
  const lat = activeCoords?.latitude_deg ?? null;
  const lon = activeCoords?.longitude_deg ?? null;
  const metrics = lat != null && lon != null ? computeMetrics(lat, lon, landingUtc, durationDays, timeline) : null;
  const endUtc = new Date(Date.parse(landingUtc) + durationDays * 86_400_000).toISOString();
  return {
    missionName,
    generatedUtc,
    landingUtc,
    endUtc,
    durationDays,
    site: site
      ? {
          name: site.name,
          id: site.id,
          region: site.region,
          category: site.category,
          precision: site.precision,
          provenance: site.provenance,
          latitude: site.coordinates.latitude_deg,
          longitude: site.coordinates.longitude_deg,
          description: site.description ?? '',
        }
      : null,
    coordinates: activeCoords,
    metrics,
    timeline: timeline ?? null,
  };
}

function exportExcel(report: ReportData) {
  const rows: string[][] = [];
  const add = (section: string, field: string, value: string | number | null | undefined) => {
    rows.push([section, field, value == null || value === '' ? '—' : String(value)]);
  };
  add('Mission', 'Mission name', report.missionName);
  add('Mission', 'Report generated (UTC)', report.generatedUtc);
  add('Mission', 'Landing time (UTC)', formatUtc(report.landingUtc));
  add('Mission', 'Mission end (UTC)', formatUtc(report.endUtc));
  add('Mission', 'Duration (days)', report.durationDays);
  if (report.site) {
    add('Site', 'Name', report.site.name);
    add('Site', 'ID', report.site.id);
    add('Site', 'Region', report.site.region);
    add('Site', 'Category', report.site.category);
    add('Site', 'Precision', report.site.precision);
    add('Site', 'Provenance', report.site.provenance);
    add('Site', 'Latitude (deg)', report.site.latitude);
    add('Site', 'Longitude (deg)', report.site.longitude);
    add('Site', 'Description', report.site.description);
  } else if (report.coordinates) {
    add('Site', 'Name', 'Custom coordinates');
    add('Site', 'Latitude (deg)', report.coordinates.latitude_deg);
    add('Site', 'Longitude (deg)', report.coordinates.longitude_deg);
  } else {
    add('Site', 'Name', 'No site selected');
  }
  if (report.metrics) {
    add('Conditions', 'Solar elevation at landing (deg)', report.metrics.solarNowDeg.toFixed(2));
    add('Conditions', 'Earth elevation at landing (deg)', report.metrics.earthNowDeg.toFixed(2));
    add('Conditions', 'Max continuous sunlight (h)', report.metrics.maxContinuousSunHours.toFixed(2));
    add('Conditions', 'Earth visibility (%)', report.metrics.earthVisiblePct.toFixed(2));
    if (report.metrics.sunlitFraction != null) add('Conditions', 'Sunlit fraction (timeline)', (report.metrics.sunlitFraction * 100).toFixed(2) + '%');
    if (report.metrics.longestDarknessHours != null) add('Conditions', 'Longest darkness (h)', report.metrics.longestDarknessHours.toFixed(2));
  }
  if (report.timeline) {
    add('Timeline', 'Method', report.timeline.method);
    add('Timeline', 'Site (timeline)', report.timeline.site_name);
    add('Timeline', 'Sunlit fraction', (report.timeline.sunlit_fraction * 100).toFixed(2) + '%');
    add('Timeline', 'Earth visible fraction', (report.timeline.earth_visible_fraction * 100).toFixed(2) + '%');
    add('Timeline', 'Longest darkness (h)', report.timeline.longest_darkness_hours.toFixed(2));
    for (const ph of report.timeline.phases ?? []) {
      add('Phases', ph.name, `${formatUtc(ph.start_utc)} → ${formatUtc(ph.end_utc)}${ph.description ? ' — ' + ph.description : ''}`);
    }
    for (const iv of report.timeline.sunlight_track?.intervals ?? []) {
      add('Sunlight intervals', iv.state, `${formatUtc(iv.start_utc)} → ${formatUtc(iv.end_utc)}`);
    }
    for (const iv of report.timeline.earth_track?.intervals ?? []) {
      add('Earth visibility intervals', iv.state, `${formatUtc(iv.start_utc)} → ${formatUtc(iv.end_utc)}`);
    }
  } else {
    add('Timeline', 'Status', 'No computed timeline available for this selection');
  }

  const table = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr><th>Section</th><th>Field</th><th>Value</th></tr></thead><tbody>${rows
    .map((r) => `<tr><td>${escapeHtml(r[0] ?? '')}</td><td>${escapeHtml(r[1] ?? '')}</td><td>${escapeHtml(r[2] ?? '')}</td></tr>`)
    .join('')}</tbody></table></body></html>`;
  const blob = new Blob(['\ufeff', table], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const safeName = (report.missionName || 'mission-report').replace(/[^a-z0-9_-]+/gi, '_');
  downloadBlob(blob, `${safeName}.xls`);
}

function exportPdf(report: ReportData) {
  const m = report.metrics;
  const siteBlock = report.site
    ? `<tr><th>Name</th><td>${escapeHtml(report.site.name)}</td></tr>
       <tr><th>ID</th><td>${escapeHtml(report.site.id)}</td></tr>
       <tr><th>Region</th><td>${escapeHtml(report.site.region)}</td></tr>
       <tr><th>Category</th><td>${escapeHtml(report.site.category)}</td></tr>
       <tr><th>Precision / Provenance</th><td>${escapeHtml(report.site.precision)} / ${escapeHtml(report.site.provenance)}</td></tr>
       <tr><th>Coordinates</th><td>${escapeHtml(formatLatitude(report.site.latitude))}, ${escapeHtml(formatLongitude(report.site.longitude))}</td></tr>
       <tr><th>Description</th><td>${escapeHtml(report.site.description || '—')}</td></tr>`
    : report.coordinates
      ? `<tr><th>Name</th><td>Custom coordinates</td></tr><tr><th>Coordinates</th><td>${escapeHtml(formatLatitude(report.coordinates.latitude_deg))}, ${escapeHtml(formatLongitude(report.coordinates.longitude_deg))}</td></tr>`
      : `<tr><th>Name</th><td>No site selected</td></tr>`;

  const conditionsBlock = m
    ? `<tr><th>Solar elevation at landing</th><td>${m.solarNowDeg.toFixed(2)}°</td></tr>
       <tr><th>Earth elevation at landing</th><td>${m.earthNowDeg.toFixed(2)}°</td></tr>
       <tr><th>Max continuous sunlight</th><td>${m.maxContinuousSunHours.toFixed(2)} h</td></tr>
       <tr><th>Earth visibility</th><td>${m.earthVisiblePct.toFixed(2)}%</td></tr>
       ${m.sunlitFraction != null ? `<tr><th>Sunlit fraction (timeline)</th><td>${(m.sunlitFraction * 100).toFixed(2)}%</td></tr>` : ''}
       ${m.longestDarknessHours != null ? `<tr><th>Longest darkness</th><td>${m.longestDarknessHours.toFixed(2)} h</td></tr>` : ''}`
    : `<tr><td colspan="2">Select a landing site or coordinates to compute conditions.</td></tr>`;

  const phasesRows = (report.timeline?.phases ?? [])
    .map((p) => `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(formatUtc(p.start_utc))}</td><td>${escapeHtml(formatUtc(p.end_utc))}</td><td>${escapeHtml(p.description || '')}</td></tr>`)
    .join('') || `<tr><td colspan="4">No phase data available.</td></tr>`;

  const sunRows = (report.timeline?.sunlight_track?.intervals ?? [])
    .slice(0, 40)
    .map((i) => `<tr><td>${escapeHtml(i.state)}</td><td>${escapeHtml(formatUtc(i.start_utc))}</td><td>${escapeHtml(formatUtc(i.end_utc))}</td></tr>`)
    .join('') || `<tr><td colspan="3">No sunlight intervals available.</td></tr>`;
  const earthRows = (report.timeline?.earth_track?.intervals ?? [])
    .slice(0, 40)
    .map((i) => `<tr><td>${escapeHtml(i.state)}</td><td>${escapeHtml(formatUtc(i.start_utc))}</td><td>${escapeHtml(formatUtc(i.end_utc))}</td></tr>`)
    .join('') || `<tr><td colspan="3">No Earth visibility intervals available.</td></tr>`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(report.missionName)} - Mission Report</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px;line-height:1.5;font-size:13px}
    h1{font-size:22px;margin:0 0 4px} h2{font-size:16px;margin:22px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px}
    .meta{color:#444;margin-bottom:16px} table{width:100%;border-collapse:collapse;margin-bottom:10px}
    th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top} th{background:#f3f6fb;width:34%}
    thead th{width:auto} .note{color:#555;font-size:12px}
    @media print{body{margin:0.5in}}
  </style></head><body>
  <h1>LUNAR SCOPE — Mission Report</h1>
  <div class="meta"><strong>${escapeHtml(report.missionName)}</strong><br/>Generated (UTC): ${escapeHtml(report.generatedUtc)}<br/>Landing: ${escapeHtml(formatUtc(report.landingUtc))} · Duration: ${report.durationDays} days · End: ${escapeHtml(formatUtc(report.endUtc))}</div>
  <h2>Landing Site</h2><table>${siteBlock}</table>
  <h2>Mission Conditions (computed)</h2><table>${conditionsBlock}</table>
  <h2>Timeline Summary</h2><table>
    <tr><th>Method</th><td>${escapeHtml(report.timeline?.method ?? '—')}</td></tr>
    <tr><th>Sunlit fraction</th><td>${report.timeline ? (report.timeline.sunlit_fraction * 100).toFixed(2) + '%' : '—'}</td></tr>
    <tr><th>Earth visible fraction</th><td>${report.timeline ? (report.timeline.earth_visible_fraction * 100).toFixed(2) + '%' : '—'}</td></tr>
    <tr><th>Longest darkness</th><td>${report.timeline ? report.timeline.longest_darkness_hours.toFixed(2) + ' h' : '—'}</td></tr>
  </table>
  <h2>Mission Phases</h2><table><thead><tr><th>Phase</th><th>Start (UTC)</th><th>End (UTC)</th><th>Description</th></tr></thead><tbody>${phasesRows}</tbody></table>
  <h2>Sunlight Intervals</h2><table><thead><tr><th>State</th><th>Start (UTC)</th><th>End (UTC)</th></tr></thead><tbody>${sunRows}</tbody></table>
  <h2>Earth Visibility Intervals</h2><table><thead><tr><th>State</th><th>Start (UTC)</th><th>End (UTC)</th></tr></thead><tbody>${earthRows}</tbody></table>
  <p class="note">Report reflects currently selected mission parameters and available computed data at generation time. Use your browser's “Save as PDF” option in the print dialog to export this report as PDF.</p>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export default function MissionReportsPage() {
  const missionName = useAppStore((s) => s.missionName);
  const site = useAppStore((s) => s.selectedLandingSite);
  const coords = useAppStore((s) => s.selectedCoordinates);
  const date = useAppStore((s) => s.selectedLandingDate);
  const time = useAppStore((s) => s.selectedLandingTime);
  const duration = useAppStore((s) => s.selectedMissionDuration);

  const landingUtc = toUtcIso(date, time);
  const timelineSiteId = site && site.category !== 'custom' ? site.id : null;
  const timeline = useMissionTimeline(timelineSiteId, landingUtc, duration);

  const report = useMemo(() => {
    const generatedUtc = new Date().toISOString();
    return buildReportData({
      missionName,
      site,
      coords,
      landingUtc,
      durationDays: duration,
      timeline: timeline.data,
      generatedUtc,
    });
  }, [missionName, site, coords, landingUtc, duration, timeline.data]);

  const m = report.metrics;

  return (
    <>
      <PageHeader
        title="Mission Reports"
        description="Detailed mission report based on current selections. Export as PDF or Excel."
        actions={
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-primary" onClick={() => exportPdf(report)} title="Open print dialog to save as PDF">
              <Printer className="size-4" aria-hidden /> Export PDF
            </button>
            <button type="button" className="btn" onClick={() => exportExcel(report)} title="Download Excel-compatible report (.xls)">
              <FileSpreadsheet className="size-4" aria-hidden /> Export Excel
            </button>
          </div>
        }
      />

      <div className="space-y-4">
        <section className="card p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-fg"><FileText className="size-4 text-cyan" /> Mission summary</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div><div className="label">Mission name</div><div className="text-fg">{report.missionName}</div></div>
            <div><div className="label">Landing (UTC)</div><div className="text-fg font-mono text-sm">{formatUtc(report.landingUtc)}</div></div>
            <div><div className="label">Duration</div><div className="text-fg">{report.durationDays} days</div></div>
            <div><div className="label">Mission end (UTC)</div><div className="text-fg font-mono text-sm">{formatUtc(report.endUtc)}</div></div>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="text-base font-semibold text-fg">Landing site</h2>
          {report.site ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div><div className="label">Name</div><div className="text-fg">{report.site.name}</div></div>
              <div><div className="label">Region / Category</div><div className="text-fg">{report.site.region} · {report.site.category}</div></div>
              <div><div className="label">Coordinates</div><div className="text-fg font-mono">{formatLatitude(report.site.latitude)}, {formatLongitude(report.site.longitude)}</div></div>
              <div><div className="label">Precision / Provenance</div><div className="text-fg">{report.site.precision} / {report.site.provenance}</div></div>
              <div className="sm:col-span-2"><div className="label">Description</div><div className="text-fg-muted">{report.site.description || '—'}</div></div>
            </div>
          ) : report.coordinates ? (
            <p className="mt-3 text-sm text-fg">Custom coordinates: <span className="font-mono">{formatLatitude(report.coordinates.latitude_deg)}, {formatLongitude(report.coordinates.longitude_deg)}</span></p>
          ) : (
            <p className="mt-3 text-sm text-fg-muted">No landing site selected. Choose a site or coordinates in Mission Control to include site and condition details.</p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="text-base font-semibold text-fg">Mission conditions</h2>
          {m ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div><div className="label">Solar elevation (at landing)</div><div className="text-fg font-mono text-base">{m.solarNowDeg.toFixed(2)}°</div></div>
              <div><div className="label">Earth elevation (at landing)</div><div className="text-fg font-mono text-base">{m.earthNowDeg.toFixed(2)}°</div></div>
              <div><div className="label">Max continuous sunlight</div><div className="text-fg font-mono text-base">{m.maxContinuousSunHours.toFixed(2)} h</div></div>
              <div><div className="label">Earth visibility</div><div className="text-fg font-mono text-base">{m.earthVisiblePct.toFixed(2)}%</div></div>
              {m.sunlitFraction != null ? <div><div className="label">Sunlit fraction (timeline)</div><div className="text-fg">{(m.sunlitFraction * 100).toFixed(2)}%</div></div> : null}
              {m.longestDarknessHours != null ? <div><div className="label">Longest darkness</div><div className="text-fg">{m.longestDarknessHours.toFixed(2)} h</div></div> : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-fg-muted">Select a site or coordinates to compute conditions.</p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="text-base font-semibold text-fg">Timeline details</h2>
          {timeline.isPending ? (
            <p className="mt-3 text-sm text-fg-muted">Loading computed timeline…</p>
          ) : report.timeline ? (
            <div className="mt-3 space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div><div className="label">Method</div><div className="text-fg font-mono">{report.timeline.method}</div></div>
                <div><div className="label">Sunlit fraction</div><div className="text-fg">{(report.timeline.sunlit_fraction * 100).toFixed(2)}%</div></div>
                <div><div className="label">Earth visible fraction</div><div className="text-fg">{(report.timeline.earth_visible_fraction * 100).toFixed(2)}%</div></div>
                <div><div className="label">Longest darkness</div><div className="text-fg">{report.timeline.longest_darkness_hours.toFixed(2)} h</div></div>
              </div>
              <div>
                <div className="label mb-1">Mission phases</div>
                {report.timeline.phases?.length ? (
                  <ul className="space-y-1 text-fg-muted">
                    {report.timeline.phases.map((p, i) => (
                      <li key={i}><span className="text-fg font-medium">{p.name}</span>: {formatUtc(p.start_utc)} → {formatUtc(p.end_utc)}{p.description ? ` — ${p.description}` : ''}</li>
                    ))}
                  </ul>
                ) : <p className="text-fg-muted">No phases available.</p>}
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <div className="label mb-1">Sunlight intervals ({report.timeline.sunlight_track?.intervals?.length ?? 0})</div>
                  <ul className="max-h-40 overflow-auto space-y-0.5 text-fg-muted font-mono text-xs">
                    {(report.timeline.sunlight_track?.intervals ?? []).slice(0, 20).map((iv, i) => (
                      <li key={i}>{iv.state}: {formatUtc(iv.start_utc)} → {formatUtc(iv.end_utc)}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="label mb-1">Earth visibility intervals ({report.timeline.earth_track?.intervals?.length ?? 0})</div>
                  <ul className="max-h-40 overflow-auto space-y-0.5 text-fg-muted font-mono text-xs">
                    {(report.timeline.earth_track?.intervals ?? []).slice(0, 20).map((iv, i) => (
                      <li key={i}>{iv.state}: {formatUtc(iv.start_utc)} → {formatUtc(iv.end_utc)}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="text-xs text-fg-dim">Exports include full interval lists (up to export limits).</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-fg-muted">No computed timeline available. Select a non-custom landing site with a valid landing time to generate timeline data. Conditions above are still computed from mission parameters.</p>
          )}
        </section>

        <p className="text-xs text-fg-dim flex items-center gap-1.5"><Download className="size-3.5" /> PDF export opens the print dialog — choose “Save as PDF”. Excel export downloads a spreadsheet-compatible file (.xls).</p>
      </div>
    </>
  );
}
