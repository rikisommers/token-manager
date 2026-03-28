# Architecture Research

**Domain:** Auth + Org User Management layer on Next.js 13.5.6 App Router (brownfield)
**Researched:** 2026-03-28
**Confidence:** HIGH (NextAuth.js v4 + App Router patterns verified via official docs; Resend API verified via official docs; Mongoose compatibility verified via official Next.js guide)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Client)                                 │
│  ┌──────────────────┐  ┌───────────────────┐  ┌────────────────────────┐ │
│  │  Sign-in page    │  │  App pages        │  │  Org Users admin page  │ │
│  │  /auth/sign-in   │  │  /collections/…   │  │  /org/users            │ │
│  └────────┬─────────┘  └────────┬──────────┘  └──────────┬─────────────┘ │
│           │  useSession         │  usePermissions hook   │               │
│           └─────────────────────┴────────────────────────┘               │
│                                 │                                         │
│                        SessionProvider                                    │
│                        PermissionsProvider (React context, 'use client') │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │ HTTP / fetch
┌─────────────────────────────────▼────────────────────────────────────────┐
│                           MIDDLEWARE (Edge-adjacent)                      │
│  src/middleware.ts — withAuth (JWT only, no DB at edge)                  │
│  Protects: all routes except /auth/sign-in, /auth/invite/*               │
│  Redirects unauthenticated -> /auth/sign-in                              │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼────────────────────────────────────────┐
│                           NEXT.JS APP ROUTER (Node.js)                   │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  AUTH LAYER (isolated)                                            │    │
│  │  src/app/api/auth/[...nextauth]/route.ts  — NextAuth handler     │    │
│  │  src/app/api/auth/invite/route.ts         — POST create invite   │    │
│  │  src/app/api/auth/invite/[token]/route.ts — GET verify + POST    │    │
│  │  src/app/api/org/users/route.ts           — GET list             │    │
│  │  src/app/api/org/users/[id]/route.ts      — PATCH role, DELETE   │    │
│  │  src/lib/auth/nextauth.config.ts          — authOptions           │    │
│  │  src/lib/auth/session.ts                  — getSession() helper  │    │
│  │  src/lib/auth/permissions.ts              — canPerform() helper  │    │
│  │  src/lib/auth/invite.ts                   — token gen/verify     │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  EXISTING TOKEN MGMT LAYER (unchanged except auth guards)        │    │
│  │  src/app/api/collections/[id]/…                                  │    │
│  │  src/lib/graphEvaluator.ts, tokenGroupToGraph.ts, …             │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  EMAIL (isolated)                                                 │    │
│  │  src/lib/email/resend.ts          — Resend client singleton      │    │
│  │  src/lib/email/invite-email.tsx   — React email template        │    │
│  └──────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │ Mongoose
┌─────────────────────────────────▼────────────────────────────────────────┐
│                              MONGODB                                      │
│  Existing: TokenCollection                                                │
│  New:      User, Invite, CollectionPermission                            │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `src/middleware.ts` | Block unauthenticated requests at edge; redirect to sign-in | `withAuth` from `next-auth/middleware`, JWT strategy only |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth catch-all handler (GET + POST) | Route Handler exporting `{ handler as GET, handler as POST }` |
| `src/lib/auth/nextauth.config.ts` | Single authOptions definition; CredentialsProvider + callbacks | Imported by route handler AND by all `getServerSession()` callers |
| `src/lib/auth/session.ts` | Re-export `getServerSession(authOptions)` as a single-import helper | Thin wrapper to keep authOptions import in one place |
| `src/lib/auth/permissions.ts` | Pure `canPerform(role, action)` function and role type definitions | No React, no Next.js — plain TypeScript |
| `src/lib/auth/invite.ts` | Generate signed invite token (JWT via `jsonwebtoken`), verify on redemption | Token signed with `NEXTAUTH_SECRET`, stored hashed in Invite model |
| `src/lib/db/models/User.ts` | User schema: email, passwordHash, role, status, displayName | Mongoose model; hot-reload guard pattern |
| `src/lib/db/models/Invite.ts` | Invite schema: email, tokenHash, role, invitedBy, expiresAt, redeemedAt | Mongoose model |
| `src/lib/db/models/CollectionPermission.ts` | Per-collection role overrides: userId, collectionId, role | Mongoose model |
| `src/lib/email/resend.ts` | Resend client singleton + `sendInviteEmail()` function | `new Resend(process.env.RESEND_API_KEY)` |
| `src/lib/email/invite-email.tsx` | React Email template for invite | TSX component; rendered via `react` prop in Resend `.emails.send()` |
| `src/app/auth/sign-in/page.tsx` | Sign-in form (email + password); calls `signIn('credentials')` | Client component |
| `src/app/auth/invite/[token]/page.tsx` | Account setup form (display name + password) for invited users | Client component; calls verify API, then `signIn` |
| `src/app/org/users/page.tsx` | Admin-only org users list + invite form | Client component; uses `usePermissions` to guard |
| `src/components/auth/PermissionsProvider.tsx` | React context + `usePermissions` hook; wraps app | `'use client'`; reads `useSession()`, computes permission booleans |
| `src/components/auth/AuthProviders.tsx` | Wraps `SessionProvider` + `PermissionsProvider` | `'use client'`; placed inside `<body>` in root layout |

---

## Recommended Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/
│   │   │   │   └── route.ts          # NextAuth catch-all; GET + POST exports
│   │   │   ├── invite/
│   │   │   │   ├── route.ts          # POST — admin creates invite
│   │   │   │   └── [token]/
│   │   │   │       └── route.ts      # GET verify token info, POST redeem + create user
│   │   │   └── register-first/
│   │   │       └── route.ts          # POST — first-user bootstrap (no auth required)
│   │   ├── org/
│   │   │   ├── users/
│   │   │   │   ├── route.ts          # GET list users (admin-only)
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # PATCH role, DELETE user (admin-only)
│   │   │   └── permissions/
│   │   │       └── [collectionId]/
│   │   │           └── route.ts      # GET/PUT per-collection override (admin-only)
│   │   └── collections/              # EXISTING — auth guard added only
│   │       └── [id]/…
│   ├── auth/
│   │   ├── sign-in/
│   │   │   └── page.tsx              # Sign-in page (public, excluded from middleware)
│   │   └── invite/
│   │       └── [token]/
│   │           └── page.tsx          # Account setup page (public, token-gated)
│   ├── org/
│   │   └── users/
│   │       └── page.tsx              # Admin: org users list (protected, admin-only)
│   └── collections/                  # EXISTING — no structural changes
│       └── [id]/…
├── components/
│   ├── auth/                         # NEW domain folder
│   │   ├── AuthProviders.tsx         # 'use client' — SessionProvider + PermissionsProvider
│   │   ├── PermissionsProvider.tsx   # 'use client' — context + usePermissions hook
│   │   ├── SignInForm.tsx            # Email + password form
│   │   ├── InviteSetupForm.tsx       # Display name + password for invited user
│   │   └── index.ts                  # Barrel export
│   ├── org/                          # NEW domain folder
│   │   ├── UserTable.tsx             # Users list with role badges
│   │   ├── InviteUserDialog.tsx      # Admin invite modal
│   │   ├── RoleChangeSelect.tsx      # Role dropdown per-user
│   │   └── index.ts                  # Barrel export
│   └── [existing domains — unchanged]
├── lib/
│   ├── auth/                         # NEW — all auth logic isolated here
│   │   ├── nextauth.config.ts        # authOptions (CredentialsProvider + jwt/session callbacks)
│   │   ├── session.ts                # getSession() server helper (thin wrapper)
│   │   ├── permissions.ts            # canPerform() pure function + role type constants
│   │   └── invite.ts                 # invite token sign/verify via jsonwebtoken
│   ├── email/                        # NEW — email layer
│   │   ├── resend.ts                 # Resend singleton + sendInviteEmail()
│   │   └── invite-email.tsx          # React Email template
│   ├── db/
│   │   ├── models/
│   │   │   ├── TokenCollection.ts    # EXISTING — no changes
│   │   │   ├── User.ts               # NEW
│   │   │   ├── Invite.ts             # NEW
│   │   │   └── CollectionPermission.ts # NEW
│   │   └── [existing db files — unchanged]
│   └── [existing lib files — unchanged]
├── types/
│   ├── next-auth.d.ts                # NEW — module augmentation for role + id on Session/JWT
│   └── [existing types — unchanged]
└── middleware.ts                     # NEW (at src/middleware.ts) — withAuth + matcher
```

### Structure Rationale

- **`src/lib/auth/`:** All auth business logic (config, session helpers, permissions, invite tokens) in one isolated module. Token management code imports nothing from this module except via `getSession()`. This enforces the architectural constraint from the milestone brief.
- **`src/lib/email/`:** Email concerns separated from auth logic. `resend.ts` holds the client singleton; `invite-email.tsx` is the template. No coupling to NextAuth internals.
- **`src/app/auth/`:** Public-facing auth pages (sign-in, invite setup). Excluded from middleware matcher so unauthenticated users can reach them.
- **`src/app/org/`:** Admin UI pages. Protected by middleware AND by `usePermissions` guard inside the page component.
- **`src/app/api/auth/`:** Auth API routes. `[...nextauth]` is the NextAuth handler; `invite/` routes are custom and co-located at the auth boundary.
- **`src/app/api/org/`:** Org management API routes (user list, role changes). Separated from `auth/` because they are admin-management operations, not authentication.
- **`src/components/auth/`:** New domain folder following the existing `components/[domain]/` convention with barrel export. Never imports from `components/tokens/` or other token domains.
- **`src/types/next-auth.d.ts`:** TypeScript module augmentation for `Session` and `JWT` interfaces. Located in `types/` so the existing `tsconfig.json` `include: ["**/*.ts"]` glob picks it up.

