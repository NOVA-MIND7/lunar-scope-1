import { Sun, Satellite, ClipboardList, Crosshair } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MissionPanel } from '@/components/common/MissionPanel';
import { DataRow } from '@/components/common/DataRow';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusIndicator } from '@/components/common/StatusIndicator';
import { useAppStore } from '@/stores/appStore';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { pluralDays } from '@/utils/format';
import { toUtcIso } from '@/utils/time';
import {
  calculateSolarElevationDeg,
  calculateSolarAzimuthDeg,
  calculateEarthElevationDeg,
  calculateEarthAzimuthDeg,
} from '@/utils/astronomicalTime';

function NoSite() {
  return (
    <EmptyState
      compact
      icon={Crosshair}
      title="No landing site selected"
      message="Choose a site in Mission setup to see conditions."
    />
  );
}

export function SolarConditions() {
  const site = useAppStore((s) => s.selectedLandingSite);
  const date = useAppStore((s) => s.selectedLandingDate);
  const time = useAppStore((s) => s.selectedLandingTime);

  if (!site) return <MissionPanel title="Solar conditions" icon={Sun}><NoSite /></MissionPanel>;

  const landingUtc = toUtcIso(date, time);
  const tMs = Date.parse(landingUtc) || Date.now();
  const lat = site.coordinates.latitude_deg;
  const lon = site.coordinates.longitude_deg;

  const solarEl = calculateSolarElevationDeg(lat, lon, tMs);
  const solarAz = calculateSolarAzimuthDeg(lat, lon, tMs);
  const isSunlit = solarEl > -0.26;

  return (
    <MissionPanel title="Solar conditions" icon={Sun}>
      <dl>
        <DataRow label="Solar elevation">{solarEl.toFixed(1)}°</DataRow>
        <DataRow label="Solar azimuth">{solarAz.toFixed(1)}°</DataRow>
        <DataRow label="Sunlight status" mono={false}>
          {isSunlit ? (
            <StatusIndicator state="online" label="Sunlit (Direct Illumination)" />
          ) : (
            <StatusIndicator state="degraded" label="Shadowed (Lunar Night)" />
          )}
        </DataRow>
      </dl>
    </MissionPanel>
  );
}

export function EarthConditions() {
  const site = useAppStore((s) => s.selectedLandingSite);
  const date = useAppStore((s) => s.selectedLandingDate);
  const time = useAppStore((s) => s.selectedLandingTime);

  if (!site) return <MissionPanel title="Earth conditions" icon={Satellite}><NoSite /></MissionPanel>;

  const landingUtc = toUtcIso(date, time);
  const tMs = Date.parse(landingUtc) || Date.now();
  const lat = site.coordinates.latitude_deg;
  const lon = site.coordinates.longitude_deg;

  const earthEl = calculateEarthElevationDeg(lat, lon, tMs);
  const earthAz = calculateEarthAzimuthDeg(lat, lon, tMs);
  const isVisible = earthEl > 0.0;

  return (
    <MissionPanel title="Earth conditions" icon={Satellite}>
      <dl>
        <DataRow label="Earth elevation">{earthEl.toFixed(1)}°</DataRow>
        <DataRow label="Earth azimuth">{earthAz.toFixed(1)}°</DataRow>
        <DataRow label="Direct visibility" mono={false}>
          {isVisible ? (
            <StatusIndicator state="online" label="Direct Line-of-Sight Active" />
          ) : (
            <StatusIndicator state="degraded" label="Occluded by Lunar Limb" />
          )}
        </DataRow>
      </dl>
    </MissionPanel>
  );
}

export function MissionStatus() {
  const site = useAppStore((s) => s.selectedLandingSite);
  const date = useAppStore((s) => s.selectedLandingDate);
  const time = useAppStore((s) => s.selectedLandingTime);
  const duration = useAppStore((s) => s.selectedMissionDuration);
  const backend = useBackendStatus();

  return (
    <MissionPanel title="Mission status" icon={ClipboardList}>
      <dl>
        <DataRow label="Landing site" mono={false}>
          {site ? site.name : <span className="text-fg-dim">None selected</span>}
        </DataRow>
        <DataRow label="Date (UTC)">
          {date} · {time}
        </DataRow>
        <DataRow label="Mission duration">{pluralDays(duration)}</DataRow>
        <DataRow label="Engine status" mono={false}>
          {backend.isOnline ? (
            <StatusIndicator state="online" label="Ephemeris Engine Connected" />
          ) : backend.isPending ? (
            <StatusIndicator state="pending" label="Checking Engine" />
          ) : (
            <StatusIndicator state="offline" label="Backend Offline" />
          )}
        </DataRow>
      </dl>
      <div className="mt-3 flex justify-end">
        <Link to="/mission-setup" className="btn btn-primary text-xs">
          Edit in Mission Setup
        </Link>
      </div>
    </MissionPanel>
  );
}
