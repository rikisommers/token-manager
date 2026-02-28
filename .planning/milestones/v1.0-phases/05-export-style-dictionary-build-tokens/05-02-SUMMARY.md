---
phase: 05-export-style-dictionary-build-tokens
plan: "02"
subsystem: ui
tags: [react, modal, tokens, build-pipeline, style-dictionary, zip]

# Dependency graph
requires:
  - phase: 05-01
    provides: BuildTokensModal component and POST /api/build-tokens endpoint
provides:
  - Build Tokens button in View Tokens page header (disabled on local, enabled on MongoDB collection)
  - Build Tokens button in Generator page header (disabled when no tokens loaded, enabled after collection load)
  - TokenGeneratorFormNew onTokensChange three-argument signature exposing collectionName
  - ANGULAR_PARITY.md Phase 5 section documenting POST /api/build-tokens and component patterns
  - SD v5 log config suppressing broken reference errors in production builds
affects: [page.tsx, generate/page.tsx, TokenGeneratorFormNew.tsx, style-dictionary.service.ts, ANGULAR_PARITY.md]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Raw token tracking alongside flattened display tokens — rawCollectionTokens/rawCollectionName state in page.tsx"
    - "Three-argument onTokensChange callback — tokens, namespace, collectionName flows up to parent for ZIP filename"
    - "Conditional modal render — modal only mounted when tokens are non-null, prevents null prop errors"
    - "SD v5 log config: verbosity silent + brokenReferences console — non-throwing builds with broken refs"
    - "Recursive token count via countTokensRecursive() — flat count misses tokens in nested child TokenGroups"

key-files:
  created: []
  modified:
    - src/app/page.tsx
    - src/app/generate/page.tsx
    - src/components/TokenGeneratorFormNew.tsx
    - src/services/style-dictionary.service.ts
    - .planning/ANGULAR_PARITY.md

key-decisions:
  - "namespace hardcoded to 'token' on View Tokens page — convention --token-{category}-{token} per plan spec"
  - "loadedCollection.name used directly for collectionName (no separate state) — avoids duplication with existing state"
  - "Recursive token count (countTokensRecursive) in useEffect — nested child groups missed by flat count"
  - "SD v5 brokenReferences: 'console' (not 'warn') — only throw/console available in SD v5 type system"
  - "Fall back to 'generated-tokens' when no collection name — handles unsaved/new token sets gracefully"

requirements-completed: [EXPORT-06, EXPORT-07]

# Metrics
duration: 16min
completed: 2026-02-26
---

# Phase 5 Plan 02: Wire Build Tokens into Both Pages Summary

**Build Tokens button wired into both page headers with BuildTokensModal (shared component), SD reference-error suppression, and recursive nested-group token detection enabling the button after collection load**

## Performance

- **Duration:** ~16 min total (3 min for Tasks 1-2, then continuation after checkpoint for bug fixes)
- **Started:** 2026-02-26T10:39:39Z
- **Completed:** 2026-02-26T10:53:25Z
- **Tasks completed:** 3 of 3 (Task 3 human-verify + 2 bugs fixed)
- **Files modified:** 5

## Accomplishments

- View Tokens page (page.tsx): Build Tokens button in header disabled on local files, enabled when MongoDB collection selected; BuildTokensModal renders with actual collection name
- Generator page (generate/page.tsx): Build Tokens button in header disabled when no tokens loaded, enables after loading collection from MongoDB; header layout corrected to place button on right side
- TokenGeneratorFormNew: useEffect now counts tokens recursively across nested child groups — button no longer stays disabled after loading collections with hierarchical token structure
- style-dictionary.service.ts: SD v5 log config added — broken token references no longer abort the build; all 6 formats produce output even when some tokens reference undefined paths
- ANGULAR_PARITY.md: Phase 5 section added documenting POST /api/build-tokens endpoint, BuildTokensModal component pattern, and three-argument onTokensChange

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire Build Tokens button into View Tokens page** - `7944a50` (feat)
2. **Task 2: Wire Build Tokens button into Generator page + ANGULAR_PARITY.md** - `2fa5486` (feat)
3. **Task 3: Fix SD reference errors + generator button state after human verify** - `fb1a82e` (fix)

## Files Created/Modified

- `src/app/page.tsx` - Added BuildTokensModal import, rawCollectionTokens/rawCollectionName state, isBuildEnabled derived value, Build Tokens button in header, BuildTokensModal at bottom of JSX
- `src/app/generate/page.tsx` - Added BuildTokensModal import, build state, handleTokensChange handler, Build Tokens button on right side of header (fixed flex layout), BuildTokensModal at bottom of JSX
- `src/components/TokenGeneratorFormNew.tsx` - Extended onTokensChange useEffect with recursive token count via countTokensRecursive(); three-argument callback signature (tokens, namespace, collectionName)
- `src/services/style-dictionary.service.ts` - Added SD v5 log config: verbosity silent, warnings disabled, brokenReferences console — prevents token reference validation from throwing
- `.planning/ANGULAR_PARITY.md` - Added Phase 5 section with POST /api/build-tokens contract, BuildTokensModal component pattern, and onTokensChange signature

## Decisions Made

