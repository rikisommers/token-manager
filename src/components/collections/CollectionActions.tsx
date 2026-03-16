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
  /** Controlled delete dialog state — if provided, dialogs are driven by parent */
  deleteOpen?: boolean;
  onDeleteOpenChange?: (open: boolean) => void;
  /** Controlled rename dialog state — if provided, dialogs are driven by parent */
  renameOpen?: boolean;
  onRenameOpenChange?: (open: boolean) => void;
}

export function CollectionActions({
  selectedId,
  selectedName,
  collections,
  onDeleted,
  onRenamed,
  onDuplicated,
  onError,
  deleteOpen,
  onDeleteOpenChange,
  renameOpen,
  onRenameOpenChange,
}: CollectionActionsProps) {
  const controlled = deleteOpen !== undefined || renameOpen !== undefined;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const deleteModalOpen = controlled ? (deleteOpen ?? false) : showDeleteModal;
  const setDeleteModalOpen = controlled ? (onDeleteOpenChange ?? (() => {})) : setShowDeleteModal;
  const renameModalOpen = controlled ? (renameOpen ?? false) : showRenameModal;
  const setRenameModalOpen = controlled ? (onRenameOpenChange ?? (() => {})) : setShowRenameModal;

  useEffect(() => {
    if (renameModalOpen) setRenameValue(selectedName);
  }, [renameModalOpen, selectedName]);

  if (!selectedId || selectedId === 'local' || collections.length === 0) {
    return null;
  }

  // --- Delete ---
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/collections/${selectedId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteModalOpen(false);
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
    renameTrimmed !== '' && collections.some((c) => c.name === renameTrimmed && c._id !== selectedId);
  const renameIsUnchanged = renameTrimmed === selectedName;
  const renameSaveDisabled = isRenaming || !renameTrimmed || renameIsDuplicate || renameIsUnchanged;

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
        setRenameModalOpen(false);
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

  return (
    <>
      {/* Uncontrolled trigger buttons — only when not driven by parent dropdown */}
      {!controlled && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Delete
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowRenameModal(true)}>
            Rename
          </Button>
        </div>
      )}

      {/* ---- Delete Dialog ---- */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
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
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Rename Dialog ---- */}
      <Dialog open={renameModalOpen} onOpenChange={setRenameModalOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Collection name</label>
            <Input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !renameSaveDisabled) handleRename();
                if (e.key === 'Escape') setRenameModalOpen(false);
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
            <Button variant="outline" onClick={() => setRenameModalOpen(false)} disabled={isRenaming}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={renameSaveDisabled}>
              {isRenaming ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
