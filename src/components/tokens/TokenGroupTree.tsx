'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { TokenGroup } from '@/types';
import { applyGroupMove, flattenTree, type FlatNode } from '@/utils/groupMove';
import { SortableGroupRow } from '@/components/tokens/SortableGroupRow';

interface TokenGroupTreeProps {
  groups: TokenGroup[];
  namespace?: string;
  selectedGroupId?: string;
  onGroupSelect?: (groupId: string) => void;
  onAddGroup?: () => void;
  onDeleteGroup?: (groupId: string) => void;
  onAddSubGroup?: (parentGroupId: string) => void;
  onGroupsReordered?: (newGroups: TokenGroup[]) => void;
}

export function TokenGroupTree({
  groups,
  namespace: _namespace,
  selectedGroupId,
  onGroupSelect,
  onAddGroup,
  onDeleteGroup,
  onAddSubGroup,
  onGroupsReordered,
}: TokenGroupTreeProps) {
  const [activeNode, setActiveNode] = useState<FlatNode | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const flatNodes = flattenTree(groups);
  const sortedIds = flatNodes.map(n => n.group.id);

  function handleDragStart({ active }: DragStartEvent) {
    const found = flatNodes.find(n => n.group.id === active.id);
    setActiveNode(found ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveNode(null);
    if (!over || active.id === over.id) return;
    const { groups: newGroups } = applyGroupMove(groups, String(active.id), String(over.id));
    onGroupsReordered?.(newGroups);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Section heading */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Groups</span>
        {onAddGroup && (
          <button
            onClick={onAddGroup}
            className="text-gray-400 hover:text-gray-700 text-base leading-none px-1"
            title="Add group"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto py-1">
        {flatNodes.length === 0 && (
          <p className="px-3 py-3 text-xs text-gray-400">No groups yet</p>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
            {flatNodes.map(node => (
              <SortableGroupRow
                key={node.group.id}
                node={node}
                isSelected={node.group.id === selectedGroupId}
                onSelect={id => onGroupSelect?.(id)}
                onDeleteGroup={onDeleteGroup}
                onAddSubGroup={onAddSubGroup}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {activeNode ? (
              <SortableGroupRow
                node={activeNode}
                isSelected={false}
                onSelect={() => {}}
                isDragOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
