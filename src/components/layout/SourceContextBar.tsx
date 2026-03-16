import type { ISourceMetadata } from '@/types/collection.types';

interface SourceContextBarProps {
  sourceMetadata: ISourceMetadata | null | undefined;
}

/**
 * Slim contextual bar shown below the tab switcher when a collection has an upstream source.
 * Displays GitHub icon + repo/branch, or Figma icon + file key.
 * Returns null (renders nothing) when the collection has no upstream source.
 */
export function SourceContextBar({ sourceMetadata }: SourceContextBarProps) {
  if (!sourceMetadata) return null;

  if (sourceMetadata.type === 'github' && sourceMetadata.repo) {
    return (
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-1.5 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-500">
          {/* GitHub icon */}
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <span className="font-medium text-gray-700">GitHub</span>
          <span className="text-gray-400">•</span>
          <span>{sourceMetadata.repo}</span>
          {sourceMetadata.branch && (
            <>
              <span className="text-gray-400">·</span>
              <span className="font-mono text-xs">{sourceMetadata.branch}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  if (sourceMetadata.type === 'figma' && sourceMetadata.figmaFileKey) {
    return (
      <div className="bg-purple-50 border-b border-purple-100 px-4 py-1.5 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-purple-600">
          {/* Figma icon — logomark */}
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 38 57" fill="currentColor">
            <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/>
            <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0z"/>
            <path d="M19 0v19h9.5a9.5 9.5 0 0 0 0-19H19z"/>
            <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/>
            <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/>
          </svg>
          <span className="font-medium">Figma</span>
          <span className="text-purple-300">•</span>
          <span className="font-mono text-xs">{sourceMetadata.figmaFileKey}</span>
        </div>
      </div>
    );
  }

  // type is null, or required fields are null — no upstream source
  return null;
}
