---
phase: 20-email-invite-flow-and-account-setup
plan: 03
subsystem: ui
tags: [next-auth, rbac, invite, modal, shadcn, permissions]

# Dependency graph
requires:
  - phase: 20-01
    provides: POST/GET /api/invites, DELETE /api/invites/[id], POST /api/invites/[id]/resend endpoints
  - phase: 19-rbac-and-permissions-context
    provides: usePermissions() hook with isAdmin, PermissionsContext wired in layout
provides:
  - /org/users page with pending invites table and Invite User button
  - InviteModal component with Email+Role fields and inline 409 error handling
  - OrgSidebar Users nav item visible only to Admins
  - LayoutShell routing for /org/* paths through OrgHeader+OrgSidebar shell
  - middleware Admin-only guard redirecting non-Admin from /org/users to /collections
affects:
  - phase-21-active-members (Phase 21 will add active member rows to the /org/users table)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Admin-only nav items via usePermissions().isAdmin conditional spread in navItems array
    - Middleware role guard pattern — check token?.role after authorized callback
    - Optimistic UI for invite table: onSuccess callback prepends new row to state
    - Double cast (unknown as Type) for Record<string, unknown> → typed interface conversions

key-files:
  created:
    - src/app/org/users/page.tsx
    - src/components/org/InviteModal.tsx
  modified:
    - src/components/layout/LayoutShell.tsx
    - src/components/layout/OrgSidebar.tsx
    - src/middleware.ts

key-decisions:
  - "toLocaleDateString() used instead of date-fns (not installed in project)"
  - "invite as unknown as InviteRow double cast — Record<string,unknown> to InviteRow requires unknown intermediary in TypeScript"
  - "/org/users page is 'use client' (needs useState for invite list and modal state)"
  - "Optimistic UI via onSuccess callback — new invite prepended without refetch"

patterns-established:
  - "Admin-only nav items: spread conditional array into navItems — ...(isAdmin ? [{...}] : [])"
  - "OrgSidebar isAdmin: use usePermissions() from PermissionsContext, no prop drilling"
  - "Middleware role guard: check token.role after withAuth authorized callback, before NextResponse.next()"

requirements-completed:
  - USER-02
  - USER-07

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 20 Plan 03: Email Invite Flow and Account Setup — Users Page Summary

**Admin-only /org/users page with pending invites table, InviteModal, OrgSidebar Users nav item, LayoutShell /org/* routing fix, and middleware role guard**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T21:32:32Z
- **Completed:** 2026-03-28T21:35:57Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Built /org/users page: pending invites table with Email, Role, Status badge (Pending/Expired), Expiry date, Resend and Revoke actions
- Created InviteModal with Email+Role fields, loading state, and inline error display for 409 duplicate conflicts
- Wired infrastructure: LayoutShell routes /org/* through OrgHeader+OrgSidebar shell; OrgSidebar shows Users nav item only to Admins; middleware redirects non-Admin away from /org/users

## Task Commits

Each task was committed atomically:

1. **Task 1: Infrastructure plumbing — LayoutShell, OrgSidebar, Middleware** - `7979b12` (feat)
2. **Task 2: Build InviteModal and /org/users page** - `3ae04fd` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/app/org/users/page.tsx` - Admin-only /org/users page with pending invites table, Invite User button, Resend/Revoke actions, optimistic UI updates
- `src/components/org/InviteModal.tsx` - Dialog with Email+Role fields, form reset on close, POST /api/invites integration, inline 409 error handling
- `src/components/layout/LayoutShell.tsx` - isOrgRoute() now includes pathname.startsWith('/org') to route /org/* through OrgHeader+OrgSidebar shell
- `src/components/layout/OrgSidebar.tsx` - Added usePermissions().isAdmin and conditional Users nav item via spread array pattern
- `src/middleware.ts` - Added Admin-only role guard for /org/users, redirects non-Admin to /collections

## Decisions Made
- Used `toLocaleDateString()` instead of `date-fns` — date-fns not installed in this project; native API sufficient for date display
- Double cast `as unknown as InviteRow` in handleInviteSuccess — TypeScript requires unknown intermediary when converting `Record<string, unknown>` to a typed interface
- Page is `'use client'` — requires useState for invite list, loading state, and modal open/close

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript cast error for Record<string, unknown> to InviteRow**
- **Found during:** Task 2 (Build InviteModal and /org/users page)
- **Issue:** `invite as InviteRow` fails TypeScript check — neither type sufficiently overlaps with the other
- **Fix:** Changed to `invite as unknown as InviteRow` double cast
- **Files modified:** src/app/org/users/page.tsx
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 3ae04fd (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript bug)
**Impact on plan:** Minor fix required for TypeScript correctness. No scope creep.

## Issues Encountered
- date-fns not installed — plan noted this alternative, used `toLocaleDateString()` with `en-US` locale options as specified in the plan fallback

## Next Phase Readiness
- Phase 20 complete: invite API (Plan 01), account setup page (Plan 02), and users management UI (Plan 03) all done
- Phase 21 can extend /org/users page by adding an active members section above the pending invites table
- No blockers

---
*Phase: 20-email-invite-flow-and-account-setup*
*Completed: 2026-03-28*
