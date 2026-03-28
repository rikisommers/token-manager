# Feature Research

**Domain:** Org user management + authentication for a Next.js design token tool (v1.5 milestone)
**Researched:** 2026-03-28
**Confidence:** HIGH (core auth + RBAC patterns), MEDIUM (invite flow edge cases), HIGH (hide vs disable UI patterns)

---

## Context: What Already Exists

This is a subsequent milestone. The following features are already built and must not be re-planned:

- MongoDB collection CRUD (TokenCollection model, `userId` field nullable — designed for this upgrade)
- Figma and GitHub integrations (push/pull controls)
- Theme system, token table, graph editor
- Collection-scoped routing (`/collections/[id]/...`)
- shadcn/ui component system throughout

The v1.5 milestone adds: email/password auth, email invite flow, Admin/Editor/Viewer RBAC, per-collection permission overrides, org users admin page, global permissions React context, and superadmin via env var.

---

## Feature Landscape

### Auth: Email / Password Sign-In

#### Table Stakes

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| Email + password sign-in form | Users expect a username/password gate as the minimum credential type; no auth = no multi-user | LOW | NextAuth.js CredentialsProvider + JWT session strategy |
| Session persists across refresh | Standard browser expectation; losing session on refresh is broken UX | LOW | NextAuth.js JWT cookie (`httpOnly`) |
| Sign-out from any page | User can always exit their session; accessible from nav or avatar | LOW | NextAuth.js `signOut()`, sidebar nav item |
| Redirect unauthenticated users to sign-in | Protecting all routes is baseline; unauthenticated users must not see any collection data | LOW | Next.js `middleware.ts` with `withAuth` or custom session check |
| Sign-in page accessible without auth | Sign-in page itself must not require a session | LOW | middleware matcher excludes `/auth/...` routes |
| Signed-in session includes role | Role must travel in the session JWT to avoid per-request DB lookups in middleware | LOW | NextAuth.js `callbacks.jwt` + `callbacks.session` |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Superadmin via env var (`SUPER_ADMIN_EMAIL`) | Prevents lockout if last Admin is removed; bootstrap safety net; no UI surface needed | LOW | Check at sign-in: if email matches env var, force role = Admin regardless of DB |
| First-registrant becomes Admin | Zero-config onboarding: the first user to complete account setup is automatically Admin | LOW | Count users at registration time; if `count === 0`, assign Admin role |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| OAuth / SSO (Google, GitHub login) | Users have existing Google/GitHub accounts | Adds significant complexity: OAuth redirect flows, account linking, provider config; out of scope for v1.5 | Explicitly deferred; email/password covers internal tool use case |
| "Remember me" checkbox | Users expect long-lived sessions | NextAuth.js JWT sessions already persist by default via `httpOnly` cookie; an explicit toggle adds complexity for no gain | Default session duration covers the need |
| Password strength meter on sign-in | Security polish | Sign-in is not the right place; belongs on the account setup (invite acceptance) form only | Apply on the account-creation form |

---

### Auth: Email Invite Flow (Magic Link Account Setup)

The invite flow is distinct from auth: it is how new users are enrolled into the org without self-registration. Invitees do not sign up on their own — an Admin sends an invite, the invitee clicks a one-time link, and sets their name + password.

