---
phase: 17-auth-api-routes-and-sign-in-flow
plan: 03
subsystem: auth
tags: [next-auth, react, nextjs-app-router, shadcn-ui, credentials, sign-in, setup, usermenu, dropdown]

# Dependency graph
requires:
  - phase: 17-auth-api-routes-and-sign-in-flow
    provides: authorize() with throw-based errors, displayName in session, GET+POST /api/auth/setup, SessionProvider+PermissionsProvider wired in layout
  - phase: 16-auth-infrastructure-and-security-baseline
    provides: authOptions, next-auth.d.ts session augmentation, bcryptjs, User model

provides:
  - /auth/sign-in page with credential form, inline errors, loading state, and dual ok+error guard
  - /auth/setup page with first-user bootstrap, redirect-if-exists check, auto sign-in after creation
  - UserMenu component with initials avatar, display name, sign-out dropdown
  - OrgHeader updated with UserMenu to the right of DbPill

affects: [phase-18-protected-api-routes, phase-19-per-collection-permissions, phase-21-admin-user-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auth pages use no app shell (no OrgHeader/sidebar) — standalone centered card layout"
    - "Setup page mount-check pattern: GET /api/auth/setup on useEffect, store email in state, redirect if not needed"
    - "UserMenu skeleton pattern: w-28 h-8 pulse placeholder during status=loading prevents layout shift"
    - "signIn() dual guard: check both !result?.ok && result?.error to handle NextAuth v4 ok+error race bug"

key-files:
  created:
    - src/app/auth/sign-in/page.tsx
    - src/app/auth/setup/page.tsx
    - src/components/layout/UserMenu.tsx
  modified:
    - src/components/layout/OrgHeader.tsx

key-decisions:
  - "Auth pages (sign-in, setup) have no app shell — isolated centered card layout appropriate for pre-auth flows"
  - "setupEmail stored from GET /api/auth/setup response (not process.env.SUPER_ADMIN_EMAIL) — env var is server-only, undefined on client"
  - "router.replace (not push) on redirect from setup — prevents back-button return to setup after redirect"
  - "UserMenu returns null when no session — Phase 18 will redirect unauthenticated users before they reach OrgHeader"
  - "OrgHeader wraps DbPill + UserMenu in flex gap-3 container — sets up for additional header items in Phase 21"

patterns-established:
  - "Auth page pattern: no-shell centered card with max-w-sm, same dark mode variants, shadcn/ui Input + Button"
  - "UserMenu skeleton: fixed dimensions (w-28 h-8) matching rendered size prevents CLS"
  - "Provider-aware component: UserMenu accesses session via useSession(); rendering gated on status !== loading"

requirements-completed: [AUTH-01, AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: 7min
completed: 2026-03-28
---

# Phase 17 Plan 03: Auth UI Pages and UserMenu Summary

**Sign-in page, first-user setup page, and UserMenu component complete the auth round-trip: credentials form with inline errors, setup bootstrap with auto sign-in, and initials avatar with sign-out dropdown in OrgHeader**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-28T06:50:41Z
- **Completed:** 2026-03-28T06:57:14Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Created `/auth/sign-in` — centered card page with email/password form, inline error display, disabled+spinner loading state, dual ok+error guard on signIn() result
- Created `/auth/setup` — mount-time GET check redirects to sign-in if users exist; collects displayName + password + confirmPassword; POSTs to /api/auth/setup then auto signs in using email from GET response
- Created `UserMenu` — loading skeleton prevents layout shift; initials avatar (max 2 chars) + display name + sign-out dropdown calling signOut({ callbackUrl: '/auth/sign-in' })
- Updated `OrgHeader` — UserMenu added to the right of DbPill in a flex container, completing the visible header auth round-trip

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /auth/sign-in page** - `f33be45` (feat)
2. **Task 2: Create /auth/setup page** - `7fb29de` (feat)
3. **Task 3: Create UserMenu and integrate into OrgHeader** - `aba602f` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/app/auth/sign-in/page.tsx` - Sign-in page: centered card, email/password inputs (shadcn/ui), signIn('credentials', { redirect: false }), dual ok+error guard, inline error, Loader2 spinner
- `src/app/auth/setup/page.tsx` - Setup page: mount GET check with router.replace redirect, displayName + password + confirmPassword form, POST /api/auth/setup then auto signIn using stored setupEmail
- `src/components/layout/UserMenu.tsx` - UserMenu: loading skeleton, initials avatar, display name, Sign out dropdown item
- `src/components/layout/OrgHeader.tsx` - Added UserMenu import; wrapped DbPill + UserMenu in flex gap-3 div

## Decisions Made
- Auth pages have no app shell — isolated full-viewport centered card layout is appropriate for pre-authenticated flows; no OrgHeader or sidebar
- `setupEmail` stored in React state from the GET /api/auth/setup response during component mount — `process.env.SUPER_ADMIN_EMAIL` is server-side only and would be `undefined` in client code
- `router.replace()` (not `router.push()`) for the redirect when setup is not required — prevents the back button from returning to the setup page after the user has been redirected
- `UserMenu` returns `null` when no session exists rather than showing a sign-in link — Phase 18 will add middleware-based route protection that redirects unauthenticated users before they can reach any page using OrgHeader
- OrgHeader wraps DbPill + UserMenu in a `flex items-center gap-3` div to accommodate future additions in Phase 21 (admin links, role badge)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — build compiled successfully with zero TypeScript errors. All 23 static pages generated including /auth/sign-in and /auth/setup.

## User Setup Required
None - no external service configuration required for this plan.

## Next Phase Readiness
- Full auth round-trip is complete: user can navigate to `/auth/sign-in`, enter credentials, be redirected to the app, see their name in the header, and sign out
- Session persists across browser refresh via JWT strategy (established in Phase 16)
- `/auth/setup` handles first-run bootstrap; subsequent visits are redirected to sign-in
- Phase 18 (route protection / middleware) can now protect all routes, redirecting to `/auth/sign-in` — the page exists
- Phase 19 (per-collection permissions) — `usePermissions()` hook already wired from Plan 02; UserMenu is a natural place to show role badge when that expands
- Phase 21 (admin user management) — UserMenu dropdown structure is ready to receive additional items (manage users, admin panel link)

## Self-Check: PASSED

- FOUND: src/app/auth/sign-in/page.tsx
- FOUND: src/app/auth/setup/page.tsx
- FOUND: src/components/layout/UserMenu.tsx
- FOUND: src/components/layout/OrgHeader.tsx
- FOUND: .planning/phases/17-auth-api-routes-and-sign-in-flow/17-03-SUMMARY.md
- Commit f33be45 — Task 1 (sign-in page)
- Commit 7fb29de — Task 2 (setup page)
- Commit aba602f — Task 3 (UserMenu + OrgHeader)

---
*Phase: 17-auth-api-routes-and-sign-in-flow*
*Completed: 2026-03-28*
