---
phase: 03-app-layout-ux
plan: "01"
subsystem: ui

tags: [next.js, react, tailwind, lucide-react, sidebar, layout]

# Dependency graph
requires: []
provides:
  - Fixed 200px left sidebar (AppSidebar.tsx) with app name, collection selector, and three nav items
  - Root layout updated to sidebar + scrollable main-content flex shell
affects:
  - 03-02
  - 03-03
  - 03-04

# Tech tracking
tech-stack:
  added: []
  patterns: [self-contained sidebar with internal state, server layout + client sidebar pattern]

key-files:
  created:
    - src/components/AppSidebar.tsx
  modified:
    - src/app/layout.tsx

key-decisions:
  - "AppSidebar is fully self-contained: fetches /api/collections itself via useEffect, persists selectedId to localStorage (key: atui-selected-collection-id)"
  - "layout.tsx remains a server component: importing a client component (AppSidebar) into a server layout is valid in Next.js App Router"
  - "Sidebar width set via w-[200px] flex-shrink-0 wrapper div in layout; AppSidebar fills h-full"
  - "CollectionSelectorSidebar inline sub-component uses Tailwind descendant selectors to apply dark styling over the existing CollectionSelector without forking the component"

patterns-established:
  - "Self-contained sidebar pattern: sidebar manages its own data (collections) via useEffect + localStorage, pages manage their own data independently"
  - "Server layout + client sidebar: layout.tsx (server) imports AppSidebar (client) — App Router supports this natively"

requirements-completed: [LAYOUT-01, LAYOUT-02]

# Metrics
duration: 2min
completed: 2026-03-11
---

# Phase 3 Plan 01: Sidebar + Root Layout Shell Summary

**Persistent dark sidebar (bg-gray-900, 200px) with app name, collection selector, and 3 nav links added to every page via Next.js App Router root layout**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-11T08:36:49Z
- **Completed:** 2026-03-11T08:39:09Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created AppSidebar.tsx as a self-contained client component that fetches collections, persists selection to localStorage, and highlights the active route via usePathname
- Updated layout.tsx to wrap all pages in a `flex h-screen overflow-hidden` shell with a 200px fixed sidebar column and a `flex-1 overflow-y-auto` main content area
- No new TypeScript errors introduced — only pre-existing errors in token.service.ts and angular/stencil subprojects remain

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AppSidebar component** - `66b71df` (feat)
2. **Task 2: Update root layout to sidebar + main-content shell** - `485519b` (feat)

## Files Created/Modified

- `src/components/AppSidebar.tsx` - Self-contained sidebar: fetches /api/collections, localStorage selectedId, nav items (Tokens/Configuration/Settings) with Lucide icons, active highlighting via usePathname
- `src/app/layout.tsx` - Root layout with flex shell: 200px sidebar wrapper + flex-1 scrollable main

## Decisions Made

- AppSidebar is fully self-contained (fetches collections, manages selectedId via localStorage) so the server-side layout.tsx does not need to pass any props to it
- CollectionSelectorSidebar inline sub-component applies dark-themed styling via Tailwind descendant selectors rather than forking CollectionSelector — preserves single source of truth
- layout.tsx remains a server component; this works because Next.js App Router allows server components to render client components

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Sidebar shell is in place — all subsequent plans (03-02 through 03-04) can now add page content knowing the layout is established
- The `/configuration` and `/settings` routes do not yet exist; plans 03-02 and 03-03 will create them
- No blockers

---
*Phase: 03-app-layout-ux*
*Completed: 2026-03-11*
