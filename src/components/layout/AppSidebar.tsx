'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Palette, Settings2, SlidersHorizontal, ChevronRight, ChevronLeft } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Tokens', icon: Palette },
  { href: '/configuration', label: 'Configuration', icon: Settings2 },
  { href: '/settings', label: 'Settings', icon: SlidersHorizontal },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <aside className={`h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-200 ${collapsed ? 'w-12' : 'w-[200px]'}`}>
      {/* App name / logo area */}
      <div className={`flex items-center border-b border-gray-100 flex-shrink-0 ${collapsed ? 'justify-center py-3' : 'px-4 py-3 justify-between'}`}>
        {!collapsed && (
          <span className="text-gray-900 font-semibold text-sm tracking-wide truncate">ATUI Tokens</span>
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
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
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
