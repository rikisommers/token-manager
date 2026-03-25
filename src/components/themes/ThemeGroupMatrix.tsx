'use client';

import { Sun, Moon } from 'lucide-react';
import type { ITheme, ThemeGroupState, ColorMode } from '@/types/theme.types';
import type { TokenGroup } from '@/types';
import { parseGroupPath } from '@/utils';

interface ThemeGroupMatrixProps {
  theme: ITheme;
  groups: TokenGroup[];
  onStateChange: (groupId: string, state: ThemeGroupState) => void;
  onColorModeChange?: (themeId: string, colorMode: ColorMode) => void;
}

const STATES: ThemeGroupState[] = ['disabled', 'enabled', 'source'];

const STATE_LABELS: Record<ThemeGroupState, string> = {
  disabled: 'Disabled',
  enabled: 'Enabled',
  source: 'Source',
};

export function ThemeGroupMatrix({ theme, groups, onStateChange, onColorModeChange }: ThemeGroupMatrixProps) {
  const colorMode = (theme.colorMode ?? 'light') as ColorMode;

  if (groups.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center mt-8">
        No groups in this collection.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Color mode selector row */}
      <div className="flex items-center justify-between gap-4 px-4 py-2 rounded-md hover:bg-gray-50 mb-2 border-b border-gray-100 pb-3">
        <span className="text-sm text-gray-700 flex-1">Color Mode</span>
        <div className="flex border border-gray-200 rounded-md overflow-hidden flex-shrink-0">
          <button
            className={`px-3 py-1 text-xs font-medium transition-colors border-r border-gray-200 flex items-center gap-1 ${
              colorMode === 'light'
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => onColorModeChange?.(theme.id, 'light')}
          >
            <Sun size={11} />
            Light
          </button>
          <button
            className={`px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${
              colorMode === 'dark'
                ? 'bg-slate-600 text-white border-slate-600'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => onColorModeChange?.(theme.id, 'dark')}
          >
            <Moon size={11} />
            Dark
          </button>
        </div>
      </div>

      {/* Group state rows */}
      {groups.map((group) => {
        const segments = parseGroupPath(group.name);
        const label = segments.join(' / ');
        const currentState: ThemeGroupState = theme.groups[group.id] ?? 'disabled';

        return (
          <div
            key={group.id}
            className="flex items-center justify-between gap-4 px-4 py-2 rounded-md hover:bg-gray-50"
          >
            {/* Group label */}
            <span className="text-sm text-gray-700 flex-1 truncate">{label}</span>

            {/* 3-state button group */}
            <div className="flex border border-gray-200 rounded-md overflow-hidden flex-shrink-0">
              {STATES.map((state, idx) => {
                const isActive = currentState === state;
                return (
                  <button
                    key={state}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${
                      idx < STATES.length - 1 ? 'border-r border-gray-200' : ''
                    } ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={() => onStateChange(group.id, state)}
                    title={STATE_LABELS[state]}
                  >
                    {STATE_LABELS[state]}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
