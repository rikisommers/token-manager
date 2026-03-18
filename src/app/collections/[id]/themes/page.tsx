'use client';

import { useState, useEffect } from 'react';
import { ThemeList, ThemeGroupMatrix } from '@/components/themes';
import { ToastNotification } from '@/components/layout/ToastNotification';
import type { ITheme, ThemeGroupState } from '@/types/theme.types';
import type { TokenGroup, ToastMessage } from '@/types';

interface ThemesPageProps {
  params: { id: string };
}

export default function CollectionThemesPage({ params }: ThemesPageProps) {
  const { id } = params;

  const [themes, setThemes] = useState<ITheme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [masterGroups, setMasterGroups] = useState<TokenGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Auto-clear toast after 4000ms
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Load themes and groups on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Fetch themes
        const themesRes = await fetch(`/api/collections/${id}/themes`);
        if (!themesRes.ok) throw new Error('Failed to load themes');
        const themesData = await themesRes.json();
        const loadedThemes: ITheme[] = themesData.themes ?? [];
        setThemes(loadedThemes);
        if (loadedThemes.length > 0) {
          setSelectedThemeId(loadedThemes[0].id);
        }

        // Fetch collection to extract groups
        const colRes = await fetch(`/api/collections/${id}`);
        if (!colRes.ok) throw new Error('Failed to load collection');
        const colData = await colRes.json();
        const col = colData.collection ?? colData;
        const tokens = (col.tokens ?? {}) as Record<string, unknown>;

        // Derive flat top-level groups from token keys
        const groups: TokenGroup[] = Object.entries(tokens)
          .filter(([k, v]) => !k.startsWith('$') && typeof v === 'object' && v !== null)
          .map(([k]) => ({
            id: k,
            name: k,
            tokens: [],
            level: 0,
          }));
        setMasterGroups(groups);
      } catch {
        setToast({ message: 'Failed to load themes', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleAddTheme = async (name: string) => {
    try {
      const res = await fetch(`/api/collections/${id}/themes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to create theme');
      const data = await res.json();
      const newTheme: ITheme = data.theme;
      setThemes((prev) => [...prev, newTheme]);
      setSelectedThemeId(newTheme.id);
    } catch {
      setToast({ message: 'Failed to create theme', type: 'error' });
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    try {
      const res = await fetch(`/api/collections/${id}/themes/${themeId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete theme');
      setThemes((prev) => {
        const updated = prev.filter((t) => t.id !== themeId);
        setSelectedThemeId((prevSelected) => {
          if (prevSelected === themeId) {
            return updated.length > 0 ? updated[0].id : null;
          }
          return prevSelected;
        });
        return updated;
      });
    } catch {
      setToast({ message: 'Failed to delete theme', type: 'error' });
    }
  };

  const handleStateChange = async (groupId: string, state: ThemeGroupState) => {
    if (!selectedThemeId) return;
    const selectedTheme = themes.find((t) => t.id === selectedThemeId);
    if (!selectedTheme) return;

    const updatedGroups = { ...selectedTheme.groups, [groupId]: state };

    // Optimistic update
    setThemes((prev) =>
      prev.map((t) =>
        t.id === selectedThemeId ? { ...t, groups: updatedGroups } : t
      )
    );

    try {
      const res = await fetch(`/api/collections/${id}/themes/${selectedThemeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: updatedGroups }),
      });
      if (!res.ok) throw new Error('Failed to update theme');
    } catch {
      // Revert optimistic update
      setThemes((prev) =>
        prev.map((t) =>
          t.id === selectedThemeId ? selectedTheme : t
        )
      );
      setToast({ message: 'Failed to update theme', type: 'error' });
    }
  };

  const selectedTheme = themes.find((t) => t.id === selectedThemeId) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Heading bar */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-6 py-3 flex-shrink-0">
        <h1 className="text-lg font-semibold text-gray-900">Themes</h1>
      </div>

      {/* Two-panel layout */}
      <div className="flex h-full overflow-hidden">
        {/* Left panel — 192px fixed (w-48) */}
        <aside className="w-48 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
          <ThemeList
            themes={themes}
            selectedThemeId={selectedThemeId}
            onSelect={setSelectedThemeId}
            onAdd={handleAddTheme}
            onDelete={handleDeleteTheme}
          />
        </aside>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedTheme ? (
            <>
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                {selectedTheme.name}
              </h2>
              <ThemeGroupMatrix
                theme={selectedTheme}
                groups={masterGroups}
                onStateChange={handleStateChange}
              />
            </>
          ) : (
            <p className="text-sm text-gray-400 mt-8 text-center">
              {themes.length === 0
                ? 'No themes yet. Click + to create one.'
                : 'Select a theme to manage its groups.'}
            </p>
          )}
        </div>
      </div>

      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
