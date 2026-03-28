'use client';

import { usePathname } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { OrgHeader } from '@/components/layout/OrgHeader';
import { OrgSidebar } from '@/components/layout/OrgSidebar';
import { CollectionProvider } from '@/context/CollectionContext';

function isCollectionRoute(pathname: string): boolean {
  // /collections/[id]/... — inside a specific collection
  return /^\/collections\/[^/]/.test(pathname);
}

function isOrgRoute(pathname: string): boolean {
  // Top-level org pages and /org/* pages (e.g. /org/users)
  return pathname === '/collections'
    || pathname === '/settings'
    || pathname.startsWith('/org');
}

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith('/auth/');
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <CollectionProvider>
      {isCollectionRoute(pathname) || isAuthRoute(pathname) ? (
        // Collection pages and auth pages own their full layout
        children
      ) : isOrgRoute(pathname) ? (
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
