---
phase: 06-collection-ux-improvements
plan: "01"
subsystem: ui
tags: [react, nextjs, tabs, url-routing, suspense, collection-management]

requires:
  - phase: 04-collection-management
    provides: CollectionSelector, CollectionActions components with full CRUD
  - phase: 05-export-style-dictionary-build-tokens
    provides: BuildTokensModal for token export

provides:
  - SharedCollectionHeader component (collection selector + Save As + New Collection + CollectionActions in one row)
  - Tabbed page layout with URL-based tab switching (?tab=view|generate)
  - Save As Collection feature (saves current view tokens as a new named collection)
  - handleNewCollection: clears to local + switches to generate tab
  - Suspense-wrapped HomeContent pattern for useSearchParams compatibility

affects:
  - 06-02 (Generate tab will replace placeholder; shared header is already in place)

tech-stack:
  added: []
  patterns:
    - "useSearchParams + useRouter in Suspense-wrapped child component (HomeContent pattern) for Next.js App Router compatibility"
    - "SharedCollectionHeader as pure presentation component — all state lives in parent page"
    - "CollectionSelector rendered as inline flex element inside SharedCollectionHeader row"

key-files:
  created:
    - src/components/SharedCollectionHeader.tsx
  modified:
    - src/app/page.tsx
    - src/components/CollectionSelector.tsx
    - src/components/CollectionActions.tsx

key-decisions:
  - "CollectionSelector wrapper div changed from full-width border-b container to inline flex div — enables embedding in SharedCollectionHeader horizontal row without layout breakage"
  - "CollectionActions mt-3 top margin removed — vertical margin inappropriate in flex row context (SharedCollectionHeader is the layout parent)"
  - "SharedCollectionHeader is pure presentation component — no internal state, all callbacks flow from page.tsx"
  - "Save As uses rawCollectionTokens (MongoDB) or tokenData (local flat) as token payload — flat format is valid token structure for Style Dictionary"
  - "switchTab uses router.push('/' | '/?tab=generate') — clean URL for default view tab"

patterns-established:
  - "Suspense wrapper for useSearchParams: export default Home wraps HomeContent in Suspense; all hooks + state in HomeContent"
  - "Shared header pattern: collection management controls always visible above tab switcher"

requirements-completed: [UX-01, UX-02, UX-03]

duration: 3min
completed: 2026-02-27
---

# Phase 6 Plan 01: Collection UX Improvements - Tabbed Layout Summary

**SharedCollectionHeader component + URL-based tabbed page layout with View and Generate tabs, Save As Collection feature, and Suspense-wrapped HomeContent for Next.js App Router useSearchParams compatibility**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T08:23:06Z
- **Completed:** 2026-02-27T08:26:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created SharedCollectionHeader.tsx: collection selector + Save As + New Collection + CollectionActions in a single horizontal flex row, no internal state
- Rewrote page.tsx: tabbed layout with ?tab=view|generate URL routing, Suspense wrapper for Next.js App Router useSearchParams compatibility
- Added Save As Collection feature: saves current MongoDB or local flat tokens as a new named collection (with 409/overwrite handling)
- Added handleNewCollection: clears selection to local + switches to generate tab

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SharedCollectionHeader component** - `68b052c` (feat)
2. **Task 2: Restructure page.tsx into tabbed layout with View tab** - `6b94c45` (feat)

## Files Created/Modified
- `src/components/SharedCollectionHeader.tsx` - New pure presentation component: collection selector + Save As + New Collection + CollectionActions in a horizontal flex row
- `src/app/page.tsx` - Rewrote into tabbed layout: Suspense/HomeContent pattern, URL-based tab switching, SharedCollectionHeader integration, Save As Collection feature
- `src/components/CollectionSelector.tsx` - Changed outer wrapper from full-width border-b container div to inline flex div for SharedCollectionHeader row embedding
- `src/components/CollectionActions.tsx` - Removed mt-3 top margin from root div; vertical margin no longer appropriate as component is now inside a flex row

## Decisions Made
- CollectionSelector wrapper redesigned from layout-owning (full-width, border-b, padding) to layout-agnostic (inline flex) — allows it to work inside both its old standalone context and the new SharedCollectionHeader flex row
- SharedCollectionHeader receives all callbacks from page.tsx; no internal state — follows plan spec exactly
- Save As logic: uses rawCollectionTokens for MongoDB-sourced data, falls back to tokenData (flat format) for Local Files — flat format is a valid SD token structure
- Suspense fallback matches existing loading spinner style (centered, blue border-b spinner)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CollectionSelector outer div breaking flex row layout**
- **Found during:** Task 1 (creating SharedCollectionHeader)
- **Issue:** CollectionSelector had `w-full bg-white border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8` outer div — a full-width layout container — which would break the SharedCollectionHeader horizontal flex row (the selector would occupy the full width)
- **Fix:** Changed outer div to `flex items-center` — layout-agnostic, works inline in flex row
- **Files modified:** src/components/CollectionSelector.tsx
- **Verification:** No TypeScript errors; component renders correctly as inline element
- **Committed in:** 68b052c (Task 1 commit)

**2. [Rule 1 - Bug] Fixed CollectionActions mt-3 top margin misaligned in flex row**
- **Found during:** Task 1 (creating SharedCollectionHeader)
- **Issue:** CollectionActions had `mt-3` on root div — vertical top margin designed for stacked layout. Inside a flex row this adds unintended vertical space
- **Fix:** Removed `mt-3` from root div class (changed `mt-3 flex gap-2` to `flex gap-2`)
- **Files modified:** src/components/CollectionActions.tsx
- **Verification:** No TypeScript errors; component aligns correctly in flex row
- **Committed in:** 68b052c (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug)
**Impact on plan:** Both fixes necessary for correct horizontal layout in SharedCollectionHeader. No scope creep.

## Issues Encountered
None — plan executed cleanly after layout bugs fixed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SharedCollectionHeader is in place above tab switcher — Plan 02 can use it without changes
- Generate tab placeholder is ready to be replaced by TokenGeneratorFormNew in Plan 02
- Save As Collection works from View tab; Plan 02 will wire it to generator form tokens
- URL-based tab switching is live: / = View, /?tab=generate = Generate

---
*Phase: 06-collection-ux-improvements*
*Completed: 2026-02-27*
