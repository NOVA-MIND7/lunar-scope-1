import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAppStore } from '@/stores/appStore';
import type { UIMode } from '@/types';

const UI_MODES: { id: UIMode; label: string; help: string }[] = [
  { id: 'basic', label: 'Basic mode', help: 'Simplified views with core mission controls and essential information only.' },
  { id: 'scientific', label: 'Scientific mode', help: 'Full analysis views, advanced telemetry, and all visualization features.' },
];

export default function SettingsPage() {
  const uiMode = useAppStore((s) => s.uiMode);
  const setUIMode = useAppStore((s) => s.setUIMode);
  const missionName = useAppStore((s) => s.missionName);
  const setMissionName = useAppStore((s) => s.setMissionName);

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Settings" description="Mission name, interface mode and time standard." />

      <section className="card" aria-labelledby="mission-name-title">
        <h2 id="mission-name-title" className="label">Mission name</h2>
        <label htmlFor="mission-name" className="sr-only">Mission name</label>
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

      <section className="card" aria-labelledby="ui-mode-title">
        <h2 id="ui-mode-title" className="label">Interface mode</h2>
        <div className="mt-3 space-y-2" role="radiogroup" aria-labelledby="ui-mode-title">
          {UI_MODES.map((m) => (
            <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${uiMode === m.id ? 'border-cyan/60 bg-cyan/5' : 'border-line'}`}>
              <input type="radio" name="ui-mode" className="mt-1 accent-cyan" checked={uiMode === m.id} onChange={() => setUIMode(m.id)} />
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
          <span className="ml-3 text-fg-muted">All scientific calculations use UTC timestamps. This setting is fixed.</span>
        </p>
      </section>
    </div>
  );
}
