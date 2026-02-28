---
phase: 01-database-foundation
plan: 03
subsystem: database
tags: [mongodb, mongoose, typescript, seed, dotenv, ts-node]

# Dependency graph
requires:
  - src/lib/mongodb.ts (from plan 01)
  - src/lib/db/models/TokenCollection.ts (from plan 02)
  - src/types/collection.types.ts (from plan 02)
provides:
  - scripts/seed.ts: idempotent one-time seed script that loads tokens/ JSON files into MongoDB
  - tsconfig.scripts.json: CommonJS tsconfig for running TypeScript scripts via ts-node
  - .planning/ANGULAR_PARITY.md: Phase 1 artifact contracts for Angular port team
affects:
  - 02-token-collection-api
  - 03-generator-form-integration
  - 04-view-page-and-crud

# Tech tracking
tech-stack:
  added: [ts-node@10.9.2, dotenv@17.3.1]
  patterns:
    - "ts-node --transpile-only for scripts (avoids full type-check, resolves path alias issue with bundler moduleResolution)"
    - "DOTENV_CONFIG_PATH + -r dotenv/config pattern for loading .env.local in Node scripts"
    - "Separate tsconfig.scripts.json (CommonJS/node) for running scripts outside Next.js bundler context"

key-files:
  created:
    - scripts/seed.ts
    - tsconfig.scripts.json
    - .planning/ANGULAR_PARITY.md
  modified:
    - package.json

key-decisions:
  - "--transpile-only flag avoids ts-node failing on bundler moduleResolution from main tsconfig; import type annotations are erased so path aliases do not cause runtime errors"
  - "tsconfig.scripts.json extends main tsconfig with CommonJS module + node resolution override; keeps scripts in separate compilation context"
  - "DOTENV_CONFIG_PATH=.env.local with -r dotenv/config loads .env.local before any module import (static imports are hoisted, so inline dotenv.config() would run too late)"
  - "Collection name derivation uses path.relative + regex: slashes become ' / ' giving readable default names users can rename in Phase 4"

patterns-established:
  - "Script tsconfig: Use tsconfig.scripts.json (CommonJS + node) for any Node.js scripts that import from src/"
  - "Seed pattern: walkDir() + findOne() idempotency check before TokenCollection.create()"

requirements-completed: [SEED-01, PARITY-01]

# Metrics
duration: 5min
completed: 2026-02-25
---

# Phase 1 Plan 03: Seed Script and Angular Parity Summary

**Idempotent seed script (ts-node + dotenv) loads tokens/ JSON into MongoDB TokenCollection documents; Angular parity doc covers all Phase 1 schema, types, routes, and patterns**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-25T09:20:03Z
- **Completed:** 2026-02-25T09:24:51Z
- **Tasks:** 2
- **Files modified:** 4 (scripts/seed.ts, tsconfig.scripts.json, package.json, .planning/ANGULAR_PARITY.md)

## Accomplishments

