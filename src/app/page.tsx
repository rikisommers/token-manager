'use client';

import { useState, useEffect, useRef } from 'react';
import { TokenTable } from '@/components/TokenTable';
import { ToastNotification } from '@/components/ToastNotification';
import { SaveCollectionDialog } from '@/components/SaveCollectionDialog';
import { TokenGeneratorFormNew } from '@/components/TokenGeneratorFormNew';
import { TokenGeneratorDocs } from '@/components/TokenGeneratorDocs';
import { SourceContextBar } from '@/components/SourceContextBar';
import { ImportFromFigmaDialog } from '@/components/ImportFromFigmaDialog';
import { CollectionActions } from '@/components/CollectionActions';
import { Button } from '@/components/ui/button';
import { useCollection } from '@/context/CollectionContext';
import type { ToastMessage } from '@/types';
import type { ISourceMetadata } from '@/types/collection.types';

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


/**
 * Flatten MongoDB token data into the Record<string, TokenGroup[]> shape expected by TokenTable.
 *
 * Stored format: { [relativeFilePath]: tokenData } -- e.g. "globals/color-base.json": { token: {...} }
 * This matches TokenUpdater.getAllTokens() so the same display logic works for local and MongoDB tokens.
 *
 * Section = first path segment of the file key (e.g. "globals", "brands", "palette").
 * Leaf detection: a node with both value and type keys is a token (Style Dictionary format).
 */
