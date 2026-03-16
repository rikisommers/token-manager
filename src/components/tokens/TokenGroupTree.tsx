'use client';

import { MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { TokenGroup } from '@/types';
import { parseGroupPath } from '@/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TokenGroupTreeProps {
  groups: TokenGroup[];
  namespace?: string;
  selectedGroupId?: string;
  onGroupSelect?: (groupId: string) => void;
  onAddGroup?: () => void;
  onDeleteGroup?: (groupId: string) => void;
  onAddSubGroup?: (parentGroupId: string) => void;
}

interface FlatNode {
  group: TokenGroup;
  depth: number;
  displayLabel: string;
}

function flattenTree(groups: TokenGroup[], depth = 0): FlatNode[] {
  const result: FlatNode[] = [];
  for (const group of groups) {
    const segments = parseGroupPath(group.name);
    const displayLabel = segments[segments.length - 1] ?? group.name;
    result.push({ group, depth, displayLabel });
    if (group.children?.length) {
      result.push(...flattenTree(group.children, depth + 1));
    }
  }
  return result;
}

export function TokenGroupTree({
  groups,
  namespace: _namespace,
  selectedGroupId,
  onGroupSelect,
  onAddGroup,
  onDeleteGroup,
  onAddSubGroup,
}: TokenGroupTreeProps) {
  const nodes = flattenTree(groups);

  return (
    <div className="flex flex-col h-full">
      {/* Section heading */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Groups</span>
        {onAddGroup && (
          <button
            onClick={onAddGroup}
            className="text-gray-400 hover:text-gray-700 text-base leading-none px-1"
            title="Add group"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto py-1">
        {nodes.length === 0 && (
          <p className="px-3 py-3 text-xs text-gray-400">No groups yet</p>
        )}
        {nodes.map(({ group, depth, displayLabel }) => {
          const isSelected = group.id === selectedGroupId;
          const hasChildren = (group.children?.length ?? 0) > 0;

          return (
            <div
              key={group.id}
              style={{ paddingLeft: depth * 14 + 8 }}
              className={`group/item flex items-center pr-1 text-sm cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-indigo-50 text-indigo-900 font-medium'
                  : 'hover:bg-gray-100 text-gray-700'
              } ${hasChildren ? 'font-semibold' : 'font-normal'}`}
              onClick={e => { e.stopPropagation(); onGroupSelect?.(group.id); }}
            >
              <span className="flex-1 py-1.5 truncate text-xs">{displayLabel}</span>

              {/* Per-item menu */}
              {(onDeleteGroup || onAddSubGroup) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-all flex-shrink-0"
                      onClick={e => e.stopPropagation()}
                      title="Group actions"
                    >
                      <MoreHorizontal size={13} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44" onClick={e => e.stopPropagation()}>
                    {onAddSubGroup && (
                      <DropdownMenuItem
                        className="gap-2 text-xs"
                        onClick={() => onAddSubGroup(group.id)}
                      >
                        <Plus size={12} /> Add Sub-group
                      </DropdownMenuItem>
                    )}
                    {onAddSubGroup && onDeleteGroup && <DropdownMenuSeparator />}
                    {onDeleteGroup && (
                      <DropdownMenuItem
                        className="gap-2 text-xs text-red-600 focus:text-red-700"
                        onClick={() => onDeleteGroup(group.id)}
                      >
                        <Trash2 size={12} /> Delete Group
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