#### Table Stakes

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| Admin enters invitee email + role, triggers invite send | Standard invitation entry point for any team tool | LOW | Admin-only Users page, Resend email API |
| Invitee receives email with magic link | Invite email with a CTA button is the universal invite pattern; no email = no onboarding | MEDIUM | Resend transactional email, invite token stored in DB |
| Magic link is one-time-use and expires | Open-ended tokens are a security risk; expired email addresses can be recycled | MEDIUM | Crypto-random token (`crypto.randomBytes`), expiry timestamp (72h standard), invalidate on first use |
| Clicking the link opens an account-setup form (name + password) | Invitee must set their own credentials; pre-filled email; name and password required | LOW | Invite token lookup page at `/auth/accept-invite/[token]` |
| Pending invites are visible in the Users admin list | Admins need to see who has not yet accepted to follow up or resend | LOW | `status: "pending"` field on user/invite document |
| Admin can resend an expired or pending invite | Invitee may miss the email; re-send recreates the link with a fresh expiry | LOW | Resend invite action: regenerate token, reset expiry, re-send email |
| Admin can revoke a pending invite | Security hygiene: wrong email, person left the org | LOW | Delete invite document or mark `status: "revoked"` |
| Invite accepted user is active and can sign in immediately | After completing account setup the user is created with `status: "active"` and the invite token is deleted | LOW | User creation at invite acceptance, token cleanup |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Role assigned at invite time | Admin chooses the role when sending the invite rather than after the user joins — less back-and-forth | LOW | Store `role` in invite document; apply at acceptance |
| Expiry status visible in the Users list | Admins can see "Expires in 2 days" vs "Expired 3 days ago" at a glance | LOW | Display `expiresAt` relative to now; surface as badge ("Pending", "Expired") |
| Invite email includes sender context | Email states "You were invited by [Admin Name] to [Tool Name]" — establishes trust | LOW | Include inviter name in email template |

#### Edge Cases (Must Handle Correctly)

These are the gaps that cause bugs in invite flows if not planned for:

| Edge Case | What Goes Wrong | Correct Behavior |
|-----------|-----------------|-----------------|
| Link clicked after expiry | User sees a confusing error or broken page | Show a clear "This invite link has expired" page with a note to ask the Admin to resend |
| Same email invited twice (re-invite before acceptance) | Duplicate pending invites; two tokens both valid | Upsert: regenerate the token on re-invite for the same email; only one pending invite per email at a time |
| Invited user already has an account (email matches existing user) | Duplicate user records or silent failure | Detect at invite creation: if email already exists as an active user, show error "User already exists" — do not send invite |
| Invitee tries to use link on a different device/browser | Stateless magic link must not rely on session or cookies set at link-click time | Token is validated server-side by DB lookup only; device-agnostic |
| Admin changes invitee's role after invite is sent but before acceptance | Invite email says "Editor", but role may be stale by acceptance time | Store role in invite doc; role is final at acceptance time; Admin can revoke + re-invite if needed |
| Admin removes user while invite is still pending | Orphaned invite remains in DB | When an Admin removes a pending user, also purge their invite document |
| Invitee ignores invite; Admin resends; original link is still valid | Two active tokens for the same invite | Invalidate the previous token when resending; only one active token per pending invite |
| Account setup form submitted with weak password | Silent acceptance of weak passwords | Enforce minimum password requirements (length ≥ 8, at minimum) on the account-setup form server-side |

---

### RBAC: Role-Based Access Control

Three named roles — Admin, Editor, Viewer — with one per-collection override mechanism.

#### Table Stakes

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| Admin role: full access including user management | Standard "owner" role for any team tool with user management | LOW | Role stored in user JWT session; checked in middleware and API routes |
| Editor role: create + read/write collections, GitHub push/pull, Figma push/pull, no user management | Standard "contributor" role; can do everything except manage other users | LOW | Role check in API routes and permission context |
| Viewer role: read-only across all collections, no create, no push/pull | Standard "read-only" role for stakeholders or external collaborators | LOW | Role check in every write API route and in permission context |
| All write API routes check role server-side | Client-side hiding is not security; API routes must enforce | MEDIUM | Role from NextAuth.js session, checked in every mutating route |
| Middleware protects all non-auth routes | Unauthenticated requests never reach collection data | LOW | `middleware.ts` with `withAuth`, matcher excludes `/auth/...` |
| Role is available in session without DB lookup | Checking role per request via DB is slow and error-prone | LOW | Role stored in JWT via `callbacks.jwt`; surface in `callbacks.session` |
| First user auto-assigned Admin | No manual bootstrapping step; zero-config | LOW | Check `userCount === 0` at first registration/invite acceptance |
| Superadmin bypass: env var email always Admin | Lockout prevention; env var is simpler than a separate user type | LOW | Checked at JWT creation time; does not require a special DB role |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-collection permission override | An Admin can grant a Viewer elevated access to a specific collection, or restrict an Editor from a sensitive collection | MEDIUM | Stored as `collectionOverrides: [{ collectionId, role }]` on user document; resolved at request time: override role wins over org role for that collection |
| Permission context propagated via React context | No prop drilling; any component can call `usePermissions()` to get current user's effective role for the active resource | MEDIUM | `PermissionsProvider` wraps the app; `usePermissions(collectionId?)` resolves effective role |
| "Owned by first Admin" migration for existing collections | All existing MongoDB collections (with nullable `userId`) are attributed to the first Admin user at migration time | LOW | One-time migration at first user creation: `userId` backfilled on all existing collections |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Per-permission toggles beyond named roles | Fine-grained "can this user export to Figma but not GitHub?" | Role explosion and admin UI complexity grow fast; the three named roles cover all current use cases | Keep named roles; defer custom permission matrices to v2+ if customers request it |
| Per-token or per-group permissions | Maximum granularity | Extremely complex to enforce across inline editing, graph editor, and exports; not needed for an internal team tool | Collection-level override is the right granularity for this product |
| Custom role creation | Enterprise flexibility | Named roles already cover the use case; custom roles require a permission matrix editor and complex inheritance logic | Three roles + per-collection override is sufficient for v1.5 |

