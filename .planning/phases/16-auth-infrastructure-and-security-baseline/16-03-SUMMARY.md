---
phase: 16-auth-infrastructure-and-security-baseline
plan: 03
subsystem: auth
tags: [next-auth, jwt, credentials-provider, bcryptjs, nextauth-config, session, super-admin]

# Dependency graph
requires:
  - phase: 16-01
    provides: "next-auth@4.24.13 and bcryptjs@2.4.3 installed; session.user.id/role typed in next-auth.d.ts"
  - phase: 16-02
    provides: "User Mongoose model with passwordHash and role fields; permissions.ts with Role type"
provides:
  - "authOptions (NextAuthOptions) exported from src/lib/auth/nextauth.config.ts"
  - "CredentialsProvider with bcrypt password verification and user.status=disabled check"
  - "Explicit JWT session strategy (30 days) with jwt and session callbacks"
  - "SUPER_ADMIN_EMAIL enforcement in jwt callback — always overrides DB role (AUTH-06)"
  - "NextAuth App Router route handler at src/app/api/auth/[...nextauth]/route.ts (GET + POST)"
  - "NEXTAUTH_SECRET, NEXTAUTH_URL, SUPER_ADMIN_EMAIL in .env.local"
affects:
  - 17-sign-in-ui
  - 18-route-protection
  - 19-user-management

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "authOptions centralized in src/lib/auth/nextauth.config.ts — single import target for getServerSession()"
    - "CredentialsProvider authorize() returns { id, email, role } — maps to JWT via jwt callback"
    - "jwt callback user guard: if (user) sets token.id/role only on initial sign-in, not on refresh"
    - "SUPER_ADMIN_EMAIL override in jwt callback checks token.email (always present) not user?.email"
    - "App Router NextAuth handler: const handler = NextAuth(authOptions); export { handler as GET, handler as POST }"

key-files:
  created:
    - src/lib/auth/nextauth.config.ts
    - src/app/api/auth/[...nextauth]/route.ts
  modified:
    - .env.local

key-decisions:
  - "SUPER_ADMIN_EMAIL enforcement checks token.email in jwt callback — token.email is always present (unlike user.email which is only available on initial sign-in)"
  - "session: { strategy: 'jwt' } is explicit — CredentialsProvider is incompatible with database sessions"
  - "pages.signIn: '/auth/sign-in' set even though page does not exist yet — NextAuth uses this for redirects in Phase 18+"
  - "NEXTAUTH_SECRET generated with openssl rand -base64 32 and stored in .env.local — user should replace SUPER_ADMIN_EMAIL placeholder"

patterns-established:
  - "All auth configuration lives in src/lib/auth/ or src/app/api/auth/ — no auth code in other modules (ARCH-01)"
  - "authOptions import pattern: import { authOptions } from '@/lib/auth/nextauth.config' — used by getServerSession() in all protected routes"

requirements-completed:
  - ARCH-01
  - AUTH-06

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 16 Plan 03: NextAuth authOptions + Route Handler Summary

**NextAuth CredentialsProvider config with bcrypt password verification, SUPER_ADMIN_EMAIL JWT override, and App Router /api/auth handler enabling all NextAuth endpoints**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T05:08:06Z
- **Completed:** 2026-03-28T05:12:00Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- Created `src/lib/auth/nextauth.config.ts` with CredentialsProvider, explicit JWT strategy (30-day), jwt callback with user guard and SUPER_ADMIN_EMAIL enforcement, and session callback mapping id/role
- Created `src/app/api/auth/[...nextauth]/route.ts` minimal App Router handler enabling all NextAuth endpoints at /api/auth/*
- Added NEXTAUTH_URL, NEXTAUTH_SECRET (generated), and SUPER_ADMIN_EMAIL to .env.local alongside existing MONGODB_URI

## Task Commits

Each task was committed atomically:

1. **Task 1: Create authOptions in src/lib/auth/nextauth.config.ts** - `5f32faa` (feat)
2. **Task 2: Create NextAuth route handler and add env vars to .env.local** - `cc102ec` (feat)

## Files Created/Modified

- `src/lib/auth/nextauth.config.ts` - authOptions: CredentialsProvider with bcrypt+status check, JWT strategy, jwt/session callbacks, SUPER_ADMIN_EMAIL enforcement, signIn page reference
- `src/app/api/auth/[...nextauth]/route.ts` - App Router handler: NextAuth(authOptions) exported as GET and POST
- `.env.local` - Added NEXTAUTH_URL=http://localhost:3000, NEXTAUTH_SECRET (generated value), SUPER_ADMIN_EMAIL=admin@example.com

## Decisions Made

- SUPER_ADMIN_EMAIL check uses `token.email` (always present in JWT) rather than `user?.email` (only on initial sign-in) — ensures enforcement on every token refresh, not just at login
- `session: { strategy: 'jwt' }` is explicit (not relying on NextAuth default) — CredentialsProvider is incompatible with database sessions and requires JWT strategy
- `pages.signIn: '/auth/sign-in'` configured now even though the page is Phase 17 work — NextAuth needs this for redirect-based auth flows in Phase 18+

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Update `.env.local` before first use:
- `SUPER_ADMIN_EMAIL` — replace `admin@example.com` with your actual admin email address
- `NEXTAUTH_SECRET` — already generated; replace if you want a fresh secret
- `NEXTAUTH_URL` — update from `http://localhost:3000` for production deployments

## Next Phase Readiness

- `authOptions` is ready for `getServerSession(authOptions)` in all protected route handlers (Phase 18+)
- All NextAuth endpoints are live at `/api/auth/*` — session, sign-in, sign-out, CSRF token
- Phase 16 is complete: all auth infrastructure (packages, types, models, permissions, authOptions, route handler) is in place
- Phase 17 (sign-in UI) can now build on `/auth/sign-in` with the CredentialsProvider backend ready

---
*Phase: 16-auth-infrastructure-and-security-baseline*
*Completed: 2026-03-28*
