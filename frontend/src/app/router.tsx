import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorState } from '@/components/common/ErrorState';
import DashboardPage from './DashboardPage';
import SettingsPage from './SettingsPage';
import NotFoundPage from './NotFoundPage';
import DataSourcesPage from './DataSourcesPage';
import SystemStatusPage from './SystemStatusPage';

// The 3D explorer pulls in Three.js, so it is code-split.
const LunarExplorerPage = lazy(() => import('@/features/lunar-explorer/LunarExplorerPage'));
const SiteNavigatorPage = lazy(() => import('@/features/site-navigator/SiteNavigatorPage'));
const SolarAnalysisPage = lazy(() => import('@/features/solar-analysis/SolarAnalysisPage'));
const EarthVisibilityPage = lazy(() => import('@/features/earth-visibility/EarthVisibilityPage'));
const MissionTimelinePage = lazy(() => import('@/features/mission-timeline/MissionTimelinePage'));
const SiteComparisonPage = lazy(() => import('@/features/site-comparison/SiteComparisonPage'));
const TerrainAnalysisPage = lazy(() => import('@/features/terrain-analysis/TerrainAnalysisPage'));
const RecommendationsPage = lazy(() => import('@/features/recommendations/RecommendationsPage'));
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
      { path: '/navigator', element: <SiteNavigatorPage /> },
      { path: '/solar', element: <SolarAnalysisPage /> },
      { path: '/earth', element: <EarthVisibilityPage /> },
      { path: '/timeline', element: <MissionTimelinePage /> },
      { path: '/compare', element: <SiteComparisonPage /> },
      { path: '/terrain', element: <TerrainAnalysisPage /> },
      { path: '/recommendations', element: <RecommendationsPage /> },
      { path: '/reports', element: <MissionReportsPage /> },
      { path: '/data-sources', element: <DataSourcesPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/status', element: <SystemStatusPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routeObjects);
