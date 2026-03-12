'use client';

import { TokenGroup } from '@/types';
import { parseGroupPath } from '@/utils';

interface GroupBreadcrumbProps {
  groups: TokenGroup[];
  selectedGroupId: string;
  onSelect: (groupId: string) => void;
}

/**
 * Recursively traverses the TokenGroup tree to find the full ancestor chain
 * from root to the target group (inclusive), in root-to-target order.
 *
 * @returns The path array if found, or [] if not found.
 */
function findAncestors(
  groups: TokenGroup[],
  targetId: string,
  path: TokenGroup[] = []
): TokenGroup[] {
  for (const group of groups) {
    const currentPath = [...path, group];
    if (group.id === targetId) return currentPath;
    if (group.children?.length) {
      const found = findAncestors(group.children, targetId, currentPath);
      if (found.length > 0) return found;
    }
  }
  return [];
}

/**
 * GroupBreadcrumb — renders a slash-separated path trail reflecting the
 * selected group's full ancestry.
 *
 * - Ancestor segments (all except the last) are clickable buttons that call
 *   onSelect with that ancestor's group ID.
 * - The last (current) segment is plain non-clickable text.
 * - Returns null when no group is selected or when the group is not found in
 *   the tree.
 */
export function GroupBreadcrumb({
  groups,
  selectedGroupId,
  onSelect,
}: GroupBreadcrumbProps) {
  if (!selectedGroupId) return null;

  const ancestors = findAncestors(groups, selectedGroupId);
  if (ancestors.length === 0) return null;

  return (
    <nav
      aria-label="breadcrumb"
      className="text-sm py-2 px-6 border-b border-gray-100 bg-white flex items-center gap-1"
    >
      {ancestors.map((group, index) => {
        const isLast = index === ancestors.length - 1;
        // Use the last segment of the parsed path as the display label —
        // consistent with how TokenGroupTree computes FlatNode.displayLabel.
        const segments = parseGroupPath(group.name);
        const label = segments[segments.length - 1];

        return (
          <span key={group.id} className="flex items-center gap-1">
            {index > 0 && (
              <span className="text-gray-400 text-sm">/</span>
            )}
            {isLast ? (
              <span className="text-gray-800 text-sm font-medium">{label}</span>
            ) : (
              <button
                type="button"
                onClick={() => onSelect(group.id)}
                className="text-gray-500 hover:text-blue-600 hover:underline cursor-pointer text-sm"
              >
                {label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
