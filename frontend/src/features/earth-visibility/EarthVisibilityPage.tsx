import { useState } from 'react';
import {
  Radio,
  Globe,
  Calculator,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { MissionPanel } from '@/components/common/MissionPanel';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { DataSourceBadge } from '@/components/common/DataSourceBadge';
import { useDSNStations, useDSNTracking, usePhysicsComparison } from '@/hooks/useApi';
import { api } from '@/services/api';

export default function EarthVisibilityPage() {
  const dsnQuery = useDSNStations();
  const trackingQuery = useDSNTracking();
  const physicsQuery = usePhysicsComparison(60.0);

  const stations = dsnQuery.data ?? [];
  const tracking = trackingQuery.data;
  const physics = physicsQuery.data;

  // Interactive orbital velocity calculator
  const [calcBody, setCalcBody] = useState<'earth' | 'moon'>('earth');
  const [calcAltitude, setCalcAltitude] = useState<number>(450);
  const [calcResult, setCalcResult] = useState<{ v_kms: number; period_min: number } | null>({
    v_kms: 7.643,
    period_min: 93.6,
  });
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculateOrbit = async () => {
    setIsCalculating(true);
    try {
      const res = await api.calculateOrbitalVelocity({
        body: calcBody,
        altitude_km: calcAltitude,
      });
      setCalcResult({
        v_kms: res.orbital_velocity_kms,
        period_min: res.orbital_period_minutes,
      });
    } catch {
      // fallback calculation
      const G = 6.6743e-11;
      const M = calcBody === 'earth' ? 5.972e24 : 7.342e22;
      const R = (calcBody === 'earth' ? 6371 : 1737.4) * 1000;
      const r = R + calcAltitude * 1000;
      const v = Math.sqrt((G * M) / r) / 1000;
      const T = (2 * Math.PI * r) / (v * 1000) / 60;
      setCalcResult({ v_kms: Math.round(v * 1000) / 1000, period_min: Math.round(T * 10) / 10 });
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <PageHeader
        title="Earth Visibility & Deep Space Network"
        description="Earth communications geometry, NASA Deep Space Network (DSN) ground complexes, and gravitational mechanics."
      />

      {/* SECTION 1: NASA Deep Space Network (DSN) Ground Stations */}
      <MissionPanel
        title="Deep Space Network (DSN) Ground Stations"
        icon={Radio}
        aside={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-2 py-0.5 font-mono text-[11px] text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              {tracking?.primary_tracking_station
                ? `Active Uplink: ${tracking.primary_tracking_station}`
                : '24/7 Deep Space Coverage'}
            </span>
            <DataSourceBadge kind="computed" label="DSN LIVE" />
          </div>
        }
      >
        {dsnQuery.isPending ? (
          <LoadingState label="Loading Deep Space Network stations..." compact />
        ) : dsnQuery.isError ? (
          <ErrorState compact title="Could not load DSN stations" message={dsnQuery.error.message} />
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-fg-dim">
              The NASA Deep Space Network consists of three primary tracking complexes situated approximately 120°
              apart around the globe. As Earth rotates, spacecraft remain in continuous view of at least one station.
            </p>

            {/* DSN Station Table matching user image */}
            <div className="overflow-x-auto rounded border border-line bg-surface-elevated/40">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-line bg-surface-elevated/80 text-fg-muted uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Station</th>
                    <th className="px-4 py-2.5 font-semibold">Location</th>
                    <th className="px-4 py-2.5 font-semibold">Coordinates</th>
                    <th className="px-4 py-2.5 font-semibold">Primary Dish</th>
                    <th className="px-4 py-2.5 font-semibold">Tracking Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {stations.map((s: any) => {
                    const isGoldstone = s.id === 'dsn-01';
                    return (
                      <tr key={s.id} className="hover:bg-surface-elevated/80 transition">
                        <td className="px-4 py-3 font-bold text-fg flex items-center gap-2">
                          <Radio className="size-3.5 text-cyan" />
                          <span>{s.name}</span>
                          {isGoldstone && (
                            <span className="rounded bg-cyan/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan">
                              3D MODELED (70M DISH)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-fg">{s.location}</td>
                        <td className="px-4 py-3 text-fg-dim">
                          {s.latitude_deg.toFixed(2)}° N, {Math.abs(s.longitude_deg).toFixed(2)}° W
                        </td>
                        <td className="px-4 py-3 text-cyan">
                          {s.dish_diameter_m}m Parabolic Antenna
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                            <span className="size-1.5 rounded-full bg-emerald-400" />
                            OPERATIONAL (UPLINK / DOWNLINK)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </MissionPanel>

      {/* SECTION 2: Earth vs Moon Gravitational Mechanics & Comparison */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MissionPanel
          title="Earth vs Moon Gravitational Comparison"
          icon={Globe}
          aside={<DataSourceBadge kind="computed" label="STANDARDS" />}
        >
          {physicsQuery.isPending ? (
            <LoadingState label="Computing gravitational comparison..." compact />
          ) : (
            <div className="space-y-4">
              {/* Big Callout Cards matching Image 2 */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="rounded-lg border border-blue-400/40 bg-blue-400/10 p-4">
                  <div className="font-mono text-xs font-semibold uppercase tracking-wider text-blue-400">
                    Earth
                  </div>
                  <div className="mt-1 font-mono text-3xl font-bold text-fg">9.81</div>
                  <div className="mt-0.5 font-mono text-[11px] text-fg-muted">
                    m/s² gravitational acceleration
                  </div>
                </div>

                <div className="rounded-lg border border-cyan/40 bg-cyan/10 p-4">
                  <div className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan">
                    Moon
                  </div>
                  <div className="mt-1 font-mono text-3xl font-bold text-fg">1.62</div>
                  <div className="mt-0.5 font-mono text-[11px] text-fg-muted">
                    m/s² gravitational acceleration
                  </div>
                </div>
              </div>

              {/* Exact Comparative Metrics Table matching Image 2 */}
              <div className="overflow-x-auto rounded border border-line bg-surface-elevated/40">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-line bg-surface-elevated/80 text-fg-muted text-[11px]">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Comparison</th>
                      <th className="px-4 py-2 font-semibold text-right">Earth</th>
                      <th className="px-4 py-2 font-semibold text-right">Moon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {physics?.comparison_table?.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-surface-elevated/70">
                        <td className="px-4 py-2.5 font-medium text-fg">{row.parameter}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-blue-400">{row.earth}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-cyan">{row.moon}</td>
                      </tr>
                    )) ?? (
                      <>
                        <tr>
                          <td className="px-4 py-2">Gravity</td>
                          <td className="px-4 py-2 text-right">9.81 m/s²</td>
                          <td className="px-4 py-2 text-right">1.62 m/s²</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Relative gravity</td>
                          <td className="px-4 py-2 text-right">100%</td>
                          <td className="px-4 py-2 text-right">16.5%</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Mass of a 60 kg object</td>
                          <td className="px-4 py-2 text-right">60 kg</td>
                          <td className="px-4 py-2 text-right">60 kg</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Weight of that object</td>
                          <td className="px-4 py-2 text-right">588.6 N</td>
                          <td className="px-4 py-2 text-right">97.2 N</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Escape velocity</td>
                          <td className="px-4 py-2 text-right">11.2 km/s</td>
                          <td className="px-4 py-2 text-right">2.38 km/s</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </MissionPanel>

        {/* SECTION 3: Important Calculations matching Image 3 */}
        <MissionPanel title="Important Calculations & Formulas" icon={Calculator}>
          <div className="space-y-4">
            {/* Gravity Formula Card matching Image 3 */}
            <div className="rounded-lg border border-line bg-surface-elevated/40 p-4">
              <div className="text-xs font-semibold text-fg">For gravity:</div>
              <div className="my-3 flex items-center justify-center font-serif text-2xl tracking-wide text-cyan">
                <span>g = </span>
                <span className="mx-2 inline-flex flex-col items-center text-center">
                  <span className="border-b border-cyan px-2">GM</span>
                  <span>r²</span>
                </span>
              </div>
              <p className="text-[11px] text-fg-dim">
                Where G = 6.6743 × 10⁻¹¹ m³/(kg·s²), M is the celestial body mass, and r is the radius from center of mass.
              </p>
            </div>

            {/* Satellite Orbital Velocity Formula Card matching Image 3 */}
            <div className="rounded-lg border border-line bg-surface-elevated/40 p-4">
              <div className="text-xs font-semibold text-fg">
                For satellite orbital velocity in a simplified circular orbit:
              </div>
              <div className="my-3 flex items-center justify-center font-serif text-2xl tracking-wide text-amber-400">
                <span>v = </span>
                <span className="ml-1 inline-flex items-center">
                  <span className="text-3xl font-light">√</span>
                  <span className="border-t border-amber-400 pt-0.5 inline-flex flex-col items-center">
                    <span className="border-b border-amber-400/80 px-2">GM</span>
                    <span>r</span>
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-fg-dim">
                Where r = R_body + altitude. Determines the speed required to maintain a stable circular orbit without propulsion.
              </p>
            </div>

            {/* Interactive Orbital Velocity Calculator */}
            <div className="rounded-lg border border-line bg-surface-elevated/60 p-3 space-y-2.5">
              <div className="text-xs font-bold text-fg flex items-center gap-1.5">
                <Zap className="size-3.5 text-cyan" />
                <span>Live Orbital Speed Calculator</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="label mb-1 block">Celestial Body</label>
                  <select
                    className="field h-8 text-xs font-mono"
                    value={calcBody}
                    onChange={(e) => setCalcBody(e.target.value as any)}
                  >
                    <option value="earth">Earth (M = 5.972 × 10²⁴ kg)</option>
                    <option value="moon">Moon (M = 7.342 × 10²² kg)</option>
                  </select>
                </div>

                <div>
                  <label className="label mb-1 block">Orbital Altitude (km)</label>
                  <input
                    type="number"
                    min="10"
                    max="100000"
                    className="field h-8 text-xs font-mono"
                    value={calcAltitude}
                    onChange={(e) => setCalcAltitude(Number(e.target.value))}
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary w-full justify-center text-xs"
                onClick={handleCalculateOrbit}
                disabled={isCalculating}
              >
                {isCalculating ? 'Computing...' : 'Calculate v = √(GM / r)'}
              </button>

              {calcResult && (
                <div className="mt-2 rounded bg-bg/80 border border-cyan/40 p-2 flex items-center justify-between text-xs font-mono">
                  <span className="text-fg-dim">Orbital Velocity (v):</span>
                  <span className="text-cyan font-bold text-sm">{calcResult.v_kms} km/s</span>
                  <span className="text-fg-dim">Period:</span>
                  <span className="text-amber-400 font-bold">{calcResult.period_min} min</span>
                </div>
              )}
            </div>
          </div>
        </MissionPanel>
      </div>
    </div>
  );
}
