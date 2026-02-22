import { Injectable } from '@angular/core';
import {
  FigmaConfig,
  FigmaVariableCollection,
  FigmaVariable,
  TokenGroup,
  GeneratedToken,
  TokenType
} from '../types';

/**
 * Figma Service
 * Handles Figma API integration for importing design tokens from Figma variables
 */
@Injectable({
  providedIn: 'root'
})
export class FigmaService {
  private baseUrl = 'https://api.figma.com/v1';

  /**
   * Get all variable collections from a Figma file
   */
  async getVariableCollections(config: FigmaConfig): Promise<FigmaVariableCollection[]> {
    const response = await fetch(`${this.baseUrl}/files/${config.fileKey}/variables/local`, {
      headers: {
        'X-Figma-Token': config.token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Figma API error: ${data.status} - ${data.err}`);
    }

    return data.meta.variableCollections || [];
  }

  /**
   * Get variables from specific collections
   */
  async getVariables(
    config: FigmaConfig,
    collectionIds: string[] = []
  ): Promise<FigmaVariable[]> {
    const response = await fetch(`${this.baseUrl}/files/${config.fileKey}/variables/local`, {
      headers: {
        'X-Figma-Token': config.token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Figma API error: ${data.status} - ${data.err}`);
    }

    const allVariables = Object.values(data.meta.variables || {}) as FigmaVariable[];

    // Filter by collection IDs if specified
    if (collectionIds.length > 0) {
      return allVariables.filter(variable =>
        collectionIds.includes(variable.variableCollectionId)
      );
    }

    return allVariables;
  }

  /**
   * Convert Figma variables to token groups
   */
  convertFigmaVariablesToTokens(
    variables: FigmaVariable[],
    collections: FigmaVariableCollection[],
    selectedModeId?: string
  ): TokenGroup[] {
    const groups: TokenGroup[] = [];
    const groupMap = new Map<string, TokenGroup>();

    // Create a map of collections for easy lookup
    const collectionMap = new Map<string, FigmaVariableCollection>();
    collections.forEach(collection => {
      collectionMap.set(collection.id, collection);
    });

    // Process each variable
    variables.forEach(variable => {
      const collection = collectionMap.get(variable.variableCollectionId);
      if (!collection) return;

      // Determine which mode to use
      let modeId = selectedModeId;
      if (!modeId && collection.modes.length > 0) {
        modeId = collection.modes[0].modeId; // Use first mode as default
      }

      // Get the value for the selected mode
      const value = variable.valuesByMode[modeId || ''];
      if (value === undefined) return;

      // Parse the variable name to create group hierarchy
      const pathParts = variable.name.split('/');
      const tokenName = pathParts.pop() || variable.name;

      // Create groups for each part of the path
      let currentPath = '';
      let parentGroup: TokenGroup | null = null;

      pathParts.forEach((part, index) => {
        const groupPath = currentPath ? `${currentPath}/${part}` : part;
        let group = groupMap.get(groupPath);

        if (!group) {
          group = {
            id: groupPath,
            name: part,
            tokens: [],
            level: index,
            expanded: index < 2, // Expand first two levels
            path: groupPath.replace(/\//g, '.')
          };

          groupMap.set(groupPath, group);

          if (parentGroup) {
            if (!parentGroup.children) {
              parentGroup.children = [];
            }
            parentGroup.children.push(group);
            group.parent = parentGroup.id;
          } else {
            groups.push(group);
          }
        }

        parentGroup = group;
        currentPath = groupPath;
      });

      // Add the token to the appropriate group (or create a default group if no path)
      const targetGroup = parentGroup || this.getOrCreateDefaultGroup(groups, groupMap, collection);

      const token: GeneratedToken = {
        id: variable.id,
        path: tokenName,
        value: this.convertFigmaValue(value, variable.type),
        type: this.mapFigmaTypeToTokenType(variable.type),
        description: variable.description,
        attributes: {
          figmaId: variable.id,
          figmaKey: variable.key,
          variableCollectionId: variable.variableCollectionId,
          scopes: variable.scopes,
          hiddenFromPublishing: variable.hiddenFromPublishing
        }
      };

      targetGroup.tokens.push(token);
    });

    return groups;
  }

  private getOrCreateDefaultGroup(
    groups: TokenGroup[],
    groupMap: Map<string, TokenGroup>,
    collection: FigmaVariableCollection
  ): TokenGroup {
    const defaultGroupId = `collection-${collection.id}`;
    let defaultGroup = groupMap.get(defaultGroupId);

    if (!defaultGroup) {
      defaultGroup = {
        id: defaultGroupId,
        name: collection.name || 'Variables',
        tokens: [],
        level: 0,
        expanded: true,
        path: collection.name || 'variables'
      };

      groupMap.set(defaultGroupId, defaultGroup);
      groups.push(defaultGroup);
    }

    return defaultGroup;
  }

  private convertFigmaValue(value: any, figmaType: string): any {
    if (figmaType === 'COLOR') {
      // Convert Figma color format to hex
      if (value.r !== undefined && value.g !== undefined && value.b !== undefined) {
        const r = Math.round(value.r * 255);
        const g = Math.round(value.g * 255);
        const b = Math.round(value.b * 255);
        const a = value.a !== undefined ? value.a : 1;

        if (a < 1) {
          return `rgba(${r}, ${g}, ${b}, ${a})`;
        } else {
          return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
      }
    }

    return value;
  }

  private mapFigmaTypeToTokenType(figmaType: string): TokenType {
    switch (figmaType) {
      case 'COLOR':
        return 'color';
      case 'FLOAT':
        return 'number';
      case 'STRING':
        return 'string';
      case 'BOOLEAN':
        return 'string'; // Treat boolean as string for now
      default:
        return 'string';
    }
  }

  /**
   * Validate Figma configuration
   */
  validateConfig(config: FigmaConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.token || !config.token.trim()) {
      errors.push('Figma token is required');
    }

    if (!config.fileKey || !config.fileKey.trim()) {
      errors.push('Figma file key is required');
    } else if (!/^[A-Za-z0-9]+$/.test(config.fileKey)) {
      errors.push('Invalid Figma file key format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract file key from Figma URL
   */
  extractFileKeyFromUrl(url: string): string | null {
    // Match patterns like:
    // https://www.figma.com/file/ABC123/Title
    // https://www.figma.com/design/ABC123/Title
    const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  /**
   * Test connection to Figma API
   */
  async testConnection(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          'X-Figma-Token': token,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
