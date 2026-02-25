'use client';

import { useState, useEffect, useRef } from 'react';
import { TokenTable } from '@/components/TokenTable';
import { CollectionSelector } from '@/components/CollectionSelector';
import { ToastNotification } from '@/components/ToastNotification';
import type { ToastMessage } from '@/types';

interface Token {
  value: string;
  type: string;
  attributes?: Record<string, unknown>;
}

interface TokenGroup {
  path: string;
  token: Token;
  filePath: string;
  section: string;
}

interface CollectionOption {
  _id: string;
  name: string;
}

/**
 * Flatten MongoDB token data into the Record<string, TokenGroup[]> shape expected by TokenTable.
 *
 * Stored format: { [relativeFilePath]: tokenData } — e.g. "globals/color-base.json": { token: {...} }
 * This matches TokenUpdater.getAllTokens() so the same display logic works for local and MongoDB tokens.
 *
 * Section = first path segment of the file key (e.g. "globals", "brands", "palette").
 * Leaf detection: a node with both `value` and `type` keys is a token (Style Dictionary format).
 */
function flattenMongoTokens(
  tokens: Record<string, unknown>,
  collectionName: string
): Record<string, TokenGroup[]> {
  const result: Record<string, TokenGroup[]> = {};

  function walk(node: Record<string, unknown>, currentPath: string, filePath: string, section: string) {
    if ('value' in node && 'type' in node) {
      // Token leaf
      if (!result[section]) result[section] = [];
      result[section].push({
        path: currentPath,
        token: {
          value: String(node.value),
          type: typeof node.type === 'string' ? node.type : 'other',
        },
        filePath,
        section,
      });
      return;
    }
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (child && typeof child === 'object' && !Array.isArray(child)) {
        const childPath = currentPath ? `${currentPath}.${key}` : key;
        walk(child as Record<string, unknown>, childPath, filePath, section);
      }
    }
  }

  // tokens keys are relative file paths like "globals/color-base.json"
  for (const filePath of Object.keys(tokens)) {
    const section = filePath.split('/')[0];
    const fileData = tokens[filePath];
    if (fileData && typeof fileData === 'object' && !Array.isArray(fileData)) {
      walk(fileData as Record<string, unknown>, '', filePath, section);
    }
  }

  // Strip leading dot from paths produced by empty-string start
  for (const section of Object.keys(result)) {
    for (const group of result[section]) {
      group.path = group.path.replace(/^\./, '');
    }
  }

  return result;
}

export default function Home() {
  const [tokenData, setTokenData] = useState<Record<string, TokenGroup[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>('local');
  const [tableLoading, setTableLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Load collections list on mount; restore last selection from localStorage
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/collections');
        if (!response.ok) throw new Error('Failed to load collections list');
        const data = await response.json();
        const fetchedCollections: CollectionOption[] = data.collections || [];
        setCollections(fetchedCollections);

        const storedId = localStorage.getItem('atui-selected-collection-id');
        const storedExists =
          storedId &&
          fetchedCollections.some((c) => c._id === storedId);

        if (storedExists && storedId) {
          handleSelectionChange(storedId, fetchedCollections);
        } else {
          handleSelectionChange('local', fetchedCollections);
        }
      } catch {
        setToast({ message: 'Failed to load collections list', type: 'error' });
        // Stay on local files — collections stays empty
        handleSelectionChange('local', []);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial Local Files load
  useEffect(() => {
    fetchTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/tokens');
      if (!response.ok) throw new Error('Failed to load tokens');
      const data = await response.json();
      setTokenData(data.flatTokens || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionChange = (
    id: string,
    _collections?: CollectionOption[]
  ) => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setSelectedId(id);
    localStorage.setItem('atui-selected-collection-id', id);

    if (id === 'local') {
      fetchTokens();
      return;
    }

    // Fetch MongoDB collection tokens
    (async () => {
      setTableLoading(true);
      try {
        const response = await fetch(`/api/collections/${id}`, {
          signal: abortControllerRef.current!.signal,
        });
        if (!response.ok) throw new Error('Failed to load collection');
        const data = await response.json();
        const rawTokens = data.collection.tokens as Record<string, unknown>;
        const collectionName = data.collection.name as string;
        const transformed = flattenMongoTokens(rawTokens, collectionName);
        setTokenData(transformed);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // User switched away — do nothing
          return;
        }
        setToast({ message: 'Failed to load collection', type: 'error' });
        setTokenData({});
      } finally {
        setTableLoading(false);
      }
    })();
  };

  const saveToken = async (filePath: string, tokenData: unknown) => {
    try {
      const response = await fetch(`/api/tokens/${filePath}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenData),
      });
      if (!response.ok) throw new Error('Failed to save token');
      return true;
    } catch (err) {
      console.error('Error saving token:', err);
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading design tokens...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchTokens}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-gray-900">Design Token Manager</h1>
              <nav className="flex space-x-4">
                <a
                  href="/"
                  className="bg-blue-100 text-blue-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  View Tokens
                </a>
                <a
                  href="/generate"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Generate Tokens
                </a>
              </nav>
            </div>
            <button
              onClick={fetchTokens}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <CollectionSelector
          collections={collections}
          selectedId={selectedId}
          loading={tableLoading}
          onChange={handleSelectionChange}
        />

        <div className="relative mt-6">
          {tableLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          )}

          {Object.keys(tokenData).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No design tokens found.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(tokenData).map(([section, tokens]) => (
                <TokenTable
                  key={section}
                  section={section}
                  tokens={tokens}
                  onSave={saveToken}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
