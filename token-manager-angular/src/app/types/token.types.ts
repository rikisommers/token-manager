// Token type definitions consolidated from multiple sources
export type TokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'borderRadius'
  | 'borderWidth'
  | 'opacity'
  | 'boxShadow'
  | 'textShadow'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'string'
  | 'strokeStyle'
  | 'border'
  | 'transition'
  | 'shadow'
  | 'gradient'
  | 'typography';

export const TOKEN_TYPES: TokenType[] = [
  'color',
  'dimension',
  'fontFamily',
  'fontWeight',
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'borderRadius',
  'borderWidth',
  'opacity',
  'boxShadow',
  'textShadow',
  'duration',
  'cubicBezier',
  'number',
  'string',
  'strokeStyle',
  'border',
  'transition',
  'shadow',
  'gradient',
  'typography'
];

export interface GeneratedToken {
  id: string;
  path: string;
  value: any;
  type: TokenType;
  description?: string;
  attributes?: Record<string, any>;
}

export interface TokenGroup {
  id: string;
  name: string;
  tokens: GeneratedToken[];
  children?: TokenGroup[];
  parent?: string;
  level: number;
  expanded?: boolean;
  path?: string;
}

export interface TokenSet {
  [key: string]: {
    $type?: TokenType;
    $value?: any;
    $description?: string;
    [key: string]: any;
  };
}

// GitHub Integration Types
export interface GitHubConfig {
  repository: string;
  token: string;
  branch: string;
}

export interface GitHubFileContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  content?: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed';
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  html_url: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
  };
  html_url: string;
}

export interface GitHubApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

// Figma Integration Types
export interface FigmaConfig {
  token: string;
  fileKey: string;
}

export interface FigmaVariableCollection {
  id: string;
  name: string;
  modes: FigmaMode[];
  variables: string[];
}

export interface FigmaMode {
  modeId: string;
  name: string;
}

export interface FigmaVariable {
  id: string;
  name: string;
  description?: string;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  scopes: string[];
  codeSyntax: Record<string, string>;
  hiddenFromPublishing: boolean;
  valuesByMode: Record<string, any>;
  remote: boolean;
  key: string;
  variableCollectionId: string;
}

// UI State Types
export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// File Operation Types
export interface FileImportResult {
  tokens: any;
  fileName: string;
  success: boolean;
  error?: string;
}

export interface FileExportOptions {
  format: 'json' | 'js' | 'ts' | 'css' | 'scss' | 'less';
  fileName: string;
  includeMetadata?: boolean;
}

// Structure Detection Types
export type StructureType = 'A' | 'B';

export interface StructureDetectionResult {
  type: StructureType;
  extractedNamespace?: string;
  globalNamespace?: string;
  description: string;
}