---

## Architectural Patterns

### Pattern 1: Route Handler + Shared authOptions

**What:** The NextAuth route handler exports GET and POST from a route file. `authOptions` is defined in `src/lib/auth/nextauth.config.ts` and imported wherever `getServerSession` is called.

**When to use:** Every API route that needs to know the calling user's identity calls `getServerSession(authOptions)`. This applies to both new org API routes and to modified existing collection routes.

**Trade-offs:** Keeping `authOptions` in a separate file (not co-located with the route handler) avoids a circular import problem that arises in Next.js 13 App Router when route handler files are imported by other server files. This is the documented best practice from the NextAuth team.

**Example:**
```typescript
// src/lib/auth/nextauth.config.ts
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/db/models/User';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await dbConnect();
        const user = await User.findOne({ email: credentials.email }).lean();
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.displayName ?? user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // user is only present on initial sign-in
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      return session;
    },
  },
  pages: { signIn: '/auth/sign-in' },
};

// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth.config';
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### Pattern 2: JWT-Only Middleware; DB Checks Inside Handlers

**What:** `src/middleware.ts` uses `withAuth` from `next-auth/middleware` with JWT strategy only — no database access in middleware. DB-dependent permission checks (per-collection overrides, admin role verification) happen inside the API route handlers themselves, after middleware has verified a valid JWT exists.

**When to use:** Required because Next.js middleware runs in a restricted runtime that cannot use Mongoose's Node.js `net` API. Middleware only answers "is there a valid JWT?" Role enforcement is a separate concern handled per-handler.

**Trade-offs:** Middleware is fast and stateless (no DB round-trip per request). Role checking on each API handler adds a single `getServerSession()` call, which is also fast — it reads the JWT cookie without a network call. Per-collection permission lookups only run when explicitly needed.

**Example:**
```typescript
// src/middleware.ts (lives at src/middleware.ts since src/ is the project source root)
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    // Protect everything except auth pages and NextAuth internals
    '/((?!auth/sign-in|auth/invite|api/auth|_next/static|_next/image|favicon\\.ico).*)',
  ],
};
```

### Pattern 3: CredentialsProvider + JWT + No NextAuth Database Adapter

**What:** Use `CredentialsProvider` with `session: { strategy: 'jwt' }`. Do NOT install or configure a NextAuth database adapter. User records and invite records are managed via custom Mongoose models.

**When to use:** This codebase already uses Mongoose models for all persistence. There is no official Mongoose adapter for NextAuth v4 — only `@next-auth/mongodb-adapter` which uses a raw MongoClient connection. Adding a second MongoDB connection path (raw driver alongside Mongoose) would create parallel User representations in the database and require complex synchronization.

**Trade-offs:** JWT sessions scale horizontally and require no database round-trip to verify. Role updates take effect only on the user's next sign-in (JWT is not automatically refreshed mid-session). This is acceptable for v1.5 — the admin changes a role, and the affected user's next session picks it up.

**Consequence for invite flow:** Since CredentialsProvider + JWT is used, NextAuth's built-in Email provider (which requires a database adapter for VerificationToken) is not available. A custom invite flow is built instead: invite token generated with `jsonwebtoken`, stored hashed in the `Invite` collection, verified in a custom API route, and the user is created manually via the `User` model.

### Pattern 4: React Permissions Context

**What:** A `PermissionsProvider` client component wraps the application alongside `SessionProvider`. It reads `useSession()` to get `role` and `id` from the JWT, and exposes a `usePermissions()` hook returning pre-computed boolean flags. All UI components call `usePermissions()` — never `useSession().data.user.role` directly.

**When to use:** Any component that needs to show/hide/disable UI based on user permissions.

**Trade-offs:** Centralizes permission logic. Role changes in JWT only propagate on next sign-in, which is correct — the client's permission state mirrors the JWT. Per-collection overrides can be loaded lazily when a collection page mounts and merged into a collection-scoped permissions object if needed.

**Example:**
```typescript
// src/components/auth/PermissionsProvider.tsx
'use client';
import { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';

interface Permissions {
  isAdmin: boolean;
  canEdit: boolean;   // Admin or Editor (also covers collection-level override)
  canCreate: boolean; // Admin or Editor
  canGitHub: boolean; // Admin or Editor
  canFigma: boolean;  // Admin or Editor
  role: string | null;
  userId: string | null;
}

const PermissionsContext = createContext<Permissions>({
  isAdmin: false, canEdit: false, canCreate: false,
  canGitHub: false, canFigma: false, role: null, userId: null,
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const role = session?.user?.role ?? null;
  const isAdminOrEditor = role === 'admin' || role === 'editor';
  const value: Permissions = {
    role,
    userId: session?.user?.id ?? null,
    isAdmin: role === 'admin',
    canEdit: isAdminOrEditor,
    canCreate: isAdminOrEditor,
    canGitHub: isAdminOrEditor,
    canFigma: isAdminOrEditor,
  };
  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
```

### Pattern 5: Minimal Auth Guard on Existing API Routes

**What:** All existing API route handlers that modify state receive a 3-line auth guard at the top calling `getSession()` and returning 401/403 as appropriate. Existing route logic is untouched below the guard.

**When to use:** Every API route that creates, updates, or deletes data. Also applied to GET routes for collection data (belt-and-suspenders, even though middleware already blocks unauthenticated requests).

**Trade-offs:** Adds 3-5 lines to each existing route handler. The `getServerSession()` call reads the JWT cookie without a network round-trip, so it is fast. Existing routes are minimally modified — no restructuring of existing logic.

**Example:**
```typescript
// src/lib/auth/session.ts
import { getServerSession as nextGetServerSession } from 'next-auth/next';
import { authOptions } from './nextauth.config';

export async function getSession() {
  return nextGetServerSession(authOptions);
}

// Applied to an existing route (src/app/api/collections/[id]/route.ts) — minimal diff:
import { getSession } from '@/lib/auth/session';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });
  if (session.user.role === 'viewer') return new Response('Forbidden', { status: 403 });
  // ... existing PUT logic below — zero changes
}
```

---

## Data Flow

### Request Flow: Sign-In

```
User submits email + password on /auth/sign-in
    |
    v
