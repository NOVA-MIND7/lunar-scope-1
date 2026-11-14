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
  /** Minimum UI mode required to show this route in navigation (default: basic). */
  minMode?: 'basic' | 'scientific';
}

export const ROUTES: readonly RouteDef[] = [
  { path: '/', label: 'Mission Control', description: 'Mission overview and live conditions', icon: Radar, group: 'main', minMode: 'basic' },
  { path: '/explorer', label: 'Lunar Explorer', description: 'Interactive 3D model of the Moon', icon: Globe2, group: 'main', minMode: 'basic' },
  { path: '/navigator', label: 'Landing Navigator', description: 'Browse and select candidate landing sites', icon: Crosshair, group: 'main', minMode: 'basic' },
  { path: '/solar', label: 'Solar Analysis', description: 'Sun position and illumination at a site', icon: Sun, group: 'main', minMode: 'scientific' },
  { path: '/earth', label: 'Earth Visibility', description: 'Earth visibility for communications', icon: Satellite, group: 'main', minMode: 'scientific' },
  { path: '/comms', label: 'Comms Network', description: '3D Moon-to-Earth relay and DSN link simulation', icon: Radio, group: 'main', minMode: 'scientific' },
  { path: '/timeline', label: 'Mission Timeline', description: 'Landing windows and mission phases', icon: CalendarClock, group: 'main', minMode: 'basic' },
  { path: '/compare', label: 'Site Comparison', description: 'Compare scenarios side by side', icon: GitCompare, group: 'main', minMode: 'scientific' },
  { path: '/terrain', label: 'Terrain Analysis', description: 'Horizon and slope analysis', icon: Mountain, group: 'main', minMode: 'scientific' },
  { path: '/recommendations', label: 'Recommendations', description: 'Ranked site and window recommendations', icon: Lightbulb, group: 'main', minMode: 'scientific' },
  { path: '/reports', label: 'Mission Reports', description: 'Exportable mission reports', icon: FileText, group: 'main', minMode: 'scientific' },
  { path: '/data-sources', label: 'Data Sources', description: 'Datasets, provenance and integration status', icon: Database, group: 'footer', minMode: 'basic' },
  { path: '/settings', label: 'Settings', description: 'Mission name, data mode and display preferences', icon: Settings, group: 'footer', minMode: 'basic' },
  { path: '/status', label: 'System Status', description: 'Service health and connections', icon: Activity, group: 'footer', minMode: 'scientific' },
] as const;

export function isRouteVisibleForMode(route: RouteDef, uiMode: 'basic' | 'scientific'): boolean {
  return uiMode === 'scientific' || (route.minMode ?? 'basic') === 'basic';
}

export const MAIN_ROUTES = ROUTES.filter((r) => r.group === 'main');
export const FOOTER_ROUTES = ROUTES.filter((r) => r.group === 'footer');
