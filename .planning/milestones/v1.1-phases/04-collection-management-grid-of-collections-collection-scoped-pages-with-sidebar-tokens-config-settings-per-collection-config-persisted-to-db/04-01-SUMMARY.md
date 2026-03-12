---
phase: 04-collection-management
plan: "01"
subsystem: api
tags: [mongodb, mongoose, nextjs, typescript]

# Dependency graph
requires:
  - phase: 03-update-app-layout-to-improve-ux
    provides: sidebar and layout shell that reads collection data
provides:
  - Extended ITokenCollection interface with description, tags, figmaToken, figmaFileId, githubRepo, githubBranch
  - CollectionCardData interface for GET /api/collections richer list items
  - Mongoose schema fields persisting all six new config fields
  - GET /api/collections returning tokenCount, figmaConfigured, githubConfigured, updatedAt sorted desc
  - GET /api/collections/[id] returning all six new config fields
  - POST /api/collections/[id]/duplicate full-copy endpoint
affects:
  - 04-02-collections-grid-page
  - 04-03-collection-settings-page

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CollectionCardData computed-field pattern: server derives tokenCount/figmaConfigured/githubConfigured from raw doc, never sends figmaToken to list endpoint"
    - "Duplicate-name resolution: check for '(copy)' suffix existence, fallback to timestamp suffix"

key-files:
  created:
    - src/app/api/collections/[id]/duplicate/route.ts
  modified:
    - src/types/collection.types.ts
    - src/lib/db/models/TokenCollection.ts
    - src/app/api/collections/route.ts
    - src/app/api/collections/[id]/route.ts

key-decisions:
  - "CollectionCardData omits raw figmaToken/figmaFileId/githubRepo — only boolean figmaConfigured/githubConfigured sent in list response for security"
  - "tokenCount computed as Object.keys(doc.tokens ?? {}).length — no separate counter field needed"
  - "Duplicate name collision uses timestamp suffix (not incrementing counter) — simple and unique"

patterns-established:
  - "Lean queries cast new fields with (doc.field as T | undefined) ?? defaultValue — safe for pre-existing docs missing new fields"

requirements-completed:
  - COL-01
  - COL-04
  - COL-05

# Metrics
duration: 2min
completed: 2026-03-11
---

# Phase 4 Plan 01: Collection Schema + API Extension Summary

**MongoDB TokenCollection schema extended with description/tags/Figma/GitHub config fields; GET /api/collections returns richer CollectionCardData[]; new POST /api/collections/[id]/duplicate endpoint**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-11T11:42:53Z
- **Completed:** 2026-03-11T11:45:39Z
- **Tasks:** 2
- **Files modified:** 5 (4 modified, 1 created)

## Accomplishments
- Extended ITokenCollection and Mongoose schema with six new optional fields: description, tags, figmaToken, figmaFileId, githubRepo, githubBranch
- GET /api/collections now returns CollectionCardData[] sorted by updatedAt descending, with derived tokenCount, figmaConfigured, githubConfigured
- POST /api/collections/[id]/duplicate creates a full copy including all config fields, with automatic name collision handling
- GET /api/collections/[id] response enriched with all six new config fields for settings page pre-population

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend collection types and Mongoose schema with metadata + config fields** - `f085314` (feat)
2. **Task 2: Update collection API routes — richer GET list, extended PUT, new duplicate endpoint** - `e4f929b` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `src/types/collection.types.ts` - Added six new optional fields to ITokenCollection, new CollectionCardData interface, updated UpdateTokenCollectionInput
- `src/lib/db/models/TokenCollection.ts` - Added six new Mongoose schema fields with correct defaults
- `src/app/api/collections/route.ts` - GET now returns CollectionCardData[] sorted desc with derived fields
- `src/app/api/collections/[id]/route.ts` - GET returns new config fields; PUT empty-body guard includes new fields
- `src/app/api/collections/[id]/duplicate/route.ts` - New POST endpoint: full collection copy with name suffix logic

## Decisions Made
- CollectionCardData omits raw integration tokens — only boolean flags sent in list response (security)
- tokenCount computed from Object.keys(tokens) at request time — no counter field to keep in sync
- Timestamp suffix for duplicate name collision — simple, unique, no sequential counter needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema and API layer complete. Phase 04-02 (collections grid page) and 04-03 (collection settings page) can now build against richer API data.
- No blockers.

---
*Phase: 04-collection-management*
*Completed: 2026-03-11*
