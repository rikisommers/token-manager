---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Org User Management
status: in_progress
last_updated: "2026-03-28T21:25:16Z"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 7
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Token collections are always available and editable: stored in MongoDB, accessible via collection-scoped URLs, with per-collection Figma/GitHub config, full CRUD from the collections grid, Figma import/export fully integrated, and a Themes system where each theme is a complete token value set with per-group edit permissions, dark-mode awareness, and theme-targeted export.
**Current focus:** Phase 20 — next phase (Phase 19 RBAC complete)

## Current Position

Phase: 20 of 21 (Email Invite Flow and Account Setup — human verification in progress)
Plan: 04 in progress (20-04 — pre-flight verification complete; awaiting human sign-off on 6 end-to-end scenarios)
Status: Phase 20 Task 1 done; Task 2 human-verify checkpoint active
Last activity: 2026-03-29 — Completed 20-04 Task 1: tsc --noEmit zero errors, all 8 infrastructure checks passed; paused at human-verify checkpoint

Progress: [░░░░░░░░░░] 0% (0/6 phases complete, 3 plans complete in phase 16)

## Performance Metrics

**Velocity (v1.4 reference):**
- Total plans completed (v1.4): 21
- Average duration: ~3-5 min/plan
- Total execution time: ~8 days

**By Phase (v1.4):**

| Phase | Plans | Avg/Plan |
|-------|-------|----------|
| 10. Data Model Foundation | 2 | ~5 min |
| 11. Inline Token Editing UI | 3 | ~4 min |
| 12. Theme-Aware Export | 4 | ~3 min |
| 13. Groups Ordering DnD | 3 | ~5 min |
| 14. Dark Mode Support | 5 | ~3 min |
| 15. Multi-Row Actions | 4 | ~3 min |

*Updated after each plan completion*
| Phase 16 P02 | 4 | 2 tasks | 5 files |
| Phase 16 P03 | 4 | 2 tasks | 3 files |
| Phase 17 P01 | 18 | 2 tasks | 2 files |
| Phase 17 P02 | 5 | 2 tasks | 3 files |
| Phase 17 P03 | 7 | 3 tasks | 4 files |
| Phase 17 P04 | - | 1 task (human-verify) | 0 files |
| Phase 18 P01 | 2 | 2 tasks | 2 files |
| Phase 18 P02 | 4 | 2 tasks | 16 files |
| Phase 19 P01 | 2 | 2 tasks | 3 files |
| Phase 19 P04 | 1 | 1 task | 1 file |
| Phase 19-rbac-and-permissions-context P02 | 3 | 2 tasks | 7 files |
| Phase 19 P03 | 3 | 2 tasks | 9 files |
| Phase 19 P05 | 4 | 1 tasks | 1 files |
| Phase 19 P05 | 5 | 2 tasks | 1 files |
| Phase 19 P06 | 3 | 1 tasks | 1 files |
| Phase 20 P01 | ~30 min | 2 tasks | 9 files |
| Phase 20 P02 | 5 | 2 tasks | 3 files |
| Phase 20 P03 | 3 | 2 tasks | 5 files |
| Phase 20 P04 | 2 | 1 tasks | 0 files |

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table.

