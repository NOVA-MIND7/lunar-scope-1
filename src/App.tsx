import { useState, useMemo } from 'react';
import {
  Sun,
  Globe,
  Satellite,
  BatteryCharging,
  Sparkles,
  BookOpen,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { LANDING_SITES, type LandingSite } from './data/landingSites';
import {
  type CommsMode,
  simulateMissionWindow,
  findBestOrbitalReleaseDelay,
} from './utils/lunarPhysics';
import Lunar3DView from './components/Lunar3DView';

export default function App() {
  const [siteAId, setSiteAId] = useState<string>('malapert-massif');
  const [siteBId, setSiteBId] = useState<string>('nobile-rim-1');
  const [useCustomCoords, setUseCustomCoords] = useState<boolean>(false);
  const [customLat, setCustomLat] = useState<number>(-88.5);
  const [customLon, setCustomLon] = useState<number>(15.0);

  const [landingDate, setLandingDate] = useState<string>('2027-06-15');
  const [delayDays, setDelayDays] = useState<number>(0);
  const [hourStepIdx, setHourStepIdx] = useState<number>(0);
  const [useRelaySatellite, setUseRelaySatellite] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(true);

  const commsMode: CommsMode = useRelaySatellite ? 'LLO_MOTHERSHIP' : 'DTE_ONLY';

  const customSite: LandingSite = useMemo(
    () => ({
      id: 'custom-site',
      name: `Custom Target (${customLat.toFixed(1)}°, ${customLon.toFixed(1)}°)`,
      program: 'Custom Mission Coordinates',
      lat: customLat,
      lon: customLon,
      elevationMeters: 2200,
      slopeDeg: 6.5,
      waterIceDistanceKm: 1.5,
      description: 'User-defined lunar surface target evaluated with JPL Horizons geometry.',
      scienceValue: 'Custom user-selected regional target.',
      terrainMask: Array.from({ length: 36 }, (_, i) =>
        Number((1.4 + 1.3 * Math.sin((i * Math.PI) / 9 + customLon * 0.05)).toFixed(1))
      ),
    }),
    [customLat, customLon]
  );

  const siteA = useCustomCoords
    ? customSite
    : LANDING_SITES.find((s) => s.id === siteAId) || LANDING_SITES[2];
  const siteB = LANDING_SITES.find((s) => s.id === siteBId) || LANDING_SITES[4];

  const startIso = `${landingDate}T00:00:00Z`;

  const simA = useMemo(
    () => simulateMissionWindow(siteA, startIso, delayDays, commsMode, 'VERTICAL_TRACKING'),
    [siteA, startIso, delayDays, commsMode]
  );

  const simB = useMemo(
    () => simulateMissionWindow(siteB, startIso, delayDays, commsMode, 'VERTICAL_TRACKING'),
    [siteB, startIso, delayDays, commsMode]
  );

  const currentPoint = simA.points[hourStepIdx] || simA.points[0];

  const handleFindBestDate = () => {
    const best = findBestOrbitalReleaseDelay(siteA, startIso, commsMode, 'VERTICAL_TRACKING');
    setDelayDays(best.bestDelayDays);
    setHourStepIdx(0);
  };

  // Build 360° Terrain Silhouette Polygon
  const horizonPolygon = useMemo(() => {
    const pts = siteA.terrainMask.map((elDeg, idx) => {
      const x = ((idx * 10) / 360) * 720;
      const y = 165 - elDeg * 12;
      return `${x},${y}`;
    });
    pts.push(`720,${165 - siteA.terrainMask[0] * 12}`);
    return `0,210 ${pts.join(' ')} 720,210`;
  }, [siteA]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Satellite className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Lunar Landing Site Navigator
              </h1>
              <p className="text-xs text-slate-400">
                Compare South Pole landing sites & dates for Sun power and Earth communication
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              {showGuide ? 'Hide How It Works' : 'How It Works'}
            </button>
            <span className="hidden md:inline-block text-xs px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 font-mono">
              NASA JPL Horizons + LRO LOLA Data
            </span>
          </div>
        </div>
      </header>

      {/* Plain-English Beginner Guide Banner */}
      {showGuide && (
        <div className="bg-cyan-950/30 border-b border-cyan-500/20 px-6 py-3">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
            <div className="flex gap-2.5">
              <Sun className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">1. Why Sun Angle Matters (Power)</strong>
                At the Moon's South Pole, the Sun stays low on the horizon. Surrounding crater
                walls can block sunlight for days, draining rover batteries.
              </div>
            </div>
            <div className="flex gap-2.5">
              <Globe className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">2. Why Earth Position Matters (Comms)</strong>
                Earth wobbles near the horizon over 27 days. If a mountain blocks Earth, Direct
                radio fails unless an orbiting relay satellite is used.
              </div>
            </div>
            <div className="flex gap-2.5">
              <Calendar className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">3. Test Launch Delays & Backups</strong>
                Use the <strong>Launch Delay slider</strong> or compare <strong>Site A vs. Site B</strong> below to find a safe landing plan when schedules slip.
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* STEP 1: MISSION VARIABLES BAR (LOCATION, DATE DELAY, RELAY) */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
            {/* Primary Site Selector */}
            <div className="md:col-span-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-cyan-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Primary Landing Site (Plan A)
                </label>
                <button
                  onClick={() => setUseCustomCoords(!useCustomCoords)}
                  className="text-[11px] text-slate-400 hover:text-cyan-300 underline"
                >
                  {useCustomCoords ? 'Use Preset Sites' : 'Enter Custom Lat/Lon'}
                </button>
              </div>

              {!useCustomCoords ? (
                <select
                  value={siteAId}
                  onChange={(e) => setSiteAId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-cyan-400 outline-none"
                >
                  {LANDING_SITES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.lat}°, {s.lon}°)
                    </option>
                  ))}
                </select>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="-90"
                    max="90"
                    value={customLat}
                    onChange={(e) => setCustomLat(Number(e.target.value))}
                    placeholder="Lat (-90 to 90)"
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="-180"
                    max="360"
                    value={customLon}
                    onChange={(e) => setCustomLon(Number(e.target.value))}
                    placeholder="Lon (0 to 360)"
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              )}
            </div>

            {/* Date & Launch Delay Variable */}
            <div className="md:col-span-5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Target Date & Launch Delay:{' '}
                  <strong className="text-white">+{delayDays} Days</strong>
                </span>
                <button
                  onClick={handleFindBestDate}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] transition"
                >
                  <Sparkles className="w-3 h-3" /> Auto-Find Best Date
                </button>
              </div>

              <div className="flex items-center gap-3 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2">
                <input
                  type="date"
                  value={landingDate}
                  onChange={(e) => setLandingDate(e.target.value)}
                  className="bg-transparent text-sm text-white outline-none font-mono"
                />
                <input
                  type="range"
                  min={0}
                  max={29}
                  value={delayDays}
                  onChange={(e) => setDelayDays(Number(e.target.value))}
                  className="flex-1 accent-cyan-400 cursor-pointer"
                  title="Simulate launch delay in days"
                />
              </div>
            </div>

            {/* Orbital Relay Toggle */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-emerald-400 block">
                Communication Mode
              </label>
              <button
                onClick={() => setUseRelaySatellite(!useRelaySatellite)}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
                  useRelaySatellite
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <span>
                  {useRelaySatellite ? '🛰️ Orbital Relay: ON' : '📡 Direct-to-Earth Only'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Switch
                </span>
              </button>
            </div>
          </div>

          {/* Selected Site Context Strip */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong className="text-slate-200">{siteA.name}</strong> ({siteA.program}):{' '}
                {siteA.description}
              </span>
            </div>
          </div>
        </section>
        {/* AUTOMATIC COMMUNICATION ARCHITECTURE & BAND ADVISOR */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Satellite className="w-4 h-4" /> Recommended Communication Stack for {siteA.name}
            </div>
            <p className="text-sm text-white font-semibold">
              {simA.dtePercent >= 85
                ? 'Direct-to-Earth (DTE) Primary — S-Band Telemetry + X/Ka-Band High-Gain Dish'
                : simA.dtePercent >= 30
                ? 'Orbital Mothership Relay (LLO) + DTN Store-and-Forward — S-Band Proximity + Ka-Band Trunk'
                : 'Polar Relay Constellation (NRHO / LunaNet) Required — S-Band Rover Link + Ka-Band/Optical Trunk'}
            </p>
            <p className="text-xs text-slate-400">
              {simA.dtePercent >= 85
                ? `Clear Earth sightline (${simA.dtePercent}% DTE) allows direct Deep Space Network contact without relay hardware.`
                : `Surrounding terrain blocks Direct-to-Earth ${100 - simA.dtePercent}% of the mission; an orbiting relay prevents data loss.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-amber-300">
              CMD: S-BAND (2.2 GHz)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-sky-300">
              DATA: {simA.dtePercent >= 85 ? 'X / KA-BAND DTE' : 'KA-BAND RELAY'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-emerald-300">
              PROTOCOL: NASA DTN
            </span>
          </div>
        </section>

        {/* STEP 2: PLAIN-ENGLISH LIVE STATUS CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-400" /> Sunlight Over 14 Days
            </div>
            <div className="text-2xl font-bold text-white mt-1">{simA.sunlightPercent}%</div>
            <p className="text-xs text-slate-400 mt-1">
              {currentPoint.isSunlit
                ? `Sun is visible (${currentPoint.sunEl}°) — charging batteries`
                : `Blocked by ${currentPoint.sunTerrainEl}° ridge — on battery`}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-sky-400" /> Earth Radio Visibility
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {simA.effectiveCommsPercent}%
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {currentPoint.hasDirectEarth
                ? `Direct-to-Earth clear (${currentPoint.earthEl}°)`
                : useRelaySatellite
                ? 'Earth blocked by mountain — using Relay Satellite'
                : 'Earth blocked by mountain — Comms Blackout'}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <BatteryCharging className="w-4 h-4 text-emerald-400" /> Power & Darkness Risk
            </div>
            <div className="text-2xl font-bold text-white mt-1">{simA.avgWatts} W avg</div>
            <p className="text-xs text-slate-400 mt-1">
              Longest continuous darkness: <strong>{simA.maxDarkHours} hrs</strong>
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              {simA.verdict.startsWith('GO') ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              Mission Feasibility Verdict
            </div>
            <div
              className={`text-lg font-bold mt-1.5 ${
                simA.verdict === 'GO - OPTIMAL'
                  ? 'text-emerald-400'
                  : simA.verdict === 'GO WITH ORBITAL RELAY'
                  ? 'text-cyan-400'
                  : 'text-rose-400'
              }`}
            >
              {simA.verdict}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Water ice distance: <strong>{siteA.waterIceDistanceKm} km</strong> • Slope:{' '}
              <strong>{siteA.slopeDeg}°</strong>
            </p>
          </div>
        </section>

        {/* STEP 3: INTERACTIVE VISUALIZATIONS (360° HORIZON + 3D TERRAIN) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: 360° Lander Horizon Panorama */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white">
                  360° Horizon View from the Lander
                </h3>
                <p className="text-xs text-slate-400">
                  Shows whether surrounding mountains block the Sun or Earth
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-300">
                {currentPoint.timestamp}
              </span>
            </div>

            <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
              <svg viewBox="0 0 720 210" className="w-full h-56 block">
                <line x1="0" y1="45" x2="720" y2="45" stroke="#1e293b" strokeDasharray="4 4" />
                <text x="8" y="40" fill="#64748b" fontSize="10">
                  +10° Sky
                </text>
                <line x1="0" y1="105" x2="720" y2="105" stroke="#1e293b" strokeDasharray="4 4" />
                <text x="8" y="100" fill="#64748b" fontSize="10">
                  +5° Sky
                </text>
                <line x1="0" y1="165" x2="720" y2="165" stroke="#334155" strokeWidth="1.5" />
                <text x="8" y="160" fill="#94a3b8" fontSize="10">
                  0° Flat Horizon
                </text>

                {/* Sun & Earth 14-day trails */}
                {simA.points.map((pt, i) => (
                  <circle
                    key={`s-${i}`}
                    cx={(pt.sunAz / 360) * 720}
                    cy={Math.max(15, Math.min(200, 165 - pt.sunEl * 12))}
                    r="1.6"
                    fill={pt.isSunlit ? '#fbbf24' : '#ef4444'}
                    opacity="0.45"
                  />
                ))}
                {simA.points.map((pt, i) => (
                  <circle
                    key={`e-${i}`}
                    cx={(pt.earthAz / 360) * 720}
                    cy={Math.max(15, Math.min(200, 165 - pt.earthEl * 12))}
                    r="1.6"
                    fill="#38bdf8"
                    opacity="0.4"
                  />
                ))}

                {/* Mountain Ridge Silhouette */}
                <polygon
                  points={horizonPolygon}
                  fill="#1e293b"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />

                {/* Current Sun */}
                <g
                  transform={`translate(${(currentPoint.sunAz / 360) * 720}, ${Math.max(
                    18,
                    Math.min(198, 165 - currentPoint.sunEl * 12)
                  )})`}
                >
                  <circle
                    r="7"
                    fill={currentPoint.isSunlit ? '#fbbf24' : '#ef4444'}
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                  <text x="11" y="4" fill="#fef08a" fontSize="11" fontWeight="bold">
                    Sun ({currentPoint.sunEl}°)
                  </text>
                </g>

                {/* Current Earth */}
                <g
                  transform={`translate(${(currentPoint.earthAz / 360) * 720}, ${Math.max(
                    18,
                    Math.min(198, 165 - currentPoint.earthEl * 12)
                  )})`}
                >
                  <circle r="6.5" fill="#38bdf8" stroke="#fff" strokeWidth="1.5" />
                  <text x="11" y="4" fill="#bae6fd" fontSize="11" fontWeight="bold">
                    Earth ({currentPoint.earthEl}°)
                  </text>
                </g>

                <text x="12" y="204" fill="#94a3b8" fontSize="10">
                  North (0°)
                </text>
                <text x="185" y="204" fill="#94a3b8" fontSize="10">
                  East (90°)
                </text>
                <text x="355" y="204" fill="#94a3b8" fontSize="10">
                  South (180°)
                </text>
                <text x="535" y="204" fill="#94a3b8" fontSize="10">
                  West (270°)
                </text>
              </svg>
            </div>

            {/* Mission Hour Scrubber */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">
                  Scrub Through 14-Day Mission (Hour +{currentPoint.hourOffset}h)
                </span>
                <span className="text-slate-400">
                  Gold = Sunlight • Blue = Earth Visible
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={simA.points.length - 1}
                value={hourStepIdx}
                onChange={(e) => setHourStepIdx(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="grid grid-cols-1 gap-1">
                <div className="h-2.5 rounded overflow-hidden flex bg-slate-950">
                  {simA.points.map((pt, i) => (
                    <div
                      key={`sb-${i}`}
                      onClick={() => setHourStepIdx(i)}
                      className={`flex-1 cursor-pointer ${
                        pt.isSunlit ? 'bg-amber-400' : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <div className="h-2.5 rounded overflow-hidden flex bg-slate-950">
                  {simA.points.map((pt, i) => (
                    <div
                      key={`eb-${i}`}
                      onClick={() => setHourStepIdx(i)}
                      className={`flex-1 cursor-pointer ${
                        pt.commsActive ? 'bg-sky-400' : 'bg-rose-900'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: 3D South Pole Terrain View */}
          <Lunar3DView site={siteA} point={currentPoint} commsMode={commsMode} />
        </section>

        {/* STEP 4: SIDE-BY-SIDE SCENARIO COMPARISON TABLE */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">
                Side-by-Side Landing Site Trade-Off Comparison
              </h2>
              <p className="text-xs text-slate-400">
                Compare your Primary Site against an alternative South Pole site on the exact same
                launch date (+{delayDays}d delay)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Compare against:</span>
              <select
                value={siteBId}
                onChange={(e) => setSiteBId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 outline-none"
              >
                {LANDING_SITES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase">
                  <th className="py-3 px-4">Evaluation Metric</th>
                  <th className="py-3 px-4 text-cyan-300">Plan A: {siteA.name}</th>
                  <th className="py-3 px-4 text-purple-300">Plan B: {siteB.name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs sm:text-sm">
                <tr>
                  <td className="py-3 px-4 text-slate-300 font-medium">Solar Illumination (14d)</td>
                  <td className="py-3 px-4 font-bold text-white">{simA.sunlightPercent}%</td>
                  <td className="py-3 px-4 font-bold text-white">{simB.sunlightPercent}%</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-300 font-medium">
                    Earth Comms Uptime ({useRelaySatellite ? 'With Relay' : 'Direct-to-Earth'})
                  </td>
                  <td className="py-3 px-4 font-bold text-white">{simA.effectiveCommsPercent}%</td>
                  <td className="py-3 px-4 font-bold text-white">{simB.effectiveCommsPercent}%</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-300 font-medium">
                    Longest Continuous Darkness
                  </td>
                  <td className="py-3 px-4">{simA.maxDarkHours} hours</td>
                  <td className="py-3 px-4">{simB.maxDarkHours} hours</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-300 font-medium">
                    Distance to Water Ice (PSR) & Slope
                  </td>
                  <td className="py-3 px-4">
                    {siteA.waterIceDistanceKm} km • {siteA.slopeDeg}° slope
                  </td>
                  <td className="py-3 px-4">
                    {siteB.waterIceDistanceKm} km • {siteB.slopeDeg}° slope
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-300 font-medium">Mission Verdict</td>
                  <td className="py-3 px-4 font-bold text-cyan-300">{simA.verdict}</td>
                  <td className="py-3 px-4 font-bold text-purple-300">{simB.verdict}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        
      </main>
    </div>
  );
}