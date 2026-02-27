---
phase: 07-fix-figma-integration
plan: 05
subsystem: ui
tags: [react, nextjs, figma, tailwind, typescript]

# Dependency graph
requires:
  - phase: 07-01
    provides: FigmaConfig component with localStorage credential storage

provides:
  - SourceContextBar component — slim upstream indicator (GitHub or Figma) rendered from sourceMetadata
  - FigmaConfig button in app header alongside GitHubConfig
  - selectedSourceMetadata state tracking in page.tsx
  - Explicit sourceMetadata field in GET /api/collections/[id] response

affects: [07-fix-figma-integration, ui-context, future-upstream-push]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Conditional render returning null pattern for optional contextual UI strips
    - Discriminated union on sourceMetadata.type to branch GitHub vs Figma rendering

key-files:
  created:
    - src/components/SourceContextBar.tsx
  modified:
    - src/app/page.tsx
    - src/app/api/collections/[id]/route.ts

key-decisions:
  - "SourceContextBar returns null (not empty div) for null/undefined/no-type sourceMetadata — ensures no layout gap"
  - "FigmaConfig placed before GitHubConfig in header flex div per locked decision in CONTEXT.md"
  - "GET /api/collections/[id] now uses explicit shape (not raw doc) for consistency and future safety"
  - "figmaConfig state declared in HomeContent and wired to ImportFromFigmaDialog for forward-compat (07-03/07-04)"

patterns-established:
  - "Source context bar: muted gray-50 for GitHub, purple-50 for Figma — color-codes upstream source type at a glance"
  - "selectedSourceMetadata cleared to null on local selection; set from API response on MongoDB collection load"

requirements-completed: [FIGMA-05]

# Metrics
duration: 7min
completed: 2026-02-28
---

# Phase 07 Plan 05: Source Context Bar Summary

**SourceContextBar component renders slim GitHub/Figma upstream indicator between tab switcher and content; FigmaConfig wired into app header**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-02-27T21:16:16Z
- **Completed:** 2026-02-27T21:23:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created SourceContextBar.tsx with conditional rendering: gray GitHub bar (icon + repo + branch) or purple Figma bar (icon + file key), null for no source
- Added FigmaConfig button to app header immediately before GitHubConfig
- Added selectedSourceMetadata state tracking; cleared on local selection, set from API on MongoDB collection load
- Made GET /api/collections/[id] return explicit sourceMetadata field in response shape

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SourceContextBar component** - `ff140e1` (feat)
2. **Task 2: Wire FigmaConfig + SourceContextBar into page.tsx + confirm [id] route returns sourceMetadata** - `8bbf092` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/SourceContextBar.tsx` - Slim upstream source indicator bar; GitHub (gray-50) or Figma (purple-50) or null
- `src/app/page.tsx` - FigmaConfig imported + rendered in header; SourceContextBar imported + rendered; selectedSourceMetadata + figmaConfig states added; handleSelectionChange sets/clears sourceMetadata
- `src/app/api/collections/[id]/route.ts` - GET handler now returns explicit `{ _id, name, tokens, sourceMetadata }` shape

## Decisions Made
- SourceContextBar returns null (not empty div) — avoids phantom layout gap when no source
- FigmaConfig before GitHubConfig in header per CONTEXT.md locked decision
- GET route changed from `{ collection: doc }` to explicit shape — consistent with PUT response pattern, prevents raw Mongoose internals leaking

## Deviations from Plan

**1. [Rule 2 - Missing Critical] Wired ImportFromFigmaDialog props using correct signature**
- **Found during:** Task 2 (page.tsx wiring)
- **Issue:** page.tsx already had `importFigmaOpen` state and `ImportFromFigmaDialog` import (added by prior plan) but unused. ImportFromFigmaDialog.onImported takes `(collectionId: string, collectionName: string)` not an object. Wiring was required to avoid TypeScript errors.
- **Fix:** Wired ImportFromFigmaDialog with correct props matching its actual interface; figmaConfig state added for forward-compat
- **Files modified:** src/app/page.tsx
- **Verification:** TypeScript compiles clean with no errors in src/
- **Committed in:** 8bbf092 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical wiring)
**Impact on plan:** Necessary to complete the unused ImportFromFigmaDialog stub from a prior plan. No scope creep.

## Issues Encountered
- Edit tool gave false "file modified" errors when attempting to edit page.tsx; worked around by using direct file write. No functional impact.

## Self-Check

## Self-Check: PASSED

- FOUND: src/components/SourceContextBar.tsx
- FOUND: src/app/page.tsx
- FOUND: src/app/api/collections/[id]/route.ts
- FOUND: ff140e1 (Task 1 commit)
- FOUND: 8bbf092 (Task 2 commit)

## Next Phase Readiness
- SourceContextBar visible for any collection with sourceMetadata.type set
- FigmaConfig in header allows configuring Figma credentials globally
- ImportFromFigmaDialog now properly wired (was stub from earlier plan)
- Ready for 07-03 (Figma import flow) and 07-04 (push/export to upstream)

---
*Phase: 07-fix-figma-integration*
*Completed: 2026-02-28*
