---
phase: 18-middleware-and-route-handler-guards
plan: 01
subsystem: auth
tags: [next-auth, middleware, withAuth, getServerSession, jwt, route-handlers]

# Dependency graph
requires:
  - phase: 17-auth-api-routes-and-sign-in-flow
    provides: authOptions in src/lib/auth/nextauth.config.ts with pages.signIn configured
  - phase: 16-auth-foundation-and-rbac
    provides: permissions.ts, Role types, JWT strategy with role/id embedded in token

provides:
  - Next.js middleware using withAuth — redirects unauthenticated page requests to /auth/sign-in
  - Signed-in users visiting /auth/sign-in are redirected to /collections
  - requireAuth() utility that Route Handlers call to enforce session (returns Session or 401 NextResponse)
  - AuthResult union type (Session | NextResponse) for handler-level narrowing

affects: [phase-18-plan-02, route-handlers, api-write-endpoints]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-layer security: middleware handles page UX redirects; requireAuth() is the actual API security boundary"
    - "withAuth callback pattern: authorized: ({ token }) => !!token for boolean gate"
    - "Matcher exclusion of api/ — API routes get 401 JSON from requireAuth(), not HTML redirects"
    - "requireAuth() caller pattern: const authResult = await requireAuth(); if (authResult instanceof NextResponse) return authResult;"

key-files:
  created:
    - src/middleware.ts
    - src/lib/auth/require-auth.ts
  modified: []

key-decisions:
  - "Middleware excludes api/ routes by design — HTML redirect would break fetch() callers; API security handled by requireAuth()"
  - "authorized: ({ token }) => !!token — explicit boolean cast, not truthy object; avoids TypeScript type issues"
  - "getServerSession(authOptions) single-argument form — three-argument Pages Router form throws in App Router"
  - "requireAuth() returns 401 { error: 'Unauthorized' } — no WWW-Authenticate header needed for session-cookie app"
  - "No DB lookup in requireAuth() — JWT-only; session decoded from cookie via authOptions callbacks"

patterns-established:
  - "requireAuth() at the top of every write Route Handler before any business logic"
  - "instanceof NextResponse narrowing pattern for AuthResult union type"

requirements-completed: [AUTH-02, ARCH-02]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 18 Plan 01: Middleware and Route Handler Guards Summary

**Next.js withAuth middleware for page-route UX gating plus requireAuth() JWT-only API guard utility establishing the dual-layer security model**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T08:04:18Z
- **Completed:** 2026-03-28T08:05:39Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `src/middleware.ts` using `withAuth` from `next-auth/middleware` — redirects unauthenticated users to `/auth/sign-in?callbackUrl=...`, redirects authenticated users away from sign-in page
- Created `src/lib/auth/require-auth.ts` with `requireAuth()` utility — returns `Session` on success or `NextResponse(401)` on failure, using `getServerSession(authOptions)` single-argument App Router form
- TypeScript compiles cleanly with zero errors after both files created
- `src/lib/auth/` directory now complete: `nextauth.config.ts`, `permissions.ts`, `invite.ts`, `require-auth.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/middleware.ts with withAuth page route protection** - `7a45a0d` (feat)
2. **Task 2: Create src/lib/auth/require-auth.ts with requireAuth() utility** - `4c12a29` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `src/middleware.ts` - Next.js Edge middleware using withAuth; protects all page routes except api/, auth/, static assets; redirects authenticated users away from sign-in
- `src/lib/auth/require-auth.ts` - requireAuth() utility for Route Handlers; returns Session or 401 NextResponse; AuthResult union type exported

## Decisions Made
- Middleware excludes `api/` routes by design — HTML redirect would break `fetch()` callers; API security is the responsibility of `requireAuth()` inside each handler
- `authorized: ({ token }) => !!token` — explicit boolean cast rather than returning the token object directly, avoiding TypeScript ambiguity
- `getServerSession(authOptions)` single-argument form — the three-argument Pages Router form (`req, res, authOptions`) throws `res.getHeader is not a function` in App Router context
- No `WWW-Authenticate` header in 401 response — session-cookie app; no client acts on it
- No DB lookup in `requireAuth()` — JWT-only validation; deleted users can act until token expires (revocation is a later concern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both foundation artifacts for Phase 18 are complete
- Plan 18-02 can now apply `requireAuth()` to the 18 existing write Route Handlers
- The dual-layer security model is established: middleware as UX gating, `requireAuth()` as the true security boundary

---
*Phase: 18-middleware-and-route-handler-guards*
*Completed: 2026-03-28*

## Self-Check: PASSED

- FOUND: src/middleware.ts
- FOUND: src/lib/auth/require-auth.ts
- FOUND: .planning/phases/18-middleware-and-route-handler-guards/18-01-SUMMARY.md
- FOUND commit: 7a45a0d (feat(18-01): add Next.js middleware with withAuth page route protection)
- FOUND commit: 4c12a29 (feat(18-01): add requireAuth() utility for Route Handler session enforcement)
