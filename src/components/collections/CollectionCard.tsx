'use client';

import { useRef, useState, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import type { CollectionCardData } from '@/types/collection.types';

interface CollectionCardProps {
  collection: CollectionCardData;
  onRename: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => Promise<void>;
  onClick: (id: string) => void;
}

export function CollectionCard({
  collection,
  onRename,
  onDelete,
  onDuplicate,
  onClick,
}: CollectionCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(collection.name);
  const [isRenamePending, setIsRenamePending] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleKebabClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  };

  const handleRenameSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameValue(collection.name);
    setIsMenuOpen(false);
    setIsRenaming(true);
  };

  const handleDuplicateSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onDuplicate(collection._id);
  };

  const handleDeleteSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onDelete(collection._id);
  };

  const commitRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === collection.name) {
      setIsRenaming(false);
      return;
    }
    setIsRenamePending(true);
    try {
      await onRename(collection._id, trimmed);
    } finally {
      setIsRenamePending(false);
      setIsRenaming(false);
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
    }
  };

  const formattedDate = new Date(collection.updatedAt).toLocaleDateString();

  return (
    <div
      className="relative bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all group"
      onClick={() => onClick(collection._id)}
    >
      {/* Kebab menu button */}
      <div
        ref={menuRef}
        className="absolute top-2 right-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 transition-opacity"
          onClick={handleKebabClick}
          aria-label="Collection options"
        >
          <MoreVertical size={16} className="text-gray-500" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-7 z-10 w-36 bg-white border border-gray-200 rounded-md shadow-lg py-1">
            <button
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              onClick={handleRenameSelect}
            >
              Rename
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              onClick={handleDuplicateSelect}
            >
              Duplicate
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              onClick={handleDeleteSelect}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Title / Inline rename */}
      {isRenaming ? (
        <input
          ref={inputRef}
          autoFocus
          className="w-full text-gray-900 font-semibold text-base border border-gray-300 rounded px-1 py-0.5 pr-6 mb-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={renameValue}
          disabled={isRenamePending}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={commitRename}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <h3 className="text-gray-900 font-semibold text-base truncate pr-6">
          {collection.name}
        </h3>
      )}

      {/* Description */}
      <p className="text-gray-500 text-sm mt-1 line-clamp-2">
        {collection.description ?? (
          <span className="text-gray-300">No description</span>
        )}
      </p>

      {/* Tags */}
      {collection.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {collection.tags.map((tag) => (
            <span
              key={tag}
              className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
        <span>{collection.tokenCount} tokens</span>
        <span>Updated {formattedDate}</span>
      </div>

      {/* Integration badges */}
      {(collection.figmaConfigured || collection.githubConfigured) && (
        <div className="flex gap-1.5 mt-2">
          {collection.figmaConfigured && (
            <span className="bg-green-50 text-green-700 text-xs px-1.5 py-0.5 rounded border border-green-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Figma
            </span>
          )}
          {collection.githubConfigured && (
            <span className="bg-green-50 text-green-700 text-xs px-1.5 py-0.5 rounded border border-green-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              GitHub
            </span>
          )}
        </div>
      )}
    </div>
  );
}
