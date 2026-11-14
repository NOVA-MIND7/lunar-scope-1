import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/navigation/Sidebar';
import { LoadingState } from '@/components/common/LoadingState';
import { Toaster } from '@/components/common/Toaster';
import { useErrorToasts } from '@/hooks/useErrorToasts';
import { Topbar } from './Topbar';

export function AppShell() {
  useErrorToasts();
  return (
    <div className="shell-bg flex h-full text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-cyan focus:px-3 focus:py-1.5 focus:text-bg"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="main" className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
          <Suspense fallback={<LoadingState label="Loading module…" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