signIn('credentials', { email, password }) — next-auth/react client call
    |
    v
POST /api/auth/callback/credentials — NextAuth handler
    |
    v
CredentialsProvider.authorize() — dbConnect() + User.findOne() + bcrypt.compare()
    |
    v
NextAuth jwt() callback — attaches id + role to JWT token
    |
    v
NextAuth session() callback — copies id + role to session.user
    |
    v
JWT set as httpOnly cookie (next-auth.session-token)
    |
    v
Client redirect to /collections (or requested URL)
    |
    v
SessionProvider surfaces session via useSession()
    |
    v
PermissionsProvider computes permission booleans from role
```

### Request Flow: Admin Invite

```
Admin fills InviteUserDialog with email + role
    |
    v
POST /api/auth/invite { email, role }
    |
    v
API route: getSession() — verify admin role
    |
    v
invite.ts: generateInviteToken(email, role) — signs JWT with NEXTAUTH_SECRET, 48h expiry
    |
    v
Invite model: create { email, tokenHash, role, invitedBy, expiresAt }
    |
    v
resend.ts: sendInviteEmail(email, inviteUrl) — POST to Resend API
    |
    v
200 OK -> InviteUserDialog shows success toast; new invite row appears in Users list
    |
    v
Invited user clicks magic link -> /auth/invite/[token]
    |
    v
