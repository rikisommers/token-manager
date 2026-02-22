import { TokenGroup, GeneratedToken, ToastMessage } from '../types';

/**
 * Token utility functions
 * Pure helper functions for token manipulation and path generation
 */

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Build full path for a token including group hierarchy
 */
export const buildFullPath = (group: TokenGroup, tokenPath: string): string => {
  const groupPath = group.path || group.name;
  return tokenPath ? `${groupPath}.${tokenPath}` : groupPath;
};

/**
 * Get path prefix for a token group including global namespace
 */
export const getPathPrefix = (
  group: TokenGroup,
  tokenGroups: TokenGroup[],
  globalNamespace: string
): string => {
  const parts = [];
  if (globalNamespace.trim()) {
    parts.push(globalNamespace.trim());
  }

  const visitedGroups = new Set<string>();
  let currentGroup: TokenGroup | null = group;
  const pathFromCurrentToRoot: string[] = [];

  while (currentGroup && !visitedGroups.has(currentGroup.id)) {
    visitedGroups.add(currentGroup.id);
    pathFromCurrentToRoot.unshift(currentGroup.name);

    if (currentGroup.parent) {
      currentGroup = findGroupById(tokenGroups, currentGroup.parent);
    } else {
      currentGroup = null;
    }
  }

  parts.push(...pathFromCurrentToRoot);
  return parts.length > 0 ? parts.join('.') + '.' : '';
};

/**
 * Find a group by ID in nested structure
 */
export const findGroupById = (groups: TokenGroup[], groupId: string): TokenGroup | null => {
  for (const group of groups) {
    if (group.id === groupId) {
      return group;
    }
    if (group.children && group.children.length > 0) {
      const found = findGroupById(group.children, groupId);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Get all groups (including nested ones) in a flat array
 */
export const getAllGroups = (groups: TokenGroup[]): TokenGroup[] => {
  const allGroups: TokenGroup[] = [];
  const traverse = (groupList: TokenGroup[]) => {
    for (const group of groupList) {
      allGroups.push(group);
      if (group.children && group.children.length > 0) {
        traverse(group.children);
      }
    }
  };
  traverse(groups);
  return allGroups;
};

/**
 * Find parent groups hierarchy
 */
export const getParentGroups = (
  group: TokenGroup,
  allGroups: TokenGroup[]
): TokenGroup[] => {
  const parents: TokenGroup[] = [];
  let currentGroup = group;

  while (currentGroup.parent) {
    const parentGroup = findGroupById(allGroups, currentGroup.parent);
    if (parentGroup) {
      parents.unshift(parentGroup);
      currentGroup = parentGroup;
    } else {
      break;
    }
  }

  return parents;
};

/**
 * Get token value placeholder based on type
 */
export const getValuePlaceholder = (type: string): string => {
  const placeholders: Record<string, string> = {
    color: '#FF5733, rgba(255, 87, 51, 1), {token.color.base.red.value}',
    dimension: '16px, 1rem, 2em, {token.size.base.value}',
    fontFamily: 'Inter, Arial, sans-serif',
    fontWeight: '400, 500, bold, {token.font.weight.medium.value}',
    fontSize: '16px, 1rem, {token.font.size.base.value}',
    lineHeight: '1.5, 24px, {token.font.lineHeight.normal.value}',
    letterSpacing: '0.1em, 1px, {token.font.letterSpacing.wide.value}',
    borderRadius: '4px, 0.25rem, {token.radius.small.value}',
    borderWidth: '1px, 2px, {token.border.width.thin.value}',
    opacity: '0.8, 0.5, {token.opacity.semi.value}',
    duration: '200ms, 0.3s, {token.animation.duration.fast.value}',
    cubicBezier: 'ease-in-out, cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1), {token.shadow.small.value}',
    textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
    number: '16, 1.5, 400, {token.scale.base.value}',
    string: 'value, "text content", {token.content.label.value}'
  };

  return placeholders[type] || 'Enter value, e.g., {token.reference.value}';
};

/**
 * Validate token path format
 */
export const validateTokenPath = (path: string): { isValid: boolean; error?: string } => {
  if (!path || !path.trim()) {
    return { isValid: false, error: 'Token path is required' };
  }

  // Check for valid characters (letters, numbers, dots, hyphens, underscores)
  if (!/^[a-zA-Z0-9._-]+$/.test(path)) {
    return { isValid: false, error: 'Token path can only contain letters, numbers, dots, hyphens, and underscores' };
  }

  // Check that it doesn't start or end with a dot
  if (path.startsWith('.') || path.endsWith('.')) {
    return { isValid: false, error: 'Token path cannot start or end with a dot' };
  }

  // Check for consecutive dots
  if (path.includes('..')) {
    return { isValid: false, error: 'Token path cannot contain consecutive dots' };
  }

  return { isValid: true };
};

/**
 * Validate token value based on type
 */
export const validateTokenValue = (value: any, type: string): { isValid: boolean; error?: string } => {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: 'Token value is required' };
  }

  switch (type) {
    case 'color':
      return validateColorValue(value);
    case 'dimension':
      return validateDimensionValue(value);
    case 'number':
      return validateNumberValue(value);
    default:
      return { isValid: true };
  }
};

/**
 * Validate color value formats
 */
export const validateColorValue = (value: string): { isValid: boolean; error?: string } => {
  if (typeof value !== 'string') {
    return { isValid: false, error: 'Color value must be a string' };
  }

  // Check for token reference
  if (value.match(/^\{[^}]+\}$/)) {
    return { isValid: true };
  }

  // Check for hex color
  if (value.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/)) {
    return { isValid: true };
  }

  // Check for rgb/rgba
  if (value.match(/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/)) {
    return { isValid: true };
  }

  // Check for hsl/hsla
  if (value.match(/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+)?\s*\)$/)) {
    return { isValid: true };
  }

  // Check for named colors (basic validation)
  const namedColors = ['transparent', 'currentColor', 'inherit', 'initial', 'unset'];
  if (namedColors.includes(value.toLowerCase())) {
    return { isValid: true };
  }

  return { isValid: false, error: 'Invalid color format. Use hex (#FF0000), rgb(255,0,0), hsl(0,100%,50%), or token reference ({token.color.red.value})' };
};

