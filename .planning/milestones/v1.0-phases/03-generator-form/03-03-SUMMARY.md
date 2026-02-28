---
phase: 03-generator-form
plan: 03
subsystem: ui
tags: [react, tailwind, nextjs, mongodb, fetch, dirty-flag]

requires:
  - phase: 03-02
    provides: loadedCollection state, SaveCollectionDialog, handleSaveCollection handler
  - phase: 03-01
    provides: GET /api/collections/[id] endpoint for fetching full collection by id
  - phase: 01-database-foundation
    provides: TokenCollection model, ITokenCollection interface, dbConnect singleton

provides:
  - LoadCollectionDialog.tsx — modal dialog with spinner/empty-state/error/list, fetches /api/collections on open
  - "Load Collection" button in TokenGeneratorFormNew header action bar next to "Save to Database"
  - handleLoadCollection: fetches /api/collections/[id], converts tokens, populates form state
  - handleLoadRequest: unsaved-changes guard (window.confirm) before load
  - isDirty flag tracking across all user-initiated mutations
  - clearForm integration: resets loadedCollection and isDirty on clear

affects: [view-page reading same collections, any future plan building on load/dirty state]

tech-stack:
  added: []
  patterns:
    - "Dirty flag via setIsDirty(true) in every user-initiated mutation handler; reset on load/save/clear"
    - "Programmatic state update pattern: convertToTokenGroups + setTokenGroups without setting dirty — guards correct dirty semantics"
    - "onLoad parent-driven fetch: LoadCollectionDialog calls onLoad(id), parent (TokenGeneratorFormNew) owns network call"

key-files:
  created:
    - src/components/LoadCollectionDialog.tsx
  modified:
    - src/components/TokenGeneratorFormNew.tsx

key-decisions:
  - "isDirty tracking in individual mutation handlers (not useEffect on tokenGroups): avoids false dirty on programmatic loads; each user-facing setter gets explicit setIsDirty(true)"
  - "handleLoadCollection does NOT call setIsDirty(true): programmatic state update distinguishes load from user edit"
  - "clearForm resets both loadedCollection and isDirty: clears full editing session context so next Save prompts for a new name"
  - "LoadCollectionDialog manages isFetching and isLoading separately: fetch on open vs load-in-progress are independent loading states"

patterns-established:
  - "Dirty-flag pattern: explicitly opt mutation handlers in; programmatic updates never touch dirty flag"

requirements-completed: [GEN-05, GEN-06, GEN-07, GEN-08, GEN-09]

duration: 3min
completed: 2026-02-26
---

# Phase 3 Plan 03: Load Collection button and LoadCollectionDialog

**LoadCollectionDialog modal with spinner/empty-state/list wired to GET /api/collections and GET /api/collections/[id] via indigo Load Collection button; unsaved-changes guard and dirty flag complete the save/load cycle**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-25T12:02:52Z
- **Completed:** 2026-02-25T12:05:39Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `LoadCollectionDialog.tsx`: fixed overlay z-50, card layout (max-w-sm), fetches GET /api/collections on `isOpen` true, shows spinner during fetch, empty state "No collections saved yet", error state "Failed to load collections. Please try again.", scrollable list (max-h-64) of collection names each calling `onLoad(id)`, disables list during load-in-progress, Cancel button
- Wired "Load Collection" (indigo) button in TokenGeneratorFormNew action bar immediately after "Save to Database"
- Implemented `handleLoadCollection`: fetch `/api/collections/[id]`, `convertToTokenGroups(collection.tokens)`, populate form state, set `loadedCollection`, reset `isDirty`, close dialog, show success toast
- Implemented `handleLoadRequest`: unsaved-changes guard via `window.confirm` before calling `handleLoadCollection`
- Added `isDirty` state tracking across all user-initiated mutation handlers: `addTokenGroup`, `deleteTokenGroup`, `updateGroupName`, `addToken`, `updateToken`, `updateTokenAttribute`, `removeTokenAttribute`, `deleteToken`, global namespace `onChange`
- Reset `isDirty(false)` after successful save (both PUT overwrite and POST new paths)
- Updated `clearForm` to call `setLoadedCollection(null)` and `setIsDirty(false)` — clears full editing session

## Task Commits

Each task was committed atomically:

1. **Task 1: Create LoadCollectionDialog component** - `4064e05` (feat)
2. **Task 2: Wire Load button, dirty flag, and clear-form integration** - `30e7082` (feat)

## Files Created/Modified

- `src/components/LoadCollectionDialog.tsx` — Named export `LoadCollectionDialog`; fetches /api/collections on open; spinner, empty state, error state, scrollable list; separate isFetching (fetch on open) and isLoading (load-in-progress) states; resets all state when isOpen flips false
- `src/components/TokenGeneratorFormNew.tsx` — Added LoadCollectionDialog import; showLoadDialog + isDirty state; handleLoadCollection + handleLoadRequest handlers; setIsDirty(true) in all user mutation handlers; setIsDirty(false) in save success paths; Load Collection button; clearForm integration; LoadCollectionDialog JSX

## Decisions Made

- **isDirty in individual handlers (not useEffect):** Explicit opt-in per mutation handler prevents false-dirty on programmatic state updates during load. Each user-facing function adds `setIsDirty(true)`; `handleLoadCollection` never does.
- **Separate isFetching and isLoading in LoadCollectionDialog:** `isFetching` covers the initial GET /api/collections call; `isLoading` covers the in-flight `onLoad(id)` call. They are independent states — both needed for correct spinner/disabled semantics.
- **clearForm resets full editing session:** Setting `loadedCollection(null)` and `isDirty(false)` after clear means the next Save will prompt for a new name — correct round-trip behavior.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All Phase 3 plans are complete. The save/load cycle is fully implemented: POST/PUT (Plan 01 + 02), Save dialog (Plan 02), Load dialog + dirty flag (Plan 03).
- Phase 4 (Collection Management) can now build on the `loadedCollection` state and the full CRUD API from Phase 01.
- No blockers.

## Self-Check: PASSED

- FOUND: src/components/LoadCollectionDialog.tsx
- FOUND: src/components/TokenGeneratorFormNew.tsx
- FOUND: .planning/phases/03-generator-form/03-03-SUMMARY.md
- FOUND: commit 4064e05 (Task 1: LoadCollectionDialog)
- FOUND: commit 30e7082 (Task 2: wire Load button + dirty flag)

---
*Phase: 03-generator-form*
*Completed: 2026-02-26*
