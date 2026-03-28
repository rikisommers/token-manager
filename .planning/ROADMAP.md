# Roadmap: ATUI Tokens Manager

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-02-28)
- ✅ **v1.1 shadcn UI** — Phases 1-4 (shipped 2026-03-12)
- ✅ **v1.2 Token Groups Tree** — Phases 5-6 (shipped 2026-03-13; Phase 7 Mutations deferred)
- ✅ **v1.3 Add Tokens Modes** — Phases 8-9 (shipped 2026-03-19)
- ✅ **v1.4 Theme Token Sets** — Phases 10-15 (shipped 2026-03-27)
- 🚧 **v1.5 Org User Management** — Phases 16-21 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-7) — SHIPPED 2026-02-28</summary>

- [x] **Phase 1: Database Foundation** — MongoDB connection, Mongoose schema, seed script
- [x] **Phase 2: View Integration** — Browse and display collections from MongoDB
- [x] **Phase 3: Generator Form** — Save/load/update/dirty-flag cycle
- [x] **Phase 4: Collection Management** — Delete, rename, duplicate actions
- [x] **Phase 5: Export Style Dictionary** — Build pipeline + ZIP download
- [x] **Phase 6: Collection UX Improvements** — UX polish across collection flows
- [x] **Phase 7: Fix Figma Integration** — Figma import/export, proxy routes, source context bar

