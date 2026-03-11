'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Palette, Settings2, SlidersHorizontal } from 'lucide-react';
import { CollectionSelector } from '@/components/CollectionSelector';

interface Collection {
  _id: string;
  name: string;
}

const NAV_ITEMS = [
  { href: '/', label: 'Tokens', icon: Palette },
  { href: '/configuration', label: 'Configuration', icon: Settings2 },
  { href: '/settings', label: 'Settings', icon: SlidersHorizontal },
];

const STORAGE_KEY = 'atui-selected-collection-id';

export function AppSidebar() {
  const pathname = usePathname();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedId, setSelectedId] = useState<string>('local');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedId(stored);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch('/api/collections')
      .then((res) => res.json())
      .then((data: Collection[]) => {
        setCollections(data);
      })
      .catch(() => {
        setCollections([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  function handleSelectionChange(id: string) {
    setSelectedId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  return (
    <aside className="h-full bg-gray-900 flex flex-col">
      {/* App name */}
      <div className="px-4 py-4">
        <span className="text-white font-semibold text-sm tracking-wide">ATUI Tokens</span>
      </div>

      {/* Collection selector */}
      <div className="px-3 pb-3">
        <CollectionSelectorSidebar
          collections={collections}
          selectedId={selectedId}
          loading={loading}
          onChange={handleSelectionChange}
        />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-2 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium w-full transition-colors ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

interface CollectionSelectorSidebarProps {
  collections: Collection[];
  selectedId: string;
  loading: boolean;
  onChange: (id: string) => void;
}

function CollectionSelectorSidebar({
  collections,
  selectedId,
  loading,
  onChange,
}: CollectionSelectorSidebarProps) {
  return (
    <div className="[&_label]:hidden [&_[data-radix-select-trigger]]:bg-white/10 [&_[data-radix-select-trigger]]:border-white/20 [&_[data-radix-select-trigger]]:text-white [&_[data-radix-select-trigger]]:text-xs [&_[data-radix-select-trigger]]:h-8 [&_[data-radix-select-trigger]]:min-w-0 [&_[data-radix-select-trigger]]:w-full [&_[data-radix-select-value]]:text-white">
      <CollectionSelector
        collections={collections}
        selectedId={selectedId}
        loading={loading}
        onChange={onChange}
      />
    </div>
  );
}
