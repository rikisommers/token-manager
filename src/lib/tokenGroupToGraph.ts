import type { Node, Edge } from '@xyflow/react';
import type { TokenGroup, GeneratedToken } from '@/types';
import type { GroupNodeData } from '@/components/graph/nodes/GroupNode';
import type { TokenNodeData } from '@/components/graph/nodes/TokenNode';
import type { AliasNodeData } from '@/components/graph/nodes/AliasNode';

const GROUP_NODE_W = 200;
const GROUP_NODE_H = 80;
const TOKEN_NODE_W = 260;
const TOKEN_NODE_H = 110;
const H_GAP = 60;
const V_GAP = 40;

function isAlias(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('{') && value.endsWith('}');
}

function resolveColor(value: string, allGroups: TokenGroup[], visited = new Set<string>()): string | undefined {
  if (!isAlias(value)) return value.startsWith('#') ? value : undefined;
  const clean = value.slice(1, -1).replace(/\.value$/, '');
  if (visited.has(clean)) return undefined; // circular alias — bail out
  visited.add(clean);
  const found = findTokenByPath(clean, allGroups);
  if (!found) return undefined;
  if (isAlias(String(found.value))) return resolveColor(String(found.value), allGroups, visited);
  return String(found.value);
}

function findTokenByPath(path: string, groups: TokenGroup[]): GeneratedToken | null {
  for (const group of groups) {
    for (const token of group.tokens) {
      const full = `${group.path ?? group.name}.${token.path}`;
      if (full === path || path.endsWith('.' + full) || full.endsWith('.' + path)) return token;
    }
    if (group.children) {
      const found = findTokenByPath(path, group.children);
      if (found) return found;
    }
  }
  return null;
}

function findTokenNodeId(reference: string, allGroups: TokenGroup[]): string | null {
  const clean = reference.slice(1, -1).replace(/\.value$/, '');
  const found = findTokenByPath(clean, allGroups);
  if (!found) return null;
  return found.id;
}

// ─── Group Structure Graph ────────────────────────────────────────────────────

function layoutGroupNodes(
  group: TokenGroup,
  x: number,
  y: number,
  nodes: Node[],
  edges: Edge[]
) {
  const nodeId = `group-${group.id}`;
  nodes.push({
    id: nodeId,
    type: 'groupNode',
    position: { x, y },
    data: {
      label: group.name,
      tokenCount: group.tokens.length,
      childCount: group.children?.length ?? 0,
      level: group.level,
    } satisfies GroupNodeData,
  });

  if (!group.children?.length) return GROUP_NODE_H;

  let childY = y + GROUP_NODE_H + V_GAP;
  const childCount = group.children.length;
  const totalW = childCount * GROUP_NODE_W + (childCount - 1) * H_GAP;
  let childX = x - totalW / 2 + GROUP_NODE_W / 2;

  for (const child of group.children) {
    const childNodeId = `group-${child.id}`;
    edges.push({
      id: `edge-${nodeId}-${childNodeId}`,
      source: nodeId,
      target: childNodeId,
      type: 'default',
      style: { stroke: '#94a3b8', strokeWidth: 1.5 },
    });
    const childH = layoutGroupNodes(child, childX, childY, nodes, edges);
    childX += GROUP_NODE_W + H_GAP;
    childY = Math.max(childY, childY + childH);
  }

  return childY - y;
}

export function buildGroupGraph(group: TokenGroup): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  layoutGroupNodes(group, 0, 0, nodes, edges);
  return { nodes, edges };
}

/**
 * Build a unified graph showing all top-level groups in a grid layout.
 * Each group maintains its internal hierarchy while being positioned
 * in a grid to avoid overlaps.
 */