See: `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

</details>

<details>
<summary>✅ v1.1 shadcn UI (Phases 1-4) — SHIPPED 2026-03-12</summary>

- [x] **Phase 1: shadcn UI + Color Pickers** — All UI migrated to shadcn/ui, color pickers
- [x] **Phase 2: Test ATUI Component Library** — ATUI Stencil integration pattern established
- [x] **Phase 3: App Layout UX** — Persistent sidebar, scoped pages, collection-scoped routing
- [x] **Phase 4: Collection Management** — Card grid, CRUD, per-collection config persistence

See: `.planning/milestones/v1.1-ROADMAP.md` for full phase details.

</details>

<details>
<summary>✅ v1.2 Token Groups Tree (Phases 5-6) — SHIPPED 2026-03-13</summary>

- [x] **Phase 5: Tree Data Model** — Parse group path names into `TokenGroup[]` tree; render collapsible nodes in sidebar
- [x] **Phase 6: Selection + Breadcrumbs + Content Scoping** — Node selection drives breadcrumbs; content scoped to selected group's direct tokens
- [ ] ~~**Phase 7: Mutations**~~ — *(deferred: add group from tree, add/edit tokens in selected group — moved to v1.5)*

See: `.planning/milestones/v1.3-ROADMAP.md` for archived phase details.

</details>

<details>
<summary>✅ v1.3 Add Tokens Modes (Phases 8-9) — SHIPPED 2026-03-19</summary>

- [x] **Phase 8: Clean Code** — Dead code removal, TS errors fixed, component domain reorganization, SRP extraction, e2e verified
- [x] **Phase 9: Add Tokens Modes** — Themes data model + CRUD API, Themes page UI, Themes nav + token page theme selector, e2e verified

See: `.planning/milestones/v1.3-ROADMAP.md` for full phase details.

</details>

<details>
<summary>✅ v1.4 Theme Token Sets (Phases 10-15) — SHIPPED 2026-03-27</summary>

- [x] **Phase 10: Data Model Foundation** — Extend ITheme with embedded tokens, deep-copy on creation, migration script, theme count guard (completed 2026-03-19)
- [x] **Phase 11: Inline Token Editing UI** — PATCH API endpoint + theme token overlay, group-state-aware save routing, override indicator (completed 2026-03-19)
- [x] **Phase 12: Theme-Aware Export** — Config page theme selector, SD export uses theme tokens, Figma export generates one mode per enabled theme (completed 2026-03-20)
- [x] **Phase 13: Groups Ordering Drag and Drop** — @dnd-kit sidebar tree, sibling reorder + reparent, MongoDB persist, theme cascade, undo stack (completed 2026-03-21)
- [x] **Phase 14: Dark Mode Support** — colorMode field + badge UI, combined CSS export, Figma Light/Dark mode pairing (completed 2026-03-26)
- [x] **Phase 15: Multi-Row Actions** — Always-visible checkboxes, floating Menubar action bar, bulk delete/move/change-type/prefix with live editing and undo (completed 2026-03-27)

See: `.planning/milestones/v1.4-ROADMAP.md` for full phase details.

</details>

### 🚧 v1.5 Org User Management (In Progress)

**Milestone Goal:** Add authentication and org-level user management so multiple users can collaborate on token collections with role-based access control.

- [x] **Phase 16: Auth Infrastructure and Security Baseline** — Patch CVE-2025-29927, install packages, Mongoose models, authOptions, permissions pure function (completed 2026-03-28)
- [ ] **Phase 17: Auth API Routes and Sign-In Flow** — NextAuth route handler, first-user bootstrap, sign-in and sign-out pages, SessionProvider wiring
- [ ] **Phase 18: Middleware and Route Handler Guards** — withAuth middleware, requireAuth() utility, all 18 existing write Route Handlers guarded
- [ ] **Phase 19: RBAC and Permissions Context** — PermissionsProvider, usePermissions() hook, role enforcement on write routes, JWT role re-fetch, per-collection overrides
- [ ] **Phase 20: Email Invite Flow and Account Setup** — Resend invite email, invite token generation, account setup page, invite management
- [ ] **Phase 21: Org Users Admin UI and Permission-Gated UI** — /org/users admin page, role change and removal API, write controls hidden for Viewer

## Phase Details

### Phase 16: Auth Infrastructure and Security Baseline
**Goal**: Secure foundation is in place — CVE patched, packages installed, Mongoose models defined, authOptions configured with JWT strategy and superadmin enforcement, permissions pure function established
**Depends on**: Phase 15 (v1.4 complete)
**Requirements**: ARCH-01, AUTH-06
**Success Criteria** (what must be TRUE):
  1. `next@13.5.9` is installed and `yarn build` passes with zero TypeScript errors
  2. `User`, `Invite`, and `CollectionPermission` Mongoose models exist in `src/lib/db/models/` with correct schemas
  3. `src/lib/auth/` module exists with `nextauth.config.ts` (authOptions), `permissions.ts` (pure canPerform function), and `invite.ts` (token utility) — no auth code outside this module
  4. JWT and session TypeScript module augmentation compiles and carries `id` and `role` fields at runtime (verified with a live sign-in smoke test)
  5. `SUPER_ADMIN_EMAIL` env var is read in the jwt callback; signing in as that email always produces role=Admin in the JWT regardless of what is stored in the DB
**Plans**: 3 plans

Plans:
- [ ] 16-01-PLAN.md — Patch CVE-2025-29927, install next-auth + bcryptjs, add TypeScript module augmentation
- [ ] 16-02-PLAN.md — Create permissions.ts, invite.ts, and three Mongoose models (User, Invite, CollectionPermission)
- [ ] 16-03-PLAN.md — Create authOptions (nextauth.config.ts), NextAuth route handler, add env vars to .env.local

### Phase 17: Auth API Routes and Sign-In Flow
**Goal**: Users can sign in, stay signed in across refresh, and sign out — the full auth round-trip works end to end
**Depends on**: Phase 16
**Requirements**: AUTH-01, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. User can navigate to `/auth/sign-in`, enter email and password, and be redirected to the app on success
  2. After signing in, refreshing the browser keeps the user signed in (JWT session persists)
  3. User can sign out from any page and is redirected to `/auth/sign-in`
  4. The first user to complete registration (no other users exist in the DB) is automatically assigned the Admin role
  5. `SessionProvider` and `PermissionsProvider` are wired into `LayoutShell` so session data is available to all client components
**Plans**: TBD

### Phase 18: Middleware and Route Handler Guards
**Goal**: Unauthenticated users are blocked at every entry point — middleware redirects unauthenticated page requests and all 18 write Route Handlers return 401 without a valid session
**Depends on**: Phase 17
**Requirements**: AUTH-02, ARCH-02
**Success Criteria** (what must be TRUE):
  1. Visiting any app page without a session cookie redirects to `/auth/sign-in`
  2. Sending a write request (PUT, POST, PATCH, DELETE) to any existing collection or theme API route without a session cookie returns HTTP 401
  3. A curl request with a crafted `x-middleware-subrequest` header (CVE-2025-29927 exploit vector) does not bypass auth on Next.js 13.5.9
  4. `requireAuth()` utility exists in `src/lib/auth/` and is called at the top of all 18 write Route Handlers
**Plans**: TBD

### Phase 19: RBAC and Permissions Context
**Goal**: Roles are enforced on all write API routes and available globally in the React tree — every component can check permissions without prop drilling
**Depends on**: Phase 18
**Requirements**: PERM-01, PERM-02, PERM-03, PERM-04, PERM-05, PERM-06
**Success Criteria** (what must be TRUE):
  1. A Viewer session receives HTTP 403 when attempting any write operation (token edit, collection create/delete, GitHub push, Figma push)
  2. An Editor session can perform all write operations except user management (invite, role change, remove user)
  3. An Admin session has unrestricted access to all operations including user management
  4. `usePermissions()` hook is accessible from any client component and returns pre-computed booleans (`canEdit`, `canCreate`, `isAdmin`, `canGitHub`, `canFigma`) without additional props
  5. An Admin can set a per-collection override for a specific user; that override is reflected in the permissions context within 60 seconds without requiring sign-out
  6. All existing MongoDB collections are backfilled to the first Admin user at bootstrap
**Plans**: TBD

### Phase 20: Email Invite Flow and Account Setup
**Goal**: An Admin can invite a new user by email; the invited user receives a link, sets their display name and password, and gains access — pending invites are visible with expiry status
**Depends on**: Phase 19
**Requirements**: USER-02, USER-03, USER-04, USER-07
**Success Criteria** (what must be TRUE):
  1. Admin can enter an email address and role, submit the invite form, and a Resend email is delivered to that address containing a unique setup link
  2. Clicking the setup link opens an account setup page where the invited user can enter their display name and password
  3. After completing account setup, the invited user is signed in and can access the app with their assigned role
  4. The invite link is single-use (clicking it a second time after account setup returns an error page)
  5. Pending invitations appear in the org users list with an expiry badge showing whether the invite is active or expired
**Plans**: TBD

### Phase 21: Org Users Admin UI and Permission-Gated UI
**Goal**: Admin can manage all org members from a dedicated page, and write controls in existing collection UI are hidden for users who cannot perform those actions
**Depends on**: Phase 20
**Requirements**: USER-01, USER-05, USER-06, UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. Admin can navigate to `/org/users` and see a table of all org members with their name, email, role, and status (active / pending invite)
  2. Admin can change any non-superadmin user's org-level role using a role selector; the change takes effect within 60 seconds for the affected user without requiring sign-out
  3. Admin can remove any non-superadmin user from the org; removed users are immediately redirected to sign-in on their next request
  4. Token table edit fields and bulk action controls are visible but non-interactive (disabled) for users with read-only access on the active collection
  5. The create-collection button and flow are not visible to Viewer users
  6. GitHub push/pull controls are not visible to Viewer users
  7. Figma push/pull controls are not visible to Viewer users
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Database Foundation | v1.0 | 3/3 | Complete | 2026-02-25 |
| 2. View Integration | v1.0 | 2/2 | Complete | 2026-02-25 |
| 3. Generator Form | v1.0 | 4/4 | Complete | 2026-02-26 |
| 4. Collection Management | v1.0 | 3/3 | Complete | 2026-02-26 |
| 5. Export Style Dictionary | v1.0 | 2/2 | Complete | 2026-02-26 |
| 6. Collection UX Improvements | v1.0 | 2/3 | Complete | 2026-02-28 |
| 7. Fix Figma Integration | v1.0 | 6/6 | Complete | 2026-02-28 |
| 1. shadcn UI Components | v1.1 | 5/5 | Complete | 2026-03-09 |
| 2. Test ATUI Component Library | v1.1 | 1/1 | Complete | 2026-03-01 |
| 3. App Layout UX | v1.1 | 4/4 | Complete | 2026-03-11 |
| 4. Collection Management (grid + routing + config) | v1.1 | 6/6 | Complete | 2026-03-12 |
| 5. Tree Data Model | v1.2 | 2/2 | Complete | 2026-03-13 |
| 6. Selection + Breadcrumbs + Content Scoping | v1.2 | 3/3 | Complete | 2026-03-13 |
| 8. Clean Code | v1.3 | 5/5 | Complete | 2026-03-16 |
| 9. Add Tokens Modes | v1.3 | 4/4 | Complete | 2026-03-19 |
| 10. Data Model Foundation | v1.4 | 2/2 | Complete | 2026-03-19 |
| 11. Inline Token Editing UI | v1.4 | 3/3 | Complete | 2026-03-19 |
| 12. Theme-Aware Export | v1.4 | 4/4 | Complete | 2026-03-20 |
| 13. Groups Ordering Drag and Drop | v1.4 | 3/3 | Complete | 2026-03-21 |
| 14. Dark Mode Support | v1.4 | 5/5 | Complete | 2026-03-26 |
| 15. Multi-Row Actions | v1.4 | 4/4 | Complete | 2026-03-27 |
| 16. Auth Infrastructure and Security Baseline | 3/3 | Complete   | 2026-03-28 | - |
| 17. Auth API Routes and Sign-In Flow | v1.5 | 0/TBD | Not started | - |
| 18. Middleware and Route Handler Guards | v1.5 | 0/TBD | Not started | - |
| 19. RBAC and Permissions Context | v1.5 | 0/TBD | Not started | - |
| 20. Email Invite Flow and Account Setup | v1.5 | 0/TBD | Not started | - |
| 21. Org Users Admin UI and Permission-Gated UI | v1.5 | 0/TBD | Not started | - |
