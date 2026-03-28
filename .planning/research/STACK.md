# Stack Research

**Domain:** Org user management + authentication — ATUI Tokens Manager v1.5
**Researched:** 2026-03-28
**Confidence:** HIGH for next-auth v4 + JWT pattern; HIGH for bcryptjs; HIGH for Resend SDK; MEDIUM for global permissions context architecture (established pattern, no single authoritative source)

---

## Context: What This Research Covers

This is a SUBSEQUENT MILESTONE stack document. The existing stack (Next.js 13.5.6, React 18.2.0, Mongoose 9.2.2, shadcn/ui + Tailwind CSS) is validated and locked. This document covers only the NEW dependencies required for v1.5: authentication, email invites, and global permissions context.

**The verdict: three new production packages, one new dev dependency.**

---

## Recommended Stack

### Core Technologies — New Additions Only

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `next-auth` | `^4.24.13` | Credentials-based session management, JWT sessions, route protection via `withAuth` middleware | v4 is the only stable release compatible with Next.js 13.5.6. v5 (Auth.js) requires Next.js 14+ minimum. v4.24.13 is the latest v4 release (Oct 2025). Supports App Router via Route Handlers. |
| `resend` | `^6.0.0` | Transactional email delivery for magic-link invites | Official Resend Node.js SDK. Simple API: `new Resend(key).emails.send({...})`. Works directly in Next.js API route handlers. Current version 6.9.4. No peer deps that conflict with existing stack. |
| `bcryptjs` | `^3.0.3` | Password hashing for stored credentials | Pure JavaScript implementation — no native C++ bindings. Works in Next.js API routes without `next.config.js` webpack workarounds. Same API as `bcrypt`. Latest version 3.0.3 (2025). |

### Development Dependencies — New Additions

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/bcryptjs` | `^2.4.6` | TypeScript type declarations for bcryptjs | Required — bcryptjs ships without bundled types. Add as `devDependency`. |

### No Adapter Required

**The `@auth/mongodb-adapter` is explicitly NOT recommended for this project.**

NextAuth v4's Credentials provider only works with `session.strategy: "jwt"`. When using JWT sessions, a database adapter is not used for session persistence — sessions live in signed JWT cookies. Adding an adapter with credentials auth requires complex workarounds and provides no benefit. Instead, user data is managed directly via the existing Mongoose `dbConnect` + a new `User` Mongoose model.

This is the standard credentials + JWT approach for NextAuth v4 with MongoDB.

---

## Architecture: How the New Stack Integrates

### Authentication Flow

```
POST /api/auth/[...nextauth]   ← NextAuth v4 Route Handler
  └─ CredentialsProvider.authorize()
       └─ dbConnect() + User.findOne({ email })   ← existing Mongoose pattern
       └─ bcryptjs.compare(password, user.passwordHash)
       └─ return { id, email, role }              ← embedded in JWT

