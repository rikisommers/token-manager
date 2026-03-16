'use client';

import { useEffect, useState } from 'react';
import { CollectionSidebar } from '@/components/collections/CollectionSidebar';

interface CollectionLayoutClientProps {
  id: string;
  children: React.ReactNode;
}

export function CollectionLayoutClient({ id, children }: CollectionLayoutClientProps) {
  const [collectionName, setCollectionName] = useState('');

  useEffect(() => {
    fetch(`/api/collections/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch collection');
        return res.json();
      })
      .then((data: { collection?: { name?: string }; name?: string }) => {
        const col = data.collection ?? (data as { name?: string });
        if (col.name) setCollectionName(col.name);
      })
      .catch(() => {
        setCollectionName('');
      });
  }, [id]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <CollectionSidebar collectionId={id} collectionName={collectionName} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
