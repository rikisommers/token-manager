'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { DATABASE_PROVIDERS } from '@/types/database.types';

type ConnectionState = 'connected' | 'local' | 'loading';

interface DbStatus {
  state: ConnectionState;
  label: string;
}

function useDbStatus(): DbStatus {
  const [status, setStatus] = useState<DbStatus>({ state: 'loading', label: 'Connecting...' });

  useEffect(() => {
    fetch('/api/database/config')
      .then((r) => r.json())
      .then((data) => {
        const provider = data.provider ?? 'local-mongodb';
        const source = data.source ?? 'default';

        const isLocalDefault =
          provider === 'local-mongodb' && source === 'default';

        if (isLocalDefault) {
          setStatus({ state: 'local', label: 'Local (default)' });
          return;
        }

        const info = DATABASE_PROVIDERS.find((p) => p.id === provider);
        const name = info?.name ?? provider;
        setStatus({ state: 'connected', label: name });
      })
      .catch(() => {
        setStatus({ state: 'local', label: 'Unknown' });
      });
  }, []);

  return status;
}

export function OrgHeader() {
  const db = useDbStatus();
  const pathname = usePathname();
  const isCollections = pathname.startsWith('/collections');

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white flex-shrink-0">
      <div className="flex items-center gap-3">
        {isCollections && (
          <Link
            href="/org"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft size={14} />
            Org
          </Link>
        )}
        <Link href="/collections" className="text-sm font-semibold text-gray-900 tracking-wide hover:text-gray-700 transition-colors">
          ATUI Tokens
        </Link>
      </div>

      <DbPill status={db} />
    </header>
  );
}

function DbPill({ status }: { status: DbStatus }) {
  const isLoading = status.state === 'loading';
  const isConnected = status.state === 'connected';

  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
      isLoading
        ? 'text-gray-400 border-gray-200 bg-gray-50'
        : isConnected
          ? 'text-green-700 border-green-200 bg-green-50'
          : 'text-amber-700 border-amber-200 bg-amber-50'
    }`}>
      {isLoading ? (
        <span className="w-2 h-2 rounded-full border border-gray-300 border-t-transparent animate-spin" />
      ) : (
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-amber-400'}`} />
      )}
      <span>{status.label}</span>
    </div>
  );
}

/** Exported for reuse in OrgSidebar badge. */
export { useDbStatus };
export type { DbStatus, ConnectionState };