---

### Permission UI: Hiding and Disabling Controls

This governs how the existing UI adapts to the current user's effective permissions.

#### Table Stakes

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| Write controls hidden for Viewer (not just disabled) | Viewers should not see controls they can never use; hidden = cleaner, less confusing | LOW | `usePermissions()` + conditional rendering; affects TokenTable, BulkActionBar, theme CRUD |
| Create-collection button hidden for Viewer | Viewers cannot create; the button should not appear at all | LOW | Collections grid page — show "New Collection" only if `canCreate` |
| GitHub push/pull controls hidden for Viewer | Viewer has no GitHub access; controls serve no purpose | LOW | Collection Config page GitHub section |
| Figma push/pull controls hidden for Viewer | Same as GitHub | LOW | Collection Config page Figma section |
| Write controls disabled (not hidden) for Editor editing a read-only group state | Disabled makes sense when the restriction is temporary/contextual (Source group = read-only); the user has write permission but this resource is in read-only mode | LOW | Token table: Source group tokens show disabled inputs — already handling this for theme Source groups |
| Permission checks happen server-side on all API routes | UI hiding is UX, not security; every write API route must verify role | MEDIUM | NextAuth.js `getServerSession()` in each API route handler |
| Disabled controls show a tooltip explaining why | "You don't have permission" is unhelpful; "This group is read-only in the current theme" is actionable | LOW | shadcn Tooltip on disabled inputs/buttons |

#### Decision Rule for Hide vs Disable

Derived from established UX research (Smashing Magazine, Smart Interface Design Patterns):

- **Hide** when: The user's role means they will **never** be able to perform this action under any circumstance. Example: Viewer role seeing "Export to GitHub". Hiding reduces cognitive load and avoids false expectations.
- **Disable** when: The user **could** perform this action under different conditions (different resource state, waiting for something). Example: an Editor on a Source-state group (read-only because of theme semantics, not role). Disabling signals the action exists but is temporarily unavailable; always pair with a tooltip.
- **Never disable without explanation**: A disabled button without context is worse than hidden — it suggests the app is broken.

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-collection override reflected in UI instantly | If an Admin grants a Viewer elevated access to Collection A, that Viewer's UI for Collection A updates without re-login | MEDIUM | Permissions context derives effective role from `usePermissions(collectionId)` on each navigation |
| User management page visible only to Admins | The `/admin/users` page (or equivalent) is not linked in nav for non-Admins; direct URL access redirects | LOW | Middleware role check + nav conditional rendering |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Showing all controls to all users and displaying permission error after clicking | "Optimistic UI" approach | Creates frustration; user performs action, gets blocked at the last step; negative surprise | Hide controls for roles that can never use them; disable only for temporary restrictions |
| Greying out entire pages for Viewer | Visual indicator of restricted access | A Viewer visiting a collection page should still see all read-only content; greying out the whole page obscures useful information | Show content fully, hide or disable write controls only |

