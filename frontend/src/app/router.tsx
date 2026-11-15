import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorState } from '@/components/common/ErrorState';
import DashboardPage from './DashboardPage';
import SettingsPage from './SettingsPage';
import NotFoundPage from './NotFoundPage';
import SystemStatusPage from './SystemStatusPage';

// The 3D explorer pulls in Three.js, so it is code-split.
const LunarExplorerPage = lazy(() => import('@/features/lunar-explorer/LunarExplorerPage'));
const SolarAnalysisPage = lazy(() => import('@/features/solar-analysis/SolarAnalysisPage'));
const EarthVisibilityPage = lazy(() => import('@/features/earth-visibility/EarthVisibilityPage'));
const CommsNetworkPage = lazy(() => import('@/features/comms-network/CommsNetworkPage'));
const DirectCommsPage = lazy(() => import('@/features/direct-comms/DirectCommsPage'));
const MissionTimelinePage = lazy(() => import('@/features/mission-timeline/MissionTimelinePage'));
const SiteComparisonPage = lazy(() => import('@/features/site-comparison/SiteComparisonPage'));
const TerrainAnalysisPage = lazy(() => import('@/features/terrain-analysis/TerrainAnalysisPage'));
const MissionReportsPage = lazy(() => import('@/features/mission-reports/MissionReportsPage'));

export const routeObjects: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: (
      <div className="p-6">
        <ErrorState title="This view failed to load" message="An unexpected error occurred. Reload the page to try again." />
      </div>
    ),
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/explorer', element: <LunarExplorerPage /> },
      { path: '/solar', element: <SolarAnalysisPage /> },
      { path: '/earth', element: <EarthVisibilityPage /> },
      { path: '/comms', element: <CommsNetworkPage /> },
      { path: '/direct-comms', element: <DirectCommsPage /> },
      { path: '/timeline', element: <MissionTimelinePage /> },
      { path: '/compare', element: <SiteComparisonPage /> },
      { path: '/terrain', element: <TerrainAnalysisPage /> },
      { path: '/reports', element: <MissionReportsPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/status', element: <SystemStatusPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routeObjects);
