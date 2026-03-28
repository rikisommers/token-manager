'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { canPerform, Action } from '@/lib/auth/permissions';
import type { Role } from '@/lib/auth/permissions';

export interface PermissionsContextValue {
  canEdit:   boolean;  // Action.Write on active collection (effective role)
  canCreate: boolean;  // Action.CreateCollection (org role)
  isAdmin:   boolean;  // org role === 'Admin'
  canGitHub: boolean;  // Action.PushGithub on active collection (effective role)
  canFigma:  boolean;  // Action.PushFigma on active collection (effective role)
}

const DEFAULT_PERMISSIONS: PermissionsContextValue = {
  canEdit:   false,
  canCreate: false,
  isAdmin:   false,
  canGitHub: false,
  canFigma:  false,
};

const PermissionsContext = createContext<PermissionsContextValue>(DEFAULT_PERMISSIONS);

/** Extract /collections/[id] segment from pathname, or null if not on a collection route */
function extractCollectionId(pathname: string): string | null {
  const match = pathname.match(/^\/collections\/([^/]+)/);
  return match ? match[1] : null;
}

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [effectiveRole, setEffectiveRole] = useState<Role | null>(null);

  const collectionId = extractCollectionId(pathname);
  const orgRole = (session?.user?.role as Role) ?? null;

  useEffect(() => {
    // Safe default: deny all while loading
    if (status === 'loading' || !orgRole) {
      setEffectiveRole(null);
      return;
    }

    // Admin bypasses all collection-level checks
    if (orgRole === 'Admin') {
      setEffectiveRole('Admin');
      return;
    }

    // Not on a collection route: use org role for top-level permissions
    if (!collectionId) {
      setEffectiveRole(orgRole);
      return;
    }

    // Fetch effective role for this specific collection
    let cancelled = false;
    fetch(`/api/collections/${collectionId}/permissions/me`)
      .then(res => res.ok ? res.json() : null)
      .then((data: { role: Role } | null) => {
        if (!cancelled) {
          setEffectiveRole(data?.role ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setEffectiveRole(null);
      });

    return () => { cancelled = true; };
  }, [orgRole, collectionId, status]);

  const value: PermissionsContextValue = {
    canEdit:   effectiveRole ? canPerform(effectiveRole, Action.Write)            : false,
    canCreate: orgRole       ? canPerform(orgRole, Action.CreateCollection)       : false,
    isAdmin:   orgRole === 'Admin',
    canGitHub: effectiveRole ? canPerform(effectiveRole, Action.PushGithub)       : false,
    canFigma:  effectiveRole ? canPerform(effectiveRole, Action.PushFigma)        : false,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  return useContext(PermissionsContext);
}
