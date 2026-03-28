# Project Research Summary

**Project:** ATUI Tokens Manager v1.5 — Org User Management + Authentication
**Domain:** Auth layer + RBAC on an existing Next.js 13.5.6 App Router + MongoDB/Mongoose brownfield app
**Researched:** 2026-03-28
**Confidence:** HIGH

## Executive Summary

ATUI Tokens Manager v1.5 adds multi-user authentication, email invite-based onboarding, and role-based access control (Admin/Editor/Viewer) to an existing single-user design token management tool. This is a brownfield milestone: the entire token management stack (Next.js 13.5.6, React 18.2.0, Mongoose 9.2.2, shadcn/ui, MongoDB) is locked and working. The v1.5 scope adds exactly three new production packages (next-auth@^4.24.13, bcryptjs@^3.0.3, resend@^6.0.0) and builds on well-documented, established patterns. The recommended approach is credentials-based auth with JWT sessions, a custom Mongoose User model, and a global React permissions context — no NextAuth database adapter needed or wanted.

The primary risk for this milestone is security, not complexity. The existing codebase runs on Next.js 13.5.6, which is directly vulnerable to CVE-2025-29927 (CVSS 9.1) — a middleware authentication bypass via a crafted HTTP header. This must be patched to 13.5.9 as the literal first step before any auth code ships. The second risk is a pattern that trips up nearly every NextAuth + MongoDB project: the Credentials provider only works with JWT sessions, making a database adapter both incompatible and counterproductive. The entire auth layer must be built assuming stateless JWT sessions, with role-enforcement living in individual Route Handlers rather than in middleware or a database adapter.

The architecture is straightforward in concept but cross-cutting in execution. Authentication introduces a two-layer permission system: a React context (`usePermissions()`) for client components to control UI visibility, and `getServerSession()` calls at the top of every Route Handler for server-side enforcement. The challenge is discipline — it is easy to add middleware and consider the job done. The research is clear that UI hiding is UX and server-side guards are security; both layers must be implemented without exception. With a team of 10-50 users and an internal tool context, the chosen patterns scale well within this milestone's needs.

---

## Key Findings

### Recommended Stack

The existing stack (Next.js 13.5.6, React 18.2.0, Mongoose 9.2.2, shadcn/ui, Tailwind) is unchanged. Three new production packages are added and nothing else. `next-auth@^4.24.13` is the only viable choice — the v5 (Auth.js) rewrite requires Next.js 14+ minimum, and this project cannot upgrade without risk to the 27K LOC codebase. `bcryptjs` is preferred over `bcrypt` (native) because it is pure JavaScript, requires zero Webpack configuration, and is appropriate for low-throughput login flows. `resend` is preferred over nodemailer for its API-first model and React email template support.

The explicit decision to skip `@auth/mongodb-adapter` is load-bearing. NextAuth's Credentials provider cannot use database sessions, making the adapter inert for this use case. Adding it would create a parallel MongoDB connection via raw MongoClient that conflicts with the existing Mongoose singleton. JWT sessions are the correct and only viable strategy. One additional package referenced in ARCHITECTURE.md is `jsonwebtoken` — used for invite token signing/verification in `src/lib/auth/invite.ts`. Whether to use `jsonwebtoken` or the simpler `crypto.randomBytes` approach (no new dep) should be resolved during Phase 1 planning; the PITFALLS.md recommendation favors the no-dep approach.

**Core technologies:**
- `next-auth@^4.24.13`: Session management, credentials auth, JWT cookies, withAuth middleware — only stable v4 compatible with Next.js 13
- `bcryptjs@^3.0.3`: Password hashing — pure JS, no native bindings, same API as bcrypt
- `resend@^6.0.0`: Transactional email for invite delivery — API-first, React template support
- No NextAuth database adapter: JWT strategy makes the adapter incompatible and unnecessary

