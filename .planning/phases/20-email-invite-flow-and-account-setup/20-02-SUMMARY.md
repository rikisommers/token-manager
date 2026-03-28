---
phase: 20-email-invite-flow-and-account-setup
plan: 02
subsystem: auth
tags: [invite, account-setup, bcrypt, next-auth, server-component, client-component]

requires:
  - phase: 20-01
    provides: "POST /api/invites (create invite), GET /api/invites/validate (token validation), Invite model with collectionId"
  - phase: 17-01
    provides: "authorize() credentials provider, User model with status='active' guard"
provides:
  - POST /api/auth/invite-setup (account creation from invite token)
  - /auth/invite-setup page (Server Component + Client Component form)
  - Atomic invite acceptance with race-condition protection
affects: [phase-20-plan-03]

tech-stack:
  added: []
  patterns:
    - "Server Component reads searchParams, passes as props — avoids useSearchParams() + Suspense"
    - "Token validate-on-mount pattern — fetch /api/invites/validate before showing form"
    - "Atomic findOneAndUpdate with pending filter — prevents double-submit race on invite acceptance"
    - "status='active' explicit on User.create — schema defaults to 'invited' which blocks sign-in"

key-files:
  created:
    - src/app/api/auth/invite-setup/route.ts
    - src/app/auth/invite-setup/page.tsx
    - src/app/auth/invite-setup/InviteSetupForm.tsx
  modified: []

key-decisions:
  - "POST /api/auth/invite-setup has no requireAuth() — invited user has no session; second ARCH-02 bootstrap exception"
  - "findOneAndUpdate with { status: 'pending' } filter for atomic invite acceptance — prevents race on double-submit"
  - "User created with status='active' explicitly — Mongoose default is 'invited' which blocks sign-in in authorize()"
  - "Server Component wrapper reads searchParams.token and passes as prop — avoids useSearchParams() + Suspense boundary in Client Component"
  - "Token validate-on-mount before rendering form — prevents form submission with already-used or expired token"
  - "Password hint shown before blur; validation error shown only after blur + password.length > 0"

patterns-established:
  - "Auth page Server/Client split: Server Component reads searchParams, Client Component handles all interactivity"
  - "Pre-form validation via API call on mount — consistent with setup page checking setupRequired"

requirements-completed: [USER-04]

duration: ~5min
completed: 2026-03-28
---

# Phase 20 Plan 02: Invite Setup Page and API Route Summary

**Atomic invite-to-account setup flow: bcrypt user creation with findOneAndUpdate race guard, token-validate-on-mount UI, and auto sign-in redirect.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-28T21:27:32Z
- **Completed:** 2026-03-28T21:32:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- POST /api/auth/invite-setup validates token, creates User (status='active'), marks invite accepted atomically
- /auth/invite-setup page validates token on mount and renders user-readable error for invalid/expired/used tokens
- Full account setup flow: form submit -> create user -> auto sign-in -> redirect to collection or /collections

## Task Commits

Each task was committed atomically:

1. **Task 1: Create POST /api/auth/invite-setup route handler** - `a483757` (feat)
2. **Task 2: Create /auth/invite-setup page** - `986b2fb` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/app/api/auth/invite-setup/route.ts` - POST handler: token validation, user creation, atomic invite acceptance
- `src/app/auth/invite-setup/page.tsx` - Server Component: reads searchParams.token, passes to InviteSetupForm
- `src/app/auth/invite-setup/InviteSetupForm.tsx` - Client Component: validate-on-mount, form, auto sign-in

## Decisions Made

- **No requireAuth() on POST /api/auth/invite-setup** — invited user has no session when they submit; second documented ARCH-02 bootstrap exception (first is POST /api/auth/setup)
- **findOneAndUpdate with `{ status: 'pending' }` filter** — atomic acceptance prevents a second concurrent request from double-accepting an already-accepted invite
- **status: 'active' explicit on User.create** — Mongoose schema default is 'invited'; leaving it as default would silently block sign-in in the authorize() function
- **Server Component wrapper for searchParams** — avoids the useSearchParams() + Suspense boundary requirement when reading URL params in a Client Component

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Account setup flow complete — invited users can now accept invites end-to-end
- Plan 03 (users management page) can proceed: invite API (Plan 01) and setup page (Plan 02) are both complete
- Race condition on double-submit handled atomically; no additional concurrency concerns for Plan 03

---
*Phase: 20-email-invite-flow-and-account-setup*
*Completed: 2026-03-28*

## Self-Check: PASSED

All files found:
- FOUND: src/app/api/auth/invite-setup/route.ts
- FOUND: src/app/auth/invite-setup/page.tsx
- FOUND: src/app/auth/invite-setup/InviteSetupForm.tsx
- FOUND: .planning/phases/20-email-invite-flow-and-account-setup/20-02-SUMMARY.md

Commits found:
- a483757 — feat(20-02): add POST /api/auth/invite-setup route handler
- 986b2fb — feat(20-02): add /auth/invite-setup page with Server/Client Component split
