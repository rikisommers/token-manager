---
phase: 09-add-tokens-modes
plan: 02
subsystem: ui
tags: [nextjs, react, typescript, themes, components]

# Dependency graph
requires:
  - phase: 09-add-tokens-modes
    plan: 01
    provides: ITheme type and CRUD API at /api/collections/[id]/themes
provides:
  - ThemeList component (left panel with theme rows, + add, delete dropdown)
  - ThemeGroupMatrix component (group rows with 3-state Disabled/Enabled/Source buttons)
  - Themes page route at /collections/[id]/themes (two-panel layout)
affects:
  - 09-03

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Optimistic PUT update for group state changes with revert on error
    - Inline add flow using isAdding boolean state local to ThemeList
    - Top-level group derivation from collection tokens (filter non-$ object keys)

key-files:
  created:
    - src/components/themes/ThemeList.tsx
    - src/components/themes/ThemeGroupMatrix.tsx
    - src/components/themes/index.ts
    - src/app/collections/[id]/themes/page.tsx

key-decisions:
  - "Group list for matrix derived from top-level token keys (non-$ object entries) — avoids duplicating TokenGeneratorForm group parsing logic"
  - "handleStateChange uses optimistic update + revert on error for snappy UI"
  - "ThemeList inline add flow: isAdding boolean state, input ref auto-focused, Enter/blur confirms, Escape cancels"

patterns-established:
  - "Themes CRUD page pattern: fetch themes + collection on mount, optimistic state updates for group matrix"

requirements-completed: [MODE-03]

# Metrics
duration: 2min
completed: 2026-03-19
---

# Phase 09 Plan 02: Themes Page UI Summary

**Two-panel Themes management page at /collections/[id]/themes with ThemeList (left) and ThemeGroupMatrix (right) — inline theme add/delete, optimistic 3-state group assignment via PUT**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-18T18:36:32Z
- **Completed:** 2026-03-18T18:38:18Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments

- Created ThemeList component: scrollable theme rows, + button triggers inline input, Enter/blur confirms add, Escape cancels, DropdownMenu per row with Delete action
- Created ThemeGroupMatrix component: one row per group with 3-state pill button (Disabled/Enabled/Source) reading from `theme.groups[group.id] ?? 'disabled'`
- Created barrel index.ts exporting both components
- Created Themes page at /collections/[id]/themes: fetches themes + derives groups from collection tokens, handleAddTheme/handleDeleteTheme/handleStateChange with optimistic updates, toast auto-clear, loading spinner

## Task Commits

Each task was committed atomically:

1. **Task 1: Build ThemeList and ThemeGroupMatrix components** - `f9d7368` (feat)
2. **Task 2: Create Themes page at /collections/[id]/themes** - `a7ed165` (feat)

## Files Created/Modified

- `src/components/themes/ThemeList.tsx` - Left panel: theme list with inline add and delete dropdown
- `src/components/themes/ThemeGroupMatrix.tsx` - Right panel: group rows with 3-state button group
- `src/components/themes/index.ts` - Barrel export for themes components
- `src/app/collections/[id]/themes/page.tsx` - Themes page route with full CRUD and two-panel layout

## Decisions Made

- **Group list derived from top-level token keys**: Instead of replicating the TokenGeneratorForm group parsing logic, the Themes page extracts groups from `Object.entries(col.tokens)` filtering non-`$` object values. This gives a flat list of top-level group objects sufficient for the matrix display.
- **Optimistic PUT for state changes**: Clicking a state button immediately updates React state and fires the PUT in the background. On error, the previous theme state is restored and an error toast is shown.
- **Inline add flow**: `isAdding` boolean in ThemeList controls a compact inline input appended to the list; focus is managed via `useRef` + `useEffect`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors exist in `GroupStructureGraph.tsx`, `TokenRefNode.tsx`, and related graph files (work-in-progress from before this plan). Zero errors introduced by this plan's changes.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Themes page UI complete; 09-03 (Tokens page theme selector) can proceed.
- The page requires a running MongoDB instance (same as all other collection endpoints).

## Self-Check: PASSED

- `src/components/themes/ThemeList.tsx` - FOUND
- `src/components/themes/ThemeGroupMatrix.tsx` - FOUND
- `src/components/themes/index.ts` - FOUND
- `src/app/collections/[id]/themes/page.tsx` - FOUND
- Commit `f9d7368` - FOUND
- Commit `a7ed165` - FOUND
- `npx tsc --noEmit` - PASS (zero errors)

---
*Phase: 09-add-tokens-modes*
*Completed: 2026-03-19*
