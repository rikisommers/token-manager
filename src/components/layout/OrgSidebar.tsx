'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDbStatus } from './OrgHeader';

export function OrgSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const db = useDbStatus();

  const isConnected = db.state === 'connected';
  const isLoading = db.state === 'loading';

  const navItems = [
    {
      href: '/collections',
      label: 'Collections',
      icon: LayoutGrid,
      badge: null,
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: SlidersHorizontal,
      badge: (
        <span
          title={isLoading ? 'Connecting...' : db.label}
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isLoading
              ? 'bg-gray-300 animate-pulse'
              : isConnected
                ? 'bg-green-500'
                : 'bg-amber-400'
          }`}
        />
      ),
    },
  ];

  return (
    <aside
      className={`h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-200 flex-shrink-0 ${
        collapsed ? 'w-12' : 'w-[180px]'
      }`}
    >
      {/* Collapse toggle */}
      <div className={`flex items-center border-b border-gray-100 flex-shrink-0 py-2 ${collapsed ? 'justify-center' : 'px-3 justify-end'}`}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-gray-400 hover:text-gray-700 p-1 rounded transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-1.5 py-2 space-y-1">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname === href || (href === '/collections' && pathname.startsWith('/collections'));
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
              {!collapsed && (
                <span className="flex-1 flex items-center justify-between gap-2">
                  {label}
                  {badge}
                </span>
              )}
              {collapsed && badge && (
                <span className="absolute ml-5 mt-3">{badge}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