Key decisions relevant to v1.5 (from research and 16-01 execution):
- `next@13.5.9` — CVE-2025-29927 (CVSS 9.1) patched; 16-01 also fixed 5 pre-existing TypeScript errors exposed by stricter type checking
- `next-auth@^4.24.13` (not v5) — v5 requires Next.js 14+; project locked at 13.5.6 → 13.5.9
- No `@auth/mongodb-adapter` — Credentials provider requires JWT sessions; adapter is incompatible and creates conflicting MongoClient
- `session: { strategy: "jwt" }` explicit — role and id embedded in JWT via callbacks; never rely on default session strategy
- `crypto.randomBytes(32)` for invite tokens — no `jsonwebtoken` dep needed; SHA-256 hash stored in DB, plaintext sent in email
- JWT role re-fetch every 60s — `roleLastFetched` timestamp in JWT; re-fetch from DB in jwt callback if stale
- `getServerSession()` on every write Route Handler — middleware is UX, not security (CVE-2025-29927 proof)
- `SUPER_ADMIN_EMAIL` enforcement in jwt callback — always overrides DB role; no UI surface needed
- [Phase 16]: Action const object (not enum) for runtime iteration and TypeScript type inference
- [Phase 16]: permissions.ts is canonical Role source of truth; User.ts re-exports it
- [Phase 16]: canPerform is the only exported permission function; no isAdmin/isEditor helpers
- [Phase 16-03]: SUPER_ADMIN_EMAIL enforcement checks token.email (always present) not user?.email (only on initial sign-in)
- [Phase 16-03]: authOptions centralized in src/lib/auth/nextauth.config.ts — single import target for getServerSession() in Phases 18+
- [Phase 16-03]: pages.signIn: '/auth/sign-in' configured now even though page is Phase 17 work
- [Phase 17-02]: AuthProviders is the 'use client' boundary in Server Component layout — valid Next.js App Router pattern
- [Phase 17-02]: SessionProvider must be outer wrapper; PermissionsProvider inner — PermissionsProvider calls useSession() so must be descendant
- [Phase 17-02]: PermissionsContext scaffold minimal by design — Phase 19 expands without layout changes; hook API surface (usePermissions() returning { role, canPerform }) stays identical
- [Phase 17-01]: authorize() throws Error (not returns null) — CredentialsSignin generic error replaced by user-readable messages via NextAuth error URL param
- [Phase 17-01]: Disabled accounts return 'Incorrect password' same as wrong password — no status enumeration risk
- [Phase 17-01]: invited-status users can sign in — only 'disabled' is explicitly blocked at auth layer
- [Phase 17-01]: GET /api/auth/setup includes SUPER_ADMIN_EMAIL only when setupRequired=true — email never exposed post-setup
- [Phase 17-01]: POST /api/auth/setup sets status:'active' explicitly — User schema defaults to 'invited' which would block sign-in
- [Phase 17]: Auth pages (sign-in, setup) have no app shell — isolated centered card layout for pre-auth flows
- [Phase 17]: setupEmail stored from GET /api/auth/setup response in component state (not process.env — server-side only)
- [Phase 17]: router.replace (not push) on setup redirect — prevents back-button return to setup page
- [Phase 17]: UserMenu returns null when no session — Phase 18 middleware will redirect unauthenticated users
- [Phase 17-04]: Phase 17 complete — all 5 auth scenarios verified by human: inline sign-in errors, session persistence, sign-out redirect, setup bootstrap, setup redirect guard
- [Phase 18]: Middleware excludes api/ routes — HTML redirect would break fetch() callers; requireAuth() is the actual API security boundary
- [Phase 18]: getServerSession(authOptions) single-argument form required in App Router — three-argument Pages Router form throws res.getHeader is not a function
- [Phase 18]: requireAuth() returns 401 {error: Unauthorized} — no WWW-Authenticate header needed for session-cookie app; no DB lookup; JWT-only validation
- [Phase 18-02]: 17 handlers guarded with requireAuth(); POST /api/auth/setup is 1 documented bootstrap exception — count > 0 guard prevents abuse post-setup (ARCH-02 satisfied)
- [Phase 18-02]: GET handlers in all modified route files left unguarded — ARCH-02 specifies write handlers only; reads are publicly accessible
- [Phase 18-02]: Guard placed before try{} block in all handlers — early return prevents any business logic executing on unauthenticated requests
- [Phase 19]: requireRole() uses 404 (not 403) for non-Admin with no grant — collection invisible to user
- [Phase 19]: Admin org role bypasses CollectionPermission grant lookup — canPerform('Admin', action) is the only check
- [Phase 19]: bootstrapCollectionGrants() uses countDocuments guard + module-level flag for double idempotency across processes and same-process calls
- [Phase 19]: GET /permissions/me uses direct getServerSession() (not requireAuth()) consistent with Phase 18 pattern for read endpoints
- [Phase 19-04]: canCreate uses orgRole (not effectiveRole) — creating collections is org-level permission, not collection-scoped
- [Phase 19-04]: isAdmin uses orgRole === 'Admin' — Admin status is org-wide, independent of any collection grant
- [Phase 19-04]: Admin short-circuit sets effectiveRole to 'Admin' without fetching /permissions/me — Admin bypasses all collection-level checks
- [Phase 19-04]: PermissionsContextValue interface now exported — required for typed consumers in Phase 20+
- [Phase 19-04]: Named boolean API replaces scaffold { role, canPerform } — usePermissions() returns { canEdit, canCreate, isAdmin, canGitHub, canFigma }
- [Phase 19]: GET /api/collections calls bootstrapCollectionGrants() on every request — idempotent no-op via module-level flag + countDocuments guard
- [Phase 19]: requireRole(action, collectionId) replaces requireAuth() on all collection write handlers — enforces both org role and collection grant
- [Phase 19]: GET /api/collections/[id] returns 404 for non-Admin without grant — collection invisible, not forbidden
- [Phase 19]: POST+DELETE /api/collections/[id]/permissions uses Action.ManageUsers (Admin-only) — no collectionId arg needed
- [Phase 19]: Export/import routes use org-level requireRole() no collectionId — collection-level access gated at UI layer before these operations
- [Phase 19]: Action.ManageUsers for database test/config routes — Admin-only; no Editor or Viewer should reconfigure the database
- [Phase 19]: Action.PushGithub gates both GitHub export and import symmetrically — push and pull share the same privilege level
- [Phase 19]: Phase 19 RBAC verified complete — Admin access, API enforcement, bootstrap, and usePermissions() all approved by human
- [Phase 19]: GET /api/github/branches guarded with requireRole(Action.PushGithub) — listing branches is a GitHub privilege, not a public read; PERM-03 fully satisfied
- [Phase 20-01]: resend added to serverComponentsExternalPackages — prevents webpack bundling @react-email/render (optional peer dep that isn't installed)
- [Phase 20-01]: POST /api/invites rolls back Invite document if Resend email fails — delete-on-error atomicity pattern
- [Phase 20-01]: GET /api/invites/validate is public (no requireRole) — must be reachable pre-login when invited user lands on setup page
- [Phase 20-01]: Duplicate check covers both active User account and pending non-expired Invite; both return 409
- [Phase 20]: POST /api/auth/invite-setup has no requireAuth() — invited user has no session; second ARCH-02 bootstrap exception
- [Phase 20]: findOneAndUpdate with { status: 'pending' } filter for atomic invite acceptance — prevents race on double-submit
- [Phase 20]: User created with status='active' explicitly — Mongoose default is 'invited' which blocks sign-in in authorize()
- [Phase 20]: Server Component wrapper reads searchParams.token and passes as prop — avoids useSearchParams() + Suspense boundary in Client Component
- [Phase 20]: toLocaleDateString() used instead of date-fns (not installed in project)
- [Phase 20]: /org/users uses 'use client' for useState invite list and modal state management
- [Phase 20]: Admin-only nav items via spread conditional array: ...(isAdmin ? [{...}] : []) in OrgSidebar navItems

### Pending Todos

None.

### Blockers/Concerns

- ~~CVE-2025-29927: Next.js 13.5.6 middleware auth bypass (CVSS 9.1)~~ — RESOLVED in 16-01: patched to next@13.5.9
- Per-collection override loading strategy (PERM-04) unresolved — lazy fetch on collection page mount vs. eager load of all user overrides at session start; resolve during Phase 19 planning
- Resend domain verification required for production — `onboarding@resend.dev` works in dev; production needs verified sending domain (operational gap, not code gap)
- Sign-in rate limiting deferred — `POST /api/auth/callback/credentials` unprotected against brute force; acceptable for internal tool; document in Phase 18 plan

## Session Continuity

Last session: 2026-03-29T00:00:00Z
Stopped at: 20-04-PLAN.md Task 2 human-verify checkpoint — pre-flight passed; 6 end-to-end invite scenarios awaiting human approval
Resume file: None
