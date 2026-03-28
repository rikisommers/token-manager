# Pitfalls Research

**Domain:** Adding NextAuth.js credentials provider + Resend invite flow + RBAC to an existing Next.js 13.5.6 App Router + MongoDB/Mongoose app
**Researched:** 2026-03-28
**Confidence:** HIGH (official docs + confirmed CVEs + codebase directly inspected + Mongoose issue tracker)

---

## Critical Pitfalls

### Pitfall 1: Middleware-Only Auth Is Bypassable via CVE-2025-29927

**What goes wrong:**
Next.js 13.5.6 (the current version in this project) is directly vulnerable to CVE-2025-29927 (CVSS 9.1). An attacker can bypass all middleware-based authentication by adding the `x-middleware-subrequest` header with a crafted value. This means a `middleware.ts` that redirects unauthenticated users to `/login` provides zero protection against a direct HTTP request with the bypass header. All existing API routes — collection CRUD, GitHub push/pull, Figma export — remain fully accessible without a session.

**Why it happens:**
Next.js uses the `x-middleware-subrequest` header internally to prevent infinite middleware loops. In versions before 13.5.9, the check trusts this header from external requests. The fix ships in Next.js 13.5.9.

**How to avoid:**
Two-pronged approach:
1. Upgrade Next.js from 13.5.6 to at least 13.5.9 before shipping any auth (the patch is a point release on the same minor, no breaking changes). This must be the first step in the auth phase.
2. Even after patching, never treat middleware as the sole auth gate. Verify the session token in every Route Handler that mutates data, using `getServerSession(authOptions)` at the top of each handler. Middleware is a UX convenience (redirect to login page); the Route Handler check is the security boundary.

**Warning signs:**
- A curl request with `-H "x-middleware-subrequest: src/middleware:src/middleware:src/middleware:src/middleware:src/middleware"` reaches a protected route and returns 200 instead of being redirected.
- Auth "works" in browser (middleware redirects correctly) but automated tests against the API with headers set manually succeed without a session cookie.

**Phase to address:**
Auth setup phase (first auth phase) — upgrade Next.js to 13.5.9 as prerequisite step 0. Add `getServerSession` checks to all collection write routes in the same phase.

---

### Pitfall 2: Credentials Provider Requires JWT Session Strategy — Cannot Use Database Sessions

**What goes wrong:**
NextAuth.js Credentials provider only works with JWT session strategy. The official docs state: "users authenticated in this manner are not persisted in the database, and consequently that the Credentials provider can only be used if JSON Web Tokens are enabled for sessions." If a developer installs `@auth/mongodb-adapter` hoping it will persist Credentials-based sessions to MongoDB (like OAuth sessions), it does not — the adapter is ignored for Credentials login. Sessions will appear to work during testing but user records are never created in the `nextauth_users` collection.

**Why it happens:**
NextAuth considers Credentials too flexible to safely auto-create user records. The adapter pattern is designed for OAuth, where the provider asserts identity. With Credentials, identity assertion is the application's responsibility.

**How to avoid:**
- Configure `session: { strategy: "jwt" }` explicitly in `authOptions`. Do not add `@auth/mongodb-adapter` to the NextAuth config if only Credentials is used — it adds a dependency and a second MongoDB connection without benefit.
- User documents live in the app's own `User` Mongoose model (not in NextAuth's adapter collections). The `authorize` callback queries the `User` model directly and returns `{ id, email, role }`.
- Store user ID and role in the JWT via the `jwt` callback; expose them in the session via the `session` callback. This is the only way custom fields like `role` are available in `useSession()` or `getServerSession()`.

**Warning signs:**
- No `users` or `accounts` collections appear in MongoDB after sign-in.
- `session.user` has `name`, `email`, `image` but no `id` or `role` — means the JWT/session callbacks are missing.
- `getServerSession()` returns `null` in Route Handlers when a user is signed in — means `NEXTAUTH_SECRET` is missing or the session strategy is inconsistent.

**Phase to address:**
Auth setup phase — establish JWT strategy and User Mongoose model before writing any permission check code. The data shape of the JWT (what fields it carries) is a contract that all later RBAC code depends on.

---

### Pitfall 3: MongoDB Adapter Requires a Separate Native MongoClient — Conflicts with Mongoose Singleton

**What goes wrong:**
The existing `src/lib/mongodb.ts` manages a Mongoose connection singleton. `@auth/mongodb-adapter` requires a separate `MongoClient` (native MongoDB driver, not Mongoose). If a developer tries to extract the native client from Mongoose (`mongoose.connection.getClient()`) and pass it to the adapter, it may work intermittently but is not officially supported and breaks with Mongoose reconnection events. Running two separate `MongoClient` instances pointing at the same MongoDB URI is safe but must be managed as two separate singletons.

