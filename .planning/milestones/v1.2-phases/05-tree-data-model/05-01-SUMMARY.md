---
phase: 05-tree-data-model
plan: 01
subsystem: ui
tags: [typescript, tree, token-groups, utilities]

# Dependency graph
requires: []
provides:
  - "parseGroupPath utility that converts token file paths to display label arrays"
  - "buildDisplayLabel helper for title-casing path segments with separator removal"
  - "onGroupsChange prop upgraded from flat { id, name }[] to full TokenGroup[] tree"
  - "Barrel export of tree.utils from src/utils/index.ts"
affects: [05-02, 05-03, 06-breadcrumbs, 06-selection]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Path parsing: split by '/', strip .json from last segment, apply buildDisplayLabel"
    - "Tree emission: emit full TokenGroup[] with children via onGroupsChange (no flattening)"

key-files:
  created:
    - "src/utils/tree.utils.ts"
  modified:
    - "src/utils/index.ts"
    - "src/components/TokenGeneratorFormNew.tsx"
    - "src/app/collections/[id]/tokens/page.tsx"

key-decisions:
  - "parseGroupPath strips .json from last segment only, not intermediate segments"
  - "buildDisplayLabel uses /\\b\\w/g regex for word capitalisation — does not split on digit boundaries, so brand1 -> Brand1"
  - "onGroupsChange emits full tokenGroups array directly (no summary mapping) to preserve children"
  - "Serialisation change-guard updated to use full JSON of tokenGroups instead of flat summary"

patterns-established:
  - "Path parser pattern: split/strip/transform per segment, pure TS no React imports"
  - "Tree utility barrel export via src/utils/index.ts"

requirements-completed:
  - TREE-02

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 5 Plan 01: Tree Data Model - Path Parser Summary

**parseGroupPath utility and buildDisplayLabel helper created in tree.utils.ts; onGroupsChange upgraded from flat { id, name }[] summary to full TokenGroup[] tree with children preserved**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T11:13:57Z
- **Completed:** 2026-03-12T11:16:08Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `src/utils/tree.utils.ts` with `parseGroupPath` and `buildDisplayLabel` — pure TypeScript, no React dependencies
- All five path-parsing examples from locked decisions verified: `brands/brand2/color.json` -> `['Brands', 'Brand2', 'Color']`, `globals/border-color.json` -> `['Globals', 'Border Color']`, etc.
- Upgraded `onGroupsChange` prop signature in `TokenGeneratorFormNew` from `{ id: string; name: string }[]` to `TokenGroup[]` — full tree with children emitted directly
- Updated consuming code in tokens page (`masterGroups` state, `handleGroupsChange` callback) to match new `TokenGroup[]` type
- `npx tsc --noEmit` passes with zero errors across all modified files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tree.utils.ts with parseGroupPath and buildDisplayLabel** - `0e7548e` (feat)
2. **Task 2: Export tree.utils from index + upgrade onGroupsChange to emit TokenGroup[]** - `512ba85` (feat)

## Files Created/Modified

- `src/utils/tree.utils.ts` - New utility file: parseGroupPath and buildDisplayLabel
- `src/utils/index.ts` - Added `export * from './tree.utils'` barrel export
- `src/components/TokenGeneratorFormNew.tsx` - Changed onGroupsChange prop type; emit tokenGroups directly
- `src/app/collections/[id]/tokens/page.tsx` - Updated masterGroups state type and handleGroupsChange parameter to TokenGroup[]

## Decisions Made

- Used `segment.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())` for buildDisplayLabel — this naturally handles `brand1` -> `Brand1` without splitting on digit boundaries
- Serialisation guard for change detection updated to use full `JSON.stringify(tokenGroups)` instead of the old flat summary string — avoids false negatives when only children change

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Path parser and tree type foundation complete, ready for Plan 02 (tree builder algorithm)
- TokenGroup[] flows correctly from TokenGeneratorFormNew through to the tokens page state
- No blockers

---
*Phase: 05-tree-data-model*
*Completed: 2026-03-12*
