---
phase: 17-auth-api-routes-and-sign-in-flow
plan: 01
subsystem: auth
tags: [next-auth, credentials-provider, bcryptjs, mongodb, api-routes, jwt]

# Dependency graph
requires:
  - phase: 16-auth-infrastructure-and-security-baseline
    provides: authOptions, NextAuth route handler, User model, permissions, bcryptjs setup

provides:
  - authorize() throwing specific Error messages ('No account found with that email', 'Incorrect password')
  - name: user.displayName in authorize() return so session.user.name is populated
  - token.name propagated via jwt callback
  - GET /api/auth/setup — returns { setupRequired: true, email } or { setupRequired: false }
  - POST /api/auth/setup — creates first Admin user with status:'active', guards 403 on repeat call

affects: [17-sign-in-page, 17-setup-page, 18-route-protection, 20-user-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "authorize() throws Error (not returns null) for user-specific sign-in failures — enables specific client error messages"
    - "Disabled accounts return generic 'Incorrect password' to prevent status leak"
    - "Setup route double-checks countDocuments() in POST to prevent race-condition bootstrap replay"

key-files:
  created:
    - src/app/api/auth/setup/route.ts
  modified:
    - src/lib/auth/nextauth.config.ts

key-decisions:
  - "authorize() throws Error instead of returning null — CredentialsSignin generic error replaced by user-readable messages passed through NextAuth error param"
  - "Disabled user returns same error as wrong password — no status enumeration risk"
  - "invited-status users can sign in — only 'disabled' is blocked at auth layer"
  - "GET /api/auth/setup includes email only when setupRequired=true — never expose SUPER_ADMIN_EMAIL post-setup"
  - "POST /api/auth/setup sets status:'active' explicitly — User schema defaults to 'invited' which would block sign-in"

patterns-established:
  - "Sign-in errors: throw new Error('message') in authorize() for user-facing messages"
  - "Bootstrap guard: countDocuments() re-checked in POST body (not trusting GET cache)"

requirements-completed: [AUTH-01, AUTH-05]

# Metrics
duration: 18min
completed: 2026-03-28
---

# Phase 17 Plan 01: Auth API Routes and Sign-In Flow Summary

**throw-based authorize() errors with specific messages, displayName in session, and first-user bootstrap API via GET+POST /api/auth/setup**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-28T06:28:04Z
- **Completed:** 2026-03-28T06:46:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Modified authorize() to throw specific error messages instead of returning null, enabling the sign-in form to display user-readable errors ('No account found with that email', 'Incorrect password')
- Added name: user.displayName to authorize() return and token.name propagation in jwt callback so session.user.name is populated
- Created GET /api/auth/setup to report whether setup is required (includes SUPER_ADMIN_EMAIL only when no users exist)
- Created POST /api/auth/setup to create the first Admin user with status:'active', guarded against replay with 403

## Task Commits

Each task was committed atomically:

1. **Task 1: Modify authorize() for specific errors and displayName** - `05b9e86` (feat)
2. **Task 2: Create /api/auth/setup route** - `aa6fdd1` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/lib/auth/nextauth.config.ts` - authorize() now throws specific errors; returns name: user.displayName; jwt callback propagates token.name
- `src/app/api/auth/setup/route.ts` - GET+POST handlers for first-user bootstrap with guard logic

## Decisions Made
- throw new Error() in authorize() rather than return null — NextAuth passes the thrown error message through to the client via the error URL parameter, enabling specific sign-in UX
- Disabled accounts return 'Incorrect password' (same as wrong password) — prevents status enumeration attacks
- invited-status users can sign in — 'invited' is only a pending-confirmation state, not a block; only 'disabled' is explicitly blocked
- GET /api/auth/setup includes SUPER_ADMIN_EMAIL only when setupRequired=true — avoids leaking the admin email once setup is complete
- POST /api/auth/setup sets status:'active' explicitly — schema defaults to 'invited' which would prevent immediate sign-in after bootstrap

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- yarn build produced ENOTEMPTY/ENOENT errors during the static export finalization phase on multiple parallel build runs — these are filesystem race conditions from parallel background builds, not code issues. Final clean build passed with zero TypeScript errors.

## User Setup Required
None - no external service configuration required for this plan.

## Next Phase Readiness
- authorize() backend is complete: specific error messages ready for the sign-in page to consume via searchParams.get('error')
- /api/auth/setup is ready for the setup page (Phase 17 plan 02 or similar) to call
- session.user.name is now populated from displayName for use in UI

## Self-Check: PASSED

- src/lib/auth/nextauth.config.ts — FOUND
- src/app/api/auth/setup/route.ts — FOUND
- 17-01-SUMMARY.md — FOUND
- Commit 05b9e86 — FOUND
- Commit aa6fdd1 — FOUND

---
*Phase: 17-auth-api-routes-and-sign-in-flow*
*Completed: 2026-03-28*
