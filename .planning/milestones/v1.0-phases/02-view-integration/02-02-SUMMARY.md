---
phase: 02-view-integration
plan: 02
subsystem: ui
tags: [react, nextjs, mongodb, abortcontroller, localstorage, design-tokens]

# Dependency graph
requires:
  - phase: 02-01
    provides: GET /api/collections listing all TokenCollection documents
  - phase: 01-02
    provides: TokenCollection mongoose model with tokens field (Schema.Types.Mixed)

provides:
  - CollectionSelector.tsx — native select with Local/Database optgroup structure
  - GET /api/collections/[id] — returns full token document by MongoDB ObjectId
  - page.tsx — wired selector, flattenMongoTokens helper, spinner overlay, error toasts, localStorage persistence

affects: [03-form-integration, 04-collection-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - AbortController ref for cancelling in-flight fetch on selection change
    - flattenMongoTokens() helper for converting W3C Design Token JSON to TokenGroup[] shape
    - localStorage persistence with live fallback validation against collections list
    - Spinner overlay pattern using relative/absolute positioning with z-index

key-files:
  created:
    - src/components/CollectionSelector.tsx
    - src/app/api/collections/[id]/route.ts
  modified:
    - src/app/page.tsx

key-decisions:
  - "flattenMongoTokens() inline in page.tsx (not a new file) — keeps transformation collocated with the only consumer"
  - "Select stays enabled during loading — user can cancel by switching away; AbortController handles cancellation"
  - "localStorage fallback validated against live collections list on mount — stale ids silently resolved to local"
  - "GET /api/collections/[id] uses .lean() to return plain JSON-serialisable object without Mongoose Document overhead"

patterns-established:
  - "AbortController pattern: cancel previous ref, create new ref, pass signal to fetch — all inside handleSelectionChange"
  - "flattenMongoTokens: skip $-prefixed keys except $value/$type; recurse into nested objects; top-level key = section name"

requirements-completed: [VIEW-01, VIEW-02, VIEW-03]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 2 Plan 02: View Integration Summary

**Native collection selector on View Tokens page with AbortController cancellation, localStorage persistence, spinner overlay, and W3C token flattening for MongoDB collections**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T10:37:03Z
- **Completed:** 2026-02-25T10:38:53Z
- **Tasks:** 2 auto tasks completed (Task 3 is checkpoint — awaiting human verification)
- **Files modified:** 3

## Accomplishments
- CollectionSelector.tsx: native `<select>` with Local/Database optgroup, enabled during loading
- GET /api/collections/[id] route: returns full token document or 404 for unknown id
- page.tsx: full selector integration with AbortController, flattenMongoTokens(), spinner overlay, error toasts, localStorage

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CollectionSelector component** - `8892459` (feat)
2. **Task 2: Integrate selector into View Tokens page** - `be90953` (feat)
3. **Task 3: Human verification** - awaiting checkpoint

## Files Created/Modified
- `src/components/CollectionSelector.tsx` - Named export; native select with optgroup for Local/Database groups; enabled during loading
- `src/app/api/collections/[id]/route.ts` - GET handler; findById.lean(); 404 if not found; 500 on error
- `src/app/page.tsx` - Rewired with CollectionSelector, AbortController, flattenMongoTokens, spinner overlay, toast, localStorage persistence

## Decisions Made
- `flattenMongoTokens()` lives inline in `page.tsx` — only consumer, no need for separate utility file
- Select stays enabled during token loading so users can cancel by switching away
- localStorage id validated on mount against live collections; silently falls back to 'local' if stale
- `.lean()` on findById for API route — same pattern as collections list route (plain JSON, no Mongoose overhead)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — TypeScript errors from other pre-existing files (token-manager-angular, token-manager-stencil, TokenGeneratorFormNew) were not caused by this plan's changes. No errors in any plan-modified files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All Phase 2 success criteria implementable: selector lists MongoDB collections, selecting renders tokens in TokenTable, Local Files still works
- Task 3 checkpoint pending human browser verification
- Phase 3 (form integration) can proceed once Task 3 approved

---
*Phase: 02-view-integration*
*Completed: 2026-02-25*
