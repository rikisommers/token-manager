import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CollectionListItem {
  _id: string;
  name: string;
  createdAt: string;
}

interface LoadCollectionDialogProps {
  isOpen: boolean;
  onLoad: (collectionId: string) => Promise<void>;
  onCancel: () => void;
}

export function LoadCollectionDialog({
  isOpen,
  onLoad,
  onCancel,
}: LoadCollectionDialogProps) {
  const [collections, setCollections] = useState<CollectionListItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch collections when dialog opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
      setCollections([]);
      setFetchError(null);
      setIsFetching(false);
      setIsLoading(false);
      return;
    }

    const fetchCollections = async () => {
      setIsFetching(true);
      setFetchError(null);
      try {
        const res = await fetch('/api/collections');
        const data = await res.json();
        if (!res.ok) {
          setFetchError('Failed to load collections. Please try again.');
          return;
        }
        setCollections(data.collections ?? []);
      } catch {
        setFetchError('Failed to load collections. Please try again.');
      } finally {
        setIsFetching(false);
      }
    };

    fetchCollections();
  }, [isOpen]);

  const handleSelect = async (collectionId: string) => {
    setIsLoading(true);
    try {
      await onLoad(collectionId);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="w-full max-w-sm">
        <DialogHeader>
          <DialogTitle>Load Collection</DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div>
          {isFetching ? (
            <div className="flex justify-center py-6">
              <span className="inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : fetchError ? (
            <p className="text-sm text-red-600">{fetchError}</p>
          ) : collections.length === 0 ? (
            <p className="text-sm text-gray-500">No collections saved yet.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {collections.map((item) => (
                <Button
                  key={item._id}
                  onClick={() => handleSelect(item._id)}
                  disabled={isLoading}
                  variant="ghost"
                  className="w-full justify-start px-4 py-2 text-sm text-gray-800 disabled:opacity-50"
                >
                  {item.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
