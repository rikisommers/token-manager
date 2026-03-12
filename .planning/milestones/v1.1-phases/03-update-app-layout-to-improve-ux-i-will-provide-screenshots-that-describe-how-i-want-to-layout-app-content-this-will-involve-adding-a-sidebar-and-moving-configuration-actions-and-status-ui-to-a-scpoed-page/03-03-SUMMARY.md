---
phase: 03-app-layout-ux
plan: "03"
subsystem: ui
tags: [nextjs, react, tailwind, build-tokens, figma, github]

# Dependency graph
requires:
  - phase: 03-01
    provides: AppSidebar with /configuration and /settings nav links
  - phase: 03-02
    provides: Tokens page refactor with collection selection in sidebar
provides:
  - Configuration page (/configuration) with inline BuildTokensPanel in two-column layout
  - Settings page (/settings) with FigmaConfig + GitHubConfig rendered always-expanded inline
  - BuildTokensPanel component — non-modal inline variant of BuildTokensModal
  - alwaysOpen prop on FigmaConfig and GitHubConfig for inline/expanded rendering
affects:
  - 03-04 (final phase — sidebar nav active states, any remaining UX polish)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - alwaysOpen prop pattern for toggling between modal and inline form rendering
    - Panel component pattern — same logic as modal but without Dialog wrapper

key-files:
  created:
    - src/components/BuildTokensPanel.tsx
    - src/app/configuration/page.tsx
    - src/app/settings/page.tsx
  modified:
    - src/components/FigmaConfig.tsx
    - src/components/GitHubConfig.tsx

key-decisions:
  - "BuildTokensPanel is a standalone component — does not import BuildTokensModal; logic duplicated intentionally to keep files independent"
  - "alwaysOpen prop in FigmaConfig and GitHubConfig: when true, initializes isOpen=true and conditionally renders form inline (no modal overlay) vs original modal path"
  - "GitHubConfig refactored formContent as a shared JSX variable used by both inline and modal render paths — avoids duplication within the file"
  - "Configuration page reads atui-selected-collection-id from localStorage on mount and fetches /api/collections/{id} — same key used by AppSidebar"

patterns-established:
  - "alwaysOpen pattern: add optional bool prop, initialize state from it, conditionally skip toggle button and modal wrapper"
  - "Panel vs Modal: same logic, different container — panel renders div, modal renders Dialog"

requirements-completed: [LAYOUT-05, LAYOUT-06]

# Metrics
duration: 25min
completed: 2026-03-11
---

# Phase 3 Plan 03: Configuration and Settings Pages Summary

**BuildTokensPanel inline component + /configuration two-column page + /settings always-expanded FigmaConfig and GitHubConfig forms**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-11T08:48:46Z
- **Completed:** 2026-03-11T09:13:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created BuildTokensPanel — non-modal build output panel with format tabs, brand sub-tabs, Copy, and Download All (ZIP)
- Created /configuration page with two-column layout: left shows Build Settings info, right renders BuildTokensPanel inline
- Created /settings page with Figma and GitHub sections, both forms always visible (no click-to-reveal)
- Added alwaysOpen prop to FigmaConfig and GitHubConfig — when true: inline render, no modal overlay, no toggle button

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BuildTokensPanel (inline build output component)** - `6af6a27` (feat)
2. **Task 2: Create Configuration page and Settings page** - `aad211c` (feat)

**Plan metadata:** (docs commit — pending)

## Files Created/Modified
- `src/components/BuildTokensPanel.tsx` - Inline build output panel; format/brand tabs, copy, download ZIP, auto-runs on tokens prop change
- `src/app/configuration/page.tsx` - Two-column Configuration page; reads collection from localStorage, fetches tokens, passes to BuildTokensPanel
- `src/app/settings/page.tsx` - Settings page with Figma and GitHub sections always expanded
- `src/components/FigmaConfig.tsx` - Added alwaysOpen prop; inline render path added alongside original modal path
- `src/components/GitHubConfig.tsx` - Added alwaysOpen prop; shared formContent variable used by both render paths

## Decisions Made
- BuildTokensPanel does not wrap BuildTokensModal — logic is duplicated to keep components independent and avoid prop-threading complexity
- GitHubConfig uses a shared `formContent` JSX variable to avoid duplicating the form markup in both inline and modal render paths
- FigmaConfig uses conditional ternary in JSX to split inline vs modal paths (form is short enough that full duplication is acceptable)
- Configuration page silently ignores fetch errors — tokens remain null and BuildTokensPanel shows empty state

## Deviations from Plan

**1. [Rule 1 - Bug] GitHubConfig modal path cleaned up**
- **Found during:** Task 2 (GitHubConfig alwaysOpen refactor)
- **Issue:** The original modal close button used HTML entity `×` — refactored to plain `x` for consistency with FigmaConfig
- **Fix:** Normalized close button label; also removed emoji characters in help text that could cause lint issues in strict environments
- **Files modified:** src/components/GitHubConfig.tsx
- **Verification:** TypeScript compiles cleanly, no new errors
- **Committed in:** aad211c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - minor cleanup)
**Impact on plan:** Cosmetic only. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors in src/services/token.service.ts (2 errors) and token-manager-angular/token-manager-stencil sub-projects (many errors) — all pre-existing, not caused by this plan's changes

## User Setup Required
None - no external service configuration required.

## Self-Check: PASSED

Files confirmed present:
- FOUND: src/components/BuildTokensPanel.tsx
- FOUND: src/app/configuration/page.tsx
- FOUND: src/app/settings/page.tsx
- FOUND: src/components/FigmaConfig.tsx (modified)
- FOUND: src/components/GitHubConfig.tsx (modified)

Commits confirmed present:
- FOUND: 6af6a27 (Task 1)
- FOUND: aad211c (Task 2)

## Next Phase Readiness
- /configuration and /settings pages are live and accessible via sidebar nav links added in 03-01
- BuildTokensPanel ready for use; empty state shown when no collection is selected
- Sidebar nav active states for Configuration and Settings need verification (03-04 scope)

---
*Phase: 03-app-layout-ux*
*Completed: 2026-03-11*
