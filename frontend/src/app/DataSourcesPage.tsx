import { PageHeader } from '@/components/common/PageHeader';
import { DataSourceBadge } from '@/components/common/DataSourceBadge';
import { DATA_SOURCES } from '@/constants/dataSources';

export default function DataSourcesPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Data Sources"
        description="Every dataset LUNAR SCOPE will rely on, with its provenance and integration status."
      />
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              {['Dataset', 'Purpose', 'Provider', 'Status'].map((h) => (
                <th key={h} scope="col" className="label px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DATA_SOURCES.map((d) => (
              <tr key={d.id} className="border-b border-line/60 last:border-b-0">
                <th scope="row" className="px-4 py-3 font-medium">
                  {d.name}
                  <p className="mt-0.5 text-xs font-normal text-fg-dim">{d.note}</p>
                </th>
                <td className="px-4 py-3 text-fg-muted">{d.purpose}</td>
                <td className="px-4 py-3 text-fg-muted">{d.provider}</td>
                <td className="px-4 py-3">
                  <DataSourceBadge kind={d.status} label={d.status === 'unavailable' ? 'Not integrated' : undefined} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
