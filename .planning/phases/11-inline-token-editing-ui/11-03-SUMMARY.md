---
phase: 11-inline-token-editing-ui
plan: "03"
subsystem: ui
tags: [react, nextjs, typescript, themes, token-editing, readonly, reset-button]

# Dependency graph
requires:
  - phase: 11-inline-token-editing-ui
    plan: "02"
    provides: activeThemeTokens state, handleThemeTokenChange debounced PATCH auto-save, handleThemeChange group fallback
provides:
  - TokenTableRow with isReadOnly mode (suppresses click-to-edit on all cells) and reset button (RotateCcw size=12)
  - TokenGeneratorForm accepting themeTokens overlay and onThemeTokensChange callback
  - tokens/page.tsx wired: activeGroupState, isThemeReadOnly, findMasterValue, handleResetToDefault
  - Full end-to-end theme-aware inline editing: click-to-edit in Enabled groups, read-only in Source groups, reset to master collection default
affects:
  - Phase 11 verification (all 6 manual test scenarios)
  - Phase 12 (Figma export — uses masterGroups, unaffected by themeTokens overlay)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "themeTokens overlay pattern: TokenGeneratorForm uses themeTokens as display source when provided, falls back to internal tokenGroups"
    - "updateToken theme-mode routing: edits go through onThemeTokensChange when themeTokens is active, setTokenGroups otherwise"
    - "findMasterValue lookup: findGroupById(masterGroups, groupId) + token.path match for reset comparison"
    - "isReadOnly gate: suppresses onClick, cursor-text→cursor-default, hides delete button, hides reset button"

key-files:
  created: []
  modified:
    - src/components/tokens/TokenGeneratorForm.tsx
    - src/app/collections/[id]/tokens/page.tsx

key-decisions:
  - "themeTokens overlay (not state replacement): internal tokenGroups holds master collection, themeTokens is a read/write overlay — switching themes or turning off theme resets to master without any state cleanup"
  - "updateToken routes through onThemeTokensChange when themeTokens is active — prevents cross-contamination of master collection state"
  - "Reset button condition: !isReadOnly && masterValue !== undefined && onResetToDefault && String(token.value ?? '') !== masterValue — all four must be true"
  - "updateGroupToken is a pure recursive helper outside the component — enables handleResetToDefault to immutably update nested group trees"

patterns-established:
  - "Overlay pattern: themeTokens provided → display theme data; absent → display master; editing routes accordingly"
  - "Read-only row pattern: isReadOnly prop threads from page → form → row, suppressing all interactive cell behavior"

requirements-completed: [EDIT-01, EDIT-02, EDIT-04]

# Metrics
duration: 5min
completed: 2026-03-20
---

# Phase 11 Plan 03: Theme-aware inline token editing wired end-to-end

**TokenTableRow extended with isReadOnly + RotateCcw reset button; tokens/page.tsx wires themeTokens overlay, activeGroupState, and handleResetToDefault so Enabled groups are editable and Source groups are read-only under named themes**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-19T23:19:04Z
- **Completed:** 2026-03-19T23:24:41Z
- **Tasks:** 2 of 3 complete (Task 3 is human-verify checkpoint — dev server running)
- **Files modified:** 2

## Accomplishments
- Added `RotateCcw` import and three new optional props (`isReadOnly`, `masterValue`, `onResetToDefault`) to `TokenTableRowProps`
- Suppressed click-to-edit on value, path, type, and description cells when `isReadOnly`; hid delete button; changed cursors to `cursor-default`
- Added reset button (RotateCcw size=12) that appears only when `!isReadOnly && masterValue !== undefined && value !== masterValue`
- Extended `TokenGeneratorFormProps` with `themeTokens`, `onThemeTokensChange`, `isReadOnly`, `findMasterValue`, `onResetToDefault`
- `updateToken` now routes edits through `onThemeTokensChange` when `themeTokens` overlay is active
- Selected group rendering uses `themeTokens` as source when provided (overlay, non-destructive)
- `tokens/page.tsx`: added `activeGroupState` useMemo, `isThemeReadOnly`, `findMasterValue` useCallback, `handleResetToDefault` useCallback, `updateGroupToken` pure helper
- Wired all new props into `<TokenGeneratorForm>` JSX

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend TokenTableRow with isReadOnly + reset button** - `1661c41` (feat)
2. **Task 2: Wire theme-mode token source + reset handler in tokens/page.tsx** - `c660a2a` (feat)

Task 3 is a human-verify checkpoint (dev server running at http://localhost:3000).

## Files Created/Modified
- `src/components/tokens/TokenGeneratorForm.tsx` - TokenTableRow extended with isReadOnly/masterValue/onResetToDefault; TokenGeneratorFormProps extended with themeTokens overlay; updateToken and selected-group display are now theme-aware
- `src/app/collections/[id]/tokens/page.tsx` - activeGroupState, isThemeReadOnly, findMasterValue, handleResetToDefault wired; TokenGeneratorForm receives all new props

## Decisions Made
- Used themeTokens overlay approach (not merging into internal state) to keep master collection state clean — switching themes or reverting to Default is zero-cost
- `updateGroupToken` as pure function outside component for reuse in both `handleResetToDefault` and potential future reset-all flows
- Reset button condition requires all four: not read-only, masterValue defined, callback provided, and value actually differs — avoids spurious icons on tokens that already match the default

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Dev server running at http://localhost:3000 for human verification (Task 3 checkpoint)
- After human approval: Plan 03 metadata commit, STATE.md/ROADMAP.md updates, Phase 11 complete
- Phase 12 (Figma export) can proceed — it uses `masterGroups` directly, unaffected by theme overlay

---
*Phase: 11-inline-token-editing-ui*
*Completed: 2026-03-20*

## Self-Check: PASSED

- FOUND: src/components/tokens/TokenGeneratorForm.tsx
- FOUND: src/app/collections/[id]/tokens/page.tsx
- FOUND: .planning/phases/11-inline-token-editing-ui/11-03-SUMMARY.md
- FOUND commit: 1661c41 (Task 1 — TokenTableRow isReadOnly + reset button)
- FOUND commit: c660a2a (Task 2 — tokens/page.tsx theme wiring)
