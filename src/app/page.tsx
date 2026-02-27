'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TokenTable } from '@/components/TokenTable';
import { ToastNotification } from '@/components/ToastNotification';
import { BuildTokensModal } from '@/components/BuildTokensModal';
import { SaveCollectionDialog } from '@/components/SaveCollectionDialog';
import { SharedCollectionHeader } from '@/components/SharedCollectionHeader';
import type { ToastMessage } from '@/types';

interface Token {
  value: string;
  type: string;
  attributes?: Record<string, unknown>;
  resolvedValue?: string;
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
    if (('value' in node && 'type' in node) || ('$value' in node && '$type' in node)) {
      // Token leaf — supports both plain {value, type} and W3C {$value, $type} formats
      const rawValue = node.$value ?? node.value;
      const rawType = node.$type ?? node.type;
      if (!result[section]) result[section] = [];
      result[section].push({
        path: currentPath,
        token: {
          value: String(rawValue),
          type: typeof rawType === 'string' ? rawType : 'other',
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

  // Resolve token references: build a flat path→value map, then resolve
  const pathMap = new Map<string, string>();
  for (const groups of Object.values(result)) {
    for (const g of groups) {
      pathMap.set(g.path, g.token.value);
    }
  }
  const resolveRef = (val: string, depth = 0): string => {
    if (depth > 10 || !val.startsWith('{') || !val.endsWith('}')) return val;
    let ref = val.slice(1, -1);
    if (ref.endsWith('.value')) ref = ref.slice(0, -6);
    // Try exact match first, then suffix match
    if (pathMap.has(ref)) return resolveRef(pathMap.get(ref)!, depth + 1);
    for (const [path, v] of pathMap.entries()) {
      if (ref.endsWith('.' + path)) return resolveRef(v, depth + 1);
    }
    return val; // unresolved
  };
  for (const groups of Object.values(result)) {
    for (const g of groups) {
      if (g.token.value.startsWith('{')) {
        const resolved = resolveRef(g.token.value);
        if (resolved !== g.token.value) g.token.resolvedValue = resolved;
      }
    }
  }

  return result;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = (searchParams.get('tab') as 'view' | 'generate') ?? 'view';

  const [tokenData, setTokenData] = useState<Record<string, TokenGroup[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>('local');
  const [tableLoading, setTableLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [buildModalOpen, setBuildModalOpen] = useState(false);
  const [rawCollectionTokens, setRawCollectionTokens] = useState<Record<string, unknown> | null>(null);
  const [rawCollectionName, setRawCollectionName] = useState<string>('');
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [isSavingAs, setIsSavingAs] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Build is enabled when a MongoDB collection is selected (not 'local')
  const isBuildEnabled = selectedId !== 'local' && selectedId !== '';

  const switchTab = (tab: 'view' | 'generate') => {
    router.push(tab === 'view' ? '/' : '/?tab=generate');
  };

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
      setRawCollectionTokens(null);
      setRawCollectionName('');
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
        setRawCollectionTokens(rawTokens);
        setRawCollectionName(collectionName);
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

  const handleDeleted = () => {
    // Remove deleted collection from list
    setCollections(prev => prev.filter(c => c._id !== selectedId));
    // Clear selection back to local files
    handleSelectionChange('local');
    setToast({ message: 'Collection deleted', type: 'success' });
  };

  const handleRenamed = (newName: string) => {
    // Update name in collections list in place
    setCollections(prev =>
      prev.map(c => c._id === selectedId ? { ...c, name: newName } : c)
    );
    setToast({ message: `Renamed to "${newName}"`, type: 'success' });
  };

  const handleDuplicated = (newId: string, newName: string) => {
    // Add duplicate to collections list
    setCollections(prev => [...prev, { _id: newId, name: newName }]);
    // Switch to the new duplicate
    handleSelectionChange(newId);
    setToast({ message: `Duplicated as "${newName}"`, type: 'success' });
  };

  const handleNewCollection = () => {
    // Clear selection to local, switch to generate tab
    handleSelectionChange('local');
    switchTab('generate');
  };

  const handleSaveAs = async (name: string) => {
    setIsSavingAs(true);
    try {
      // Determine token payload: rawCollectionTokens for MongoDB collection, tokenData for local
      const tokensPayload = rawCollectionTokens ?? tokenData;
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tokens: tokensPayload }),
      });
      if (res.status === 201) {
        const { collection } = await res.json();
        setCollections(prev => [...prev, { _id: collection._id, name: collection.name }]);
        handleSelectionChange(collection._id);
        setSaveAsDialogOpen(false);
        setToast({ message: `Saved as "${collection.name}"`, type: 'success' });
      } else if (res.status === 409) {
        // Name conflict — dialog will show overwrite step
        const data = await res.json();
        // Overwrite: PUT
        const putRes = await fetch(`/api/collections/${data.existingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, tokens: tokensPayload }),
        });
        if (putRes.ok) {
          const { collection } = await putRes.json();
          setCollections(prev => prev.map(c => c._id === collection._id ? { ...c, name: collection.name } : c));
          handleSelectionChange(collection._id);
          setSaveAsDialogOpen(false);
          setToast({ message: `Saved as "${collection.name}"`, type: 'success' });
        } else {
          setToast({ message: 'Failed to save collection', type: 'error' });
        }
      } else {
        setToast({ message: 'Failed to save collection', type: 'error' });
      }
    } catch {
      setToast({ message: 'Failed to save collection', type: 'error' });
    } finally {
      setIsSavingAs(false);
    }
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
      {/* App header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Design Token Manager</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBuildModalOpen(true)}
                disabled={!isBuildEnabled}
                className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Build Tokens
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Shared collection header */}
      <SharedCollectionHeader
        collections={collections}
        selectedId={selectedId}
        tableLoading={tableLoading}
        onSelectionChange={handleSelectionChange}
        onSaveAs={() => setSaveAsDialogOpen(true)}
        onNewCollection={handleNewCollection}
        onDeleted={handleDeleted}
        onRenamed={handleRenamed}
        onDuplicated={handleDuplicated}
        onError={(msg) => setToast({ message: msg, type: 'error' })}
      />

      {/* Tab switcher */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-2">
            <button
              onClick={() => switchTab('view')}
              className={
                activeTab === 'view'
                  ? 'px-4 py-2 text-sm font-medium bg-blue-100 text-blue-900 rounded-md'
                  : 'px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md'
              }
            >
              View Tokens
            </button>
            <button
              onClick={() => switchTab('generate')}
              className={
                activeTab === 'generate'
                  ? 'px-4 py-2 text-sm font-medium bg-blue-100 text-blue-900 rounded-md'
                  : 'px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md'
              }
            >
              Generate Tokens
            </button>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'view' && (
          <div className="relative">
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
        )}

        {activeTab === 'generate' && (
          <div className="text-gray-500 text-sm">Generate tab (coming in Plan 02)</div>
        )}
      </main>

      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      <SaveCollectionDialog
        isOpen={saveAsDialogOpen}
        onSave={handleSaveAs}
        onCancel={() => setSaveAsDialogOpen(false)}
        isSaving={isSavingAs}
      />

      {rawCollectionTokens && (
        <BuildTokensModal
          tokens={rawCollectionTokens}
          namespace="token"
          collectionName={rawCollectionName}
          isOpen={buildModalOpen}
          onClose={() => setBuildModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