export function buildAllGroupsGraph(groups: TokenGroup[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  if (groups.length === 0) {
    return { nodes, edges };
  }
  
  // Calculate grid layout
  const cols = Math.ceil(Math.sqrt(groups.length));
  const rows = Math.ceil(groups.length / cols);
  
  // Calculate spacing based on estimated group sizes
  const maxGroupWidth = GROUP_NODE_W + (3 * (GROUP_NODE_W + H_GAP)); // Assume max 4 children per group
  const maxGroupHeight = GROUP_NODE_H + (2 * (GROUP_NODE_H + V_GAP)); // Assume max 3 levels deep
  const gridSpacingX = maxGroupWidth + 100; // Extra padding between groups
  const gridSpacingY = maxGroupHeight + 80;
  
  // Position each group in the grid
  groups.forEach((group, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * gridSpacingX;
    const y = row * gridSpacingY;
    
    // Layout this group's hierarchy starting at the calculated position
    layoutGroupNodes(group, x, y, nodes, edges);
  });
  
  return { nodes, edges };
}

// ─── Token Detail Graph ───────────────────────────────────────────────────────

function buildTokenNode(
  token: GeneratedToken,
  groupPath: string,
  allGroups: TokenGroup[],
  x: number,
  y: number
): Node {
  if (isAlias(String(token.value))) {
    const ref = String(token.value);
    const resolved = resolveAlias(ref, allGroups);
    const resolvedColor = token.type === 'color' ? resolveColor(ref, allGroups) : undefined;
    return {
      id: token.id,
      type: 'aliasNode',
      position: { x, y },
      data: {
        label: token.path,
        type: token.type,
        reference: ref,
        resolvedValue: resolved ?? ref,
        resolvedColor,
        groupPath,
        isUnresolved: resolved === null,
      } satisfies AliasNodeData,
    };
  }

  const resolvedColor = token.type === 'color' ? resolveColor(String(token.value), allGroups) : undefined;
  return {
    id: token.id,
    type: 'tokenNode',
    position: { x, y },
    data: {
      label: token.path,
      type: token.type,
      value: token.value,
      resolvedColor,
      groupPath,
    } satisfies TokenNodeData,
  };
}

function resolveAlias(reference: string, allGroups: TokenGroup[], visited = new Set<string>()): string | null {
  if (visited.has(reference)) return null;
  visited.add(reference);
  const clean = reference.slice(1, -1).replace(/\.value$/, '');
  const token = findTokenByPath(clean, allGroups);
  if (!token) return null;
  if (isAlias(String(token.value))) return resolveAlias(String(token.value), allGroups, visited);
  return String(token.value);
}

/**
 * Build a token detail graph starting from a single selected token.
 * Follows alias reference chains and lays out nodes left-to-right.
 */
export function buildTokenDetailGraph(
  selectedToken: GeneratedToken,
  selectedGroupPath: string,
  allGroups: TokenGroup[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const visited = new Set<string>();

  function addTokenChain(token: GeneratedToken, groupPath: string, x: number, y: number) {
    if (visited.has(token.id)) return;
    visited.add(token.id);

    const node = buildTokenNode(token, groupPath, allGroups, x, y);
    nodes.push(node);

    if (isAlias(String(token.value))) {
      const targetId = findTokenNodeId(String(token.value), allGroups);
      if (targetId) {
        const targetToken = findTokenById(targetId, allGroups);
        if (targetToken && !visited.has(targetId)) {
          const targetGroup = findGroupForToken(targetId, allGroups);
          addTokenChain(
            targetToken,
            targetGroup?.path ?? targetGroup?.name ?? '',
            x + TOKEN_NODE_W + H_GAP,
            y
          );
          edges.push({
            id: `ref-${token.id}-${targetId}`,
            source: token.id,
            target: targetId,
            type: 'referenceEdge',
            animated: true,
          });
        }
      }
    }
  }

  addTokenChain(selectedToken, selectedGroupPath, 0, 0);
  return { nodes, edges };
}

function findTokenById(id: string, groups: TokenGroup[]): GeneratedToken | null {
  for (const group of groups) {
    const found = group.tokens.find(t => t.id === id);
    if (found) return found;
    if (group.children) {
      const child = findTokenById(id, group.children);
      if (child) return child;
    }
  }
  return null;
}

function findGroupForToken(tokenId: string, groups: TokenGroup[]): TokenGroup | null {
  for (const group of groups) {
    if (group.tokens.some(t => t.id === tokenId)) return group;
    if (group.children) {
      const found = findGroupForToken(tokenId, group.children);
      if (found) return found;
    }
  }
  return null;
}
