---
phase: 03-generator-form
plan: 01
subsystem: api
tags: [mongodb, mongoose, nextjs, api-routes, rest]

requires:
  - phase: 02-view-integration
    provides: GET /api/collections and GET /api/collections/[id] established the read side; Mongoose model and dbConnect pattern in use
  - phase: 01-database-foundation
    provides: TokenCollection model, ITokenCollection interface, UpdateTokenCollectionInput type, dbConnect singleton

provides:
  - POST /api/collections — creates new TokenCollection document, returns 201 + full collection; 409 + existingId on duplicate name
  - PUT /api/collections/[id] — updates name/tokens/sourceMetadata via $set; returns 200 + updated collection

affects: [03-02-generator-form-ui, 03-generator-form, any plan implementing Save/Load dialog]

tech-stack:
  added: []
  patterns:
    - "409 + existingId pattern: POST returns existingId so client can offer overwrite via PUT without a separate lookup"
    - "findByIdAndUpdate with { new: true, runValidators: true } + .lean() for type-safe, validator-enforced updates"
    - "Empty-body guard: check all UpdateTokenCollectionInput fields undefined before calling DB"

key-files:
  created: []
  modified:
    - src/app/api/collections/route.ts
    - src/app/api/collections/[id]/route.ts
    - .planning/ANGULAR_PARITY.md

key-decisions:
  - "409 response includes existingId so client can call PUT /api/collections/[existingId] directly — no second GET needed"
  - "PUT body empty-check tests all three UpdateTokenCollectionInput fields; {} returns 400 rather than a no-op DB call"
  - "runValidators: true on findByIdAndUpdate ensures Mongoose schema validators (e.g. name required) run on updates"

patterns-established:
  - "409+existingId pattern: duplicate-name POST returns existingId; client drives overwrite flow with PUT"
  - "Lean serialisation: _id.toString(), (date as Date).toISOString() applied consistently in all write-side responses"

requirements-completed: [GEN-01, GEN-02, GEN-03, GEN-04, MGMT-01]

duration: 2min
completed: 2026-02-26
---

# Phase 3 Plan 01: Write-side API endpoints — POST and PUT collection handlers

**POST /api/collections with 409+existingId duplicate detection and PUT /api/collections/[id] update handler, enabling the generator form's Save/Overwrite flow**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-25T11:52:53Z
- **Completed:** 2026-02-25T11:54:49Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added POST /api/collections: validates name, returns 409 + existingId on duplicate, creates document and returns 201 + full collection on success
- Added PUT /api/collections/[id]: updates name/tokens/sourceMetadata via $set with validators; returns 200 + updated collection, 400 on empty body, 404 on unknown id
- Updated ANGULAR_PARITY.md with Phase 3 section covering both POST/PUT contracts, 409+existingId pattern, and Save/Load dialog UI contracts (editing indicator, dirty flag)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add POST /api/collections handler** - `c5aa5d9` (feat)
2. **Task 2: Add PUT /api/collections/[id] handler + update ANGULAR_PARITY.md** - `a4734b1` (feat)

## Files Created/Modified

- `src/app/api/collections/route.ts` — POST handler added (GET unchanged); validates name, duplicate check, TokenCollection.create()
- `src/app/api/collections/[id]/route.ts` — PUT handler added (GET unchanged); findByIdAndUpdate with $set, new, runValidators
- `.planning/ANGULAR_PARITY.md` — Phase 3 section: POST/PUT contracts, 409+existingId pattern, Save/Load UI contracts, dirty flag and editing indicator behaviour

## Decisions Made

- **409 + existingId pattern:** POST returns `existingId` so the client can call `PUT /api/collections/[existingId]` directly without a separate GET — eliminates a round trip and simplifies the Save dialog overwrite flow.
- **PUT empty-body guard:** All three `UpdateTokenCollectionInput` fields checked for `undefined` before touching the database. An empty object returns 400 immediately rather than issuing a no-op $set.
- **runValidators: true on findByIdAndUpdate:** Ensures Mongoose schema validators (notably `name: required`) run on updates, preventing invalid state from slipping through the update path.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- POST and PUT endpoints are ready; the generator form's Save/Overwrite dialog (Plan 02) can now wire up to these endpoints.
- The 409+existingId pattern is documented in both code and ANGULAR_PARITY.md; Plan 02 UI implementation can proceed without further API changes.
- No blockers.

---
*Phase: 03-generator-form*
*Completed: 2026-02-26*
