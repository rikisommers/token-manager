---
phase: 21-org-users-admin-ui-and-permission-gated-ui
verified: 2026-03-29T00:00:00Z
status: human_needed
score: 7/7 must-haves verified
re_verification: true
  previous_status: gaps_found
  previous_score: 6/7
  gaps_closed:
    - "Admin can navigate to /org/users and see a table of all org members with their name, email, role, and status (active / pending invite) — status badge now correctly renders 'Active' or 'Invited' based on user.status"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Role propagation within 60 seconds"
    expected: "After an Admin changes a non-superadmin user's role on /org/users, that user's session reflects the new role within 60 seconds without signing out"
    why_human: "Requires two simultaneous browser sessions and real-time observation of permission changes"
  - test: "Removed user redirected to sign-in on next request"
    expected: "After Admin removes a user (DELETE /api/org/users/[id] sets status=disabled), that user's next page request redirects to /auth/sign-in without requiring manual sign-out"
    why_human: "Requires two simultaneous sessions and observing session invalidation behavior"
  - test: "Superadmin and self row are non-interactive"
    expected: "The superadmin row has role selector and Remove button visually disabled; Admin's own row has Remove button disabled"
    why_human: "Requires visual inspection of the rendered /org/users page as an Admin"
  - test: "Viewer sees no New Collection controls"
    expected: "Sign in as Viewer; navigate to /collections; confirm New Collection header button and dashed card are absent"
    why_human: "Requires two user accounts with different roles"
  - test: "Viewer sees no GitHub/Figma dropdown items"
    expected: "As a Viewer, open any collection tokens page; click the EllipsisVertical dropdown; confirm Import from GitHub, Push to GitHub, Import from Figma, Export to Figma are absent"
    why_human: "Requires a Viewer account and visual inspection of the dropdown"
  - test: "Viewer token editing is disabled (not hidden)"
    expected: "As a Viewer on a collection tokens page, token value input fields are visible but non-interactive (disabled); no bulk action bar appears"
    why_human: "Requires a Viewer account; need to confirm 'disabled' vs 'hidden' behavior visually"
---

# Phase 21: Org Users Admin UI and Permission-Gated UI Verification Report

