---
phase: 09-add-tokens-modes
plan: "03"
subsystem: ui
tags: [react, next.js, lucide-react, radix-ui, select, theme-selector]

# Dependency graph
requires:
  - phase: 09-01
    provides: Theme API endpoints (GET /api/collections/[id]/themes, POST, PUT, DELETE)
  - phase: 09-02
    provides: Themes page UI (ThemeList, ThemeGroupMatrix, /collections/[id]/themes route)
provides:
  - Themes nav item in CollectionSidebar linking to /collections/[id]/themes
  - Theme selector dropdown on Tokens page (hidden when no themes exist)
  - filteredGroups memo that hides Disabled groups when a theme is active
  - TokenGroupTree wired to filteredGroups for theme-aware display
affects: [tokens-page, collection-sidebar, group-tree]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Theme selector hidden by conditional render when themes.length === 0 (no visual regression)"
    - "filteredGroups memo uses masterGroups as fallback when no theme active"
    - "masterGroups unchanged for allFlatTokens/allFlatGroups — graph panel references unaffected by theme"
    - "Active theme resets on navigation away (React component state only, no localStorage)"

key-files:
  created: []
  modified:
    - src/components/collections/CollectionSidebar.tsx
    - src/app/collections/[id]/tokens/page.tsx

key-decisions:
  - "[09-03]: Themes nav item uses Layers icon (represents themes/modes visually) — inserted between Tokens and Config"
  - "[09-03]: filteredGroups uses masterGroups as fallback when activeThemeId is null — preserves 'All groups' default"
  - "[09-03]: Groups with no explicit theme state default to 'disabled' — consistent with 09-01 first-theme-sets-all-enabled logic"
  - "[09-03]: allFlatTokens and allFlatGroups still traverse masterGroups — graph panel token references unaffected by theme filter"

patterns-established:
  - "Theme selector shown conditionally only when themes.length > 0 — no UI clutter for collections without themes"
  - "filteredGroups memo pattern: null activeThemeId returns full tree unchanged"

requirements-completed: [MODE-03, MODE-04]

# Metrics
duration: 2min
completed: 2026-03-19
---

# Phase 9 Plan 03: Themes Nav + Token Page Theme Selector Summary

**Themes nav tab added to CollectionSidebar and theme selector dropdown wired to TokenGroupTree filtering on the Tokens page**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-19T18:40:33Z
- **Completed:** 2026-03-19T18:42:45Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- CollectionSidebar now shows a Themes nav item (Layers icon) between Tokens and Config, linking to `/collections/[id]/themes`
- Tokens page fetches themes on mount from `/api/collections/[id]/themes` and shows a theme selector dropdown when themes exist
- Selecting a theme filters the group tree to hide Disabled groups; Enabled and Source groups remain visible
- masterGroups unchanged so graph panel token references work across all groups regardless of active theme

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Themes nav item to CollectionSidebar** - `a3fadd3` (feat)
2. **Task 2: Add theme selector to Tokens page and filter group tree** - `f02a4f2` (feat)

**Plan metadata:** *(to be committed)*

## Files Created/Modified
- `src/components/collections/CollectionSidebar.tsx` - Added Layers import and Themes nav item between Tokens and Config
- `src/app/collections/[id]/tokens/page.tsx` - Added themes state, fetch on mount, filteredGroups memo, theme selector JSX, and wired TokenGroupTree to filteredGroups

## Decisions Made
- Used Layers icon for the Themes nav item — represents layered themes/modes visually
- filteredGroups defaults to masterGroups when no theme active (null activeThemeId) — preserves existing behavior
- Groups without an explicit state entry default to 'disabled' — consistent with the first-theme-enables-all pattern from 09-01
- allFlatTokens and allFlatGroups still use masterGroups so graph panel references are unaffected by theme filtering

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Self-Check: PASSED

All files present, both task commits verified (a3fadd3, f02a4f2).

## Next Phase Readiness
- Themes are now discoverable and usable from the Tokens page
- Theme selector hidden for collections without themes — zero visual regression
- 09-04 (final plan) can build on this foundation
- No blockers

---
*Phase: 09-add-tokens-modes*
*Completed: 2026-03-19*
