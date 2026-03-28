---
phase: 21-org-users-admin-ui-and-permission-gated-ui
plan: 03
subsystem: ui
tags: [permissions, rbac, react, next.js, conditional-rendering]

# Dependency graph
requires:
  - phase: 19-rbac-and-permissions-context
    provides: PermissionsContext with usePermissions() returning { canEdit, canCreate, canGitHub, canFigma, isAdmin }

provides:
  - CollectionsPage gates New Collection button, dashed card, and empty-state button behind canCreate
  - Tokens page gates Import from Figma, Export to Figma, Import from GitHub, Push to GitHub behind canFigma/canGitHub
  - TokenGeneratorForm receives isReadOnly={isThemeReadOnly || !canEdit} — Viewer users see read-only token table

affects: [phase 22+, any consumer of collections page or tokens page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "usePermissions() boolean flags consumed via conditional rendering — no logic in components"
    - "isReadOnly OR condition: isThemeReadOnly || !canEdit — two independent read-only sources unified at prop boundary"
    - "Conditional DropdownMenuSeparator: {(canFigma || canGitHub) && <Separator />} — separator only rendered if items visible"

key-files:
  created: []
  modified:
    - src/app/collections/page.tsx
    - src/app/collections/[id]/tokens/page.tsx

key-decisions:
  - "Separator gated with (canFigma || canGitHub) — avoids orphaned divider when all Figma/GitHub items are hidden"
  - "isThemeReadOnly || !canEdit preserves existing theme read-only behavior while adding role-based read-only — both conditions required"
  - "NewCollectionDialog mount unchanged — driven by createDialogOpen state which can never be set if canCreate is false"

patterns-established:
  - "Permission-gated UI: wrap with {permission && (<Element />)} — no logic in JSX beyond the boolean gate"
  - "Compound isReadOnly: OR conditions for multiple read-only sources — single prop, multiple gatekeepers"

requirements-completed: [UI-01, UI-02, UI-03, UI-04]

# Metrics
duration: 4min
completed: 2026-03-29
---

# Phase 21 Plan 03: Permission-Gated UI Summary

**Conditional rendering wired to usePermissions() booleans — Viewer users see no write controls in collections grid or tokens page**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T21:49:19Z
- **Completed:** 2026-03-28T21:53:37Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- CollectionsPage hides New Collection header button, dashed creation card, and empty-state Create Collection button for Viewer users (canCreate=false)
- Tokens page hides Import from Figma, Export to Figma, Import from GitHub, and Push to GitHub dropdown items for Viewer users (canFigma=false, canGitHub=false)
- Conditional DropdownMenuSeparator avoids orphaned divider when all Figma/GitHub items are hidden
- TokenGeneratorForm receives isReadOnly={isThemeReadOnly || !canEdit} — inline editing and bulk actions disabled for Viewer users
- No regression for Admin/Editor users — all controls remain visible and functional

## Task Commits

Each task was committed atomically:

1. **Task 1: Gate New Collection button and card behind canCreate** - `a184e32` (feat)
2. **Task 2: Gate GitHub/Figma dropdown items and wire canEdit to TokenGeneratorForm** - `1d30557` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/app/collections/page.tsx` - Added usePermissions import, canCreate hook call, wrapped 3 UI elements in {canCreate && ...}
- `src/app/collections/[id]/tokens/page.tsx` - Added usePermissions import, canEdit/canGitHub/canFigma hook call, wrapped 4 dropdown items in conditionals, updated isReadOnly prop

## Decisions Made
- Separator gated with (canFigma || canGitHub): avoids an orphaned DropdownMenuSeparator when all Figma/GitHub items are hidden for Viewer users
- isThemeReadOnly || !canEdit: preserves existing theme group read-only behavior (Source mode) while adding role-based read-only; two independent reasons to be read-only, unified at the prop boundary
- NewCollectionDialog mount kept unconditional: it renders but is controlled by createDialogOpen state which can never be set true when canCreate is false, so no behavioral change needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - TypeScript compiled with zero errors on both tasks. A pre-existing TS error in src/lib/auth/nextauth.config.ts was confirmed to be out of scope (not introduced by these changes).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UI permission gating complete for Phase 21
- All four UI requirements (UI-01 through UI-04) satisfied
- Admin/Editor users see all controls unchanged; Viewer users see read-only collections and tokens pages
- Ready for Phase 21 human verification

## Self-Check: PASSED

- src/app/collections/page.tsx: FOUND
- src/app/collections/[id]/tokens/page.tsx: FOUND
- .planning/phases/21-org-users-admin-ui-and-permission-gated-ui/21-03-SUMMARY.md: FOUND
- Commit a184e32 (Task 1): FOUND
- Commit 1d30557 (Task 2): FOUND

---
*Phase: 21-org-users-admin-ui-and-permission-gated-ui*
*Completed: 2026-03-29*
