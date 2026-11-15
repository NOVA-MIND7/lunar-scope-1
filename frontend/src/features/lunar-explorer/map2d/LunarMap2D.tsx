import { useMemo } from 'react';
import { Crosshair, Globe, Sun } from 'lucide-react';
import { MissionPanel } from '@/components/common/MissionPanel';
import { formatLatitude, formatLongitude } from '@/utils/format';
import { useSites } from '@/hooks/useApi';
import { useAppStore } from '@/stores/appStore';
import { useGlobeStore } from '../globe/globeStore';

const MAP_WIDTH = 720;
const MAP_HEIGHT = 360;
const MOON_TEXTURE = `${import.meta.env.BASE_URL}textures/moon_trek_wac.jpg`.replace(/\/+/g, '/');

/** Equirectangular 2D map of the Moon with site picking and illustrative day/night. */
export function LunarMap2D() {
  const sitesQuery = useSites();
  const sites = sitesQuery.data?.sites ?? [];
  const selectedSite = useAppStore((s) => s.selectedLandingSite);
  const selectLandingSite = useAppStore((s) => s.selectLandingSite);
  const pending = useGlobeStore((s) => s.pending);
  const setPending = useGlobeStore((s) => s.setPending);
  const confirmPending = useGlobeStore((s) => s.confirmPending);
  const visualizationMode = useGlobeStore((s) => s.visualizationMode);
  const setVisualizationMode = useGlobeStore((s) => s.setVisualizationMode);

  const subSolar = useMemo(() => {
    const t = Date.now() / 60000;
    return { lat: 5 * Math.sin(t * 0.5), lon: ((t * 15) % 360) - 180 };
  }, []);

  const toX = (lon: number) => ((lon + 180) / 360) * MAP_WIDTH;
  const toY = (lat: number) => ((90 - lat) / 180) * MAP_HEIGHT;

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = MAP_WIDTH / rect.width;
    const sy = MAP_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sy;
    setPending(90 - (y / MAP_HEIGHT) * 180, (x / MAP_WIDTH) * 360 - 180);
  };

  if (sitesQuery.isPending) {
    return (
      <MissionPanel title="2D Lunar Map" icon={Globe}>
        <div className="flex h-full items-center justify-center text-fg-muted">Loading surface data</div>
      </MissionPanel>
    );
  }

  return (
    <MissionPanel title="2D Lunar Map" icon={Globe} className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-line bg-bg/50 text-xs text-fg-muted">
        <span>Equirectangular projection · {sites.length} sites · illustrative terminator</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => setVisualizationMode('globe')} className={`btn btn-sm ${visualizationMode === 'globe' ? 'btn-primary' : 'btn-outline'}`} title="3D Globe"><Globe className="size-3.5" /></button>
          <button type="button" onClick={() => setVisualizationMode('solarsystem')} className={`btn btn-sm ${visualizationMode === 'solarsystem' ? 'btn-primary' : 'btn-outline'}`} title="SunEarthMoon system"><Sun className="size-3.5" /></button>
        </div>
      </div>
      <div className="flex-1 relative overflow-hidden bg-[#0b0f1a] border border-line rounded-lg">
        <svg width="100%" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="xMidYMid meet" onClick={handleSvgClick} className="block cursor-crosshair w-full h-auto" role="application" aria-label="2D equirectangular map of the Moon. Click anywhere to pick a location.">
          <defs>
            <radialGradient id="earthGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>
          <image href={MOON_TEXTURE} x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} preserveAspectRatio="none" opacity="0.85" />
          <g stroke="#94a3b8" strokeOpacity="0.18" strokeWidth="0.5" fill="none">
            {[0, 15, 30, 45, 60, 75].map((lat) => (<path key={`lat${lat}`} d={`M${toX(-180)},${toY(lat)} L${toX(180)},${toY(lat)} M${toX(-180)},${toY(-lat)} L${toX(180)},${toY(-lat)}`} />))}
            {[-135, -90, -45, 0, 45, 90, 135].map((lon) => (<path key={`lon${lon}`} d={`M${toX(lon)},${toY(90)} L${toX(lon)},${toY(-90)}`} />))}
            <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} stroke="#334155" strokeOpacity="0.4" />
          </g>
          <path d={`M${toX(subSolar.lon)},${toY(subSolar.lat)} A${MAP_WIDTH / 2},${MAP_HEIGHT / 2} 0 0,1 ${toX(subSolar.lon + 180)},${toY(-subSolar.lat)} L${toX(subSolar.lon + 180)},${MAP_HEIGHT} L${toX(subSolar.lon)},${MAP_HEIGHT} Z`} fill="#000" fillOpacity="0.5" />
          <circle cx={toX(subSolar.lon)} cy={toY(subSolar.lat)} r="4" fill="#fbbf24" opacity="0.9"><animate attributeName="r" values="3;5;3" dur="3s" repeatCount="indefinite" /></circle>
          <path d={`M${toX(subSolar.lon)},${toY(subSolar.lat)} A${MAP_WIDTH / 2},${MAP_HEIGHT / 2} 0 0,1 ${toX(subSolar.lon + 180)},${toY(-subSolar.lat)} M${toX(subSolar.lon)},${MAP_HEIGHT - toY(subSolar.lat)} A${MAP_WIDTH / 2},${MAP_HEIGHT / 2} 0 0,0 ${toX(subSolar.lon + 180)},${MAP_HEIGHT - toY(-subSolar.lat)}`} fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.6" />
          <circle cx={toX(0)} cy={toY(0)} r="180" fill="url(#earthGlow)" stroke="#3b82f6" strokeWidth="1" opacity="0.35" />
          <text x={toX(0)} y={toY(-80)} fill="#93c5fd" fontSize="10" textAnchor="middle" fontFamily="monospace" opacity="0.6">Earth-visible zone (illustrative)</text>
          {sites.map((site) => {
            const isSelected = selectedSite?.id === site.id;
            const x = toX(site.coordinates.longitude_deg);
            const y = toY(site.coordinates.latitude_deg);
            return (
              <g key={site.id} transform={`translate(${x},${y})`} cursor="pointer" onClick={(e) => { e.stopPropagation(); selectLandingSite(site); setPending(site.coordinates.latitude_deg, site.coordinates.longitude_deg); }}>
                <circle r={isSelected ? 7 : 5} fill={site.category === 'custom' ? '#B388FF' : '#22d3ee'} stroke={isSelected ? '#ffffff' : 'rgba(0,0,0,0.4)'} strokeWidth={isSelected ? 2 : 1} opacity={0.95}>
                  {isSelected ? <animate attributeName="r" values="6;9;6" dur="2s" repeatCount="indefinite" /> : null}
                </circle>
                <title>{`${site.name} (${formatLatitude(site.coordinates.latitude_deg)}, ${formatLongitude(site.coordinates.longitude_deg)})`}</title>
              </g>
            );
          })}
          {pending && (
            <g transform={`translate(${toX(pending.longitude_deg)},${toY(pending.latitude_deg)})`}>
              <circle r="9" fill="none" stroke="#F4F7FC" strokeWidth="2" opacity="0.9" />
              <path d="M-12,0 L12,0 M0,-12 L0,12" stroke="#F4F7FC" strokeWidth="2" opacity="0.9" />
              <title>{`Picked: ${formatLatitude(pending.latitude_deg)}, ${formatLongitude(pending.longitude_deg)}`}</title>
            </g>
          )}
          {selectedSite && selectedSite.category === 'custom' && (
            <g transform={`translate(${toX(selectedSite.coordinates.longitude_deg)},${toY(selectedSite.coordinates.latitude_deg)})`}>
              <path d="M0,-14 L6,6 L-6,6 Z" fill="#F4F7FC" stroke="#0b0f1a" strokeWidth="1.5" />
            </g>
          )}
        </svg>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-bg/90 backdrop-blur px-3 py-2 text-sm text-fg shadow-lg">
          <span className="font-mono text-fg-muted">{pending ? `Picked: ${formatLatitude(pending.latitude_deg)}, ${formatLongitude(pending.longitude_deg)}` : 'Click map to pick location'}</span>
          <button type="button" onClick={() => confirmPending()} disabled={!pending} className={`btn btn-sm ${pending ? 'btn-primary' : 'btn-disabled'}`} title={pending ? 'Confirm this location as landing site' : 'Pick a location first'}>
            <Crosshair className="size-3.5" aria-hidden /> {pending ? 'Confirm site' : 'Pick site'}
          </button>
          <button type="button" onClick={() => setVisualizationMode('globe')} className="btn btn-sm btn-outline" title="Open 3D Globe"><Globe className="size-3.5" aria-hidden /> 3D Globe</button>
          <button type="button" onClick={() => setVisualizationMode('solarsystem')} className="btn btn-sm btn-outline" title="SunEarthMoon spatial view"><Sun className="size-3.5" aria-hidden /> System view</button>
        </div>
        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1 p-2 rounded-lg border border-line bg-bg/90 backdrop-blur text-xs text-fg-muted shadow-lg">
          <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#22d3ee]" aria-hidden /><span>Landing site</span></div>
          <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#B388FF]" aria-hidden /><span>Custom location</span></div>
          <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#F4F7FC] border border-white" aria-hidden /><span>Pending pick</span></div>
          <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#fbbf24]" aria-hidden /><span>Sub-solar point</span></div>
          <div className="flex items-center gap-1.5"><span className="size-2 border border-white/40" aria-hidden /><span>Terminator</span></div>
        </div>
      </div>
    </MissionPanel>
  );
}