---

### Org Users Admin Page

The admin surface for managing org members, invites, and roles.

#### Table Stakes

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| List all org members with role and status | Admins need a full picture of who has access and at what level | LOW | User model query; display in a table with name, email, role, status columns |
| "Invite User" flow triggered from this page | Invitation originates here; single entry point | LOW | Form: email input + role selector; triggers invite email |
| Pending invites visible in the list with expiry status | Unaccepted invites are a security concern; Admins need to track them | LOW | `status: "pending"` rows with expiry badge |
| Change an existing user's org-level role | Role management is a core Admin capability | LOW | Inline role selector or modal; triggers `PATCH /api/users/[id]/role` |
| Remove a user from the org | Offboarding is a core Admin capability | LOW | Confirm dialog + `DELETE /api/users/[id]`; also purges pending invites for that email |
| Resend invite for pending invites | Email may have gone to spam; Admin needs a resend path | LOW | "Resend" action on pending invite rows; regenerates token + resends email |
| Revoke pending invite | Sent to wrong email or person no longer joining | LOW | "Revoke" action deletes the invite document |
| Admins cannot remove themselves | Self-removal would create a lockout if they are the last Admin | LOW | Disable "Remove" action for own row; server-side guard also required |
| Admins cannot downgrade themselves if last Admin | Same lockout prevention | LOW | Server-side check: if demoting last Admin, reject with 409 |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-collection override management surface | Admin can assign an override role per user per collection from this page | MEDIUM | Expandable row or side panel showing collection list with override selectors |
| Invite expiry shown as relative time ("Expires in 2 days") | Clearer than raw ISO timestamp; makes urgency actionable | LOW | `dayjs` or `date-fns` relative formatting |

---

## Feature Dependencies

```
[NextAuth.js session with role in JWT]
    └──required-by──> [Middleware route protection]
    └──required-by──> [API route role checks]
    └──required-by──> [PermissionsContext + usePermissions()]
    └──required-by──> [Permission-driven UI hiding/disabling]

[User model in MongoDB]
    └──required-by──> [Email/password sign-in]
    └──required-by──> [Invite flow: pending user storage]
    └──required-by──> [Role management (change role, remove user)]
    └──required-by──> [Per-collection override storage]

[Invite token model in MongoDB]
    └──required-by──> [Send invite email]
    └──required-by──> [Accept invite / account setup]
    └──required-by──> [Resend + revoke invite]
    └──required-by──> [Pending invites list in admin UI]

[Resend email integration]
    └──required-by──> [Send invite email]
    └──required-by──> [Resend invite action]

[PermissionsContext (React context)]
    └──required-by──> [Write control hiding (UI-01 through UI-04)]
    └──required-by──> [Per-collection override reflected in UI]
    └──requires──> [NextAuth.js session with role]
    └──requires──> [Per-collection override data from API]

[Per-collection permission override (DB + API)]
    └──required-by──> [Per-collection override in PermissionsContext]
    └──required-by──> [Admin user management page override section]
    └──requires──> [User model]
    └──requires──> [Collection ID accessible in current route context]

[Org Users admin page]
    └──requires──> [User model + invite token model]
    └──requires──> [Invite flow complete]
    └──requires──> [Role management API]

[Existing write controls (TokenTable, BulkActionBar, Config page)]
    └──enhanced-by──> [PermissionsContext hiding/disabling]
    └──no structural change needed: controls already isolated in components]
```

### Dependency Notes

