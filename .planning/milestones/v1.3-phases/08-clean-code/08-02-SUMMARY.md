---
phase: 08-clean-code
plan: 02
subsystem: TypeScript / API Routes / Components
tags: [typescript, type-safety, api-routes, shadcn, clean-code]
dependency_graph:
  requires: []
  provides: [zero-ts-errors]
  affects: [src/app/api/collections/route.ts, src/app/api/database/test/route.ts, src/app/collections/[id]/tokens/page.tsx, src/components/AtuiDevTest.tsx]
tech_stack:
  added: []
  patterns: [ISourceMetadata-import, mongoose-Connection-type, callback-signature-alignment, shadcn-sandbox]
key_files:
  created: []
  modified:
    - src/app/api/collections/route.ts
    - src/app/api/database/test/route.ts
    - src/app/collections/[id]/tokens/page.tsx
    - src/components/AtuiDevTest.tsx
decisions:
  - "AtuiDevTest replaced with shadcn Button sandbox (stencil loader broken, no runtime value in keeping it)"
  - "handleTokensChange uses tokens ?? {} to handle null case rather than passing null downstream"
metrics:
  duration: ~8 min
  completed: 2026-03-16
---

# Phase 8 Plan 2: Fix All TypeScript Errors Summary

**One-liner:** Resolved all 10 TypeScript errors across four files by tightening type annotations and replacing broken ATUI stencil loader with shadcn Button sandbox.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix TypeScript errors in route handlers | c329528 | src/app/api/collections/route.ts, src/app/api/database/test/route.ts |
| 2 | Fix tokens page callback signature and AtuiDevTest | 160355d | src/app/collections/[id]/tokens/page.tsx, src/components/AtuiDevTest.tsx |

## Fixes Applied

### Error 1 — collections/route.ts: sourceMetadata inline type incomplete

**File:** `src/app/api/collections/route.ts` line 33
**Error:** POST body `sourceMetadata` typed as `{ repo, branch, path } | null` was missing `type`, `figmaFileKey`, `figmaCollectionId` fields required by `ISourceMetadata`.
**Fix:** Added `ISourceMetadata` to the import from `@/types/collection.types` and replaced the inline type with `ISourceMetadata | null`. No runtime change.

### Errors 2-6 — database/test/route.ts: testConnection typed as `typeof mongoose`

**File:** `src/app/api/database/test/route.ts`
**Error:** `testConnection` declared as `typeof mongoose | null` but `mongoose.createConnection().asPromise()` returns `Connection`, not `typeof mongoose`. This caused 5 cascading errors: the assignment error plus `.host`, `.port`, `.db`, `.close()` not found on the wrong type.
**Fix:** Added `Connection` to the mongoose import and changed the variable declaration to `Connection | null`. All 5 errors resolved together.

### Error 7 — tokens/page.tsx: handleTokensChange signature mismatch

**File:** `src/app/collections/[id]/tokens/page.tsx` line ~192
**Error:** `handleTokensChange` accepted `(tokens: Record<string, unknown>)` but `TokenGeneratorFormNew.onTokensChange` prop expects `(tokens: Record<string, unknown> | null, namespace: string, collectionName: string) => void`.
**Fix:** Updated signature to `(tokens: Record<string, unknown> | null, _namespace: string, _collectionName: string)`. Used `tokens ?? {}` when setting state to handle the null case.

### Error 8 — AtuiDevTest.tsx: missing ATUI stencil loader module

**File:** `src/components/AtuiDevTest.tsx`
**Error:** `Cannot find module '@alliedtelesis-labs-nz/atui-components-stencil/loader'` — the package does not expose this subpath.
**Fix:** Rewrote the component as a shadcn/ui `Button` sandbox. Removed: CSS relative path import, JSX namespace extension for `at-button`, `useEffect` loader. Replaced `<at-button>` elements with shadcn `<Button variant="outline">` and `<Button variant="default">`.

## Verification

```
npx tsc --noEmit 2>&1 | wc -l
# Output: 0

grep -rn "@ts-ignore\|as any" src/app/api/collections/route.ts src/app/api/database/test/route.ts src/app/collections/[id]/tokens/page.tsx src/components/AtuiDevTest.tsx
# Output: (empty — no suppressors)
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- src/app/api/collections/route.ts: FOUND
- src/app/api/database/test/route.ts: FOUND
- src/app/collections/[id]/tokens/page.tsx: FOUND
- src/components/AtuiDevTest.tsx: FOUND
- Commit c329528: FOUND
- Commit 160355d: FOUND
- Zero TS errors confirmed
