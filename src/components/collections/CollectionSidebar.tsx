'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, Palette, Settings2, SlidersHorizontal } from 'lucide-react';

interface CollectionSidebarProps {
  collectionId: string;
  collectionName: string;
}

export function CollectionSidebar({ collectionId, collectionName }: CollectionSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { href: `/collections/${collectionId}/tokens`, label: 'Tokens', icon: Palette },
    { href: `/collections/${collectionId}/config`, label: 'Config', icon: Settings2 },
    { href: `/collections/${collectionId}/settings`, label: 'Settings', icon: SlidersHorizontal },
  ];

  return (
    <aside className={`h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-200 flex-shrink-0 ${collapsed ? 'w-12' : 'w-[200px]'}`}>
      {/* Top section */}
      <div className={`flex items-start border-b border-gray-100 flex-shrink-0 ${collapsed ? 'flex-col items-center py-3 gap-2' : 'px-4 py-4 justify-between'}`}>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <Link href="/collections" className="block mb-2">
              <span className="text-gray-900 font-semibold text-sm tracking-wide">ATUI Tokens</span>
            </Link>

            <Link
              href="/collections"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-3"
            >
              <ChevronLeft size={14} />
              Collections
            </Link>

            <span className="text-gray-900 font-semibold text-sm truncate block">
              {collectionName}
            </span>
          </div>
        )}

        {collapsed && (
          <Link href="/collections" title="Collections" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft size={16} />
          </Link>
        )}

        <button
          onClick={() => setCollapsed(c => !c)}
          className="text-gray-400 hover:text-gray-700 p-1 rounded transition-colors flex-shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-1.5 py-2 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center rounded-md text-sm font-medium w-full transition-colors ${
                collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'
              } ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon size={16} className="flex-shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
