---
phase: 07-fix-figma-integration
verified: 2026-02-28T02:00:00Z
status: gaps_found
score: 4/6 must-haves verified
re_verification: false
gaps:
  - truth: "Import from Figma button appears in the Generate tab action area and can be clicked by the user"
    status: failed
    reason: "The button that calls setImportFigmaOpen(true) was removed in commit 8bbf092 (plan 07-05). The ImportFromFigmaDialog is rendered and fully wired (onImported handler, state, dialog component all exist) but there is no trigger — no button the user can click to open it."
    artifacts:
      - path: "src/app/page.tsx"
        issue: "importFigmaOpen state declared at line 143, ImportFromFigmaDialog rendered at line 532, but setImportFigmaOpen(true) is never called anywhere in the codebase. Plan 07-04 commit (fb0fb2a) added the button correctly; plan 07-05 commit (8bbf092) deleted it during its page.tsx edits."
    missing:
      - "Restore the 'Import from Figma' button in the Generate tab between the description paragraph and <TokenGeneratorDocs />, calling onClick={() => setImportFigmaOpen(true)}"
human_verification:
  - test: "FigmaConfig Test Connection flow end-to-end"
    expected: "Clicking 'Test Connection' with a real Figma PAT returns green 'Connection successful' and enables the Save button; green dot appears on the header button after save"
    why_human: "Requires a live Figma PAT and network call to api.figma.com/v1/me — cannot verify against real Figma credentials programmatically"
  - test: "Export to Figma dialog with collection picker"
    expected: "Clicking 'Export to Figma' opens the proper dialog (not a browser prompt()), loads available Figma variable collections from the configured file, and exports successfully"
    why_human: "Requires live Figma credentials and a real file with variable collections; the auth header fix (X-Figma-Token) can only be validated against Figma's actual API"
  - test: "Source context bar displays for Figma-sourced collection"
    expected: "Selecting a collection imported from Figma shows a purple bar with Figma icon + file key below the tab switcher"
    why_human: "Requires an actual Figma-imported collection in MongoDB to test the conditional render"
  - test: "Import from Figma full flow (after button is restored)"
    expected: "After the missing button is restored: clicking it opens the two-step dialog, collections load, user picks one, names it, and it saves to MongoDB and auto-selects in the header"
    why_human: "Requires live Figma credentials and file — blocked by the missing button gap above"
---

# Phase 7: Fix Figma Integration — Verification Report

**Phase Goal:** Fix broken Figma export by consolidating user key + page key into a single persistent credentials dialog (stored like GitHub config, set once). Add import-from-Figma action to save as a collection. Highlight the upstream source (GitHub or Figma) clearly on both the View and Generate tabs.

**Verified:** 2026-02-28
**Status:** GAPS FOUND
**Re-verification:** No — initial verification


## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | FigmaConfig component exists in app header, mirrors GitHubConfig pattern (localStorage, green dot, Test Connection) | VERIFIED | `src/components/FigmaConfig.tsx` 270 lines; localStorage key `figma-config`; green dot on `isConnected`; Test Connection calls `/api/figma/test`; rendered at page.tsx line 421 alongside GitHubConfig |
| 2 | Figma export uses `X-Figma-Token` header (not `Authorization: Bearer`) | VERIFIED | `src/app/api/export/figma/route.ts` line 23: `'X-Figma-Token': figmaToken` — correct header present |
| 3 | Export to Figma opens a dialog (not `prompt()`); dialog has collection picker | VERIFIED | `ExportToFigmaDialog.tsx` (278 lines) is a full modal; wired into `TokenGeneratorFormNew.tsx` at line 633 (`setShowExportFigmaDialog(true)`); fetches `/api/figma/collections` on open |
| 4 | Import from Figma button exists in Generate tab and can be clicked | FAILED | `ImportFromFigmaDialog.tsx` (291 lines) is fully implemented; dialog is rendered in `page.tsx`; `importFigmaOpen` state declared; but `setImportFigmaOpen(true)` is NEVER called — the trigger button was deleted in commit `8bbf092` (plan 07-05) |
| 5 | Source context bar appears below tab switcher for GitHub/Figma-sourced collections, hidden for local/manual | VERIFIED | `SourceContextBar.tsx` (59 lines); returns null when `sourceMetadata` is null or type is null; renders GitHub bar for `type='github'`; renders Figma purple bar for `type='figma'`; wired at `page.tsx` line 471; `selectedSourceMetadata` state set on every collection load |
| 6 | sourceMetadata type system extended; import route saves Figma source metadata to MongoDB | VERIFIED | `collection.types.ts` has `type: 'github' \| 'figma' \| null`, `figmaFileKey`, `figmaCollectionId`; Mongoose schema updated; `/api/figma/import/route.ts` saves `type: 'figma'`, `figmaFileKey`, `figmaCollectionId`; export route updates sourceMetadata on success |

**Score: 5/6 truths verified** (1 failed)


### Required Artifacts

