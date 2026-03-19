---
phase: 10-data-model-foundation
plan: 02
subsystem: ui + migration
tags: [react, typescript, mongodb, theme, migration, ui-guard]

# Dependency graph
requires:
  - 10-01 (ITheme.tokens field, toDoc() normalization, 10-theme cap in POST handler)
provides:
  - ThemeList Plus button disabled with tooltip when at 10-theme limit (atLimit guard)
  - scripts/migrate-theme-tokens.ts — idempotent one-time migration to seed theme.tokens
  - npm run migrate:themes — ts-node --transpile-only runner matching seed.ts pattern
affects:
  - Phase 11 (migration must be run before inline editing ships to ensure all themes have tokens)
  - Phase 12 (export reads theme.tokens, same readiness requirement)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "atLimit boolean pattern: const atLimit = themes.length >= MAX; disabled={atLimit} on button"
    - "Whole-array $set: { themes: updatedThemes } for idempotent migration — positional $set unreliable on Mixed arrays"
    - "Cast Mongoose .lean() result through unknown before narrowing: (col.themes as unknown) as Array<...>"

key-files:
  created:
    - scripts/migrate-theme-tokens.ts
  modified:
    - src/components/themes/ThemeList.tsx
    - package.json

key-decisions:
  - "atLimit const placed just before return() in component body — after hooks, before JSX (React convention)"
  - "Migration uses whole-array $set, not per-item positional $set, matching the locked decision from STATE.md"
  - "groupTree stored as theme.tokens (not flat list) — consistent with Plan 01 embed pattern"
  - "Cast lean() result through unknown to satisfy TypeScript strict overlap check (ITheme vs Record<string,unknown>)"

patterns-established:
  - "UI limit guard: disabled={atLimit} + title tooltip + disabled:opacity-40 disabled:cursor-not-allowed classes"
  - "Migration script structure: find collections with themes, check needsMigration, rebuild array, whole-array $set"

requirements-completed:
  - THEME-03
  - THEME-04

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 10 Plan 02: UI Guard and Migration Script Summary

**ThemeList Plus button disabled at 10-theme limit with tooltip; idempotent migrate-theme-tokens.ts script seeds theme.tokens on pre-existing documents via whole-array $set**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-19T12:00:51Z
- **Completed:** 2026-03-19T12:03:19Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `atLimit` guard (`themes.length >= 10`) to ThemeList Plus button with `disabled={atLimit}`, `disabled:opacity-40 disabled:cursor-not-allowed` classes, and conditional title tooltip
- Created `scripts/migrate-theme-tokens.ts` following the exact seed.ts pattern (same dbConnect import, same ts-node runner)
- Migration is idempotent: themes where `t.tokens !== undefined && t.tokens !== null` are skipped without modification
- Uses whole-array `$set: { themes: updatedThemes }` — never positional $set on Mixed-typed arrays (Mongoose bugs #14595, #12530)
- Stores `groupTree` from `tokenService.processImportedTokens` (not flat list) — preserves children hierarchy for Phase 11
- Added `migrate:themes` npm script to `package.json` matching the seed pattern: `ts-node --transpile-only -r dotenv/config --project tsconfig.scripts.json`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 10-theme UI guard to ThemeList** - `3adf1f8` (feat)
2. **Task 2: Create migration script and add npm script entry** - `280d867` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/components/themes/ThemeList.tsx` — Added `atLimit` const; replaced Plus button with disabled state, conditional title tooltip, and `disabled:opacity-40 disabled:cursor-not-allowed` classes
- `scripts/migrate-theme-tokens.ts` — New idempotent migration script following seed.ts pattern; seeds `theme.tokens` from collection's `processImportedTokens` groupTree on themes that lack the field
- `package.json` — Added `migrate:themes` script entry after `seed` entry

## Decisions Made

- `atLimit` placed before `return (` in component body (after hooks, before JSX) per React convention
- Whole-array `$set: { themes: updatedThemes }` used exclusively — matches the locked architectural decision from STATE.md/10-01
- `groupTree` stored (not `flattenAllGroups(groupTree)`) for Phase 11/12 compatibility — consistent with Plan 01
- Type cast `(col.themes as unknown) as Array<Record<string, unknown>>` needed because TypeScript's strict overlap check rejects direct cast from `ITheme[]` to `Record<string, unknown>[]`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript type cast error in migration script**
- **Found during:** Task 2 verification (tsc --noEmit)
- **Issue:** Direct cast `(col.themes as Array<Record<string, unknown>>)` fails TypeScript strict overlap check — `ITheme` has no index signature, so it "doesn't sufficiently overlap" with `Record<string, unknown>`
- **Fix:** Added intermediate `unknown` cast: `((col.themes as unknown) as Array<Record<string, unknown>>)`
- **Files modified:** `scripts/migrate-theme-tokens.ts` (line 27)
- **Commit:** `280d867` (included in task commit)

## Issues Encountered

None beyond the auto-fixed TypeScript cast above.

## User Setup Required

- Run `npm run migrate:themes` once against the production MongoDB database before Phase 11 ships
- Requires `MONGODB_URI` in `.env.local` (same as existing `npm run seed` requirement)

## Next Phase Readiness

- ThemeList now enforces the 10-theme UI cap matching the API-level 422 guard from Plan 01 — defense in depth complete
- Migration script ready to run before Phase 11 deploys — all themes will have a valid `tokens: TokenGroup[]` field
- Phase 11 (inline token editing) can safely read `theme.tokens` on all documents after migration runs
- No blockers for Phase 11

---
*Phase: 10-data-model-foundation*
*Completed: 2026-03-20*

## Self-Check: PASSED

- FOUND: `src/components/themes/ThemeList.tsx`
- FOUND: `scripts/migrate-theme-tokens.ts`
- FOUND: `.planning/phases/10-data-model-foundation/10-02-SUMMARY.md`
- FOUND commit `3adf1f8` (Task 1: ThemeList atLimit guard)
- FOUND commit `280d867` (Task 2: migration script + npm entry)