GET /api/auth/invite/[token] — verifyInviteToken(): check hash in DB, check expiry, check not redeemed
    |
    v
200 OK with { email, role } -> InviteSetupForm displayed
    |
    v
User submits displayName + password
    |
    v
POST /api/auth/invite/[token] { displayName, password }
    |
    v
API route: User.create({ email, passwordHash: bcrypt.hash(password), role, displayName, status: 'active' })
    |
    v
Invite.updateOne: { redeemedAt: new Date() }
    |
    v
200 OK -> client calls signIn('credentials', { email, password }) -> JWT session established
```

### Request Flow: Protected API Route (Existing Collection)

```
Client -> PUT /api/collections/[id]
    |
    v
src/middleware.ts: withAuth checks next-auth JWT cookie
    - No valid token? Redirect to /auth/sign-in (for page requests) / 401 (API)
    - Valid token?  Pass through
    |
    v
Route handler: getSession() -> session.user.role
    - 'viewer'?           Return 403
    - 'editor' or 'admin'? Proceed
    |
    v
Existing collection update logic — unchanged
    |
    v
200 OK with updated collection
```

### State Management: Permissions

```
MongoDB User.role
    | (read at sign-in time only — not on every request)
    v
NextAuth JWT token (httpOnly cookie, role encoded in payload)
    | (via NextAuth session() callback on session access)
    v
