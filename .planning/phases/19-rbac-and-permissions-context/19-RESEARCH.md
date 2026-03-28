# Phase 19: RBAC and Permissions Context - Research

**Researched:** 2026-03-28
**Domain:** Role-Based Access Control — Next.js App Router, NextAuth JWT strategy, React Context, MongoDB collection-access grants
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Permission hook API**
- `usePermissions()` reads `collectionId` from `CollectionContext` automatically — no params at call site
- Returns named booleans only: `{ canEdit, canCreate, isAdmin, canGitHub, canFigma }`
- Returns all `false` while session is loading (safe default — nothing allowed until confirmed)
- `PermissionsProvider` lives in root `layout.tsx` so any component anywhere can call `usePermissions()`

**Collection access model**
- **Admin**: universal access to all collections, all operations — no grant needed
- **Editor**: must be explicitly granted access per collection; within granted collections, has full write access
- **Viewer**: must be explicitly granted access per collection; within granted collections, has read-only access
- Collections not granted to a user are completely invisible — they do not appear in lists and return 404 on direct URL
- Only Admins can grant or revoke collection access for other users

**Role and permission changes**
- Changes take effect on next sign-in (no polling, no real-time push)
- Admin sees immediate feedback via success toast in their own UI after making a change
- Affected user sees the change on their next session refresh or sign-in
- No forced session invalidation on role downgrade — current session continues until natural expiry

**403 error behavior**
- Write controls (`canEdit`, `canCreate`, `canGitHub`, `canFigma` === false) are disabled or hidden proactively via `usePermissions()` — 403s are a safety net, not the primary UX
- If a 403 occurs anyway (stale session, direct API call), redirect to sign-in
- Users without collection access cannot reach the collection at all (hidden from lists, 404 on direct URL)

### Claude's Discretion
- Exact implementation of `canEdit` vs `canCreate` distinction within Editor role
- Bootstrap/backfill logic for assigning existing collections to the first Admin user at startup
- Where in the middleware vs route handler the permission check lives for each API route
- Internal shape of `CollectionPermission` records (userId + collectionId + role field)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERM-01 | Admin role grants full access — user management, create/delete collections, read-write on all collections, GitHub push/pull, Figma push/pull | `canPerform()` with `Action.*` mapping; `requireRole(session, Action.*)` in route handlers; `usePermissions()` returns `isAdmin: true` |
| PERM-02 | Editor role grants read-write on all collections, create collections, GitHub push/pull, Figma push/pull (no user management) | Existing `PERMISSIONS` map in `permissions.ts` already encodes this; `requireRole()` checks against it; `usePermissions()` returns `canEdit: true`, `canCreate: true`, `canGitHub: true`, `canFigma: true` |
| PERM-03 | Viewer role grants read-only access to all collections; no create, no push/pull, no user management | `requireRole(session, Action.Write)` returns 403 for Viewer; `usePermissions()` returns all `false` except session loading check |
| PERM-04 | Admin can set a per-collection access override for any user | New API route `POST /api/collections/[id]/permissions`; writes `CollectionPermission` document; `PermissionsProvider` re-reads on collection change |
| PERM-05 | All existing MongoDB collections are assigned to the first Admin user after auth is introduced (one-time migration at bootstrap) | Bootstrap script or idempotent `GET /api/collections` side-effect: if `CollectionPermission` count is 0, find first Admin user and insert grants for all collections |
| PERM-06 | Permissions available globally via React context (`PermissionsProvider` + `usePermissions()`) | `PermissionsContext.tsx` already scaffolded; Phase 19 expands it with named booleans + collection-aware permission fetch |
</phase_requirements>

---

## Summary

Phase 19 builds on Phases 16–18's auth foundation to add role enforcement. The infrastructure is largely in place: `permissions.ts` defines roles and actions, `CollectionPermission` Mongoose model exists, `PermissionsProvider` is scaffolded, and all 17 write route handlers already call `requireAuth()`. Phase 19's job is to go one layer deeper — from "is the user authenticated?" to "is the user authorized for this specific action on this specific collection?"

