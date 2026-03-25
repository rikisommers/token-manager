'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { BuildTokensPanel } from '@/components/dev/BuildTokensPanel';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { ITheme, ColorMode } from '@/types/theme.types';
import { mergeThemeTokens } from '@/lib/themeTokenMerge';

interface ConfigPageProps {
  params: { id: string };
}

function ColorModeBadge({ colorMode }: { colorMode: ColorMode }) {
  if (colorMode === 'dark') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 flex-shrink-0">
        <Moon size={9} />
        Dark
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 flex-shrink-0">
      <Sun size={9} />
      Light
    </span>
  );
}

export default function CollectionConfigPage({ params }: ConfigPageProps) {
  const { id } = params;
  const [collectionName, setCollectionName] = useState('');
  const [namespace, setNamespace] = useState('token');
  const [tokens, setTokens] = useState<Record<string, unknown> | null>(null);
  const [themes, setThemes] = useState<ITheme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('__default__');

  useEffect(() => {
    // Fetch collection data
    fetch(`/api/collections/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch collection');
        return res.json();
      })
      .then((data: { collection?: { name?: string; namespace?: string; tokens?: Record<string, unknown> }; name?: string; namespace?: string; tokens?: Record<string, unknown> }) => {
        const col = data.collection ?? (data as { name?: string; namespace?: string; tokens?: Record<string, unknown> });
        if (col.name) setCollectionName(col.name);
        if (col.namespace) setNamespace(col.namespace);
        if (col.tokens) setTokens(col.tokens);
      })
      .catch(() => {
        setTokens(null);
      });

    // Fetch themes in parallel
    fetch(`/api/collections/${id}/themes`)
      .then(res => res.ok ? res.json() : { themes: [] })
      .then((data: { themes?: ITheme[] }) => {
        setThemes(data.themes ?? []);
      })
      .catch(() => setThemes([]));
  }, [id]);

  // Derive merged tokens and theme label from current selection
  const selectedTheme = themes.find(t => t.id === selectedThemeId) ?? null;
  const themeLabel = selectedTheme ? selectedTheme.name : undefined;
  const mergedTokens = selectedTheme && tokens && namespace
    ? mergeThemeTokens(tokens, selectedTheme, namespace)
    : tokens;

  // Detect dark token set for combined output:
  // - When 'Collection default' is selected: find any dark theme in the collection and use it as darkTokens
  // - When a specific theme is selected: no combined output (single-theme export)
  const darkTheme = useMemo(() => {
    if (selectedThemeId !== '__default__') return null;
    return themes.find(t => (t.colorMode ?? 'light') === 'dark') ?? null;
  }, [selectedThemeId, themes]);

  const darkTokens = darkTheme && tokens && namespace
    ? mergeThemeTokens(tokens, darkTheme, namespace)
    : undefined;

  return (
    <div className="px-6 py-6">
      <h1 className="text-lg font-semibold text-gray-900 mb-6">
        Configuration{collectionName ? `: ${collectionName}` : ''}
      </h1>
      <div className="grid grid-cols-2 gap-6 h-[calc(100vh-160px)]">
        {/* Left column — Build settings */}
        <div className="border rounded-lg bg-white p-4 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-700">Build Settings</h2>
          <div className="text-sm text-gray-600">
            <p>
              Collection:{' '}
              <span className="font-medium">{collectionName || 'Loading...'}</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Build tokens for this collection to generate CSS, SCSS, JS and other formats.
            </p>
          </div>
        </div>

        {/* Right column — Build output panel */}
        <div className="border rounded-lg bg-white overflow-auto flex flex-col">
          {themes.length > 0 && (
            <div className="flex items-center gap-2 mb-3 px-4 pt-4">
              <span className="text-sm text-gray-600 whitespace-nowrap">Export theme:</span>
              <Select
                value={selectedThemeId}
                onValueChange={(v) => setSelectedThemeId(v)}
              >
                <SelectTrigger className="h-8 text-sm w-44">
                  <SelectValue placeholder="Collection default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Collection default</SelectItem>
                  {themes.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-1.5">
                        {t.name}
                        <ColorModeBadge colorMode={(t.colorMode ?? 'light') as ColorMode} />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <BuildTokensPanel
            tokens={mergedTokens}
            namespace={namespace}
            collectionName={collectionName}
            themeLabel={themeLabel}
            darkTokens={darkTokens}
            colorMode={selectedTheme ? (selectedTheme.colorMode ?? 'light') : undefined}
          />
        </div>
      </div>
    </div>
  );
}
