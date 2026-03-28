---
phase: 21-org-users-admin-ui-and-permission-gated-ui
plan: 01
subsystem: auth
tags: [nextauth, jwt, role-refresh, session-invalidation, typescript]

# Dependency graph
requires:
  - phase: 19-rbac-and-permissions-context
    provides: User model with role/status fields; requireRole() enforcement
  - phase: 16-auth-foundation
    provides: nextauth.config.ts with JWT strategy and SUPER_ADMIN_EMAIL enforcement
provides:
  - JWT callback with roleLastFetched timestamp for 60-second role staleness detection
  - DB re-fetch of role/status on stale JWT — propagates Admin role changes within 60s
  - Session invalidation via return {} when user status=disabled or user not found
  - TypeScript augmentation for JWT.roleLastFetched field
affects:
  - Phase 21 plan 02+ (org users admin UI relies on role propagation working correctly)
  - Any future auth work referencing jwt callback

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "roleLastFetched timestamp pattern: stamp at sign-in + on SUPER_ADMIN_EMAIL refresh, re-fetch when stale"
    - "Session invalidation via return {} in next-auth v4 jwt callback"
    - "SUPER_ADMIN_EMAIL check precedes all DB operations — early return prevents any DB override"

key-files:
  created: []
  modified:
    - src/types/next-auth.d.ts
    - src/lib/auth/nextauth.config.ts

key-decisions:
  - "Cast user via unknown first (user as unknown as {...}) — direct cast to {role:string} rejected by TS since AdapterUser lacks role"
  - "SUPER_ADMIN_EMAIL short-circuit returns early before DB re-fetch block — guarantees no DB call for super admin"
  - "return {} as typeof token for disabled/missing user — next-auth v4 pattern to force re-sign-in on next request"

patterns-established:
  - "Role re-fetch TTL: ROLE_TTL_MS = 60 * 1000 constant in jwt callback"
  - "token.id guard before DB re-fetch — graceful skip for pre-v1.5 sessions lacking id field"

requirements-completed: [USER-05, USER-06]

# Metrics
duration: 4min
completed: 2026-03-29
---

# Phase 21 Plan 01: JWT Role Re-fetch Mechanism Summary

**JWT callback extended with 60-second roleLastFetched TTL: re-fetches role/status from MongoDB on stale tokens, invalidates session (return {}) for disabled users, with SUPER_ADMIN_EMAIL early-return before any DB hit**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-28T21:49:06Z
- **Completed:** 2026-03-28T21:53:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `roleLastFetched?: number` to next-auth JWT TypeScript type augmentation
- Replaced static jwt callback with 60-second TTL re-fetch mechanism using `User.findById().select('role status').lean()`
- Disabled/deleted user sessions invalidated on next JWT refresh via `return {} as typeof token`
- SUPER_ADMIN_EMAIL short-circuit returns early before any DB re-fetch, keeping admin role guaranteed

## Task Commits

Each task was committed atomically:

1. **Task 1: Add roleLastFetched to JWT type augmentation** - `6b08dc7` (feat)
2. **Task 2: Extend jwt callback with 60-second role re-fetch mechanism** - `94a12aa` (feat)

## Files Created/Modified
- `src/types/next-auth.d.ts` - Added `roleLastFetched?: number` to JWT interface
- `src/lib/auth/nextauth.config.ts` - Replaced jwt callback with role re-fetch + session invalidation logic

## Decisions Made
- Used `user as unknown as { id: string; role: string; name: string }` cast — TypeScript rejects direct `as { role: string }` cast because `User | AdapterUser` doesn't overlap with the target type; `unknown` intermediate cast is the TS-approved pattern
- SUPER_ADMIN_EMAIL check placed before DB re-fetch and returns early — ensures no DB call for super admin and no DB override of their Admin role
- `return {} as typeof token` is the correct next-auth v4 pattern for session invalidation — returning `null` is silently ignored by next-auth

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript cast via unknown instead of direct cast**
- **Found during:** Task 2 (Extend jwt callback)
- **Issue:** Plan specified `(user as { role: string }).role` but TypeScript TS2352 error: `User | AdapterUser` doesn't sufficiently overlap with `{ role: string }` since `AdapterUser` lacks `role`
- **Fix:** Used `user as unknown as { id: string; role: string; name: string }` — semantically identical, TS-approved double-cast pattern
- **Files modified:** `src/lib/auth/nextauth.config.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `94a12aa` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type cast correction)
**Impact on plan:** Minimal — identical runtime behavior, correct TypeScript typing. No scope creep.

## Issues Encountered
- Git conflict resolution during commit attempt on Task 2 — unmerged files from a concurrent git operation caused the first commit to fail with exit 128. Re-applied the edit and committed successfully on second attempt.

## Next Phase Readiness
- JWT role propagation mechanism complete — role changes and user removals now propagate within 60 seconds without sign-out
- Ready for Phase 21 plan 02: org users admin UI (role change and remove user API endpoints)
- Requirements USER-05 (role change propagation) and USER-06 (removal propagation) satisfied

---
*Phase: 21-org-users-admin-ui-and-permission-gated-ui*
*Completed: 2026-03-29*