- **Session with role is the foundation.** Everything — middleware, API enforcement, UI context — depends on the JWT containing the user's effective org role. This must be the first thing wired up.
- **User + invite models must exist before any invite or admin UI work.** Two separate concerns: `User` (active accounts, roles, overrides) and `InviteToken` (pending invites with expiry). Keep them separate; do not conflate pending invites with active users.
- **PermissionsContext depends on session, not on the admin page.** The context is used app-wide; the admin page is just one consumer. Wire the context before touching any UI hiding logic.
- **Per-collection override is independent of the invite flow.** It depends on User model and active session; can be built after the core RBAC is in place.
- **Existing collection write routes need server-side role checks added.** This is a cross-cutting concern that touches every existing API route. Plan it as an explicit phase, not an afterthought.
- **Existing UI components (TokenTable, BulkActionBar, Config page) need permission gating.** These components are already structured in feature domain folders; add `usePermissions()` calls without restructuring.

---

## MVP Definition for v1.5

### Launch With (v1.5 scope — all required)

- [ ] Email/password sign-in with NextAuth.js CredentialsProvider + JWT session — **AUTH-01, AUTH-02, AUTH-03, AUTH-04**
- [ ] Role (Admin/Editor/Viewer) stored in JWT and enforced in all write API routes — **AUTH basis for all PERM-01–03**
- [ ] Middleware redirects unauthenticated users to sign-in — **AUTH-02**
- [ ] Superadmin via `SUPER_ADMIN_EMAIL` env var — **AUTH-06**
- [ ] First user auto-assigned Admin — **AUTH-05**
- [ ] User + InviteToken MongoDB models — **prerequisite for everything else**
- [ ] Admin invite flow: email input + role selector → Resend email with magic link → Account setup form (name + password) — **USER-02, USER-03, USER-04**
- [ ] Invite token: crypto-random, stored hashed, one-time-use, 72h expiry — **security baseline**
- [ ] Pending invites visible in admin list with expiry badge — **USER-07**
- [ ] Admin can change org-level role for any user — **USER-05**
- [ ] Admin can remove user (with lockout guards: self, last Admin) — **USER-06**
- [ ] Admin can resend and revoke pending invites — **USER-07 support**
- [ ] Per-collection permission override: Admin can set override role per user — **PERM-04**
- [ ] Existing collections backfilled to first Admin user — **PERM-05**
- [ ] PermissionsContext + `usePermissions()` hook, app-wide — **PERM-06**
- [ ] Write controls hidden for users without write permission — **UI-01 through UI-04**
- [ ] Users admin page at `/admin/users` (Admin-only) — **USER-01**

### Deferred (v1.5.x or v2+)

- [ ] OAuth / SSO providers — explicitly out of scope; v2+
- [ ] Custom role creation / per-permission toggles — out of scope; v2+
- [ ] Activity audit log — deferred; v2+
- [ ] Invite reminder emails (day 3, day 6 nudge) — nice-to-have; add if invite abandonment is observed
- [ ] Multi-org / tenant support — architecture allows it; deferred

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Email/password sign-in + session | HIGH | LOW | P1 |
| Middleware route protection | HIGH | LOW | P1 |
| User + InviteToken models | HIGH | LOW | P1 |
| Role in JWT + API enforcement | HIGH | MEDIUM | P1 |
| Invite flow (send + accept) | HIGH | MEDIUM | P1 |
| Pending invites in admin list | HIGH | LOW | P1 |
| Resend / revoke invite | HIGH | LOW | P1 |
| Role change + remove user (with guards) | HIGH | LOW | P1 |
| PermissionsContext + usePermissions() | HIGH | MEDIUM | P1 |
| Write control hiding in UI | HIGH | MEDIUM | P1 |
| Per-collection override | MEDIUM | MEDIUM | P1 (required by spec) |
| Superadmin env var bypass | MEDIUM | LOW | P1 (lockout prevention) |
| Invite expiry relative display | LOW | LOW | P2 |
| Invite reminder emails | LOW | MEDIUM | P3 |
| OAuth / SSO | LOW (v1.5) | HIGH | P3 |

**Priority key:**
- P1: Required for v1.5 launch
- P2: Add when core is stable, within milestone
- P3: Future consideration

---

## Complexity Notes by Feature Area

