'use client';

import { useState } from 'react';
import { X, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TokenGroup, TokenType, TOKEN_TYPES } from '@/types/token.types';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { GroupPickerModal } from './GroupPickerModal';

interface BulkActionBarProps {
  selectedCount: number;
  selectedTokenPaths: string[];
  groups: TokenGroup[];
  sourceGroupId: string;
  detectedPrefix: string;
  isReadOnly: boolean;
  onDelete: () => void;
  onMoveToGroup: (destGroupId: string) => void;
  onChangeType: (type: TokenType) => void;
  onAddPrefix: (prefix: string) => void;
  onRemovePrefix: (prefix: string) => void;
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedCount,
  selectedTokenPaths,
  groups,
  sourceGroupId,
  detectedPrefix,
  isReadOnly,
  onDelete,
  onMoveToGroup,
  onChangeType,
  onAddPrefix,
  onRemovePrefix,
  onClearSelection,
}: BulkActionBarProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [addPrefixOpen, setAddPrefixOpen] = useState(false);
  const [addPrefixValue, setAddPrefixValue] = useState('');
  const [removePrefixOpen, setRemovePrefixOpen] = useState(false);
  const [removePrefixValue, setRemovePrefixValue] = useState('');

  if (isReadOnly || selectedCount === 0) {
    return null;
  }

  const handleOpenRemovePrefix = () => {
    setRemovePrefixValue(detectedPrefix);
    setRemovePrefixOpen(true);
  };

  const previewPaths = selectedTokenPaths.slice(0, 5);
  const previewOverflow = selectedTokenPaths.length - 5;

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm mb-2"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClearSelection();
      }}
    >
      {/* Selection count */}
      <span className="text-sm font-medium text-gray-700 mr-2">
        {selectedCount} selected
      </span>

      {/* Delete */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="w-3.5 h-3.5 mr-1" />
        Delete
      </Button>
      <DeleteConfirmDialog
        open={deleteOpen}
        count={selectedCount}
        onConfirm={() => {
          onDelete();
          setDeleteOpen(false);
        }}
        onCancel={() => setDeleteOpen(false)}
      />

      {/* Move to group */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setMoveOpen(true)}
      >
        <ArrowRight className="w-3.5 h-3.5 mr-1" />
        Move
      </Button>
      <GroupPickerModal
        open={moveOpen}
        groups={groups}
        sourceGroupId={sourceGroupId}
        onSelect={(id) => {
          onMoveToGroup(id);
          setMoveOpen(false);
        }}
        onCancel={() => setMoveOpen(false)}
      />

      {/* Change type */}
      <Select value="" onValueChange={(v) => onChangeType(v as TokenType)}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="Change type" />
        </SelectTrigger>
        <SelectContent>
          {TOKEN_TYPES.map((type) => (
            <SelectItem key={type} value={type} className="text-xs">
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Add prefix */}
      {!addPrefixOpen ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddPrefixOpen(true)}
        >
          Add prefix
        </Button>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Input
              value={addPrefixValue}
              onChange={(e) => setAddPrefixValue(e.target.value)}
              placeholder="prefix-"
              className="h-7 w-32 text-xs"
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => {
                onAddPrefix(addPrefixValue);
                setAddPrefixOpen(false);
                setAddPrefixValue('');
              }}
              disabled={!addPrefixValue}
            >
              Apply
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAddPrefixOpen(false);
                setAddPrefixValue('');
              }}
            >
              ×
            </Button>
          </div>
          {addPrefixValue && (
            <div className="flex flex-col gap-0.5 pl-1">
              {previewPaths.map((path) => (
                <div
                  key={path}
                  className="text-xs text-gray-500 font-mono truncate"
                >
                  {addPrefixValue}{path}
                </div>
              ))}
              {previewOverflow > 0 && (
                <div className="text-xs text-gray-400">
                  +{previewOverflow} more
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Remove prefix */}
      {!removePrefixOpen ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenRemovePrefix}
        >
          Remove prefix
        </Button>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Input
              value={removePrefixValue}
              onChange={(e) => setRemovePrefixValue(e.target.value)}
              placeholder="prefix-"
              className="h-7 w-32 text-xs"
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => {
                onRemovePrefix(removePrefixValue);
                setRemovePrefixOpen(false);
                setRemovePrefixValue('');
              }}
              disabled={!removePrefixValue}
            >
              Apply
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRemovePrefixOpen(false);
                setRemovePrefixValue('');
              }}
            >
              ×
            </Button>
          </div>
          <div className="flex flex-col gap-0.5 pl-1">
            {previewPaths.map((path) => {
              const changed = path.startsWith(removePrefixValue) && removePrefixValue;
              const newPath = changed ? path.slice(removePrefixValue.length) : path;
              return (
                <div
                  key={path}
                  className={[
                    'text-xs font-mono truncate',
                    changed ? 'text-gray-500' : 'text-gray-400',
                  ].join(' ')}
                >
                  {newPath}
                </div>
              );
            })}
            {previewOverflow > 0 && (
              <div className="text-xs text-gray-400">
                +{previewOverflow} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear selection */}
      <button
        onClick={onClearSelection}
        className="ml-auto p-1 rounded hover:bg-gray-100"
        aria-label="Clear selection"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}
