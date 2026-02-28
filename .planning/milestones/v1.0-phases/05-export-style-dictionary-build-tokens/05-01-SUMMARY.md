---
phase: 05-export-style-dictionary-build-tokens
plan: "01"
subsystem: api
tags: [style-dictionary, jszip, tokens, build-pipeline, modal, react]

# Dependency graph
requires:
  - phase: 04-collection-management
    provides: token collections stored in MongoDB, available via GET /api/collections/[id]
provides:
  - POST /api/build-tokens endpoint — accepts raw token JSON, returns CSS/SCSS/LESS/JS/TS/JSON outputs
  - src/services/style-dictionary.service.ts — server-side style-dictionary v5 build pipeline with globals merging
  - src/components/BuildTokensModal.tsx — shared modal component with format tabs, brand sub-tabs, copy + ZIP download
  - BuildTokensRequest, BuildTokensResult, FormatOutput, BrandFormatOutput types in token.types.ts
affects: [05-02-view-integration-wire-up, generator-page-wire-up]

# Tech tracking
tech-stack:
  added: [style-dictionary@5.3.2, jszip@3.10.1]
  patterns:
    - SD v5 programmatic API — formatPlatform() for in-memory output (no disk writes)
    - globals brand merging — deep-merge globals tokens into each non-globals brand for self-contained output files
    - useEffect trigger pattern — build fires on isOpen=true, state resets on isOpen=false

key-files:
  created:
    - src/services/style-dictionary.service.ts
    - src/app/api/build-tokens/route.ts
    - src/components/BuildTokensModal.tsx
  modified:
    - src/types/token.types.ts
    - package.json

key-decisions:
  - "Use formatPlatform() (SD v5) instead of exportPlatform() — exportPlatform returns transformed token dict, not formatted file strings"
  - "Call sd.init() before formatPlatform() — SD v5 requires explicit initialization before formatting"
  - "normalizeTokens() converts value/type keys to $value/$type before passing to SD — W3C DTCG spec compliance"
  - "globals brand is NOT emitted as separate output when non-globals brands exist — only used as merge source"

patterns-established:
  - "SD v5 in-memory build: new StyleDictionary(config) → sd.init() → sd.formatPlatform(platformName) returns [{output, destination}]"
  - "Token normalization: value→$value, type→$type before SD processing"

requirements-completed: [EXPORT-01, EXPORT-02, EXPORT-03, EXPORT-04, EXPORT-05]

# Metrics
duration: 5min
completed: 2026-02-26
---

# Phase 5 Plan 01: Export Style Dictionary Build Tokens Summary

**style-dictionary v5 server-side build pipeline producing CSS/SCSS/LESS/JS/TS/JSON outputs from raw token JSON, with shared BuildTokensModal component supporting format tabs, brand sub-tabs, clipboard copy, and ZIP download via jszip**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-26T10:31:06Z
- **Completed:** 2026-02-26T10:36:55Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- POST /api/build-tokens endpoint validates request and delegates to style-dictionary build service
- Build service detects single-brand vs multi-brand token structures, merges globals into each non-globals brand, builds all 6 formats in-memory using SD v5 `formatPlatform()`
- BuildTokensModal component: triggers build on open, format tabs, brand sub-tabs, per-tab copy button, Download All ZIP button, loading spinner, error+retry state

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies + create build service + API route** - `3e8b448` (feat)
2. **Task 2: Create BuildTokensModal shared component** - `52d389c` (feat)

## Files Created/Modified

- `src/types/token.types.ts` - Added BrandFormatOutput, FormatOutput, BuildTokensResult, BuildTokensRequest interfaces
- `src/services/style-dictionary.service.ts` - Server-side SD v5 build pipeline with detectBrands(), mergeGlobalsIntoBrands(), buildBrandTokens(), buildTokens()
- `src/app/api/build-tokens/route.ts` - POST endpoint with request validation, delegates to buildTokens()
- `src/components/BuildTokensModal.tsx` - Shared modal: format/brand tabs, copy, ZIP download, loading/error states
- `package.json` - Added style-dictionary@5.3.2 and jszip@3.10.1 to dependencies

## Decisions Made

- **Use `formatPlatform()` instead of `exportPlatform()`:** Plan specified `exportPlatform()` but testing revealed it returns the transformed token dictionary (not formatted file strings). `formatPlatform()` returns `[{output: string, destination: string}]` which is the correct in-memory API.
- **Call `sd.init()` before `formatPlatform()`:** SD v5 requires explicit initialization step — omitting it silently returns empty results.
- **Token normalization:** Our stored tokens use `value`/`type` keys; SD v5 requires `$value`/`$type` (W3C DTCG). The `normalizeTokens()` function converts before passing to SD.
- **globals brand not emitted as output:** When non-globals brands exist, globals is only a merge source — it does not produce separate `tokens-globals.*` files, per the user decision in the context doc.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used `formatPlatform()` instead of `exportPlatform()` for in-memory output**
- **Found during:** Task 1 (style-dictionary.service.ts implementation)
- **Issue:** Plan's code sample used `sd.exportPlatform(fmt)` and accessed `.output` property on results. Testing revealed `exportPlatform()` returns the transformed token dict (not formatted strings). The `output` property is not present.
- **Fix:** Replaced with `await sd.init()` followed by `await sd.formatPlatform(fmt)` which returns `[{output: string, destination: string}]`
- **Files modified:** src/services/style-dictionary.service.ts
- **Verification:** Tested all 6 formats programmatically — each produced correct formatted content strings
- **Committed in:** 3e8b448 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Essential correction — using exportPlatform() would have produced empty output for all formats. Fix aligned with plan intent (in-memory output, no disk writes).

## Issues Encountered

None beyond the SD v5 API deviation documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- POST /api/build-tokens is ready to receive token JSON and return all 6 format outputs
- BuildTokensModal is portable and can be imported by both the View Tokens page and Generator page
- Phase 05-02 can wire up the "Build Tokens" button on both pages by importing BuildTokensModal and passing the current collection's token JSON

---
*Phase: 05-export-style-dictionary-build-tokens*
*Completed: 2026-02-26*