useSession() -> session.user.role + session.user.id
    | (via PermissionsProvider)
    v
usePermissions() -> { isAdmin, canEdit, canCreate, canGitHub, canFigma }
    | (consumed by UI components)
    v
Conditional render: disabled buttons, hidden controls, guarded page sections
```

---

## New MongoDB Schemas

### User

```typescript
// src/lib/db/models/User.ts
const UserSchema = new Schema({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  displayName:  { type: String, default: null },
  role:         { type: String, enum: ['admin', 'editor', 'viewer'], required: true, default: 'viewer' },
  status:       { type: String, enum: ['active', 'pending'], required: true, default: 'pending' },
}, { timestamps: true });
// email index is implicit from unique: true
```

### Invite

```typescript
// src/lib/db/models/Invite.ts
const InviteSchema = new Schema({
  email:       { type: String, required: true, lowercase: true },
  tokenHash:   { type: String, required: true },        // bcrypt hash of signed JWT
  role:        { type: String, enum: ['admin', 'editor', 'viewer'], required: true },
  invitedBy:   { type: String, required: true },        // User._id string of admin
  expiresAt:   { type: Date, required: true },
  redeemedAt:  { type: Date, default: null },
}, { timestamps: true });
InviteSchema.index({ email: 1 });
InviteSchema.index({ expiresAt: 1, redeemedAt: 1 });   // for pending-invite listing
```

### CollectionPermission

```typescript
// src/lib/db/models/CollectionPermission.ts
const CollectionPermissionSchema = new Schema({
  userId:       { type: String, required: true },        // User._id string
  collectionId: { type: String, required: true },        // TokenCollection._id string
  role:         { type: String, enum: ['admin', 'editor', 'viewer'], required: true },
}, { timestamps: true });
CollectionPermissionSchema.index({ userId: 1, collectionId: 1 }, { unique: true });
```

**Note:** CollectionPermission references both User and TokenCollection by string ID — not by ObjectId `ref`. This avoids Mongoose `populate()` complexity and keeps the pattern consistent with how the existing codebase references IDs (e.g. `userId: String` already on TokenCollection).

---

## TypeScript Module Augmentation

```typescript
// src/types/next-auth.d.ts
import type { DefaultSession } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
  }
}
```

This file is picked up by the existing `tsconfig.json` via `include: ["**/*.ts"]`. No `typeRoots` change is needed since the file is inside the project source tree.

---

## Integration Points

### New Modules vs Modified Existing Modules

| Module | Status | Change |
|--------|--------|--------|
| `src/middleware.ts` | NEW | Created; protects all routes via withAuth |
| `src/lib/auth/nextauth.config.ts` | NEW | Core NextAuth options with CredentialsProvider |
| `src/lib/auth/session.ts` | NEW | `getSession()` helper wrapper |
| `src/lib/auth/permissions.ts` | NEW | `canPerform()` pure function + role type constants |
| `src/lib/auth/invite.ts` | NEW | Invite token sign/verify via jsonwebtoken |
| `src/lib/email/resend.ts` | NEW | Resend client singleton + `sendInviteEmail()` |
| `src/lib/email/invite-email.tsx` | NEW | React Email template (TSX) |
| `src/lib/db/models/User.ts` | NEW | User Mongoose model |
| `src/lib/db/models/Invite.ts` | NEW | Invite Mongoose model |
| `src/lib/db/models/CollectionPermission.ts` | NEW | Per-collection override Mongoose model |
| `src/types/next-auth.d.ts` | NEW | Module augmentation for Session + JWT |
| `src/app/api/auth/[...nextauth]/route.ts` | NEW | NextAuth catch-all route handler |
| `src/app/api/auth/invite/route.ts` | NEW | Admin creates invite |
| `src/app/api/auth/invite/[token]/route.ts` | NEW | Verify invite token + redeem (create user) |
| `src/app/api/auth/register-first/route.ts` | NEW | First-user bootstrap (no auth gate) |
| `src/app/api/org/users/route.ts` | NEW | List org users (admin-only) |
| `src/app/api/org/users/[id]/route.ts` | NEW | PATCH role + DELETE user (admin-only) |
| `src/app/api/org/permissions/[collectionId]/route.ts` | NEW | GET/PUT per-collection override (admin-only) |
| `src/app/auth/sign-in/page.tsx` | NEW | Sign-in page (public) |
| `src/app/auth/invite/[token]/page.tsx` | NEW | Account setup page (public, token-gated) |
| `src/app/org/users/page.tsx` | NEW | Admin org users management page |
| `src/components/auth/AuthProviders.tsx` | NEW | SessionProvider + PermissionsProvider wrapper |
| `src/components/auth/PermissionsProvider.tsx` | NEW | React context + `usePermissions` hook |
| `src/components/auth/SignInForm.tsx` | NEW | Sign-in form component |
| `src/components/auth/InviteSetupForm.tsx` | NEW | Account setup form for invited users |
| `src/components/auth/index.ts` | NEW | Barrel export |
| `src/components/org/UserTable.tsx` | NEW | Org users list table |
| `src/components/org/InviteUserDialog.tsx` | NEW | Invite dialog (admin) |
| `src/components/org/RoleChangeSelect.tsx` | NEW | Role dropdown per user row |
| `src/components/org/index.ts` | NEW | Barrel export |
| `src/app/layout.tsx` | MODIFIED | Add `<AuthProviders>` wrapper around `<LayoutShell>` and `<Toaster>` |
| `src/app/api/collections/[id]/route.ts` | MODIFIED | Add auth guard at top (3 lines); viewer block on PUT |
| `src/app/api/collections/[id]/themes/route.ts` | MODIFIED | Add auth guard; viewer block on POST/DELETE |
| `src/app/api/collections/[id]/themes/[themeId]/route.ts` | MODIFIED | Add auth guard; viewer block on PUT/DELETE |
| `src/app/api/collections/route.ts` | MODIFIED | Add auth guard; viewer + editor block on POST (editor can create) |
| `src/app/api/export/figma/route.ts` | MODIFIED | Add auth guard; viewer block |
| `src/app/api/build-tokens/route.ts` | MODIFIED | Add auth guard |
| `src/app/api/github/route.ts` | MODIFIED | Add auth guard; viewer block |
| Other existing API routes | MODIFIED | Add auth guard; role check where appropriate |

### External Services

| Service | Integration Pattern | Package | Notes |
|---------|---------------------|---------|-------|
| NextAuth.js v4 | `next-auth` pkg; route handler + SessionProvider | `next-auth@^4.24.x` | Peer deps: `next@^12.2.5\|^13\|^14\|^15` — compatible with 13.5.6. React 17-18 — compatible with 18.2.0. No adapter. |
| Resend | `resend` SDK — `new Resend(RESEND_API_KEY)` + `.emails.send()` | `resend@latest` | `RESEND_API_KEY` env var. Domain must be verified for production; use `onboarding@resend.dev` in dev. |
| bcryptjs | Password hashing — `bcrypt.hash()` + `bcrypt.compare()` | `bcryptjs` + `@types/bcryptjs` | Pure JS, no native bindings. Prefer over `bcrypt` which requires node-gyp compilation. |
| jsonwebtoken | Invite token signing/verification | `jsonwebtoken` + `@types/jsonwebtoken` | Server-only. Used only in `src/lib/auth/invite.ts`. Never imported in client components. |

### Internal Boundaries

| Boundary | Communication | Constraint |
|----------|---------------|------------|
| Auth layer -> Token management | One-way: token API routes call `getSession()` from `src/lib/auth/session.ts` only | Token management never imports from `src/lib/auth/` except via `getSession()`. No circular dependencies. |
| Auth layer -> Email layer | `src/lib/auth/invite.ts` calls `sendInviteEmail()` from `src/lib/email/resend.ts` | Email layer has zero dependency on auth layer. |
| PermissionsProvider -> App components | Components call `usePermissions()` hook only — never `useSession()` directly | Single source of truth for all permission logic. |
| Middleware -> Auth layer | Middleware imports `withAuth` from `next-auth/middleware` only | Middleware MUST NOT import `src/lib/auth/`, Mongoose models, or any Node.js-only module. Edge runtime constraint. |
| New models -> Existing models | CollectionPermission references TokenCollection._id as a plain string | No Mongoose refs/populate. Consistent with existing `userId: String` pattern in TokenCollection. |

---

## Build Order

The build order respects dependency direction: infrastructure before API, API before UI, route protection after sign-in works.

**Phase A: Auth Infrastructure (zero UI, zero API changes)**
1. Install packages: `next-auth`, `bcryptjs`, `jsonwebtoken`, `resend` + type packages
2. Create `src/types/next-auth.d.ts` — Session + JWT module augmentation
3. Create `src/lib/db/models/User.ts`, `Invite.ts`, `CollectionPermission.ts`
4. Create `src/lib/auth/nextauth.config.ts` — authOptions + CredentialsProvider
5. Create `src/lib/auth/session.ts` — thin `getSession()` wrapper
6. Create `src/lib/auth/permissions.ts` — `canPerform()` + role type constants
7. Create `src/lib/auth/invite.ts` — token generate/verify with jsonwebtoken
8. Create `src/lib/email/resend.ts` + `src/lib/email/invite-email.tsx`
9. Verify: `yarn build` still passes — no new routes yet, no imports in existing code

**Phase B: Auth API Routes**
1. Create `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
2. Create `src/app/api/auth/register-first/route.ts` — first-user bootstrap
3. Create `src/app/api/auth/invite/route.ts` and `invite/[token]/route.ts`
4. Create `src/app/api/org/users/route.ts` and `users/[id]/route.ts`
5. Verify: sign-in API responds; invite flow works end-to-end (manual test)

