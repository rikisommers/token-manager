---
phase: 01-database-foundation
plan: 02
subsystem: database
tags: [mongoose, mongodb, typescript, schema, model, types]

# Dependency graph
requires:
  - src/lib/mongodb.ts (from plan 01)
  - mongoose@9.2.2 (from plan 01)
provides:
  - src/types/collection.types.ts with ITokenCollection, ISourceMetadata, CreateTokenCollectionInput, UpdateTokenCollectionInput
  - src/lib/db/models/TokenCollection.ts Mongoose model with full schema
affects:
  - 01-database-foundation (plan 03 seed script)
  - 02-token-collection-api
  - 03-generator-form-integration
  - 04-view-page-and-crud

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mongoose Schema.Types.Mixed for arbitrary JSON (W3C token tree)"
    - "Hot-reload guard: check mongoose.models[name] before registering model"
    - "Sub-schema with _id: false for embedded nullable objects"
    - "timestamps: true for auto-managed createdAt/updatedAt"

key-files:
  created:
    - src/types/collection.types.ts
    - src/lib/db/models/TokenCollection.ts

key-decisions:
  - "Schema.Types.Mixed for tokens field — W3C Design Token format is a deeply-nested JSON tree with arbitrary token names; no schema validation on internal structure"
  - "No unique index on name — users may have duplicate names across users in future (userId scopes uniqueness)"
  - "userId nullable (index: true) — single-user now; architecture ready for multi-user without migration"
  - "Sub-schema with _id: false for sourceMetadata — embedded nullable object, not a subdocument"
  - "Record<string, unknown> in TypeScript interface instead of any — preserves type safety at the boundary"

requirements-completed: [DB-03]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 1 Plan 02: TokenCollection Schema and Types Summary

**TokenCollection Mongoose schema with Schema.Types.Mixed tokens field, nullable sourceMetadata sub-schema, and matching TypeScript interfaces exported from collection.types.ts**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-25T09:10:34Z
- **Completed:** 2026-02-25T09:12:34Z
- **Tasks:** 2
- **Files modified:** 2 (src/types/collection.types.ts, src/lib/db/models/TokenCollection.ts)

## Accomplishments

- Created `src/types/collection.types.ts` with four exports: `ISourceMetadata`, `ITokenCollection`, `CreateTokenCollectionInput`, `UpdateTokenCollectionInput`
- Created `src/lib/db/models/TokenCollection.ts` with full Mongoose schema including all required fields
- Schema uses `Schema.Types.Mixed` for the `tokens` field to accommodate the W3C Design Token arbitrary JSON structure
- Hot-reload guard prevents model re-registration on Next.js dev-mode hot-reload
- `timestamps: true` auto-manages `createdAt` and `updatedAt`
- `userId` indexed for future multi-user filtering queries

## Schema Shape

### Fields and Types

| Field | Mongoose Type | Required | Default | Index |
|-------|--------------|----------|---------|-------|
| name | String | true | — | { name: 1 } |
| tokens | Mixed | true | — | — |
| sourceMetadata | Sub-schema | false | null | — |
| userId | String | false | null | true |
| createdAt | Date | auto | — | — |
| updatedAt | Date | auto | — | — |

### sourceMetadata Sub-schema

| Field | Type | Default |
|-------|------|---------|
| repo | String | null |
| branch | String | null |
| path | String | null |

### Indexes

- `{ userId: 1 }` — for user-scoped collection filtering (future multi-user)
- `{ name: 1 }` — for fast listing/sorting by collection name

## TypeScript Interfaces Exported

From `src/types/collection.types.ts`:

- `ISourceMetadata` — nullable repo/branch/path strings for GitHub provenance
- `ITokenCollection` — full document shape; `tokens` typed as `Record<string, unknown>`
- `CreateTokenCollectionInput` — `Omit<ITokenCollection, '_id' | 'createdAt' | 'updatedAt'>`
- `UpdateTokenCollectionInput` — `Partial<Pick<ITokenCollection, 'name' | 'tokens' | 'sourceMetadata'>>`

## Task Commits

Each task was committed atomically:

1. **Task 1: Define TypeScript interfaces for TokenCollection** — `c77e4dc` (feat)
2. **Task 2: Create TokenCollection Mongoose schema and model** — `5b11deb` (feat)

## Decisions Made

- **Schema.Types.Mixed for tokens:** W3C Design Token format is a deeply-nested JSON object with arbitrary token names. Mongoose would need a recursive schema definition; Mixed type stores it as-is. TypeScript side uses `Record<string, unknown>` (not `any`) to preserve type safety at the boundary.
- **No unique index on name:** Collection names are user-defined free text. In the planned multi-user phase, uniqueness is scoped per-userId, not globally. A premature unique index would require dropping and recreating it later.
- **userId nullable with index:** Single-user in v1, but the field and index are in place so that adding auth in Phase 4 requires only a backfill, not a schema migration.
- **Sub-schema with `_id: false`:** sourceMetadata is an embedded value object, not a referenced document. `_id: false` prevents Mongoose from generating a spurious ObjectId for it.
- **Hot-reload guard pattern:** `mongoose.models.TokenCollection || mongoose.model(...)` is the standard Next.js 13 pattern to prevent "OverwriteModelError" on hot-reload in development.

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

- `TokenCollection` model is importable from any API route via `import TokenCollection from '@/lib/db/models/TokenCollection'`
- Types in `collection.types.ts` are ready for use by Plan 03 seed script and Phase 2 API routes
- Both files compile without TypeScript errors (pre-existing errors in other files are unrelated)

## Self-Check: PASSED

- FOUND: src/types/collection.types.ts
- FOUND: src/lib/db/models/TokenCollection.ts
- FOUND commit: c77e4dc (feat(01-02): define TypeScript interfaces for TokenCollection)
- FOUND commit: 5b11deb (feat(01-02): create TokenCollection Mongoose schema and model)

---
*Phase: 01-database-foundation*
*Completed: 2026-02-25*
