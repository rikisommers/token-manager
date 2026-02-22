import fs from 'fs';
import path from 'path';

interface Token {
  value: string;
  type: string;
  attributes?: Record<string, any>;
}

export class TokenUpdater {
  private tokensDir: string;

  constructor(tokensDir: string) {
    this.tokensDir = tokensDir;
  }

  /**
   * Update a specific token value in its JSON file
   */
  async updateToken(filePath: string, tokenPath: string, newValue: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.tokensDir, filePath);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Token file not found: ${filePath}`);
      }

      // Read current file content
      const content = fs.readFileSync(fullPath, 'utf-8');
      const tokenData = JSON.parse(content);

      // Create backup
      const backupPath = `${fullPath}.backup-${Date.now()}`;
      fs.copyFileSync(fullPath, backupPath);

      // Update the specific token
      const pathParts = tokenPath.split('.');
      let current = tokenData;

      // Navigate to the token location
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          throw new Error(`Token path not found: ${tokenPath}`);
        }
        current = current[pathParts[i]];
      }

      const lastPart = pathParts[pathParts.length - 1];
      if (!current[lastPart] || typeof current[lastPart] !== 'object' || !current[lastPart].value) {
        throw new Error(`Token not found at path: ${tokenPath}`);
      }

      // Update the value
      current[lastPart].value = newValue;

      // Save the updated file
      fs.writeFileSync(fullPath, JSON.stringify(tokenData, null, 2));

      return true;
    } catch (error) {
      console.error('Error updating token:', error);
      return false;
    }
  }

  /**
   * Get all token files and their data
   */
  getAllTokens(): Record<string, any> {
    const allTokens: Record<string, any> = {};
    const tokenFiles = this.getAllTokenFiles(this.tokensDir);

    for (const filePath of tokenFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const tokenData = JSON.parse(content);
        const relativePath = path.relative(this.tokensDir, filePath);
        allTokens[relativePath] = tokenData;
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
      }
    }

    return allTokens;
  }

  /**
   * Create a flat map of all tokens for reference resolution
   */
  private createTokenMap(allTokens: Record<string, any>): Map<string, string> {
    const tokenMap = new Map<string, string>();

    for (const [filePath, fileData] of Object.entries(allTokens)) {
      const tokens = this.flattenTokens(fileData, filePath);
      for (const tokenInfo of tokens) {
        tokenMap.set(tokenInfo.path, tokenInfo.token.value);
      }
    }

    return tokenMap;
  }

  /**
   * Resolve token references like {token.color.white.value} to actual values
   */
  resolveTokenReference(value: string, tokenMap: Map<string, string>): string {
    if (!value.startsWith('{') || !value.endsWith('}')) {
      return value;
    }

    // Extract the reference path
    const refPath = value.slice(1, -1); // Remove { and }

    // Remove .value suffix if present
    const cleanPath = refPath.endsWith('.value') ? refPath.slice(0, -6) : refPath;

    // Look up the value in the token map
    const resolvedValue = tokenMap.get(cleanPath);

    if (resolvedValue) {
      // Recursively resolve if the resolved value is also a reference
      return this.resolveTokenReference(resolvedValue, tokenMap);
    }

    // If not found, return original value
    return value;
  }

  /**
   * Get all tokens with resolved references
   */
  getAllTokensWithResolvedRefs(): {
    allTokens: Record<string, any>;
    tokenMap: Map<string, string>;
  } {
    const allTokens = this.getAllTokens();
    const tokenMap = this.createTokenMap(allTokens);

    return { allTokens, tokenMap };
  }

  /**
   * Get all JSON files in the tokens directory recursively
   */
  private getAllTokenFiles(dir: string): string[] {
    const files: string[] = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      if (item.isDirectory()) {
        files.push(...this.getAllTokenFiles(path.join(dir, item.name)));
      } else if (item.name.endsWith('.json')) {
        files.push(path.join(dir, item.name));
      }
    }

    return files;
  }

  /**
   * Flatten tokens for display purposes
   */
  flattenTokens(obj: any, filePath: string): Array<{path: string, token: Token, filePath: string}> {
    const result: Array<{path: string, token: Token, filePath: string}> = [];

    function traverse(current: any, currentPath: string = '') {
      for (const [key, value] of Object.entries(current)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;

        if (value && typeof value === 'object' && 'value' in value && 'type' in value) {
          result.push({
            path: newPath,
            token: value as Token,
            filePath
          });
        } else if (value && typeof value === 'object') {
          traverse(value, newPath);
        }
      }
    }

    traverse(obj);
    return result;
  }
}