**Phase C: Sign-in + Invite UI (public pages, no middleware yet)**
1. Create `src/components/auth/` — AuthProviders, PermissionsProvider, SignInForm, InviteSetupForm + barrel
2. Create `src/app/auth/sign-in/page.tsx`
3. Create `src/app/auth/invite/[token]/page.tsx`
4. Modify `src/app/layout.tsx` — wrap with `<AuthProviders>`
5. Add env vars: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `RESEND_API_KEY`
6. Verify: sign in, session persists across refresh, sign out works — all without middleware active

**Phase D: Middleware (route protection)**
1. Create `src/middleware.ts` — `withAuth` + matcher pattern
2. Verify: unauthenticated browser access redirects to `/auth/sign-in`
3. Verify: `/auth/sign-in` and `/auth/invite/…` are still reachable without a session
4. Verify: all existing collection routes still work when authenticated

**Phase E: Auth Guards on Existing API Routes**
1. Add `getSession()` auth guard to all existing API routes that modify data
2. Add role check — reject `viewer` on all write operations
3. Verify: unauthenticated API calls return 401; viewer calls return 403 on writes; editor/admin calls succeed

**Phase F: Org Users UI + Per-collection Permissions**
1. Create `src/components/org/` — UserTable, InviteUserDialog, RoleChangeSelect + barrel
2. Create `src/app/org/users/page.tsx`
3. Create `src/app/api/org/permissions/[collectionId]/route.ts`
4. Add `usePermissions()`-gated UI elements in existing components (hide write controls for viewer)
5. Verify: all AUTH-*, USER-*, PERM-*, UI-* requirements from PROJECT.md pass

