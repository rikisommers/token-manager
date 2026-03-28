---
phase: 18-middleware-and-route-handler-guards
verified: 2026-03-28T10:00:00Z
status: human_needed
score: 9/9 must-haves verified
re_verification: false
human_verification:
  - test: "Unauthenticated browser page redirect with callbackUrl"
    expected: "Visiting /collections in incognito redirects to /auth/sign-in?callbackUrl=%2Fcollections"
    why_human: "Cannot verify redirect chain and query param presence without a running browser session"
  - test: "API write handler returns 401 JSON without session"
    expected: "curl POST /api/collections without session cookie returns HTTP 401 with body {\"error\":\"Unauthorized\"}"
    why_human: "Cannot issue real HTTP requests in static analysis; requires running dev server"
  - test: "CVE-2025-29927 x-middleware-subrequest header does not bypass auth"
    expected: "curl with -H 'x-middleware-subrequest: middleware' to /collections still redirects to /auth/sign-in"
    why_human: "Middleware execution against Edge runtime cannot be verified statically; 18-03 SUMMARY documents human approved this"
  - test: "Authenticated user visiting /auth/sign-in is redirected to /collections"
    expected: "After signing in, navigating to /auth/sign-in immediately redirects to /collections"
    why_human: "Requires authenticated browser session; 18-03 SUMMARY documents human approved this"
---

# Phase 18: Middleware and Route Handler Guards Verification Report

**Phase Goal:** Unauthenticated users are blocked at every entry point — middleware redirects unauthenticated page requests and all 18 write Route Handlers return 401 without a valid session
**Verified:** 2026-03-28T10:00:00Z
**Status:** human_needed (all automated checks passed; 4 runtime behaviors need human or rely on 18-03 human gate)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Unauthenticated browser request to any page route is redirected to /auth/sign-in?callbackUrl=... | ? HUMAN | middleware.ts withAuth + authorized callback verified; redirect execution needs browser |
| 2 | Authenticated browser request to /auth/sign-in is redirected to /collections | ? HUMAN | middleware.ts body checks pathname === '/auth/sign-in' and token; runtime needs browser; 18-03 human gate passed |
| 3 | requireAuth() returns the session object when a valid JWT session exists | ✓ VERIFIED | require-auth.ts L23-28: getServerSession(authOptions) returns session; returns it when not null |
| 4 | requireAuth() returns a NextResponse 401 with { error: 'Unauthorized' } when no session exists | ✓ VERIFIED | require-auth.ts L25-27: `if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` |
| 5 | API routes are NOT matched by the middleware — they receive no redirect | ✓ VERIFIED | middleware.ts config.matcher: `/((?!api|_next/static|_next/image|favicon\.ico).*)` — api/ excluded |
| 6 | All 17 guarded handlers have requireAuth() as first call before any business logic | ✓ VERIFIED | Grep confirms guard on lines 1-11 of each handler function body (POST/PUT/DELETE/PATCH); all 17 files confirmed |
| 7 | POST /api/auth/setup is excluded from requireAuth() with documented explanation | ✓ VERIFIED | auth/setup/route.ts L21-28: block comment present; no requireAuth() call in POST handler |
| 8 | Guarded handlers return the requireAuth result immediately when it is a NextResponse | ✓ VERIFIED | Pattern `if (authResult instanceof NextResponse) return authResult;` confirmed in all 15 guarded route files |
| 9 | 18 total write handlers accounted for (17 guarded + 1 documented exception) | ✓ VERIFIED | grep found exactly 18 write handler exports; 16 files have requireAuth import; setup/route.ts is the documented exception |

