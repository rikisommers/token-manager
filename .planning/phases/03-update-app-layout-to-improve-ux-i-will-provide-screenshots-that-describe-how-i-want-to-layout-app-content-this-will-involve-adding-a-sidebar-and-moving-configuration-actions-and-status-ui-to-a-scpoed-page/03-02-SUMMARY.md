---
phase: 03-app-layout-ux
plan: "02"
subsystem: tokens-page
tags: [refactor, layout, sidebar, page.tsx, collection-actions]
dependency_graph:
  requires: [03-01]
  provides: [tokens-page-refactored, collection-actions-top-bar]
  affects: [src/app/page.tsx]
tech_stack:
  added: []
  patterns: [sidebar-layout-content-area, inline-collection-actions-bar, hidden-preserve-code]
key_files:
  created: []
  modified:
    - src/app/page.tsx
decisions:
  - "View Tokens section preserved as hidden div — code intact, not navigable via sidebar"
  - "ExportToFigmaDialog and ImportFromFigmaDialog remain on Tokens page (locked decision)"
  - "githubConfig and figmaConfig kept as local state for future Settings page integration"
  - "HomeContent/Home split collapsed into single default export — Suspense removed (no useSearchParams)"
  - "handleSaveAs uses generateTabTokens ?? rawCollectionTokens ?? tokenData — no activeTab discrimination needed"
metrics:
  duration_minutes: 4
  completed_date: "2026-03-11"
  tasks_completed: 2
  files_modified: 1
---

# Phase 3 Plan 02: Tokens Page Refactor Summary

**One-liner:** Replaced old header+tabs layout with sidebar-compatible Tokens page — collection actions top bar, SourceContextBar, Generate Tokens form as primary content, View Tokens hidden in code.

## What Was Built

Refactored `src/app/page.tsx` to work within the new sidebar layout introduced in 03-01:

- **Removed:** App header (title, Build Tokens button, FigmaConfig, GitHubConfig), tab switcher (View Tokens / Generate Tokens), SharedCollectionHeader, BuildTokensModal, useSearchParams/useRouter/switchTab
- **Added:** Slim collection actions top bar with Save As, New Collection, and CollectionActions (Delete/Rename/Duplicate)
- **Preserved:** SourceContextBar below the top bar, TokenGeneratorFormNew as primary content, ImportFromFigmaDialog, SaveCollectionDialog, all collection state and handlers
- **Hidden:** View Tokens (TokenTable) section wrapped in `<div className="hidden">` — code intact, not shown
- **Simplified:** Removed min-h-screen wrappers from loading/error states, removed max-w-7xl constraints, collapsed HomeContent/Home split into single default export

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Refactor Tokens page — remove old header/tabs, add collection actions top bar | 0476685 | src/app/page.tsx |
| 2 | Remove loading/error full-screen overlays | 0476685 | src/app/page.tsx (combined with Task 1) |

## Decisions Made

1. **Tasks 1 and 2 combined into a single commit** — The file was rewritten from scratch; both tasks were naturally part of the same atomic change. Separate commits would have required an intermediate broken state.

2. **handleSaveAs simplified** — Original code used `activeTab` to pick tokens payload. With tabs removed, logic now uses `generateTabTokens ?? rawCollectionTokens ?? tokenData` which covers all cases correctly without tab discrimination.

3. **handleNewCollection simplified** — Original called `switchTab('generate')` after resetting; with only one visible content area (Generate Tokens form), that call is unnecessary and was removed.

## Deviations from Plan

None — plan executed exactly as written. Tasks 1 and 2 were committed together since the full file rewrite was atomic, but this is a non-breaking deviation (both tasks completed, all success criteria met).

## Self-Check: PASSED

- [x] `src/app/page.tsx` exists and modified (net -99 lines)
- [x] Commit `0476685` exists
- [x] No TypeScript errors in page.tsx (`npx tsc --noEmit 2>&1 | grep "app/page"` returns empty)
- [x] Pre-existing errors unchanged: 4 errors in `token.service.ts` and `ui.utils.ts`
- [x] No `min-h-screen`, `max-w-7xl`, `Design Token Manager`, `switchTab`, `useSearchParams`, `BuildTokensModal`, `SharedCollectionHeader` in page.tsx
- [x] `CollectionActions`, `SourceContextBar`, `TokenGeneratorFormNew` all present and wired
