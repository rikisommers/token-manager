# Phase 18: Middleware and Route Handler Guards - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Block unauthenticated access at every entry point: Next.js middleware redirects unauthenticated page requests to `/auth/sign-in`, and all 18 existing write Route Handlers return 401 without a valid session via a `requireAuth()` utility. CVE-2025-29927 exploit vector must be confirmed closed. No new UI or RBAC enforcement in this phase.

</domain>

<decisions>
## Implementation Decisions

### Route exclusions
- Middleware protects all page routes except `/auth/*` (sign-in, NextAuth callbacks)
- Matcher also excludes `_next/static`, `_next/image`, and `favicon.ico` — no auth logic on static assets
- No public API routes — all `/api/*` routes require auth
- Middleware handles page requests only; API 401s are handled by `requireAuth()` inside each Route Handler (clean separation of concerns)

### Redirect behavior
- Middleware preserves `callbackUrl` on redirect: `/auth/sign-in?callbackUrl=/original/path`
- Default post-sign-in landing (no `callbackUrl`): `/collections`
- Signed-in users visiting `/auth/sign-in` directly are redirected to `/collections`

### requireAuth() contract
- Returns the session object `{ user: { id, email, role } }` on success — handlers can use identity without calling `getServerSession` again
- On failure, returns a `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` — caller pattern: `const authResult = await requireAuth(req); if (authResult instanceof NextResponse) return authResult;`
- JWT-only validation — no DB lookup per request; deleted users can act until token expires (revocation is a later concern)

### 401 response format
- Body: `{ error: 'Unauthorized' }` — simple JSON, machine-readable key
- No `WWW-Authenticate` header (session-cookie-based app, no client acts on it)
- No client-side 401 handling in this phase (toast/redirect on 401 is a future UI concern)

### Claude's Discretion
- Exact `matcher` regex pattern in `middleware.ts`
- How `requireAuth()` reads the session internally (`getServerSession` vs `getToken`)
- File structure within `src/lib/auth/` for the utility

</decisions>

<specifics>
## Specific Ideas

- No specific references — open to standard Next.js middleware patterns

</specifics>

<deferred>
## Deferred Ideas

- Client-side 401 handling (fetch interceptor, redirect to sign-in on 401) — future UI phase
- User revocation / immediate session invalidation on delete — future auth hardening phase

</deferred>

---

*Phase: 18-middleware-and-route-handler-guards*
*Context gathered: 2026-03-28*
