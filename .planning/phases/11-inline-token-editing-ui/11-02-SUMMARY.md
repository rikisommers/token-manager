---
phase: 11-inline-token-editing-ui
plan: "02"
subsystem: ui
tags: [react, nextjs, typescript, themes, state-management, debounce]

# Dependency graph
requires:
  - phase: 10-data-model-foundation
    provides: ITheme type with tokens field, PATCH /api/collections/[id]/themes/[themeId]/tokens endpoint
provides:
  - activeThemeTokens state (editable copy of active theme token tree) in tokens/page.tsx
  - handleThemeChange with group fallback logic
  - handleThemeTokenChange with 400ms debounced PATCH auto-save
  - themeTokenSaveTimerRef for timer lifecycle management
  - "Default" label on null-state theme selector
affects:
  - 11-03 (uses activeThemeTokens, handleThemeTokenChange for theme-aware row rendering and reset button)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useRef for timer refs (themeTokenSaveTimerRef alongside graphAutoSaveTimerRef)"
    - "JSON.parse(JSON.stringify(...)) for deep copy of plain token data"
    - "Debounced PATCH pattern: 400ms timer cleared on each change, fired on last"
    - "Silent catch in auto-save: no disruptive error for background theme saves"

key-files:
  created: []
  modified:
    - src/app/collections/[id]/tokens/page.tsx

key-decisions:
  - "Use JSON.parse/stringify for deep copy of theme.tokens — no functions/Dates in TokenGroup so this is sufficient"
  - "handleThemeTokenChange is silent on fetch error — mirrors existing graph auto-save pattern"
  - "RotateCcw imported here (Plan 02) even though first used in Plan 03 — keeps import group clean"
  - "getAllGroups from @/utils used in handleThemeChange to flatten masterGroups for first-enabled lookup"

patterns-established:
  - "Theme state pattern: activeThemeTokens is an editable deep copy, never mutates theme.tokens in ITheme[] directly"
  - "Group fallback: switching themes checks newTheme.groups[currentGroupId] ?? 'disabled', falls back to first enabled"

requirements-completed: [EDIT-01, EDIT-03]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 11 Plan 02: Theme Selector UX and State Scaffold Summary

**Theme selector relabeled 'Default', activeThemeTokens editable state wired with handleThemeChange group fallback and 400ms debounced PATCH auto-save to `/api/collections/[id]/themes/[themeId]/tokens`**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-20T12:12:49Z
- **Completed:** 2026-03-20T12:14:54Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Renamed theme selector null-state from "All groups" to "Default" (value `__all__` unchanged)
- Added `activeThemeTokens: TokenGroup[]` state synced to active theme's tokens via useEffect
- Added `handleThemeChange` with fallback: switches to first enabled group when current group is disabled in new theme
- Added `handleThemeTokenChange` with 400ms debounced PATCH auto-save to theme tokens endpoint
- Added `themeTokenSaveTimerRef` with proper cleanup in unmount effect alongside existing graph timer

## Task Commits

Each task was committed atomically:

1. **Task 1: Theme selector label fix + hide-when-empty** - `7d34084` (feat)
2. **Task 2: activeThemeTokens state + handleThemeChange + debounced PATCH save** - `5d68d6d` (feat)

## Files Created/Modified
- `src/app/collections/[id]/tokens/page.tsx` - Added theme-mode state scaffold and handlers

## Decisions Made
- Used `JSON.parse(JSON.stringify(theme.tokens))` for deep copy — plan specified this is sufficient for plain data objects (no functions/Dates in TokenGroup)
- `handleThemeTokenChange` is silent on fetch error — mirrors existing `graphAutoSaveTimerRef` pattern where background saves don't interrupt the user with toasts
- `RotateCcw` imported now (even though Plan 03 uses it first) to consolidate imports; adding it later would require an unnecessary second edit
- `getAllGroups` from `@/utils` used to flatten `masterGroups` into a flat list for finding the first enabled group

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 03 can immediately use `activeThemeTokens`, `handleThemeTokenChange`, and `RotateCcw` (already imported) to render theme-aware editable rows and the reset button
- `handleThemeChange` and `handleThemeTokenChange` are defined but not yet passed as props to `TokenGeneratorForm` — Plan 03 handles that wiring

---
*Phase: 11-inline-token-editing-ui*
*Completed: 2026-03-20*

## Self-Check: PASSED

- FOUND: src/app/collections/[id]/tokens/page.tsx
- FOUND: .planning/phases/11-inline-token-editing-ui/11-02-SUMMARY.md
- FOUND commit: 7d34084 (Task 1 — theme selector label fix)
- FOUND commit: 5d68d6d (Task 2 — activeThemeTokens state + handlers)
