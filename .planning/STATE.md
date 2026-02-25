# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Token collections are always available and editable — stored in MongoDB, loadable into the generator form, and visible on the view page.
**Current focus:** Phase 1 — Database Foundation

## Current Position

Phase: 1 of 4 (Database Foundation)
Plan: 3 of 3 in current phase
Status: Phase 1 complete
Last activity: 2026-02-25 — Completed 01-03 (seed script and Angular parity tracking document)

Progress: [████░░░░░░] 25%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 3.3 min
- Total execution time: ~0.17 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-database-foundation | 3 | 10 min | 3.3 min |

**Recent Trend:**
- Last 5 plans: 01-01 (3 min), 01-02 (2 min), 01-03 (5 min)
- Trend: Phase 1 complete

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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 01-03-PLAN.md (seed script and Angular parity tracking document — Phase 1 complete)
Resume file: None
