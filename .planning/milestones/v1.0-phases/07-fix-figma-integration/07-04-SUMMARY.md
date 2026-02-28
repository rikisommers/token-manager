---
phase: 07-fix-figma-integration
plan: "04"
subsystem: ui
tags: [figma, import, react, typescript, dialog, page]

# Dependency graph
requires:
  - phase: 07-02
    provides: /api/figma/collections and /api/figma/import API routes
  - phase: 07-01
    provides: FigmaConfig component storing figma-config in localStorage
provides:
  - ImportFromFigmaDialog component: two-step pick-then-name import flow
  - Import from Figma button in Generate tab wired to dialog with onImported handler
affects: [07-05-source-bar]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-step dialog: pick step uses select element (consistent with other dialogs); name step pre-fills from Figma collection name"
    - "onImported callback: adds new collection to list + calls handleSelectionChange(newId) to auto-select"
    - "Dialog reads localStorage('figma-config') on open; shows credentials prompt if absent"

key-files:
  created:
    - src/components/ImportFromFigmaDialog.tsx
  modified:
    - src/app/page.tsx

key-decisions:
  - "noCredentials state shown inline when localStorage figma-config absent — no modal close, stays open with guidance"
  - "Retry button re-fetches collections using stored figmaToken/fileKey state (avoids re-reading localStorage)"
  - "handleImported appends new collection then calls handleSelectionChange(newId) — matches handleDuplicated pattern"
  - "Import from Figma button placed between description paragraph and TokenGeneratorDocs in Generate tab"
  - "ImportFromFigmaDialog rendered alongside SaveCollectionDialog (before BuildTokensModal) in return"

# Metrics
duration: 108
completed: 2026-02-28
---

# Phase 7 Plan 04: Import from Figma Dialog Summary

**ImportFromFigmaDialog two-step component (collection picker + name confirmation) + Import from Figma button in Generate tab wired to auto-select imported collection**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-27T21:16:11Z
- **Completed:** 2026-02-27T21:18:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `ImportFromFigmaDialog.tsx` (291 lines) with full two-step flow
- Step 1 (pick): reads `figma-config` from localStorage, fetches `/api/figma/collections`, shows select + mode count info, error/retry/empty/loading states
- Step 2 (name): pre-filled text input, POSTs to `/api/figma/import`, calls `onImported` on 201 Created
- Wired "Import from Figma" button in Generate tab header area of `page.tsx`
- Added `handleImported` handler that appends collection to list and auto-selects it via `handleSelectionChange`

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ImportFromFigmaDialog component | 08554ef | src/components/ImportFromFigmaDialog.tsx |
| 2 | Wire Import from Figma button into Generate tab | fb0fb2a | src/app/page.tsx |

## Files Created/Modified

- `src/components/ImportFromFigmaDialog.tsx` - New dialog: two-step pick/name flow, localStorage credentials check, /api/figma/collections fetch, /api/figma/import POST
- `src/app/page.tsx` - Import dialog added; importFigmaOpen state; handleImported handler; "Import from Figma" button in Generate tab; ImportFromFigmaDialog rendered in return

## Decisions Made

- **noCredentials state:** when `localStorage['figma-config']` is absent or malformed, dialog stays open showing a "Configure Figma credentials first" message with guidance — user does not need to close and reopen after configuring
- **Retry on error:** stores `figmaToken`/`fileKey` in component state so retry re-fetches without re-reading localStorage (cleaner than re-parsing on every retry)
- **handleImported pattern:** mirrors `handleDuplicated` — appends to collections array first, then calls `handleSelectionChange(newId)` so the new entry is present when selector renders
- **Button placement:** between the description `<p>` and `<TokenGeneratorDocs />` per CONTEXT.md spec ("Generate tab header/actions area")

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
