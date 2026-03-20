'use client';

import { useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FlatNode } from '@/utils/groupMove';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SortableGroupRowProps {
  node: FlatNode;
  isSelected: boolean;
  onSelect: (groupId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  onAddSubGroup?: (parentGroupId: string) => void;
  onRenameGroup?: (groupId: string, newLabel: string) => void;
  isDragOverlay?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowClassName(node: FlatNode, isSelected: boolean): string {
  const hasChildren = (node.group.children?.length ?? 0) > 0;
  const base = 'group/item flex items-center pr-1 text-sm cursor-pointer transition-colors';
  const selected = isSelected
    ? 'bg-indigo-50 text-indigo-900 font-medium'
    : 'hover:bg-gray-100 text-gray-700';
  const weight = hasChildren ? 'font-semibold' : 'font-normal';
  return `${base} ${selected} ${weight}`;
}

// ---------------------------------------------------------------------------
// Inline rename input
// ---------------------------------------------------------------------------

interface InlineLabelProps {
  displayLabel: string;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
}

function InlineLabel({
  displayLabel,
  isEditing,
  editValue,
  onEditValueChange,
  onCommit,
  onCancel,
  onStartEdit,
}: InlineLabelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="flex-1 py-0.5 px-1 text-xs rounded border border-indigo-400 bg-white outline-none min-w-0"
        value={editValue}
        autoFocus
        onClick={e => e.stopPropagation()}
        onChange={e => onEditValueChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); onCommit(); }
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          e.stopPropagation();
        }}
      />
    );
  }

  return (
    <span
      className="flex-1 py-1.5 truncate text-xs"
      onDoubleClick={e => { e.stopPropagation(); onStartEdit(); }}
    >
      {displayLabel}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Group actions dropdown
// ---------------------------------------------------------------------------

interface GroupActionsProps {
  node: FlatNode;
  onDeleteGroup?: (groupId: string) => void;
  onAddSubGroup?: (parentGroupId: string) => void;
  onRenameGroup?: (groupId: string, newLabel: string) => void;
  onStartRename: () => void;
}

function GroupActions({
  node,
  onDeleteGroup,
  onAddSubGroup,
  onRenameGroup,
  onStartRename,
}: GroupActionsProps) {
  const hasActions = onDeleteGroup || onAddSubGroup || onRenameGroup;
  if (!hasActions) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-all flex-shrink-0"
          onClick={e => e.stopPropagation()}
          title="Group actions"
        >
          <MoreHorizontal size={13} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onClick={e => e.stopPropagation()}>
        {onRenameGroup && (
          <DropdownMenuItem
            className="gap-2 text-xs"
            onClick={() => onStartRename()}
          >
            <Pencil size={12} /> Rename
          </DropdownMenuItem>
        )}
        {onRenameGroup && onAddSubGroup && <DropdownMenuSeparator />}
        {onAddSubGroup && (
          <DropdownMenuItem
            className="gap-2 text-xs"
            onClick={() => onAddSubGroup(node.group.id)}
          >
            <Plus size={12} /> Add Sub-group
          </DropdownMenuItem>
        )}
        {onAddSubGroup && onDeleteGroup && <DropdownMenuSeparator />}
        {!onAddSubGroup && onRenameGroup && onDeleteGroup && <DropdownMenuSeparator />}
        {onDeleteGroup && (
          <DropdownMenuItem
            className="gap-2 text-xs text-red-600 focus:text-red-700"
            onClick={() => onDeleteGroup(node.group.id)}
          >
            <Trash2 size={12} /> Delete Group
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SortableGroupRow({
  node,
  isSelected,
  onSelect,
  onDeleteGroup,
  onAddSubGroup,
  onRenameGroup,
  isDragOverlay = false,
}: SortableGroupRowProps) {
  // Static overlay version — no sortable hooks, no transform
  if (isDragOverlay) {
    return (
      <div
        style={{ paddingLeft: node.depth * 14 + 8 }}
        className={rowClassName(node, isSelected)}
      >
        <GripVertical size={12} className="text-gray-300 mr-1 flex-shrink-0" />
        <span className="flex-1 py-1.5 truncate text-xs">{node.displayLabel}</span>
      </div>
    );
  }

  return <SortableRowInner
    node={node}
    isSelected={isSelected}
    onSelect={onSelect}
    onDeleteGroup={onDeleteGroup}
    onAddSubGroup={onAddSubGroup}
    onRenameGroup={onRenameGroup}
  />;
}

// Inner component keeps hook calls unconditional (hooks rules)
function SortableRowInner({
  node,
  isSelected,
  onSelect,
  onDeleteGroup,
  onAddSubGroup,
  onRenameGroup,
}: Omit<SortableGroupRowProps, 'isDragOverlay'>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.group.id });

  const style: React.CSSProperties = {
    paddingLeft: node.depth * 14 + 8,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  function startEdit() {
    setEditValue(node.displayLabel);
    setIsEditing(true);
  }

  function commitEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== node.displayLabel && onRenameGroup) {
      onRenameGroup(node.group.id, trimmed);
    }
    setIsEditing(false);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={rowClassName(node, isSelected)}
      {...attributes}
      onClick={e => { e.stopPropagation(); if (!isEditing) onSelect(node.group.id); }}
    >
      {/* Drag handle — hidden while editing */}
      <button
        {...(isEditing ? {} : listeners)}
        className={`p-1 text-gray-300 flex-shrink-0 ${isEditing ? 'pointer-events-none opacity-0' : 'cursor-grab hover:text-gray-500'}`}
        title="Drag to reorder"
        tabIndex={-1}
        aria-hidden={isEditing}
      >
        <GripVertical size={12} />
      </button>

      {/* Label / inline input */}
      <InlineLabel
        displayLabel={node.displayLabel}
        isEditing={isEditing}
        editValue={editValue}
        onEditValueChange={setEditValue}
        onCommit={commitEdit}
        onCancel={cancelEdit}
        onStartEdit={startEdit}
      />

      {/* Per-item actions menu — hidden while editing */}
      {!isEditing && (
        <GroupActions
          node={node}
          onDeleteGroup={onDeleteGroup}
          onAddSubGroup={onAddSubGroup}
          onRenameGroup={onRenameGroup}
          onStartRename={startEdit}
        />
      )}
    </div>
  );
}
