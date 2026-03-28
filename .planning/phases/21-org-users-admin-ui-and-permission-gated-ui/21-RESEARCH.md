# Phase 21: Org Users Admin UI and Permission-Gated UI - Research

**Researched:** 2026-03-28
**Domain:** Admin user management UI, JWT role propagation, permission-gated React components
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| USER-01 | Admin can view a list of all org members with their roles and status | GET /api/org/users returns User[] with displayName, email, role, status; page extends the existing /org/users page built in Phase 20 |
| USER-05 | Admin can change an existing user's org-level role (Admin / Editor / Viewer) | PATCH /api/org/users/[id]/role; 60s role propagation requires JWT re-fetch mechanism added to nextauth.config.ts jwt callback |
| USER-06 | Admin can remove a user from the org | DELETE /api/org/users/[id]; session invalidation via DB status='disabled' checked on every JWT refresh |
| UI-01 | Token table edit controls are visible but disabled for read-only users | `usePermissions().canEdit` already exists; pass `isReadOnly={!canEdit}` to TokenGeneratorForm; BulkActionBar already hides when isReadOnly |
| UI-02 | Create-collection button/flow hidden for Viewer users | `usePermissions().canCreate` already exists; conditional render of "New Collection" Button and dashed-card in CollectionsPage |
| UI-03 | GitHub push/pull controls hidden for Viewer users | `usePermissions().canGitHub` already exists; DropdownMenuItems in tokens page conditionally rendered |
| UI-04 | Figma push/pull controls hidden for Viewer users | `usePermissions().canFigma` already exists; DropdownMenuItems in tokens page conditionally rendered |

</phase_requirements>

---

## Summary

Phase 21 has two distinct workstreams: (1) Admin user management UI — extending the `/org/users` page built in Phase 20 to show active members alongside pending invites, with role-change and remove-user controls; (2) permission-gated UI — wiring `usePermissions()` booleans already computed by `PermissionsContext` into the existing UI components so write controls are hidden/disabled for Viewer users.

The permissions infrastructure is complete and tested (Phase 19). The `usePermissions()` hook returns `{ canEdit, canCreate, isAdmin, canGitHub, canFigma }` — all the gates needed for the four UI requirements. The only wiring work is conditional renders in `CollectionsPage`, `TokenGeneratorForm`/`BulkActionBar`, and the GitHub/Figma dropdown items in the tokens page. This is straightforward prop-passing and conditional rendering.

The user management work is more complex. It requires new API routes (`GET /api/org/users`, `PATCH /api/org/users/[id]/role`, `DELETE /api/org/users/[id]`), extending the `/org/users` page with an active-members table section, and critically — implementing the JWT role re-fetch mechanism. The current `nextauth.config.ts` JWT callback sets role only at initial sign-in. The success criterion "role change takes effect within 60 seconds without requiring sign-out" requires adding a `roleLastFetched` timestamp to the JWT and re-fetching from DB when stale. This mechanism was logged as a planned decision in STATE.md but has not yet been implemented. Phase 21 must implement it.

**Primary recommendation:** Split into 3-4 plans: (1) JWT role propagation + org users API, (2) /org/users page extension (active members section + role-change + remove), (3) permission-gated UI wiring. The JWT mechanism is the highest-risk piece and should be tackled first.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next-auth` | ^4.24.13 (installed) | JWT callback extension for role re-fetch | Already the auth layer; jwt callback is where refresh goes |
| `mongoose` | ^9.2.2 (installed) | User.findById() for role re-fetch and user CRUD | Already the DB layer |
| `react` / Next.js hooks | 18.2.0 / 13.5.9 | `usePermissions()` already returns all needed booleans | Phase 19 completed this |
| `lucide-react` | ^0.577.0 (installed) | Icons for user table action buttons | Already used throughout |
| `sonner` | ^2.0.7 (installed) | Error/success toast for role-change and remove actions | Already used; pattern matches existing pages |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-select` | ^2.2.6 (installed) | Role selector dropdown in user table rows | For inline role change control |
| `@radix-ui/react-dialog` | ^1.1.15 (installed) | Confirmation dialog for remove-user action | Prevent accidental removal |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JWT role re-fetch in jwt callback | Sign-out-required role change | Re-fetch in jwt callback is standard next-auth v4 pattern; sign-out breaks the "within 60 seconds" requirement |
| DB status='disabled' for session invalidation | Token blocklist | Status check on every jwt() call is the correct approach for credential-based auth with JWT sessions; blocklist adds infrastructure |

