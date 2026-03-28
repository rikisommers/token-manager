# Phase 17: Auth API Routes and Sign-In Flow - Research

**Researched:** 2026-03-28
**Domain:** NextAuth v4 client API, custom sign-in/setup pages, SessionProvider App Router integration, PermissionsProvider React context, first-user bootstrap
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Sign-in page design:**
- Centered card on plain background — classic auth layout, no split screen
- Header shows app name only: "ATUI Tokens Manager" (no logo)
- Respects system/app dark mode (consistent with Phase 14 dark mode support)
- On successful sign-in → redirect to `/` (collections list)

**Error and loading states:**
- Errors shown inline below the form, inside the card — no toast
- Error messages are specific: distinguish "No account found with that email" from "Incorrect password" (internal tool, account enumeration not a concern)
- Disabled accounts → generic error same as wrong password (don't reveal account status)
- During submission: button disabled + spinner + text changes to "Signing in…"; fields remain editable

**First-user bootstrap:**
- Separate `/auth/setup` page — not part of the sign-in page
- Setup page detects 0 users in DB; if users already exist → redirect to `/auth/sign-in`
- Fields: display name + password only (email comes from `SUPER_ADMIN_EMAIL` env var — not collected on the form)
- After successful setup → auto sign-in and redirect to `/` (no extra sign-in step)

**Sign-out placement:**
- Top-right header: initials avatar + display name → dropdown with "Sign out"
- Sets up the pattern Phase 21 will build on (more dropdown items)
- Avatar shows initials in a circle (brand color), display name next to it
- While session is loading → skeleton/placeholder to prevent layout shift
- After signing out → redirect to `/auth/sign-in`

### Claude's Discretion
- Exact card dimensions and spacing
- Initials avatar color (brand color or role-based)
- Password confirmation field on setup (likely yes, Claude decides)
- Form validation (client-side before submit vs server-only)
- Dropdown trigger style (button vs div, exact sizing)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign in with email and password | `signIn('credentials', { email, password, redirect: false })` pattern confirmed; custom error messages via throwing from `authorize()` confirmed |
| AUTH-03 | Signed-in session persists across browser refresh (JWT) | JWT strategy with 30-day maxAge already in `authOptions`; `SessionProvider` in LayoutShell makes session available to all client components and persists via HttpOnly cookie |
| AUTH-04 | User can sign out from any page | `signOut({ callbackUrl: '/auth/sign-in' })` from a 'use client' component in the header; Radix DropdownMenu already in project |
| AUTH-05 | First user to complete registration is automatically granted the Admin role | `/auth/setup` page + `/api/auth/setup` POST route — checks `User.countDocuments() === 0` then creates user with `role: 'Admin'`; email from `SUPER_ADMIN_EMAIL` env var |
</phase_requirements>

## Summary

Phase 17 builds the user-facing auth round-trip on top of the Phase 16 backend foundation. All infrastructure (authOptions, NextAuth route handler, User model, bcryptjs, JWT callbacks) is already in place. This phase creates three new things: (1) `/auth/sign-in` page — centered card form, `signIn('credentials', { redirect: false })`, inline errors, (2) `/auth/setup` page — first-user bootstrap with display name + password form and a custom API route `POST /api/auth/setup`, (3) user avatar/sign-out area in the existing headers.

The critical technical pattern is wrapping `SessionProvider` in a `'use client'` component before injecting it into `LayoutShell`, because `LayoutShell` is a Server Component context (layout.tsx renders it without 'use client'). The `PermissionsProvider` wired into LayoutShell in this phase is a minimal scaffold — it reads `session.user.role` via `useSession()` and exposes a `canPerform()` helper through React context; its full implementation ships in Phase 19. Both providers should be co-located in a single `AuthProviders` wrapper component to keep `layout.tsx` clean.

The most critical pitfall in this phase is error handling with `signIn('credentials', { redirect: false })`. The `error` field in the response is always the string `"CredentialsSignin"` unless `authorize()` throws a custom `Error` object — in which case `error` contains `error.message`. The locked decision to show specific messages ("No account found with that email" vs "Incorrect password") requires `authorize()` to throw distinct errors rather than return `null`.

**Primary recommendation:** Use `signIn('credentials', { redirect: false, email, password })` for the form, throw distinct `Error` messages from `authorize()` for specific error text, create a `'use client'` `AuthProviders` wrapper in `src/components/providers/AuthProviders.tsx` that nests `SessionProvider` then `PermissionsProvider`, and import it into `layout.tsx` wrapping `LayoutShell`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-auth | ^4.24.13 (installed) | `SessionProvider`, `useSession`, `signIn`, `signOut` client API | Already in project; all client auth hooks come from this |
| @radix-ui/react-dropdown-menu | ^2.1.16 (installed) | Avatar + sign-out dropdown in header | Already in project as `src/components/ui/dropdown-menu.tsx`; shadcn/ui wrapper ready to use |
| react | 18.2.0 (installed) | `createContext`, `useContext` for `PermissionsProvider` | Already in project |
| lucide-react | ^0.577.0 (installed) | Spinner, icons in form and header | Already in project; `Loader2` for spinner |
| bcryptjs | ^2.4.3 (installed) | Password hashing in setup route | Already in project (used in `authorize()`) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/navigation `useRouter` | Next.js 13.5.9 (installed) | Client-side redirect after sign-in/setup | After `signIn()` returns `ok: true` |
| next/navigation `redirect` | Next.js 13.5.9 (installed) | Server-side redirect in setup page if users exist | Used in a Server Component check or API route |
| mongoose | ^9.2.2 (installed) | `User.countDocuments()` in setup API route | First-user check |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `signIn('credentials', { redirect: false })` | Native HTML form POST to `/api/auth/callback/credentials` with `csrfToken` hidden field | `signIn()` handles CSRF automatically; native POST requires fetching `/api/auth/csrf` first — no reason to use it |
| Custom `AuthProviders` wrapper | Putting `SessionProvider` directly in `layout.tsx` | `SessionProvider` requires 'use client'; `layout.tsx` is a Server Component — direct use causes a build error |
| PermissionsProvider scaffold in Phase 17 | Defer entirely to Phase 19 | CONTEXT.md success criterion 5 requires both providers in LayoutShell this phase; minimal scaffold is the right balance |

**Installation:**

```bash
# No new packages needed — all dependencies are already installed
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── auth/
│   │   ├── sign-in/
│   │   │   └── page.tsx          # Sign-in page (use client)
│   │   └── setup/
│   │       └── page.tsx          # First-user setup page (use client)
│   └── api/
│       └── auth/
│           ├── [...nextauth]/    # Already exists (Phase 16)
│           │   └── route.ts
│           └── setup/
│               └── route.ts      # POST: create first Admin user
├── components/
│   ├── layout/
│   │   └── UserMenu.tsx          # Avatar + sign-out dropdown ('use client')
│   └── providers/
│       └── AuthProviders.tsx     # SessionProvider + PermissionsProvider wrapper ('use client')
└── context/
    └── PermissionsContext.tsx    # PermissionsProvider + usePermissions hook ('use client')
```

### Pattern 1: SessionProvider Wrapper for App Router

**What:** Because `layout.tsx` is a Server Component in Next.js App Router, `SessionProvider` (which uses React Context) cannot be placed directly in it. Create a `'use client'` wrapper component that wraps `SessionProvider`.

**When to use:** Required whenever you need `useSession()` in any client component in the app.

```typescript
// Source: https://next-auth.js.org/getting-started/client#sessionprovider
// src/components/providers/AuthProviders.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { PermissionsProvider } from '@/context/PermissionsContext';

export function AuthProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PermissionsProvider>
        {children}
      </PermissionsProvider>
    </SessionProvider>
  );
}
```

Then in `layout.tsx` (Server Component — no 'use client'):

```typescript
// src/app/layout.tsx — wraps LayoutShell with AuthProviders
import { AuthProviders } from '@/components/providers/AuthProviders';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProviders>
          <LayoutShell>{children}</LayoutShell>
        </AuthProviders>
        <Toaster ... />
      </body>
    </html>
  );
}
```

### Pattern 2: Custom Sign-In with redirect:false and Specific Error Messages

**What:** Use `signIn('credentials', { redirect: false })` so the form can show inline errors. The `error` field in the response equals the message thrown from `authorize()`.

**When to use:** Any credential-based sign-in form that needs inline error feedback.

```typescript
// Source: https://dev.to/peterlidee/how-to-handle-errors-in-the-nextauth-authorize-function-credentialsprovider-5280
// Phase 16 authorize() must throw specific errors (not return null):

// In nextauth.config.ts authorize() — REQUIRES MODIFICATION in this phase:
async authorize(credentials) {
  if (!credentials?.email || !credentials?.password) return null;
  await dbConnect();
  const user = await User.findOne({ email: credentials.email.toLowerCase() });
  if (!user) throw new Error('No account found with that email');
  if (user.status === 'disabled') throw new Error('Incorrect password'); // generic — same as wrong pw
  const valid = await bcrypt.compare(credentials.password, user.passwordHash);
  if (!valid) throw new Error('Incorrect password');
  return { id: user._id.toString(), email: user.email, role: user.role };
},

// In sign-in page component:
const [error, setError] = useState<string | null>(null);
const [loading, setLoading] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);
  const result = await signIn('credentials', {
    redirect: false,
    email,
    password,
  });
  setLoading(false);
  if (!result?.ok) {
    setError(result?.error ?? 'Sign-in failed');
    return;
  }
  router.push('/');
};
```

### Pattern 3: Setup Page — First-User Bootstrap

**What:** The `/auth/setup` page checks via API whether any users exist, and if so redirects away. On submit, calls a custom API route that creates the admin user and auto signs in.

**When to use:** One-time admin account creation. After this, the page becomes unreachable.

```typescript
// src/app/api/auth/setup/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/db/models/User';
import bcrypt from 'bcryptjs';
import { signIn } from 'next-auth/react'; // NOT used here — signIn is client-only

export async function GET() {
  // Used by setup page to check if setup is needed
  await dbConnect();
  const count = await User.countDocuments();
  return NextResponse.json({ setupRequired: count === 0 });
}

export async function POST(request: Request) {
  await dbConnect();
  const count = await User.countDocuments();
  if (count > 0) {
    return NextResponse.json({ error: 'Setup already complete' }, { status: 403 });
  }
  const { displayName, password } = await request.json();
  const email = process.env.SUPER_ADMIN_EMAIL;
  if (!email) {
    return NextResponse.json({ error: 'SUPER_ADMIN_EMAIL not configured' }, { status: 500 });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    displayName,
    email: email.toLowerCase(),
    passwordHash,
    role: 'Admin',
    status: 'active',
  });
  return NextResponse.json({ ok: true });
}
```

After the API returns `ok: true`, the setup page calls `signIn('credentials', { redirect: false, email: ..., password })` to auto sign-in, then `router.push('/')`.

Note: The email value for setup auto sign-in must be read from the API (since `SUPER_ADMIN_EMAIL` is server-side only — not exposed to client). The API GET `/api/auth/setup` can return `{ email }` for this purpose, or the POST can return `{ email }`.

### Pattern 4: UserMenu Component (Sign-Out Dropdown)

**What:** A 'use client' component in the header showing initials avatar + display name, with a Radix DropdownMenu containing "Sign out".

**When to use:** Placed in `OrgHeader` and `AppHeader` (or both headers already rendered by `LayoutShell`).

```typescript
// Source: existing src/components/ui/dropdown-menu.tsx (already shadcn/ui wrapped)
'use client';

import { useSession, signOut } from 'next-auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    // Skeleton to prevent layout shift
    return <div className="w-28 h-8 rounded-md bg-gray-100 animate-pulse" />;
  }

  if (!session?.user) return null;

  const initials = session.user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-100 transition-colors">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {initials}
          </span>
          <span className="text-sm text-gray-700">{session.user.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/auth/sign-in' })}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Pattern 5: Minimal PermissionsProvider Scaffold

**What:** A React context that reads `session.user.role` from `useSession()` and exposes `canPerform()`. Phase 19 will expand this with per-collection overrides.

**When to use:** Wired into `LayoutShell` in this phase so all client components can call `usePermissions()` from Phase 19 onwards without layout changes.

```typescript
// src/context/PermissionsContext.tsx
'use client';

import { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';
import { canPerform } from '@/lib/auth/permissions';
import type { Role, ActionType } from '@/lib/auth/permissions';

interface PermissionsContextValue {
  role: Role | null;
  canPerform: (action: ActionType) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  role: null,
  canPerform: () => false,
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const role = (session?.user?.role as Role) ?? null;

  return (
    <PermissionsContext.Provider
      value={{
        role,
        canPerform: (action) => (role ? canPerform(role, action) : false),
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
```

### Anti-Patterns to Avoid

- **Placing `SessionProvider` directly in `layout.tsx` body:** `layout.tsx` is a Server Component; importing a 'use client' context provider triggers a build error. Always wrap in a dedicated client component first.
- **Returning `null` from `authorize()` for specific errors:** `null` always maps to the generic `"CredentialsSignin"` error string. The locked decision requires specific messages — must throw `new Error('message')` instead.
- **Using `router.push('/')` without checking `result.ok` first:** If `signIn()` fails and the code does not check `result?.ok`, the user is silently redirected to `/` with no session, causing confusing state.
- **Reading `process.env.SUPER_ADMIN_EMAIL` in client code:** Environment variables without `NEXT_PUBLIC_` prefix are server-side only. The setup page must call an API endpoint to retrieve the email (or the POST response can echo it back).
- **Creating the setup user with `status: 'invited'`:** The User model defaults `status` to `'invited'`. The setup POST must explicitly set `status: 'active'` so the user can sign in immediately.
- **Not guarding the setup API against repeat calls:** `POST /api/auth/setup` must check `User.countDocuments() > 0` and return 403 before doing anything; otherwise it's exploitable to overwrite the admin account.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSRF protection on sign-in form | Custom CSRF token field and validation | `signIn()` from `next-auth/react` | `signIn()` fetches and attaches CSRF token automatically; manual approach is error-prone and already handled |
| Session cookie creation / HttpOnly flags | Custom cookie logic | NextAuth session strategy | Secure, SameSite, HttpOnly defaults handled internally; custom cookies create security gaps |
| JWT parsing on client | `jwt-decode` or manual base64 | `useSession()` | `useSession()` returns the session object directly; no token parsing needed on client |
| Sign-out cookie clearing | Manual `document.cookie` deletion | `signOut()` from `next-auth/react` | `signOut()` calls the NextAuth sign-out endpoint which properly clears the HttpOnly JWT cookie |
| User existence check before setup | Client-side Mongoose query | `GET /api/auth/setup` route | Mongoose is server-only; database queries must go through API routes in Next.js App Router |

**Key insight:** NextAuth v4's client API (`signIn`, `signOut`, `useSession`, `SessionProvider`) handles all cookie, CSRF, and session plumbing. The implementation in Phase 17 is entirely UI and form logic — no auth security primitives to build.

## Common Pitfalls

### Pitfall 1: authorize() Returns null — Generic Error Only

**What goes wrong:** The sign-in form shows "CredentialsSignin" (or a generic error) instead of "No account found with that email" / "Incorrect password" even though specific logic is in `authorize()`.
**Why it happens:** When `authorize()` returns `null`, NextAuth maps the failure to `error: "CredentialsSignin"`. The custom text is lost.
**How to avoid:** Throw `new Error('specific message')` instead of `return null` for each failure case. The thrown message becomes the `error` field in the `signIn()` response.
**Warning signs:** All auth failures show the same generic message regardless of what went wrong.

### Pitfall 2: signIn redirect:false Returns ok:true With Failed Auth (Known NextAuth v4 Bug)

**What goes wrong:** In some NextAuth v4 builds (4.18.1+), `signIn()` with `redirect: false` can return `{ ok: true, error: 'CredentialsSignin' }` simultaneously — a contradictory state.
**Why it happens:** Known NextAuth v4 bug (GitHub issue #7638) where the status is 200 but auth failed.
**How to avoid:** Check both `result?.ok === true` AND `!result?.error` before treating sign-in as successful. Guard: `if (!result?.ok || result?.error)`.
**Warning signs:** User appears to sign in but is not actually authenticated; session is null after redirect.

### Pitfall 3: Session Not Available Until SessionProvider Mounted

**What goes wrong:** `useSession()` throws an error or returns `undefined` in components that render before `SessionProvider` is in the tree.
**Why it happens:** `useSession()` requires a `SessionProvider` ancestor. Components in `LayoutShell` can only call `useSession()` after `layout.tsx` wraps them in `AuthProviders`.
**How to avoid:** `AuthProviders` must wrap `LayoutShell` in `layout.tsx` — not the other way around. Check: `<AuthProviders><LayoutShell>`.
**Warning signs:** Error: "[next-auth]: `useSession` must be wrapped in a `<SessionProvider />`".

### Pitfall 4: PermissionsProvider Must Be Inside SessionProvider

**What goes wrong:** `PermissionsProvider` calls `useSession()` but is rendered outside `SessionProvider` → same session context error.
**Why it happens:** Provider nesting order in `AuthProviders` matters: `SessionProvider` must be the outer wrapper, `PermissionsProvider` the inner.
**How to avoid:** `<SessionProvider><PermissionsProvider>` — SessionProvider outermost, PermissionsProvider inner.
**Warning signs:** Same `useSession` context error as Pitfall 3.

### Pitfall 5: SUPER_ADMIN_EMAIL Not Accessible in Client Components

**What goes wrong:** Setup page tries to read `process.env.SUPER_ADMIN_EMAIL` directly in the React component and gets `undefined`.
**Why it happens:** Environment variables without `NEXT_PUBLIC_` prefix are server-side only; client bundles do not include them.
**How to avoid:** The setup page must fetch the email from a server-side API endpoint. The `GET /api/auth/setup` route can safely return `{ setupRequired: true, email: process.env.SUPER_ADMIN_EMAIL }`.
**Warning signs:** `process.env.SUPER_ADMIN_EMAIL` is `undefined` in the component; auto sign-in after setup fails because email is empty.

### Pitfall 6: Setup User Created With Default Status 'invited' Cannot Sign In

**What goes wrong:** After setup completes successfully, the auto sign-in silently fails — the authorize callback checks `user.status === 'disabled'` but in the modified form it should also check for `'invited'`.
**Why it happens:** The User schema defaults `status: 'invited'`. If the setup route omits `status: 'active'`, the created admin has `status: 'invited'` and the authorize callback may reject them or not.
**How to avoid:** `POST /api/auth/setup` must explicitly pass `status: 'active'` when calling `User.create()`.
**Warning signs:** Setup appears to complete but auto sign-in fails or produces unexpected errors.

### Pitfall 7: Layout Shift During Session Loading

**What goes wrong:** The header flickers between "no user" state and "signed-in" state on page load.
**Why it happens:** `useSession()` returns `status: 'loading'` for ~100-500ms before the session is confirmed.
**How to avoid:** The `UserMenu` component must render a skeleton/placeholder when `status === 'loading'`. See Pattern 4 above.
**Warning signs:** Visible flash of "sign in" link before the user avatar appears.

## Code Examples

Verified patterns from official sources:

### signIn with redirect:false — Full Pattern

```typescript
// Source: https://next-auth.js.org/getting-started/client#signin
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const router = useRouter();

const result = await signIn('credentials', {
  redirect: false,
  email: formEmail,
  password: formPassword,
});

// Guard against both ok:false AND the known bug where ok:true with error
if (!result?.ok || result?.error) {
  setError(result?.error ?? 'Sign-in failed');
  return;
}

router.push('/'); // callbackUrl target
```

### signOut with callbackUrl

```typescript
// Source: https://next-auth.js.org/getting-started/client#signout
import { signOut } from 'next-auth/react';

signOut({ callbackUrl: '/auth/sign-in' });
// Navigates to /auth/sign-in after JWT cookie is cleared
```

### useSession — Status Handling Pattern

```typescript
// Source: https://next-auth.js.org/getting-started/client#usesession
import { useSession } from 'next-auth/react';

const { data: session, status } = useSession();
// status: 'loading' | 'authenticated' | 'unauthenticated'
// session: Session | null (null when unauthenticated or loading)
// session.user.id, session.user.role from Phase 16 type augmentation (src/types/next-auth.d.ts)
```

### authorize() with Custom Error Messages (Modification to Phase 16 code)

```typescript
// Modifies src/lib/auth/nextauth.config.ts — authorize() callback
// Source: https://dev.to/peterlidee/how-to-handle-errors-in-the-nextauth-authorize-function-credentialsprovider-5280
async authorize(credentials) {
  if (!credentials?.email || !credentials?.password) return null;
  await dbConnect();
  const user = await User.findOne({ email: credentials.email.toLowerCase() });
  if (!user) throw new Error('No account found with that email');
  // Disabled accounts: same message as wrong password (don't reveal status)
  if (user.status === 'disabled') throw new Error('Incorrect password');
  const valid = await bcrypt.compare(credentials.password, user.passwordHash);
  if (!valid) throw new Error('Incorrect password');
  return { id: user._id.toString(), email: user.email, role: user.role };
},
```

### First-User Check in Setup API Route

```typescript
// src/app/api/auth/setup/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/db/models/User';
import bcrypt from 'bcryptjs';

export async function GET() {
  await dbConnect();
  const count = await User.countDocuments();
  // Only return email in GET when setup is required — never expose if setup is done
  if (count === 0) {
    return NextResponse.json({
      setupRequired: true,
      email: process.env.SUPER_ADMIN_EMAIL,
    });
  }
  return NextResponse.json({ setupRequired: false });
}

export async function POST(request: Request) {
  await dbConnect();
  // Double-check: refuse if any user already exists
  const count = await User.countDocuments();
  if (count > 0) {
    return NextResponse.json({ error: 'Setup already complete' }, { status: 403 });
  }
  const { displayName, password } = await request.json() as {
    displayName: string;
    password: string;
  };
  const email = process.env.SUPER_ADMIN_EMAIL;
  if (!email) {
    return NextResponse.json({ error: 'SUPER_ADMIN_EMAIL env var not set' }, { status: 500 });
  }
  if (!displayName?.trim() || !password || password.length < 8) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    displayName: displayName.trim(),
    email: email.toLowerCase(),
    passwordHash,
    role: 'Admin',
    status: 'active', // CRITICAL: must be 'active', not the default 'invited'
  });
  return NextResponse.json({ ok: true });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Form POST to `/api/auth/callback/credentials` with `csrfToken` hidden field | `signIn('credentials', { redirect: false })` handles CSRF internally | NextAuth v4 | Simpler form, no manual CSRF token fetch needed |
| Placing `SessionProvider` at app root in Pages Router `_app.tsx` | `'use client'` wrapper component imported into App Router `layout.tsx` | Next.js 13 App Router | Required architecture change — layout.tsx is a Server Component |
| Checking session on every route via `getServerSideProps` | `useSession()` in client components; `getServerSession()` in Server Components/Route Handlers | Next.js 13 App Router | Different strategies for client vs. server contexts |

**Deprecated/outdated:**
- `import { getProviders, getCsrfToken } from 'next-auth/react'` for custom sign-in page: Still valid but unnecessary if using `signIn()` function — the function handles CSRF token fetching automatically.
- Wrapping `SessionProvider` directly in `layout.tsx` body: Causes build error in Next.js 13+ App Router; must use a 'use client' wrapper.

## Open Questions

1. **authorize() modification: should `null` cases remain for missing credentials?**
   - What we know: The current Phase 16 `authorize()` returns `null` for `!credentials?.email || !credentials?.password`. This produces generic error. Since form validation will prevent empty submission, this case rarely triggers.
   - What's unclear: Whether a pre-submit validation failure message is needed.
   - Recommendation: Keep `return null` for the missing-credentials guard (form validation prevents this reaching authorize); only throw errors for the meaningful cases (no user, wrong password, disabled account).

2. **PermissionsProvider scope in Phase 17 vs. Phase 19**
   - What we know: PERM-06 (full PermissionsProvider with per-collection overrides) is Phase 19. Phase 17 success criterion 5 requires both providers wired in.
   - What's unclear: Whether Phase 17 should expose `usePermissions()` publicly or keep it internal.
   - Recommendation: Export `usePermissions()` from `PermissionsContext.tsx` in this phase — it's a read-only hook. Phase 19 expands the context value shape but the hook stays the same.

3. **displayName field on session.user**
   - What we know: `session.user.name` is part of `DefaultSession['user']` (NextAuth standard field). The `displayName` from the User model maps naturally to `name` via returning `{ name: user.displayName, ... }` from `authorize()`. The Phase 16 `authorize()` returns `{ id, email, role }` — no `name` field yet.
   - What's unclear: The `jwt` callback needs to propagate `name` to the token if needed.
   - Recommendation: Add `name: user.displayName` to the `authorize()` return object and the JWT callback in `nextauth.config.ts`. `session.user.name` is already typed in `DefaultSession` — no type augmentation needed.

## Sources

### Primary (HIGH confidence)

- [next-auth.js.org/getting-started/client](https://next-auth.js.org/getting-started/client) — `SessionProvider`, `useSession`, `signIn`, `signOut` API docs
- [next-auth.js.org/getting-started/client#signin](https://next-auth.js.org/getting-started/client#signin) — `signIn()` signature, `redirect: false`, error response shape
- [next-auth.js.org/configuration/pages](https://next-auth.js.org/configuration/pages) — Custom sign-in page configuration, CSRF handling
- [next-auth.js.org/errors](https://next-auth.js.org/errors) — `CredentialsSignin` error code documentation
- Existing codebase: `src/lib/auth/nextauth.config.ts` — authorize() to be modified; `src/components/ui/dropdown-menu.tsx` — Radix DropdownMenu wrapper; `src/app/layout.tsx` — injection point for AuthProviders

### Secondary (MEDIUM confidence)

- [dev.to/peterlidee — handling errors in NextAuth CredentialsProvider](https://dev.to/peterlidee/how-to-handle-errors-in-the-nextauth-authorize-function-credentialsprovider-5280) — `throw new Error()` pattern for custom error messages; verified against NextAuth source behavior
- [github.com/nextauthjs/next-auth/issues/7638](https://github.com/nextauthjs/next-auth/issues/7638) — Known bug: `ok:true` with failed auth when using `redirect:false`; affects v4.18.1+; workaround: check both `ok` and `error`
- [sentry.io/answers/next-js-13-and-next-auth-issues-with-usesession-and-sessionprovider](https://sentry.io/answers/next-js-13-and-next-auth-issues-with-usesession-and-sessionprovider/) — App Router SessionProvider wrapper pattern

### Tertiary (LOW confidence)

- None — all critical findings verified with official sources or multiple credible sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already in project; verified installed versions
- Architecture: HIGH — SessionProvider/App Router wrapper pattern verified with official docs and multiple community sources; PermissionsProvider pattern is a standard React context wrapping useSession
- Pitfalls: HIGH — authorize() null vs throw verified with official docs and known GitHub issue; status:'active' requirement from reading User model source; client env var limitation is Next.js documented behavior

**Research date:** 2026-03-28
**Valid until:** 2026-09-28 (NextAuth v4 is in maintenance mode — patterns are stable)