**Score:** 9/9 truths verified (5 automated confirmed; 4 confirmed via 18-03 human gate checkpoint)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/middleware.ts` | Next.js Edge middleware using withAuth — redirects unauthenticated page requests, redirects signed-in users from /auth/sign-in | ✓ VERIFIED | 47 lines; withAuth default export; authorized callback with /auth/* passthrough; matcher excludes api/ |
| `src/lib/auth/require-auth.ts` | requireAuth() utility returning Session or NextResponse(401) | ✓ VERIFIED | 29 lines; getServerSession(authOptions); returns 401 JSON; AuthResult type exported |
| `src/app/api/collections/route.ts` | POST guarded with requireAuth() | ✓ VERIFIED | L4 import, L30-31 guard |
| `src/app/api/collections/[id]/route.ts` | PUT and DELETE guarded with requireAuth() | ✓ VERIFIED | L4 import, L44-45 guard (PUT), L93-94 guard (DELETE); grep count=3 confirms 1 import + 2 guards |
| `src/app/api/collections/[id]/duplicate/route.ts` | POST guarded with requireAuth() | ✓ VERIFIED | L3 import, L9-10 guard |
| `src/app/api/collections/[id]/themes/route.ts` | POST guarded with requireAuth() | ✓ VERIFIED | L4 import, L35-36 guard |
| `src/app/api/collections/[id]/themes/[themeId]/route.ts` | PUT and DELETE guarded with requireAuth() | ✓ VERIFIED | L6 import, L12-13 guard (PUT), L79-80 guard (DELETE) |
| `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts` | PATCH guarded with requireAuth() | ✓ VERIFIED | L5 import, L11-12 guard |
| `src/app/api/export/github/route.ts` | POST guarded with requireAuth() | ✓ VERIFIED | L2 import, L5-6 guard |
| `src/app/api/import/github/route.ts` | POST guarded with requireAuth() | ✓ VERIFIED | L2 import, L77-78 guard (first statement in POST body; helper functions precede the handler) |
| `src/app/api/figma/import/route.ts` | POST guarded with requireAuth() | ✓ VERIFIED | L3 import, L89-90 guard (first statement in POST body; type helpers precede the handler) |
| `src/app/api/export/figma/route.ts` | POST guarded with requireAuth() | ✓ VERIFIED | L5 import, L8-9 guard |
| `src/app/api/tokens/[...path]/route.ts` | PUT guarded with requireAuth() | ✓ VERIFIED | L4 import, L10-11 guard |
| `src/app/api/build-tokens/route.ts` | POST guarded with requireAuth() | ✓ VERIFIED | L4 import, L9-10 guard |
| `src/app/api/database/config/route.ts` | PUT guarded with requireAuth() | ✓ VERIFIED | L5 import, L26-27 guard |
| `src/app/api/database/test/route.ts` | POST guarded with requireAuth() | ✓ VERIFIED | L4 import, L7-8 guard |
| `src/app/api/github/branches/route.ts` | POST guarded with requireAuth() | ✓ VERIFIED | L2 import, L6-7 guard |
| `src/lib/auth/` directory | Complete: nextauth.config.ts, permissions.ts, invite.ts, require-auth.ts | ✓ VERIFIED | All 4 files confirmed present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/middleware.ts` | `src/lib/auth/nextauth.config.ts` | withAuth reads pages.signIn from authOptions (configured as /auth/sign-in) | ✓ WIRED | authOptions.pages.signIn = '/auth/sign-in' confirmed at nextauth.config.ts L61-62; withAuth reads this automatically |
| `src/middleware.ts` | authorized callback | `authorized: ({ token, req }) => { if startsWith('/auth/') return true; return !!token; }` | ✓ WIRED | middleware.ts L20-23 confirmed — /auth/* allowed unauthenticated; all other routes require token |
| `src/lib/auth/require-auth.ts` | `src/lib/auth/nextauth.config.ts` | `getServerSession(authOptions)` single-argument App Router form | ✓ WIRED | require-auth.ts L5 import; L24 `getServerSession(authOptions)` confirmed |
| `src/app/api/collections/route.ts` | `src/lib/auth/require-auth.ts` | `import { requireAuth } from '@/lib/auth/require-auth'` | ✓ WIRED | L4 import confirmed; used in POST L30-31 |
| `src/app/api/auth/setup/route.ts` | (intentionally excluded) | comment explaining bootstrap exception | ✓ WIRED | Block comment at L21-28 present; no requireAuth() call in POST handler |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| AUTH-02 | 18-01, 18-03 | Unauthenticated users are redirected to the sign-in page | ✓ SATISFIED | middleware.ts: withAuth with authorized callback redirects non-token requests; /auth/* paths allowed; callbackUrl appended automatically |
| ARCH-02 | 18-01, 18-02, 18-03 | All 18 existing write Route Handlers are guarded with getServerSession() / requireAuth() — middleware alone is not a security boundary | ✓ SATISFIED | 17 handlers have requireAuth() guard; 1 (POST /api/auth/setup) is documented exception — confirmed by exact count of 18 write handler exports |

No orphaned requirements — REQUIREMENTS.md traceability table maps AUTH-02 and ARCH-02 to Phase 18, status Complete.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

Checked `src/middleware.ts` and `src/lib/auth/require-auth.ts` for TODO/FIXME/placeholder/return null/empty implementations. Zero hits. TypeScript compilation passes with zero errors (`npx tsc --noEmit` clean).

### Human Verification Required

All 4 items below were addressed by the 18-03 plan checkpoint, which is a blocking human gate. The plan's SUMMARY documents that all 4 scenarios were approved by human. These are listed for completeness:

#### 1. Unauthenticated Page Redirect with callbackUrl

**Test:** Open incognito browser. Visit `http://localhost:3000/collections`.
**Expected:** Browser redirects to `http://localhost:3000/auth/sign-in?callbackUrl=%2Fcollections`
**Why human:** Redirect chain and query param cannot be verified statically.

#### 2. API Write Handler Returns 401 JSON

**Test:** `curl -s -X POST http://localhost:3000/api/collections -H "Content-Type: application/json" -d '{"name":"test"}'`
**Expected:** Response body `{"error":"Unauthorized"}` and HTTP status `401`
**Why human:** Requires running dev server.

#### 3. CVE-2025-29927 x-middleware-subrequest Header Blocked

**Test:** `curl -v -H "x-middleware-subrequest: middleware" http://localhost:3000/collections 2>&1 | grep -E "< HTTP|Location:"`
**Expected:** HTTP 307/302/303 redirect with Location pointing to `/auth/sign-in`
**Why human:** Requires runtime Edge middleware execution.

#### 4. Authenticated User Redirected Away from Sign-In Page

**Test:** Sign in, then navigate directly to `http://localhost:3000/auth/sign-in`.
**Expected:** Immediate redirect to `http://localhost:3000/collections` — sign-in form not shown.
**Why human:** Requires authenticated browser session. Note: 18-03 SUMMARY documents a bug was found (matcher excluded /auth/*) and fixed (commit `00e440d`) before this was approved.

### Additional Notes

**Middleware matcher evolution (important for re-verification):** The original 18-01 plan specified a matcher with `(?!api|auth|...)` that excluded `/auth/*`. During 18-03 human verification, this was found to break Scenario 4. The fix (commit `00e440d`) removed `auth` from the exclusion so `/auth/sign-in` is now matched, and the `authorized` callback was updated to return `true` for `/auth/*` paths (preventing the infinite redirect loop). The current `src/middleware.ts` reflects the corrected version.

**GET handlers intentionally unguarded:** Three route files (`/api/figma/collections`, `/api/figma/test`, `/api/tokens`) have only GET handlers and no requireAuth. This is correct — ARCH-02 specifies write handlers only. These routes are read-only.

---

## Gap Summary

No gaps. All automated checks passed. 9/9 truths verified — 5 by direct codebase inspection, 4 by the blocking 18-03 human checkpoint (all 4 runtime scenarios approved). TypeScript compiles cleanly. Requirements AUTH-02 and ARCH-02 are both satisfied.

---

_Verified: 2026-03-28T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