**Installation:** No new packages needed. All dependencies already in `package.json`.

---

## Architecture Patterns

### Recommended New/Modified File Structure

```
src/
├── app/
│   ├── api/
│   │   └── org/
│   │       └── users/
│   │           ├── route.ts                    # GET /api/org/users — list all User docs
│   │           └── [id]/
│   │               ├── route.ts                # DELETE /api/org/users/[id] — remove user
│   │               └── role/
│   │                   └── route.ts            # PATCH /api/org/users/[id]/role — change role
│   └── org/
│       └── users/
│           └── page.tsx                        # Extend: add active members section above invite table
├── components/
│   └── org/
│       └── InviteModal.tsx                     # Unchanged (Phase 20 built this)
└── lib/
    └── auth/
        └── nextauth.config.ts                  # Extend jwt callback: add roleLastFetched + re-fetch logic
```

Existing files to modify for permission-gated UI:

```
src/
├── app/
│   ├── collections/
│   │   └── page.tsx                            # Hide "New Collection" button/card for Viewers
│   └── collections/[id]/
│       └── tokens/
│           └── page.tsx                        # Hide GitHub/Figma dropdown items for Viewers
└── components/
    └── tokens/
        └── TokenGeneratorForm.tsx              # Pass isReadOnly from page based on canEdit
```

### Pattern 1: JWT Role Re-fetch (60-second staleness)

**What:** Extend the `jwt` callback in `nextauth.config.ts` to re-fetch the user's role from MongoDB every 60 seconds. Uses `roleLastFetched` timestamp stored in the JWT payload.
**When to use:** Required for success criterion 2 (role change takes effect within 60s without sign-out).

```typescript
// Source: next-auth v4 docs — https://next-auth.js.org/configuration/callbacks#jwt-callback
// Pattern: roleLastFetched timestamp in JWT token; re-fetch from DB when stale

async jwt({ token, user }) {
  // Initial sign-in: set all fields
  if (user) {
    token.id   = (user as { id: string }).id;
    token.role = (user as { role: string }).role;
    token.name = (user as { name: string }).name;
    token.roleLastFetched = Date.now();
  }

  // SUPER_ADMIN_EMAIL: always override role
  if (token.email === process.env.SUPER_ADMIN_EMAIL) {
    token.role = 'Admin';
    return token;
  }

  // Role re-fetch: if roleLastFetched is stale (>60s), re-fetch from DB
  const ROLE_TTL_MS = 60 * 1000;
  const lastFetched = (token.roleLastFetched as number) ?? 0;
  if (Date.now() - lastFetched > ROLE_TTL_MS) {
    await dbConnect();
    const dbUser = await User.findById(token.id).select('role status').lean();
    if (!dbUser) {
      // User was deleted — invalidate by returning empty token (next-auth will sign out)
      return {} as typeof token;
    }
    if (dbUser.status === 'disabled') {
      // User was removed — invalidate
      return {} as typeof token;
    }
    token.role = dbUser.role;
    token.roleLastFetched = Date.now();
  }

  return token;
},
```

**Key notes:**
- `user` is only present on initial sign-in, not on subsequent JWT refreshes
- Returning `{}` from jwt callback is how next-auth v4 invalidates a session (forces re-sign-in)
- The `roleLastFetched` field needs TypeScript type augmentation (see Code Examples)
- `SUPER_ADMIN_EMAIL` check must still override and skip the re-fetch

### Pattern 2: Org Users API Routes

**What:** Three new route handlers for Admin user management.
**When to use:** /org/users page user table actions (list, role change, remove).

