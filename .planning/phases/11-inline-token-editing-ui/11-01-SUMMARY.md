---
phase: 11-inline-token-editing-ui
plan: 01
subsystem: api
tags: [nextjs, mongodb, mongoose, patch, tokens, themes]

# Dependency graph
requires:
  - phase: 10-data-model-foundation
    provides: ITheme.tokens field and theme document structure in MongoDB
provides:
  - PATCH /api/collections/[id]/themes/[themeId]/tokens endpoint for replacing theme token trees
affects: [11-inline-token-editing-ui, 12-figma-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Whole-array $set for theme mutations — positional $set unreliable on Mixed arrays (Mongoose #14595, #12530)"
    - "Source-group guard: check root-level group IDs in theme.groups before accepting write"

key-files:
  created:
    - src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts
  modified: []

key-decisions:
  - "Root-level source-group guard only (not recursive) — theme.groups uses root-level group IDs"
  - "Return { tokens: body.tokens } (not full theme) — caller already has the updated payload"
  - "Cast lean() result through unknown before Record<string,unknown> — strict TypeScript overlap check"

patterns-established:
  - "PATCH tokens route: validate array → fetch doc → find theme → check source-group guard → $set whole array → return tokens"

requirements-completed: [EDIT-03]

# Metrics
duration: 2min
completed: 2026-03-19
---

# Phase 11 Plan 01: Tokens PATCH Endpoint Summary

**PATCH `/api/collections/[id]/themes/[themeId]/tokens` route with whole-array $set and source-group 422 guard**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-19T23:12:29Z
- **Completed:** 2026-03-19T23:13:55Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created dedicated PATCH endpoint for replacing theme.tokens without touching theme name or group states
- Implemented whole-array $set pattern (consistent with PUT /themes/[themeId]) to avoid Mongoose positional $set bugs
- Source-group guard rejects writes targeting source groups with 422 before any DB mutation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PATCH /api/collections/[id]/themes/[themeId]/tokens route** - `52458e2` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts` - PATCH endpoint: validates body, fetches collection, guards source groups, persists with $set

## Decisions Made

- Root-level source-group guard only (not recursive) — `theme.groups` maps root-level group IDs to their state; children are implicitly governed by their parent
- Response returns `{ tokens: body.tokens }` rather than the full updated theme — the caller already has the payload and a minimal response avoids re-fetching
- Imports `TokenGroup` from `@/types` (re-exports from `token.types.ts`) — do not import ITheme to avoid strict TypeScript overlap on lean() cast

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript error in `src/app/collections/[id]/tokens/page.tsx` (Cannot find name 'handleThemeChange') — out of scope, not introduced by this plan, not fixed. The new route file compiles without errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PATCH tokens endpoint ready for Phase 11 inline editing UI to consume
- Endpoint follows exact same pattern as PUT /themes/[themeId] — consistent for future maintainers
- Source-group protection enforced server-side; UI can add client-side guard as UX improvement

---
*Phase: 11-inline-token-editing-ui*
*Completed: 2026-03-19*