The access model is a two-layer check: (1) org-level role check (Admin/Editor/Viewer against the desired Action), and (2) for non-Admins, a collection-level grant check against `CollectionPermission`. Admins bypass both layers. Editors and Viewers must hold an explicit `CollectionPermission` grant; without one, the collection does not exist for them (hidden from lists, 404 on direct URL).

The React side (`usePermissions()`) needs to change its return type from `{ role, canPerform }` to `{ canEdit, canCreate, isAdmin, canGitHub, canFigma }` — pre-computed booleans that account for both the org role and the active collection's grant. Since `usePermissions()` is not yet called anywhere in components (only defined), this is a non-breaking rename.

**Primary recommendation:** Implement `requireRole(session, action, collectionId?)` in `src/lib/auth/require-auth.ts` as the single server-side gate; expand `PermissionsContext.tsx` to fetch the active collection's effective role and compute named booleans; add a bootstrap idempotent function called from the collections list API.

---

## Standard Stack

### Core (all already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next-auth` | `^4.24.13` | JWT session with role embedded; `getServerSession(authOptions)` in route handlers | Already wired in Phase 16–18; JWT carries `id`, `role` |
| `mongoose` | `^9.2.2` | `CollectionPermission` model for grant records; `User` model for Admin lookup | Already in project; model schema defined in Phase 16 |
| `next` | `13.5.9` | App Router route handlers, `usePathname` for collection-aware context | Locked version; CVE patched |
| React Context (`createContext`) | Built-in | `PermissionsContext` distributes pre-computed booleans globally | Already scaffolded in `src/context/PermissionsContext.tsx` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` (Toaster) | Already installed | Success/error toasts for permission grant feedback | Admin sees toast after granting/revoking collection access |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom `requireRole()` in `require-auth.ts` | Casbin, CASL, Permit.io | Libraries add complexity; the project's role set (3 roles, ~6 actions) doesn't justify a dependency |
| Eager grant fetch at session start | Lazy per-collection fetch on page load | Eager loads ALL grants at sign-in which doesn't scale; lazy is correct for this model |
| Polling for permission updates | SSE / WebSocket push | Project decision: changes apply on next sign-in; no real-time requirement |

**Installation:** No new packages required.

---

## Architecture Patterns

### Current State: What Exists

```
src/
├── lib/auth/
│   ├── permissions.ts          # Role, Action, canPerform() — canonical source of truth
│   ├── require-auth.ts         # requireAuth() — returns Session or 401 NextResponse
│   └── nextauth.config.ts      # authOptions — JWT strategy, SUPER_ADMIN_EMAIL enforcement
├── lib/db/models/
│   ├── User.ts                 # IUser with role field
│   └── CollectionPermission.ts # (userId, collectionId, role) — exists, NOT YET USED
├── context/
│   └── PermissionsContext.tsx  # PermissionsProvider + usePermissions() — SCAFFOLDED ONLY
│                               # Current API: { role, canPerform } — MUST CHANGE to named booleans
└── components/providers/
    └── AuthProviders.tsx       # SessionProvider > PermissionsProvider — already in layout.tsx
```

### Target State: What Phase 19 Builds

```
src/
├── lib/auth/
│   ├── permissions.ts          # EXTEND: add effectiveRole() helper for collection-scoped lookup
│   ├── require-auth.ts         # EXTEND: add requireRole(session, action, collectionId?)
│   └── collection-bootstrap.ts # NEW: backfill CollectionPermission for first Admin at startup
├── app/api/
│   ├── collections/route.ts    # EXTEND GET: trigger bootstrap; filter list by access for Viewers/Editors
│   ├── collections/[id]/       # EXTEND all write handlers: requireRole() instead of requireAuth()
│   └── collections/[id]/permissions/
│       └── route.ts            # NEW: GET (list grants), POST (grant), DELETE (revoke)
└── context/
    └── PermissionsContext.tsx  # REWRITE: fetch effective role for active collectionId,
                                # return { canEdit, canCreate, isAdmin, canGitHub, canFigma }
