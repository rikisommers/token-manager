'use client';

import { usePathname } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { OrgHeader } from '@/components/layout/OrgHeader';
import { OrgSidebar } from '@/components/layout/OrgSidebar';
import { CollectionProvider } from '@/context/CollectionContext';

function isCollectionsRoute(pathname: string): boolean {
  return pathname.startsWith('/collections');
}

function isSettingsRoute(pathname: string): boolean {
  return pathname === '/settings';
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <CollectionProvider>
      {isCollectionsRoute(pathname) ? (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
          <OrgHeader />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      ) : isSettingsRoute(pathname) ? (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
          <OrgHeader />
          <div className="flex flex-1 overflow-hidden">
            <OrgSidebar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
          <AppHeader />
          <div className="flex flex-1 overflow-hidden">
            <AppSidebar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      )}
    </CollectionProvider>
  );
}
