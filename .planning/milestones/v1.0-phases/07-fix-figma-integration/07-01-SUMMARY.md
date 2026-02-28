---
phase: 07-fix-figma-integration
plan: 01
subsystem: ui
tags: [figma, localStorage, react, typescript, mongoose, api]

# Dependency graph
requires:
  - phase: 06-collection-ux-improvements
    provides: GitHubConfig pattern (localStorage + green dot + dialog), app header location for config buttons
provides:
  - FigmaConfig component with localStorage persistence, Test Connection, fileURL->fileKey extraction, green dot indicator
  - Fixed Figma export API route using X-Figma-Token header (was Authorization: Bearer)
  - ISourceMetadata type discriminator supporting both github and figma upstream sources
  - Mongoose sourceMetadata schema extended with type, figmaFileKey, figmaCollectionId fields
affects: [07-02-figma-test-route, 07-03-export-dialog, 07-04-import-from-figma, 07-05-source-bar]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FigmaConfig mirrors GitHubConfig: localStorage key 'figma-config', same dialog/green dot pattern"
    - "ISourceMetadata type discriminator: type field ('github'|'figma'|null) tells source bar which icon to render"
    - "Figma REST API auth: X-Figma-Token header (not Authorization: Bearer)"

key-files:
  created:
    - src/components/FigmaConfig.tsx
  modified:
    - src/app/api/export/figma/route.ts
    - src/types/collection.types.ts
    - src/lib/db/models/TokenCollection.ts

key-decisions:
  - "FigmaConfig stores { token, fileUrl, fileKey } in localStorage under 'figma-config' key"
  - "fileKey auto-extracted from fileUrl via regex on input change; no manual entry needed"
  - "Save requires testStatus===ok; green dot shown when localStorage has valid saved config (no re-test on mount)"
  - "X-Figma-Token header is the correct Figma REST API auth; Authorization: Bearer returns 401"
  - "collectionId added to POST body and passed to transformToFigmaVariables; defaults to 'default' if absent"
  - "type discriminator ('github'|'figma'|null) on ISourceMetadata; null means no upstream"
  - "No DB migration needed for new Mongoose fields — existing docs default to null"

patterns-established:
  - "Config component pattern: localStorage persistence + Test Connection + green dot (established in GitHubConfig, followed in FigmaConfig)"
  - "sourceMetadata discriminator union: type field distinguishes which upstream source icon/link to render in source bar"

requirements-completed: [FIGMA-01, FIGMA-04]

# Metrics
duration: 5min
completed: 2026-02-28
---

# Phase 7 Plan 01: Fix Figma Integration Foundation Summary

**FigmaConfig component (localStorage + Test Connection + fileKey extraction + green dot), fixed X-Figma-Token auth header, and sourceMetadata extended with Figma discriminator fields**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-27T20:43:08Z
- **Completed:** 2026-02-27T20:48:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created FigmaConfig.tsx (270 lines) mirroring GitHubConfig pattern with localStorage, green dot, Test Connection button
- Fixed broken Figma export route auth header — `X-Figma-Token` replaces `Authorization: Bearer` (was causing 401s)
- Extended ISourceMetadata with `type` discriminator, `figmaFileKey`, and `figmaCollectionId` fields
- Updated Mongoose sourceMetadataSchema with three new fields (null defaults, no migration needed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create FigmaConfig component** - `35ed43f` (feat)
2. **Task 2: Fix export API auth header + extend sourceMetadata schema** - `69b22e8` (fix)

## Files Created/Modified
- `src/components/FigmaConfig.tsx` - New component: localStorage config, Test Connection, fileURL->fileKey, green dot
- `src/app/api/export/figma/route.ts` - Fixed auth header from `Authorization: Bearer` to `X-Figma-Token`; added collectionId param
- `src/types/collection.types.ts` - Extended ISourceMetadata: type discriminator + figmaFileKey + figmaCollectionId
- `src/lib/db/models/TokenCollection.ts` - sourceMetadataSchema: added type, figmaFileKey, figmaCollectionId fields

## Decisions Made
- FigmaConfig stores `{ token, fileUrl, fileKey }` in localStorage under key `'figma-config'`
- fileKey is auto-extracted from fileUrl via regex on every input change (regex: `figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)`)
- Save button is disabled unless `testStatus === 'ok'` — no saving unvalidated credentials
- On mount: if localStorage has token + fileKey, set `isConnected=true` and call `onConfigChange` (no forced re-test — matches GitHubConfig behavior)
- `X-Figma-Token` is the correct Figma Personal Access Token header; `Authorization: Bearer` caused 401 Unauthorized
- `collectionId` extracted from POST body; defaults to `'default'` if absent — supports targeting specific Figma variable collections
- ISourceMetadata `type` field is `'github' | 'figma' | null` — null means manually-created collection with no upstream

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - the plan had precise specifications for all three changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- FigmaConfig component is ready to be wired into the app header in plan 07-05
- The `/api/figma/test` route (called by Test Connection) is created in plan 07-02
- Export route fix is live — plan 07-03 export dialog can now call it with correct header
- sourceMetadata schema extension supports all downstream plans (import flow, source bar)

---
*Phase: 07-fix-figma-integration*
*Completed: 2026-02-28*
