'use client';

import React, { useCallback, useEffect, useState } from 'react';
import JSZip from 'jszip';
import type { BuildTokensResult, FormatOutput } from '@/types';

interface BuildTokensModalProps {
  tokens: Record<string, unknown>;    // raw token JSON to build from
  namespace: string;                   // e.g. "token"
  collectionName: string;              // used for ZIP filename: {collectionName}-tokens.zip
  isOpen: boolean;
  onClose: () => void;
}

const FORMAT_LABELS: Record<string, string> = {
  css:  'CSS',
  scss: 'SCSS',
  less: 'LESS',
  js:   'JS',
  ts:   'TS',
  json: 'JSON',
};

const FORMATS = ['css', 'scss', 'less', 'js', 'ts', 'json'] as const;
type Format = typeof FORMATS[number];

export function BuildTokensModal({
  tokens,
  namespace,
  collectionName,
  isOpen,
  onClose,
}: BuildTokensModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildTokensResult | null>(null);
  const [activeFormat, setActiveFormat] = useState<Format>('css');
  const [activeBrand, setActiveBrand] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const runBuild = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/build-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens, namespace, collectionName }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Build failed (${res.status})`);
      }

      const data = (await res.json()) as BuildTokensResult;
      setResult(data);

      // Set default brand to first brand of the CSS format (or first format)
      const cssFormat = data.formats.find(f => f.format === 'css');
      const firstBrand = cssFormat?.outputs[0]?.brand ?? data.formats[0]?.outputs[0]?.brand ?? '';
      setActiveBrand(firstBrand);
      setActiveFormat('css');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [tokens, namespace, collectionName]);

  // Trigger build when modal opens; reset when it closes
  useEffect(() => {
    if (isOpen) {
      runBuild();
    } else {
      setLoading(false);
      setError(null);
      setResult(null);
      setActiveBrand('');
      setActiveFormat('css');
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset activeBrand when format tab changes (pick first brand in new format)
  const handleFormatChange = (fmt: Format) => {
    setActiveFormat(fmt);
    if (result) {
      const fmtData = result.formats.find(f => f.format === fmt);
      setActiveBrand(fmtData?.outputs[0]?.brand ?? '');
    }
  };

  // Copy content for active format+brand to clipboard
  const handleCopy = async (key: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Clipboard write failed silently
    }
  };

  // Download all format x brand combinations as a ZIP
  const handleDownloadAll = async () => {
    if (!result) return;
    const zip = new JSZip();
    for (const fmt of result.formats) {
      for (const { filename, content } of fmt.outputs) {
        zip.file(filename, content);
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collectionName}-tokens.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Backdrop click: only close if click is on the overlay itself
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  // Derive current format outputs
  const currentFormatData: FormatOutput | undefined = result?.formats.find(f => f.format === activeFormat);
  const currentBrands = currentFormatData?.outputs ?? [];
  const isMultiBrand = currentBrands.length > 1;
  const currentBrandOutput = currentBrands.find(b => b.brand === activeBrand) ?? currentBrands[0];
  const copyKey = `${activeFormat}-${activeBrand}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">Build Tokens Output</h3>
          <div className="flex items-center gap-3">
            {result && (
              <button
                onClick={handleDownloadAll}
                className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                disabled={loading}
              >
                Download All
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <span className="text-gray-600 text-sm">Building...</span>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-red-600 text-sm mb-4">{error}</p>
              <button
                onClick={runBuild}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Success state */}
          {!loading && result && (
            <div className="flex flex-col gap-4">
              {/* Format tabs */}
              <div className="flex border-b border-gray-200">
                {FORMATS.map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => handleFormatChange(fmt)}
                    className={`px-4 py-2 text-sm font-medium rounded-t -mb-px border-b-2 transition-colors ${
                      activeFormat === fmt
                        ? 'bg-blue-100 text-blue-900 border-blue-600'
                        : 'text-gray-600 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    {FORMAT_LABELS[fmt]}
                  </button>
                ))}
              </div>

              {/* Brand sub-tabs (multi-brand only) */}
              {isMultiBrand && (
                <div className="flex gap-1">
                  {currentBrands.map(({ brand }) => (
                    <button
                      key={brand}
                      onClick={() => setActiveBrand(brand)}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        activeBrand === brand
                          ? 'bg-gray-800 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              )}

              {/* Code block */}
              {currentBrandOutput && (
                <div className="relative">
                  <button
                    onClick={() => handleCopy(copyKey, currentBrandOutput.content)}
                    className="absolute top-2 right-2 z-10 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    {copiedKey === copyKey ? 'Copied!' : 'Copy'}
                  </button>
                  <pre className="bg-gray-50 rounded p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-[400px] overflow-y-auto">
                    <code>{currentBrandOutput.content || '/* (empty output) */'}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
