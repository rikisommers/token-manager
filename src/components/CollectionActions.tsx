'use client';

import React, { useState, useEffect } from 'react';

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

  const baseButtonClass =
    'inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-white border rounded-md';

  return (
    <div className="mt-3 flex gap-2">
      {/* Delete button */}
      <button
        onClick={() => setShowDeleteModal(true)}
        className={`${baseButtonClass} text-red-600 border-red-300 hover:bg-red-50`}
      >
        🗑️ Delete
      </button>

      {/* Rename button */}
      <button
        onClick={() => setShowRenameModal(true)}
        className={`${baseButtonClass} text-gray-700 border-gray-300 hover:bg-gray-50`}
      >
        ✏️ Rename
      </button>

      {/* Duplicate button */}
      <button
        onClick={() => setShowDuplicateModal(true)}
        className={`${baseButtonClass} text-gray-700 border-gray-300 hover:bg-gray-50`}
      >
        📋 Duplicate
      </button>

      {/* ---- Delete Modal ---- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Delete Collection</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-500 hover:text-gray-700"
                disabled={isDeleting}
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700">
                Delete <strong>&ldquo;{selectedName}&rdquo;</strong>? This cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className={`px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 ${
                  isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Rename Modal ---- */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Rename Collection</h3>
              <button
                onClick={() => setShowRenameModal(false)}
                className="text-gray-500 hover:text-gray-700"
                disabled={isRenaming}
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Collection name
              </label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !renameSaveDisabled) handleRename();
                  if (e.key === 'Escape') setShowRenameModal(false);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                autoFocus
                disabled={isRenaming}
              />
              {renameIsDuplicate && (
                <p className="text-sm text-red-600">
                  A collection named &ldquo;{renameTrimmed}&rdquo; already exists.
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowRenameModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isRenaming}
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 ${
                  renameSaveDisabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={renameSaveDisabled}
              >
                {isRenaming ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Duplicate Modal ---- */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Duplicate Collection</h3>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="text-gray-500 hover:text-gray-700"
                disabled={isDuplicating}
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                New collection name
              </label>
              <input
                type="text"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !duplicateSaveDisabled) handleDuplicate();
                  if (e.key === 'Escape') setShowDuplicateModal(false);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                autoFocus
                disabled={isDuplicating}
              />
              {duplicateError && (
                <p className="text-sm text-red-600">{duplicateError}</p>
              )}
            </div>
            <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isDuplicating}
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicate}
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 ${
                  duplicateSaveDisabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={duplicateSaveDisabled}
              >
                {isDuplicating ? 'Duplicating...' : 'Duplicate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
