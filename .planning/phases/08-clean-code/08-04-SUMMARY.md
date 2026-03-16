---
phase: 08-clean-code
plan: "04"
subsystem: utils-srp
tags: [refactor, srp, utils, documentation]
dependency_graph:
  requires: ["08-03"]
  provides: [pure-utils-barrel, db-factory-docs, srp-suggestions]
  affects: [src/utils/token.utils.ts, src/components/tokens/TokenGeneratorForm.tsx, src/lib/db/get-repository.ts]
tech_stack:
  added: []
  patterns: [barrel-exports, pure-utils, service-separation]
key_files:
  created:
    - .planning/phases/08-clean-code/REFACTOR-SUGGESTIONS.md
  modified:
    - src/lib/db/get-repository.ts
    - src/utils/token.utils.ts
    - src/components/tokens/TokenGeneratorForm.tsx
decisions:
  - "parseTokenValue and countTokensRecursive extracted from TokenGeneratorForm to token.utils.ts — both are pure functions with no React/state dependencies"
  - "tokenUpdater.ts left out of barrel export — it is I/O-bound (file system), not a pure util; its service-layer placement is captured in REFACTOR-SUGGESTIONS"
  - "CollectionActions and OrgHeader fetch() calls left in place — extractable but not obviously broken; documented in REFACTOR-SUGGESTIONS as medium-priority future work"
metrics:
  duration: "~8 min"
  completed: "2026-03-16"
  tasks_completed: 2
  files_modified: 4
---

# Phase 8 Plan 04: SRP Pass and Utils Documentation Summary

SRP audit: extracted `parseTokenValue` and `countTokensRecursive` from `TokenGeneratorForm` into `token.utils.ts`; documented `get-repository.ts` as the canonical DB factory; captured 8 out-of-scope refactor ideas in `REFACTOR-SUGGESTIONS.md`.

## What Was Done

### Task 1: Document get-repository, verify utils purity

**get-repository.ts documentation updated:**
- Replaced generic factory comment with the canonical form specified in the plan
- Explicitly states: all API routes MUST use `getRepository()`, do NOT import providers directly
- Documents provider selection (db config), caching behavior, and restart requirement

**Utils purity verification:**
- `grep` for `from 'react'` or `from 'next/'` across all `src/utils/*.ts` → zero results
- All five utils files (`token.utils.ts`, `ui.utils.ts`, `validation.utils.ts`, `tree.utils.ts`, `tokenUpdater.ts`) are framework-agnostic
- Note: `tokenUpdater.ts` is excluded from the barrel (`src/utils/index.ts`) because it is I/O-bound (Node.js `fs`/`path`); it is a service masquerading as a util — captured in REFACTOR-SUGGESTIONS for future relocation

### Task 2: SRP pass on components

**Extracted to `src/utils/token.utils.ts`:**

| Function | Extracted From | Notes |
|----------|---------------|-------|
| `parseTokenValue` | `TokenGeneratorForm` (lines 831–859) | Pure type-to-value coercion; no state, no I/O |
| `countTokensRecursive` | `TokenGeneratorForm` `useEffect` (lines 397–402) | Pure recursive count across token group tree |

Both functions are now exported from the barrel (`src/utils/index.ts` via `export * from './token.utils'`) and imported in `TokenGeneratorForm.tsx`.

**Components with embedded logic NOT extracted (documented in REFACTOR-SUGGESTIONS):**

| Component | Logic left in place | Reason |
|-----------|---------------------|--------|
| `CollectionActions.tsx` | `fetch()` calls to DELETE/PUT `/api/collections/:id` | Tightly coupled to dialog state; extracting now would risk breakage with no immediate benefit |
| `OrgHeader.tsx` | `useDbStatus` hook with inline `fetch('/api/database/config')` | Already cleanly isolated in a custom hook; extraction to service is a polish step |
| `TokenGeneratorForm.tsx` | `handleSaveCollection`, `handleLoadCollection`, `handleDirectorySelect` | All tied to multiple local state variables; extraction requires dedicated hooks — medium-priority future work |

**REFACTOR-SUGGESTIONS.md created** with 8 entries covering the above plus `LayoutShell` route helpers and `tokenUpdater.ts` relocation.

## Deviations from Plan

None — plan executed exactly as written.

## Final Verification

- `npx tsc --noEmit`: zero errors
- `grep -rn "from 'react'\|from 'next/" src/utils/`: exit code 1 (zero matches)
- `cat .planning/phases/08-clean-code/REFACTOR-SUGGESTIONS.md`: file exists with 8 suggestions in markdown table

## Self-Check: PASSED

- [x] `src/lib/db/get-repository.ts` — canonical JSDoc present
- [x] `src/utils/token.utils.ts` — `parseTokenValue` and `countTokensRecursive` added
- [x] `src/components/tokens/TokenGeneratorForm.tsx` — imports updated, inline duplicates removed
- [x] `.planning/phases/08-clean-code/REFACTOR-SUGGESTIONS.md` — created with 8 entries
- [x] Commits: a813507 (Task 1), ae1b8d9 (Task 2)
- [x] tsc: zero errors
