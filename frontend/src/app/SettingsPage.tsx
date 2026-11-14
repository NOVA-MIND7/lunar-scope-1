import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAppStore } from '@/stores/appStore';
import type { DataMode } from '@/types';

const MODES: { id: DataMode; label: string; help: string }[] = [
  { id: 'sample', label: 'Sample data', help: 'Clearly labelled sample metadata. No scientific results are computed.' },
  { id: 'live', label: 'Live data', help: 'Reserved for later phases (SPICE kernels, DEM data, Supabase).' },
];

export default function SettingsPage() {
  const dataMode = useAppStore((s) => s.dataMode);
  const setDataMode = useAppStore((s) => s.setDataMode);
  const missionName = useAppStore((s) => s.missionName);
  const setMissionName = useAppStore((s) => s.setMissionName);

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Settings" description="Mission name, data mode and time standard." />

      <section className="card" aria-labelledby="mission-name-title">
        <h2 id="mission-name-title" className="label">
          Mission name
        </h2>
        <label htmlFor="mission-name" className="sr-only">
          Mission name
        </label>
        <input
          id="mission-name"
          className="field mt-3"
          value={missionName}
          maxLength={60}
          onChange={(e) => setMissionName(e.target.value)}
          onBlur={() => !missionName.trim() && setMissionName('Untitled mission')}
        />
        <p className="mt-2 text-xs text-fg-muted">Shown in the header on every page.</p>
      </section>

      <section className="card" aria-labelledby="data-mode-title">
        <h2 id="data-mode-title" className="label">
          Data mode
        </h2>
        <div className="mt-3 space-y-2" role="radiogroup" aria-labelledby="data-mode-title">
          {MODES.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${
                dataMode === m.id ? 'border-cyan/60 bg-cyan/5' : 'border-line'
              }`}
            >
              <input
                type="radio"
                name="data-mode"
                className="mt-1 accent-cyan"
                checked={dataMode === m.id}
                onChange={() => setDataMode(m.id)}
              />
              <span>
                <span className="block text-sm font-medium">{m.label}</span>
                <span className="block text-xs text-fg-muted">{m.help}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="label">Time standard</h2>
        <p className="mt-3 text-sm">
          <StatusBadge tone="info">UTC</StatusBadge>
          <span className="ml-3 text-fg-muted">
            All scientific calculations use UTC timestamps. This setting is fixed.
          </span>
        </p>
      </section>
    </div>
  );
}
