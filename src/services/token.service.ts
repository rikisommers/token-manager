import {
  GeneratedToken,
  TokenGroup,
  TokenSet,
  TokenType,
  StructureType,
  StructureDetectionResult,
  ValidationResult
} from '../types';

/**
 * Token Service
 * Handles token processing, structure detection, and transformation
 */
export class TokenService {
  /**
   * Detect whether the token structure is Style Dictionary format (A) or legacy namespace wrapper (B)
   */
  detectStructureType(tokenSet: any): StructureDetectionResult {
    if (!tokenSet || typeof tokenSet !== 'object') {
      return {
        type: 'A',
        description: 'Invalid token set - defaulting to Structure A'
      };
    }

    const topLevelKeys = Object.keys(tokenSet);
    console.log('🔍 Detecting structure type from top-level keys:', topLevelKeys);

    // Detect Structure B: Single top-level key that looks like a namespace
    if (topLevelKeys.length === 1) {
      const singleKey = topLevelKeys[0];
      const singleKeyLower = singleKey.toLowerCase();

      // Common namespace patterns
      const namespacePatterns = ['token', 'tokens', 'design', 'ds', 'brand', 'company', 'system'];
      const looksLikeNamespace = namespacePatterns.some(pattern =>
        singleKeyLower.includes(pattern) || pattern.includes(singleKeyLower)
      );

      // Additional validation: check if the content under the key is complex enough to be a token structure
      const content = tokenSet[singleKey];
      const hasComplexNesting = content && typeof content === 'object' &&
        Object.keys(content).some(key => typeof content[key] === 'object');

      if (looksLikeNamespace && hasComplexNesting) {
        console.log(`📦 Structure B detected - Namespace wrapper: "${singleKey}"`);
        return {
          type: 'B',
          extractedNamespace: singleKey,
          description: `Structure B - Single namespace wrapper: "${singleKey}"`
        };
      }
    }

    // Default to Structure A
    console.log('🏗️ Structure A detected - Flat structure (no namespace wrapper)');
    return {
      type: 'A',
      description: 'Structure A - Style Dictionary flat format'
    };
  }

  /**
   * Process imported tokens and create token groups
   */
  processImportedTokens(
    tokenSet: any,
    globalNamespace: string
  ): { groups: TokenGroup[]; detectedGlobalNamespace: string } {
    const structureResult = this.detectStructureType(tokenSet);
    let actualTokenSet = tokenSet;
    let detectedGlobalNamespace = globalNamespace;

    // Handle Structure B: Extract content from namespace wrapper
    if (structureResult.type === 'B' && structureResult.extractedNamespace) {
      actualTokenSet = tokenSet[structureResult.extractedNamespace];
      detectedGlobalNamespace = structureResult.extractedNamespace;
      console.log(`🎯 Structure B - Using extracted namespace: "${detectedGlobalNamespace}"`);
    } else if (structureResult.type === 'A') {
      // For Structure A, use provided global namespace or detect from common path prefix
      if (!globalNamespace.trim()) {
        const detectedFromPaths = this.detectGlobalNamespaceFromPaths(actualTokenSet);
        if (detectedFromPaths) {
          detectedGlobalNamespace = detectedFromPaths;
          console.log(`✂️ Structure A - Detected global namespace from paths: "${detectedGlobalNamespace}"`);
          // Strip the detected namespace from token paths
          actualTokenSet = this.stripGlobalNamespaceFromPaths(actualTokenSet, detectedGlobalNamespace);
        } else {
          detectedGlobalNamespace = 'token'; // Default Style Dictionary convention
          console.log(`🎯 Structure A - Using default global namespace: "${detectedGlobalNamespace}"`);
        }
      }
    }

    const groups = this.createTokenGroupsFromTokenSet(actualTokenSet, structureResult.type);

    return {
      groups,
      detectedGlobalNamespace
    };
  }

  private detectGlobalNamespaceFromPaths(tokenSet: any): string | null {
    const paths = this.getAllTokenPaths(tokenSet);
    if (paths.length === 0) return null;

    // Find common prefix among all paths
    const firstPath = paths[0].split('.');
    let commonPrefix = firstPath[0];

    for (let i = 1; i < paths.length; i++) {
      const currentPath = paths[i].split('.');
      if (currentPath[0] !== commonPrefix) {
        return null; // No common prefix
      }
    }

    return commonPrefix;
  }

  private stripGlobalNamespaceFromPaths(tokenSet: any, namespace: string): any {
    const result = {};
    const processObject = (obj: any, currentPath: string[] = []): any => {
      const processed = {};

      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object') {
          if (this.isTokenDefinition(value)) {
            // This is a token - keep as is
            processed[key] = value;
          } else {
            // This is a nested group - recurse
            processed[key] = processObject(value, [...currentPath, key]);
          }
        }
      }

