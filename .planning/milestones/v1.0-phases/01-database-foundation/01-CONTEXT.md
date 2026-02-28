# Phase 1: Database Foundation - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Install MongoDB persistence infrastructure for the Next.js app: connection management, the `TokenCollection` schema, and auto-seeding from local token files on first startup. No user-facing UI changes in this phase — this is the data layer that Phases 2–4 build on.

</domain>

<decisions>
## Implementation Decisions

### Seed behavior
- Seeding is a **dev-only / first-run operation** — not a user-triggered action
- Seed runs **automatically on first app startup** when the MongoDB database is empty (zero collections)
- Seed imports all `.json` token files from the `tokens/` directory recursively
- Seed is **idempotent** — skips collections that already exist (safe to re-run during development)
- The seed populates the DB so that users find defaults already in place on first use

### Collection model
- A **collection represents a complete token set** (brand/project scope), not individual files
- The collection name is a **free-text string defined by the user** when saving from the generator form
- No auto-derived naming from filenames — users always name their collections explicitly
- Rename is available in Phase 4, so seed-created names just need to be reasonable defaults

### Connection failure
- If MongoDB is **unreachable at startup**: app fails with a clear error message — MongoDB is required, no silent degradation
- If MongoDB connection **drops mid-session**: show an error toast notification and retry silently in the background; the app stays usable, DB operations that fail show errors gracefully
- No persistent connection status indicator — only surface errors when something goes wrong

### Config setup
- MongoDB connection string provided via **`.env.local`** using the standard Next.js environment variable pattern (`MONGODB_URI`)
- No in-app settings UI for the connection string — documented in README
- No visible connection indicator in the app UI when connected normally

### Claude's Discretion
- Mongoose ODM vs native MongoDB driver — Claude picks the most appropriate for this Next.js 13 setup
- Connection singleton implementation pattern
- Exact error message text and format
- Schema index strategy

</decisions>

<specifics>
## Specific Ideas

- Collection naming is user-defined — similar to a "global prefix" concept in design token tooling (one name for the whole token set)
- The seed should feel transparent: first-time users see defaults already in place without any setup steps

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-database-foundation*
*Context gathered: 2026-02-25*
