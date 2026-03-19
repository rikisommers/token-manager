---
phase: 10-data-model-foundation
plan: 01
subsystem: database
tags: [mongodb, typescript, theme, tokens, api]

# Dependency graph
requires: []
provides:
  - ITheme.tokens required field (TokenGroup[] snapshot embedded on theme creation)
  - toDoc() normalization guarantees theme.tokens is always TokenGroup[] (never undefined)
  - POST /api/collections/[id]/themes enforces 10-theme cap with 422 response
  - POST /api/collections/[id]/themes embeds full groupTree as theme.tokens
affects:
  - 10-02 (future plans in phase 10)
  - Phase 11 (inline editing reads theme.tokens)
  - Phase 12 (export reads theme.tokens)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "toDoc() normalization: always guard ITheme.tokens with ?? [] to handle pre-v1.4 documents"
    - "Store groupTree (not flattenAllGroups result) as ITheme.tokens — flat list loses children hierarchy"
    - "422 Unprocessable Entity for business rule violations (count cap), not 400"

key-files:
  created: []
  modified:
    - src/types/theme.types.ts
    - src/lib/db/mongo-repository.ts
    - src/app/api/collections/[id]/themes/route.ts

key-decisions:
  - "tokens field is required (not optional) on ITheme — backward compat handled in toDoc() normalization with ?? []"
  - "Store full groupTree as tokens, not flat list — tree preserves children hierarchy needed for Phase 11"
  - "422 status code for 10-theme count cap (locked decision from planning)"
  - "Normalization in toDoc() covers both MongoDB and Supabase paths — single source of truth for ITheme shape"

patterns-established:
  - "toDoc() normalization pattern: map over raw array and apply ?? [] per-item for Mixed-typed Mongoose fields"
  - "Embed full computed tree on write, never recompute at read time"

requirements-completed:
  - THEME-01
  - THEME-02
  - THEME-04

# Metrics
duration: 1min
completed: 2026-03-20
---

# Phase 10 Plan 01: Data Model Foundation Summary

**ITheme extended with required `tokens: TokenGroup[]` snapshot field, normalized in toDoc(), embedded on POST with 10-theme cap returning HTTP 422**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-19T11:56:41Z
- **Completed:** 2026-03-19T11:58:17Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Added `tokens: TokenGroup[]` as a required field to `ITheme` in `theme.types.ts`
- Updated `toDoc()` in `mongo-repository.ts` to normalize each theme's tokens with `?? []`, ensuring all collection reads see a valid array
- Added 10-theme count guard in POST handler returning `{ error: 'Maximum 10 themes per collection' }` with HTTP 422
- Embedded `groupTree` (full hierarchical tree, not the flat list) as `theme.tokens` when creating a new theme

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend ITheme, normalize toDoc(), embed tokens in POST, enforce 10-theme cap** - `19a1a54` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `src/types/theme.types.ts` - Added `import type { TokenGroup }` and `tokens: TokenGroup[]` required field to ITheme
- `src/lib/db/mongo-repository.ts` - Added `TokenGroup` import; replaced simple cast in `toDoc()` with per-theme map that normalizes `tokens: (t.tokens as TokenGroup[]) ?? []`
- `src/app/api/collections/[id]/themes/route.ts` - Removed `void existingThemes` suppression; added 10-theme cap guard (422); added `tokens: groupTree` to theme object literal

## Decisions Made
- `tokens` is required (not optional) on `ITheme` — backward compatibility with pre-v1.4 MongoDB documents is handled solely in `toDoc()` normalization, keeping consuming code clean
- `groupTree` stored as `tokens` (not `flattenAllGroups(groupTree)`) because the flat list strips `children` from `TokenGroup`, which Phase 11 inline editing needs
- HTTP 422 for count cap is the locked decision from planning (not 400)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Every theme in MongoDB is now a self-contained token snapshot — Phase 11 (inline editing) and Phase 12 (export) can read `theme.tokens` directly
- `toDoc()` normalization means pre-v1.4 documents with no `tokens` field are safe to read — they return an empty array
- No blockers for next plan

---
*Phase: 10-data-model-foundation*
*Completed: 2026-03-20*