      return processed;
    };

    // If the top level has the namespace, extract its content
    if (tokenSet[namespace]) {
      return processObject(tokenSet[namespace]);
    }

    return processObject(tokenSet);
  }

  private getAllTokenPaths(tokenSet: any): string[] {
    const paths: string[] = [];

    const traverse = (obj: any, currentPath: string[] = []) => {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = [...currentPath, key];

        if (value && typeof value === 'object') {
          if (this.isTokenDefinition(value)) {
            paths.push(newPath.join('.'));
          } else {
            traverse(value, newPath);
          }
        }
      }
    };

    traverse(tokenSet);
    return paths;
  }

  /**
   * Create token groups from processed token set
   */
  private createTokenGroupsFromTokenSet(tokenSet: any, structureType: StructureType): TokenGroup[] {
    const groups: TokenGroup[] = [];
    const groupMap = new Map<string, TokenGroup>();

    // First pass: create all groups
    this.traverseTokenSet(tokenSet, (path, value, tokenPath) => {
      if (path.length === 0) return;

      // Create groups for each level in the path
      for (let i = 0; i < path.length; i++) {
        const groupPath = path.slice(0, i + 1);
        const groupId = groupPath.join('/');
        const groupName = path[i];

        if (!groupMap.has(groupId)) {
          const group: TokenGroup = {
            id: groupId,
            name: groupName,
            tokens: [],
            level: i,
            expanded: i < 2, // Expand first two levels by default
            path: groupPath.join('.')
          };

          groupMap.set(groupId, group);

          if (i === 0) {
            groups.push(group);
          }
        }
      }

      // Add token to the deepest group
      if (this.isTokenDefinition(value)) {
        const parentGroupPath = path.join('/');
        const parentGroup = groupMap.get(parentGroupPath);

        if (parentGroup) {
          const token: GeneratedToken = {
            id: `${parentGroupPath}/${tokenPath[tokenPath.length - 1]}`,
            path: tokenPath[tokenPath.length - 1],
            value: this.extractTokenValue(value),
            type: this.determineTokenType(value),
            description: value.$description
          };

          parentGroup.tokens.push(token);
        }
      }
    });

    // Second pass: establish parent-child relationships
    for (const group of groupMap.values()) {
      if (group.level > 0) {
        const parentPath = group.id.split('/').slice(0, -1).join('/');
        const parentGroup = groupMap.get(parentPath);

        if (parentGroup) {
          if (!parentGroup.children) {
            parentGroup.children = [];
          }
          parentGroup.children.push(group);
          group.parent = parentGroup.id;
        }
      }
    }

    return groups;
  }

  private traverseTokenSet(
    tokenSet: any,
    callback: (path: string[], value: any, tokenPath: string[]) => void,
    currentPath: string[] = [],
    tokenPath: string[] = []
  ) {
    for (const [key, value] of Object.entries(tokenSet)) {
      const newPath = [...currentPath, key];
      const newTokenPath = [...tokenPath, key];

      if (value && typeof value === 'object') {
        if (this.isTokenDefinition(value)) {
          // This is a token definition
          callback(currentPath, value, newTokenPath);
        } else {
          // This is a group, continue traversing
          callback(newPath, value, newTokenPath);
          this.traverseTokenSet(value, callback, newPath, newTokenPath);
        }
      }
    }
  }

  /**
   * Check if an object is a token definition
   */
  private isTokenDefinition(obj: any): boolean {
    return obj && typeof obj === 'object' && (
      obj.hasOwnProperty('$value') ||
      obj.hasOwnProperty('value') ||
      obj.hasOwnProperty('$type')
    );
  }

  /**
   * Extract the actual value from a token definition
   */
  private extractTokenValue(tokenDef: any): any {
    if (tokenDef.$value !== undefined) {
      return tokenDef.$value;
    }
    if (tokenDef.value !== undefined) {
      return tokenDef.value;
    }
    return tokenDef;
  }

  /**
   * Determine token type from token definition
   */
  private determineTokenType(tokenDef: any): TokenType {
    if (tokenDef.$type) {
      return tokenDef.$type as TokenType;
    }
    if (tokenDef.type) {
      return tokenDef.type as TokenType;
    }

    // Infer type from value
    const value = this.extractTokenValue(tokenDef);
    return this.inferTokenType(value);
  }

  /**
   * Infer token type from value
   */
  private inferTokenType(value: any): TokenType {
    if (typeof value === 'string') {
      // Check for color values
      if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value)) {
        return 'color';
      }
      if (/^rgba?\(/.test(value) || /^hsla?\(/.test(value)) {
        return 'color';
      }
      // Check for dimensions
      if (/^\d+(\.\d+)?(px|em|rem|%)$/.test(value)) {
        return 'dimension';
      }
      // Check for duration
      if (/^\d+(\.\d+)?(s|ms)$/.test(value)) {
        return 'duration';
      }
      return 'string';
    }

    if (typeof value === 'number') {
      return 'number';
    }

    return 'string';
  }

  /**
   * Resolve token reference to actual value.
   * Handles references like {token.color.base.teal.200.value} or {color.base.grey.600},
   * including cases where the namespace is stripped from group paths during import.
   */
  resolveTokenReference(reference: string, allGroups: TokenGroup[]): string {
    return this.resolveTokenReferenceWithVisited(reference, allGroups, new Set());
  }

  private resolveTokenReferenceWithVisited(
    reference: string,
    allGroups: TokenGroup[],
    visited: Set<string>
  ): string {
    if (typeof reference !== 'string' || !reference.startsWith('{') || !reference.endsWith('}')) {
      return reference;
    }

    // Guard against circular references
    if (visited.has(reference)) {
      return reference;
    }

    let cleanRef = reference.slice(1, -1); // Remove { and }
    if (cleanRef.endsWith('.value')) {
      cleanRef = cleanRef.slice(0, -6);
    }

    // Depth-first search through nested groups, using allGroups for recursive value resolution
    const search = (groups: TokenGroup[]): string | null => {
      for (const group of groups) {
        for (const token of group.tokens) {
          const fullPath = `${group.path}.${token.path}`;
          // Match exact path, or when the reference has a namespace prefix that was stripped
          // from group paths during import (e.g. cleanRef='token.colors.base.red' matches
          // fullPath='colors.base.red'). Check segment boundaries with a dot prefix to
          // avoid partial segment matches (e.g. 'red' must not match 'infrared').
          if (fullPath === cleanRef || cleanRef.endsWith('.' + fullPath)) {
            const value = String(token.value);
            // Recursively resolve if the found value is also a reference
            if (value.startsWith('{') && value.endsWith('}')) {
              const nextVisited = new Set(visited);
              nextVisited.add(reference);
              return this.resolveTokenReferenceWithVisited(value, allGroups, nextVisited);
            }
            return value;
          }
        }

        // Check nested groups
        if (group.children) {
          const found = search(group.children);
          if (found !== null) {
            return found;
          }
        }
      }
      return null;
    };

    const result = search(allGroups);
    return result !== null ? result : reference; // Return original if not found
  }

  /**
   * Generate Style Dictionary compatible output
   */
  generateStyleDictionaryOutput(groups: TokenGroup[], globalNamespace: string): any {
    const output: any = {};

    const addTokenToOutput = (token: GeneratedToken, groupPath: string[]) => {
      let current = output;

      // Navigate to the correct nested location
      for (const pathPart of groupPath) {
        if (!current[pathPart]) {
          current[pathPart] = {};
        }
        current = current[pathPart];
      }

      // Add the token
      current[token.path] = {
        $type: token.type,
        $value: token.value,
        ...(token.description && { $description: token.description }),
        ...(token.attributes && token.attributes)
      };
    };

    const processGroup = (group: TokenGroup, pathPrefix: string[] = []) => {
      const currentPath = [...pathPrefix, group.name];

      // Add tokens from this group
      for (const token of group.tokens) {
        addTokenToOutput(token, currentPath);
      }

      // Process child groups
      if (group.children) {
        for (const childGroup of group.children) {
          processGroup(childGroup, currentPath);
        }
      }
    };

    // Process all top-level groups
    for (const group of groups) {
      processGroup(group);
    }

    return output;
  }

  /**
   * Validate token structure
   */
  validateTokenStructure(tokenSet: any): ValidationResult {
    const errors: string[] = [];

    if (!tokenSet || typeof tokenSet !== 'object') {
      errors.push('Token set must be an object');
      return { isValid: false, errors };
    }

    const validateTokenDefinition = (tokenDef: any, path: string): void => {
      if (!this.isTokenDefinition(tokenDef)) {
        return; // Not a token definition, skip
      }

      const value = this.extractTokenValue(tokenDef);
      if (value === undefined || value === null) {
        errors.push(`Token at ${path} has no value`);
      }

      const type = this.determineTokenType(tokenDef);
      if (!type) {
        errors.push(`Token at ${path} has invalid or missing type`);
      }
    };

    // Recursively validate all tokens
    const traverse = (obj: any, currentPath: string = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const path = currentPath ? `${currentPath}.${key}` : key;

        if (value && typeof value === 'object') {
          if (this.isTokenDefinition(value)) {
            validateTokenDefinition(value, path);
          } else {
            traverse(value, path);
          }
        }
      }
    };

    traverse(tokenSet);

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Create singleton instance
export const tokenService = new TokenService();