- **Recursive token count:** `countTokensRecursive()` descends into `g.children` at every level. `createTokenGroupsFromTokenSet()` in token.service.ts produces nested TokenGroup trees where loaded tokens live in child groups — flat count at root level returns 0.
- **SD v5 `brokenReferences: 'console'`:** The value `'warn'` does not exist in SD v5 type definitions (`logBrokenReferenceLevels`). Only `'throw' | 'console'` are valid. `'console'` routes the broken-ref diagnostic to console output instead of throwing, allowing the build to succeed.
- **Header layout fix:** The `generate/page.tsx` outer flex container had only one child, so `justify-between` was ineffective. Flattened to two direct siblings: left group (h1+nav) and right group (Build Tokens + GitHubConfig).
- **namespace hardcoded to 'token' on View Tokens page:** Per plan spec, CSS variables follow `--token-{category}-{token}` naming convention.
- **Fall back to 'generated-tokens' for unnamed collections:** ZIP filename `generated-tokens-tokens.zip` for new/unsaved token sets.

## Deviations from Plan

### Auto-fixed Issues (discovered at human-verify checkpoint)

**1. [Rule 1 - Bug] Fixed SD reference errors aborting build on all 6 formats**
- **Found during:** Task 3 (human verification)
- **Issue:** Collections with token values using `{ref}` syntax caused SD v5 to throw "Reference Errors: Some token references could not be found" — even with `outputReferences: false` because SD validates references internally during `sd.init()`. All 6 format output blocks showed `/* Build error for {fmt}: Reference Errors... */` instead of CSS/SCSS content.
- **Fix:** Added `log: { verbosity: 'silent', warnings: 'disabled', errors: { brokenReferences: 'console' } }` to StyleDictionary constructor in `buildBrandTokens()`.
- **Files modified:** `src/services/style-dictionary.service.ts`
- **Verification:** Tested with SD v5 ESM API — broken references produce the raw `{ref}` as the CSS variable value; valid tokens produce correct CSS output; build does not throw.
- **Committed in:** fb1a82e

**2. [Rule 1 - Bug] Fixed Generator page Build Tokens button staying disabled after loading collection**
- **Found during:** Task 3 (human verification)
- **Issue:** `allTokens` was computed as `tokenGroups.reduce((sum, g) => sum + g.tokens.length, 0)` — flat count over root-level groups only. `processImportedTokens()` in token.service.ts creates nested TokenGroup trees where loaded tokens live in child groups (e.g. `colors` root has `tokens: []`, child group `colors/primary` has the actual token). Flat count returned 0, causing `onTokensChange(null, ...)` to be called, which left `buildTokensData = null` and button disabled.
- **Fix:** Replaced flat count with `countTokensRecursive()` inline helper that descends into `g.children`.
- **Files modified:** `src/components/TokenGeneratorFormNew.tsx`
- **Verification:** After fix, loading a named MongoDB collection enables the button. Clearing the form disables it correctly.
- **Committed in:** fb1a82e

**3. [Rule 1 - Bug] Fixed generate/page.tsx header layout — Build Tokens button not anchored to right side**
- **Found during:** Code review of Task 3 fixes
- **Issue:** The outer `flex items-center justify-between h-16` container had a single child `div`, making `justify-between` inert. The Build Tokens button appeared adjacent to the nav links rather than on the right.
- **Fix:** Flattened the double-nested structure. Outer flex now has two direct children: left group (`div.flex.items-center.gap-8` — h1+nav) and right group (`div.flex.items-center.gap-2` — Build Tokens + GitHubConfig).
- **Files modified:** `src/app/generate/page.tsx`
- **Verification:** The outer `justify-between` now correctly anchors the right group to the right edge.
- **Committed in:** fb1a82e

---

**Total deviations:** 3 auto-fixed (3x Rule 1 - Bug), all discovered at human-verify checkpoint
**Impact on plan:** All three fixes required for the feature to work as specified. The SD reference-error bug and nested-group token count bug were not anticipated in the plan. The header layout bug was introduced during Task 2 implementation.

## Issues Encountered

- SD v5 `errors.brokenReferences` type: user-suggested value `'warn'` does not exist — only `'throw' | 'console'` valid. Used `'console'` which achieves the same non-throwing behavior.
- Pre-existing TypeScript errors in `token.service.ts` and `ui.utils.ts` are out of scope (existed before Phase 05-02). Not fixed.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 5 (Export Style Dictionary Build Tokens) complete — Build Tokens works end-to-end on both pages
- Phase 6 (Collection UX Improvements) can proceed immediately
- ANGULAR_PARITY.md documents the full Phase 5 API surface for future Angular port

## Self-Check: PASSED

- FOUND: 05-02-SUMMARY.md
- FOUND: src/app/page.tsx
- FOUND: src/app/generate/page.tsx
- FOUND: src/components/TokenGeneratorFormNew.tsx
- FOUND: src/services/style-dictionary.service.ts
- FOUND: commit 7944a50 (Task 1)
- FOUND: commit 2fa5486 (Task 2)
- FOUND: commit fb1a82e (Task 3 — bug fixes)

---
*Phase: 05-export-style-dictionary-build-tokens*
*Completed: 2026-02-26*
