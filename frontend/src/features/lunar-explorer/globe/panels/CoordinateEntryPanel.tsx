import { useEffect, useState, type FormEvent } from 'react';
import { Crosshair, MapPin, Sparkles } from 'lucide-react';
import { MissionPanel } from '@/components/common/MissionPanel';
import { useGlobeStore } from '../globeStore';

function parse(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Verified NASA & IAU Raw Coordinate Data for Famous Lunar Landmarks */
const FAMOUS_PRESETS = [
  { label: 'Apollo 11 (Tranquility Base)', short: 'Apollo 11', lat: 0.6741, lon: 23.473, cat: 'Historic' },
  { label: 'Shackleton Crater (South Pole)', short: 'Shackleton', lat: -89.9, lon: 0.0, cat: 'Polar' },
  { label: 'Copernicus Crater', short: 'Copernicus', lat: 9.62, lon: -20.08, cat: 'Crater' },
  { label: 'Tycho Crater (Rays)', short: 'Tycho', lat: -43.31, lon: -11.36, cat: 'Crater' },
  { label: 'Ocean of Storms (Apollo 12)', short: 'Apollo 12', lat: -3.012, lon: -23.422, cat: 'Historic' },
  { label: 'Chandrayaan-3 (Shiv Shakti)', short: 'Chandrayaan-3', lat: -69.373, lon: 32.319, cat: 'Robotic' },
  { label: 'Apollo 17 (Taurus-Littrow)', short: 'Apollo 17', lat: 20.191, lon: 30.772, cat: 'Historic' },
  { label: 'Malapert Massif (Artemis)', short: 'Malapert', lat: -85.9, lon: 0.1, cat: 'Polar' },
];

/** Manual coordinate entry and famous site quick-jump. */
export function CoordinateEntryPanel() {
  const pending = useGlobeStore((s) => s.pending);
  const setPending = useGlobeStore((s) => s.setPending);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Mirror the picked point so typed and clicked locations are visibly identical.
  useEffect(() => {
    if (pending) {
      setLat(String(pending.latitude_deg));
      setLon(String(pending.longitude_deg));
      setError(null);
    }
  }, [pending]);

  const selectPreset = (p: typeof FAMOUS_PRESETS[0]) => {
    setLat(String(p.lat));
    setLon(String(p.lon));
    setError(null);
    setActivePreset(p.label);

    // Target the Moon and trigger smooth automatic rotation to that point
    useGlobeStore.getState().setFocusTarget('moon');
    setPending(p.lat, p.lon, { focus: true });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const la = parse(lat);
    const lo = parse(lon);
    if (la === null || lo === null) return setError('Enter both latitude and longitude as numbers.');
    if (la < -90 || la > 90) return setError('Latitude must be between -90° and +90°.');
    if (lo < -180 || lo > 180) return setError('Longitude must be between -180° and +180° (east positive).');
    setError(null);
    setActivePreset(null);

    // Target the Moon and trigger smooth automatic rotation to that point
    useGlobeStore.getState().setFocusTarget('moon');
    setPending(la, lo, { focus: true });
  };

  return (
    <MissionPanel title="Enter coordinates" icon={Crosshair}>
      <div className="space-y-3">
        {/* Famous Lunar Sites Quick Jump */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="landmark-preset" className="label text-sm font-semibold text-fg flex items-center gap-1">
              <Sparkles className="size-3 text-cyan" />
              Famous Lunar Sites
            </label>
            <span className="text-xs text-fg-dim font-mono">NASA Verified</span>
          </div>

          {/* Quick-Jump Clickable Chips */}
          <div className="flex flex-wrap gap-1 mb-2">
            {FAMOUS_PRESETS.map((p) => {
              const isSelected = activePreset === p.label;
              return (
                <button
                  key={p.label}
                  type="button"
                  className={`cursor-pointer rounded px-2 py-0.5 font-mono text-xs font-medium transition flex items-center gap-1 ${
                    isSelected
                      ? 'border border-cyan bg-cyan/25 text-cyan font-bold shadow-sm'
                      : 'border border-line/60 bg-surface-elevated/60 text-fg-muted hover:border-cyan/40 hover:text-cyan'
                  }`}
                  onClick={() => selectPreset(p)}
                  title={`${p.label} (${p.lat}°, ${p.lon}°)`}
                >
                  <MapPin className="size-2.5 text-cyan shrink-0" />
                  <span>{p.short}</span>
                </button>
              );
            })}
          </div>

          {/* Fallback Dropdown */}
          <select
            id="landmark-preset"
            className="field text-xs font-mono"
            value={activePreset ?? ''}
            onChange={(e) => {
              const p = FAMOUS_PRESETS.find((x) => x.label === e.target.value);
              if (p) selectPreset(p);
            }}
          >
            <option value="">Select from landmark catalog…</option>
            {FAMOUS_PRESETS.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label} ({p.lat}°, {p.lon}°)
              </option>
            ))}
          </select>
        </div>

        {/* Manual Latitude & Longitude Entry */}
        <form onSubmit={submit} className="space-y-2.5 pt-2 border-t border-line/60" noValidate aria-label="Coordinate entry">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="entry-lat" className="label mb-1 block text-sm">
                Latitude (°)
              </label>
              <input
                id="entry-lat"
                className="field font-mono text-xs"
                inputMode="decimal"
                placeholder="-90 … +90"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                aria-invalid={error ? true : undefined}
              />
            </div>
            <div>
              <label htmlFor="entry-lon" className="label mb-1 block text-sm">
                Longitude (°E)
              </label>
              <input
                id="entry-lon"
                className="field font-mono text-xs"
                inputMode="decimal"
                placeholder="-180 … +180"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                aria-invalid={error ? true : undefined}
              />
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn btn-primary w-full justify-center text-xs" aria-label="Locate on Moon">
            <Crosshair className="size-3.5" />
            Locate on Moon & Rotate
          </button>
        </form>
      </div>
    </MissionPanel>
  );
}
