import type { LucideIcon } from 'lucide-react';
import {
  Radar,
  Globe2,
  Crosshair,
  Sun,
  Satellite,
  Radio,
  CalendarClock,
  GitCompare,
  Mountain,
  Lightbulb,
  FileText,
  Settings,
  Database,
  Activity,
} from 'lucide-react';

export type RouteGroup = 'main' | 'footer';

export interface RouteDef {
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
  group: RouteGroup;
}

export const ROUTES: readonly RouteDef[] = [
  { path: '/', label: 'Mission Control', description: 'Mission overview and live conditions', icon: Radar, group: 'main' },
  { path: '/explorer', label: 'Lunar Explorer', description: 'Interactive 3D model of the Moon', icon: Globe2, group: 'main' },
  { path: '/navigator', label: 'Landing Navigator', description: 'Browse and select candidate landing sites', icon: Crosshair, group: 'main' },
  { path: '/solar', label: 'Solar Analysis', description: 'Sun position and illumination at a site', icon: Sun, group: 'main' },
  { path: '/earth', label: 'Earth Visibility', description: 'Earth visibility for communications', icon: Satellite, group: 'main' },
  { path: '/comms', label: 'Comms Network', description: '3D Moon-to-Earth relay and DSN link simulation', icon: Radio, group: 'main' },
  { path: '/timeline', label: 'Mission Timeline', description: 'Landing windows and mission phases', icon: CalendarClock, group: 'main' },
  { path: '/compare', label: 'Site Comparison', description: 'Compare scenarios side by side', icon: GitCompare, group: 'main' },
  { path: '/terrain', label: 'Terrain Analysis', description: 'Horizon and slope analysis', icon: Mountain, group: 'main' },
  { path: '/recommendations', label: 'Recommendations', description: 'Ranked site and window recommendations', icon: Lightbulb, group: 'main' },
  { path: '/reports', label: 'Mission Reports', description: 'Exportable mission reports', icon: FileText, group: 'main' },
  { path: '/data-sources', label: 'Data Sources', description: 'Datasets, provenance and integration status', icon: Database, group: 'footer' },
  { path: '/settings', label: 'Settings', description: 'Mission name, data mode and display preferences', icon: Settings, group: 'footer' },
  { path: '/status', label: 'System Status', description: 'Service health and connections', icon: Activity, group: 'footer' },
] as const;

export const MAIN_ROUTES = ROUTES.filter((r) => r.group === 'main');
export const FOOTER_ROUTES = ROUTES.filter((r) => r.group === 'footer');
