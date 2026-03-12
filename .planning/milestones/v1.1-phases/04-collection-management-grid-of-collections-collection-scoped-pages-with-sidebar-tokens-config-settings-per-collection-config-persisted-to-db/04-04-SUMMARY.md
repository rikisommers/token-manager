---
phase: 04-collection-management
plan: "04"
subsystem: ui
tags: [next.js, react, routing, sidebar, collections]

# Dependency graph
requires:
  - phase: 04-02
    provides: LayoutShell component that controls sidebar visibility per route

provides:
  - CollectionSidebar with app name link, Collections back link, collection name label, and 3 nav items
  - CollectionLayoutClient that fetches collection name and renders sidebar + main content
  - /collections/[id]/layout.tsx — server component layout for all collection-scoped routes
  - /collections/[id]/tokens/page.tsx — Tokens page scoped to a collection
  - /collections/[id]/config/page.tsx — Config page with BuildTokensPanel scoped to a collection
  - Root sidebar suppressed for all /collections/* routes via LayoutShell update

affects: [04-05, 04-06, collection-settings-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CollectionLayoutClient pattern — client component that fetches collection name and wraps children with sidebar + main layout
    - Collection-scoped route layout — server layout delegates to client component for data fetching
    - startsWith('/collections') check in LayoutShell to suppress root sidebar for all collection-scoped routes

key-files:
  created:
    - src/components/CollectionSidebar.tsx
    - src/components/CollectionLayoutClient.tsx
    - src/app/collections/[id]/layout.tsx
    - src/app/collections/[id]/tokens/page.tsx
    - src/app/collections/[id]/config/page.tsx
  modified:
    - src/components/LayoutShell.tsx

key-decisions:
  - "LayoutShell updated from pathname === '/collections' to pathname.startsWith('/collections') — collection-scoped routes provide their own sidebar via CollectionLayoutClient"
  - "CollectionLayoutClient is a 'use client' component that fetches collection name — keeps layout.tsx as a clean server component"
  - "CollectionSidebar has two distinct back links to /collections: app name at top and explicit Collections chevron link below it"

patterns-established:
  - "Collection-scoped pages use params.id directly (no localStorage) — clean URL-driven data scoping"
  - "Both Tokens and Config pages fetch collection data via GET /api/collections/[id] on mount"

requirements-completed: [COL-03, COL-08]

# Metrics
duration: 15min
completed: 2026-03-11
---

# Phase 4 Plan 04: Collection-Scoped Layout and Pages Summary

**Collection-scoped routing shell with dedicated CollectionSidebar (app name + Collections back link + 3 nav items), and Tokens/Config pages scoped to collection ID via URL params**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-11T11:48:42Z
- **Completed:** 2026-03-11T12:03:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created CollectionSidebar with two distinct ways back to /collections (app name link + explicit Collections link), collection name label, and 3 nav items with active highlighting
- Created CollectionLayoutClient that fetches collection name on mount and renders sidebar + main content area
- Created /collections/[id]/layout.tsx server component that delegates to CollectionLayoutClient
- Updated LayoutShell to suppress root AppSidebar for all /collections/* routes (not just /collections)
- Created Tokens and Config pages scoped to collection ID from URL params

## Task Commits

Each task was committed atomically:

1. **Task 1: CollectionSidebar, CollectionLayoutClient, and collection-scoped layout** - `93e956c` (feat)
2. **Task 2: Collection-scoped Tokens and Config pages** - `2bf103b` (feat)

**Plan metadata:** `a020f56` (docs: complete plan)

## Files Created/Modified

- `src/components/CollectionSidebar.tsx` - Sidebar with app name link, Collections back link, collection name, 3 nav items with active state
- `src/components/CollectionLayoutClient.tsx` - Client component fetching collection name, rendering sidebar + main layout
- `src/app/collections/[id]/layout.tsx` - Server layout component wrapping CollectionLayoutClient
- `src/app/collections/[id]/tokens/page.tsx` - Tokens page with collection name in heading and token table
- `src/app/collections/[id]/config/page.tsx` - Config page with two-column layout and BuildTokensPanel
- `src/components/LayoutShell.tsx` - Updated condition from `=== '/collections'` to `.startsWith('/collections')`

## Decisions Made

- LayoutShell updated to `pathname.startsWith('/collections')` — collection-scoped routes (/collections/[id]/*) provide their own sidebar; the root sidebar must not appear on these routes
- CollectionLayoutClient stays 'use client' so the layout.tsx server component can export metadata in future if needed
- Both Tokens and Config pages use `params.id` directly — no localStorage dependency, clean URL-driven scoping

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Next.js version is 13 (not 15), so `params` is synchronous `{ id: string }` — not a Promise. Initial layout.tsx was written for Next.js 15's async params pattern and corrected before commit (Rule 1 auto-fix, same task commit).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Collection-scoped layout shell is complete and ready for Phase 4 Plan 05 (Settings page) and subsequent plans
- /collections/[id]/tokens shows CollectionSidebar + tokens table with collection name heading
- /collections/[id]/config shows CollectionSidebar + BuildTokensPanel two-column layout
- Root sidebar fully suppressed for all /collections/* routes

---
*Phase: 04-collection-management*
*Completed: 2026-03-11*
