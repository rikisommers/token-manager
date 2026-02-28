---
phase: 06-collection-ux-improvements
plan: "02"
subsystem: ui
tags: [react, nextjs, tabs, form-state, redirect, token-generator]

requires:
  - phase: 06-01
    provides: SharedCollectionHeader, tabbed layout with URL-based tab routing, placeholder Generate tab

provides:
  - Generate tab with full TokenGeneratorFormNew wired to shared header Save As and Build Tokens
  - generateTabTokens state exposed to parent for multi-tab Build Tokens support
  - /generate redirect to /?tab=generate (backwards-compatible URL preservation)
  - hidden-class tab rendering to preserve TokenGeneratorFormNew state across tab switches
  - generateFormKey remount pattern for "New Collection" form reset

affects:
  - 06-03 (final plan — UX polish, if any)

tech-stack:
  added: []
  patterns:
    - "hidden CSS class on tab divs (both always mounted) — preserves form state across tab switches without conditional rendering"
    - "key prop increment (generateFormKey) to trigger controlled remount when form reset is needed (New Collection)"
    - "Multi-tab Build Tokens: buildTokens/buildNamespace/buildCollectionName derived from activeTab — single BuildTokensModal serves both tabs"
    - "Server component redirect() in App Router — no 'use client', uses next/navigation redirect for 307 server-side redirect"

key-files:
  created: []
  modified:
    - src/app/page.tsx
    - src/app/generate/page.tsx

key-decisions:
  - "hidden CSS class (not conditional rendering) for tab content divs — TokenGeneratorFormNew internal state survives tab switching without any lifting"
  - "generateFormKey useState(0) + setGenerateFormKey(k => k + 1) in handleNewCollection — triggers controlled remount/reset of TokenGeneratorFormNew on New Collection"
  - "buildTokens/buildNamespace/buildCollectionName vars derived from activeTab — single BuildTokensModal handles both view and generate tab token sets"
  - "handleSaveAs uses generateTabTokens ?? {} when activeTab=generate — Save As Collection in shared header works from both tabs"
  - "generate/page.tsx is a server component with only redirect() — no 'use client', no state, 3-line file"

patterns-established:
  - "GitHubConfig rendered inline in Generate tab header row — matches original /generate page layout"
  - "TokenGeneratorDocs rendered above TokenGeneratorFormNew in Generate tab — consistent with previous page"

requirements-completed: [UX-04, UX-05]

duration: 3min
completed: 2026-02-27
---

# Phase 6 Plan 02: Generate Tab Wiring and /generate Redirect Summary

**Generate tab fully wired with TokenGeneratorFormNew using hidden-class state preservation; /generate server-side redirected to /?tab=generate; Build Tokens and Save As work from both tabs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T08:29:25Z
- **Completed:** 2026-02-27T08:32:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Wired `src/app/page.tsx` Generate tab with full `TokenGeneratorFormNew` + `TokenGeneratorDocs` + `GitHubConfig` header layout
- Added `generateTabTokens`/`generateTabNamespace`/`generateTabCollectionName` state + `handleGenerateTokensChange` callback
- Changed tab rendering from conditional (`{activeTab === 'view' && ...}`) to always-mounted with `hidden` CSS class — preserves form state across tab switches
- Added `generateFormKey` state + increment in `handleNewCollection` for controlled remount on "New Collection"
- Updated `isBuildEnabled` to check both view tab (MongoDB collection selected) and generate tab (tokens loaded)
- Updated `BuildTokensModal` to use tokens/namespace/collectionName derived from active tab
- Updated `handleSaveAs` to use `generateTabTokens` when `activeTab === 'generate'`
- Replaced `src/app/generate/page.tsx` (94-line client component) with 5-line server component using `redirect('/?tab=generate')`

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire Generate tab in page.tsx** - `82a80af` (feat)
2. **Task 2: Create /generate redirect** - `f040013` (feat)

## Files Created/Modified
- `src/app/page.tsx` - Added Generate tab state + callbacks + hidden-class tab rendering + full TokenGeneratorFormNew integration
- `src/app/generate/page.tsx` - Replaced 94-line client page with 5-line server component redirect to /?tab=generate

## Decisions Made
- `hidden` CSS class (not conditional rendering) for tab divs — both divs always mounted, so `TokenGeneratorFormNew` internal state (tokenGroups, globalNamespace, loadedCollection, etc.) survives switching to View tab and back
- `generateFormKey` counter incremented in `handleNewCollection` — triggers React remount of `TokenGeneratorFormNew` via `key` prop, which resets all internal state without requiring `clearForm` method call
- Single `BuildTokensModal` serves both tabs: `buildTokens`/`buildNamespace`/`buildCollectionName` are derived from `activeTab` — clean separation with no duplication
- `handleSaveAs` now uses `generateTabTokens ?? {}` when on generate tab — the shared header Save As button correctly saves generate-tab tokens into a named collection
- `generate/page.tsx` is a pure server component (no 'use client') — `redirect()` from `next/navigation` performs a server-side 307 redirect; no client JS overhead

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
Pre-existing TypeScript errors in `src/services/token.service.ts` and `src/utils/ui.utils.ts` (TS7053, TS2339) exist in the repository but are out of scope for this plan. No new errors were introduced in files modified by this plan (`src/app/page.tsx` and `src/app/generate/page.tsx` both compile cleanly).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Unified page is complete: View tab + Generate tab both fully functional under shared header
- /generate redirect preserves backwards compatibility
- Phase 6 Plan 03 (if any) can address UX polish items

## Self-Check: PASSED

- FOUND: src/app/page.tsx
- FOUND: src/app/generate/page.tsx
- FOUND: .planning/phases/06-collection-ux-improvements/06-02-SUMMARY.md
- FOUND commit: 82a80af (Task 1 - Wire Generate tab)
- FOUND commit: f040013 (Task 2 - /generate redirect)
