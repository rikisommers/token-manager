'use client';

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { useCollection } from '@/context/CollectionContext';
import { CollectionSelector } from '@/components/CollectionSelector';
import { Button } from '@/components/ui/button';

export function AppHeader() {
  const { collections, selectedId, setSelectedId, loading, refreshCollections } = useCollection();
  const [creating, setCreating] = useState(false);

  const handleNewCollection = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Collection', tokens: {}, namespace: 'token' }),
      });
      if (res.ok) {
        const data = await res.json();
        const collection = data.collection ?? data;
        await refreshCollections();
        setSelectedId(collection._id);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <header className="flex items-center gap-4 px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
      <CollectionSelector
        collections={collections}
        selectedId={selectedId}
        loading={loading}
        onChange={setSelectedId}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handleNewCollection}
        disabled={creating}
      >
        <PlusCircle size={14} className="mr-1.5" />
        New Collection
      </Button>
    </header>
  );
}
