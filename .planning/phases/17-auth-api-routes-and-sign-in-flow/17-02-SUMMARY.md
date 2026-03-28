---
phase: 17-auth-api-routes-and-sign-in-flow
plan: 02
subsystem: auth
tags: [next-auth, react-context, session, permissions, nextjs-app-router]

# Dependency graph
requires:
  - phase: 16-auth-infrastructure-and-security-baseline
    provides: permissions.ts (Role, ActionType, canPerform), next-auth.d.ts session augmentation, authOptions with JWT callbacks
provides:
  - PermissionsProvider component with role and canPerform derived from useSession()
  - usePermissions() hook returning { role, canPerform } for any client component
  - AuthProviders wrapper nesting SessionProvider > PermissionsProvider
  - layout.tsx wired with AuthProviders so session is available app-wide
affects: [phase-18-protected-api-routes, phase-19-per-collection-permissions, phase-20-user-menu-and-sign-in-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [SessionProvider-as-outer-boundary, PermissionsContext-scaffold-for-expansion]

key-files:
  created:
    - src/context/PermissionsContext.tsx
    - src/components/providers/AuthProviders.tsx
  modified:
    - src/app/layout.tsx

key-decisions:
  - "AuthProviders is a 'use client' component that acts as the client boundary in the Server Component layout — valid Next.js App Router pattern"
  - "SessionProvider must be outer wrapper; PermissionsProvider inner — PermissionsProvider calls useSession() so it must be a descendant of SessionProvider"
  - "PermissionsContext scaffold designed for Phase 19 expansion: hook API surface (usePermissions returning { role, canPerform }) stays identical when per-collection overrides are added"
  - "Default context value canPerform: () => false ensures safe deny-all outside provider tree"
  - "Toaster stays outside AuthProviders — does not need session context, placement intentional"

patterns-established:
  - "Provider nesting: SessionProvider (outer) > PermissionsProvider (inner) > children"
  - "Context scaffold pattern: minimal implementation now, Phase 19 expands without layout changes"
  - "layout.tsx remains Server Component; client boundary pushed to AuthProviders wrapper"

requirements-completed: [AUTH-03]

# Metrics
duration: 5min
completed: 2026-03-28
---

# Phase 17 Plan 02: Auth Providers Wiring Summary

**SessionProvider and PermissionsProvider wired into the app via AuthProviders wrapper, making useSession() and usePermissions() available to all client components with correct provider nesting order**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-28T06:28:10Z
- **Completed:** 2026-03-28T06:33:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `PermissionsContext.tsx` — minimal scaffold with `PermissionsProvider` and `usePermissions()` hook; derives role from `useSession()` and delegates to `canPerform()` from Phase 16 permissions.ts
- Created `AuthProviders.tsx` — client boundary wrapper with correct nesting: `SessionProvider` (outer) > `PermissionsProvider` (inner) > children
- Wired `AuthProviders` into `layout.tsx` so session context is available app-wide; `layout.tsx` remains a Server Component (no 'use client' added)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PermissionsContext with PermissionsProvider and usePermissions hook** - `6a616eb` (feat)
2. **Task 2: Create AuthProviders wrapper and wire into layout.tsx** - `ec1a22b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/context/PermissionsContext.tsx` - PermissionsProvider + usePermissions() hook; 'use client'; derives role from session, delegates permission checks to canPerform()
- `src/components/providers/AuthProviders.tsx` - Client boundary wrapper; nests SessionProvider > PermissionsProvider
- `src/app/layout.tsx` - Added AuthProviders import and JSX wrapping of LayoutShell; remains Server Component

## Decisions Made
- `SessionProvider` must be outer wrapper: `PermissionsProvider` calls `useSession()` and must be a descendant of `SessionProvider` — wrong order would cause "useSession must be wrapped in a SessionProvider" runtime error
- `PermissionsContext` scaffold is minimal by design: Phase 19 will replace the `canPerform` impl with per-collection overrides without any layout changes — the hook API surface stays identical
- `layout.tsx` stays a Server Component: importing a 'use client' component (`AuthProviders`) from a Server Component is valid Next.js App Router usage; the client boundary is at `AuthProviders`, not layout

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — build compiled successfully with zero TypeScript errors. All 21 static pages generated. An intermittent ENOENT in Next.js 13.5.x `collect-build-traces.js` appeared in one run but resolved on retry (known race condition in this version, unrelated to our changes).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Any client component can now call `useSession()` (from next-auth/react) without "SessionProvider not found" error
- Any client component can call `usePermissions()` to get `{ role, canPerform }` for conditional UI rendering
- Phase 17 Plan 03 (sign-in page `/auth/sign-in`) can use `useSession()` and `usePermissions()` without additional provider setup
- Phase 18 (protected API routes) uses `getServerSession(authOptions)` on the server side — not dependent on this client provider
- Phase 19 will expand `PermissionsContext` with per-collection overrides using the same hook API surface

---
*Phase: 17-auth-api-routes-and-sign-in-flow*
*Completed: 2026-03-28*

## Self-Check: PASSED

- FOUND: src/context/PermissionsContext.tsx
- FOUND: src/components/providers/AuthProviders.tsx
- FOUND: src/app/layout.tsx
- FOUND: .planning/phases/17-auth-api-routes-and-sign-in-flow/17-02-SUMMARY.md
- FOUND commit: 6a616eb (feat: create PermissionsContext)
- FOUND commit: ec1a22b (feat: create AuthProviders wrapper and wire into layout.tsx)
