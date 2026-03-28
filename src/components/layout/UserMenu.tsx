'use client';

import { useSession, signOut } from 'next-auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserMenu() {
  const { data: session, status } = useSession();

  // Loading skeleton — prevents layout shift while session hydrates
  if (status === 'loading') {
    return <div className="w-28 h-8 rounded-md bg-gray-100 animate-pulse dark:bg-gray-800" />;
  }

  // No session — render nothing (Phase 18 will redirect unauthenticated users before they see this)
  if (!session?.user) return null;

  const initials =
    session.user.name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0">
            {initials}
          </span>
          <span className="text-sm text-gray-700 dark:text-gray-200 max-w-[120px] truncate">
            {session.user.name}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/auth/sign-in' })}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
