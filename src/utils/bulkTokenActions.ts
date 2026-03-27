/**
 * bulkTokenActions.ts
 * Pure bulk-mutation helpers for token groups.
 *
 * All functions are free of side-effects and React dependencies.
 * Exports: bulkDeleteTokens, bulkMoveTokens, bulkChangeType, bulkAddPrefix,
 *          bulkRemovePrefix, detectCommonPrefix
 */

import { TokenGroup, GeneratedToken, TokenType } from '@/types/token.types';

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Recursively find a group by ID in a TokenGroup tree.
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
 * Recursively update a single group in the tree, leaving all others unchanged.
 */
function updateGroupInTree(
  groups: TokenGroup[],
  groupId: string,
  updater: (group: TokenGroup) => TokenGroup
): TokenGroup[] {
  return groups.map(group => {
    if (group.id === groupId) return updater(group);
    if (group.children?.length) {
      return {
        ...group,
        children: updateGroupInTree(group.children, groupId, updater),
      };
    }
    return group;
  });
}

/**
 * Resolve a candidate token path that may collide with existing paths.
 * Tries candidate-2 through candidate-10 before falling back to candidate-${Date.now()}.
 */
function resolveTokenPathConflict(existingPaths: Set<string>, candidate: string): string {
  if (!existingPaths.has(candidate)) return candidate;

  for (let i = 2; i <= 10; i++) {
    const attempt = `${candidate}-${i}`;
    if (!existingPaths.has(attempt)) return attempt;
  }

  return `${candidate}-${Date.now()}`;
}

/**
 * Rewrite within-group alias values after token paths have been renamed.
 * Only rewrites tokens whose value is an alias string (starts with '{') and
 * contains `.${oldPath}` before a closing '}'.
 *
 * Scope: only tokens within the same group are rewritten.
 */