---

## Scaling Considerations

This is an internal design system tool for a small team. Scale targets are 10-50 users, not enterprise scale.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-50 users (v1.5 target) | JWT sessions — no session table; Mongoose models sufficient; single MongoDB instance; Resend free tier (3,000 emails/month) is more than ample |
| 50-500 users | Still fine; add explicit index on `User.email` (already implicit from `unique: true`); document `NEXTAUTH_SECRET` rotation procedure |
| 500+ users | Role changes mid-session become operationally visible (user must sign out/in to pick up role change); consider adding a `sessionVersion` field to User and validating it in the jwt callback to force session refresh on role change |

---

## Anti-Patterns

### Anti-Pattern 1: Importing Mongoose or authOptions in Middleware

**What people do:** Import `authOptions` or any Mongoose model inside `src/middleware.ts` to check roles at the edge.

**Why it's wrong:** Mongoose requires Node.js `net` APIs. The Next.js middleware runtime does not provide `net`. This causes a build error or runtime crash. Additionally, a database call on every request through middleware would be a performance and reliability problem.

**Do this instead:** Middleware only checks JWT existence (`!!token`). Role enforcement happens inside individual API route handlers using `getServerSession()` after middleware confirms a session exists.

### Anti-Pattern 2: Defining authOptions Inside the Route Handler File

