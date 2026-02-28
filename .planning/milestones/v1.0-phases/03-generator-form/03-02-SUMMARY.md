---
phase: 03-generator-form
plan: 02
subsystem: ui
tags: [react, tailwind, nextjs, mongodb, fetch]

requires:
  - phase: 03-01
    provides: POST /api/collections with 409+existingId, PUT /api/collections/[id] — the write-side API this UI drives
  - phase: 01-database-foundation
    provides: TokenCollection model, ITokenCollection interface, dbConnect singleton

provides:
  - SaveCollectionDialog.tsx — modal dialog with name-entry and confirm-overwrite step machine
  - "Save to Database" button in TokenGeneratorFormNew header action bar
  - handleSaveCollection handler: POST new names, 409 duplicate detection, PUT on overwrite
  - loadedCollection state persisting saved collection id+name for Plan 03 (Load dialog)
  - Toast confirmation "Saved to database: [name]" on success

affects: [03-03-load-dialog, any plan building on loadedCollection state]

tech-stack:
  added: []
  patterns:
    - "onSave-drives-step pattern: dialog calls onSave(name), parent does fetch; if dialog stays open after await resolves (409 branch), dialog advances internally to confirm-overwrite"
    - "409+existingId flow: POST returns existingId, client sets loadedCollection.id, subsequent onSave hits the PUT path (loadedCollection.name === name guard)"

key-files:
  created:
    - src/components/SaveCollectionDialog.tsx
  modified:
    - src/components/TokenGeneratorFormNew.tsx

key-decisions:
  - "Step advance on onSave return: dialog advances to confirm-overwrite after await onSave() if dialog stays open — no extra prop needed; parent closing dialog (success) is a no-op on state"
  - "saveDialogDuplicateName state in parent kept for future use (e.g. Plan 03 integration); not passed to dialog as prop — dialog derives step from onSave flow"
  - "Rule 1 auto-fix: replaced pre-existing setIsLoading/setLoadingMessage calls in handleDirectorySelect with correct setLoading() — required to meet plan's no-TypeScript-errors criterion"

patterns-established:
  - "Parent-driven fetch, child-driven step: dialog owns step state machine, parent owns network calls; clean separation"

requirements-completed: [GEN-01, GEN-02, GEN-03, GEN-04, MGMT-01]

duration: 2min
completed: 2026-02-26
---

# Phase 3 Plan 02: Save to Database button and SaveCollectionDialog modal

**SaveCollectionDialog modal with name-entry/overwrite step machine wired to POST+PUT API via emerald Save to Database button in generator form header**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-25T11:57:26Z
- **Completed:** 2026-02-25T11:59:46Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `SaveCollectionDialog.tsx`: fixed overlay, card layout, name-entry state with autoFocus input, confirm-overwrite state with red Overwrite button; isSaving disables all interactive elements
- Wired "Save to Database" (emerald) button in the TokenGeneratorFormNew header action bar between Preview JSON and Download JSON
- Implemented `handleSaveCollection`: POST for new names, 409 duplicate detection sets `loadedCollection.id` + advances dialog to confirm-overwrite, PUT for overwrite path; toast on success
- Added `loadedCollection` state for use by Plan 03 (Load dialog); shows "Editing: [name]" indicator when set

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SaveCollectionDialog component** - `bcff4f7` (feat)
2. **Task 2: Wire Save button and collection state into TokenGeneratorFormNew** - `089ba0d` (feat)

## Files Created/Modified

- `src/components/SaveCollectionDialog.tsx` — Modal dialog: fixed overlay z-50, name-entry and confirm-overwrite steps, isSaving disables buttons, autoFocus on input, Tailwind-only styling
- `src/components/TokenGeneratorFormNew.tsx` — Added SaveCollectionDialog import, collection persistence state, handleSaveCollection handler, Save to Database button, Editing indicator, SaveCollectionDialog JSX

## Decisions Made

- **Step advance on onSave return:** The dialog advances to confirm-overwrite after `await onSave(name)` resolves and the dialog is still open. Parent returning early on 409 (without closing dialog) is the signal. No extra prop needed — clean and minimal.
- **saveDialogDuplicateName in parent:** Tracked in parent state for possible future use; not passed to dialog as a prop since the dialog derives its step from the onSave call flow.
- **Rule 1 auto-fix applied:** Pre-existing `setIsLoading`/`setLoadingMessage` calls in `handleDirectorySelect` replaced with correct `setLoading()`. This was required to meet the plan's "TypeScript reports no errors in modified files" criterion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing setIsLoading/setLoadingMessage calls in handleDirectorySelect**
- **Found during:** Task 2 (Wire Save button into TokenGeneratorFormNew)
- **Issue:** `handleDirectorySelect` called `setIsLoading(true)` and `setLoadingMessage(...)` which don't exist in the component — the correct function is `setLoading(isLoading, message)`. This was a pre-existing bug but caused TypeScript errors in the file being modified, which violated the plan's no-errors criterion.
- **Fix:** Replaced the two calls with a single `setLoading(true, isImportMode ? '...' : '...')` call
- **Files modified:** `src/components/TokenGeneratorFormNew.tsx`
- **Verification:** `npx tsc --noEmit` reports no errors in TokenGeneratorFormNew.tsx or SaveCollectionDialog.tsx
- **Committed in:** `089ba0d` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - pre-existing bug)
**Impact on plan:** Auto-fix required to meet plan's TypeScript clean criterion. No scope creep — the fix was a one-line correction of an obviously wrong function name.

## Issues Encountered

None beyond the Rule 1 auto-fix documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `SaveCollectionDialog` and `handleSaveCollection` are complete; Plan 03 (Load dialog) can now read `loadedCollection` state from the parent and use it to pre-populate or reset the form.
- The `loadedCollection` state is exposed in `TokenGeneratorFormNew` — Plan 03 will need to lift it or receive it via context/props depending on the load dialog's architecture.
- No blockers.

---
*Phase: 03-generator-form*
*Completed: 2026-02-26*
