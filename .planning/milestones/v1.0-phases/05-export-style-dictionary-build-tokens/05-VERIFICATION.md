---
phase: 05-export-style-dictionary-build-tokens
verified: 2026-02-27T00:00:00Z
status: human_needed
score: 11/11 must-haves verified (automated); 1 item needs human confirmation
re_verification: false
human_verification:
  - test: "Open BuildTokensModal on View Tokens page with a real MongoDB collection and confirm all 6 format tabs show non-empty content, Copy button works, and Download All produces a valid ZIP named {collection-name}-tokens.zip"
    expected: "Each format tab (CSS, SCSS, LESS, JS, TS, JSON) displays built token output; Copy pastes content to clipboard; ZIP downloads with correct filename and flat file structure (no separate tokens-globals file when brand files exist)"
    why_human: "Real style-dictionary build output correctness and ZIP file contents cannot be verified programmatically — requires a live browser session with a connected MongoDB collection"
  - test: "Open BuildTokensModal on Generator page after loading a named MongoDB collection and confirm ZIP filename uses the actual collection name, not 'generated-tokens'"
    expected: "ZIP file named {actual-collection-name}-tokens.zip, not generated-tokens-tokens.zip"
    why_human: "ZIP filename flow depends on the three-argument onTokensChange callback with a real loaded collection — end-to-end runtime test required"
---

# Phase 5: Export Style Dictionary Build Tokens — Verification Report

**Phase Goal:** Users can trigger a style-dictionary build from either page header and view all format outputs (CSS, SCSS, LESS, JS, TS, JSON) in a modal with per-tab copy and ZIP download
**Verified:** 2026-02-27
**Status:** human_needed (all automated checks pass; 2 items require human testing)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | POST /api/build-tokens accepts raw token JSON + namespace + collectionName and returns built CSS, SCSS, LESS, JS, TS, JSON outputs grouped by brand | ✓ VERIFIED | `src/app/api/build-tokens/route.ts` — validates tokens + collectionName, delegates to `buildTokens()`, returns `NextResponse.json(result)` with `BuildTokensResult` shape |
| 2  | Multi-brand collections produce one output entry per brand per format (globals merged into each non-globals brand) | ✓ VERIFIED | `mergeGlobalsIntoBrands()` in `style-dictionary.service.ts` — detects file-path keyed tokens, groups by first path segment, deep-merges globals into non-globals brands; globals entry dropped when real brands exist |
| 3  | Single-brand collections produce exactly one output entry per format | ✓ VERIFIED | `detectBrands()` returns `[{ brand: 'globals', tokens }]` for flat structures; loop over brands produces exactly one `BrandFormatOutput` per `FormatOutput` |
| 4  | BuildTokensModal renders format tabs (CSS/SCSS/LESS/JS/TS/JSON) with per-format brand sub-tabs for multi-brand output | ✓ VERIFIED | `BuildTokensModal.tsx` lines 204–237: `FORMATS.map` renders 6 tab buttons; `isMultiBrand` guard renders brand sub-tabs only when `currentBrands.length > 1` |
| 5  | Copy-to-clipboard button is present per tab and works | ✓ VERIFIED | Lines 242–247: `handleCopy` uses `navigator.clipboard.writeText(content)`; button text changes to "Copied!" for 2 seconds via `setCopiedKey` + `setTimeout` |
| 6  | Download All button triggers ZIP download containing all brand x format files | ✓ VERIFIED | Lines 117–132: `handleDownloadAll` creates `new JSZip()`, iterates all `result.formats` and their `outputs`, generates blob, creates anchor with `a.download = \`${collectionName}-tokens.zip\`` |
| 7  | Loading spinner shown while API call is in flight; error state shown if build fails | ✓ VERIFIED | Lines 180–198: `loading` flag shows spinner + "Building..." text; `error` state shows red error message with "Retry" button that calls `runBuild()` |
| 8  | View Tokens page header has a Build Tokens button disabled on local, enabled on MongoDB collection | ✓ VERIFIED | `src/app/page.tsx` line 132: `isBuildEnabled = selectedId !== 'local' && selectedId !== ''`; button at line 326: `disabled={!isBuildEnabled}` |
| 9  | Generator page header has a Build Tokens button disabled when no tokens, enabled when tokens present | ✓ VERIFIED | `src/app/generate/page.tsx` line 59: `disabled={!buildTokensData}`; `handleTokensChange` sets `buildTokensData` from `onTokensChange` callback |
| 10 | Both pages share the same BuildTokensModal — no code duplication | ✓ VERIFIED | `page.tsx` imports `BuildTokensModal` from `@/components/BuildTokensModal`; `generate/page.tsx` imports the same component — no inline duplicate modal implementation |
| 11 | ANGULAR_PARITY.md documents the POST /api/build-tokens endpoint | ✓ VERIFIED | `.planning/ANGULAR_PARITY.md` — Phase 5 section documents endpoint path, request/response shapes, BuildTokensModal component pattern, and three-argument `onTokensChange` signature |

