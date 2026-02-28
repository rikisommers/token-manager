---
phase: 07-fix-figma-integration
plan: "03"
subsystem: ui
tags: [figma, react, typescript, mongodb, dialog, export]

# Dependency graph
requires:
  - phase: 07-fix-figma-integration/07-01
    provides: FigmaConfig localStorage pattern, X-Figma-Token auth header fix, sourceMetadata schema extension
  - phase: 07-fix-figma-integration/07-02
    provides: GET /api/figma/collections route, POST /api/export/figma route
provides:
  - ExportToFigmaDialog component with pre-filled credentials, editable file key, collection picker
  - exportToFigma in TokenGeneratorFormNew now opens ExportToFigmaDialog instead of prompt()
  - POST /api/export/figma updates MongoDB sourceMetadata.type='figma' after successful export
affects: [07-04-import-from-figma, 07-05-source-bar]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dialog reads figma-config from localStorage on open (no prop drilling of credentials)"
    - "mongoCollectionId passed through export dialog -> API route -> MongoDB update (non-fatal side-effect pattern)"
    - "Editable file key with explicit Load collections button — allows one-off exports without changing stored config"

key-files:
  created:
    - src/components/ExportToFigmaDialog.tsx
  modified:
    - src/components/TokenGeneratorFormNew.tsx
    - src/app/api/export/figma/route.ts

key-decisions:
  - "ExportToFigmaDialog reads figma-config from localStorage on open; no credentials prop threading"
  - "File key is editable with explicit Load collections button — one-off export to a different file without changing stored config"
  - "mongoCollectionId update is non-fatal — console.error logged but export response still returns 200"
  - "Dynamic import of dbConnect and TokenCollection in export route — avoids top-level module import in route file"
  - "Success state replaces form in dialog — prevents duplicate exports without closing"

patterns-established:
  - "Dialog-reads-own-config pattern: dialog loads localStorage config on open rather than receiving it as a prop"

requirements-completed: [FIGMA-04]

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 7 Plan 03: Export to Figma Dialog Summary

**ExportToFigmaDialog component replacing prompt()-based export — reads stored FigmaConfig, fetches Figma variable collections, lets user pick target, and records Figma as upstream source in MongoDB after export**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-27T21:16:09Z
- **Completed:** 2026-02-27T21:18:26Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created ExportToFigmaDialog.tsx (278 lines) with credentials loading from localStorage, collection picker, editable file key field, export action, error/success states
- Replaced the broken `prompt()`-based `exportToFigma` function in TokenGeneratorFormNew with a single `setShowExportFigmaDialog(true)` call
- Extended POST /api/export/figma to accept `mongoCollectionId` and update MongoDB `sourceMetadata` (type, figmaFileKey, figmaCollectionId) after a successful export

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ExportToFigmaDialog component** - `6e72d43` (feat)
2. **Task 2: Wire ExportToFigmaDialog + update export route with sourceMetadata** - `15346f0` (feat)

## Files Created/Modified
- `src/components/ExportToFigmaDialog.tsx` - New export dialog: localStorage config loading, /api/figma/collections fetch, editable file key, collection picker, multi-brand note, POST /api/export/figma on confirm
- `src/components/TokenGeneratorFormNew.tsx` - Import + state + JSX for ExportToFigmaDialog; exportToFigma refactored to open dialog
- `src/app/api/export/figma/route.ts` - Destructures mongoCollectionId from body; updates MongoDB sourceMetadata after successful Figma API call

## Decisions Made
- ExportToFigmaDialog loads `figma-config` from localStorage on open (no prop drilling) — consistent with how FigmaConfig stores it
- File key is pre-filled but editable; explicit "Load collections" button re-fetches for changed key — supports one-off exports to a different file per locked decision
- mongoCollectionId update uses dynamic import (`await import('@/lib/mongodb')`) — avoids top-level module-level import in the route file
- sourceMetadata update is non-fatal — errors are logged with `console.error` but the export response still returns 200 OK
- Success message replaces the form in the dialog — prevents accidental duplicate exports without an extra confirmation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all pre-existing TypeScript errors (in `token.service.ts`, `ui.utils.ts`, Angular project files) were pre-existing and unrelated to this plan's changes. Modified files produce zero TypeScript errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ExportToFigmaDialog is complete and wired — the Export to Figma button now works end-to-end when FigmaConfig is configured
- sourceMetadata update in the export route means exported collections will show Figma as upstream source in the source bar (plan 07-05)
- No blockers for plans 07-04 (import from Figma) or 07-05 (source bar)

## Self-Check: PASSED

All created/modified files found on disk. All commits verified in git history.

---
*Phase: 07-fix-figma-integration*
*Completed: 2026-02-28*