**Environment variables required:** `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `RESEND_API_KEY`, `SUPER_ADMIN_EMAIL`

### Expected Features

The full v1.5 feature set is well-defined with no ambiguity about scope. All items in the MVP list are P1 (required); the anti-features (OAuth, custom roles, per-permission toggles) are correctly deferred.

**Must have (table stakes):**
- Email + password sign-in with session persistence across refresh — users expect a basic credential gate
- Redirect unauthenticated users to sign-in — middleware + Route Handler enforcement (belt-and-suspenders)
- Admin/Editor/Viewer roles in JWT, enforced on all write API routes — the central security requirement
- Admin invite flow: email + role input, Resend magic link, one-time-use token (72h expiry), account setup form
- Pending invites visible in admin list with expiry badges; resend and revoke actions
- Admin can change org-level role and remove users, with last-Admin lockout guards
- Write controls hidden (not just disabled) for Viewer role — clean UX
- Users admin page at `/org/users` (Admin-only)

**Should have (v1.5 required by spec):**
- Per-collection permission override: Admin grants elevated or restricted access to specific collections
- Superadmin via `SUPER_ADMIN_EMAIL` env var — lockout prevention, no UI surface required
- First user auto-assigned Admin — zero-config bootstrap
- Role change propagates within 60 seconds via JWT re-fetch (not requiring logout)

**Defer (v2+):**
- OAuth / SSO providers — explicit scope exclusion
- Custom role creation / per-permission matrices — three named roles are sufficient
- Activity audit log
- Invite reminder emails (day 3, day 6 nudge)
- Multi-org / tenant support

**Hide vs disable rule:** Hide when the user's role means they will never be able to perform the action. Disable (with tooltip) when the restriction is temporary or contextual (e.g., Source group in theme mode). Never disable without explanation.

### Architecture Approach

The architecture adds an isolated auth layer and email layer to the existing codebase without modifying the token management layer except to add auth guards. New `src/lib/auth/`, `src/lib/email/`, `src/components/auth/`, and `src/components/org/` domain folders follow the existing `src/[domain]/` convention. All auth business logic (`authOptions`, session helper, permissions pure function, invite token sign/verify) is isolated in `src/lib/auth/`. Middleware is stateless (JWT-only, no DB), and role enforcement runs inside individual Route Handlers via a shared `getSession()` helper.

The session-to-permissions flow is: MongoDB User.role (read at sign-in only) → NextAuth JWT cookie → `useSession()` → `PermissionsProvider` → `usePermissions()` hook in client components. For Server Components and API routes, `getServerSession(authOptions)` is called directly — React context is unavailable in Server Components. This two-layer pattern is a hard constraint of the Next.js App Router, not an option.

**Major components:**
1. `src/middleware.ts` — JWT-only route protection (withAuth); redirects unauthenticated page requests; no DB access
2. `src/lib/auth/nextauth.config.ts` — authOptions; CredentialsProvider + jwt/session callbacks; single import point for all `getServerSession()` callers
3. `src/lib/auth/permissions.ts` — pure `canPerform(role, action)` function; no React, no Next.js
4. `src/components/auth/PermissionsProvider.tsx` — React context client component; exposes `usePermissions()` hook with pre-computed booleans (`canEdit`, `canCreate`, `isAdmin`, `canGitHub`, `canFigma`)
5. `src/lib/db/models/User.ts`, `Invite.ts`, `CollectionPermission.ts` — three new Mongoose models; no adapter
6. `src/lib/email/resend.ts` + `invite-email.tsx` — isolated email layer; zero dependency on auth layer
7. Org Users admin page at `src/app/org/users/page.tsx` — Admin-only; UserTable, InviteUserDialog, RoleChangeSelect components
8. Auth guard additions to all 8+ existing write Route Handlers — 3-line addition per handler, no restructuring of existing logic

### Critical Pitfalls

1. **CVE-2025-29927 middleware bypass** — Upgrade Next.js 13.5.6 to 13.5.9 as step zero before any auth code is written. Any middleware-only auth on 13.5.6 is completely bypassable with a crafted header. After upgrading, still add `getServerSession()` guards to all write Route Handlers — middleware is UX, not security.

2. **Credentials provider cannot use database sessions** — Configure `session: { strategy: "jwt" }` explicitly. Do not install `@auth/mongodb-adapter`. Role and ID must be embedded in the JWT via `jwt` + `session` callbacks; without this, `session.user.role` is `undefined` at runtime despite TypeScript compiling cleanly.

3. **JWT role staleness after role change** — An Admin changing a user's role writes to MongoDB, but the user's existing JWT still carries the old role for up to 30 days. Add a `roleLastFetched` timestamp to the JWT and re-fetch from DB in the `jwt` callback if older than 60 seconds. Implement in the same phase as role persistence.

4. **All existing write routes are currently unprotected** — There are 18 Route Handler files, all without auth guards. A shared `requireAuth()` utility must be applied to every write Route Handler in a single dedicated phase. Splitting this across phases leaves live data-write endpoints unguarded.

5. **TypeScript module augmentation without runtime values** — `next-auth.d.ts` module augmentation tells TypeScript the session has `id` and `role`, but TypeScript compiles cleanly even if the runtime callbacks never assign these values. Both the type declaration and the `jwt` + `session` callbacks must be verified with a live sign-in check before the RBAC phase begins.

6. **N+1 permission queries on collection listing** — Naive per-collection override lookup (one `findOne` per collection in a loop) triggers N+1 DB queries. Use a single `find({ userId })` on `CollectionPermission`, then merge in memory. Two queries total for any N.

7. **Invite token security is an atomic unit** — Token generation (`crypto.randomBytes(32)`), SHA-256 hash storage, single-use enforcement, and `expiresAt` validation must all be implemented together. All failure cases must return the same generic error to avoid information leakage. These are not separable concerns.

---

## Implications for Roadmap

Based on the dependency ordering in ARCHITECTURE.md and the pitfall-to-phase mapping in PITFALLS.md, the natural phase structure is 6 phases. The build order is strictly dependency-driven: infrastructure before API, API before UI, middleware after sign-in works, auth guards before org management UI.

### Phase 1: Auth Infrastructure and Security Baseline

**Rationale:** CVE-2025-29927 must be patched before any auth code ships. Mongoose models and the `authOptions` configuration are the foundation everything else depends on. The JWT contract (which fields it carries) must be established and verified at runtime before any RBAC code is written.
**Delivers:** Next.js upgraded to 13.5.9; User/Invite/CollectionPermission Mongoose models; `authOptions` with CredentialsProvider + JWT callbacks; `getSession()` helper; `permissions.ts` pure function; invite token utility; Resend client singleton; TypeScript module augmentation for Session + JWT with live runtime verification.
**Addresses:** AUTH-01 foundation, AUTH-06 (superadmin env var logic), security baseline
**Avoids:** CVE-2025-29927, Credentials + JWT confusion, MongoDB adapter conflict, TypeScript augmentation without runtime values

### Phase 2: Auth API Routes and Sign-In Flow

**Rationale:** Once infrastructure exists, the NextAuth route handler and sign-in UI can be built. Middleware is intentionally deferred until sign-in is verified working end-to-end — this prevents development lockout.
**Delivers:** `src/app/api/auth/[...nextauth]/route.ts` (NextAuth handler at the correct App Router path); first-user bootstrap route; sign-in and invite setup pages; `SessionProvider` + `PermissionsProvider` wired into `LayoutShell`; env vars configured.
**Addresses:** AUTH-01, AUTH-02 (sign-in page), AUTH-03 (session persistence), AUTH-04 (sign-out), AUTH-05 (first user = Admin)
**Avoids:** SessionProvider in root layout (breaks metadata export), NextAuth route at Pages Router path (silent failure), missing runtime callbacks for session fields

### Phase 3: Middleware and Route Handler Auth Guards

**Rationale:** Middleware is activated only after sign-in is verified end-to-end. The same phase adds auth guards to all existing write Route Handlers — splitting this creates a window where live endpoints are unguarded.
**Delivers:** `src/middleware.ts` with `withAuth` + correct matcher; `requireAuth()` utility; auth guards added to all 8+ existing write Route Handlers; 401/403 responses verified via curl without session cookie.
**Addresses:** AUTH-02 (middleware redirect), all existing routes protected
**Avoids:** Middleware-only auth (CVE bypass), split implementation leaving routes unguarded, Mongoose imported in middleware (Edge Runtime incompatibility)

### Phase 4: RBAC and Permissions Context

**Rationale:** Role-based enforcement depends on working auth. The `PermissionsProvider` context and `usePermissions()` hook are built here, establishing the two-layer permission pattern (context for clients, `getServerSession` for servers) before any permission-dependent UI is built. Per-collection override query is designed correctly from the start to avoid N+1 problems.
**Delivers:** `PermissionsProvider` + `usePermissions()` hook app-wide; role checks (Viewer → 403) added to all write Route Handlers; JWT role re-fetch every 60 seconds in `jwt` callback; `canEdit` / `canCreate` / `isAdmin` / `canGitHub` / `canFigma` booleans available to all client components; batch permission fetch for per-collection overrides.
**Addresses:** PERM-01, PERM-02, PERM-03, PERM-04, PERM-05, PERM-06
**Avoids:** React context in Server Components, JWT role staleness, N+1 permission queries

### Phase 5: Email Invite Flow and Account Setup

**Rationale:** Invite flow is operationally independent from RBAC. It requires the User and Invite Mongoose models (Phase 1) and Resend (Phase 1), but not the permissions context. All invite token security requirements (token generation, hash storage, single-use, expiry) are implemented as one atomic unit.
**Delivers:** `POST /api/auth/invite` (Admin creates invite); invite token with `crypto.randomBytes(32)`, SHA-256 hash, 72h expiry, single-use enforcement; Resend email delivery; `/auth/invite/[token]` account setup page; invite redemption creates active User; all edge cases handled (duplicate email, expired link, re-invite invalidates previous token).
**Addresses:** USER-02, USER-03, USER-04, all invite edge cases from FEATURES.md
**Avoids:** Predictable tokens, token reuse, missing expiry enforcement, information leakage via differentiated error messages

### Phase 6: Org Users Admin UI and Permission-Gated Existing UI

**Rationale:** Admin UI and permission-gating of existing components are the final integration layer. All prior phases must be complete. Write control hiding in existing components (TokenTable, BulkActionBar, Config page) is a low-complexity addition using the already-wired `usePermissions()` hook.
**Delivers:** `src/app/org/users/page.tsx` (Admin-only); UserTable, InviteUserDialog, RoleChangeSelect components; role change + user removal API routes with lockout guards (last Admin, self-removal, superadmin protection); write controls hidden for Viewer in all existing collection UI; per-collection override management surface; existing collections backfilled to first Admin user.
**Addresses:** USER-01, USER-05, USER-06, USER-07, UI-01 through UI-04, PERM-05
**Avoids:** Showing all controls and blocking at click, greying out entire pages for Viewer

### Phase Ordering Rationale

- **Infrastructure before API, API before UI:** The Mongoose models and `authOptions` are the contract all later code depends on. Building them first prevents rework.
- **Middleware deferred until sign-in works:** Activating middleware before sign-in is verified creates a development lockout. Phase 3 activation is safe because Phase 2 verified the full round-trip.
- **Auth guards in the same phase as middleware:** CVE-2025-29927 means middleware alone is not sufficient. Splitting guards across phases violates the security requirement.
- **RBAC before invite flow:** The invite flow creates users with roles. The role enforcement layer must exist before the invite flow is tested end-to-end.
- **Permission-gating of existing UI last:** The `usePermissions()` hook is wired in Phase 4; existing components can adopt it in Phase 6 with minimal change. Deferring avoids modifying existing components before the context is stable.

### Research Flags

Phases needing deeper research during planning:
- **Phase 4 (RBAC):** Per-collection override resolution (`usePermissions(collectionId)`) — specifically, how the collection ID reaches the context for lazy override loading and whether overrides are fetched eagerly at session start or lazily on collection page mount. MEDIUM confidence on this sub-pattern; resolve during phase planning.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1 (Auth Infrastructure):** Official NextAuth v4 docs cover all patterns; Mongoose models follow existing project conventions.
- **Phase 2 (Sign-In Flow):** NextAuth CredentialsProvider + App Router is fully documented in official sources.
- **Phase 3 (Middleware + Guards):** `withAuth` pattern documented; `getServerSession()` guard is a 3-line addition per handler.
- **Phase 5 (Invite Flow):** Token security requirements fully specified in PITFALLS.md. Invite flow patterns documented via official and community sources.
- **Phase 6 (Org UI):** shadcn/ui table + dialog + select components follow existing patterns in the codebase.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified against official docs and npm. next-auth@4.24.13 + Next.js 13.5.6 compatibility confirmed via GitHub issue #13313. No conflicting peer deps identified. |
| Features | HIGH | Full feature set specified with dependency graph. Hide vs disable rule sourced from Smashing Magazine and Smart Interface Design Patterns (2024). Invite edge cases exhaustively enumerated. |
| Architecture | HIGH | Official NextAuth + App Router docs, official Resend docs, official Mongoose Next.js guide. Direct codebase inspection of all 18 Route Handlers, LayoutShell, layout.tsx, mongodb.ts. Build order fully specified. |
| Pitfalls | HIGH | CVE-2025-29927 confirmed via NVD, ProjectDiscovery, JFrog (multiple security advisories; fixed in 13.5.9). NextAuth credentials + JWT limitation from official docs. MongoDB adapter incompatibility from official docs + GitHub discussions. |

**Overall confidence:** HIGH

### Gaps to Address

- **`jsonwebtoken` vs `crypto.randomBytes` for invite tokens:** ARCHITECTURE.md references `jsonwebtoken` for invite token signing, but STACK.md does not list it and PITFALLS.md recommends `crypto.randomBytes(32).toString('hex')` (no additional dep). Resolve in Phase 1 planning: the no-dep approach is simpler and sufficient unless a JWT-signed token provides a specific benefit (e.g., embedding email/role in the token for verification without a DB lookup).

- **Per-collection override loading strategy:** PERM-04 requires per-collection overrides to be reflected in the UI without re-login. The data model and server-side batch query are documented, but the exact mechanism for surfacing collection-specific overrides through `PermissionsProvider` (lazy fetch on collection page mount vs. eager load of all user overrides at session start) is unresolved. Resolve during Phase 4 planning.

- **Resend domain verification in production:** The Resend integration works with `onboarding@resend.dev` in development. Production requires a verified sending domain. This is an operational gap, not a code gap — must be addressed in the deployment checklist for v1.5.

- **Sign-in rate limiting:** The `POST /api/auth/callback/credentials` endpoint is unprotected against brute force. NextAuth does not rate-limit by default. Given this is an internal tool, acceptable to document as a known gap and defer to v1.5.1, but it should be flagged explicitly in the Phase 3 plan.

---

## Sources

### Primary (HIGH confidence)
- [NextAuth.js v4 Official Docs](https://next-auth.js.org/) — CredentialsProvider, JWT strategy, withAuth middleware, getServerSession, TypeScript augmentation
- [Auth.js Migrating to v5](https://authjs.dev/getting-started/migrating-to-v5) — Confirmed v4 is correct for Next.js 13; v5 requires Next.js 14+
- [Resend Send with Next.js](https://resend.com/docs/send-with-nextjs) — Route Handler integration pattern, React Email template
- [NVD CVE-2025-29927](https://nvd.nist.gov/vuln/detail/CVE-2025-29927) — Middleware bypass vulnerability; fixed in Next.js 13.5.9
- [ProjectDiscovery CVE-2025-29927 Analysis](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass) — Technical details and exploit pattern
- [Mongoose Using Mongoose With Next.js](https://mongoosejs.com/docs/nextjs.html) — App Router connection management, hot-reload guard
- [npm: next-auth](https://www.npmjs.com/package/next-auth) — v4.24.13 latest stable confirmed (Oct 2025)
- [npm: bcryptjs](https://www.npmjs.com/package/bcryptjs) — v3.0.3 latest, pure JS confirmed
- [npm: resend](https://www.npmjs.com/package/resend) — v6.9.4 latest confirmed
- Direct codebase inspection — `src/lib/mongodb.ts`, `src/app/layout.tsx`, all 18 Route Handlers, `LayoutShell.tsx`, `package.json`, `tsconfig.json`

### Secondary (MEDIUM confidence)
- [EnterpriseReady RBAC Guide](https://www.enterpriseready.io/features/role-based-access-control/) — Three-role RBAC pattern for SaaS
- [Smashing Magazine — Hidden vs. Disabled In UX (2024)](https://www.smashingmagazine.com/2024/05/hidden-vs-disabled-ux/) — Hide vs disable decision rule
- [NextAuth JWT role re-fetch pattern](https://github.com/nextauthjs/next-auth/discussions/1571) — Community-verified; no official NextAuth documentation
- [Magic Link Security — Guptadeepak](https://guptadeepak.com/mastering-magic-link-security-a-deep-dive-for-developers/) — Invite token security requirements
- [Permit.io — Implementing RBAC in React](https://www.permit.io/blog/implementing-react-rbac-authorization) — PermissionsProvider context pattern
- [WorkOS — Multi-tenant RBAC design](https://workos.com/blog/how-to-design-multi-tenant-rbac-saas) — Per-collection override design

### Tertiary (LOW confidence)
- Per-collection override loading through PermissionsProvider — inferred from context architecture; no single authoritative pattern documented. Validate during Phase 4 planning.

---

*Research completed: 2026-03-28*
*Ready for roadmap: yes*
