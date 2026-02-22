import { Injectable } from '@angular/core';
import {
  FileImportResult,
  FileExportOptions,
  TokenGroup,
  ValidationResult
} from '../types';
import { TokenService } from './token.service';

/**
 * File Service
 * Handles file import/export operations for token files
 */
@Injectable({
  providedIn: 'root'
})
export class FileService {
  constructor(private tokenService: TokenService) {}

  /**
   * Import tokens from JSON file
   */
  async importFromFile(file: File): Promise<FileImportResult> {
    try {
      const text = await this.readFileAsText(file);

      // Validate JSON
      let parsedTokens;
      try {
        parsedTokens = JSON.parse(text);
      } catch (parseError) {
        return {
          tokens: null,
          fileName: file.name,
          success: false,
          error: 'Invalid JSON format'
        };
      }

      // Validate token structure
      const validation = this.tokenService.validateTokenStructure(parsedTokens);
      if (!validation.isValid) {
        return {
          tokens: null,
          fileName: file.name,
          success: false,
          error: `Invalid token structure: ${validation.errors.join(', ')}`
        };
      }

      return {
        tokens: parsedTokens,
        fileName: file.name,
        success: true
      };
    } catch (error) {
      return {
        tokens: null,
        fileName: file.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Export tokens to different formats
   */
  exportTokens(
    groups: TokenGroup[],
    globalNamespace: string,
    options: FileExportOptions
  ): string {
    switch (options.format) {
      case 'json':
        return this.exportAsJson(groups, globalNamespace, options.includeMetadata);
      case 'js':
        return this.exportAsJavaScript(groups, globalNamespace);
      case 'ts':
        return this.exportAsTypeScript(groups, globalNamespace);
      case 'css':
        return this.exportAsCss(groups, globalNamespace);
      case 'scss':
        return this.exportAsScss(groups, globalNamespace);
      case 'less':
        return this.exportAsLess(groups, globalNamespace);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Download file with generated content
   */
  downloadFile(content: string, fileName: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private exportAsJson(groups: TokenGroup[], globalNamespace: string, includeMetadata: boolean = false): string {
    const tokens = this.tokenService.generateStyleDictionaryOutput(groups, globalNamespace);

    if (includeMetadata) {
      const exportData = {
        $metadata: {
          exportedAt: new Date().toISOString(),
          generator: 'Token Manager',
          version: '1.0.0',
          globalNamespace
        },
        ...tokens
      };
      return JSON.stringify(exportData, null, 2);
    }

    return JSON.stringify(tokens, null, 2);
  }

  private exportAsJavaScript(groups: TokenGroup[], globalNamespace: string): string {
    const tokens = this.tokenService.generateStyleDictionaryOutput(groups, globalNamespace);

    return `// Generated tokens
const tokens = ${JSON.stringify(tokens, null, 2)};

module.exports = tokens;
`;
  }

  private exportAsTypeScript(groups: TokenGroup[], globalNamespace: string): string {
    const tokens = this.tokenService.generateStyleDictionaryOutput(groups, globalNamespace);

    return `// Generated tokens
export interface TokenSet {
  [key: string]: any;
}

export const tokens: TokenSet = ${JSON.stringify(tokens, null, 2)};

export default tokens;
`;
  }

  private exportAsCss(groups: TokenGroup[], globalNamespace: string): string {
    let css = `:root {\n`;

    const addTokensAsCssVars = (group: TokenGroup, pathPrefix: string = '') => {
      const currentPath = pathPrefix ? `${pathPrefix}-${group.name}` : group.name;

      // Add tokens from this group
      for (const token of group.tokens) {
        const varName = `--${globalNamespace}-${currentPath}-${token.path}`.replace(/\./g, '-');
        css += `  ${varName}: ${this.formatCssValue(token.value)};\n`;
      }

      // Process child groups
      if (group.children) {
        for (const childGroup of group.children) {
          addTokensAsCssVars(childGroup, currentPath);
        }
      }
    };

    for (const group of groups) {
      addTokensAsCssVars(group);
    }

    css += `}\n`;
    return css;
  }

  private exportAsScss(groups: TokenGroup[], globalNamespace: string): string {
    let scss = `// SCSS Variables\n`;

    const addTokensAsScssVars = (group: TokenGroup, pathPrefix: string = '') => {
      const currentPath = pathPrefix ? `${pathPrefix}-${group.name}` : group.name;

      // Add tokens from this group
      for (const token of group.tokens) {
        const varName = `$${globalNamespace}-${currentPath}-${token.path}`.replace(/\./g, '-');
        scss += `${varName}: ${this.formatScssValue(token.value)};\n`;
      }

      // Process child groups
      if (group.children) {
        for (const childGroup of group.children) {
          addTokensAsScssVars(childGroup, currentPath);
        }
      }
    };

    for (const group of groups) {
      addTokensAsScssVars(group);
    }

    return scss;
  }

  private exportAsLess(groups: TokenGroup[], globalNamespace: string): string {
    let less = `// LESS Variables\n`;

    const addTokensAsLessVars = (group: TokenGroup, pathPrefix: string = '') => {
      const currentPath = pathPrefix ? `${pathPrefix}-${group.name}` : group.name;

      // Add tokens from this group
      for (const token of group.tokens) {
        const varName = `@${globalNamespace}-${currentPath}-${token.path}`.replace(/\./g, '-');
        less += `${varName}: ${this.formatLessValue(token.value)};\n`;
      }

      // Process child groups
      if (group.children) {
        for (const childGroup of group.children) {
          addTokensAsLessVars(childGroup, currentPath);
        }
      }
    };

    for (const group of groups) {
      addTokensAsLessVars(group);
    }

    return less;
  }

  private formatCssValue(value: any): string {
    if (typeof value === 'string') {
      // Check if it needs quotes
      if (value.includes(' ') && !value.startsWith('"') && !value.startsWith("'")) {
        return `"${value}"`;
      }
    }
    return String(value);
  }

  private formatScssValue(value: any): string {
    return this.formatCssValue(value);
  }

  private formatLessValue(value: any): string {
    return this.formatCssValue(value);
  }

  /**
   * Create a JSON file from token groups for preview
   */
  createPreviewJson(groups: TokenGroup[], globalNamespace: string): string {
    return this.exportAsJson(groups, globalNamespace, true);
  }

  /**
   * Validate file type for import
   */
  validateFileType(file: File): ValidationResult {
    const errors: string[] = [];

    // Check file extension
    const validExtensions = ['.json'];
    const hasValidExtension = validExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      errors.push(`Invalid file type. Supported formats: ${validExtensions.join(', ')}`);
    }

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push('File size too large (maximum 10MB)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get appropriate MIME type for export format
   */
  getMimeType(format: string): string {
    switch (format) {
      case 'json':
        return 'application/json';
      case 'js':
        return 'text/javascript';
      case 'ts':
        return 'text/typescript';
      case 'css':
        return 'text/css';
      case 'scss':
        return 'text/scss';
      case 'less':
        return 'text/less';
      default:
        return 'text/plain';
    }
  }

  /**
   * Generate appropriate file extension for export format
   */
  getFileExtension(format: string): string {
    const extensions = {
      json: '.json',
      js: '.js',
      ts: '.ts',
      css: '.css',
      scss: '.scss',
      less: '.less'
    };

    return extensions[format as keyof typeof extensions] || '.txt';
  }
}
