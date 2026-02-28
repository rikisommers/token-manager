---
phase: 02-view-integration
plan: 01
subsystem: api
tags: [next.js, mongoose, mongodb, route-handler, typescript]

# Dependency graph
requires:
  - src/lib/mongodb.ts (from phase 01 plan 01 — dbConnect singleton)
  - src/lib/db/models/TokenCollection.ts (from phase 01 plan 02 — Mongoose model)
provides:
  - src/app/api/collections/route.ts with GET /api/collections endpoint
  - Returns { collections: [{ _id: string, name: string, createdAt: string }] }
affects:
  - 02-view-integration (plan 02 — View Tokens page selector consumes this endpoint)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Next.js App Router GET handler: export async function GET() returning NextResponse.json"
    - "Lean query projection: TokenCollection.find({}, { name: 1, createdAt: 1 }).lean() for JSON-serialisable plain objects"
    - "ObjectId to string: doc._id.toString() after lean() since lean keeps ObjectId type"

key-files:
  created:
    - src/app/api/collections/route.ts
  modified: []

key-decisions:
  - "lean() projection returning { name: 1, createdAt: 1 } — avoids Mongoose Document overhead and produces plain objects directly serialisable to JSON"
  - "Manual map to convert _id ObjectId to string and createdAt Date to ISO string — lean() preserves native types (ObjectId, Date) so explicit conversion required"
  - "No sorting in query — UI displays collections in natural (insertion) order per plan requirement; selector will handle display ordering if needed"

patterns-established:
  - "Collections API pattern: dbConnect → Model.find().lean() → map to typed plain objects → NextResponse.json"

requirements-completed: [VIEW-01, VIEW-02, VIEW-03]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 2 Plan 01: Collections List API Endpoint Summary

**Next.js App Router GET /api/collections route returning lean-projected TokenCollection documents as { _id, name, createdAt } JSON array**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-25T10:31:47Z
- **Completed:** 2026-02-25T10:33:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `src/app/api/collections/route.ts` exporting a GET handler for the View Tokens page selector
- Uses `dbConnect()` singleton from Phase 1, then `TokenCollection.find().lean()` with name+createdAt projection
- Maps lean docs to explicit `{ _id: string, name: string, createdAt: string }` response shape
- Returns `{ collections: [] }` (200) when database is empty; `{ error: '...' }` (500) on database error
- TypeScript reports no errors in the new file

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GET /api/collections route** - `e34deee` (feat)

## Files Created/Modified

- `src/app/api/collections/route.ts` - Next.js App Router route handler; exports GET; queries TokenCollection with lean projection; returns { collections: [...] }

## Decisions Made

- **lean() projection over full documents:** `find({}, { name: 1, createdAt: 1 }).lean()` fetches only the two fields needed by the selector and returns plain JavaScript objects rather than Mongoose Documents, avoiding serialisation overhead
- **Explicit type conversion in map:** After lean(), `_id` remains a MongoDB ObjectId and `createdAt` is a native Date. Both are cast to string in the map step to produce a JSON-safe response
- **No sort in query:** Plan explicitly states "do not sort — let MongoDB return in natural order". Display ordering is a UI concern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. MongoDB connection setup was completed in Phase 1 Plan 01.

## Next Phase Readiness

- `GET /api/collections` is ready for Plan 02 (View Tokens page) to fetch the Database optgroup list
- Route follows the established ANGULAR_PARITY.md contract: `{ collections: [{ _id, name, createdAt }] }`
- The endpoint handles both empty-database and error states correctly

## Self-Check: PASSED

- FOUND: src/app/api/collections/route.ts
- FOUND commit: e34deee (feat(02-01): create GET /api/collections route)

---
*Phase: 02-view-integration*
*Completed: 2026-02-25*
