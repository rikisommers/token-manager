---
phase: 12-theme-aware-export
plan: "03"
subsystem: figma-export
tags: [figma, multi-mode, theme-export, variableModes, mergeThemeTokens]
dependency_graph:
  requires: [12-01]
  provides: [multi-mode-figma-export]
  affects: [src/app/api/export/figma/route.ts]
tech_stack:
  added: []
  patterns: [self-contained-fetch, multi-mode-payload, graceful-fallback]
key_files:
  created: []
  modified:
    - src/app/api/export/figma/route.ts
decisions:
  - "Route fetches themes from MongoDB itself using mongoCollectionId — no changes required in ExportToFigmaDialog caller"
  - "Figma export always includes ALL enabled themes as modes — ignores Config page theme selector entirely"
  - "Graceful fallback to Default-only mode when mongoCollectionId is absent or themes fetch fails"
  - "Mode names truncated to 40 chars to satisfy Figma API limit"
  - "Namespace wrapper stripped from masterTokenSet before walking tokens so variable names don't include namespace prefix"
metrics:
  duration: "~2 min"
  completed: "2026-03-20"
  tasks_completed: 1
  files_modified: 1
---

# Phase 12 Plan 03: Multi-Mode Figma Export Summary

**One-liner:** Rewrote `POST /api/export/figma` to self-fetch themes from MongoDB and emit a `{variableModes, variables, variableModeValues}` multi-mode Figma Variables payload — one Default mode plus one mode per collection theme.

## What Was Built

### Task 1: Rewrite Figma export route for multi-mode payload

Rewrote `/Users/user/Dev/atui-tokens-manager/src/app/api/export/figma/route.ts` to build Figma Variables API multi-mode payloads.

**Key changes from the single-mode version:**

1. **Import `mergeThemeTokens`** — added `import { mergeThemeTokens } from '@/lib/themeTokenMerge'` to apply theme group state logic per-theme when building mode values.

2. **Self-contained theme fetch** — when `mongoCollectionId` is provided in the request body, the route calls `repo.findById()` to get the collection document and extract `themes` and `namespace`. No changes to `ExportToFigmaDialog` were required.

3. **`buildMultiModePayload` function** — replaces the old `transformToFigmaVariables` helper:
   - Unwraps the namespace wrapper from `masterTokenSet` before walking tokens (so variable names don't include the namespace prefix)
   - Builds `flatVars[]` from master tokens for the Default mode
   - For each theme, calls `mergeThemeTokens(masterTokenSet, theme, namespace)` and flattens the merged result into a `Map<path, figmaValue>` for efficient per-variable lookup
   - Returns `{ variableModes, variables, variableModeValues }` — the full Figma Variables POST body

4. **Graceful fallback** — when `mongoCollectionId` is absent or the themes fetch throws, `themes = []` and only the Default mode is exported (same behavior as before this plan).

5. **Mode name truncation** — `theme.name.slice(0, 40)` satisfies the Figma API's 40-character mode name limit.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- [x] `src/app/api/export/figma/route.ts` imports `mergeThemeTokens` from `@/lib/themeTokenMerge`
- [x] Payload sent to Figma uses `variableModes`, `variables`, `variableModeValues`
- [x] When `mongoCollectionId` provided, themes fetched from MongoDB and each becomes a mode
- [x] When `mongoCollectionId` absent or fetch fails, only "Default" mode is sent
- [x] TypeScript compiles without errors (`npx tsc --noEmit` — zero output)
- [x] Task 1 commit: `ad9ca53`

## Self-Check: PASSED
