'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CollectionActionsProps {
  selectedId: string;
  selectedName: string;
  collections: { _id: string; name: string }[];
  onDeleted: () => void;
  onRenamed: (newName: string) => void;
  onDuplicated: (newId: string, newName: string) => void;
  onError: (message: string) => void;
}

export function CollectionActions({
  selectedId,
  selectedName,
  collections,
  onDeleted,
  onRenamed,
  onDuplicated,
  onError,
}: CollectionActionsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  useEffect(() => {
    if (showRenameModal) setRenameValue(selectedName);
  }, [showRenameModal, selectedName]);

  useEffect(() => {
    if (showDuplicateModal) {
      setDuplicateName('Copy of ' + selectedName);
      setDuplicateError(null);
    }
  }, [showDuplicateModal, selectedName]);

  if (!selectedId || selectedId === 'local' || collections.length === 0) {
    return null;
  }

  // --- Delete ---
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/collections/${selectedId}`, { method: 'DELETE' });
      if (res.ok) {
        setShowDeleteModal(false);
        onDeleted();
      } else {
        onError('Failed to delete collection');
      }
    } catch {
      onError('Failed to delete collection');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Rename ---
  const renameTrimmed = renameValue.trim();
  const renameIsDuplicate =
    renameTrimmed !== '' &&
    collections.some(
      (c) => c.name === renameTrimmed && c._id !== selectedId
    );
  const renameIsUnchanged = renameTrimmed === selectedName;
  const renameSaveDisabled =
    isRenaming || !renameTrimmed || renameIsDuplicate || renameIsUnchanged;

  const handleRename = async () => {
    if (renameSaveDisabled) return;
    setIsRenaming(true);
    try {
      const res = await fetch(`/api/collections/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameTrimmed }),
      });
      if (res.ok) {
        setShowRenameModal(false);
        onRenamed(renameTrimmed);
      } else {
        onError('Failed to rename collection');
      }
    } catch {
      onError('Failed to rename collection');
    } finally {
      setIsRenaming(false);
    }
  };

  // --- Duplicate ---
  const duplicateTrimmed = duplicateName.trim();
  const duplicateSaveDisabled = isDuplicating || !duplicateTrimmed;

  const handleDuplicate = async () => {
    if (duplicateSaveDisabled) return;
    setIsDuplicating(true);
    setDuplicateError(null);
    try {
      // Step 1: fetch source collection
      const getRes = await fetch(`/api/collections/${selectedId}`);
      if (!getRes.ok) {
        onError('Failed to duplicate collection');
        setIsDuplicating(false);
        return;
      }
      const { collection: source } = await getRes.json();

      // Step 2: POST new collection with copied tokens
      const postRes = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: duplicateTrimmed,
          tokens: source.tokens,
          sourceMetadata: source.sourceMetadata,
        }),
      });

      if (postRes.status === 409) {
        setDuplicateError(`A collection named "${duplicateTrimmed}" already exists.`);
        return;
      }

      if (postRes.status === 201) {
        const { collection } = await postRes.json();
        setShowDuplicateModal(false);
        onDuplicated(collection._id, collection.name);
      } else {
        onError('Failed to duplicate collection');
      }
    } catch {
      onError('Failed to duplicate collection');
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <div className="flex gap-2">
      {/* Delete button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDeleteModal(true)}
        className="text-red-600 border-red-300 hover:bg-red-50"
      >
        Delete
      </Button>

      {/* Rename button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowRenameModal(true)}
      >
        Rename
      </Button>

      {/* Duplicate button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDuplicateModal(true)}
      >
        Duplicate
      </Button>

      {/* ---- Delete Dialog ---- */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Collection</DialogTitle>
          </DialogHeader>
          <div>
            <p className="text-sm text-gray-700">
              Delete <strong>&ldquo;{selectedName}&rdquo;</strong>? This cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Rename Dialog ---- */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Collection name
            </label>
            <Input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !renameSaveDisabled) handleRename();
                if (e.key === 'Escape') setShowRenameModal(false);
              }}
              autoFocus
              disabled={isRenaming}
            />
            {renameIsDuplicate && (
              <p className="text-sm text-red-600">
                A collection named &ldquo;{renameTrimmed}&rdquo; already exists.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRenameModal(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={renameSaveDisabled}
            >
              {isRenaming ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Duplicate Dialog ---- */}
      <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              New collection name
            </label>
            <Input
              type="text"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !duplicateSaveDisabled) handleDuplicate();
                if (e.key === 'Escape') setShowDuplicateModal(false);
              }}
              autoFocus
              disabled={isDuplicating}
            />
            {duplicateError && (
              <p className="text-sm text-red-600">{duplicateError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDuplicateModal(false)}
              disabled={isDuplicating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={duplicateSaveDisabled}
            >
              {isDuplicating ? 'Duplicating...' : 'Duplicate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
