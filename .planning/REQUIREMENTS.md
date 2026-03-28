# Requirements: ATUI Tokens Manager

**Defined:** 2026-03-28
**Core Value:** Token collections are always available and editable: stored in MongoDB, accessible via collection-scoped URLs, with per-collection Figma/GitHub config, full CRUD from the collections grid, Figma import/export fully integrated, and a Themes system where each theme is a complete token value set with per-group edit permissions, dark-mode awareness, and theme-targeted export.

## v1.5 Requirements

Requirements for v1.5 Org User Management milestone. Each maps to roadmap phases 16+.

### Authentication (AUTH)

- [ ] **AUTH-01**: User can sign in with email and password
- [ ] **AUTH-02**: Unauthenticated users are redirected to the sign-in page
- [ ] **AUTH-03**: Signed-in session persists across browser refresh (JWT)
- [ ] **AUTH-04**: User can sign out from any page
- [ ] **AUTH-05**: First user to complete registration is automatically granted the Admin role
- [ ] **AUTH-06**: A superadmin account is configured via `SUPER_ADMIN_EMAIL` environment variable; this account always has Admin access and cannot be removed or downgraded by any user action (enforced in JWT callback on every sign-in)

### User Management (USER)

- [ ] **USER-01**: Admin can view a list of all org members with their roles and status
- [ ] **USER-02**: Admin can invite a new user by entering their email address
- [ ] **USER-03**: Invited user receives an email with a magic link to create their account (sent via Resend)
- [ ] **USER-04**: Invited user can set display name and password during account setup
- [ ] **USER-05**: Admin can change an existing user's org-level role (Admin / Editor / Viewer)
- [ ] **USER-06**: Admin can remove a user from the org
- [ ] **USER-07**: Pending invitations are visible in the Users list with expiry status

### Permissions (PERM)

- [ ] **PERM-01**: Admin role grants full access — user management, create/delete collections, read-write on all collections, GitHub push/pull, Figma push/pull
- [ ] **PERM-02**: Editor role grants read-write on all collections, create collections, GitHub push/pull, Figma push/pull (no user management)
- [ ] **PERM-03**: Viewer role grants read-only access to all collections; no create, no push/pull, no user management
- [ ] **PERM-04**: Admin can set a per-collection access override for any user (e.g. downgrade an Editor to Viewer on one specific collection)
- [ ] **PERM-05**: All existing MongoDB collections are assigned to the first Admin user after auth is introduced (one-time migration at bootstrap)
- [ ] **PERM-06**: Permissions are available globally via a React context (`PermissionsProvider` + `usePermissions()`) so any client component can check access without prop drilling

### Protected UI (UI)

- [ ] **UI-01**: Token table data and graph data are always visible to all authenticated users; inline edit controls (value fields, rename, bulk action triggers) are **disabled** for users with read-only access on the active collection
- [ ] **UI-02**: The create-collection button/flow is **hidden** for users without create-collection permission (Viewer)
- [ ] **UI-03**: GitHub push/pull controls are **hidden** for users without GitHub permission (Viewer)
- [ ] **UI-04**: Figma push/pull controls are **hidden** for users without Figma permission (Viewer)

### Architecture Constraint (ARCH)

- [ ] **ARCH-01**: Auth infrastructure lives in isolated modules — `src/lib/auth/` (authOptions, helpers, models), `src/app/api/auth/` (NextAuth route handler), `src/app/auth/` (sign-in, invite setup pages) — never mixed with existing token/collection code
- [ ] **ARCH-02**: All 18 existing write Route Handlers are guarded with `getServerSession()` / `requireAuth()` — middleware alone is not a security boundary

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Tree Mutations (from v1.2/v1.3)

- **TREE-05**: Tree nodes can be expanded and collapsed (expand/collapse toggle per node)
- **TREE-04**: User can add a new group from the tree sidebar (child of any node, or at root level)
- **CONT-02**: User can add tokens to the currently selected group inline

### User Management (future)

- **USER-08**: OAuth / SSO login providers (Google, GitHub)
- **USER-09**: User profile / avatar management
- **USER-10**: Activity audit log

### Permissions (future)

- **PERM-07**: Per-permission toggle granularity beyond named roles (e.g. Viewer with Figma export)
- **PERM-08**: Multi-org / multi-tenant support

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth / SSO providers | Email/password sufficient for v1.5; can add in future milestone |
| Per-permission toggles beyond named roles | Admin/Editor/Viewer roles cover current use case |
| Multi-org / tenant support | Single org now; userId field in schema ready for future extension |
| User profile / avatar management | Not core to token management use case |
| Activity audit log | Deferred; MongoDB timestamps provide basic trail |
| Real-time collaboration | No concurrent edit handling |
| Token versioning / history | MongoDB timestamps provide basic backup |
| Angular / Stencil / Vite workspaces | Explicitly excluded; Angular port is a future milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 16 | Pending |
| AUTH-06 | Phase 16 | Pending |
| AUTH-01 | Phase 17 | Pending |
| AUTH-03 | Phase 17 | Pending |
| AUTH-04 | Phase 17 | Pending |
| AUTH-05 | Phase 17 | Pending |
| AUTH-02 | Phase 18 | Pending |
| ARCH-02 | Phase 18 | Pending |
| PERM-01 | Phase 19 | Pending |
| PERM-02 | Phase 19 | Pending |
| PERM-03 | Phase 19 | Pending |
| PERM-04 | Phase 19 | Pending |
| PERM-05 | Phase 19 | Pending |
| PERM-06 | Phase 19 | Pending |
| USER-02 | Phase 20 | Pending |
| USER-03 | Phase 20 | Pending |
| USER-04 | Phase 20 | Pending |
| USER-07 | Phase 20 | Pending |
| USER-01 | Phase 21 | Pending |
| USER-05 | Phase 21 | Pending |
| USER-06 | Phase 21 | Pending |
| UI-01 | Phase 21 | Pending |
| UI-02 | Phase 21 | Pending |
| UI-03 | Phase 21 | Pending |
| UI-04 | Phase 21 | Pending |

**Coverage:**
- v1.5 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 — traceability complete after roadmap creation*
