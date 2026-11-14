import { useEffect, useState, type FormEvent } from 'react';
import { Crosshair } from 'lucide-react';
import { MissionPanel } from '@/components/common/MissionPanel';
import { useGlobeStore } from '../globeStore';

function parse(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Manual coordinate entry. Goes through the same pipeline as a click on the globe. */
export function CoordinateEntryPanel() {
  const pending = useGlobeStore((s) => s.pending);
  const setPending = useGlobeStore((s) => s.setPending);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Mirror the picked point so typed and clicked locations are visibly identical.
  useEffect(() => {
    if (pending) {
      setLat(String(pending.latitude_deg));
      setLon(String(pending.longitude_deg));
      setError(null);
    }
  }, [pending]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const la = parse(lat);
    const lo = parse(lon);
    if (la === null || lo === null) return setError('Enter both latitude and longitude as numbers.');
    if (la < -90 || la > 90) return setError('Latitude must be between -90° and +90°.');
    if (lo < -180 || lo > 180) return setError('Longitude must be between -180° and +180° (east positive).');
    setError(null);
    setPending(la, lo, { focus: true });
  };

  const FAMOUS_PRESETS = [
    { label: 'Apollo 11 (Historic)', lat: 0.6741, lon: 23.473 },
    { label: 'Shackleton Crater (South Pole)', lat: -89.9, lon: 0.0 },
    { label: 'Copernicus Crater', lat: 9.62, lon: -20.08 },
    { label: 'Tycho Crater (Rays)', lat: -43.31, lon: -11.36 },
    { label: 'Ocean of Storms (Apollo 12)', lat: -3.01, lon: -23.42 },
  ];

  const handleSelectPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    const preset = FAMOUS_PRESETS.find((p) => p.label === val);
    if (preset) {
      setLat(String(preset.lat));
      setLon(String(preset.lon));
      setError(null);
      setPending(preset.lat, preset.lon, { focus: true });
    }
  };

  return (
    <MissionPanel title="Enter coordinates" icon={Crosshair}>
      <div className="space-y-2.5">
        <div>
          <label htmlFor="landmark-preset" className="label mb-1 block">
            Famous Lunar Sites
          </label>
          <select
            id="landmark-preset"
            className="field text-xs"
            defaultValue=""
            onChange={handleSelectPreset}
          >
            <option value="">Quick Jump to a Landmark…</option>
            {FAMOUS_PRESETS.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={submit} className="space-y-2.5" noValidate aria-label="Coordinate entry">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="entry-lat" className="label mb-1 block">
                Latitude (°)
              </label>
              <input id="entry-lat" className="field font-mono" inputMode="decimal" placeholder="-90 … +90" value={lat} onChange={(e) => setLat(e.target.value)} aria-invalid={error ? true : undefined} />
            </div>
            <div>
              <label htmlFor="entry-lon" className="label mb-1 block">
                Longitude (°E)
              </label>
              <input id="entry-lon" className="field font-mono" inputMode="decimal" placeholder="-180 … +180" value={lon} onChange={(e) => setLon(e.target.value)} aria-invalid={error ? true : undefined} />
            </div>
          </div>
          {error ? (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn w-full">
            Locate on Moon
          </button>
        </form>
      </div>
    </MissionPanel>
  );
}