- Created `scripts/seed.ts` (63 lines): recursively walks `tokens/` directory, derives collection names from relative paths, inserts TokenCollection documents, skips existing entries (idempotent), logs `[INSERT]` / `[SKIP]` per file, exits cleanly
- Added `yarn seed` npm script using ts-node with `--transpile-only` and `-r dotenv/config` registers
- Created `tsconfig.scripts.json` for CommonJS/node module resolution (required for ts-node compatibility with Next.js's bundler-targeting main tsconfig)
- Installed `ts-node@10.9.2` and `dotenv@17.3.1` as dev dependencies
- Created `.planning/ANGULAR_PARITY.md` (166 lines) covering: MongoDB schema field table, TypeScript interface source, planned API routes table (5 endpoints), seed behavior and name derivation examples, connection singleton pattern

## Seed Script: Collection Names Derived from tokens/ Directory

Files found and collection names that will be seeded:

| File (relative to tokens/) | Derived collection name |
|-----------------------------|------------------------|
| `globals/border-color.json` | `globals / border-color` |
| `globals/border-radius.json` | `globals / border-radius` |
| `globals/breakpoint.json` | `globals / breakpoint` |
| `globals/color-base.json` | `globals / color-base` |
| `globals/color-gray.json` | `globals / color-gray` |
| `globals/color-state.json` | `globals / color-state` |
| `globals/color-surface.json` | `globals / color-surface` |
| `globals/deprecated.json` | `globals / deprecated` |
| `globals/font-family.json` | `globals / font-family` |
| `globals/font-size.json` | `globals / font-size` |
| `globals/font-weight.json` | `globals / font-weight` |
| `globals/height.json` | `globals / height` |
| `globals/input.json` | `globals / input` |
| `globals/line-height.json` | `globals / line-height` |
| `globals/shadow.json` | `globals / shadow` |
| `globals/text-color.json` | `globals / text-color` |
| `globals/transition.json` | `globals / transition` |
| `globals/width.json` | `globals / width` |
| `globals/z-index.json` | `globals / z-index` |
| `palette/color-palette.json` | `palette / color-palette` |
| `brands/brand1/color.json` | `brands / brand1 / color` |
| `brands/brand2/color.json` | `brands / brand2 / color` |

Total: 22 collections to seed on first run.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the tokens seed script** - `647893f` (feat)
2. **Task 2: Create Angular parity tracking document** - `f4ce1e2` (docs)

## Files Created/Modified

- `scripts/seed.ts` - Idempotent seed script; walkDir + deriveCollectionName + findOne check + TokenCollection.create
- `tsconfig.scripts.json` - Separate ts-node-compatible tsconfig (CommonJS + node moduleResolution)
- `package.json` - Added `"seed"` npm script; ts-node and dotenv appear in devDependencies
- `yarn.lock` - Updated with ts-node@10.9.2, dotenv@17.3.1, and transitive dependencies
- `.planning/ANGULAR_PARITY.md` - Phase 1 Angular parity contracts

## Decisions Made

- **ts-node `--transpile-only` flag:** The main `tsconfig.json` uses `moduleResolution: "bundler"` which ts-node doesn't support. Using `--transpile-only` skips full type checking and resolves this — TypeScript `import type` statements (including the `@/` path alias in `TokenCollection.ts`) are erased at transpile time, producing no runtime errors.
- **Separate `tsconfig.scripts.json`:** Extends main tsconfig but overrides `module: "CommonJS"` and `moduleResolution: "node"`. This is the correct approach for any Node.js script that imports from `src/` in a Next.js project.
- **`DOTENV_CONFIG_PATH` + `-r dotenv/config`:** Static ES module `import` declarations are hoisted, so calling `dotenv.config()` inline in the script body would run after Mongoose imports (which check `MONGODB_URI` at module load time). Using the register approach via `-r` ensures dotenv runs before any imports.
- **Name derivation with ` / ` separator:** Path separators become ` / ` (space-slash-space) giving readable default names like `globals / color-base`. Users can rename these in Phase 4.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created tsconfig.scripts.json for ts-node compatibility**
- **Found during:** Task 1 (seed script verification)
- **Issue:** Main `tsconfig.json` uses `moduleResolution: "bundler"` (Next.js 13 default), which ts-node@10 does not understand. Would cause ts-node to fail when running the seed script.
- **Fix:** Created `tsconfig.scripts.json` that extends main tsconfig but overrides `module: "CommonJS"` and `moduleResolution: "node"`. Seed npm script uses `--project tsconfig.scripts.json`.
- **Files modified:** `tsconfig.scripts.json` (created), `package.json` (seed script flags)
- **Verification:** `npx tsc --noEmit --project tsconfig.scripts.json` shows only pre-existing errors (token.service.ts, ui.utils.ts) — no errors in seed.ts
- **Committed in:** `647893f` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Required for ts-node to run the seed script. No scope creep.

## Issues Encountered

Pre-existing TypeScript errors in `TokenGeneratorFormNew.tsx`, `token.service.ts`, `ui.utils.ts`, and the Angular workspace — unchanged from Plans 01 and 02, out-of-scope per deviation boundary rules.

## User Setup Required

To run the seed:

1. Copy `.env.local.example` to `.env.local`
2. Set `MONGODB_URI` to your MongoDB connection string
3. Run: `yarn seed`
4. Confirm output shows `[INSERT]` lines for each of the 22 token files
5. Run again to verify `[SKIP]` lines (idempotency)

## Phase 1 Success Criteria — All Met

| Requirement | Status | Delivered by |
|-------------|--------|--------------|
| DB-01: MongoDB connection singleton | Done | Plan 01 |
| DB-02: Fail-fast on missing MONGODB_URI | Done | Plan 01 |
| DB-03: TokenCollection schema + TypeScript types | Done | Plan 02 |
| SEED-01: Idempotent seed script | Done | Plan 03 (this plan) |
| PARITY-01: Angular parity tracking document | Done | Plan 03 (this plan) |

Phase 1 is complete. The app can connect to MongoDB, the schema is defined with full TypeScript types, the seed script populates default collections on first run, and the Angular parity document gives the port team clear contracts.

## Next Phase Readiness

- `scripts/seed.ts` is ready to run after MONGODB_URI is configured in `.env.local`
- Phase 2 (Token Collection API) can import `TokenCollection` from `@/lib/db/models/TokenCollection` and `dbConnect` from `@/lib/mongodb`
- Planned API routes are documented in `.planning/ANGULAR_PARITY.md` and ready for implementation in Phase 2

## Self-Check: PASSED

- FOUND: scripts/seed.ts
- FOUND: tsconfig.scripts.json
- FOUND: .planning/ANGULAR_PARITY.md
- FOUND: commit 647893f (feat(01-03): add idempotent tokens seed script)
- FOUND: commit f4ce1e2 (docs(01-03): create Angular parity tracking document)
- FOUND: "seed" script in package.json
- FOUND: TokenCollection in .planning/ANGULAR_PARITY.md
- seed.ts line count: 63 (minimum 40 required — PASSED)
- seed.ts imports dbConnect from '../src/lib/mongodb' — PASSED
- seed.ts imports TokenCollection from '../src/lib/db/models/TokenCollection' — PASSED

---
*Phase: 01-database-foundation*
*Completed: 2026-02-25*
