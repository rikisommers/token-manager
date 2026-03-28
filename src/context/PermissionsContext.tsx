'use client';

import { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';
import { canPerform } from '@/lib/auth/permissions';
import type { Role, ActionType } from '@/lib/auth/permissions';

interface PermissionsContextValue {
  role: Role | null;
  canPerform: (action: ActionType) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  role: null,
  canPerform: () => false, // safe default: deny all when no session
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const role = (session?.user?.role as Role) ?? null;

  return (
    <PermissionsContext.Provider
      value={{
        role,
        canPerform: (action) => (role ? canPerform(role, action) : false),
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  return useContext(PermissionsContext);
}