```typescript
// GET /api/org/users — requires Action.ManageUsers
// Returns: { users: Array<{ _id, displayName, email, role, status, createdAt }> }
export async function GET() {
  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;

  await dbConnect();
  const users = await User.find({})
    .select('displayName email role status createdAt')
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json({ users });
}
```

```typescript
// PATCH /api/org/users/[id]/role — requires Action.ManageUsers
// Body: { role: 'Admin' | 'Editor' | 'Viewer' }
// Guards: cannot change SUPER_ADMIN_EMAIL user's role; cannot self-demote last Admin
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;
  const session = authResult;

  const { role } = await request.json() as { role: string };
  if (!role || !['Admin', 'Editor', 'Viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  await dbConnect();
  const targetUser = await User.findById(params.id);
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Superadmin protection: cannot change SUPER_ADMIN_EMAIL user's role
  if (targetUser.email === process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Cannot change superadmin role' }, { status: 403 });
  }

  targetUser.role = role as Role;
  await targetUser.save();

  return NextResponse.json({ ok: true });
}
```

```typescript
// DELETE /api/org/users/[id] — requires Action.ManageUsers
// Sets status='disabled' (not hard delete — preserves audit trail)
// Guards: cannot remove SUPER_ADMIN_EMAIL; cannot remove self
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;
  const session = authResult;

  await dbConnect();
  const targetUser = await User.findById(params.id);
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Superadmin protection
  if (targetUser.email === process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Cannot remove superadmin' }, { status: 403 });
  }

  // Prevent self-removal
  if (params.id === session.user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
  }

  targetUser.status = 'disabled';
  await targetUser.save();

  return NextResponse.json({ ok: true });
}
```

### Pattern 3: /org/users Page — Active Members Section

**What:** Extend the existing Phase 20 stub page to add an active members table above the pending invites table. Fetch both from separate API endpoints on mount.
**When to use:** The /org/users page.

```typescript
// Extend OrgUsersPage to fetch active users
interface UserRow {
  _id: string;
  displayName: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  status: 'active' | 'invited' | 'disabled';
  createdAt: string;
}

// Fetch active users on mount alongside invites
useEffect(() => {
  Promise.all([fetchUsers(), fetchInvites()]);
}, []);

async function fetchUsers() {
  const res = await fetch('/api/org/users');
  if (res.ok) {
    const data = await res.json();
    setUsers(data.users ?? []);
  }
}

// Role change handler — optimistic update + PATCH
async function handleRoleChange(userId: string, newRole: string) {
  setUsers(prev =>
    prev.map(u => u._id === userId ? { ...u, role: newRole as UserRow['role'] } : u)
  );
  const res = await fetch(`/api/org/users/${userId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: newRole }),
  });
  if (!res.ok) {
    showErrorToast('Failed to update role');
    await fetchUsers(); // revert on failure
  }
}

// Remove handler — optimistic remove + DELETE
async function handleRemoveUser(userId: string) {
  const res = await fetch(`/api/org/users/${userId}`, { method: 'DELETE' });
  if (res.ok) {
    setUsers(prev => prev.filter(u => u._id !== userId));
  } else {
    showErrorToast('Failed to remove user');
  }
}
```

### Pattern 4: Permission-Gated UI Wiring

**What:** Wire `usePermissions()` booleans into existing UI components. The hook is already implemented; this is purely conditional rendering.
**When to use:** CollectionsPage (canCreate), tokens page (canGitHub, canFigma), TokenGeneratorForm prop (canEdit).

```typescript
// CollectionsPage — hide "New Collection" button + dashed card for Viewers
import { usePermissions } from '@/context/PermissionsContext';

const { canCreate } = usePermissions();

// In the header:
{canCreate && (
  <Button onClick={() => setCreateDialogOpen(true)}>
    <PlusCircle size={14} className="mr-1.5" />
    New Collection
  </Button>
)}

