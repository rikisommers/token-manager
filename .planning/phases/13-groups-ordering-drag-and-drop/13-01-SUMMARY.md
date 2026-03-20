---
phase: 13-groups-ordering-drag-and-drop
plan: 01
subsystem: ui
tags: [dnd-kit, drag-and-drop, react, tokens, groups, sortable]

# Dependency graph
requires: []
provides:
  - "@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities installed in package.json"
  - "src/utils/groupMove.ts with applyGroupMove cascade utility and FlatNode, flattenTree, buildTreeFromFlat exports"
  - "src/components/tokens/SortableGroupRow.tsx with draggable group row and GripVertical handle"
affects:
  - 13-02-groups-ordering-drag-and-drop
  - TokenGroupTree (will be refactored in plan 02 to use these building blocks)

# Tech tracking
tech-stack:
  added:
    - "@dnd-kit/core@6.3.1"
    - "@dnd-kit/sortable@10.0.0"
    - "@dnd-kit/utilities@3.2.2"
  patterns:
    - "useSortable hook with isDragOverlay split: hook calls live in inner component; outer export handles static overlay variant"
    - "applyGroupMove cascade: flattenTree -> splice -> buildTreeFromFlat -> optional ID/alias rewrite"
    - "Sibling reorder vs reparenting branch: reparenting triggers full subtree ID rewrite + alias rewrite + theme map migration"

key-files:
  created:
    - "src/utils/groupMove.ts"
    - "src/components/tokens/SortableGroupRow.tsx"
  modified:
    - "package.json (added @dnd-kit dependencies)"

key-decisions:
  - "applyGroupMove returns { groups, themes } tuple so callers get updated tree and theme snapshots atomically"
  - "isDragOverlay variant uses a static inner div (no useSortable) — split into SortableRowInner to keep hook calls unconditional"
  - "resolveCollisionFreeId appends -2 ... -10 then falls back to -<timestamp> to prevent name collisions on reparent"
  - "syncThemeTokenOrder matches by group.id and recursively reorders children — used for sibling-only reorders where IDs stay stable"
  - "rewriteAliasesInTree uses regex with escapeRegex helper to safely replace {old.dot.prefix. patterns in token values"

patterns-established:
  - "Pure util pattern: groupMove.ts has zero React/Next imports — all side-effect-free for full test isolation"
  - "FlatNode carries parentId and index so tree can be reconstructed after splice without parent traversal"

requirements-completed:
  - ORD-01
  - ORD-02

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 13 Plan 01: Groups Ordering Drag and Drop — Foundation Summary

**dnd-kit packages installed, applyGroupMove cascade utility, and SortableGroupRow draggable component delivering the foundational building blocks for group drag-and-drop reordering**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-20T05:40:45Z
- **Completed:** 2026-03-20T05:43:35Z
- **Tasks:** 2
- **Files modified:** 3 (package.json + 2 new files)

## Accomplishments

- Installed @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (yarn workspace root)
- Created `src/utils/groupMove.ts` — pure cascade utility with FlatNode type, flattenTree, buildTreeFromFlat, and applyGroupMove handling both sibling-reorder and full reparenting with ID/alias/theme cascade
- Created `src/components/tokens/SortableGroupRow.tsx` — 'use client' component with GripVertical drag handle, useSortable integration, isDragOverlay static variant, and preserved selection/dropdown-action UX

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @dnd-kit packages and create applyGroupMove utility** - `1519900` (feat)
2. **Task 2: Create SortableGroupRow component** - `cee9326` (feat)

## Files Created/Modified

- `package.json` - Added @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities dependencies
- `src/utils/groupMove.ts` - Pure group move cascade utility (FlatNode, flattenTree, buildTreeFromFlat, applyGroupMove)
- `src/components/tokens/SortableGroupRow.tsx` - Draggable group row component with GripVertical handle

## Decisions Made

- `applyGroupMove` returns `{ groups, themes }` tuple — callers receive updated tree and theme snapshots atomically without needing separate sync call
- `isDragOverlay` variant uses a plain `div` rather than a sortable wrapper to avoid conflicting transforms; inner hook calls kept in `SortableRowInner` to honor React hooks rules
- `resolveCollisionFreeId` increments `-2` to `-10` on name collision, falls back to timestamp suffix — prevents duplicate group IDs on reparent
- Alias rewrite regex uses `escapeRegex` helper to safely escape dot-separated prefixes in the pattern `{old.dot.prefix.token-name}`

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 (TokenGroupTree refactor) can now import `FlatNode`, `flattenTree`, `applyGroupMove` from `@/utils/groupMove` and `SortableGroupRow` from `@/components/tokens/SortableGroupRow`
- All TypeScript types align; zero new TS errors introduced
- No blockers

---
*Phase: 13-groups-ordering-drag-and-drop*
*Completed: 2026-03-20*