**Score:** 11/11 truths verified (automated)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/services/style-dictionary.service.ts` | Server-side style-dictionary build pipeline; exports `buildTokens` | ✓ VERIFIED | 277 lines; exports `buildTokens()`; implements `detectBrands`, `mergeGlobalsIntoBrands`, `buildBrandTokens` with SD v5 `formatPlatform()` |
| `src/app/api/build-tokens/route.ts` | POST /api/build-tokens endpoint; exports `POST` | ✓ VERIFIED | 30 lines; exports `POST` handler; validates request, calls `buildTokens()`, returns JSON |
| `src/components/BuildTokensModal.tsx` | Shared build output modal; exports `BuildTokensModal` | ✓ VERIFIED | 259 lines; exports `BuildTokensModal`; format tabs, brand sub-tabs, clipboard copy, ZIP download, loading/error states |
| `src/types/token.types.ts` | Contains `BuildTokensRequest`, `BuildTokensResult`, `FormatOutput`, `BrandFormatOutput` | ✓ VERIFIED | All four interfaces present at lines 202–226; re-exported through `src/types/index.ts` |
| `src/app/page.tsx` | Build Tokens button in View Tokens page header; renders BuildTokensModal | ✓ VERIFIED | Imports `BuildTokensModal`; `buildModalOpen` state; `rawCollectionTokens`/`rawCollectionName` state; button + conditional modal render |
| `src/app/generate/page.tsx` | Build Tokens button in Generator page header; renders BuildTokensModal | ✓ VERIFIED | Imports `BuildTokensModal`; `buildTokensData`/`buildNamespace`/`buildCollectionName` state; `handleTokensChange` with three-argument signature; conditional modal render |
| `src/components/TokenGeneratorFormNew.tsx` | Exposes tokens, namespace, collectionName via `onTokensChange` | ✓ VERIFIED | Three-argument `onTokensChange` prop (tokens, namespace, collectionName); `loadedCollection?.name` passed as third argument; `countTokensRecursive` enables button after loading collections with nested token groups |
| `.planning/ANGULAR_PARITY.md` | Phase 5 section documenting POST /api/build-tokens | ✓ VERIFIED | Phase 5 section present; documents endpoint, request/response shapes, component pattern, onTokensChange signature |
| `package.json` | Contains `style-dictionary` and `jszip` in dependencies | ✓ VERIFIED | `"jszip": "^3.10.1"` and `"style-dictionary": "^5.3.2"` present in dependencies |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/build-tokens/route.ts` | `src/services/style-dictionary.service.ts` | `import buildTokens` and call with token body | ✓ WIRED | Line 2: `import { buildTokens } from '@/services/style-dictionary.service'`; line 16: `const result = await buildTokens({...})` |
| `src/components/BuildTokensModal.tsx` | `/api/build-tokens` | `fetch POST in runBuild callback` | ✓ WIRED | Line 47: `const res = await fetch('/api/build-tokens', { method: 'POST', ... })` — response consumed and set via `setResult(data)` |
| `src/components/BuildTokensModal.tsx` | `jszip` | `new JSZip() in handleDownloadAll` | ✓ WIRED | Line 4: `import JSZip from 'jszip'`; line 119: `const zip = new JSZip()` with full file iteration, blob generation, and anchor click |
| `src/app/page.tsx` | `src/components/BuildTokensModal.tsx` | Import and render with rawCollectionTokens | ✓ WIRED | Line 8: `import { BuildTokensModal } from '@/components/BuildTokensModal'`; lines 388–396: `{rawCollectionTokens && <BuildTokensModal ... />}` |
| `src/app/generate/page.tsx` | `src/components/BuildTokensModal.tsx` | Import and render with buildTokensData | ✓ WIRED | Line 8: `import { BuildTokensModal } from '@/components/BuildTokensModal'`; lines 84–92: `{buildTokensData && <BuildTokensModal ... />}` |
| `src/components/TokenGeneratorFormNew.tsx` | `src/app/generate/page.tsx` | `onTokensChange` with three arguments | ✓ WIRED | Props interface at line 36 accepts three-arg callback; `generate/page.tsx` line 81: `<TokenGeneratorFormNew githubConfig={githubConfig} onTokensChange={handleTokensChange} />` |

---

### Requirements Coverage

The EXPORT-01 through EXPORT-07 requirement IDs are defined in ROADMAP.md Phase 5 and claimed across both plan frontmatter sections. They are **not present in REQUIREMENTS.md's traceability table** — this is a documentation gap only; the code implementing all EXPORT requirements is fully present and verified.

