# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Token collections are always available and editable — stored in MongoDB, loadable into the generator form, and visible on the view page.
**Current focus:** Phase 3 — Generator Form

## Current Position

Phase: 3 of 4 (Generator Form)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-02-26 — Completed 03-01 (POST + PUT API endpoints for collections write-side)

Progress: [██████░░░░] 55%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 2.8 min
- Total execution time: ~0.23 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-database-foundation | 3 | 10 min | 3.3 min |
| 02-view-integration | 2 | 4 min | 2.0 min |
| 03-generator-form | 1 | 2 min | 2.0 min |

**Recent Trend:**
- Last 5 plans: 01-03 (5 min), 02-01 (2 min), 02-02 (2 min), 03-01 (2 min)
- Trend: Phase 3 in progress

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- MongoDB as persistence layer (specified by user; natural fit for JSON token documents)
- Seed local tokens/ once at setup (keep local files as read-only reference; MongoDB becomes editable source)
- Store GitHub source as structured metadata field on document (queryable, not a JSON comment)
- userId nullable in schema (single-user now; architecture ready for multi-user later)
- Use TokenGeneratorFormNew.tsx as base (active component with most features)
- Document all new features in .planning/ANGULAR_PARITY.md for future Angular port

**01-01 decisions:**
- Mongoose ODM over native MongoDB driver (ODM chosen for schema validation + model layer convenience; used in phases 02+)
- Error thrown at module load time when MONGODB_URI missing (fail-fast rather than silent hang)
- global.__mongoose_cache singleton (standard Next.js pattern to survive hot-reload without exhausting connection pool)
- bufferCommands: false (surface connection failures immediately rather than queuing queries)
- Event handlers registered outside dbConnect() to avoid duplicate registration on repeated calls

**01-02 decisions:**
- Schema.Types.Mixed for tokens field (W3C Design Token format is arbitrary nested JSON; no Mongoose schema validation on internal structure)
- No unique index on name (uniqueness is userId-scoped in future multi-user; premature unique constraint would require migration)
- userId nullable with index (single-user v1; index in place for multi-user query patterns without future migration)
- Sub-schema with _id: false for sourceMetadata (embedded value object, not subdocument)
- Record<string, unknown> in TypeScript interface instead of any (preserves type safety at the API boundary)

**01-03 decisions:**
- ts-node --transpile-only with separate tsconfig.scripts.json (CommonJS/node) for running TypeScript scripts outside Next.js bundler context
- DOTENV_CONFIG_PATH + -r dotenv/config register to load .env.local before hoisted module imports check MONGODB_URI
- Collection name derivation: path.relative + regex (slashes to ' / ') giving readable defaults users can rename in Phase 4

**02-01 decisions:**
- lean() projection for API route (find with { name: 1, createdAt: 1 }.lean() returns JSON-serialisable plain objects; avoids Mongoose Document overhead)
- Explicit _id.toString() and createdAt.toISOString() in map (lean() preserves native ObjectId and Date types; explicit cast required for safe JSON serialisation)
- No sort in collections query (UI displays in natural insertion order; sort is a UI concern per plan requirement)

**02-02 decisions:**
- flattenMongoTokens() inline in page.tsx (not a new file) — collocated with only consumer; no premature abstraction
- Select stays enabled during loading — user can cancel by switching; AbortController handles in-flight fetch cancellation
- localStorage id validated against live collections on mount — stale ids silently fall back to 'local'
- GET /api/collections/[id] uses .lean() — consistent with collections list route pattern

**03-01 decisions:**
- 409 response includes existingId so client can call PUT /api/collections/[existingId] directly — no second GET needed
- PUT body empty-check tests all three UpdateTokenCollectionInput fields; {} returns 400 rather than a no-op DB call
- runValidators: true on findByIdAndUpdate ensures Mongoose schema validators run on updates

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-26
Stopped at: Completed 03-01-PLAN.md
Resume file: None
