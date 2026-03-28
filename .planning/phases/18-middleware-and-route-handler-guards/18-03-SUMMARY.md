---
phase: 18-middleware-and-route-handler-guards
plan: 03
subsystem: auth
tags: [next-auth, middleware, withAuth, requireAuth, CVE-2025-29927]

requires:
  - phase: 18-01
    provides: src/middleware.ts and src/lib/auth/require-auth.ts
  - phase: 18-02
    provides: requireAuth() guards on all 17 write Route Handlers

provides:
  - Human verification that all 4 Phase 18 auth guard scenarios pass end-to-end
  - Bug fix: middleware matcher updated to include /auth/* so authenticated-user redirect fires

affects: [phase-19-rbac, any future auth changes]

tech-stack:
  added: []
  patterns:
    - "middleware authorized callback allows /auth/* paths to prevent infinite redirect loop"
    - "matcher excludes api/ (not auth/) so /auth/sign-in page is processed by middleware"

key-files:
  created: []
  modified:
    - src/middleware.ts

key-decisions:
  - "Matcher must NOT exclude /auth/* page routes — only /api/ should be excluded. /api/auth/* NextAuth callbacks are covered by the api/ exclusion."
  - "authorized callback returns true for /auth/* paths to allow unauthenticated sign-in page access without infinite redirect loop"

patterns-established:
  - "withAuth: authorized callback checks pathname for /auth/ prefix before enforcing !!token"

requirements-completed:
  - AUTH-02
  - ARCH-02

duration: 5min
completed: 2026-03-28
---

# Phase 18-03: Human Verification Summary

**All 4 auth guard scenarios verified end-to-end; middleware bug fixed to enable authenticated-user redirect from sign-in page**

## Performance

- **Duration:** 5 min
- **Completed:** 2026-03-28
- **Tasks:** 1 (checkpoint)
- **Files modified:** 1

## Accomplishments
- All 4 Phase 18 success criteria verified by human in running dev server
- Fixed middleware matcher bug: `/auth/sign-in` was excluded from middleware processing, preventing authenticated-user redirect
- Phase 18 complete: dual-layer auth (middleware + requireAuth) fully operational

## Task Commits

1. **Bug fix: middleware matcher** - `00e440d` (fix: fix middleware matcher to include /auth/* for sign-in redirect)

## Files Created/Modified
- `src/middleware.ts` — removed `auth` from negative lookahead; updated `authorized` callback to allow `/auth/*` unauthenticated access

## Decisions Made
- Matcher change: removed `auth` from `(?!api|auth|...)` → `(?!api|...)`. The `/api/auth/*` NextAuth callbacks were already excluded by the `api` prefix; `/auth/sign-in` should be matched so middleware can redirect authenticated users away.
- `authorized` callback now checks `req.nextUrl.pathname.startsWith('/auth/')` and returns `true` to allow unauthenticated sign-in page access, preventing infinite redirect loop.

## Deviations from Plan

### Auto-fixed Issues

**1. Middleware matcher excluded /auth/* — sign-in redirect never fired**
- **Found during:** Human verification Scenario 4
- **Issue:** Matcher pattern `(?!api|auth|...)` excluded all `/auth/*` paths including `/auth/sign-in`, so the middleware body's authenticated-user redirect on line 8 never executed
- **Fix:** Removed `auth` from the negative lookahead; updated `authorized` callback to return `true` for `/auth/*` paths
- **Files modified:** `src/middleware.ts`
- **Verification:** Authenticated user visiting `/auth/sign-in` now redirects to `/collections`
- **Committed in:** `00e440d`

---

**Total deviations:** 1 auto-fixed (1 blocking bug)
**Impact on plan:** Essential fix — without it Scenario 4 failed. No scope creep.

## Issues Encountered
- Middleware matcher excluded `/auth/*` page routes in the original 18-01 implementation. Fix required two changes: (1) remove `auth` from matcher exclusion, (2) allow unauthenticated access to `/auth/*` in the `authorized` callback to prevent redirect loop.

## Next Phase Readiness
- Phase 18 complete. All 4 auth guard scenarios pass.
- Phase 19 (RBAC) can proceed — session is enforced at both middleware and Route Handler layers.

---
*Phase: 18-middleware-and-route-handler-guards*
*Completed: 2026-03-28*