```

### Pattern 1: requireRole() — Server-Side Authorization Gate

**What:** Extends `requireAuth()` to also check org-level role and (optionally) collection-level grant. Single call replaces `requireAuth()` on all write routes that are permission-gated beyond "just authenticated".

**When to use:** On every write route handler. Replace existing `requireAuth()` calls with `requireRole()` where role enforcement is needed.

**Example:**
```typescript
// src/lib/auth/require-auth.ts (extended)

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { authOptions } from './nextauth.config';
import { canPerform } from './permissions';
import type { ActionType, Role } from './permissions';
import dbConnect from '@/lib/mongodb';
import CollectionPermission from '@/lib/db/models/CollectionPermission';

export type AuthResult = Session | NextResponse;

/** Returns Session or 401 NextResponse — unchanged from Phase 18 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}

/**
 * Returns Session (with effective role resolved) or 401/403 NextResponse.
 *
 * - If session is missing: 401
 * - If org role is Admin: always passes (no collection grant check)
 * - If collectionId provided and role is Editor/Viewer: checks CollectionPermission grant
 *   - No grant found: 403 (collection does not exist for this user)
 *   - Grant found: uses grant role for canPerform check
 * - If org role cannot perform action: 403
 *
 * Usage:
 *   const authResult = await requireRole(Action.Write, params.id);
 *   if (authResult instanceof NextResponse) return authResult;
 *   // authResult is Session
 */