**What people do:** Define `authOptions` directly in `src/app/api/auth/[...nextauth]/route.ts` and import it from there for use with `getServerSession`.

**Why it's wrong:** In Next.js 13 App Router, importing from a route handler file in other server files can produce circular dependency issues and "Module not found" errors during build. Next.js handles route handler files differently from regular modules.

**Do this instead:** Define `authOptions` in `src/lib/auth/nextauth.config.ts`. Import from there in both the route handler and in all `getServerSession()` calls. This is the documented pattern for App Router.

### Anti-Pattern 3: Using the NextAuth MongoDB Adapter Alongside Mongoose

**What people do:** Install `@next-auth/mongodb-adapter` and pass it to NextAuth while also managing User models via Mongoose.

**Why it's wrong:** The MongoDB adapter uses raw MongoClient and creates its own `accounts`, `sessions`, `users`, and `verification_tokens` collections parallel to the application's Mongoose User model. This creates two disconnected User representations requiring complex synchronization.

**Do this instead:** Use CredentialsProvider + JWT strategy with no adapter. Manage User documents entirely through the custom Mongoose User model. NextAuth writes nothing to MongoDB in this configuration.

### Anti-Pattern 4: Calling useSession in Components Directly for Permission Checks

**What people do:** Call `useSession()` in individual components and check `session?.data?.user?.role === 'admin'` inline.

**Why it's wrong:** Permission logic scatters across dozens of components. Changing what "editor" can do requires finding every inline check. Loading states must be handled redundantly.

**Do this instead:** All components call `usePermissions()` from `PermissionsProvider`. Permission logic has one home in one file. The hook returns pre-computed booleans that map directly to the requirements (`canEdit`, `canCreate`, `canGitHub`, `canFigma`, `isAdmin`).

### Anti-Pattern 5: Skipping Auth Guards on Existing API Routes

**What people do:** Add middleware and hide write controls in the UI but do not add `getSession()` guards to the existing `src/app/api/collections/` routes.

**Why it's wrong:** Middleware protects page navigation; an authenticated client (or a direct API call from curl/Postman) still reaches the route handler after passing the JWT check. A Viewer could call `PUT /api/collections/[id]` directly and modify data unless the handler also enforces the role.

**Do this instead:** Every API route that modifies data calls `getSession()` and checks the role at the top of the handler. This is belt-and-suspenders alongside the UI hiding the controls.

---

## Sources

- [NextAuth.js v4 — Next.js Configuration (Official)](https://next-auth.js.org/configuration/nextjs) — withAuth middleware, getServerSession, JWT-only limitation. HIGH confidence.
- [NextAuth.js v4 — Initialization (Official)](https://next-auth.js.org/configuration/initialization) — Route Handler export pattern for App Router. HIGH confidence.
- [NextAuth.js v4 — TypeScript (Official)](https://next-auth.js.org/getting-started/typescript) — Module augmentation for Session + JWT types. HIGH confidence.
- [NextAuth.js v4 — Securing Pages and API Routes (Official)](https://next-auth.js.org/tutorials/securing-pages-and-api-routes) — getServerSession in API route handlers. HIGH confidence.
- [Auth.js — Role Based Access Control (Official)](https://authjs.dev/guides/role-based-access-control) — jwt() + session() callbacks for role propagation. HIGH confidence.
- [Mongoose — Using Mongoose With Next.js (Official)](https://mongoosejs.com/docs/nextjs.html) — Connection management, App Router patterns, hot-reload guard. HIGH confidence.
- [Resend — Send with Next.js (Official)](https://resend.com/docs/send-with-nextjs) — Route handler pattern, React Email template. HIGH confidence.
- [nextauthjs/next-auth Issue #13313](https://github.com/nextauthjs/next-auth/issues/13313) — Confirmed `next-auth@4.24.x` peer dep supports Next.js 12-15 (not 16). Next.js 13.5.6 is compatible. HIGH confidence.
- [NextAuth.js — Adapters (Official)](https://next-auth.js.org/adapters) — Confirmed no official Mongoose adapter; only raw MongoDB adapter exists. HIGH confidence.
- Direct codebase inspection: `src/lib/db/models/TokenCollection.ts`, `src/lib/mongodb.ts`, `src/app/layout.tsx`, `next.config.js`, `tsconfig.json`, `package.json`.

---

*Architecture research for: ATUI Tokens Manager v1.5 — Auth + Org User Management*
*Researched: 2026-03-28*