/**
 * Validate dimension value formats
 */
export const validateDimensionValue = (value: string): { isValid: boolean; error?: string } => {
  if (typeof value !== 'string') {
    return { isValid: false, error: 'Dimension value must be a string' };
  }

  // Check for token reference
  if (value.match(/^\{[^}]+\}$/)) {
    return { isValid: true };
  }

  // Check for valid dimension units
  if (value.match(/^\d*\.?\d+(px|em|rem|%|vh|vw|vmin|vmax|ch|ex)$/)) {
    return { isValid: true };
  }

  return { isValid: false, error: 'Invalid dimension format. Use values like 16px, 1rem, 50%, or token reference ({token.size.base.value})' };
};

/**
 * Validate number value
 */
export const validateNumberValue = (value: any): { isValid: boolean; error?: string } => {
  if (typeof value === 'number' && !isNaN(value)) {
    return { isValid: true };
  }

  if (typeof value === 'string') {
    // Check for token reference
    if (value.match(/^\{[^}]+\}$/)) {
      return { isValid: true };
    }

    // Check if string can be converted to number
    const num = parseFloat(value);
    if (!isNaN(num) && isFinite(num)) {
      return { isValid: true };
    }
  }

  return { isValid: false, error: 'Invalid number format. Use numeric values or token reference ({token.number.value})' };
};

/**
 * Format token value for display
 */
export const formatTokenValue = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

/**
 * Check if a value is a token reference
 */
export const isTokenReference = (value: any): boolean => {
  return typeof value === 'string' && /^\{[^}]+\}$/.test(value);
};

/**
 * Extract token reference path from value
 */
export const extractTokenReferencePath = (value: string): string | null => {
  const match = value.match(/^\{([^}]+)\}$/);
  if (match) {
    let path = match[1];
    // Remove .value suffix if present
    if (path.endsWith('.value')) {
      path = path.slice(0, -6);
    }
    return path;
  }
  return null;
};

/**
 * Search tokens by path or value
 */
export const searchTokens = (
  groups: TokenGroup[],
  query: string
): Array<{ token: GeneratedToken; group: TokenGroup; fullPath: string }> => {
  const results: Array<{ token: GeneratedToken; group: TokenGroup; fullPath: string }> = [];
  const allGroups = getAllGroups(groups);

  for (const group of allGroups) {
    for (const token of group.tokens) {
      const fullPath = buildFullPath(group, token.path);
      const valueStr = formatTokenValue(token.value);

      if (
        fullPath.toLowerCase().includes(query.toLowerCase()) ||
        valueStr.toLowerCase().includes(query.toLowerCase()) ||
        (token.description && token.description.toLowerCase().includes(query.toLowerCase()))
      ) {
        results.push({ token, group, fullPath });
      }
    }
  }

  return results;
};

/**
 * Sort tokens by path
 */
export const sortTokensByPath = (
  tokens: Array<{ token: GeneratedToken; group: TokenGroup; fullPath: string }>
): Array<{ token: GeneratedToken; group: TokenGroup; fullPath: string }> => {
  return tokens.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
};