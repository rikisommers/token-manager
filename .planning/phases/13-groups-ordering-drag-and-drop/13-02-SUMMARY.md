---
phase: 13-groups-ordering-drag-and-drop
plan: 02
subsystem: ui
tags: [dnd-kit, drag-and-drop, react, tokens, groups, sortable, DndContext, SortableContext, DragOverlay]

# Dependency graph
requires:
  - phase: 13-01
    provides: "applyGroupMove, flattenTree, FlatNode from @/utils/groupMove and SortableGroupRow from @/components/tokens/SortableGroupRow"
provides:
  - "TokenGroupTree refactored with DndContext + SortableContext + DragOverlay using flat-array pattern"
  - "onGroupsReordered callback prop on TokenGroupTree — callers receive new TokenGroup[] from applyGroupMove"
  - "DragOverlay portal renders drag ghost at document body level — never clipped by sidebar overflow-y-auto"
  - "PointerSensor with distance-8 activationConstraint preserves click-to-select behaviour"
affects:
  - 13-03-groups-ordering-drag-and-drop
  - TokensPage (Plan 03 will wire onGroupsReordered to persistence + undo)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Flat-array DnD pattern: flattenTree -> SortableContext(items=sortedIds) -> SortableGroupRow per node -> DragOverlay ghost"
    - "Orchestration-only component: all move logic delegated to applyGroupMove util; all row rendering delegated to SortableGroupRow"
    - "DragOverlay portal escapes overflow container — DndContext wraps inside overflow-y-auto, DragOverlay renders outside"

key-files:
  created: []
  modified:
    - "src/components/tokens/TokenGroupTree.tsx — refactored with DnD; 115 lines; removed local FlatNode + flattenTree"

key-decisions:
  - "DndContext placed inside the overflow-y-auto scrollable div — DragOverlay still renders at portal/body level so ghost is not clipped"
  - "applyGroupMove called without themes argument in TokenGroupTree — theme sync is the page's responsibility (Plan 03)"
  - "Removed local FlatNode interface and local flattenTree entirely — single source of truth in @/utils/groupMove"

patterns-established:
  - "Thin-orchestration component: TokenGroupTree is pure coordination — no move logic, no row markup, delegates to util + child component"

requirements-completed:
  - ORD-01
  - ORD-03

# Metrics
duration: ~1min
completed: 2026-03-20
---

# Phase 13 Plan 02: Groups Ordering Drag and Drop — TokenGroupTree Summary

**TokenGroupTree refactored with DndContext + SortableContext + DragOverlay flat-array pattern, wiring applyGroupMove to onGroupsReordered callback for drag-and-drop group reordering**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-20T10:45:55Z
- **Completed:** 2026-03-20T10:47:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Removed local `FlatNode` interface and `flattenTree` function; imported from `@/utils/groupMove` (single source of truth)
- Replaced plain `div`-per-node render with `DndContext + SortableContext + SortableGroupRow` flat-array pattern
- Added `DragOverlay` rendering at document body portal level — not clipped by the sidebar's `overflow-y-auto` container
- Added `onGroupsReordered` prop; `handleDragEnd` calls `applyGroupMove` and fires the callback with new `TokenGroup[]`
- `PointerSensor` with `activationConstraint: { distance: 8 }` preserves click-to-select behaviour
- Component trimmed to 115 lines — orchestration only

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor TokenGroupTree with DndContext, SortableContext, and DragOverlay** - `88908a5` (feat)

## Files Created/Modified

- `src/components/tokens/TokenGroupTree.tsx` — Refactored with DnD; DndContext + SortableContext + DragOverlay; local FlatNode/flattenTree removed; onGroupsReordered prop added; 115 lines

## Decisions Made

- `DndContext` placed **inside** the `overflow-y-auto` scrollable div rather than outside the component — `DragOverlay` uses a React portal that renders at document body regardless, so the overflow never clips the ghost. This keeps the component boundary clean.
- `applyGroupMove` is called **without** the `themes` argument in `TokenGroupTree` — theme sync and persistence are the page's responsibility in Plan 03. The component only handles the UI interaction.
- Local `FlatNode` interface and `flattenTree` were removed entirely from `TokenGroupTree` — `@/utils/groupMove` is the canonical source; duplication would drift.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 (page integration) can now pass `onGroupsReordered` to `TokenGroupTree` and handle persistence + undo
- `TokenGroupTree` exports the `onGroupsReordered?: (newGroups: TokenGroup[]) => void` prop
- Zero TypeScript errors; `yarn tsc --noEmit` passes clean
- No blockers

---
*Phase: 13-groups-ordering-drag-and-drop*
*Completed: 2026-03-20*
