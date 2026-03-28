---
phase: 19-rbac-and-permissions-context
plan: "04"
subsystem: auth
tags: [react-context, permissions, next-auth, rbac, usePathname]

# Dependency graph
requires:
  - phase: 19-01
    provides: /api/collections/[id]/permissions/me endpoint returning effective role
  - phase: 16-rbac-foundation
    provides: canPerform(role, Action) from src/lib/auth/permissions.ts
  - phase: 17-auth-ui-and-providers
    provides: AuthProviders.tsx wrapping PermissionsProvider in session tree
provides:
  - PermissionsProvider — collection-aware context that fetches effective role per route
  - usePermissions() — named boolean API (canEdit, canCreate, isAdmin, canGitHub, canFigma)
  - PermissionsContextValue — exported TypeScript interface for typed consumers
affects:
  - Any component that will call usePermissions() to gate UI actions (Phase 20+)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "usePathname() to extract collection ID in providers above the collection context tree"
    - "cancelled flag pattern for cleanup of in-flight fetch on rapid route changes"
    - "orgRole vs effectiveRole split — org-level permissions use orgRole; collection-scoped use effectiveRole"
    - "Admin short-circuit before fetch — canPerform('Admin', action) is always true; skip the network round-trip"

key-files:
  created: []
  modified:
    - src/context/PermissionsContext.tsx

key-decisions:
  - "canCreate uses orgRole (not effectiveRole) — creating a collection is org-level permission, not collection-scoped"
  - "isAdmin uses orgRole === 'Admin' — org-level Admin status never depends on a collection grant"
  - "Admin org role sets effectiveRole to 'Admin' and returns without fetching /me — Admin bypasses all collection-level checks"
  - "All booleans default to false while status === 'loading' — safe denial during session initialization"
  - "PermissionsContextValue interface is exported — enables typed consumers across the codebase"

patterns-established:
  - "Named boolean API: usePermissions() returns { canEdit, canCreate, isAdmin, canGitHub, canFigma } — no raw role or canPerform in context value"
  - "Route-scoped permission fetch: PermissionsProvider reads pathname to determine which collection to query"

requirements-completed: [PERM-06]

# Metrics
duration: 1min
completed: 2026-03-28
---

# Phase 19 Plan 04: PermissionsContext Rewrite Summary

**Collection-aware PermissionsContext rewritten from scaffold { role, canPerform } to named boolean API { canEdit, canCreate, isAdmin, canGitHub, canFigma } with usePathname()-based collection detection and /permissions/me fetch**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-28T09:25:30Z
- **Completed:** 2026-03-28T09:26:28Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Rewrote PermissionsContext.tsx with collection-aware named boolean API replacing the Phase 17 scaffold
- Implemented usePathname() extraction of collection ID for targeted /api/collections/[id]/permissions/me fetch
- Admin org role short-circuits to bypass fetch (performance and correctness — Admin always has full access)
- Cancelled flag prevents stale role state when navigating rapidly between collections
- All booleans default to false during session loading — safe deny-by-default

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite PermissionsContext.tsx with collection-aware named booleans** - `0326b55` (feat)

## Files Created/Modified

- `src/context/PermissionsContext.tsx` — Fully rewritten: PermissionsProvider, usePermissions(), PermissionsContextValue interface with 5 named boolean fields; usePathname() + fetch /permissions/me for collection-scoped permissions

## Decisions Made

- `canCreate` uses `orgRole` — creating collections is org-level (not tied to a specific collection)
- `isAdmin` is `orgRole === 'Admin'` — Admin is the org-wide elevated role, independent of any collection grant
- Admin short-circuit skips the `/permissions/me` fetch entirely — Admin bypasses all collection-level checks per the Phase 19 architecture decision
- `PermissionsContextValue` is now exported (previously unexported `interface`) — required for typed consumers in Phase 20+

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — TypeScript compiled clean on first pass, no import or type resolution issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `usePermissions()` is now fully functional and ready for consumption in Phase 20 components
- Any component in the React tree below `AuthProviders` can call `usePermissions()` and receive correct boolean values
- AuthProviders.tsx requires no changes — `PermissionsProvider` export name unchanged

---
*Phase: 19-rbac-and-permissions-context*
*Completed: 2026-03-28*
