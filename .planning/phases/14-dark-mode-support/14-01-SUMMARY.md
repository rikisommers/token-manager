---
phase: 14-dark-mode-support
plan: 01
subsystem: api
tags: [typescript, nextjs, mongodb, themes, design-tokens]

# Dependency graph
requires:
  - phase: 10-theme-token-sets
    provides: ITheme interface and theme API routes
provides:
  - ColorMode type ('light' | 'dark') exported from theme.types.ts
  - ITheme.colorMode required field (non-optional)
  - POST /api/collections/[id]/themes accepts and stores colorMode (defaults 'light')
  - PUT /api/collections/[id]/themes/[themeId] accepts colorMode as patchable field
affects:
  - 14-02 (UI badge display — reads ITheme.colorMode)
  - 14-03 (dark mode export pipeline — reads ITheme.colorMode)
  - any code that constructs ITheme objects (must supply colorMode)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Defensive fallback pattern: existing DB documents without colorMode read as 'light' via ?? 'light' — no migration required
    - Non-optional required field on ITheme enforces new code always sets colorMode explicitly

key-files:
  created: []
  modified:
    - src/types/theme.types.ts
    - src/app/api/collections/[id]/themes/route.ts
    - src/app/api/collections/[id]/themes/[themeId]/route.ts

key-decisions:
  - "colorMode typed as non-optional (required) on ITheme — enforces explicit values in new code; backward compat handled solely via ?? 'light' at DB read sites"
  - "POST handler validates colorMode against ['light','dark'] allowlist and defaults to 'light' — no 400 on omission, graceful default"
  - "PUT handler does not validate colorMode — body type ColorMode constrains it at TypeScript level; trusts the type at runtime"

patterns-established:
  - "ColorMode validation pattern: validColorModes allowlist with includes() check + 'light' default"
  - "New required fields use non-optional TypeScript type + ?? fallback at DB read sites (no migration scripts)"

requirements-completed:
  - DARK-01
  - DARK-02

# Metrics
duration: 2min
completed: 2026-03-25
---

# Phase 14 Plan 01: Dark Mode — ColorMode Type and Theme API Foundation Summary

**ColorMode type and ITheme.colorMode field added, with POST creating themes with colorMode and PUT patching it — no DB migration needed via defensive ?? 'light' fallback**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-25T10:53:01Z
- **Completed:** 2026-03-25T10:54:45Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Exported `ColorMode = 'light' | 'dark'` type from `src/types/theme.types.ts`
- Added `colorMode: ColorMode` as a required (non-optional) field on `ITheme`
- POST `/api/collections/[id]/themes` validates colorMode against allowlist, defaults to `'light'`
- PUT `/api/collections/[id]/themes/[themeId]` accepts `colorMode` as a patchable field and includes it in the nothing-to-update guard
- TypeScript compiles with zero errors after both changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ColorMode type and colorMode field to ITheme** - `dbb5a45` (feat)
2. **Task 2: Update POST and PUT theme routes to accept colorMode** - `82b5768` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/types/theme.types.ts` - Added `export type ColorMode = 'light' | 'dark'` and `colorMode: ColorMode` on `ITheme`
- `src/app/api/collections/[id]/themes/route.ts` - POST handler imports `ColorMode`, validates body.colorMode, defaults to `'light'`, stores on new theme object
- `src/app/api/collections/[id]/themes/[themeId]/route.ts` - PUT handler imports `ColorMode`, extends body type, spreads colorMode into updatedTheme, guards against nothing-to-update

## Decisions Made

- `colorMode` is non-optional on `ITheme` to force explicit values in all new code. Backward compatibility with existing MongoDB documents (which lack the field) is handled exclusively via `?? 'light'` at DB read sites — no migration script needed.
- POST defaults unrecognized or missing colorMode to `'light'` via an allowlist check, matching the plan's defensive defaulting pattern.
- PUT does not add runtime validation for colorMode values — the `ColorMode` body type handles it at TypeScript level, consistent with how `groups` and `graphState` are handled.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — TypeScript flagged the one expected compilation error (POST route's theme object missing the new `colorMode` field) which was resolved immediately in Task 2.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `ColorMode` type and `ITheme.colorMode` field are ready for consumption by Phase 14 Plan 02 (UI badge) and Plan 03 (export pipeline)
- Existing themes in MongoDB read as `'light'` via `?? 'light'` defensive fallback — no user action needed
- No blockers

---
*Phase: 14-dark-mode-support*
*Completed: 2026-03-25*