// In the grid:
{canCreate && (
  <div
    className="border-2 border-dashed..."
    onClick={() => setCreateDialogOpen(true)}
  >
    <PlusCircle size={24} />
    <span>New Collection</span>
  </div>
)}
```

```typescript
// Tokens page — hide GitHub/Figma items in dropdown for Viewer
// Add at the top of CollectionTokensPage:
const { canEdit, canGitHub, canFigma } = usePermissions();

// In the DropdownMenuContent:
{canFigma && (
  <DropdownMenuItem onClick={() => setImportFigmaOpen(true)}>
    Import from Figma
  </DropdownMenuItem>
)}
{canGitHub && (
  <DropdownMenuItem onClick={importFromGitHub}>
    Import from GitHub
  </DropdownMenuItem>
)}
{canGitHub && (
  <DropdownMenuItem onClick={exportToGitHub}>
    Push to GitHub
  </DropdownMenuItem>
)}
{canFigma && (
  <DropdownMenuItem onClick={exportToFigma}>
    Export to Figma
  </DropdownMenuItem>
)}

// Pass isReadOnly to TokenGeneratorForm:
<TokenGeneratorForm
  ...
  isReadOnly={isThemeReadOnly || !canEdit}
  ...
/>
```

**Note on UI-01:** The requirement says "visible but non-interactive (disabled)". For `TokenGeneratorForm`, `isReadOnly` already implements disabled-but-visible behavior (fields are shown, cursor is default, no edit events fire). `BulkActionBar` already returns `null` when `isReadOnly` — this is correct (bulk action bar hidden = consistent with disabled UX, since it only appears when rows are selected for editing). No new disabled states need to be built.

### Pattern 5: TypeScript Type Augmentation for JWT Fields

**What:** Extend `next-auth` JWT type to include `roleLastFetched`.
**When to use:** Alongside the jwt callback changes to avoid TypeScript errors.

```typescript
// src/types/next-auth.d.ts (create if it doesn't exist; check first)
import { DefaultSession, DefaultJWT } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: string;
    roleLastFetched?: number;
  }
}
```

### Anti-Patterns to Avoid

- **Hard-deleting users:** Use `status='disabled'` — preserve audit trail; existing token collections reference `userId` fields.
- **Checking SUPER_ADMIN_EMAIL only on sign-in:** The jwt callback re-fetch MUST still apply the SUPER_ADMIN_EMAIL override every time, even on re-fetch. Return early after override to skip DB re-fetch.
- **Returning `null` from jwt callback:** Return `{}` (empty object) not `null` — `null` is ignored by next-auth v4; empty object triggers sign-out.
- **Role change visible to changed user immediately:** The changed user's role in the JWT is stale until next jwt callback invocation (up to 60s). This is correct behavior per the requirement ("within 60 seconds").
- **Using `requireAuth()` instead of `requireRole(Action.ManageUsers)` for org user API routes:** These are Admin-only operations — always use `requireRole`.
- **Conditional rendering of permission gates on the server:** The tokens page and collections page are both Client Components (`'use client'`) — `usePermissions()` works correctly there. No server-side permission checks needed for UI gating (the API layer enforces actual security).
- **Calling `usePermissions()` outside of a `PermissionsProvider`:** Both pages are wrapped by `LayoutShell` → `AuthProviders` → `PermissionsProvider`. No extra wrapping needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT role staleness | Custom session invalidation mechanism | `roleLastFetched` timestamp in JWT + DB re-fetch in jwt callback | Standard next-auth v4 pattern; handles all JWT refresh scenarios |
| User status check | Separate "banned users" list | DB `status='disabled'` check in jwt callback | Already the schema design; consistent with `authorize()` checks |
| Session force-expiry after remove | WebSocket push / polling | Return `{}` from jwt callback when user is disabled | next-auth handles the sign-out on empty JWT |
| Permission checks in React | Custom context or prop drilling | `usePermissions()` hook from existing `PermissionsContext` | Already implemented in Phase 19; returns exactly the booleans needed |
| Role selector UI | Custom dropdown | `@radix-ui/react-select` (already installed) | Project-standard Select component; matches existing InviteModal role picker |

**Key insight:** Phases 16–20 built all the infrastructure this phase needs. Phase 21 is primarily wiring and extension, not new infrastructure.

---

## Common Pitfalls

### Pitfall 1: JWT Type Errors on roleLastFetched

**What goes wrong:** TypeScript reports `Property 'roleLastFetched' does not exist on type 'JWT'` when adding the field to the jwt callback.
**Why it happens:** next-auth v4 `JWT` interface doesn't include custom fields by default.
**How to avoid:** Check if `src/types/next-auth.d.ts` already exists (it was created in Phase 17 or earlier). If it exists, add `roleLastFetched?: number` to the JWT module augmentation. If it doesn't exist, create it with the full augmentation (see Code Examples).
**Warning signs:** TypeScript error `Property 'roleLastFetched' does not exist on type 'JWT'`.

### Pitfall 2: SUPER_ADMIN_EMAIL Must Bypass DB Re-fetch

**What goes wrong:** The jwt callback re-fetches role from DB. If the superadmin's DB record was manually downgraded (e.g., by a bug or migration), the re-fetch would overwrite the SUPER_ADMIN_EMAIL override.
**Why it happens:** The re-fetch updates `token.role` from DB; SUPER_ADMIN_EMAIL check must come AFTER the re-fetch or short-circuit to prevent this.
**How to avoid:** Apply SUPER_ADMIN_EMAIL override AFTER the re-fetch block, or (better) apply it first and return early before re-fetch. Returning early is cleaner and prevents any DB hit for the superadmin.

```typescript
// SUPER_ADMIN_EMAIL short-circuit — apply first, skip re-fetch
if (token.email === process.env.SUPER_ADMIN_EMAIL) {
  token.role = 'Admin';
  token.roleLastFetched = Date.now(); // keep timestamp fresh too
  return token;
}
// ...then DB re-fetch for regular users
```

### Pitfall 3: date-fns Not Installed

**What goes wrong:** Phase 20 Plan 03 references `import { format } from 'date-fns'` in the /org/users page. `date-fns` is NOT in the project's `package.json` or `node_modules`. Using it will cause a build failure.
**Why it happens:** Phase 20 Research flagged this as a "check with `ls node_modules/date-fns`" — it's not present.
**How to avoid:** In the /org/users page extension, use `toLocaleDateString()` instead of `date-fns/format`:
```typescript
// Use instead of date-fns:
new Date(user.createdAt).toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric'
})
```
Do NOT add `date-fns` as a dependency — not in project standard stack.

### Pitfall 4: User Removal — Disabled Status Does Not Immediately Sign Out

**What goes wrong:** After setting `status='disabled'`, the user's existing JWT is still valid until the next jwt callback invocation. If the jwt callback TTL is 60 seconds, the removed user has up to 60 seconds of continued access.
**Why it happens:** JWT sessions are not server-side invalidatable in next-auth v4 without a token blocklist.
**How to avoid:** The requirement says "removed users are immediately redirected to sign-in on their next request". This is satisfied by the DB status check in the jwt callback: on the next request that triggers a JWT refresh (within 60s), the callback finds `status='disabled'` and returns `{}` → sign-out redirect. Document this 60-second maximum in the plan as expected behavior. "Immediately" in the requirement means "without requiring explicit sign-out action by the removed user", not "instantaneously".

### Pitfall 5: OrgSidebar Still Missing usePermissions / Users Item

**What goes wrong:** Phase 20 planned to add the "Users" nav item to OrgSidebar and isAdmin check, but Phase 20 has NOT been executed yet (confirmed by absence of `src/app/org/` directory). Phase 21 may need to either (a) assume Phase 20 has run, or (b) include these as Phase 21 work if Phase 20 is executed first.
**Why it happens:** Phase 21 depends on Phase 20. The research confirms Phase 20 plans exist but no execution summaries exist.
**How to avoid:** Phase 21 MUST be planned with `depends_on: Phase 20`. The planner should treat all Phase 20 artifacts (OrgSidebar Users item, LayoutShell fix, middleware guard, /org/users page, InviteModal, invite APIs) as already present. Phase 21 only extends the /org/users page, it does not re-create infrastructure.

### Pitfall 6: canEdit vs isThemeReadOnly in TokenGeneratorForm

**What goes wrong:** TokenGeneratorForm already has an `isReadOnly` prop driven by `isThemeReadOnly` (whether the active theme's selected group is in Source mode). Adding `!canEdit` to this prop must be an OR condition, not a replacement.
**Why it happens:** Two orthogonal read-only sources: theme source mode (existing) and org permissions (new).
**How to avoid:** The prop should be: `isReadOnly={isThemeReadOnly || !canEdit}`. Do not replace `isThemeReadOnly` — keep the existing logic and add permission gate on top.

### Pitfall 7: Remove User Must Not Allow Self-Removal or Superadmin Removal

**What goes wrong:** Admin clicks "Remove" on their own row or on the superadmin row.
**Why it happens:** No guard in DELETE handler.
**How to avoid:** DELETE /api/org/users/[id] must check:
1. `targetUser.email === process.env.SUPER_ADMIN_EMAIL` → 403
2. `params.id === session.user.id` → 400 "Cannot remove yourself"
The UI should also hide/disable the Remove button for these cases (see Code Examples).

---

## Code Examples

Verified patterns from official sources and existing codebase:

### JWT Type Augmentation

```typescript
// src/types/next-auth.d.ts — check if exists first; extend or create
// Source: https://next-auth.js.org/getting-started/typescript#module-augmentation