**Phase Goal:** Admin can manage all org members from a dedicated page, and write controls in existing collection UI are hidden for users who cannot perform those actions
**Verified:** 2026-03-29
**Status:** human_needed (all automated checks pass; 6 items require runtime verification)
**Re-verification:** Yes — after gap closure (status badge fix)

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | Admin can navigate to /org/users and see a table of all org members with their name, email, role, and status (active / pending invite) | VERIFIED | `src/app/org/users/page.tsx` lines 194-196: `<Badge variant={user.status === 'active' ? 'secondary' : 'outline'}>{user.status === 'active' ? 'Active' : 'Invited'}</Badge>` — gap fix confirmed. fetchUsers() calls GET /api/org/users which returns users with status field. Members table renders Name/Email/Role/Status/Actions columns. |
| 2   | Admin can change any non-superadmin user's org-level role using a role selector; the change takes effect within 60 seconds for the affected user without requiring sign-out | VERIFIED (automated) / NEEDS HUMAN (runtime) | `handleRoleChange` PATCHes `/api/org/users/${userId}/role`; `nextauth.config.ts` ROLE_TTL_MS=60000 re-fetches role from DB on stale JWT; runtime propagation timing needs human test |
| 3   | Admin can remove any non-superadmin user from the org; removed users are immediately redirected to sign-in on their next request | VERIFIED (automated) / NEEDS HUMAN (runtime) | `handleRemoveUser` DELETEs `/api/org/users/${userId}`; API sets `status='disabled'`; jwt callback returns `{}` for disabled users; runtime session invalidation needs human test |
| 4   | Token table edit fields and bulk action controls are visible but non-interactive (disabled) for users with read-only access on the active collection | VERIFIED | `tokens/page.tsx` line 1197: `isReadOnly={isThemeReadOnly \|\| !canEdit}`; `PermissionsContext` canEdit=false for Viewer; TokenGeneratorForm disables (not hides) fields under isReadOnly; BulkActionBar returns null when isReadOnly=true |
| 5   | The create-collection button and flow are not visible to Viewer users | VERIFIED | `collections/page.tsx` lines 111, 140, 153: all three New Collection UI paths wrapped in `{canCreate && ...}`; `canCreate` from `usePermissions()` is false for Viewer role |
| 6   | GitHub push/pull controls are not visible to Viewer users | VERIFIED | `tokens/page.tsx` lines 1025-1033: `{canGitHub && <DropdownMenuItem...>Import from GitHub</DropdownMenuItem>}` and `{canGitHub && <DropdownMenuItem...>Push to GitHub</DropdownMenuItem>}`; canGitHub=false for Viewer |
| 7   | Figma push/pull controls are not visible to Viewer users | VERIFIED | `tokens/page.tsx` lines 1020-1023, 1035-1037: `{canFigma && ...}` wraps both Import from Figma and Export to Figma items; canFigma=false for Viewer |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/lib/auth/nextauth.config.ts` | JWT callback with roleLastFetched timestamp and DB re-fetch after 60s staleness | VERIFIED | ROLE_TTL_MS=60*1000, roleLastFetched stamping, User.findById().select('role status').lean(), `return {} as typeof token` for disabled users, SUPER_ADMIN_EMAIL early return |
| `src/types/next-auth.d.ts` | TypeScript augmentation for JWT.roleLastFetched field | VERIFIED | JWT interface contains roleLastFetched?: number |
| `src/app/api/org/users/route.ts` | GET /api/org/users returning { users: UserRow[] } with isSuperAdmin flag | VERIFIED | Exports GET, filters status!='disabled', maps isSuperAdmin from SUPER_ADMIN_EMAIL env var, requireRole(Action.ManageUsers) guard |
| `src/app/api/org/users/[id]/route.ts` | DELETE /api/org/users/[id] soft-removes user | VERIFIED | Exports DELETE, sets status='disabled', superadmin + self-removal guards, requireRole(Action.ManageUsers) guard |
| `src/app/api/org/users/[id]/role/route.ts` | PATCH /api/org/users/[id]/role updates user role | VERIFIED | Exports PATCH, validates role in VALID_ROLES, superadmin guard, requireRole(Action.ManageUsers) guard |
| `src/app/org/users/page.tsx` | /org/users page with Members table, role selector, remove confirmation, conditional status badge | VERIFIED | Members table with Name/Email/Role/Status/Actions; handleRoleChange (PATCH); handleRemoveUser (DELETE); AlertDialog present; status badge on lines 194-196 uses user.status conditionally |
| `src/app/collections/page.tsx` | Collections page with canCreate-gated New Collection controls | VERIFIED | usePermissions() imported, canCreate destructured at line 23, {canCreate && ...} wraps header button (line 111), empty-state button (line 140), dashed card (line 153) |
| `src/app/collections/[id]/tokens/page.tsx` | Tokens page with canGitHub/canFigma-gated dropdown items and canEdit-gated TokenGeneratorForm | VERIFIED | usePermissions() imported at line 42, {canEdit, canGitHub, canFigma} destructured at line 89, dropdown items conditionally rendered, isReadOnly={isThemeReadOnly \|\| !canEdit} at line 1197 |

---

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `nextauth.config.ts` jwt callback | `User.ts` | User.findById().select('role status').lean() when stale | WIRED | Line 65: `User.findById(token.id as string).select('role status').lean()` inside ROLE_TTL_MS staleness check |
| `nextauth.config.ts` jwt callback | empty token return | return {} when status='disabled' or user not found | WIRED | Line 72: `return {} as typeof token` when `!dbUser \|\| dbUser.status === 'disabled'` |
| `api/org/users/route.ts` | `require-auth.ts requireRole` | requireRole(Action.ManageUsers) | WIRED | Line 8: `const authResult = await requireRole(Action.ManageUsers)` |
| `api/org/users/[id]/route.ts` | `User.ts` | User.findById(params.id); targetUser.status = 'disabled' | WIRED | Lines 16, 32: findById then targetUser.status = 'disabled'; targetUser.save() |
| `api/org/users/[id]/role/route.ts` | `User.ts` | User.findById(params.id); targetUser.role = role | WIRED | Lines 25, 35: findById then targetUser.role = role as Role; targetUser.save() |
| `org/users/page.tsx` | `/api/org/users` | fetch GET on mount via fetchUsers() in Promise.all | WIRED | Line 55: `fetch('/api/org/users')` inside fetchUsers(); called from useEffect Promise.all |
| `org/users/page.tsx` | `/api/org/users/[id]/role` | PATCH fetch in handleRoleChange with optimistic update | WIRED | Line 75: `fetch(\`/api/org/users/${userId}/role\`, { method: 'PATCH', ... })` |
| `org/users/page.tsx` | `/api/org/users/[id]` | DELETE fetch in handleRemoveUser after confirmation | WIRED | Line 87: `fetch(\`/api/org/users/${userId}\`, { method: 'DELETE' })` |
| `collections/page.tsx` | `PermissionsContext` | usePermissions().canCreate conditional render | WIRED | Line 23: `const { canCreate } = usePermissions()`; lines 111, 140, 153: {canCreate && ...} |
| `tokens/page.tsx` | `PermissionsContext` | usePermissions().canEdit passed as isReadOnly | WIRED | Line 89: `const { canEdit, canGitHub, canFigma } = usePermissions()`; line 1197: `isReadOnly={isThemeReadOnly \|\| !canEdit}` |
| `tokens/page.tsx` | `PermissionsContext` | usePermissions().canGitHub / canFigma conditional render | WIRED | Lines 1019-1038: {(canFigma \|\| canGitHub) && separator}, {canFigma && ...}, {canGitHub && ...} |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| USER-01 | 21-02, 21-04 | Admin can view a list of all org members with their roles and status | VERIFIED | Members table with name/email/role columns renders correctly; status badge at lines 194-196 of page.tsx conditionally renders 'Active' (secondary) or 'Invited' (outline) based on user.status |
| USER-05 | 21-01, 21-02, 21-04 | Admin can change an existing user's org-level role | VERIFIED | PATCH /api/org/users/[id]/role exists with DB write; JWT TTL re-fetch propagates within 60s; inline Select in page wires to API with optimistic update and revert on failure |
| USER-06 | 21-01, 21-02, 21-04 | Admin can remove a user from the org | VERIFIED | DELETE /api/org/users/[id] soft-deletes (status='disabled'); JWT callback returns {} for disabled users; AlertDialog confirmation in page |
| UI-01 | 21-03 | Token table inline edit controls disabled (not hidden) for read-only users | VERIFIED | isReadOnly={isThemeReadOnly \|\| !canEdit} on TokenGeneratorForm; canEdit=false for Viewer; TokenGeneratorForm uses isReadOnly throughout to disable but not hide fields; BulkActionBar returns null when isReadOnly |
| UI-02 | 21-03 | Create-collection button/flow hidden for Viewer | VERIFIED | {canCreate && ...} wraps all three New Collection UI elements; canCreate=canPerform(orgRole, Action.CreateCollection)=false for Viewer |
| UI-03 | 21-03 | GitHub push/pull controls hidden for Viewer | VERIFIED | {canGitHub && ...} wraps both Import from GitHub and Push to GitHub items |
| UI-04 | 21-03 | Figma push/pull controls hidden for Viewer | VERIFIED | {canFigma && ...} wraps both Import from Figma and Export to Figma items |

**Orphaned requirements check:** All 7 phase requirements (USER-01, USER-05, USER-06, UI-01, UI-02, UI-03, UI-04) are claimed by plans 21-01 through 21-04. No orphaned requirements.

---

### Anti-Patterns Found

No anti-patterns found. The previously reported hardcoded "Active" badge (line 194) has been replaced with conditional rendering based on user.status.

---

### Human Verification Required

The following items cannot be verified programmatically and require running the application:

#### 1. Role propagation within 60 seconds (USER-05)

**Test:** Sign in as Admin and as a second user (Editor or Viewer) in separate browser sessions. On the Admin session, navigate to /org/users and change the second user's role. On the second user's session, wait up to 60 seconds then perform any action that requires a new server request.
**Expected:** The second user's permissions reflect the new role within 60 seconds without requiring sign-out.
**Why human:** Requires two concurrent sessions and real-time observation; the 60-second JWT TTL mechanism is code-verified but end-to-end propagation timing needs runtime confirmation.

#### 2. Removed user redirected to sign-in (USER-06)

**Test:** Sign in as Admin and as a non-superadmin user in separate sessions. Admin removes the user via /org/users Remove button. On the removed user's session, navigate to any authenticated page.
**Expected:** The removed user is redirected to /auth/sign-in on their next server request (within the 60-second JWT TTL window at most).
**Why human:** Session invalidation via `return {}` in jwt callback is code-verified, but the actual redirect behavior requires runtime observation.

#### 3. Superadmin and self rows are visually non-interactive

**Test:** Sign in as an Admin user who is not the SUPER_ADMIN_EMAIL. Navigate to /org/users and visually inspect the members table.
**Expected:** The superadmin row's role selector and Remove button appear visually disabled (grayed out); the Admin's own row has Remove button disabled.
**Why human:** The `disabled={!canAct}` prop is code-verified but visual appearance of disabled state requires inspection.

#### 4. Viewer cannot see New Collection controls

**Test:** Sign in as a Viewer user and navigate to /collections.
**Expected:** No "New Collection" header button, no dashed "New Collection" card, no "Create Collection" button in empty state.
**Why human:** Requires a Viewer account for end-to-end role-based rendering verification.

#### 5. Viewer cannot see GitHub/Figma dropdown items

**Test:** Sign in as a Viewer user and open any collection's tokens page. Click the EllipsisVertical dropdown button.
**Expected:** The dropdown shows "Save As" and "Load from Database" but does NOT show Import from Figma, Export to Figma, Import from GitHub, or Push to GitHub.
**Why human:** Requires a Viewer account and visual inspection of the live dropdown.

#### 6. Viewer token editing is disabled (not hidden)

**Test:** Sign in as a Viewer user and open any collection's tokens page.
**Expected:** Token value fields, path fields, and type fields are visible in the table but not interactive (cannot be clicked to edit). The bulk action bar does not appear.
**Why human:** Need to confirm the distinction between "disabled/non-interactive" and "hidden" — only visual inspection can confirm users can see but not edit.

---

### Re-verification Summary

**Gap closed:** The previously reported gap in Truth 1 (USER-01) has been fixed. `src/app/org/users/page.tsx` lines 194-196 now read:

```tsx
<Badge variant={user.status === 'active' ? 'secondary' : 'outline'}>
  {user.status === 'active' ? 'Active' : 'Invited'}
</Badge>
```

This replaces the former hardcoded `<Badge variant="secondary">Active</Badge>`. The `UserRow` interface already declared `status: 'active' | 'invited'` and the API already returned the correct value — the fix was purely in the render path.

**Regressions:** None. All 10 key links verified above remain wired. All permission-gating artifacts (collections page, tokens page, permissions context) are unchanged.

**Overall status:** All 7 success criteria pass automated verification. Phase goal is structurally achieved. Six runtime behaviors require human confirmation.

---

_Verified: 2026-03-29_
_Verifier: Claude (gsd-verifier)_