JWT callback: add role + id to token
Session callback: expose role + id to useSession()
withAuth middleware: protect all routes except /auth/*
```

### Email Invite Flow

```
POST /api/users/invite           ← new Admin-only API route
  └─ Create Invitation doc in MongoDB (token + expiry)
  └─ new Resend(key).emails.send({ to, subject, react: InviteEmail })
       └─ InviteEmail component renders magic link: /auth/setup?token=...

GET /auth/setup?token=...        ← public page
  └─ Verify token, not expired, not used
  └─ User sets displayName + password
  └─ bcryptjs.hash(password, 12)
  └─ Create User doc, mark invitation used
```

### Global Permissions React Context

```
src/lib/auth/
  ├─ permissions.ts      ← pure role → capability map (no React)
  └─ permissionsContext.tsx  ← 'use client' PermissionsProvider + usePermissions hook

PermissionsProvider wraps root layout shell:
  └─ Reads session via useSession()
  └─ Derives capabilities from role (Admin/Editor/Viewer)
  └─ Provides { canEdit, canCreate, canManageUsers, canPushGitHub, ... }

Components consume via: const { canEdit } = usePermissions()
```

### Mongoose Models — New Files

Two new Mongoose models join the existing `TokenCollection` model:

| Model | Collection | Purpose |
|-------|------------|---------|
| `User` | `users` | Stores email, displayName, passwordHash, role, status (active/pending) |
| `Invitation` | `invitations` | Stores token (UUID), inviteeEmail, expiresAt, usedAt, invitedBy |

No schema migration needed for existing collections. `userId` field on `TokenCollection` was pre-scoped as nullable in v1.0 Key Decisions for exactly this milestone.

---

## Installation

```bash
# Production dependencies
yarn add next-auth@^4.24.13 resend@^6.0.0 bcryptjs@^3.0.3

# Dev dependency (TypeScript types for bcryptjs)
yarn add -D @types/bcryptjs@^2.4.6
```

No other packages required. All other capabilities (role model, permissions context, invite token generation, middleware route protection) are built from existing stack primitives.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `next-auth@^4.24.13` | `next-auth@5.x` (Auth.js) | v5 requires Next.js 14+. This project is locked to Next.js 13.5.6 per constraints in PROJECT.md. Cannot upgrade without risk to the existing 27K LOC codebase. |
| `next-auth@^4.24.13` | Custom JWT implementation | next-auth handles cookie management, CSRF, session rotation, and middleware integration out of the box. Rolling custom auth is a security risk. |
| `next-auth@^4.24.13` | `iron-session` | iron-session handles cookies but not credentials auth flow, session callbacks, or withAuth middleware. More manual work for no gain. |
| `bcryptjs` | `bcrypt` (native) | `bcrypt` requires native C++ bindings. Next.js API routes can run this, but it requires Webpack configuration (`serverExternalPackages`). bcryptjs is pure JS, zero config, same API, and is only slower for high-throughput scenarios (irrelevant for login flows). |
| `bcryptjs` | `argon2` | Argon2 is technically stronger but also requires native bindings. Same config friction as `bcrypt`. bcryptjs is sufficient for this use case and adds zero friction. |
| `resend` | `nodemailer` | Nodemailer requires configuring an SMTP relay; Resend is an API-first service with React email template support and a simpler SDK. The project already has a Resend account in scope (implied by PROJECT.md invite flow). |
| `resend` | `@sendgrid/mail` | SendGrid is more complex, pricing model less developer-friendly, and requires domain warming. Resend is the current standard for new Next.js projects needing transactional email. |
| No adapter (JWT only) | `@auth/mongodb-adapter` | The Credentials provider **cannot use database sessions** — NextAuth v4 documentation is explicit. The adapter's user management tables would conflict with the custom `User` Mongoose model. Adding an adapter without using its session persistence adds complexity with zero benefit. |
| Custom `User` Mongoose model | NextAuth adapter `users` collection | The adapter's users collection has a fixed schema without role, status, or displayName fields. A custom Mongoose model gives full schema control with the existing `dbConnect` pattern. |
| UUID v4 invite tokens via `crypto.randomUUID()` | `nanoid` or `uuid` package | `crypto.randomUUID()` is built into Node.js 14.17+ and available in all Next.js 13 environments. No additional package needed for token generation. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `next-auth@5.x` / `auth.js` | Requires Next.js 14 minimum. This project is on Next.js 13.5.6. | `next-auth@^4.24.13` |
| `@auth/mongodb-adapter` | Credentials provider + database sessions is an unsupported combination in NextAuth v4. Adapter's user schema conflicts with custom User model requirements (role, status, displayName). | Custom Mongoose `User` model + JWT session strategy |
| `@next-auth/mongodb-adapter` | Deprecated — last published 3 years ago (v1.1.3). Succeeded by `@auth/mongodb-adapter`, which is itself not recommended here. | No adapter — see above |
| `bcrypt` (native) | Requires Webpack `serverExternalPackages` config. Introduces build complexity. | `bcryptjs` (pure JS, same API) |
| `next-auth` database session strategy | Not supported with Credentials provider. nextauth docs: "users authenticated in this manner are not persisted in the database, and consequently that the Credentials provider can only be used if JSON Web Tokens are enabled for sessions." | JWT session strategy (`session: { strategy: "jwt" }`) |
| OAuth providers (Google, GitHub) | Explicitly out of scope per PROJECT.md v1.5 milestone definition. | Email/password credentials only |
| `react-email` package | Adds a dependency and build step for email templates. For magic-link invites, a plain HTML string or inline template string is sufficient. | HTML string in Resend `html:` field |
| Global role fetch on every render | Triggers a DB round-trip per component. | Derive permissions from JWT token in `useSession()` — role is already embedded in the signed cookie |

---

## Stack Patterns by Variant

**If the user is an Admin:**
- Role embedded in JWT as `token.role = "Admin"`
- `usePermissions()` returns `{ canManageUsers: true, canEdit: true, canCreate: true, ... }`
- Admin nav item (Users page) visible

**If the user is an Editor:**
- `usePermissions()` returns `{ canManageUsers: false, canEdit: true, canCreate: true, canPushGitHub: true, canPushFigma: true }`
- User management nav hidden

**If the user is a Viewer:**
- `usePermissions()` returns `{ canManageUsers: false, canEdit: false, canCreate: false, canPushGitHub: false, canPushFigma: false }`
- All write controls hidden/disabled via `usePermissions()` hook in consuming components

**If per-collection override exists (PERM-04):**
- Override stored on `User` document as `collectionOverrides: Record<collectionId, "Admin"|"Editor"|"Viewer">`
- `PermissionsProvider` checks override before falling back to org role
- Override lookup is O(1) from JWT claims or a single DB fetch at session start

**If NEXTAUTH_SECRET is not set:**
- next-auth will throw in production; error is surfaced at startup. Add to `.env.local` and deployment environment.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `next-auth@^4.24.13` | `next@13.5.6` | Confirmed. v4 supports Next.js 13 App Router via Route Handlers at `app/api/auth/[...nextauth]/route.ts`. withAuth middleware supports `jwt` strategy only — aligns with credentials provider requirement. |
| `next-auth@^4.24.13` | `react@18.2.0` | Confirmed. `SessionProvider` and `useSession` are React 18 compatible. |
| `next-auth@^4.24.13` | `mongoose@9.2.2` | No direct dependency. User lookup in `authorize()` callback uses existing `dbConnect()` + Mongoose model pattern. |
| `bcryptjs@^3.0.3` | `typescript@5.2.2` | Requires `@types/bcryptjs` dev dependency. No other compatibility concerns. |
| `resend@^6.0.0` | `next@13.5.6` | Confirmed. Resend SDK works in Next.js API Route Handlers as a plain Node.js HTTP client. No edge runtime required. |
| `next-auth@4.x` | `@auth/mongodb-adapter@3.x` | NOT compatible without workarounds. Credentials provider requires JWT sessions; adapter targets database sessions. Do not combine. |

---

## Environment Variables Required

| Variable | Purpose | Notes |
|----------|---------|-------|
| `NEXTAUTH_SECRET` | JWT signing secret | Generate: `openssl rand -base64 32`. Required in all environments. |
| `NEXTAUTH_URL` | Canonical app URL for redirects | e.g. `http://localhost:3000` in dev, production URL in prod |
| `RESEND_API_KEY` | Resend transactional email API key | From resend.com dashboard. Keep in `.env.local`, never commit. |
| `SUPER_ADMIN_EMAIL` | Hardcoded superadmin email address | Grants permanent Admin role; cannot be removed via UI (AUTH-06) |

---

## Sources

- [NextAuth.js v4 — Credentials Provider](https://next-auth.js.org/providers/credentials) — JWT-only session requirement confirmed (HIGH confidence)
- [NextAuth.js v4 — Next.js Middleware (withAuth)](https://next-auth.js.org/configuration/nextjs) — `jwt` strategy only, App Router middleware pattern (HIGH confidence)
- [NextAuth.js v4 — Callbacks (JWT + Session)](https://next-auth.js.org/configuration/callbacks#jwt-callback) — role embedding pattern confirmed (HIGH confidence)
- [Auth.js Migrating to v5](https://authjs.dev/getting-started/migrating-to-v5) — v5 requires Next.js 14+, confirms v4 is correct choice for Next.js 13 (HIGH confidence)
- [npm: next-auth](https://www.npmjs.com/package/next-auth) — v4.24.13 is latest v4 stable, published Oct 2025 (HIGH confidence)
- [npm: resend](https://www.npmjs.com/package/resend) — v6.9.4 latest (HIGH confidence)
- [Resend — Send with Next.js](https://resend.com/docs/send-with-nextjs) — App Router Route Handler pattern verified (HIGH confidence)
- [npm: bcryptjs](https://www.npmjs.com/package/bcryptjs) — v3.0.3 latest, pure JS (HIGH confidence)
- [npm: @auth/mongodb-adapter](https://www.npmjs.com/package/@auth/mongodb-adapter) — v3.11.1, confirmed NOT recommended for credentials provider (HIGH confidence)
- [NextAuth GitHub Discussion #4394](https://github.com/nextauthjs/next-auth/discussions/4394) — database sessions + credentials provider limitation confirmed (HIGH confidence)
- [Vercel — React Context in Next.js App Router](https://vercel.com/kb/guide/react-context-state-management-nextjs) — context providers must be Client Components; wrap in layout shell (HIGH confidence)

---

*Stack research for: ATUI Tokens Manager v1.5 — Org User Management + Authentication*
*Researched: 2026-03-28*