import { DefaultSession } from 'next-auth';

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
    roleLastFetched?: number;
  }
}
```

### JWT Callback with Role Re-fetch

```typescript
// src/lib/auth/nextauth.config.ts — extend the existing jwt callback
// Source: project's existing pattern + next-auth v4 jwt callback docs

async jwt({ token, user }) {
  // Initial sign-in
  if (user) {
    token.id   = (user as { id: string }).id;
    token.role = (user as { role: string }).role;
    token.name = (user as { name: string }).name;
    token.roleLastFetched = Date.now();
  }

  // SUPER_ADMIN_EMAIL enforcement — always applied, skips DB re-fetch
  if (token.email === process.env.SUPER_ADMIN_EMAIL) {
    token.role = 'Admin';
    token.roleLastFetched = Date.now();
    return token;
  }

  // Role re-fetch when stale
  const ROLE_TTL_MS = 60 * 1000; // 60 seconds
  if (!token.id) return token; // no id = pre-role-fetch session, skip
  const lastFetched = (token.roleLastFetched ?? 0) as number;
  if (Date.now() - lastFetched > ROLE_TTL_MS) {
    await dbConnect();
    const dbUser = await User.findById(token.id as string).select('role status').lean();
    if (!dbUser || (dbUser as { status: string }).status === 'disabled') {
      // User deleted or disabled — invalidate session
      return {} as typeof token;
    }
    token.role = (dbUser as { role: string }).role;
    token.roleLastFetched = Date.now();
  }

  return token;
},
```

### Permission-Gated Collections Page

```typescript
// src/app/collections/page.tsx — add at top, wire to JSX
'use client';
import { usePermissions } from '@/context/PermissionsContext';

