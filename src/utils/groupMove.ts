/**
 * groupMove.ts
 * Pure utility for drag-and-drop group reordering with full cascade.
 *
 * Exports: FlatNode, flattenTree, buildTreeFromFlat, applyGroupMove
 */

import { TokenGroup, GeneratedToken } from '@/types/token.types';
import { ITheme } from '@/types/theme.types';
import { parseGroupPath } from '@/utils/tree.utils';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface FlatNode {
  group: TokenGroup;
  depth: number;
  parentId: string | null;
  index: number;         // index within sibling array
  displayLabel: string;
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Recursively flatten a token group tree into an ordered array of FlatNode.
 */
export function flattenTree(
  groups: TokenGroup[],
  parentId: string | null = null,
  depth = 0
): FlatNode[] {
  const result: FlatNode[] = [];

  for (let index = 0; index < groups.length; index++) {
    const group = groups[index];
    const segments = parseGroupPath(group.name);
    const displayLabel = segments[segments.length - 1] ?? group.name;

    result.push({ group, depth, parentId, index, displayLabel });

    if (group.children?.length) {
      result.push(...flattenTree(group.children, group.id, depth + 1));
    }
  }

  return result;
}

/**
 * Rebuild a nested TokenGroup tree from a flat array.
 * Children are sorted by their `index` field to honour drag order.
 */
export function buildTreeFromFlat(flat: FlatNode[]): TokenGroup[] {
  const childrenMap = new Map<string | null, FlatNode[]>();

  for (const node of flat) {
    const bucket = childrenMap.get(node.parentId) ?? [];
    bucket.push(node);
    childrenMap.set(node.parentId, bucket);
  }

  function buildLevel(parentId: string | null): TokenGroup[] {
    const nodes = childrenMap.get(parentId) ?? [];
    const sorted = [...nodes].sort((a, b) => a.index - b.index);
    return sorted.map(node => ({
      ...node.group,
      children: buildLevel(node.group.id),
    }));
  }

  return buildLevel(null);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface ApplyGroupMoveResult {
  groups: TokenGroup[];
  themes: ITheme[];
}

/**
 * Apply a drag-and-drop group move with full cascade:
 * - Sibling reorder: reorders children arrays and syncs theme snapshots.
 * - Reparenting: rewrites group IDs, token IDs, alias paths, and theme maps.
 */
export function applyGroupMove(
  groups: TokenGroup[],
  activeId: string,
  overId: string,
  themes: ITheme[] = []
): ApplyGroupMoveResult {
  const flatNodes = flattenTree(groups);

  const activeIndex = flatNodes.findIndex(n => n.group.id === activeId);
  const overIndex = flatNodes.findIndex(n => n.group.id === overId);

  if (activeIndex === -1 || overIndex === -1 || activeId === overId) {
    return { groups, themes };
  }

  const activeNode = flatNodes[activeIndex];
  const overNode = flatNodes[overIndex];

  const newParentId = overNode.parentId;
  const isReparenting = activeNode.parentId !== newParentId;

  // Remove active node from flat list
  const updatedFlat = flatNodes.filter((_, i) => i !== activeIndex);

  // Find over item's new position in the updated list
  const newOverIndex = updatedFlat.findIndex(n => n.group.id === overId);
  const insertAt = newOverIndex === -1 ? updatedFlat.length : newOverIndex;

  // Insert active node before the over node (same-level sibling)
  const movedNode: FlatNode = {
    ...activeNode,
    parentId: newParentId,
    depth: overNode.depth,
  };
  updatedFlat.splice(insertAt, 0, movedNode);

  // Recompute sibling indices for each parent
  recomputeSiblingIndices(updatedFlat);

  if (!isReparenting) {
    // Sibling reorder only — no ID rewrite needed
    const newGroups = buildTreeFromFlat(updatedFlat);
    const syncedThemes = themes.map(theme => ({
      ...theme,
      tokens: syncThemeTokenOrder(theme.tokens, newGroups),
    }));
    return { groups: newGroups, themes: syncedThemes };
  }

  // ---- Reparenting cascade ----

  // Build intermediate tree to locate the moved group node
  const intermediateGroups = buildTreeFromFlat(updatedFlat);

  const segments = parseGroupPath(activeNode.group.name);
  const leafName = (segments[segments.length - 1] ?? activeNode.group.name).toLowerCase().replace(/\s+/g, '-');

  const oldSlashPrefix = activeNode.group.id;
  const rawNewPrefix = newParentId ? `${newParentId}/${leafName}` : leafName;
  const newSlashPrefix = resolveCollisionFreeId(intermediateGroups, newParentId, leafName, rawNewPrefix);

  const movedGroup = findGroupInTree(intermediateGroups, activeId);
  if (!movedGroup) {
    return { groups: intermediateGroups, themes };
  }

  const rewrittenMoved = rewriteSubtreeIds(movedGroup, oldSlashPrefix, newSlashPrefix);

  // Replace moved group in tree with the rewritten version
  const groupsWithRewrite = replaceGroupInTree(intermediateGroups, activeId, rewrittenMoved);

  const oldDotPrefix = oldSlashPrefix.replaceAll('/', '.');
  const newDotPrefix = newSlashPrefix.replaceAll('/', '.');

  const finalGroups = rewriteAliasesInTree(groupsWithRewrite, oldDotPrefix, newDotPrefix);

  const updatedThemes = themes.map(theme => {
    const rewrittenTokens = rewriteSubtreeIdsInArray(theme.tokens, oldSlashPrefix, newSlashPrefix);
    const aliasedTokens = rewriteAliasesInTree(rewrittenTokens, oldDotPrefix, newDotPrefix);
    const migratedTheme = migrateThemeGroupKeys(theme, oldSlashPrefix, newSlashPrefix);
    return { ...migratedTheme, tokens: aliasedTokens };
  });

  return { groups: finalGroups, themes: updatedThemes };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Recompute the `index` field for each node within its sibling group.
 */
function recomputeSiblingIndices(flat: FlatNode[]): void {
  const counters = new Map<string | null, number>();
  for (const node of flat) {
    const current = counters.get(node.parentId) ?? 0;
    node.index = current;
    counters.set(node.parentId, current + 1);
  }
}

/**
 * Compute a collision-free slash-prefix for the moved group under its new parent.
 * Appends -2, -3, … up to -10 if a sibling already has the same leaf name.
 */
function resolveCollisionFreeId(
  groups: TokenGroup[],
  parentId: string | null,
  leafName: string,
  candidate: string
): string {
  const siblings = getSiblings(groups, parentId);
  const siblingIds = siblings.map(s => s.id);

  if (!siblingIds.includes(candidate)) return candidate;

  const basePrefix = parentId ? `${parentId}/${leafName}` : leafName;
  for (let i = 2; i <= 10; i++) {
    const attempt = `${basePrefix}-${i}`;
    if (!siblingIds.includes(attempt)) return attempt;
  }

  return `${basePrefix}-${Date.now()}`;
}

/**
 * Get direct children of a parent from a nested tree.
 */
function getSiblings(groups: TokenGroup[], parentId: string | null): TokenGroup[] {
  if (parentId === null) return groups;
  const parent = findGroupInTree(groups, parentId);
  return parent?.children ?? [];
}

/**
 * Recursively find a group by ID.
 */
function findGroupInTree(groups: TokenGroup[], id: string): TokenGroup | null {
  for (const group of groups) {
    if (group.id === id) return group;
    if (group.children?.length) {
      const found = findGroupInTree(group.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Replace a specific group node (by ID) in a nested tree.
 */
function replaceGroupInTree(
  groups: TokenGroup[],
  targetId: string,
  replacement: TokenGroup
): TokenGroup[] {
  return groups.map(group => {
    if (group.id === targetId) return replacement;
    if (group.children?.length) {
      return {
        ...group,
        children: replaceGroupInTree(group.children, targetId, replacement),
      };
    }
    return group;
  });
}

/**
 * Rewrite all IDs, paths, parents, and token IDs in a group subtree.
 */
function rewriteSubtreeIds(
  group: TokenGroup,
  oldPrefix: string,
  newPrefix: string
): TokenGroup {
  const newId = group.id.replace(oldPrefix, newPrefix);
  const newPath = group.path ? group.path.replace(oldPrefix, newPrefix) : undefined;
  const newParent = group.parent ? group.parent.replace(oldPrefix, newPrefix) : undefined;

  const newTokens: GeneratedToken[] = group.tokens.map(t => ({
    ...t,
    id: t.id.replace(oldPrefix, newPrefix),
    path: t.path ? t.path.replace(oldPrefix, newPrefix) : t.path,
  }));

  const newChildren: TokenGroup[] = (group.children ?? []).map(child =>
    rewriteSubtreeIds(child, oldPrefix, newPrefix)
  );

  return {
    ...group,
    id: newId,
    ...(newPath !== undefined ? { path: newPath } : {}),
    ...(newParent !== undefined ? { parent: newParent } : {}),
    tokens: newTokens,
    children: newChildren,
  };
}

/**
 * Rewrite IDs within a flat array of root groups (used for theme token arrays).
 */
function rewriteSubtreeIdsInArray(
  groups: TokenGroup[],
  oldPrefix: string,
  newPrefix: string
): TokenGroup[] {
  return groups.map(group => {
    if (group.id === oldPrefix || group.id.startsWith(oldPrefix + '/')) {
      return rewriteSubtreeIds(group, oldPrefix, newPrefix);
    }
    if (group.children?.length) {
      return {
        ...group,
        children: rewriteSubtreeIdsInArray(group.children, oldPrefix, newPrefix),
      };
    }
    return group;
  });
}

/**
 * Rewrite alias references across an entire tree.
 * Matches `{oldDotPrefix.anything}` and replaces prefix.
 */
function rewriteAliasesInTree(
  groups: TokenGroup[],
  oldDotPrefix: string,
  newDotPrefix: string
): TokenGroup[] {
  const escaped = escapeRegex(oldDotPrefix);
  const pattern = new RegExp(`\\{${escaped}\\.`, 'g');
  const replacement = `{${newDotPrefix}.`;

  return groups.map(group => {
    const newTokens = group.tokens.map(t => {
      if (typeof t.value === 'string' && t.value.startsWith('{')) {
        return { ...t, value: t.value.replace(pattern, replacement) };
      }
      return t;
    });

    const newChildren = group.children?.length
      ? rewriteAliasesInTree(group.children, oldDotPrefix, newDotPrefix)
      : group.children;

    return { ...group, tokens: newTokens, children: newChildren };
  });
}

/**
 * Rename keys in `theme.groups` that start with oldSlashPrefix.
 */
function migrateThemeGroupKeys(
  theme: ITheme,
  oldSlashPrefix: string,
  newSlashPrefix: string
): ITheme {
  const updatedGroups: Record<string, ITheme['groups'][string]> = {};

  for (const [key, value] of Object.entries(theme.groups)) {
    if (key === oldSlashPrefix || key.startsWith(oldSlashPrefix + '/')) {
      const newKey = key.replace(oldSlashPrefix, newSlashPrefix);
      updatedGroups[newKey] = value;
    } else {
      updatedGroups[key] = value;
    }
  }

  return { ...theme, groups: updatedGroups };
}

/**
 * Apply the same child ordering from masterGroups to themeTokens (match by group ID).
 * Used for sibling-reorder case to keep theme snapshots in sync with master.
 */
function syncThemeTokenOrder(
  themeTokens: TokenGroup[],
  masterGroups: TokenGroup[]
): TokenGroup[] {
  const themeMap = new Map<string, TokenGroup>();
  for (const g of themeTokens) {
    themeMap.set(g.id, g);
  }

  return masterGroups.map(masterGroup => {
    const themeGroup = themeMap.get(masterGroup.id);
    if (!themeGroup) return masterGroup;

    const syncedChildren =
      masterGroup.children?.length
        ? syncThemeTokenOrder(themeGroup.children ?? [], masterGroup.children)
        : themeGroup.children;

    return { ...themeGroup, children: syncedChildren };
  });
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