| Area | Complexity Driver | Key Risk |
|------|-------------------|----------|
| NextAuth.js JWT sessions | Low — well-documented pattern for Next.js 13 | `withAuth` middleware requires `jwt` session strategy; credentials provider cannot use database sessions — must not mix strategies |
| Invite token security | Medium — crypto-random token, hashed storage, one-time use, expiry | Do not use `Math.random()`; use `crypto.randomBytes(32).toString('hex')`; store hashed in DB; delete on first use |
| Cross-cutting API role enforcement | Medium — touches every existing API route | Easy to miss an endpoint; enumerate all write routes explicitly and add session check to each |
| Per-collection override resolution | Medium — two-level lookup (org role + override) | `usePermissions(collectionId)` must resolve: if override exists for this collection → use override role; else → use org role |
| PermissionsContext | Medium — must handle loading state + collection-scoped resolution | Avoid loading flicker: if session is loading, do not hide controls yet — show a loading state or skeleton |
| UI hiding / disabling | Low — conditional rendering | Risk of inconsistency if hiding logic is duplicated per component; centralize in `usePermissions()` and a `<PermissionGate>` component |
| Last-Admin lockout guard | Low — server-side count check | Must check both for remove-user and for role-downgrade; client-side guard is UX, server-side is required |

---

## Sources

- Email invite flow patterns: [Designing an intuitive user flow for inviting teammates — PageFlows.com](https://pageflows.com/resources/invite-teammates-user-flow/)
- Invite edge cases and expiry strategy: [How to Create Team Invitation Emails for SaaS — Sequenzy](https://www.sequenzy.com/blog/how-to-create-team-invitation-emails-saas), [Invite-API multi-tenant onboarding — Medium](https://tomaszs2.medium.com/stop-rebuilding-user-invites-meet-invite-api-multi-tenant-onboarding-done-right-d4ea4b35e593)
- Magic link security (crypto-random, one-time use, expiry): [Magic Link Security — Guptadeepak](https://guptadeepak.com/mastering-magic-link-security-a-deep-dive-for-developers/), [Magic Links — Supertokens](https://supertokens.com/blog/magiclinks)
- RBAC design patterns for SaaS: [EnterpriseReady RBAC Guide](https://www.enterpriseready.io/features/role-based-access-control/), [Cerbos — 3 Common Authorization Designs](https://www.cerbos.dev/blog/3-most-common-authorization-designs-for-saas-products)
- Per-resource permission override patterns: [How to Design Permissions for SaaS — Department of Product](https://www.departmentofproduct.com/blog/how-to-design-permissions-for-saas-products/), [WorkOS — Multi-tenant RBAC design](https://workos.com/blog/how-to-design-multi-tenant-rbac-saas)
- Hide vs disable UI controls: [Smart Interface Design Patterns — Hidden vs Disabled](https://smart-interface-design-patterns.com/articles/hidden-vs-disabled/), [Smashing Magazine — Hidden vs. Disabled In UX (2024)](https://www.smashingmagazine.com/2024/05/hidden-vs-disabled-ux/)
- NextAuth.js credentials + MongoDB session strategy: [NextAuth.js — Credentials Provider](https://next-auth.js.org/configuration/options), [NextAuth.js email invite flow — Medium](https://medium.com/@lacunastrategies/email-invite-auth-flow-w-nextjs-nextauth-and-mongodb-adapter-75b33ce9f042)
- Resend transactional email in Next.js: [Resend — Send with Next.js](https://resend.com/docs/send-with-nextjs)
- React RBAC patterns: [Permit.io — Implementing RBAC in React](https://www.permit.io/blog/implementing-react-rbac-authorization), [Building scalable RBAC in Next.js — Medium](https://medium.com/@muhebollah.diu/building-a-scalable-role-based-access-control-rbac-system-in-next-js-b67b9ecfe5fa)
- First-user admin bootstrapping: [Build multi-tenant SaaS — Logto](https://blog.logto.io/build-multi-tenant-saas-application)
- Pending invite UX (Slack model): [Manage pending invitations — Slack Help](https://slack.com/help/articles/360060363633-Manage-pending-invitations-and-invite-links-for-your-workspace)

---

*Feature research for: ATUI Tokens Manager v1.5 — Org User Management + Auth*
*Researched: 2026-03-28*
