import { useState } from 'react';
import {
  Satellite,
  Radio,
  Eye,
  Crosshair,
  Compass,
  CheckCircle2,
  Thermometer,
  Droplets,
  Sun,
  X,
  Gauge,
  Activity,
  Layers,
} from 'lucide-react';
import { MissionPanel } from '@/components/common/MissionPanel';
import { useAppStore } from '@/stores/appStore';
import { formatLatitude, formatLongitude } from '@/utils/format';
import { createCustomSite } from '@/utils/lunarCoordinates';
import { useGlobeStore } from '../globeStore';
import { SOUTH_POLE_FEATURES, type SouthPoleFeatureData } from '../southPoleData';

export function CassiniSouthPolePanel() {
  const telemetry = useGlobeStore((s) => s.satelliteTelemetry);
  const showSatellite = useGlobeStore((s) => s.showSatellite);
  const toggleSatellite = useGlobeStore((s) => s.toggleSatellite);
  const showOrbitPath = useGlobeStore((s) => s.showOrbitPath);
  const toggleOrbitPath = useGlobeStore((s) => s.toggleOrbitPath);
  const showScanBeam = useGlobeStore((s) => s.showScanBeam);
  const toggleScanBeam = useGlobeStore((s) => s.toggleScanBeam);
  const satelliteSpeed = useGlobeStore((s) => s.satelliteSpeed);
  const setSatelliteSpeed = useGlobeStore((s) => s.setSatelliteSpeed);
  const trackSatellite = useGlobeStore((s) => s.trackSatellite);
  const setTrackSatellite = useGlobeStore((s) => s.setTrackSatellite);
  const selectedFeature = useGlobeStore((s) => s.selectedSouthPoleFeature);
  const selectSouthPoleFeature = useGlobeStore((s) => s.selectSouthPoleFeature);
  const toggleSatellitePanel = useGlobeStore((s) => s.toggleSatellitePanel);
  const focusSouthPoleAndSatellite = useGlobeStore((s) => s.focusSouthPoleAndSatellite);
  const issueCommand = useGlobeStore((s) => s.issueCommand);
  const selectedSatelliteId = useGlobeStore((s) => s.selectedSatelliteId);
  const setSelectedSatelliteId = useGlobeStore((s) => s.setSelectedSatelliteId);
  const eclipseFactor = useGlobeStore((s) => s.eclipseFactor);

  const selectLandingSite = useAppStore((s) => s.selectLandingSite);
  const activeMissionSite = useAppStore((s) => s.selectedLandingSite);

  const [activeTab, setActiveTab] = useState<'telemetry' | 'features' | 'instruments'>('telemetry');
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const currentFeature: SouthPoleFeatureData = selectedFeature ?? SOUTH_POLE_FEATURES[0]!;

  const handleFocusFeature = (feature: SouthPoleFeatureData) => {
    selectSouthPoleFeature(feature);
    issueCommand({
      kind: 'focus',
      latitude_deg: feature.coordinates.latitude_deg,
      longitude_deg: feature.coordinates.longitude_deg,
      distance: 1.8,
    });
  };

  const handleSetMissionTarget = (feature: SouthPoleFeatureData) => {
    const site = createCustomSite(
      feature.coordinates.latitude_deg,
      feature.coordinates.longitude_deg,
    );
    site.name = feature.name;
    site.description = `${feature.classification}. ${feature.scientificSignificance}`;
    selectLandingSite(site);
    setScanMessage(`Target set to ${feature.name} for mission analysis`);
    setTimeout(() => setScanMessage(null), 3500);
  };

  const handleToggleTrackCassini = () => {
    const next = !trackSatellite;
    setTrackSatellite(next);
    if (next) {
      issueCommand({
        kind: 'focus',
        latitude_deg: telemetry.latitude_deg,
        longitude_deg: telemetry.longitude_deg,
        distance: 1.8,
      });
    }
  };

  const handleAcquireScan = () => {
    setScanMessage('Transmitting South Pole LiDAR & Diviner thermal telemetry...');
    setTimeout(() => {
      setScanMessage('South Pole reconnaissance dataset successfully refreshed.');
      setTimeout(() => setScanMessage(null), 3000);
    }, 1200);
  };

  return (
    <MissionPanel
      title="Cassini · South Pole Reconnaissance"
      icon={Satellite}
      aside={
        <button
          type="button"
          onClick={() => toggleSatellitePanel(false)}
          className="rounded p-0.5 text-fg-dim hover:bg-surface-raised hover:text-fg"
          aria-label="Close satellite panel"
        >
          <X className="size-4" />
        </button>
      }
    >
      <div className="space-y-3 text-xs">
        {/* 3 Lunar Orbiters Selector (3 Orbiting Sides) */}
        <div className="flex gap-1 rounded border border-line bg-surface p-1 text-[10px]">
          <button
            type="button"
            onClick={() => setSelectedSatelliteId('cassini')}
            className={`flex-1 rounded py-1 font-semibold transition ${
              selectedSatelliteId === 'cassini' ? 'bg-cyan text-bg shadow-sm' : 'text-fg-dim hover:text-fg'
            }`}
          >
            🛰️ Cassini
          </button>
          <button
            type="button"
            onClick={() => setSelectedSatelliteId('lro')}
            className={`flex-1 rounded py-1 font-semibold transition ${
              selectedSatelliteId === 'lro' ? 'bg-emerald-500 text-bg shadow-sm' : 'text-fg-dim hover:text-fg'
            }`}
          >
            🛰️ LRO
          </button>
          <button
            type="button"
            onClick={() => setSelectedSatelliteId('gateway')}
            className={`flex-1 rounded py-1 font-semibold transition ${
              selectedSatelliteId === 'gateway' ? 'bg-amber-500 text-bg shadow-sm' : 'text-fg-dim hover:text-fg'
            }`}
          >
            🛰️ Gateway
          </button>
        </div>

        {/* Lunar Eclipse Alert Banner */}
        {eclipseFactor > 0.1 ? (
          <div className="rounded border border-red-500/60 bg-red-950/60 p-2 text-red-200 animate-pulse text-[10px] font-mono flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-red-500 shrink-0" />
            <span>LUNAR ECLIPSE: Moon inside Earth's shadow cone ({Math.round(eclipseFactor * 100)}% umbra)</span>
          </div>
        ) : null}

        {/* Live Orbiter Status Banner */}
        <div className="rounded-md border border-cyan/40 bg-cyan/10 p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-cyan">
              <Radio className="size-3.5 animate-pulse" />
              <span>ORBITAL TELEMETRY</span>
            </div>
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                telemetry.isOverSouthPole
                  ? 'border border-cyan/60 bg-cyan/20 text-cyan animate-pulse'
                  : 'border border-line bg-surface text-fg-dim'
              }`}
            >
              {telemetry.isOverSouthPole ? 'SCANNING SOUTH POLE' : 'POLAR ORBIT'}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[11px]">
            <div>
              <span className="text-fg-dim">Lat: </span>
              <span className="font-semibold text-fg">{formatLatitude(telemetry.latitude_deg)}</span>
            </div>
            <div>
              <span className="text-fg-dim">Lon: </span>
              <span className="font-semibold text-fg">{formatLongitude(telemetry.longitude_deg)}</span>
            </div>
            <div>
              <span className="text-fg-dim">Alt: </span>
              <span className="font-semibold text-fg">{telemetry.altitude_km.toFixed(1)} km</span>
            </div>
            <div>
              <span className="text-fg-dim">Speed: </span>
              <span className="font-semibold text-fg">{telemetry.speed_kms} km/s</span>
            </div>
          </div>
          <div className="mt-1.5 border-t border-cyan/20 pt-1 text-[10px] text-fg-muted">
            <span className="text-cyan font-medium">Nadir Track:</span> {telemetry.targetRegion}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={focusSouthPoleAndSatellite}
            className="btn btn-primary justify-center text-[11px] py-1.5"
          >
            <Compass className="size-3.5" /> Locate South Pole
          </button>
          <button
            type="button"
            onClick={handleToggleTrackCassini}
            className={`btn justify-center text-[11px] py-1.5 ${
              trackSatellite ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            <Crosshair className="size-3.5" /> {trackSatellite ? 'Tracking Satellite' : 'Track Cassini'}
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-line text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab('telemetry')}
            className={`px-2.5 py-1 font-medium transition ${
              activeTab === 'telemetry' ? 'border-b-2 border-cyan text-cyan' : 'text-fg-dim hover:text-fg'
            }`}
          >
            South Pole Features
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('instruments')}
            className={`px-2.5 py-1 font-medium transition ${
              activeTab === 'instruments' ? 'border-b-2 border-cyan text-cyan' : 'text-fg-dim hover:text-fg'
            }`}
          >
            Sensors & Controls
          </button>
        </div>

        {/* Tab 1: South Pole Features & Data Acquisition */}
        {activeTab === 'telemetry' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-fg text-[11px]">SOUTH POLAR CANDIDATES</span>
              <button
                type="button"
                onClick={handleAcquireScan}
                className="text-[10px] text-cyan hover:underline flex items-center gap-1 font-mono"
              >
                <Activity className="size-3" /> Refresh Scan
              </button>
            </div>

            {/* Target Selector Dropdown / Pills */}
            <div className="flex flex-wrap gap-1">
              {SOUTH_POLE_FEATURES.map((feature) => (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => selectSouthPoleFeature(feature)}
                  className={`rounded px-2 py-0.5 font-mono text-[10px] transition ${
                    currentFeature.id === feature.id
                      ? 'bg-cyan text-bg font-semibold shadow-sm'
                      : 'bg-surface-raised text-fg-muted hover:bg-surface hover:text-fg'
                  }`}
                >
                  {feature.name.replace(/ Crater| Massif/, '')}
                </button>
              ))}
            </div>

            {/* Selected Feature Scientific Data Card */}
            <div className="rounded border border-line bg-surface-raised p-2.5 space-y-2">
              <div className="flex items-start justify-between gap-1">
                <div>
                  <h4 className="font-semibold text-fg text-xs">{currentFeature.name}</h4>
                  <p className="font-mono text-[10px] text-cyan">
                    {formatLatitude(currentFeature.coordinates.latitude_deg)} ·{' '}
                    {formatLongitude(currentFeature.coordinates.longitude_deg)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFocusFeature(currentFeature)}
                  className="rounded border border-line px-1.5 py-0.5 text-[10px] text-fg-muted hover:border-cyan hover:text-cyan flex items-center gap-1"
                  title="Center camera on this feature"
                >
                  <Eye className="size-3" /> Focus
                </button>
              </div>

              <p className="text-[10px] text-fg-dim leading-relaxed">{currentFeature.scientificSignificance}</p>

              {/* Scientific Measurements Grid */}
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] pt-1 border-t border-line">
                <div className="rounded bg-surface p-1.5 flex items-center gap-1.5">
                  <Droplets className="size-3.5 text-blue-400 shrink-0" />
                  <div>
                    <div className="text-[9px] text-fg-dim">Water-Ice</div>
                    <div className="font-semibold text-fg">
                      {currentFeature.waterIceWtPercent} wt% ({currentFeature.waterIceProbability}%)
                    </div>
                  </div>
                </div>

                <div className="rounded bg-surface p-1.5 flex items-center gap-1.5">
                  <Thermometer className="size-3.5 text-cyan shrink-0" />
                  <div>
                    <div className="text-[9px] text-fg-dim">Temperature</div>
                    <div className="font-semibold text-fg">
                      {currentFeature.temperatureK.min} - {currentFeature.temperatureK.max} K
                    </div>
                  </div>
                </div>

                <div className="rounded bg-surface p-1.5 flex items-center gap-1.5">
                  <Sun className="size-3.5 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-[9px] text-fg-dim">Sunlight</div>
                    <div className="font-semibold text-fg">{currentFeature.solarIlluminationPercent}% peak</div>
                  </div>
                </div>

                <div className="rounded bg-surface p-1.5 flex items-center gap-1.5">
                  <Gauge className="size-3.5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-[9px] text-fg-dim">Earth LOS</div>
                    <div className="font-semibold text-fg">{currentFeature.earthVisibilityPercent}% window</div>
                  </div>
                </div>
              </div>

              {/* Action: Set as active landing site across Lunar Scope */}
              <button
                type="button"
                onClick={() => handleSetMissionTarget(currentFeature)}
                className="w-full btn btn-primary justify-center text-[11px] py-1 mt-1"
              >
                <CheckCircle2 className="size-3.5" />
                {activeMissionSite?.coordinates.latitude_deg === currentFeature.coordinates.latitude_deg
                  ? 'Active Mission Target'
                  : 'Select for Mission Analysis'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Sensors & Satellite Controls */}
        {activeTab === 'instruments' && (
          <div className="space-y-3">
            <div>
              <span className="font-semibold text-fg text-[11px]">DISPLAY & VISIBILITY</span>
              <div className="mt-1.5 space-y-1.5">
                <label className="flex cursor-pointer items-center justify-between text-[11px]">
                  <span className="flex items-center gap-2">
                    <Satellite className="size-3.5 text-cyan" /> Cassini 3D Model
                  </span>
                  <input
                    type="checkbox"
                    className="accent-cyan"
                    checked={showSatellite}
                    onChange={toggleSatellite}
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between text-[11px]">
                  <span className="flex items-center gap-2">
                    <Layers className="size-3.5 text-cyan" /> Orbital Path Loop
                  </span>
                  <input
                    type="checkbox"
                    className="accent-cyan"
                    checked={showOrbitPath}
                    onChange={toggleOrbitPath}
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between text-[11px]">
                  <span className="flex items-center gap-2">
                    <Activity className="size-3.5 text-cyan" /> South Pole Sensor Beam
                  </span>
                  <input
                    type="checkbox"
                    className="accent-cyan"
                    checked={showScanBeam}
                    onChange={toggleScanBeam}
                  />
                </label>
              </div>
            </div>

            {/* Orbit Simulation Speed */}
            <div className="border-t border-line pt-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-fg">Orbit Simulation Speed</span>
                <span className="font-mono text-cyan">{satelliteSpeed}x</span>
              </div>
              <div className="mt-1.5 flex gap-1">
                {[0.5, 1.0, 2.0, 4.0].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSatelliteSpeed(s)}
                    className={`flex-1 rounded py-1 font-mono text-[10px] transition ${
                      satelliteSpeed === s
                        ? 'bg-cyan text-bg font-semibold'
                        : 'bg-surface-raised text-fg-dim hover:text-fg'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Active Payload Instruments */}
            <div className="border-t border-line pt-2">
              <span className="font-semibold text-fg text-[11px]">ACTIVE SENSING INSTRUMENTS</span>
              <ul className="mt-1 space-y-1 text-[10px] font-mono text-fg-dim">
                <li className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  <span>LOLA - Lunar Orbiter Laser Altimeter</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-cyan" />
                  <span>Diviner - Lunar Cryogenic Radiometer</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-blue-400" />
                  <span>LEND - Lunar Exploration Neutron Detector</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-amber-400" />
                  <span>Mini-RF - Polar SAR Radar Scanner</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Scan Message / Feedback notification */}
        {scanMessage && (
          <div className="rounded border border-cyan/40 bg-cyan/10 px-2 py-1 text-[10px] text-cyan animate-fade-in font-mono">
            {scanMessage}
          </div>
        )}
      </div>
    </MissionPanel>
  );
}
