'use client';

import { useEffect, useState } from 'react';
import { BuildTokensPanel } from '@/components/BuildTokensPanel';
import { useCollection } from '@/context/CollectionContext';

export default function ConfigurationPage() {
  const { selectedId, loading: collectionsLoading } = useCollection();
  const [tokens, setTokens] = useState<Record<string, unknown> | null>(null);
  const [namespace, setNamespace] = useState('token');
  const [collectionName, setCollectionName] = useState('');

  useEffect(() => {
    if (collectionsLoading) return;

    if (!selectedId || selectedId === 'local') {
      setTokens(null);
      setCollectionName('');
      setNamespace('token');
      return;
    }

    fetch(`/api/collections/${selectedId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch collection');
        return res.json();
      })
      .then((data: { collection?: { name?: string; namespace?: string; tokens?: Record<string, unknown> } }) => {
        const col = data.collection ?? (data as { name?: string; namespace?: string; tokens?: Record<string, unknown> });
        if (col.tokens) setTokens(col.tokens);
        if (col.name) setCollectionName(col.name);
        if (col.namespace) setNamespace(col.namespace);
      })
      .catch(() => {
        setTokens(null);
      });
  }, [selectedId, collectionsLoading]);

  return (
    <div className="px-6 py-6">
      <h1 className="text-lg font-semibold text-gray-900 mb-6">Configuration</h1>
      <div className="grid grid-cols-2 gap-6 h-[calc(100vh-160px)]">
        {/* Left column — Build settings */}
        <div className="border rounded-lg bg-white p-4 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-700">Build Settings</h2>
          <div className="text-sm text-gray-600">
            <p>
              Collection:{' '}
              <span className="font-medium">{collectionName || 'None selected'}</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Select a collection in the header to enable building.
            </p>
          </div>
          {/* Build Tokens button is in the BuildTokensPanel header */}
        </div>

        {/* Right column — Build output panel */}
        <div className="border rounded-lg bg-white overflow-hidden flex flex-col">
          <BuildTokensPanel
            tokens={tokens}
            namespace={namespace}
            collectionName={collectionName}
          />
        </div>
      </div>
    </div>
  );
}