export async function requireRole(
  action: ActionType,
  collectionId?: string,
): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgRole = session.user.role as Role;

  // Admins bypass all collection-level checks
  if (orgRole === 'Admin') {
    if (!canPerform('Admin', action)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return session;
  }

  // Non-Admin: resolve effective role for this collection
  let effectiveRole: Role = orgRole;
  if (collectionId) {
    await dbConnect();
    const grant = await CollectionPermission.findOne({
      userId: session.user.id,
      collectionId,
    }).lean();
    if (!grant) {
      // No grant = collection is invisible to this user
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    effectiveRole = grant.role as Role;
  }

  if (!canPerform(effectiveRole, action)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return session;
}
```

### Pattern 2: PermissionsContext — Collection-Aware Named Booleans

**What:** Rewrite `PermissionsContext.tsx` to fetch the effective role for the currently active collection and compute named booleans. The active collection ID comes from `CollectionContext.selectedId` (which is already in scope via `CollectionProvider` wrapping `PermissionsProvider`).

**Key constraint:** `PermissionsProvider` is in `AuthProviders` which is in root `layout.tsx`. `CollectionContext` is in `LayoutShell` which is a child of `AuthProviders`. This means `PermissionsProvider` **cannot** directly call `useCollection()` — it would be outside the `CollectionProvider`.

**Resolution:** The fetch for effective permissions belongs in the collection-level context or in the `PermissionsProvider` reading from URL params instead of `CollectionContext`. Use `usePathname()` to extract the collection ID from `/collections/[id]/...` routes — this avoids the context nesting problem.

**Example:**
```typescript
// src/context/PermissionsContext.tsx (rewritten)
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { canPerform } from '@/lib/auth/permissions';
import type { Role } from '@/lib/auth/permissions';
import { Action } from '@/lib/auth/permissions';

export interface PermissionsContextValue {
  canEdit:    boolean;  // Action.Write on active collection
  canCreate:  boolean;  // Action.CreateCollection
  isAdmin:    boolean;  // org role === Admin
  canGitHub:  boolean;  // Action.PushGithub on active collection
  canFigma:   boolean;  // Action.PushFigma on active collection
}

const DEFAULT_PERMISSIONS: PermissionsContextValue = {
  canEdit:   false,
  canCreate: false,
  isAdmin:   false,
  canGitHub: false,
  canFigma:  false,
};

const PermissionsContext = createContext<PermissionsContextValue>(DEFAULT_PERMISSIONS);

/** Extract /collections/[id] from pathname, or null */
function extractCollectionId(pathname: string): string | null {
  const match = pathname.match(/^\/collections\/([^/]+)/);
  return match ? match[1] : null;
}

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [effectiveRole, setEffectiveRole] = useState<Role | null>(null);
  const collectionId = extractCollectionId(pathname);
  const orgRole = (session?.user?.role as Role) ?? null;

  useEffect(() => {
    if (status === 'loading' || !orgRole) {
      setEffectiveRole(null);
      return;
    }
    if (orgRole === 'Admin') {
      setEffectiveRole('Admin');
      return;
    }
    if (!collectionId) {
      // No collection in URL: use org role for top-level permissions (canCreate, isAdmin)
      setEffectiveRole(orgRole);
      return;
    }
    // Fetch effective role for this specific collection
    let cancelled = false;
    fetch(`/api/collections/${collectionId}/permissions/me`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled) {
          setEffectiveRole(data?.role ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setEffectiveRole(null);
      });
    return () => { cancelled = true; };
  }, [orgRole, collectionId, status]);

  const role = effectiveRole;

  const value: PermissionsContextValue = {
    canEdit:   role ? canPerform(role, Action.Write) : false,
    canCreate: orgRole ? canPerform(orgRole, Action.CreateCollection) : false,
    isAdmin:   orgRole === 'Admin',
    canGitHub: role ? canPerform(role, Action.PushGithub) : false,
    canFigma:  role ? canPerform(role, Action.PushFigma) : false,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  return useContext(PermissionsContext);
}
```

### Pattern 3: /api/collections/[id]/permissions/me — Effective Role Endpoint

**What:** A thin GET endpoint that returns the effective role for the current user on a specific collection. Used by `PermissionsProvider` to compute context booleans.

**Example:**
```typescript
// src/app/api/collections/[id]/permissions/me/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth.config';
import CollectionPermission from '@/lib/db/models/CollectionPermission';
import dbConnect from '@/lib/mongodb';
import type { Role } from '@/lib/auth/permissions';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgRole = session.user.role as Role;
  if (orgRole === 'Admin') {
    return NextResponse.json({ role: 'Admin' });
  }

  await dbConnect();
  const grant = await CollectionPermission.findOne({
    userId: session.user.id,
    collectionId: params.id,
  }).lean();

  if (!grant) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  return NextResponse.json({ role: grant.role });
}
```

### Pattern 4: Bootstrap Backfill — Idempotent Startup Grant

**What:** When `GET /api/collections` is called and zero `CollectionPermission` records exist, find the first Admin user and insert grants for all existing collections. This is PERM-05: ensures pre-auth collections are accessible after auth is introduced.

**When to use:** Triggered once from `GET /api/collections` — idempotent guard prevents re-running.

**Example:**
```typescript
// src/lib/auth/collection-bootstrap.ts

import dbConnect from '@/lib/mongodb';
import CollectionPermission from '@/lib/db/models/CollectionPermission';
import TokenCollection from '@/lib/db/models/TokenCollection';
import User from '@/lib/db/models/User';

/**
 * One-time backfill: if no CollectionPermission records exist, find the first Admin
 * user and grant them Admin access to all collections.
 * Idempotent: early-returns if any grants already exist.
 */
export async function bootstrapCollectionGrants(): Promise<void> {
  await dbConnect();
  const existingCount = await CollectionPermission.countDocuments();
  if (existingCount > 0) return; // already bootstrapped

  const admin = await User.findOne({ role: 'Admin' }).sort({ createdAt: 1 }).lean();
  if (!admin) return; // no admin yet (pre-setup state)

  const collections = await TokenCollection.find({}, '_id').lean();
  if (collections.length === 0) return;

  const grants = collections.map(c => ({
    userId: admin._id.toString(),
    collectionId: c._id.toString(),
    role: 'Admin' as const,
  }));

  await CollectionPermission.insertMany(grants, { ordered: false });
}
```

### Pattern 5: Collection List Filtering — Visibility Gate

**What:** `GET /api/collections` filters the returned list based on the requesting user's grants. Admins see all. Editors/Viewers see only collections they have a `CollectionPermission` record for.

**Example:**
```typescript
// In GET /api/collections/route.ts — extended logic:
export async function GET() {
  await bootstrapCollectionGrants(); // idempotent — no-op after first run

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgRole = session.user.role as Role;
  const repo = await getRepository();
  const docs = await repo.list();

  let visibleCollections = docs;
  if (orgRole !== 'Admin') {
    await dbConnect();
    const grants = await CollectionPermission.find(
      { userId: session.user.id },
      'collectionId'
    ).lean();
    const grantedIds = new Set(grants.map(g => g.collectionId));
    visibleCollections = docs.filter(d => grantedIds.has(d._id));
  }

  // ... map to CollectionCardData and return
}
```

**Note:** `GET /api/collections` currently does NOT call `requireAuth()` (it's a read handler). Phase 19 must add auth check to it since the list is now user-scoped.

### Anti-Patterns to Avoid

- **Using `requireAuth()` where role check is needed:** `requireAuth()` only validates session existence. On write routes, replace or supplement with `requireRole()`.
- **Checking role in middleware for API routes:** The project decision (from Phase 18) is that middleware handles HTML pages only; API security is in route handlers. Do not add role logic to middleware.
- **Polling for permission changes client-side:** CONTEXT.md locks the decision: changes apply on next sign-in. No `setInterval` or SWR polling in `PermissionsProvider`.
- **Returning 403 instead of 404 for invisible collections:** For non-Admin users with no grant, always return 404 — 403 would reveal the collection exists. The CONTEXT.md decision says "404 on direct URL".
- **Making `PermissionsProvider` depend on `useCollection()`:** `PermissionsProvider` is above `CollectionProvider` in the tree. Use `usePathname()` to extract collection ID instead.
- **Mixing `canEdit` semantics for org-level create vs. collection-level edit:** `canCreate` uses org role; `canEdit` uses effective (collection-scoped) role.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Role hierarchy / inheritance | Custom role graph | `canPerform()` in `permissions.ts` | Already exists and complete; the 3-role model doesn't need inheritance |
| Permission caching | Custom TTL cache | Rely on session (role) + fetch per collection | Session already provides org role; collection grant fetch is one DB query per page load |
| JWT invalidation on role change | Token revocation list | Accept stale session until natural expiry | Project decision: no forced invalidation; acceptable for internal tool |
| MongoDB query helpers | Custom query builder | Direct Mongoose queries in route handlers | Simple lookups don't need abstraction |

**Key insight:** The permission model has 3 roles and 7 actions. Any abstraction beyond the existing `canPerform()` pure function would be over-engineering.

---

## Common Pitfalls

### Pitfall 1: PermissionsProvider/CollectionProvider nesting order

**What goes wrong:** `PermissionsProvider` tries to call `useCollection()` but is mounted above `CollectionProvider` in the React tree (`AuthProviders` > `LayoutShell` > `CollectionProvider`). This throws "useCollection must be used within CollectionProvider".

**Why it happens:** `AuthProviders` is in root `layout.tsx` wrapping everything; `CollectionProvider` is inside `LayoutShell` which is a child.

**How to avoid:** Use `usePathname()` in `PermissionsProvider` to extract the collection ID directly from the URL. Do NOT attempt to call `useCollection()` from `PermissionsProvider`.

**Warning signs:** Runtime error "useCollection must be used within CollectionProvider" on any page load.

### Pitfall 2: GET /api/collections is currently unguarded

**What goes wrong:** `GET /api/collections` currently has no `requireAuth()` call (it's a read endpoint, left unguarded per Phase 18 decision). After Phase 19, this endpoint must filter results by user access — which requires knowing who the user is. An unauthenticated call must be rejected.

**Why it happens:** Phase 18 only guarded write handlers per ARCH-02. Phase 19's visibility gating requires auth on the collections list GET.

**How to avoid:** Add `getServerSession()` to `GET /api/collections` in Phase 19. If no session, return 401.

**Warning signs:** All collections visible to unauthenticated users; Viewers/Editors see collections they don't have grants for.

### Pitfall 3: 403 instead of 404 for invisible collections

**What goes wrong:** Returning `{ error: 'Forbidden' }, { status: 403 }` for a collection the user has no grant for reveals that the collection exists. Security-sensitive: information disclosure.

**Why it happens:** Developers instinctively use 403 for authorization failures.

**How to avoid:** For non-Admin users without a `CollectionPermission` grant: return 404. The collection does not exist for them. Confirmed by CONTEXT.md: "collections not granted to a user are completely invisible — return 404 on direct URL".

**Warning signs:** Non-Admin users can enumerate collection IDs by observing 403 vs 404 responses.

### Pitfall 4: usePermissions() API breaking change

**What goes wrong:** The current `PermissionsContext.tsx` exports `{ role, canPerform }`. The CONTEXT.md decision changes this to `{ canEdit, canCreate, isAdmin, canGitHub, canFigma }`. If any component calls `usePermissions().canPerform(...)` it will break.

**Why it happens:** The scaffold was intentionally minimal (Phase 17-02 note: "hook API surface stays identical" — but Phase 19 CONTEXT.md explicitly changes it).

**How to avoid:** Verify no components consume `usePermissions()` before changing the API. Confirmed by codebase inspection: `usePermissions()` is defined but not yet called in any component. Safe to replace entirely.

**Warning signs:** TypeScript error `Property 'canPerform' does not exist on type PermissionsContextValue`.

### Pitfall 5: Bootstrap runs on every request

**What goes wrong:** `bootstrapCollectionGrants()` runs on every `GET /api/collections` and issues a `countDocuments()` query each time even after bootstrap is complete.

**Why it happens:** Naive implementation calls it unconditionally.

**How to avoid:** The `countDocuments() > 0` early-return makes this a cheap query. Alternatively, use a module-level `let bootstrapComplete = false` flag to skip the DB call after first successful run in the same process. The idempotent DB check is the safety net.

**Warning signs:** Slow collection list responses; MongoDB query logs showing repeated `countDocuments` on `collectionpermissions`.

### Pitfall 6: requireRole() signature confusion — action vs. collectionId order

**What goes wrong:** Route handlers may pass `collectionId` before `action` or omit `collectionId` when it's required for collection-scoped routes.

**Why it happens:** The function signature is easy to miscall when adding to existing handlers.

**How to avoid:** Make `action` the first param and `collectionId` optional second. On collection-scoped routes (`/api/collections/[id]/*`), always pass `params.id` as `collectionId`. On org-level routes (`POST /api/collections` to create), pass no `collectionId` (org role check only).

**Warning signs:** 404s for Admin users on collection routes; or Viewers able to write by calling without `collectionId`.

---

## Code Examples

### Route handler upgrade — collection-scoped write

```typescript
// BEFORE (Phase 18):
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  // ... business logic
}

// AFTER (Phase 19):
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;
  // authResult is Session — authResult.user.id / authResult.user.role available
  // ... business logic
}
```

### Route handler upgrade — org-level create

```typescript
// POST /api/collections — create new collection (org-level, no specific collectionId)
export async function POST(request: Request) {
  const authResult = await requireRole(Action.CreateCollection);
  if (authResult instanceof NextResponse) return authResult;
  // ... business logic
}
```

### Route handler upgrade — GitHub/Figma push

```typescript
// POST /api/export/github — role must include PushGithub
// These routes don't have a collection-scoped ID in their path; collectionId comes from body
// Resolution: check Action.PushGithub against org role only (the collection access was
// already gated at the UI level before reaching this endpoint)
export async function POST(request: NextRequest) {
  const authResult = await requireRole(Action.PushGithub);
  if (authResult instanceof NextResponse) return authResult;
  // ... business logic
}
```

### Calling usePermissions() in a component (Phase 21 preview)

```typescript
// Any client component anywhere in the tree:
import { usePermissions } from '@/context/PermissionsContext';

export function TokenEditField({ ... }) {
  const { canEdit } = usePermissions();

  return (
    <input
      disabled={!canEdit}
      // ...
    />
  );
}
```

### Granting collection access (Admin only)

```typescript
// POST /api/collections/[id]/permissions
// Body: { userId: string, role: 'Editor' | 'Viewer' }
// Returns 201 on new grant, 200 on update, 403 if caller is not Admin

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireRole(Action.ManageUsers); // ManageUsers = Admin only
  if (authResult instanceof NextResponse) return authResult;

  const { userId, role } = await request.json();

  await dbConnect();
  await CollectionPermission.findOneAndUpdate(
    { userId, collectionId: params.id },
    { userId, collectionId: params.id, role },
    { upsert: true, new: true }
  );

  return NextResponse.json({ success: true });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No auth (pre-Phase 16) | JWT session with role embedded | Phases 16–18 | All write routes now require valid JWT |
| `requireAuth()` only | `requireRole(action, collectionId?)` | Phase 19 | Authorization layer: role + collection grant checked |
| `usePermissions()` returns `{ role, canPerform }` | Returns `{ canEdit, canCreate, isAdmin, canGitHub, canFigma }` | Phase 19 | Pre-computed booleans; collection-scoped; no prop drilling |
| All collections visible to all users | Non-Admin users see only granted collections | Phase 19 | `GET /api/collections` filters by `CollectionPermission`; 404 on ungated direct URLs |
| `CollectionPermission` model exists, unused | Model used for grant lookup on every collection-scoped request | Phase 19 | The model scaffold from Phase 16 is finally activated |

**Deprecated/outdated after Phase 19:**
- Direct `requireAuth()` calls on collection-write routes: replace with `requireRole(action, collectionId)`.
- `PermissionsContext` returning `{ role, canPerform }`: replaced with named booleans.

---

## Open Questions

1. **Export routes (GitHub/Figma) and collection IDs**
   - What we know: `POST /api/export/github` and `POST /api/export/figma` accept collection config in the request body, not as URL params. They don't have a `[id]` segment.
   - What's unclear: Should these routes do a collection-scoped grant check (requiring `collectionId` from body) or just an org-level role check (`Action.PushGithub` against org role)?
   - Recommendation: Use org-level role check only (`requireRole(Action.PushGithub)` with no `collectionId`). The collection access was already gated at the UI layer; the export routes handle data that was already loaded. This is the simpler approach and avoids parsing body before auth check.

2. **PERM-04 scope: grant API in Phase 19 vs Phase 21**
   - What we know: PERM-04 is "Admin can set a per-collection access override for any user". The Admin UI for this is Phase 21. The API infrastructure may be needed in Phase 19 for completeness or can wait.
   - What's unclear: Should Phase 19 create `POST /api/collections/[id]/permissions` even though no UI calls it until Phase 21?
   - Recommendation: Create the API route in Phase 19 alongside the model usage. It's a natural part of wiring up `CollectionPermission` and makes manual testing (via curl) possible for verification.

3. **CollectionPermission role field semantics**
   - What we know: The model has a `role` field with enum `['Admin', 'Editor', 'Viewer']`. The CONTEXT.md model says Editors get "full write access within granted collections" and Viewers get "read-only".
   - What's unclear: Can an Admin grant a user `Admin` access to a collection (via `CollectionPermission.role = 'Admin'`), or is that reserved for org-level Admin?
   - Recommendation: Allow it in the data model (schema already supports it) but the grant API should only allow `'Editor'` or `'Viewer'` as grant roles. Org Admins don't need a per-collection grant. If org role is Admin, the `CollectionPermission` lookup is bypassed entirely.

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — `src/lib/auth/permissions.ts`, `require-auth.ts`, `nextauth.config.ts`
- Codebase direct inspection — `src/lib/db/models/CollectionPermission.ts`, `User.ts`
- Codebase direct inspection — `src/context/PermissionsContext.tsx`, `AuthProviders.tsx`, `LayoutShell.tsx`
- Codebase direct inspection — all 17 write route handlers with `requireAuth()` calls
- `.planning/phases/19-rbac-and-permissions-context/19-CONTEXT.md` — locked decisions
- `.planning/STATE.md` — accumulated architectural decisions from Phases 16–18

### Secondary (MEDIUM confidence)
- Next.js App Router docs (as of training data, Aug 2025) — `usePathname()` in Client Components, Server Component layout patterns
- NextAuth v4 docs — `getServerSession(authOptions)` single-arg form in App Router route handlers

### Tertiary (LOW confidence)
- None — all critical findings verified against project codebase directly.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already in project; no new dependencies
- Architecture: HIGH — based on direct codebase inspection; patterns follow existing project conventions
- Pitfalls: HIGH — derived from actual code structure and locked CONTEXT.md decisions

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable; no rapidly-changing dependencies)