| Artifact | Min Lines | Actual Lines | Status | Details |
|----------|-----------|--------------|--------|---------|
| `src/components/FigmaConfig.tsx` | 120 | 270 | VERIFIED | localStorage, Test Connection, fileURL extraction, green dot, save/reset/cancel |
| `src/app/api/export/figma/route.ts` | — | 144 | VERIFIED | X-Figma-Token header; sourceMetadata update on success; multi-brand collectionId wiring |
| `src/types/collection.types.ts` | — | 39 | VERIFIED | type discriminator + figmaFileKey + figmaCollectionId fields |
| `src/lib/db/models/TokenCollection.ts` | — | 40 | VERIFIED | sourceMetadataSchema includes type, figmaFileKey, figmaCollectionId with null defaults |
| `src/app/api/figma/test/route.ts` | — | 21 | VERIFIED | GET; calls Figma /v1/me with X-Figma-Token; returns 400/401/500 |
| `src/app/api/figma/collections/route.ts` | — | 43 | VERIFIED | GET; fetches Figma variables endpoint; maps to `{ collections: [{id, name, modes}] }` |
| `src/app/api/figma/import/route.ts` | — | 193 | VERIFIED | POST; converts Figma modes to multi-brand token structure; saves to MongoDB with Figma sourceMetadata; returns 201 |
| `src/components/ExportToFigmaDialog.tsx` | 80 | 278 | VERIFIED | Modal dialog; credentials from localStorage; collection picker; export action; success/error states |
| `src/components/ImportFromFigmaDialog.tsx` | 100 | 291 | VERIFIED (component) | Two-step flow (pick → name); calls /api/figma/collections and /api/figma/import — but is unreachable by user |
| `src/components/SourceContextBar.tsx` | 40 | 59 | VERIFIED | Conditional: null for no-source; GitHub bar; Figma purple bar |
| `src/app/page.tsx` | — | 568 | PARTIAL | FigmaConfig, SourceContextBar, ImportFromFigmaDialog all wired; but the trigger button for ImportFromFigmaDialog is missing |


### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `FigmaConfig.tsx` | `localStorage['figma-config']` | `JSON.stringify/parse` | WIRED | line 102: `localStorage.setItem('figma-config', JSON.stringify(config))` |
| `FigmaConfig.tsx` | `/api/figma/test` | fetch in handleTestConnection | WIRED | line 75: fetch `/api/figma/test?token=...` |
| `src/app/api/export/figma/route.ts` | `https://api.figma.com` | `X-Figma-Token` header | WIRED | line 23: `'X-Figma-Token': figmaToken` |
| `src/app/api/figma/test/route.ts` | `https://api.figma.com/v1/me` | `X-Figma-Token` header | WIRED | line 9-11: fetch /v1/me with X-Figma-Token |
| `ExportToFigmaDialog.tsx` | `/api/figma/collections` | fetch on dialog open | WIRED | line 47-48: fetch `/api/figma/collections?token=...&fileKey=...` |
| `ExportToFigmaDialog.tsx` | `/api/export/figma` | POST on confirm | WIRED | line 115: POST `/api/export/figma` |
| `src/app/api/export/figma/route.ts` | `TokenCollection` (MongoDB) | findByIdAndUpdate | WIRED | lines 41-55: dynamic import + findByIdAndUpdate for sourceMetadata |
| `TokenGeneratorFormNew.tsx` | `ExportToFigmaDialog` | import + render | WIRED | line 10 import, line 1015 render, line 633 setShowExportFigmaDialog(true) |
| `ImportFromFigmaDialog.tsx` | `/api/figma/collections` | fetch on open | WIRED | line 79-81: fetch `/api/figma/collections?token=...&fileKey=...` |
| `ImportFromFigmaDialog.tsx` | `/api/figma/import` | POST on confirm | WIRED | line 121: POST `/api/figma/import` |
| `src/app/api/figma/import/route.ts` | `TokenCollection` (MongoDB) | `TokenCollection.create()` | WIRED | line 171: `TokenCollection.create({...})` |
| `page.tsx` | `FigmaConfig` | import + render in header | WIRED | line 13 import, line 421: `<FigmaConfig onConfigChange={setFigmaConfig} />` |
| `page.tsx` | `SourceContextBar` | sourceMetadata prop from selected collection | WIRED | line 14 import, line 471: `<SourceContextBar sourceMetadata={selectedSourceMetadata} />` |
| `page.tsx` → BUTTON | `setImportFigmaOpen(true)` | onClick in Generate tab | NOT WIRED | `setImportFigmaOpen(true)` is never called; button was added in commit `fb0fb2a` then deleted in commit `8bbf092` |
| `collections/[id] GET route` | `sourceMetadata` in response | returned in collection response | WIRED | line 24: `sourceMetadata: (doc.sourceMetadata as ...) ?? null` |


### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| FIGMA-01 | FigmaConfig persistent credentials dialog in app header (localStorage, green dot, Test Connection) | SATISFIED | `FigmaConfig.tsx` fully implemented; wired in `page.tsx` header alongside GitHubConfig |
| FIGMA-02 | Import-from-Figma action — fetch Figma variable collections, pick one, save as MongoDB collection | PARTIAL | `ImportFromFigmaDialog.tsx` and `/api/figma/import` route are fully implemented; but the trigger button in the Generate tab was removed in commit 8bbf092 — user cannot open the dialog |
| FIGMA-03 | Imported Figma collection saved as a collection in MongoDB | SATISFIED (backend) | `/api/figma/import/route.ts` correctly saves to MongoDB with Figma sourceMetadata; client dialog POSTs correctly; only blocked by missing button |
| FIGMA-04 | Export-to-Figma uses correct X-Figma-Token auth; proper dialog instead of prompt(); collection picker | SATISFIED | Auth header fixed; `ExportToFigmaDialog.tsx` is a proper modal with collection picker; wired in `TokenGeneratorFormNew`; sourceMetadata updated on success |
| FIGMA-05 | Source context bar below tab switcher; GitHub icon+repo for GitHub source; Figma icon+fileKey for Figma source; hidden for local/manual | SATISFIED | `SourceContextBar.tsx` renders null for null/no-type metadata; GitHub bar with SVG icon + repo + branch; Figma purple bar with SVG icon + fileKey; wired in `page.tsx` line 471 between tab switcher and `<main>` |


### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/app/page.tsx` | `setImportFigmaOpen(true)` never called — dialog state is orphaned | Blocker | User cannot trigger the Import from Figma flow at all despite the dialog being fully built |

No stub implementations, empty handlers, placeholder returns, or TODO/FIXME markers found in any of the 7 phase-owned files.


### Root Cause Analysis: Missing Import Button

Plan 07-04 (commit `fb0fb2a`) correctly added the "Import from Figma" button to the Generate tab:

```tsx
<div className="mb-4 flex items-center gap-2">
  <button
    onClick={() => setImportFigmaOpen(true)}
    className="px-3 py-1.5 text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200 rounded-md hover:bg-purple-200"
  >
    Import from Figma
  </button>
</div>
```

Plan 07-05 (commit `8bbf092`) subsequently modified `page.tsx` to wire FigmaConfig and SourceContextBar. In doing so, it deleted the button block (visible as a `-` hunk in the diff). The dialog, state, and handler were all retained — only the trigger button was removed. The 07-06 SUMMARY declared the integration "complete" without catching this regression.


### Human Verification Required

#### 1. FigmaConfig Test Connection

**Test:** Click "Configure Figma" in the app header; enter a real Figma Personal Access Token; click "Test Connection"
**Expected:** Loading state shows; on success, green dot and "Connection successful" appear; Save button becomes enabled; saving shows green dot on header button
**Why human:** Requires a live Figma PAT and network access to api.figma.com — cannot simulate the OAuth handshake or real API response programmatically

#### 2. Export to Figma dialog collection picker

**Test:** Configure Figma credentials; load tokens in Generate tab; click "Export to Figma"
**Expected:** A modal dialog opens (NOT a browser `prompt()`); Figma file key is pre-filled; clicking "Load collections" populates the dropdown with real Figma variable collections from the configured file; selecting one and clicking Export completes without error
**Why human:** Requires live Figma credentials and a real Figma file with variable collections to verify the end-to-end flow; auth header correctness (X-Figma-Token vs Authorization: Bearer) can only be validated against the actual Figma API

#### 3. Source context bar (after gap is closed)

**Test:** Import a collection from Figma (after the button is restored); select it in the collection selector
**Expected:** A purple bar with Figma logo icon and the file key appears below the tab switcher; switching to a local file selection makes the bar disappear entirely
**Why human:** Requires a Figma-sourced collection in MongoDB with correct sourceMetadata.type = 'figma'

#### 4. Import from Figma complete flow (after button is restored)

**Test:** Click the restored "Import from Figma" button; pick a variable collection from the Figma file; confirm a name; click "Import & Save"
**Expected:** Dialog closes; toast shows `Imported "Name" from Figma`; new collection appears selected in the shared header selector
**Why human:** Requires live Figma credentials and file; blocked by the missing button gap until that is fixed


## Gaps Summary

One gap blocks a core phase goal feature:

The "Import from Figma" button was correctly implemented in plan 07-04 but was unintentionally deleted during plan 07-05 edits to `page.tsx`. The entire import stack is complete and correct — `ImportFromFigmaDialog.tsx`, `/api/figma/import`, `/api/figma/collections`, and the `onImported` callback handler — but none of it is reachable by the user because `setImportFigmaOpen(true)` is never called.

The fix is a 6-line restore of the button block between the description paragraph and `<TokenGeneratorDocs />` in the Generate tab section of `page.tsx`. No other files need changes.

---

_Verified: 2026-02-28_
_Verifier: Claude (gsd-verifier)_
