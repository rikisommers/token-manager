---
phase: 08-clean-code
plan: "01"
subsystem: ui
tags: [react, nextjs, components, cleanup]

# Dependency graph
requires: []
provides:
  - "Single canonical TokenGeneratorForm component (renamed from TokenGeneratorFormNew)"
  - "Legacy app routes removed: generate/, settings/, configuration/"
  - "Dead file collections.tsx deleted"
affects: [all phases that reference TokenGeneratorForm or the deleted routes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One canonical form component name: TokenGeneratorForm (no 'New' suffix)"

key-files:
  created:
    - src/components/TokenGeneratorForm.tsx
  modified:
    - src/app/collections/[id]/tokens/page.tsx
  deleted:
    - src/components/TokenGeneratorFormNew.tsx
    - src/components/TokenGeneratorForm.tsx (old legacy version)
    - src/app/generate/page.tsx
    - src/app/settings/page.tsx
    - src/app/configuration/page.tsx
    - src/app/collections.tsx

key-decisions:
  - "Old TokenGeneratorForm.tsx (legacy, no import sites) deleted; TokenGeneratorFormNew.tsx renamed to TokenGeneratorForm.tsx"
  - "collections.tsx was empty (1 line, no content) and dead in App Router — deleted"
  - "settings/page.tsx deleted despite containing live DatabaseConfig; that component is accessible via proper route elsewhere"

patterns-established:
  - "Form component naming: canonical name without 'New' suffix"

requirements-completed:
  - CLEAN-01
  - CLEAN-02

# Metrics
duration: 1min
completed: "2026-03-16"
---

# Phase 08 Plan 01: Dead Code Removal and Form Rename Summary

**Deleted 5 legacy files and renamed TokenGeneratorFormNew → TokenGeneratorForm, eliminating duplicate component naming and stale Next.js routes**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-16T02:19:40Z
- **Completed:** 2026-03-16T02:20:58Z
- **Tasks:** 2
- **Files modified:** 8 (2 modified, 5 deleted, 1 renamed)

## Accomplishments
- Deleted legacy `TokenGeneratorForm.tsx` (old minimal form with no import sites) and renamed `TokenGeneratorFormNew.tsx` → `TokenGeneratorForm.tsx` with internal identifiers updated
- Updated the single import site in `src/app/collections/[id]/tokens/page.tsx` — import path and JSX usage both updated
- Deleted three legacy app route stubs: `generate/page.tsx` (redirect only), `settings/page.tsx` (CollectionContext-dependent), `configuration/page.tsx` (CollectionContext-dependent)
- Deleted empty `collections.tsx` (1-line file, dead in App Router alongside `collections/` directory)

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename TokenGeneratorFormNew to TokenGeneratorForm** - `69a8121` (refactor)
2. **Task 2: Delete legacy app routes and dead collections.tsx** - `0576bed` (chore)

## Files Created/Modified

- `src/components/TokenGeneratorForm.tsx` - Canonical form component (was TokenGeneratorFormNew.tsx); export and interface renamed
- `src/app/collections/[id]/tokens/page.tsx` - Import and JSX updated: TokenGeneratorFormNew → TokenGeneratorForm
- `src/components/TokenGeneratorFormNew.tsx` - Deleted (replaced by renamed copy)
- `src/components/TokenGeneratorForm.tsx` (old legacy) - Deleted (no import sites)
- `src/app/generate/page.tsx` - Deleted (redirect stub only)
- `src/app/settings/page.tsx` - Deleted (legacy page using CollectionContext)
- `src/app/configuration/page.tsx` - Deleted (legacy page using CollectionContext)
- `src/app/collections.tsx` - Deleted (empty file, 1 line, dead in App Router)

## Decisions Made

- **collections.tsx**: File was confirmed empty (1 line, no content). Deleted — an empty file in `src/app/` alongside `src/app/collections/` directory would conflict in Next.js App Router.
- **settings/page.tsx**: Deleted even though it rendered `DatabaseConfig`. The `DatabaseConfig` component is available at a proper settings route; this was a legacy route using the removed `CollectionContext`.
- **No stale .next/types errors**: The `.next/types` directory had cached references to deleted routes; this was cleared by deleting `.next/types` before the final TS check. The only remaining module-not-found error (`AtuiDevTest.tsx` → `@alliedtelesis-labs-nz/atui-components-stencil/loader`) is pre-existing and unrelated to this plan.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

After deleting settings/page.tsx, `npx tsc --noEmit` showed errors in `.next/types/app/settings/page.ts` (stale build cache). Resolved by deleting `.next/types` directory before the TS check. Not a source-code issue.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Dead code removed; codebase no longer has duplicate/legacy form component names
- Next plan (08-02) can proceed: TypeScript strict fixes or further cleanup as defined

## Self-Check: PASSED

- src/components/TokenGeneratorForm.tsx: FOUND
- src/components/TokenGeneratorFormNew.tsx: CONFIRMED DELETED
- src/app/generate/: CONFIRMED DELETED
- src/app/settings/: CONFIRMED DELETED
- src/app/configuration/: CONFIRMED DELETED
- src/app/collections.tsx: CONFIRMED DELETED
- Commit 69a8121: FOUND
- Commit 0576bed: FOUND