function flattenMongoTokens(
  tokens: Record<string, unknown>,
  collectionName: string
): Record<string, TokenGroup[]> {
  const result: Record<string, TokenGroup[]> = {};

  function walk(node: Record<string, unknown>, currentPath: string, filePath: string, section: string) {
    if (('value' in node && 'type' in node) || ('$value' in node && '$type' in node)) {
      // Token leaf -- supports both plain {value, type} and W3C {$value, $type} formats
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

  // Resolve token references: build a flat path->value map, then resolve
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

export default function Home() {
  const { collections, selectedId, setSelectedId, loading: collectionsLoading, refreshCollections } = useCollection();
  const [tokenData, setTokenData] = useState<Record<string, TokenGroup[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [rawCollectionTokens, setRawCollectionTokens] = useState<Record<string, unknown> | null>(null);
  const [rawCollectionName, setRawCollectionName] = useState<string>('');
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [isSavingAs, setIsSavingAs] = useState(false);
  const [importFigmaOpen, setImportFigmaOpen] = useState(false);
  const [selectedSourceMetadata, setSelectedSourceMetadata] = useState<ISourceMetadata | null>(null);

  // Generate tab state
  const [githubConfig, setGitHubConfig] = useState<{ repository: string; token: string; branch: string } | null>(null);
  const [figmaConfig, setFigmaConfig] = useState<{ token: string; fileKey: string } | null>(null);
  const [generateTabTokens, setGenerateTabTokens] = useState<Record<string, unknown> | null>(null);
  const [generateTabNamespace, setGenerateTabNamespace] = useState('token');
  const [generateTabCollectionName, setGenerateTabCollectionName] = useState('');
  const [generateFormKey, setGenerateFormKey] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleGenerateTokensChange = (
    tokens: Record<string, unknown> | null,
    namespace: string,
    collectionName: string
  ) => {
    setGenerateTabTokens(tokens);
    setGenerateTabNamespace(namespace || 'token');
    setGenerateTabCollectionName(collectionName || 'generated-tokens');
  };

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Load tokens when selectedId changes (driven by CollectionContext)
  useEffect(() => {
    if (collectionsLoading) return; // wait for context to resolve selectedId
    loadTokensForSelection(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, collectionsLoading]);

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

  const loadTokensForSelection = (id: string) => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    if (id === 'local') {
      setRawCollectionTokens(null);
      setRawCollectionName('');
      setSelectedSourceMetadata(null);
      setGenerateFormKey(k => k + 1);
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
        const sourceMeta = data.collection.sourceMetadata as ISourceMetadata | null;
        setRawCollectionTokens(rawTokens);
        setRawCollectionName(collectionName);
        setSelectedSourceMetadata(sourceMeta);
        const transformed = flattenMongoTokens(rawTokens, collectionName);
        setTokenData(transformed);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setToast({ message: 'Failed to load collection', type: 'error' });
        setTokenData({});
      } finally {
        setTableLoading(false);
      }
    })();
  };

  const handleDeleted = async () => {
    await refreshCollections();
    setSelectedId('local');
    setToast({ message: 'Collection deleted', type: 'success' });
  };

  const handleRenamed = async (newName: string) => {
    await refreshCollections();
    setToast({ message: `Renamed to "${newName}"`, type: 'success' });
  };

  const handleDuplicated = async (newId: string, newName: string) => {
    await refreshCollections();
    setSelectedId(newId);
    setToast({ message: `Duplicated as "${newName}"`, type: 'success' });
  };

  const handleSaveAs = async (name: string) => {
    setIsSavingAs(true);
    try {
      const tokensPayload = generateTabTokens ?? rawCollectionTokens ?? tokenData;

      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tokens: tokensPayload }),
      });
      if (res.status === 201) {
        const { collection } = await res.json();
        await refreshCollections();
        setSelectedId(collection._id);
        setSaveAsDialogOpen(false);
        setToast({ message: `Saved as "${collection.name}"`, type: 'success' });
      } else if (res.status === 409) {
        // Name conflict -- dialog will show overwrite step
        const data = await res.json();
        // Overwrite: PUT
        const putRes = await fetch(`/api/collections/${data.existingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, tokens: tokensPayload }),
        });
        if (putRes.ok) {
          const { collection } = await putRes.json();
          await refreshCollections();
          setSelectedId(collection._id);
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
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="text-red-600 text-lg mb-2">Error</div>
        <p className="text-gray-600 text-sm">{error}</p>
        <Button onClick={fetchTokens} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div>
      {/* Collection actions top bar */}
      <div className="flex items-center gap-3 flex-wrap border-b border-gray-200 bg-white px-6 py-3">
        <Button variant="outline" size="sm" onClick={() => setSaveAsDialogOpen(true)}>Save As</Button>
        <CollectionActions
          selectedId={selectedId}
          selectedName={collections.find(c => c._id === selectedId)?.name ?? ''}
          collections={collections}
          onDeleted={handleDeleted}
          onRenamed={handleRenamed}
          onDuplicated={handleDuplicated}
          onError={(msg) => setToast({ message: msg, type: 'error' })}
        />
      </div>

      {/* Source context bar -- slim upstream indicator, hidden when no source */}
      <SourceContextBar sourceMetadata={selectedSourceMetadata} />

      {/* Main content -- Generate Tokens form as primary content */}
      <main className="py-6 px-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-1">Create W3C Design Token Specification Compliant Tokens</h2>
          <p className="text-gray-600 text-sm">Generate design tokens that follow the W3C Design Tokens specification with proper value, type, and attributes.</p>
        </div>
        <div className="mb-4 flex items-center gap-2">
          <Button
            onClick={() => setImportFigmaOpen(true)}
            variant="outline"
          >
            Import from Figma
          </Button>
        </div>
        <TokenGeneratorDocs />
        <TokenGeneratorFormNew
          key={generateFormKey}
          githubConfig={githubConfig}
          onTokensChange={handleGenerateTokensChange}
          collectionToLoad={
            selectedId !== 'local' && rawCollectionTokens
              ? { id: selectedId, name: rawCollectionName, tokens: rawCollectionTokens }
              : null
          }
        />

        {/* View Tokens section -- preserved in code but hidden from navigation */}
        <div className="hidden">
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
        </div>
      </main>

      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      <SaveCollectionDialog
        isOpen={saveAsDialogOpen}
        onSave={handleSaveAs}
        onCancel={() => setSaveAsDialogOpen(false)}
        isSaving={isSavingAs}
      />

      <ImportFromFigmaDialog
        isOpen={importFigmaOpen}
        onClose={() => setImportFigmaOpen(false)}
        onImported={async (collectionId, collectionName) => {
          await refreshCollections();
          setSelectedId(collectionId);
          setImportFigmaOpen(false);
          setToast({ message: `Imported "${collectionName}" from Figma`, type: 'success' });
        }}
      />
    </div>
  );
}
