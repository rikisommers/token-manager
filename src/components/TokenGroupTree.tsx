'use client';

import { TokenGroup } from '@/types';
import { parseGroupPath } from '@/utils';

interface TokenGroupTreeProps {
  groups: TokenGroup[];        // The full tree (top-level nodes)
  namespace?: string;          // Optional — shown as read-only label above tree
  selectedGroupId?: string;    // Highlighted node ID — bg-gray-200 on match
  onGroupSelect?: (groupId: string) => void;  // Called on node click to update selection
}

interface FlatNode {
  group: TokenGroup;
  depth: number;
  displayLabel: string;  // the LAST segment of parseGroupPath(group.name)
}

function flattenTree(groups: TokenGroup[], depth: number = 0): FlatNode[] {
  const result: FlatNode[] = [];
  for (const group of groups) {
    const segments = parseGroupPath(group.name);
    const displayLabel = segments[segments.length - 1] ?? group.name;
    result.push({ group, depth, displayLabel });
    if (group.children && group.children.length > 0) {
      result.push(...flattenTree(group.children, depth + 1));
    }
  }
  return result;
}

export function TokenGroupTree({ groups, namespace, selectedGroupId, onGroupSelect }: TokenGroupTreeProps) {
  const nodes = flattenTree(groups);

  return (
    <div className="flex flex-col">
      {/* Section heading */}
      <div className="px-4 py-2 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Groups</span>
      </div>
      {/* Namespace label */}
      {namespace && <p className="px-3 py-1 text-xs text-gray-400">{namespace}</p>}
      {/* Empty state */}
      {nodes.length === 0 && <p className="px-4 py-3 text-xs text-gray-400">No groups yet</p>}
      {/* Tree nodes */}
      {nodes.map(({ group, depth, displayLabel }) => (
        <div
          key={group.id}
          style={{ paddingLeft: depth * 16 + 8 }}
          className={`py-1 pr-3 text-sm cursor-pointer ${
            group.id === selectedGroupId
              ? 'bg-gray-200 text-gray-900'
              : 'hover:bg-gray-100 text-gray-700'
          } ${
            group.children && group.children.length > 0 ? 'font-semibold' : 'font-normal'
          }`}
          onClick={() => onGroupSelect?.(group.id)}
        >
          {displayLabel}
        </div>
      ))}
    </div>
  );
}
