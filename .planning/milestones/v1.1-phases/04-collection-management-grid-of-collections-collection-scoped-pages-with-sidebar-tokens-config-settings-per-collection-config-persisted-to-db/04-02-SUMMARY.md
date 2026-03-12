---
phase: 04-collection-management
plan: "02"
subsystem: ui
tags: [nextjs, layout, routing, tailwind, app-router]

# Dependency graph
requires:
  - phase: 03-update-app-layout-to-improve-ux
    provides: AppSidebar, AppHeader, CollectionProvider, root layout.tsx shell
provides:
  - Redirect from / to /collections
  - Full-width sidebar-free layout for /collections grid page
  - LayoutShell client component with pathname-conditional sidebar rendering
  - src/app/collections/layout.tsx wrapping collections grid
affects:
  - 04-01-collections-grid
  - 04-03-collection-scoped-pages
  - 04-04-collection-layout

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server component redirect via next/navigation redirect()
    - Client LayoutShell pattern — usePathname to conditionally branch layout rendering
    - CollectionProvider hoisted into LayoutShell to wrap both layout paths

key-files:
  created:
    - src/components/LayoutShell.tsx
    - src/app/collections/layout.tsx
    - src/app/collections/page.tsx
  modified:
    - src/app/layout.tsx
    - src/app/page.tsx

key-decisions:
  - "LayoutShell is a 'use client' component in src/components/ — root layout.tsx stays a clean server component"
  - "CollectionProvider moved into LayoutShell so it wraps both the grid path and the sidebar shell path"
  - "isCollectionsGrid check uses strict equality (pathname === '/collections') — collection-scoped routes like /collections/[id] will still get the sidebar from their own layout"
  - "Added placeholder src/app/collections/page.tsx to make /collections renderable before 04-01 grid implementation"

patterns-established:
  - "Pathname-conditional layout: usePathname in client wrapper, strict route equality check"
  - "Server layout.tsx delegates all client interactivity to a single LayoutShell component"

requirements-completed:
  - COL-02
  - COL-03

# Metrics
duration: 8min
completed: 2026-03-11
---

# Phase 4 Plan 02: Layout Restructure Summary

**Next.js App Router layout restructured with LayoutShell client component — / redirects to /collections, which renders full-width without sidebar, while all other routes retain the sidebar+header shell**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-11T11:43:06Z
- **Completed:** 2026-03-11T11:51:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- / now immediately redirects to /collections via Next.js server-side redirect()
- Created src/app/collections/layout.tsx as a clean full-width shell (no sidebar, no header)
- Extracted LayoutShell client component that reads pathname and conditionally renders sidebar+header or bare children
- Root layout.tsx simplified to a pure server component delegating to LayoutShell
- CollectionProvider hoisted into LayoutShell to wrap all routes including the grid

## Task Commits

Each task was committed atomically:

1. **Task 1: Redirect home page and create collections route layout** - `53fe9d6` (feat)
2. **Task 2: Make root layout sidebar + header conditional** - `d8d9685` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/app/page.tsx` - Replaced with server component redirect to /collections
- `src/app/collections/layout.tsx` - Full-width no-sidebar layout for collections grid
- `src/app/collections/page.tsx` - Placeholder page so /collections renders before 04-01 grid
- `src/components/LayoutShell.tsx` - 'use client' component — usePathname branch for /collections vs other routes
- `src/app/layout.tsx` - Simplified to server component rendering <LayoutShell>

## Decisions Made

- LayoutShell is a `use client` component extracted to `src/components/` — root layout.tsx stays a server component (required for Next.js metadata export)
- CollectionProvider moved into LayoutShell so it wraps both the grid path and the sidebar shell path
- `pathname === '/collections'` uses strict equality — collection-scoped routes (`/collections/[id]`) still get the sidebar via their own layout in plan 04-04
- Added placeholder `page.tsx` so the /collections route is renderable now; the real grid UI ships in plan 04-01

## Deviations from Plan

None - plan executed exactly as written. One minor addition: created `src/app/collections/page.tsx` as a minimal placeholder so the /collections route has a renderable page immediately. This is not architecturally significant.

## Issues Encountered

None — TypeScript compiled cleanly with zero new errors. All pre-existing errors are in separate subprojects (token-manager-angular, token-manager-vite) and were not affected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Layout restructure complete. /collections is ready to receive the grid UI (04-01)
- LayoutShell's `isCollectionsGrid` check is in place — plan 04-04 can add /collections/[id] layout without touching LayoutShell
- CollectionProvider wraps all routes including /collections grid

---
*Phase: 04-collection-management*
*Completed: 2026-03-11*

## Self-Check: PASSED

- src/components/LayoutShell.tsx: FOUND
- src/app/collections/layout.tsx: FOUND
- src/app/page.tsx (contains redirect): FOUND
- Commit 53fe9d6: FOUND
- Commit d8d9685: FOUND