**Why it happens:**
The MongoDB adapter does not handle connections automatically — it requires the caller to pass an already-connected `MongoClient`. Mongoose uses its own internal `MongoClient` that is not designed to be shared. The NextAuth maintainers explicitly state the adapter is incompatible with an active Mongoose connection.

**How to avoid:**
Since this project uses JWT strategy (no adapter needed for auth), avoid installing `@auth/mongodb-adapter` entirely for v1.5. The `User`, `Invite`, and permission models all go through Mongoose. If the adapter is needed in a future OAuth milestone, create a second singleton file (`src/lib/mongo-client.ts`) that manages a native `MongoClient` separate from the Mongoose connection — never reuse Mongoose's internal client.

**Warning signs:**
- `MongoNotConnectedError` in NextAuth adapter operations after Mongoose reconnects.
- Sessions randomly fail after the development server hot-reloads (Mongoose recreates its connection; the adapter's shared client reference goes stale).
- Duplicate `_ensureIndex` log lines from two clients connecting to the same database.

**Phase to address:**
Auth setup phase — make the decision to skip the adapter (JWT strategy) explicit in the phase plan so no one installs it by mistake.

---

### Pitfall 4: Existing API Routes Have No Auth Guard — Retrofitting Requires Touching Every Route

**What goes wrong:**
The app has 18 Route Handler files, all currently unprotected. When auth is added, the natural instinct is to protect only the new auth-related routes and rely on middleware for the existing ones. Due to CVE-2025-29927 (Pitfall 1) and the architectural principle that middleware is not a security boundary, every write Route Handler must independently call `getServerSession(authOptions)` and check for a valid session before executing. Missing even one route (e.g., `PUT /api/collections/[id]` or `POST /api/export/github`) leaves a real data-write endpoint unguarded.

**Why it happens:**
Retrofitting auth into an existing codebase is non-obvious: the developer adds the middleware redirect and tests the UI, which correctly sends them to login. But the Route Handlers are tested via browser interactions, not direct HTTP calls, so the missing guards are not caught until someone curls the endpoint.

**How to avoid:**
Create a shared `requireAuth(request)` utility that calls `getServerSession(authOptions)` and returns `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` early if no session exists. Apply this utility to every existing write Route Handler in a single phase:
- `POST /api/collections` — create collection
- `PUT /api/collections/[id]` — update collection
- `DELETE /api/collections/[id]` — delete (handled via PUT with delete flag, or dedicated route)
- `POST /api/collections/[id]/duplicate`
- `POST/PUT/DELETE /api/collections/[id]/themes` and `[themeId]`
- `POST /api/export/github`
- `POST /api/export/figma`
- `POST /api/figma/import`
- `POST /api/import/github`

Read-only routes (`GET`) can return data to authenticated users; the RBAC check (Viewer vs Editor) determines whether write controls appear in the UI.

**Warning signs:**
- Direct `curl -X PUT https://app/api/collections/[id]` with a JSON body returns 200 without a session cookie.
- The GitHub export endpoint is callable without auth — a real risk for credential exposure.

**Phase to address:**
Auth setup phase — apply `requireAuth()` to all write routes in the same phase as adding the middleware redirect. Do not split this across phases.

---

### Pitfall 5: Permission Context Not Available in Server Components — Wrong Layer for RBAC Checks

**What goes wrong:**
The v1.5 requirements include "Permissions are available globally via a React context (no prop drilling)" (PERM-06). React context only works in Client Components. The `LayoutShell` is already `'use client'`, but the collection layout and page components (e.g., `src/app/collections/[id]/tokens/page.tsx`) are Server Components. If a developer adds a `PermissionsContext` provider inside `LayoutShell`, child Server Components cannot consume it via `useContext`. They can only receive permission data as props passed down from the nearest Client Component parent, or by re-fetching the session themselves via `getServerSession`.

**Why it happens:**
The App Router Server/Client boundary is frequently misunderstood. `useContext`, `useState`, `useEffect` are Client-only hooks. A Server Component inside a Client Component subtree is still a Server Component — it cannot call `useContext`.

**How to avoid:**
Two-layer approach:
1. **Client Components** (token table, action bar, nav items, buttons): consume `usePermissions()` from a `PermissionsContext` provided by a `PermissionsProvider` client component near the root. The provider receives the session data as a serialized prop from the nearest Server Component parent.
2. **Server Components and Route Handlers** (page.tsx, API routes): call `getServerSession(authOptions)` directly. Do not rely on context. The session is the source of truth; derive permissions from `session.user.role` inline.

Practically: the `LayoutShell` (already `'use client'`) is the right place for `PermissionsProvider`. It can call `useSession()` and provide `{ role, canEdit, canAdmin, ... }` to all client child components. Server Components alongside it call `getServerSession` independently.

**Warning signs:**
- `useContext` in a Server Component throws: "createContext is not a function" or "cannot read properties of undefined".
- Permission checks work in the browser but API routes allow writes regardless of role (means the server-side check is missing).
- Write controls appear for Viewer role users (means client-side check is missing or context is not reaching the component).

**Phase to address:**
RBAC + permissions context phase — establish the two-layer pattern (context for clients, `getServerSession` for servers) as the canonical pattern before writing any permission-dependent UI.

---

### Pitfall 6: JWT Token Does Not Auto-Update After Role Change

**What goes wrong:**
An Admin changes a user's org role from Viewer to Editor in the Users management page. The change is written to MongoDB. But the affected user's session JWT still carries `role: "viewer"` — it was encoded when the user signed in and will not change until the JWT expires (typically 30 days). During that window, the user's client-side `usePermissions()` context shows the old role, and any server-side `getServerSession()` call in Route Handlers also returns the old role from the JWT payload.

**Why it happens:**
JWT sessions are stateless by design — NextAuth does not re-query the database on every request. The JWT payload is frozen at sign-in time unless the `jwt` callback explicitly re-fetches user data from the database.

**How to avoid:**
Add a database re-read in the `jwt` callback that runs on each request (not just on first sign-in). Guard it with a timestamp to avoid querying on every single request:

```typescript
// In authOptions jwt callback:
async jwt({ token, user }) {
  if (user) {
    // First sign-in: populate from user object
    token.id = user.id;
    token.role = user.role;
    token.roleLastFetched = Date.now();
  } else if (token.roleLastFetched && Date.now() - token.roleLastFetched > 60_000) {
    // Re-fetch role from DB every 60 seconds
    const dbUser = await UserModel.findById(token.id).lean();
    if (dbUser) {
      token.role = dbUser.role;
      token.roleLastFetched = Date.now();
    }
  }
  return token;
}
```

For an internal tool with a small user base, 60-second staleness is acceptable. For immediate effect, the affected user must sign out and back in.

**Warning signs:**
- Role change in Users admin page takes no effect until user logs out and back in.
- Viewer can still access write controls in the UI after being promoted to Editor (or vice versa).
- Automated test: change user role, make request with existing session, expect new role in response — test fails.

**Phase to address:**
RBAC phase — implement the re-fetch pattern in the `jwt` callback when user roles are first being persisted. Do not defer to a "role refresh" improvement later.

---

### Pitfall 7: Invite Token Security — Predictable Tokens, Reuse, and No Expiry Enforcement

**What goes wrong:**
The invite flow generates a magic link with a token that the invited user clicks to set up their account. Three common mistakes: (1) Using a short or predictable token (e.g., UUID v4 without additional entropy, or a hash of the email). (2) Not marking the token as used after the account is created — the same link can be clicked multiple times (by forwarded email, double-click, etc.) and creates duplicate accounts or sessions. (3) Not enforcing expiry — a token stored in MongoDB without an expiry check allows invitations to remain valid indefinitely, bypassing the "Pending invitations with expiry status" requirement.

**Why it happens:**
Invite flows feel simple but have multiple failure modes. Developers focus on the happy path (click link, set password, land on dashboard) and miss the edge cases that matter for security.

**How to avoid:**
- Generate tokens with `crypto.randomBytes(32).toString('hex')` — 256 bits of entropy, not predictable.
- Store a `used: boolean` field and a `expiresAt: Date` field in the `Invite` MongoDB document. Set `expiresAt` to `Date.now() + 72 * 60 * 60 * 1000` (72 hours) at creation.
- In the account-setup handler, verify: token exists in DB + `used === false` + `expiresAt > Date.now()`. On success, set `used = true` before creating the user — do not create the user first.
- Return the same generic error message ("This invitation link is invalid or has expired.") for all failure cases — do not distinguish between "token not found" and "token expired" or "already used", as the difference leaks information.
- Rate-limit the invite email sending endpoint: one invite per email per 5 minutes to prevent Admin from accidentally spamming or a user from triggering repeated Resend charges.

**Warning signs:**
- Visiting the same magic link twice succeeds both times.
- The `Invite` collection in MongoDB has documents with no `expiresAt` field.
- A pending invite 30 days old still shows "active" in the Users list.
- Invite resend can be triggered rapidly without throttling.

**Phase to address:**
Email invite + account setup phase — the token generation, storage, one-time use enforcement, and expiry check must all be in the same implementation unit. They are not separable.

---

### Pitfall 8: Superadmin Env Var Bypass — Role Hardcoded in JWT vs Derived From DB

**What goes wrong:**
The requirement is: "Superadmin account is configured via `SUPER_ADMIN_EMAIL` env var; always Admin, cannot be removed." If the superadmin bypass is implemented only in the `jwt` callback (checking if the email matches the env var and setting `role: 'admin'`), then the role in MongoDB for that user can be anything, and the JWT override only takes effect at sign-in or during JWT refresh. Two specific risks:
1. If the `jwt` callback forgets to re-apply the superadmin override during re-fetches (Pitfall 6), a role change to "viewer" in MongoDB would propagate to the superadmin's token after 60 seconds.
2. If the env var `SUPER_ADMIN_EMAIL` is unset or misspelled in production, the superadmin loses admin access and cannot manage users.

**How to avoid:**
- Apply the superadmin override at two layers: (a) in the `jwt` callback — always override `token.role = 'admin'` if `token.email === process.env.SUPER_ADMIN_EMAIL`; (b) in every server-side permission check — `const effectiveRole = user.email === process.env.SUPER_ADMIN_EMAIL ? 'admin' : user.role`.
- In the Users management page, the "Remove" and "Change Role" actions must be disabled for the user whose email matches `SUPER_ADMIN_EMAIL` — checked server-side in the API handler, not just client-side UI.
- On app startup (or in a health check route), verify `SUPER_ADMIN_EMAIL` is set and is a valid email format. Log a warning at startup if it is missing — do not fail silently.
- Never store the superadmin role in MongoDB; derive it always from the env var at runtime.

**Warning signs:**
- The Users admin page shows a "Remove" button for the superadmin user — it should be absent.
- `SUPER_ADMIN_EMAIL` is set in `.env.local` but not in the production environment — superadmin logs in as Viewer.
- After a role DB re-fetch (Pitfall 6), superadmin's role temporarily shows "viewer" in the UI for 60 seconds.

**Phase to address:**
Auth setup phase (superadmin bootstrap) and RBAC phase (disable remove/change-role for superadmin). Both layers must be in place before the Users page is shipped.

---

### Pitfall 9: Per-Collection Permission Query Performance — N+1 on Collection Listing

**What goes wrong:**
The requirement PERM-04 adds per-collection access overrides for individual users. If the `GET /api/collections` listing route fetches all collections and then, for each collection, makes a separate MongoDB query to check whether the current user has a per-collection override, the listing page makes `N+1` database queries for `N` collections. A user with 50 collections triggers 50 extra permission queries per page load.

**Why it happens:**
Per-entity permissions feel natural to implement as a per-document lookup, especially when the permission model is "org-level role, with override per collection." The override check is added naively as an async loop over the collection list.

**How to avoid:**
- Store per-collection overrides in a dedicated `CollectionPermission` collection with a compound index on `{ collectionId, userId }`.
- On the collections listing, fetch all overrides for the current user in a single query: `CollectionPermission.find({ userId: currentUser.id })`. Then merge the results in memory with the collection list. Two queries total, not N+1.
- For the single-collection view (`GET /api/collections/[id]`), a single `findOne({ collectionId, userId })` is acceptable.
- For Viewer and Editor users with no overrides (the common case), skip the override query entirely by checking the org role first.

**Warning signs:**
- `/api/collections` becomes noticeably slow as the collection count grows.
- MongoDB profiler shows `N` consecutive `findOne` queries on `CollectionPermission` for a single GET request.
- The API route has a `for...of` loop calling `await Permission.findOne(...)` inside it.

**Phase to address:**
RBAC phase — implement the batch permission fetch before the collections listing is connected to the permission layer.

---

### Pitfall 10: NextAuth Route File Location — App Router Requires Different Path Than Pages Router

**What goes wrong:**
Most NextAuth examples and tutorials use the Pages Router path: `pages/api/auth/[...nextauth].js`. In Next.js 13 App Router, this route does not exist. The correct path is `src/app/api/auth/[...nextauth]/route.ts` with named exports `GET` and `POST`. If the Pages Router path is used in an App Router project, NextAuth silently fails to register the auth routes. Sign-in pages return 404, OAuth callbacks fail, and `getServerSession` returns `null` everywhere.

**Why it happens:**
NextAuth.js v4 documentation primarily shows Pages Router examples. The App Router migration is documented but not prominently. Many blog posts and Stack Overflow answers still show the Pages Router path.

**How to avoid:**
Use exactly this file path and export pattern:

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth'; // centralized authOptions

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

Export `authOptions` from a separate `src/lib/auth.ts` file — not from the route file itself — so it can be imported in Route Handlers and Server Components without creating circular dependencies.

**Warning signs:**
- Navigating to `/api/auth/signin` returns 404.
- `getServerSession()` always returns `null` even after a successful sign-in appears in the browser.
- The NextAuth session cookie (`next-auth.session-token`) is never set.

**Phase to address:**
Auth setup phase — verify the route is reachable and session cookie is set before writing any permission-dependent code.

---

### Pitfall 11: SessionProvider Must Live in a Client Component — Cannot Be in Root layout.tsx

**What goes wrong:**
`SessionProvider` from `next-auth/react` is a Client Component. Next.js App Router requires the root `layout.tsx` to be a Server Component (so it can export `metadata`). If `SessionProvider` is placed directly in `layout.tsx`, the build fails or Next.js downgrades `layout.tsx` to a Client Component, breaking `metadata` export. The existing app already uses `LayoutShell` as a `'use client'` wrapper — this is the correct pattern, and `SessionProvider` belongs inside `LayoutShell`.

**Why it happens:**
The Pages Router had `_app.tsx` as a natural Client Component entry point. App Router has no equivalent; developers unfamiliar with the boundary try to wrap the root layout.

**How to avoid:**
Place `SessionProvider` inside `LayoutShell` (already `'use client'`):

```typescript
// src/components/layout/LayoutShell.tsx
'use client';
import { SessionProvider } from 'next-auth/react';

export function LayoutShell({ children }) {
  return (
    <SessionProvider>
      {/* existing layout content */}
      {children}
    </SessionProvider>
  );
}
```

Keep `src/app/layout.tsx` as a Server Component with `metadata` export.

**Warning signs:**
- Build error: "You are attempting to export 'metadata' from a component marked with 'use client'."
- `useSession()` throws "No SessionProvider found" in client components.

**Phase to address:**
Auth setup phase — verify `LayoutShell` wraps `SessionProvider` as the first integration check.

---

### Pitfall 12: TypeScript Module Augmentation for Custom JWT Fields Is Easy to Break

**What goes wrong:**
Adding `role` and `id` to `session.user` requires TypeScript module augmentation in a `next-auth.d.ts` file. Two common failures: (1) The file exists but TypeScript does not pick it up because the `types/` directory is not listed in `tsconfig.json`'s `typeRoots` or `include`. (2) The `jwt` callback populates `token.role` correctly but the `session` callback does not forward it to `session.user.role` — so the runtime value is `undefined` even though TypeScript thinks it's a `string`.

**Why it happens:**
TypeScript module augmentation is a non-obvious pattern. The disconnect between "TypeScript thinks the type is right" and "runtime value is undefined" is especially confusing because there are no type errors — the augmentation type declaration suppresses them.

**How to avoid:**
Always implement both sides:
1. The `next-auth.d.ts` type declaration (tells TypeScript the shape).
2. The `jwt` + `session` callback pair that actually puts the value there at runtime.

Write an integration test that signs in a test user and asserts `session.user.role !== undefined`. The TypeScript types alone are not sufficient validation.

Add `next-auth.d.ts` to the project root or to `src/types/` and ensure the path is covered by `tsconfig.json`'s `include` glob.

**Warning signs:**
- TypeScript compiles without errors but `session.user.role` is `undefined` at runtime.
- Changing the declared type in `next-auth.d.ts` makes no TypeScript errors appear in consuming code.
- `console.log(session)` shows `{ user: { name, email, image } }` — missing `id` and `role`.

**Phase to address:**
Auth setup phase — write a sanity-check test or manual verification step that confirms `id` and `role` are present in the decoded session before the RBAC phase begins.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Protect only the middleware, not Route Handlers | Fast to implement; UI redirects correctly | CVE-2025-29927 bypass; API remains fully open | Never — always add Route Handler guards |
| Use `getSession()` instead of `getServerSession()` in API routes | Familiar, same result in testing | Extra HTTP round-trip per API call; session fetch doubles latency in server context | Never — always use `getServerSession` server-side |
| Store role only in JWT, never re-fetch from DB | Simple; no extra queries | Role changes take up to 30 days to take effect without logout | Never for role changes that need near-real-time effect |
| Use `@auth/mongodb-adapter` with Credentials provider, no `session: "jwt"` | Matches OAuth adapter usage pattern | Sessions not persisted; adapter ignored; confusing behavior | Never — adapter and Credentials are incompatible without `session: "jwt"` |
| Skip per-collection override query for the listing route (check overrides lazily on open) | Faster listing implementation | Permissions appear correctly only when a collection is opened; listing shows no indication of override | Acceptable as MVP deferral if overrides are rare (PERM-04 is lower priority) |
| Hardcode admin check in UI only (no server-side admin guard) | Faster to build; no extra API calls | Any user with devtools can call admin endpoints directly | Never for any mutation endpoint |
| Use UUID v4 as invite token | Simple; UUID library already available | UUID v4 has 122 bits of entropy — sufficient, but lacks explicit "invite" context. Acceptable if combined with expiry + single-use enforcement | Acceptable if expiry and `used` flag are enforced |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| NextAuth + App Router | Placing the handler at `pages/api/auth/[...nextauth].js` | Place at `src/app/api/auth/[...nextauth]/route.ts` with `export { handler as GET, handler as POST }` |
| NextAuth + App Router | Calling `getSession()` in Server Components or Route Handlers | Call `getServerSession(authOptions)` — avoids extra HTTP round-trip |
| NextAuth Credentials + MongoDB | Using `@auth/mongodb-adapter` with Credentials provider | Use JWT strategy; manage User model directly in Mongoose; skip the adapter |
| NextAuth + Mongoose | Extracting `mongoose.connection.getClient()` to pass to MongoDB adapter | Keep a separate `MongoClient` singleton in `src/lib/mongo-client.ts` if adapter is ever needed; never share Mongoose's internal client |
| SessionProvider + App Router | Wrapping root `layout.tsx` with `SessionProvider` | Place `SessionProvider` inside `LayoutShell` (`'use client'`) — root layout stays Server Component |
| NextAuth JWT + custom fields | Declaring fields in `next-auth.d.ts` without the runtime callback | Must implement both: type declaration AND `jwt` + `session` callbacks that assign the values |
| Resend + invite flow | Sending invite emails without rate limiting | Rate-limit invite sends to 1 per email per 5 minutes; guard the invite POST route with auth + admin role check |
| Next.js middleware + MongoDB | Attempting to call `dbConnect()` / Mongoose inside `middleware.ts` | Middleware runs in Edge Runtime which does not support Node.js `net` module — no Mongoose in middleware. Use JWT decode only (stateless) in middleware |
| Per-collection RBAC | Checking overrides with a `for...of` + `findOne` loop in the collections listing handler | Fetch all overrides for the current user in one query (`find({ userId })`), then merge in memory |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 permission queries on collection listing | Collections page slow; MongoDB shows many sequential queries per request | Batch-fetch all user overrides in one query; merge in memory | Noticeable at 10+ collections; serious at 50+ |
| Calling `getServerSession` in every Server Component in the render tree | Cascading DB reads on a single page load; waterfall latency | Call `getServerSession` once at the page level; pass session/role down as props to child Server Components | Immediately on any page with more than 2–3 nested Server Component fetches |
| JWT re-fetch on every request (not throttled) | Every authenticated API call triggers a MongoDB `findById` | Add a `roleLastFetched` timestamp to the JWT; re-fetch only if older than 60 seconds | Immediately — every API call doubles its DB load |
| Loading the full collection document to check permissions before returning it | Extra read for permission check; then second read inside the handler | Embed the permission check in the same query projection, or use the user's org role (which is already in the JWT) for the common case | Any collection endpoint under load |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Relying solely on middleware for route protection (not upgrading from 13.5.6) | Complete auth bypass via CVE-2025-29927 — any external attacker can reach all API routes | Upgrade Next.js to 13.5.9; add `getServerSession` checks in all write Route Handlers |
| Returning different error messages for "invalid token" vs "expired token" in invite flow | Timing/content oracle — attacker can enumerate valid invite emails | Return one generic message: "This invitation link is invalid or has expired." |
| Storing raw invite tokens in MongoDB (not hashed) | If MongoDB is compromised, all pending invite links are usable | Hash the token with `crypto.createHash('sha256').update(token).digest('hex')` before storing; compare hash on redemption. Store only the hash. |
| Not enforcing SUPER_ADMIN_EMAIL server-side in role-change API | Admin can demote the superadmin via the UI if the API doesn't check | In the `PUT /api/users/[id]/role` handler, check if the target user's email equals `SUPER_ADMIN_EMAIL` and return 403 |
| Not rate-limiting the sign-in endpoint | Credential stuffing / brute force against the email+password endpoint | Apply in-memory or Redis rate limiting to `POST /api/auth/callback/credentials`; NextAuth does not rate-limit by default |
| Exposing per-collection Figma tokens to Viewer-role users via the collection GET response | Viewer can extract API keys they should not have | Project the response in `GET /api/collections/[id]` to exclude `figmaToken` and `githubRepo` config for users without Editor or Admin role |
| Setting `NEXTAUTH_SECRET` to a weak or static value in production | JWT forgery — attacker crafts valid session tokens | Generate with `openssl rand -base64 32`; rotate annually; never commit to source |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No feedback when invite link is expired | User sees a generic 404 or error page with no path forward | Show a specific "This invitation has expired" page with a link to contact the admin |
| Write controls are hidden but page still loads for Viewer (no loading state) | Momentary flash of enabled controls before permission context loads | Derive initial permission state from the server-rendered session; avoid client-side permission loading flicker by seeding `PermissionsProvider` with server-fetched data |
| Admin user list shows no indication of pending invites | Admin cannot tell who has accepted and who has not | Show status badges: "Active", "Invited (expires in 2d)", "Expired" — each with distinct color |
| Sign-in page is the app's own `/login` route but `NEXTAUTH_URL` is not set | NextAuth generates callback URLs pointing to `localhost` in production | Set `NEXTAUTH_URL` explicitly in production environment variables; never rely on auto-detection |
| "First user becomes Admin" logic fires on every cold start if the user count check is not atomic | Multiple concurrent first-user registrations both get Admin role | Use a MongoDB upsert with `{ $setOnInsert: { role: 'admin' } }` + check for zero existing users inside a transaction, or use a dedicated "org bootstrap" document as a lock |

---

## "Looks Done But Isn't" Checklist

- [ ] **Next.js version:** Upgraded from 13.5.6 to 13.5.9 before any middleware auth — verify `package.json` shows `"next": "13.5.9"` and CVE-2025-29927 is not exploitable.
- [ ] **Route Handler guards:** Every write API route (PUT, POST, DELETE, PATCH) calls `getServerSession` and returns 401 if null — verify with a curl request without a session cookie.
- [ ] **JWT fields at runtime:** `session.user.id` and `session.user.role` are non-null after sign-in — verify in browser devtools or a test that decodes the session.
- [ ] **Superadmin cannot be removed:** The Users admin page returns 403 from the API when attempting to change or remove the `SUPER_ADMIN_EMAIL` user — verify with a direct API call.
- [ ] **Invite token single-use:** Clicking the same magic link twice returns the "invalid or expired" page on the second click — verify by completing signup and revisiting the same URL.
- [ ] **Invite token expiry:** Manually setting `expiresAt` to a past date in MongoDB causes the link to be rejected — verify the expiry check is server-side, not only `expiresAt` display in the UI.
- [ ] **Role change propagates:** After changing a user's role in the admin UI, the user's write controls change within 60 seconds (or after re-login) — verify the `jwt` callback re-fetch is in place.
- [ ] **Viewer cannot write:** A Viewer-role session receives 403 from `PUT /api/collections/[id]` — verify with a direct API call using a Viewer's session cookie.
- [ ] **SessionProvider does not break metadata:** `src/app/layout.tsx` still exports `metadata` without TypeScript or build errors after `SessionProvider` is added to `LayoutShell`.
- [ ] **Mongoose not in middleware:** `middleware.ts` has zero imports from `mongoose`, `dbConnect`, or any Mongoose model — verify with a grep.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| CVE-2025-29927 middleware bypass discovered in production | HIGH | Immediately add `x-middleware-subrequest` header block at CDN/proxy level; deploy Next.js 13.5.9 upgrade; audit API logs for unauthorized access |
| Route Handler missing auth guard — write endpoint exposed | MEDIUM | Add `requireAuth()` guard and deploy; audit MongoDB for unauthorized mutations via `updatedAt` timestamps; notify affected users if data was changed |
| JWT role not propagating after role change | LOW | Document workaround: affected user must sign out and back in; implement DB re-fetch in `jwt` callback in next deploy |
| Invite token reuse vulnerability discovered | MEDIUM | Set `used = true` for all existing invite tokens in MongoDB immediately; deploy fix; re-issue invites that were affected |
| Superadmin locked out (SUPER_ADMIN_EMAIL not set in production) | HIGH | SSH to server, set env var, restart. Or: directly update user role in MongoDB via `mongo` CLI: `db.users.updateOne({ email: '...' }, { $set: { role: 'admin' } })` |
| MongoClient conflict between adapter and Mongoose | MEDIUM | Remove adapter, confirm JWT strategy, restart; no data loss since JWT sessions were never in the DB |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| CVE-2025-29927 middleware bypass | Auth setup phase — step 0: upgrade Next.js | curl with bypass header returns 401/redirect; `package.json` shows 13.5.9+ |
| Credentials provider + JWT strategy confusion | Auth setup phase | No adapter installed; `session: { strategy: 'jwt' }` explicit; MongoDB has no `nextauth_*` collections |
| MongoDB adapter / Mongoose connection conflict | Auth setup phase | Single connection in `mongodb.ts`; no `MongoClient` singleton needed for auth |
| All write routes unprotected | Auth setup phase — apply `requireAuth()` | All write routes return 401 for unauthenticated curl requests |
| Permission context not in Server Components | RBAC + permissions context phase | Server Components call `getServerSession`; client components use `usePermissions()`; no `useContext` in Server Components |
| JWT role stale after role change | RBAC phase — `jwt` callback re-fetch | Role change reflects in UI within 60 seconds without logout |
| Invite token security | Email invite + account setup phase | Single-use enforced; expiry enforced; hash stored |
| Superadmin env var bypass | Auth setup phase + RBAC phase | API returns 403 on superadmin role-change attempt; env var missing logs warning at startup |
| N+1 collection permission queries | RBAC phase — permission query design | Collections listing triggers 2 queries (collections + user overrides) not N+1 |
| NextAuth route location | Auth setup phase | `/api/auth/signin` returns 200; session cookie set on credentials login |
| SessionProvider in wrong component | Auth setup phase | `layout.tsx` exports `metadata`; no build errors; `useSession()` works in client components |
| TypeScript augmentation without runtime values | Auth setup phase — verified before RBAC | `session.user.id` and `session.user.role` are non-undefined at runtime |

---

## Sources

- Next.js CVE-2025-29927 (middleware bypass): [ProjectDiscovery Technical Analysis](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass), [NVD CVE-2025-29927](https://nvd.nist.gov/vuln/detail/CVE-2025-29927), [JFrog Analysis](https://jfrog.com/blog/cve-2025-29927-next-js-authorization-bypass/) — HIGH confidence (multiple official security advisories; fixed in Next.js 13.5.9)
- NextAuth Credentials provider + JWT only: [NextAuth credentials docs](https://next-auth.js.org/providers/credentials), [Discussion #4394](https://github.com/nextauthjs/next-auth/discussions/4394) — HIGH confidence (official NextAuth documentation)
- MongoDB adapter incompatibility with Mongoose: [Discussion #5004](https://github.com/nextauthjs/next-auth/discussions/5004), [Discussion #9468](https://github.com/nextauthjs/next-auth/discussions/9468), [Auth.js MongoDB adapter docs](https://authjs.dev/getting-started/adapters/mongodb) — HIGH confidence (official docs + confirmed community reports)
- App Router route file location for NextAuth: [NextAuth.js Next.js configuration](https://next-auth.js.org/configuration/nextjs), [Auth.js reference](https://authjs.dev/reference/nextjs) — HIGH confidence (official docs)
- `getServerSession` vs `getSession` performance: [NextAuth securing pages](https://next-auth.js.org/tutorials/securing-pages-and-api-routes) — HIGH confidence (official docs)
- React context unavailable in Server Components: [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) — HIGH confidence (official Next.js docs)
- Middleware not a security boundary: [Next.js authentication guide](https://nextjs.org/docs/app/guides/authentication), [WorkOS guide 2026](https://workos.com/blog/nextjs-app-router-authentication-guide-2026) — HIGH confidence (official docs)
- TypeScript module augmentation for NextAuth: [NextAuth TypeScript docs](https://next-auth.js.org/getting-started/typescript), [Discussion #9120](https://github.com/nextauthjs/next-auth/discussions/9120) — HIGH confidence (official docs + confirmed community pattern)
- Invite token security (single-use, expiry, hashing): [Clerk magic link security](https://clerk.com/blog/secure-authentication-nextjs-email-magic-links), [AppMaster transactional email flows](https://appmaster.io/blog/transactional-email-flows-tokens-expiration-deliverability) — MEDIUM confidence (verified against standard security practices; no official NextAuth doc for custom invite flows)
- Resend rate limits: [Resend rate limit docs](https://resend.com/docs/api-reference/rate-limit) — HIGH confidence (official Resend docs)
- JWT role re-fetch pattern: community-verified pattern; no official NextAuth doc but widely recommended in [Discussion #1571](https://github.com/nextauthjs/next-auth/discussions/1571) — MEDIUM confidence
- Codebase inspection: `src/lib/mongodb.ts`, `src/lib/db/models/TokenCollection.ts`, `src/app/api/collections/[id]/route.ts`, all 18 Route Handler files, `src/components/layout/LayoutShell.tsx` — HIGH confidence (direct inspection of current production code)

---

*Pitfalls research for: ATUI Tokens Manager v1.5 — Org User Management (Auth + RBAC)*
*Researched: 2026-03-28*
