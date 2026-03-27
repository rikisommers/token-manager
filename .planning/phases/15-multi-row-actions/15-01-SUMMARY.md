---
phase: 15-multi-row-actions
plan: 01
subsystem: testing
tags: [jest, ts-jest, pure-functions, bulk-actions, token-management, tdd]

# Dependency graph
requires:
  - phase: 13-groups-ordering-drag-and-drop
    provides: groupMove.ts resolveCollisionFreeId pattern — pure function convention for tree mutation
provides:
  - Six pure bulk-mutation helpers for multi-row token operations (delete, move, change type, add prefix, remove prefix)
  - detectCommonPrefix helper for suggesting prefix removal
  - resolveTokenPathConflict private helper with same suffix pattern as groupMove.ts
  - Jest + ts-jest test infrastructure for the project
affects: [15-multi-row-actions plans 02+, any phase that adds token mutation logic]

# Tech tracking
tech-stack:
  added: [jest@30, @types/jest, ts-jest, jest.config.ts]
  patterns: [TDD red-green-refactor, pure function with no React/side-effects, resolveTokenPathConflict suffix pattern mirrors resolveCollisionFreeId]

key-files:
  created:
    - src/utils/bulkTokenActions.ts
    - src/utils/bulkTokenActions.test.ts
    - jest.config.ts
  modified:
    - src/utils/index.ts

key-decisions:
  - "resolveTokenPathConflict mirrors resolveCollisionFreeId from groupMove.ts — candidate-2..candidate-10 then Date.now() fallback"
  - "Alias rewrite scoped to within-group tokens only — rewriteGroupAliases uses regex /.${oldPath}(?=})/g pattern as specified"
  - "bulkMoveTokens accumulates existingPaths set during move to prevent double-collision when multiple tokens share similar paths"
  - "bulkAddPrefix/bulkRemovePrefix build existingPaths from non-selected tokens first so renames don't collide with each other"
  - "jest.config.ts uses ts-jest preset with CommonJS module override — Next.js tsconfig uses bundler moduleResolution incompatible with Jest"
  - "detectCommonPrefix sorts array first, then compares first vs last — O(n) after sort, correct for all cases"

patterns-established:
  - "updateGroupInTree: recursive tree updater that applies a transform to exactly one group by ID — mirrors findGroupInTree pattern"
  - "renames array + post-loop alias rewrite: collect all old→new path renames, then rewrite aliases in a second pass"
  - "rewriteGroupAliases: only rewrites alias strings (value starts with '{') using /\.${oldPath}(?=})/g regex"

requirements-completed: [BULK-03, BULK-04, BULK-05, BULK-06, BULK-07]

# Metrics
duration: 3min
completed: 2026-03-27
---

# Phase 15 Plan 01: bulkTokenActions Pure Utilities Summary

**Six pure bulk-mutation helpers for token groups via TDD — delete, move, change-type, add-prefix, remove-prefix, detect-prefix — with collision resolution and within-group alias rewriting**

## Performance

- **Duration:** 3 min 14 sec
- **Started:** 2026-03-27T07:01:22Z
- **Completed:** 2026-03-27T07:04:36Z
- **Tasks:** 1 (TDD: RED + GREEN + barrel export)
- **Files modified:** 4 created, 1 modified

## Accomplishments

- Jest + ts-jest test infrastructure added to project (first-time setup)
- 35 tests written covering all six functions plus edge cases (empty inputs, collisions, nested groups, alias rewrites)
- All six pure utility functions implemented with zero TypeScript errors in new files
- All functions exported from `src/utils/index.ts` barrel

## Task Commits

TDD approach with multiple commits per phase:

1. **RED phase: failing tests** - `0c8d422` (test)
2. **GREEN phase: implementation + barrel export** - `42cd3cc` (feat)

## Files Created/Modified

- `src/utils/bulkTokenActions.ts` — Six pure bulk-mutation helpers + private resolveTokenPathConflict and rewriteGroupAliases helpers
- `src/utils/bulkTokenActions.test.ts` — 35 tests covering all functions and edge cases
- `jest.config.ts` — Jest configuration with ts-jest preset and @/* path alias support
- `src/utils/index.ts` — Added `export * from './bulkTokenActions'` barrel export
- `package.json` — Added jest, @types/jest, ts-jest devDependencies

## Decisions Made

- **Jest config uses ts-jest with CommonJS override**: Next.js tsconfig uses `moduleResolution: "bundler"` which Jest can't handle; ts-jest override to `module: CommonJS` and `moduleResolution: node` is the minimal fix.
- **detectCommonPrefix sorts and compares first vs last**: Standard algorithm — O(n log n) but deterministic and correct.
- **Alias rewrite regex `/.${oldPath}(?=})/g`**: Matches `.oldPath}` at word boundary inside alias braces — as specified in plan implementation notes.
- **existingPaths built from non-selected tokens first**: In addPrefix/removePrefix, this ensures that renamed paths don't collide with each other during the rename pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed jest + ts-jest (first test run setup)**
- **Found during:** Task 1 (TDD RED phase — test infrastructure check)
- **Issue:** Project had no jest or ts-jest installed; no jest.config.ts existed
- **Fix:** `yarn add --dev jest @types/jest ts-jest` and created `jest.config.ts`
- **Files modified:** package.json, yarn.lock, jest.config.ts
- **Verification:** Tests run and fail as expected in RED phase
- **Committed in:** 0c8d422 (RED commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — missing test infrastructure)
**Impact on plan:** Required for TDD execution. Plan specified `npx jest` so installation was implied.

## Issues Encountered

- Pre-existing TypeScript errors in unrelated files (SharedCollectionHeader.tsx, supabase-repository.ts, graphEvaluator.ts) — out of scope per deviation Rule scope boundary. Logged for awareness; not fixed.

## Next Phase Readiness

- All six bulk utility functions are tested, pure, and exported — ready for Plan 02 (multi-row selection UI) and Plan 03 (wiring to TokenGeneratorForm)
- Jest infrastructure now available for future TDD plans in this project

---
*Phase: 15-multi-row-actions*
*Completed: 2026-03-27*
