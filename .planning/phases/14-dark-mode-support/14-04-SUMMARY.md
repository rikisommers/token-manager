---
phase: 14-dark-mode-support
plan: 04
subsystem: api
tags: [typescript, nextjs, figma, themes, design-tokens, dark-mode]

# Dependency graph
requires:
  - phase: 14-dark-mode-support
    provides: ColorMode type and ITheme.colorMode field (Plan 01)
  - phase: 12-theme-aware-export
    provides: buildMultiModePayload and mergeThemeTokens for Figma export

provides:
  - computeGroupKey: deterministic fingerprint from sorted enabled+source group IDs for theme grouping
  - pairThemesByColorMode: pairs themes into light+dark groups by group structure fingerprint
  - buildSingleModePayload: preserves Phase 12 Default-mode behavior for unpaired/no-theme collections
  - buildMultiModePayload: produces Light/Dark Figma mode names when a light+dark pair exists for a group key

affects:
  - Figma Variables export behavior: collections with both a light and dark theme now export as one collection with Light/Dark modes instead of two separate theme modes

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Group structure fingerprint pattern: sorted enabled+source group IDs joined by '|' produces deterministic pairing key
    - Last-one-wins with console.warn for duplicate colorMode+groupKey pairs
    - Fallback chain: no themes → buildSingleModePayload; one unpaired theme → buildSingleModePayload; paired themes → Light/Dark modes

key-files:
  created: []
  modified:
    - src/app/api/export/figma/route.ts

key-decisions:
  - "buildMultiModePayload selects the first pair with both light and dark as the primary pair — additional pairs with different group structures are not yet exported (future work)"
  - "buildSingleModePayload extracted from original Phase 12 loop — preserves Default-mode behavior for collections without paired themes"
  - "theme.colorMode ?? 'light' defensive fallback in pairThemesByColorMode — matches Phase 14-01 pattern of backward-compatible DB reads"

patterns-established:
  - "computeGroupKey pattern: Object.entries(theme.groups).filter(enabled|source).map(id).sort().join('|')"
  - "ThemePair interface: { groupKey, lightTheme, darkTheme } — nullable slots allow partial pairs"

requirements-completed:
  - DARK-05

# Metrics
duration: ~3min
completed: 2026-03-25
---

# Phase 14 Plan 04: Figma Export colorMode-Aware Light/Dark Mode Pairing Summary

**Figma export now groups themes by group structure fingerprint and pairs light/dark themes into a single Figma variable collection with "Light" and "Dark" modes instead of one mode per theme**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-25T10:57:49Z
- **Completed:** 2026-03-25T11:00:02Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added `computeGroupKey(theme)`: computes a deterministic fingerprint from a theme's sorted enabled+source group IDs, used to group themes that share the same group structure
- Added `pairThemesByColorMode(themes)`: builds a map of group key → `ThemePair`, pairing light and dark themes; duplicate same-colorMode pairs emit `console.warn` and use last-one-wins
- Added `buildSingleModePayload`: extracted from Phase 12 `buildMultiModePayload` to preserve Default-mode behavior for collections without paired themes
- Rewrote `buildMultiModePayload`: falls back to `buildSingleModePayload` when no themes or only unpaired themes exist; produces "Light"/"Dark" mode names when a light+dark pair is found
- TypeScript compilation passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor Figma export route with colorMode-aware theme pairing** - `15cc38f` (feat)

## Files Created/Modified

- `src/app/api/export/figma/route.ts` - Added `computeGroupKey`, `ThemePair`, `pairThemesByColorMode`, `buildSingleModePayload`; rewrote `buildMultiModePayload` to use Light/Dark mode pairing; imported `ColorMode` type

## Decisions Made

- `buildMultiModePayload` uses the first pair that has both light and dark as the primary pair — multiple pairs with different group structures are not yet multi-collection (Figma API limitation noted in plan comments).
- `buildSingleModePayload` is the extracted Phase 12 loop — not a new concept, just formalized as a named fallback so the multi-mode path stays readable.
- `theme.colorMode ?? 'light'` fallback in `pairThemesByColorMode` maintains the backward-compat pattern established in Plan 01 for existing DB documents that lack `colorMode`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — TypeScript compiled cleanly on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Figma export route now reflects Phase 14 colorMode semantics: light+dark theme pairs export as a single Figma collection with "Light" and "Dark" modes
- Collections with only light themes (or no themes) continue to use the Default-mode fallback from Phase 12 — no regression
- Ready for Phase 14 completion or further phases that extend multi-group-structure export

---
*Phase: 14-dark-mode-support*
*Completed: 2026-03-25*