| Requirement | Source Plan | Description (derived from ROADMAP success criteria) | Status | Evidence |
|-------------|-------------|------------------------------------------------------|--------|----------|
| EXPORT-01 | 05-01-PLAN.md | POST /api/build-tokens endpoint exists and accepts token JSON | ✓ SATISFIED | `src/app/api/build-tokens/route.ts` — fully implemented POST handler |
| EXPORT-02 | 05-01-PLAN.md | Server-side build pipeline produces CSS, SCSS, LESS, JS, TS, JSON outputs | ✓ SATISFIED | `style-dictionary.service.ts` — all 6 formats configured and built via SD v5 `formatPlatform()` |
| EXPORT-03 | 05-01-PLAN.md | Multi-brand: globals merged into each brand, one output per brand per format | ✓ SATISFIED | `mergeGlobalsIntoBrands()` + `detectBrands()` — correctly handles file-path keyed structures |
| EXPORT-04 | 05-01-PLAN.md | BuildTokensModal renders format tabs and brand sub-tabs | ✓ SATISFIED | Modal has 6 format tab buttons + conditional brand sub-tabs for multi-brand output |
| EXPORT-05 | 05-01-PLAN.md | Copy-to-clipboard per tab + Download All ZIP | ✓ SATISFIED | `handleCopy` + `handleDownloadAll` with JSZip — both implemented and wired |
| EXPORT-06 | 05-02-PLAN.md | Build Tokens button in both page headers with correct disabled/enabled logic | ✓ SATISFIED | Both `page.tsx` and `generate/page.tsx` have the button with correct disabled conditions |
| EXPORT-07 | 05-02-PLAN.md | Both pages share same BuildTokensModal; ANGULAR_PARITY.md updated | ✓ SATISFIED | Single `BuildTokensModal` component imported by both pages; ANGULAR_PARITY.md Phase 5 section present |

**Note — REQUIREMENTS.md orphaned IDs:** EXPORT-01 through EXPORT-07 do not appear in the REQUIREMENTS.md traceability table. The table ends at Phase 4 / PARITY-01. This is a documentation maintenance gap — the requirements exist in ROADMAP.md and are fully implemented — but REQUIREMENTS.md should be updated to reflect Phase 5.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/BuildTokensModal.tsx` | 139 | `return null` | ℹ️ Info | Correct guard — `if (!isOpen) return null` is intentional early return, not a stub |
| `src/services/style-dictionary.service.ts` | 232 | Error comment in catch | ℹ️ Info | `/* Build error for ${fmt}: ... */` written to format output on SD failure — intentional graceful degradation |
| `src/app/api/build-tokens/route.ts` | 25 | `console.error` | ℹ️ Info | Server-side error logging — appropriate for API route |

No blocker or warning anti-patterns detected. All info-level items are intentional design choices.

---

### Human Verification Required

#### 1. Full Build Tokens flow — View Tokens page

**Test:** Start the dev server (`yarn dev`). Navigate to http://localhost:3000. Select a MongoDB collection from the dropdown. Click "Build Tokens" (purple button in header).
**Expected:**
- Modal opens with loading spinner + "Building..." text briefly
- After build, CSS tab active by default with `--token-*` CSS custom properties visible
- Switching SCSS/LESS/JS/TS/JSON tabs shows different format content
- If collection has multiple brands: sub-tabs appear within each format tab; no separate "globals" sub-tab
- Copy button copies content to clipboard (paste and verify)
- Download All produces a `.zip` file named `{collection-name}-tokens.zip`; ZIP contents are flat files (`tokens-brand1.css`, etc. — no `tokens-globals.css` when brand files exist)
- Close button (x) and Escape key both close the modal

**Why human:** Visual output quality, real style-dictionary build correctness, clipboard interaction, and ZIP file inspection require a live browser session.

#### 2. Generator page — ZIP filename uses real collection name

**Test:** Navigate to http://localhost:3000/generate. Verify Build Tokens button is disabled initially. Load a named MongoDB collection (e.g. "my-design-system"). Verify button becomes active. Click "Build Tokens". Click "Download All".
**Expected:** ZIP filename is `my-design-system-tokens.zip` (actual collection name), not `generated-tokens-tokens.zip`.

**Why human:** The three-argument `onTokensChange` callback flow with a real loaded collection and the resulting ZIP filename can only be confirmed end-to-end in a live session.

---

### Gaps Summary

No gaps found. All automated checks pass:

- All 4 Phase 5 created/modified artifacts are substantive (non-stub) and wired
- All 3 key links between components are confirmed via grep
- All 6 EXPORT requirements have supporting implementation evidence
- No blocker anti-patterns detected
- TypeScript errors present are pre-existing in `token.service.ts` and `ui.utils.ts` (acknowledged in 05-02-SUMMARY.md) and in the unrelated `token-manager-angular/` directory — none are in Phase 5 files

The 2 human verification items are testing real-time behavior (API build correctness, clipboard, ZIP file contents) that cannot be confirmed programmatically. They are not expected failures — the code is correctly wired.

**Minor documentation gap:** REQUIREMENTS.md traceability table does not include EXPORT-01 through EXPORT-07. The requirements are defined and implemented — only the tracking table is incomplete.

---

_Verified: 2026-02-27_
_Verifier: Claude (gsd-verifier)_
