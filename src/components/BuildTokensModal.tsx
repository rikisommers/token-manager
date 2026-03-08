'use client';

import React, { useCallback, useEffect, useState } from 'react';
import JSZip from 'jszip';
import type { BuildTokensResult, FormatOutput } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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

  // Derive current format outputs
  const currentFormatData: FormatOutput | undefined = result?.formats.find(f => f.format === activeFormat);
  const currentBrands = currentFormatData?.outputs ?? [];
  const isMultiBrand = currentBrands.length > 1;
  const currentBrandOutput = currentBrands.find(b => b.brand === activeBrand) ?? currentBrands[0];
  const copyKey = `${activeFormat}-${activeBrand}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Build Tokens Output</DialogTitle>
            {result && (
              <Button
                onClick={handleDownloadAll}
                variant="default"
                size="sm"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 mr-8"
              >
                Download All
              </Button>
            )}
          </div>
        </DialogHeader>

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
              <Button
                onClick={runBuild}
                variant="destructive"
                size="sm"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Success state */}
          {!loading && result && (
            <div className="flex flex-col gap-4">
              {/* Format tabs */}
              <div className="flex border-b border-gray-200">
                {FORMATS.map(fmt => (
                  <Button
                    key={fmt}
                    onClick={() => handleFormatChange(fmt)}
                    variant="ghost"
                    className={`px-4 py-2 text-sm font-medium rounded-t -mb-px border-b-2 transition-colors ${
                      activeFormat === fmt
                        ? 'bg-blue-100 text-blue-900 border-blue-600'
                        : 'text-gray-600 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    {FORMAT_LABELS[fmt]}
                  </Button>
                ))}
              </div>

              {/* Brand sub-tabs (multi-brand only) */}
              {isMultiBrand && (
                <div className="flex gap-1">
                  {currentBrands.map(({ brand }) => (
                    <Button
                      key={brand}
                      onClick={() => setActiveBrand(brand)}
                      variant="ghost"
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        activeBrand === brand
                          ? 'bg-gray-800 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {brand}
                    </Button>
                  ))}
                </div>
              )}

              {/* Code block */}
              {currentBrandOutput && (
                <div className="relative">
                  <Button
                    onClick={() => handleCopy(copyKey, currentBrandOutput.content)}
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 z-10"
                  >
                    {copiedKey === copyKey ? 'Copied!' : 'Copy'}
                  </Button>
                  <pre className="bg-gray-50 rounded p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-[400px] overflow-y-auto">
                    <code>{currentBrandOutput.content || '/* (empty output) */'}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
