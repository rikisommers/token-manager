'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NewCollectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  existingCollections: { _id: string; name: string }[];
  onCreated: (newId: string) => void;
}

export function NewCollectionDialog({
  isOpen,
  onClose,
  existingCollections,
  onCreated,
}: NewCollectionDialogProps) {
  const [name, setName] = useState('');
  const [duplicateSourceId, setDuplicateSourceId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setName('');
    setDuplicateSourceId('');
    setError('');
    onClose();
  };

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    setError('');
    setIsCreating(true);
    try {
      if (duplicateSourceId) {
        // Duplicate then rename
        const dupRes = await fetch(`/api/collections/${duplicateSourceId}/duplicate`, {
          method: 'POST',
        });
        if (!dupRes.ok) {
          setError('Failed to duplicate collection.');
          return;
        }
        const dupData = await dupRes.json();
        const newId = (dupData.collection ?? dupData)._id as string;

        // Rename to user-provided name
        const renameRes = await fetch(`/api/collections/${newId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmedName }),
        });
        if (!renameRes.ok) {
          setError('Duplicated, but failed to rename. Check the collections list.');
          return;
        }
        handleClose();
        onCreated(newId);
      } else {
        // Plain create
        const res = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmedName, tokens: {} }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? 'Failed to create collection.');
          return;
        }
        const data = await res.json();
        const newId = (data.collection ?? data)._id as string;
        handleClose();
        onCreated(newId);
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="My collection"
              autoFocus
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          {existingCollections.length > 0 && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Duplicate from (optional)
              </label>
              <Select
                value={duplicateSourceId}
                onValueChange={setDuplicateSourceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Start from scratch" />
                </SelectTrigger>
                <SelectContent>
                  {existingCollections.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {duplicateSourceId && (
                <p className="text-xs text-gray-500">
                  Will duplicate the selected collection and rename it.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating && <Loader2 size={14} className="mr-1.5 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
