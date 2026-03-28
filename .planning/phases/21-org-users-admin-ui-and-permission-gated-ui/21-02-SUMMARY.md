---
phase: 21-org-users-admin-ui-and-permission-gated-ui
plan: 02
subsystem: api
tags: [next-auth, mongodb, mongoose, rbac, permissions]

# Dependency graph
requires:
  - phase: 21-01
    provides: JWT callback with status check and roleLastFetched refresh
  - phase: 19-rbac-and-permissions-context
    provides: requireRole(action) gate, Action.ManageUsers constant, permissions.ts

provides:
  - GET /api/org/users — list active+invited members with isSuperAdmin flag
  - PATCH /api/org/users/[id]/role — change a user's role (Admin-only)
  - DELETE /api/org/users/[id] — soft-delete user by setting status='disabled'

affects:
  - 21-04 (org users page UI — consumes these three endpoints)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "requireRole(Action.ManageUsers) with early NextResponse return guards all three endpoints"
    - "isSuperAdmin computed server-side from SUPER_ADMIN_EMAIL; env var never sent to client"
    - "Soft delete pattern: status='disabled' preserves references; jwt callback forces sign-out"
    - "Self-removal guard via session.user.id === params.id comparison"

key-files:
  created:
    - src/app/api/org/users/route.ts
    - src/app/api/org/users/[id]/route.ts
    - src/app/api/org/users/[id]/role/route.ts
  modified: []

key-decisions:
  - "isSuperAdmin boolean computed server-side from SUPER_ADMIN_EMAIL — env var is never sent to client; client uses the boolean flag to disable role/remove actions"
  - "GET filters status: { $ne: 'disabled' } — removed users do not appear in the list but remain in DB for referential integrity"
  - "DELETE is a soft delete (status='disabled') — existing token collections reference userId; hard delete would orphan documents"
  - "Self-removal guard compares params.id === session.user.id — Admin cannot delete their own account"
  - "PATCH validates role against VALID_ROLES const array before DB update — returns 400 for invalid role values"

patterns-established:
  - "Superadmin protection: check targetUser.email === process.env.SUPER_ADMIN_EMAIL before any mutation; return 403"
  - "Admin-only endpoint pattern: requireRole(Action.ManageUsers) at top of handler, return early if NextResponse"

requirements-completed:
  - USER-01
  - USER-05
  - USER-06

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 21 Plan 02: Org Users Admin API Routes Summary

**Three Admin-only API routes for user management: list members with isSuperAdmin flag, change role with superadmin protection, and soft-delete with self-removal guard**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T21:49:02Z
- **Completed:** 2026-03-28T21:51:23Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- GET /api/org/users returns all non-disabled org members with isSuperAdmin boolean computed server-side
- PATCH /api/org/users/[id]/role validates role value, protects superadmin from role changes, and updates DB
- DELETE /api/org/users/[id] soft-deletes (status='disabled'), guards against superadmin removal and self-removal

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GET /api/org/users route** - `006c89b` (feat)
2. **Task 2: Create PATCH role and DELETE user routes** - `8819425` (feat)

## Files Created/Modified
- `src/app/api/org/users/route.ts` - GET endpoint; lists active+invited users with isSuperAdmin flag
- `src/app/api/org/users/[id]/route.ts` - DELETE endpoint; soft-removes user by setting status='disabled'
- `src/app/api/org/users/[id]/role/route.ts` - PATCH endpoint; changes a user's role with validation

## Decisions Made
- `isSuperAdmin` computed server-side: SUPER_ADMIN_EMAIL never sent to client; client receives a boolean flag only
- Soft delete chosen over hard delete to preserve referential integrity for token collection userId references
- Self-removal check uses `session.user.id === params.id` (string comparison) — same pattern as existing auth guards
- VALID_ROLES const array used for validation instead of importing Role type — simpler runtime check

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Next Phase Readiness
- All three API routes ready for Plan 21-04 which builds the org users UI consuming these endpoints
- Routes require authenticated Admin session — non-Admin requests return 403 via requireRole guard
- The jwt callback from Plan 21-01 will automatically invalidate sessions for users set to status='disabled' on next token refresh

---
*Phase: 21-org-users-admin-ui-and-permission-gated-ui*
*Completed: 2026-03-28*
