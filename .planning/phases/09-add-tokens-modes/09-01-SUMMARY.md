---
phase: 09-add-tokens-modes
plan: 01
subsystem: api
tags: [mongodb, mongoose, nextjs, typescript, themes]

# Dependency graph
requires:
  - phase: 08-clean-code
    provides: Clean token collection model and API routes this plan extends
provides:
  - ITheme and ThemeGroupState TypeScript types in src/types/theme.types.ts
  - themes: ITheme[] field on ITokenCollection and Mongoose schema
  - GET/POST /api/collections/[id]/themes route
  - PUT/DELETE /api/collections/[id]/themes/[themeId] route
affects:
  - 09-02
  - 09-03

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Themes stored as Mixed array in Mongoose schema (same as graphState pattern)
    - Direct Mongoose model import for $push/$pull array operations (bypass repository layer)
    - GET via repository layer, mutations via direct TokenCollection model

key-files:
  created:
    - src/types/theme.types.ts
    - src/app/api/collections/[id]/themes/route.ts
    - src/app/api/collections/[id]/themes/[themeId]/route.ts
  modified:
    - src/types/collection.types.ts
    - src/lib/db/models/TokenCollection.ts
    - src/lib/db/mongo-repository.ts
    - src/lib/db/supabase-repository.ts

key-decisions:
  - "Themes schema uses Schema.Types.Mixed (not [Schema.Types.Mixed]) — same pattern as graphState for flexible object arrays"
  - "GET uses repository layer; POST/PUT/DELETE use direct TokenCollection model — repository interface lacks $push/$pull semantics"
  - "First theme creation: all groups default to 'enabled'; subsequent themes default to 'disabled'"
  - "Supabase rowToDoc updated with themes field to keep both adapters in sync"

patterns-established:
  - "Theme CRUD route pattern: GET via getRepository(), mutations via direct model import with dbConnect()"

requirements-completed: [MODE-01, MODE-02, MODE-05]

# Metrics
duration: 7min
completed: 2026-03-19
---

# Phase 09 Plan 01: Themes Data Model and CRUD API Summary

**ITheme type with ThemeGroupState union, Mongoose schema extension, and full CRUD REST API at /api/collections/[id]/themes with correct first-theme/subsequent-theme default group state logic**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-19T01:56:39Z
- **Completed:** 2026-03-19T02:03:19Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Defined ITheme interface and ThemeGroupState union type; exported from theme.types.ts
- Extended ITokenCollection with themes: ITheme[], updated Mongoose schema and both repository adapters
- Delivered full CRUD API: GET/POST at /api/collections/[id]/themes and PUT/DELETE at /api/collections/[id]/themes/[themeId]
- POST correctly sets all groups to 'enabled' for first theme, 'disabled' for subsequent themes

## Task Commits

Each task was committed atomically:

1. **Task 1: Define Theme types and extend ITokenCollection** - `fa524ee` (feat)
2. **Task 2: Add /api/collections/[id]/themes route with GET, POST, PUT, DELETE** - `8c7dbee` (feat)

## Files Created/Modified

- `src/types/theme.types.ts` - ITheme interface and ThemeGroupState union type
- `src/types/collection.types.ts` - Added themes: ITheme[] to ITokenCollection; added 'themes' to UpdateTokenCollectionInput Pick
- `src/lib/db/models/TokenCollection.ts` - Added themes field to Mongoose schema (Schema.Types.Mixed, default [])
- `src/lib/db/mongo-repository.ts` - Added themes to toDoc() mapping
- `src/lib/db/supabase-repository.ts` - Added themes to SupabaseRow interface, rowToDoc(), and toUpdateRow()
- `src/app/api/collections/[id]/themes/route.ts` - GET (list themes) and POST (create theme) handlers
- `src/app/api/collections/[id]/themes/[themeId]/route.ts` - PUT (update name/groups) and DELETE handlers

## Decisions Made

- **Schema.Types.Mixed for themes array**: Mongoose's `[Schema.Types.Mixed]` array syntax caused TypeScript errors; using plain `Schema.Types.Mixed` with `default: []` matches the existing `graphState` pattern and works correctly.
- **Repository layer bypass for mutations**: The `ICollectionRepository` interface doesn't expose `$push`/`$pull` semantics. GET uses `getRepository()` for portability; POST/PUT/DELETE import `TokenCollection` and `dbConnect` directly.
- **Supabase adapter kept in sync**: Added themes to `SupabaseRow`, `rowToDoc`, and `toUpdateRow` even though themes aren't used there yet — prevents TypeScript errors and keeps both adapters consistent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added themes field to supabase-repository.ts**
- **Found during:** Task 1 (TypeScript verification)
- **Issue:** `CollectionDoc` (derived from `ITokenCollection`) now requires `themes: ITheme[]`. The supabase-repository's `rowToDoc` return object was missing the field, causing a TypeScript error.
- **Fix:** Added `themes` to `SupabaseRow` interface, `rowToDoc()` mapping, and `toUpdateRow()` function.
- **Files modified:** src/lib/db/supabase-repository.ts
- **Verification:** `npx tsc --noEmit` returns zero new errors from plan-scope files
- **Committed in:** fa524ee (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — supabase adapter completeness)
**Impact on plan:** Required for type correctness; no scope creep.

## Issues Encountered

- Git stash during pre-existing error investigation reverted Task 1 changes; re-applied all changes successfully before proceeding.
- Pre-existing TypeScript errors in `GroupStructureGraph.tsx`, `TokenRefNode.tsx`, `TypographyNode.tsx` (work-in-progress from before this plan). These are out of scope and logged here for awareness. Zero errors introduced by this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Theme types and API fully in place; 09-02 (Themes page UI) and 09-03 (Tokens page theme selector) can proceed.
- The themes API requires a running MongoDB instance (same as all other collection endpoints).

---
*Phase: 09-add-tokens-modes*
*Completed: 2026-03-19*