function rewriteGroupAliases(
  tokens: GeneratedToken[],
  oldPath: string,
  newPath: string
): GeneratedToken[] {
  const escaped = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\.${escaped}(?=})`, 'g');

  return tokens.map(token => {
    if (typeof token.value === 'string' && token.value.includes('{')) {
      return { ...token, value: token.value.replace(pattern, `.${newPath}`) };
    }
    return token;
  });
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * Detect the longest common prefix of an array of paths, trimmed to the last
 * `-` or `.` separator boundary.
 *
 * - Empty or single-element array → returns ''
 * - No common prefix at a boundary → returns ''
 */
export function detectCommonPrefix(paths: string[]): string {
  if (paths.length <= 1) return '';

  const sorted = [...paths].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  let commonLength = 0;
  for (let i = 0; i < first.length && i < last.length; i++) {
    if (first[i] === last[i]) {
      commonLength++;
    } else {
      break;
    }
  }

  if (commonLength === 0) return '';

  const raw = first.slice(0, commonLength);

  // Trim to last separator boundary (- or .)
  const lastDash = raw.lastIndexOf('-');
  const lastDot = raw.lastIndexOf('.');
  const boundaryIndex = Math.max(lastDash, lastDot);

  if (boundaryIndex === -1) return '';

  // Include the separator character itself
  return raw.slice(0, boundaryIndex + 1);
}

/**
 * Remove the specified token IDs from a group, leaving all other groups and
 * tokens unchanged.
 */
export function bulkDeleteTokens(
  groups: TokenGroup[],
  groupId: string,
  tokenIds: Set<string>
): TokenGroup[] {
  if (tokenIds.size === 0) return groups;
  if (!findGroupInTree(groups, groupId)) return groups;

  return updateGroupInTree(groups, groupId, group => ({
    ...group,
    tokens: group.tokens.filter(t => !tokenIds.has(t.id)),
  }));
}

/**
 * Move the specified tokens from source group to destination group.
 * Resolves token path collisions in the destination with auto-suffix.
 *
 * No-ops: same source and dest, or either group not found.
 */
export function bulkMoveTokens(
  groups: TokenGroup[],
  sourceGroupId: string,
  destGroupId: string,
  tokenIds: Set<string>
): TokenGroup[] {
  if (sourceGroupId === destGroupId) return groups;
  if (!findGroupInTree(groups, sourceGroupId)) return groups;
  if (!findGroupInTree(groups, destGroupId)) return groups;

  // Collect tokens to move
  const sourceGroup = findGroupInTree(groups, sourceGroupId)!;
  const tokensToMove = sourceGroup.tokens.filter(t => tokenIds.has(t.id));
  const tokensRemaining = sourceGroup.tokens.filter(t => !tokenIds.has(t.id));

  // Remove from source
  let result = updateGroupInTree(groups, sourceGroupId, group => ({
    ...group,
    tokens: tokensRemaining,
  }));

  // Add to destination, resolving collisions
  result = updateGroupInTree(result, destGroupId, group => {
    const existingPaths = new Set(group.tokens.map(t => t.path));
    const resolvedTokens = tokensToMove.map(token => {
      const resolvedPath = resolveTokenPathConflict(existingPaths, token.path);
      existingPaths.add(resolvedPath);
      return { ...token, path: resolvedPath };
    });
    return {
      ...group,
      tokens: [...group.tokens, ...resolvedTokens],
    };
  });

  return result;
}

/**
 * Set the type of all selected tokens in a group to `newType`.
 * All other fields remain unchanged.
 */
export function bulkChangeType(
  groups: TokenGroup[],
  groupId: string,
  tokenIds: Set<string>,
  newType: TokenType
): TokenGroup[] {
  if (!findGroupInTree(groups, groupId)) return groups;

  return updateGroupInTree(groups, groupId, group => ({
    ...group,
    tokens: group.tokens.map(token =>
      tokenIds.has(token.id) ? { ...token, type: newType } : token
    ),
  }));
}

/**
 * Add a prefix to the paths of selected tokens in a group.
 * Resolves path collisions with auto-suffix.
 * Rewrites within-group alias values that reference renamed paths.
 * Returns groups unchanged if prefix is empty.
 */
export function bulkAddPrefix(
  groups: TokenGroup[],
  groupId: string,
  tokenIds: Set<string>,
  prefix: string
): TokenGroup[] {
  if (!prefix) return groups;
  if (!findGroupInTree(groups, groupId)) return groups;

  return updateGroupInTree(groups, groupId, group => {
    // Build the set of existing paths from non-selected tokens
    const existingPaths = new Set(
      group.tokens.filter(t => !tokenIds.has(t.id)).map(t => t.path)
    );

    // Track old → new path renames for alias rewriting
    const renames: Array<{ oldPath: string; newPath: string }> = [];

    const updatedTokens = group.tokens.map(token => {
      if (!tokenIds.has(token.id)) return token;

      const candidate = `${prefix}${token.path}`;
      const resolvedPath = resolveTokenPathConflict(existingPaths, candidate);
      existingPaths.add(resolvedPath);
      renames.push({ oldPath: token.path, newPath: resolvedPath });

      return { ...token, path: resolvedPath };
    });

    // Rewrite aliases for all renames
    let finalTokens = updatedTokens;
    for (const { oldPath, newPath } of renames) {
      finalTokens = rewriteGroupAliases(finalTokens, oldPath, newPath);
    }

    return { ...group, tokens: finalTokens };
  });
}

/**
 * Strip a prefix from the paths of selected tokens in a group.
 * Silently skips tokens whose path does not start with the prefix.
 * Resolves path collisions with auto-suffix.
 * Rewrites within-group alias values that reference renamed paths.
 * Returns groups unchanged if prefix is empty.
 */
export function bulkRemovePrefix(
  groups: TokenGroup[],
  groupId: string,
  tokenIds: Set<string>,
  prefix: string
): TokenGroup[] {
  if (!prefix) return groups;
  if (!findGroupInTree(groups, groupId)) return groups;

  return updateGroupInTree(groups, groupId, group => {
    // Tokens that are not selected or don't match the prefix are kept as-is
    const existingPaths = new Set(
      group.tokens
        .filter(t => !tokenIds.has(t.id) || !t.path.startsWith(prefix))
        .map(t => t.path)
    );

    const renames: Array<{ oldPath: string; newPath: string }> = [];

    const updatedTokens = group.tokens.map(token => {
      if (!tokenIds.has(token.id)) return token;
      if (!token.path.startsWith(prefix)) return token; // skip silently

      const candidate = token.path.slice(prefix.length);
      const resolvedPath = resolveTokenPathConflict(existingPaths, candidate);
      existingPaths.add(resolvedPath);
      renames.push({ oldPath: token.path, newPath: resolvedPath });

      return { ...token, path: resolvedPath };
    });

    // Rewrite aliases for all renames
    let finalTokens = updatedTokens;
    for (const { oldPath, newPath } of renames) {
      finalTokens = rewriteGroupAliases(finalTokens, oldPath, newPath);
    }

    return { ...group, tokens: finalTokens };
  });
}
