'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
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

function GroupActions({
  node,
  onDeleteGroup,
  onAddSubGroup,
}: {
  node: FlatNode;
  onDeleteGroup?: (groupId: string) => void;
  onAddSubGroup?: (parentGroupId: string) => void;
}) {
  if (!onDeleteGroup && !onAddSubGroup) return null;

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
        {onAddSubGroup && (
          <DropdownMenuItem
            className="gap-2 text-xs"
            onClick={() => onAddSubGroup(node.group.id)}
          >
            <Plus size={12} /> Add Sub-group
          </DropdownMenuItem>
        )}
        {onAddSubGroup && onDeleteGroup && <DropdownMenuSeparator />}
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
  />;
}

// Inner component keeps hook calls unconditional (hooks rules)
function SortableRowInner({
  node,
  isSelected,
  onSelect,
  onDeleteGroup,
  onAddSubGroup,
}: Omit<SortableGroupRowProps, 'isDragOverlay'>) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={rowClassName(node, isSelected)}
      {...attributes}
      onClick={e => { e.stopPropagation(); onSelect(node.group.id); }}
    >
      {/* Drag handle */}
      <button
        {...listeners}
        className="cursor-grab p-1 text-gray-300 hover:text-gray-500 flex-shrink-0"
        title="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical size={12} />
      </button>

      {/* Label */}
      <span className="flex-1 py-1.5 truncate text-xs">{node.displayLabel}</span>

      {/* Per-item actions menu */}
      <GroupActions
        node={node}
        onDeleteGroup={onDeleteGroup}
        onAddSubGroup={onAddSubGroup}
      />
    </div>
  );
}
