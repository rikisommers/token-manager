# Phase 19: RBAC and Permissions Context - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Role enforcement across all write API routes and a global `usePermissions()` hook in the React tree. Every component can check access without prop drilling. Admins have universal access; Viewers and Editors require explicit per-collection grants.

Note: The permission model was clarified during discussion — it is simpler than the roadmap description implied. Per-collection "overrides" are not arbitrary role overrides; they are explicit access grants that Viewers and Editors require to access any collection at all.

</domain>

<decisions>
## Implementation Decisions

### Permission hook API
- `usePermissions()` reads `collectionId` from `CollectionContext` automatically — no params at call site
- Returns named booleans only: `{ canEdit, canCreate, isAdmin, canGitHub, canFigma }`
- Returns all `false` while session is loading (safe default — nothing allowed until confirmed)
- `PermissionsProvider` lives in root `layout.tsx` so any component anywhere can call `usePermissions()`

### Collection access model
- **Admin**: universal access to all collections, all operations — no grant needed
- **Editor**: must be explicitly granted access per collection; within granted collections, has full write access
- **Viewer**: must be explicitly granted access per collection; within granted collections, has read-only access
- Collections not granted to a user are completely invisible — they do not appear in lists and return 404 on direct URL
- Only Admins can grant or revoke collection access for other users

### Role and permission changes
- Changes take effect on next sign-in (no polling, no real-time push)
- Admin sees immediate feedback via success toast in their own UI after making a change
- Affected user sees the change on their next session refresh or sign-in
- No forced session invalidation on role downgrade — current session continues until natural expiry

### 403 error behavior
- Write controls (`canEdit`, `canCreate`, `canGitHub`, `canFigma` === false) are disabled or hidden proactively via `usePermissions()` — 403s are a safety net, not the primary UX
- If a 403 occurs anyway (stale session, direct API call), redirect to sign-in
- Users without collection access cannot reach the collection at all (hidden from lists, 404 on direct URL)

### Claude's Discretion
- Exact implementation of `canEdit` vs `canCreate` distinction within Editor role
- Bootstrap/backfill logic for assigning existing collections to the first Admin at startup
- Where in the middleware vs route handler the permission check lives for each API route
- Internal shape of `CollectionPermission` records (userId + collectionId + role field)

</decisions>

<specifics>
## Specific Ideas

- The user explicitly simplified the model: "viewers and editors still need to be granted access on a collection basis" — this is the core design. Org role alone does not grant collection access for non-admins.
- 403 → redirect to sign-in (not toast) — treat permission failure as an auth-level event.
- "You won't be able to see it because you can't enter a collection without access" — confirms that collection visibility is strictly gated.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 19-rbac-and-permissions-context*
*Context gathered: 2026-03-28*