export default function CollectionsPage() {
  const { canCreate } = usePermissions();
  // ...

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
        {canCreate && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusCircle size={14} className="mr-1.5" />
            New Collection
          </Button>
        )}
      </div>
      {/* ... grid ... */}
      {!loading && (
        <div className="grid ...">
          {canCreate && (
            <div className="border-2 border-dashed ..." onClick={() => setCreateDialogOpen(true)}>
              <PlusCircle size={24} />
              <span className="mt-2 text-sm font-medium">New Collection</span>
            </div>
          )}
          {/* Collection cards — visible to all */}
          {collections.map((collection) => (
            <CollectionCard key={collection._id} ... />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Permission-Gated Tokens Page Dropdown

```typescript
// src/app/collections/[id]/tokens/page.tsx
// Add at top of CollectionTokensPage function (after existing state):
const { canEdit, canGitHub, canFigma } = usePermissions();

// In the DropdownMenuContent (replace existing unconditional items):
<DropdownMenuContent align="end">
  <DropdownMenuItem onClick={() => setSaveAsDialogOpen(true)}>
    Save As
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => setShowLoadDialog(true)}>
    Load from Database
  </DropdownMenuItem>
  {(canFigma || canGitHub) && <DropdownMenuSeparator />}
  {canFigma && (
    <DropdownMenuItem onClick={() => setImportFigmaOpen(true)}>
      Import from Figma
    </DropdownMenuItem>
  )}
  {canGitHub && (
    <DropdownMenuItem onClick={importFromGitHub}>
      Import from GitHub
    </DropdownMenuItem>
  )}
  {canGitHub && (
    <DropdownMenuItem onClick={exportToGitHub}>
      Push to GitHub
    </DropdownMenuItem>
  )}
  {canFigma && (
    <DropdownMenuItem onClick={exportToFigma}>
      Export to Figma
    </DropdownMenuItem>
  )}
  {/* ... rest of items ... */}
</DropdownMenuContent>

// TokenGeneratorForm prop:
isReadOnly={isThemeReadOnly || !canEdit}
```

### Role Selector in User Table Row

```typescript
// Inside /org/users page user table row (Admin cannot change their own role UI-side)
<Select
  value={user.role}
  onValueChange={(newRole) => handleRoleChange(user._id, newRole)}
  disabled={user.email === superAdminEmail || user._id === currentUserId}
>
  <SelectTrigger className="h-7 w-24 text-xs">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="Admin">Admin</SelectItem>
    <SelectItem value="Editor">Editor</SelectItem>
    <SelectItem value="Viewer">Viewer</SelectItem>
  </SelectContent>
</Select>
```

**Note:** `superAdminEmail` is not exposed to the client via env vars (server-only). The UI check for superadmin should rely on the API returning 403 — the client can check if the user being acted on is also `isAdmin` (the requesting admin) to hide/disable the button, but cannot check SUPER_ADMIN_EMAIL directly. Best approach: server returns 403 with a clear error message; UI shows a toast.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JWT role set only at sign-in (current) | JWT re-fetch every 60s via `roleLastFetched` timestamp | Phase 21 implements this | Role changes propagate without sign-out; removed users lose access within 60s |
| No UI permission gating (current state) | `usePermissions()` booleans drive conditional rendering | Phase 21 wires this | Viewers see read-only UI; non-create users can't see create controls |
| /org/users shows only pending invites (Phase 20) | /org/users unified table shows active members + invites | Phase 21 extends the page | Admin has full org visibility |

**Not yet implemented (confirmed):**
- JWT role re-fetch mechanism: planned in STATE.md decisions but NOT in `nextauth.config.ts`. Phase 21 must implement.
- `usePermissions()` wiring in `CollectionsPage`, `TokenGeneratorForm`, or tokens page dropdown: no `usePermissions` calls found outside `PermissionsContext.tsx` and `OrgSidebar.tsx` (Phase 20). Phase 21 must implement.

---

## Open Questions

1. **How does the user table know who the superadmin is (for disabling role change + remove buttons)?**
   - What we know: `SUPER_ADMIN_EMAIL` is server-only; never exposed to the client. The user's email is returned in the `GET /api/org/users` response.
   - What's unclear: Should the API mark the superadmin user with a flag so the UI can disable actions without knowing the email?
   - Recommendation: Add `isSuperAdmin: boolean` to the user row in the API response. The route handler can check `user.email === process.env.SUPER_ADMIN_EMAIL` server-side and include this flag. The client uses it to disable role-change selector and remove button for that user.

2. **Should "remove user" hard-delete or soft-delete (status='disabled')?**
   - What we know: `status='disabled'` already blocks sign-in in `authorize()`. The jwt callback returns `{}` when status is disabled, forcing sign-out on next request. Hard delete would break the audit trail and leave orphaned CollectionPermission documents.
   - What's unclear: Does the Admin UI show disabled users or only active users? Phase 20 context says "active / pending invite" statuses — disabled users should probably not appear in the table.
   - Recommendation: Soft delete (set `status='disabled'`). GET /api/org/users should exclude `status:'disabled'` users from the response. Removed users disappear from the table immediately (optimistic update). The success criterion says "removed users are immediately redirected" — this is satisfied by the disabled-status jwt callback check.

3. **Phase 20 execution dependency: is Phase 20 guaranteed to be complete before Phase 21 planning runs?**
   - What we know: Phase 20 has 4 plan files but no execution summaries. The org directory and invite API routes show partial execution (invites API exists, org page does not).
   - What's unclear: Whether the planner should assume Phase 20 is complete or treat Phase 20 gaps as Phase 21 prerequisites.
   - Recommendation: The planner should explicitly mark Phase 21 plans as `depends_on: Phase 20`. The first Phase 21 task should verify `/org/users` page exists before extending it. If not, include the Phase 20 stub as a Wave 0 prerequisite.

---

## Sources

### Primary (HIGH confidence)

- `src/lib/auth/nextauth.config.ts` — confirmed: jwt callback does NOT have role re-fetch; only sets role at initial sign-in
- `src/context/PermissionsContext.tsx` — confirmed: `usePermissions()` returns `{ canEdit, canCreate, isAdmin, canGitHub, canFigma }` exactly
- `src/lib/db/models/User.ts` — confirmed: `status: 'active' | 'invited' | 'disabled'`, `role: 'Admin' | 'Editor' | 'Viewer'`
- `src/lib/auth/permissions.ts` — confirmed: `Action.ManageUsers` exists; `canPerform()` is the single export
- `src/lib/auth/require-auth.ts` — confirmed: `requireRole(Action.ManageUsers)` is the correct guard for Admin-only routes
- `src/app/collections/page.tsx` — confirmed: `NewCollectionDialog` and dashed card are both triggered by `createDialogOpen`; no `usePermissions()` import present
- `src/app/collections/[id]/tokens/page.tsx` — confirmed: GitHub/Figma dropdown items are in a `DropdownMenuContent`; no permission gating present
- `src/components/tokens/TokenGeneratorForm.tsx` — confirmed: `isReadOnly` prop exists and controls all interactive behaviors
- `src/components/tokens/BulkActionBar.tsx` — confirmed: `if (isReadOnly || selectedCount === 0) return null` — already hidden when read-only
- `src/components/layout/LayoutShell.tsx` — confirmed: `isOrgRoute()` only includes `/collections` and `/settings`; Phase 20 plan 03 adds `/org` prefix (must be executed first)
- `src/components/layout/OrgSidebar.tsx` — confirmed: no `usePermissions()` import; no "Users" nav item yet (Phase 20 plan 03 adds this)
- `package.json` — confirmed: `date-fns` is NOT installed; no new packages needed for Phase 21
- next-auth v4 documentation — https://next-auth.js.org/configuration/callbacks#jwt-callback — jwt callback `user` parameter only on sign-in; returning `{}` invalidates session

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — Accumulated Context confirms `roleLastFetched` was the planned approach for 60s role propagation; not yet implemented
- `.planning/phases/20-email-invite-flow-and-account-setup/20-RESEARCH.md` — established patterns for API route structure, middleware, LayoutShell fix
- `.planning/phases/20-email-invite-flow-and-account-setup/20-03-PLAN.md` — shows exact Phase 20 artifacts expected (OrgSidebar, LayoutShell, /org/users page, InviteModal)

### Tertiary (LOW confidence)

- None required — all critical patterns verified against codebase or official next-auth docs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in package.json; no new dependencies
- Architecture: HIGH — all patterns are extensions of existing Phase 16-20 patterns in codebase; verified against actual source files
- Pitfalls: HIGH — identified by direct inspection of nextauth.config.ts (no role re-fetch), TokenGeneratorForm (existing isReadOnly prop), BulkActionBar (existing isReadOnly check), and package.json (date-fns absent)

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (next-auth v4 frozen; all other patterns are internal codebase patterns)
