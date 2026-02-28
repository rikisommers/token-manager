---
phase: 01-database-foundation
plan: 01
subsystem: database
tags: [mongoose, mongodb, singleton, next.js, typescript]

# Dependency graph
requires: []
provides:
  - mongoose@9.2.2 installed as project dependency
  - src/lib/mongodb.ts singleton connection module with global cache
  - .env.local.example template documenting MONGODB_URI
affects:
  - 01-database-foundation (plans 02+)
  - 02-token-collection-api
  - 03-generator-form-integration
  - 04-view-page-and-crud

# Tech tracking
tech-stack:
  added: [mongoose@9.2.2]
  patterns: [Next.js mongoose singleton with global.__mongoose_cache, error-on-missing-env-var]

key-files:
  created:
    - src/lib/mongodb.ts
    - .env.local.example
  modified:
    - package.json
    - yarn.lock

key-decisions:
  - "Mongoose ODM over native MongoDB driver — ODM chosen for schema validation, model layer convenience, and Next.js ecosystem fit"
  - "Error thrown at module load time when MONGODB_URI missing — fail-fast is preferable to silent hang or degraded behavior"
  - "Global cache via global.__mongoose_cache — standard Next.js singleton pattern prevents new connections on hot-reload in dev mode"
  - "bufferCommands: false — surface connection failures immediately rather than queuing queries that may never execute"
  - "Event handlers (connected/error/disconnected) registered once on mongoose.connection — outside dbConnect() to avoid re-registration on each call"

patterns-established:
  - "MongoDB singleton: Use global.__mongoose_cache to hold conn and promise; check cache before connecting"
  - "API route DB access: Import dbConnect from '@/lib/mongodb' and call await dbConnect() before any queries"
  - "Environment variable guard: Check at module load time, throw descriptive error pointing developer to .env.local.example"

requirements-completed: [DB-01, DB-02]

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 1 Plan 01: Database Foundation — MongoDB Connection Summary

**Mongoose 9.2.2 installed with a Next.js global-cache singleton module that throws a descriptive error on missing MONGODB_URI and reuses a single connection across all API routes**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-25T09:05:42Z
- **Completed:** 2026-02-25T09:07:52Z
- **Tasks:** 2
- **Files modified:** 4 (package.json, yarn.lock, src/lib/mongodb.ts, .env.local.example)

## Accomplishments

- Installed mongoose@9.2.2 (ships its own TypeScript types — no @types/mongoose needed)
- Created `src/lib/mongodb.ts` with global singleton cache pattern (standard for Next.js 13 hot-reload safety)
- Created `.env.local.example` documenting the MONGODB_URI environment variable format
- Module throws a clear, actionable error at load time when MONGODB_URI is absent
- Registered connection lifecycle event handlers (connected/error/disconnected) for observability

## Task Commits

Each task was committed atomically:

1. **Task 1: Install mongoose and configure environment variable** - `444c9d3` (chore)
2. **Task 2: Create MongoDB singleton connection module** - `c0e210e` (feat)

## Files Created/Modified

- `src/lib/mongodb.ts` - Singleton dbConnect() function using global.__mongoose_cache; exports default async function
- `.env.local.example` - Template showing MONGODB_URI with example localhost and Atlas formats
- `package.json` - Added mongoose@^9.2.2 to dependencies
- `yarn.lock` - Updated with mongoose and transitive dependencies (bson, kareem, mquery, sift, etc.)

## Decisions Made

- **Mongoose over native driver:** Chosen for ODM convenience (schema + model layer used in phases 02+), TypeScript support built-in since v7, and widespread Next.js 13 community patterns
- **Fail-fast on missing env:** Module throws at import time rather than at first query — surfaces misconfiguration during dev startup, not mid-request
- **Global cache pattern:** `global.__mongoose_cache` is the standard approach for Next.js to survive hot-reload without exhausting connection pool
- **Event handlers outside dbConnect():** Registered once on `mongoose.connection` rather than inside the function to avoid duplicate handler registration on repeated calls

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors found in `TokenGeneratorFormNew.tsx`, `token.service.ts`, `ui.utils.ts`, and the Angular workspace — all unrelated to this plan's changes. No errors in `mongodb.ts`. Logged as out-of-scope per deviation boundary rules.

## User Setup Required

**Environment variable required before running the app:**

1. Copy `.env.local.example` to `.env.local`
2. Set `MONGODB_URI` to your MongoDB connection string
3. Example: `MONGODB_URI=mongodb://localhost:27017/atui-tokens`

Any API route that needs MongoDB should call:
```typescript
import dbConnect from '@/lib/mongodb';
// ...
await dbConnect();
```

## Next Phase Readiness

- MongoDB connection infrastructure complete — any API route can `import dbConnect from '@/lib/mongodb'` and call `await dbConnect()` to get a reused singleton connection
- Ready for Plan 02: TokenCollection Mongoose schema and CRUD API routes

## Self-Check: PASSED

- FOUND: src/lib/mongodb.ts
- FOUND: .env.local.example
- FOUND: 01-01-SUMMARY.md
- FOUND commit: 444c9d3 (chore: install mongoose and add env template)
- FOUND commit: c0e210e (feat: add MongoDB singleton connection module)

---
*Phase: 01-database-foundation*
*Completed: 2026-02-25*
