---
phase: 02-test-atui-component-library-confirm-button-can-be-imported-and-used
plan: 01
subsystem: ui
tags: [stencil, web-components, next-js, atui, custom-elements]

# Dependency graph
requires: []
provides:
  - ATUI Stencil integration pattern for Next.js 13.5.6 App Router
  - /dev-test sandbox page confirming at-button renders with ATUI styles
  - Reusable AtuiDevTest component as Phase 1 reference
affects:
  - 01-shadcn-ui-components (Phase 1 will use this integration pattern for ATUI components)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "'use client' wrapper with useEffect dynamic import for Stencil defineCustomElements"
    - "next/dynamic with ssr:false to prevent Stencil hydration issues in App Router"
    - "Relative path CSS import to bypass package exports field restrictions"

key-files:
  created:
    - src/components/AtuiDevTest.tsx
    - src/app/dev-test/page.tsx
  modified: []

key-decisions:
  - "Use next/dynamic with ssr:false for Stencil components — avoids hydration mismatch as Stencil references window during initialization"
  - "Import ATUI CSS via relative path (../../node_modules/...) — package exports field does not expose CSS subpath, direct package import fails"
  - "defineCustomElements called inside useEffect — ensures window is available (client-only) before custom element registration"
  - "Sandbox page intentionally kept in codebase as Phase 1 reference for the confirmed integration pattern"

patterns-established:
  - "ATUI Stencil pattern: 'use client' component + useEffect dynamic import of defineCustomElements + next/dynamic ssr:false at route level"
  - "CSS from restricted node_modules packages: use relative path import instead of package subpath"

requirements-completed:
  - ATUI-STENCIL-01

# Metrics
duration: ~30min
completed: 2026-03-01
---

# Phase 02 Plan 01: Test ATUI Component Library Summary

**ATUI Stencil Button confirmed working in Next.js 13.5.6 App Router via defineCustomElements-in-useEffect pattern and next/dynamic ssr:false — integration pattern established for Phase 1.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-01
- **Completed:** 2026-03-01
- **Tasks:** 2 (1 auto, 1 checkpoint:human-verify)
- **Files modified:** 2 created, 0 modified

## Accomplishments

- Created `/dev-test` sandbox page at `src/app/dev-test/page.tsx` using `next/dynamic` with `ssr: false`
- Created `src/components/AtuiDevTest.tsx` as a `'use client'` component that registers ATUI custom elements via `defineCustomElements` in `useEffect`
- Human-verified: `<at-button>` renders with shadow root attached, ATUI styles applied, no console errors
- Main app at `/` is unaffected — all changes are purely additive
- Integration pattern fully documented for Phase 1 reference

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AtuiDevTest client component and dev-test route** - `d44276e` (feat)
2. **[Deviation] Fix: use relative path for ATUI CSS import** - `b2a002d` (fix)
3. **[Deviation] Fix: use next/dynamic ssr:false for AtuiDevTest** - `fa01c1a` (fix)
4. **Task 2: Human verify ATUI Button renders with correct styles** - approved (checkpoint)

## Files Created/Modified

- `src/components/AtuiDevTest.tsx` — 'use client' component; imports ATUI CSS via relative path, registers custom elements in useEffect, declares JSX namespace for `at-button`, renders two `<at-button>` instances
- `src/app/dev-test/page.tsx` — Minimal App Router page; uses `next/dynamic` with `ssr: false` to load AtuiDevTest without Stencil SSR issues

## Confirmed Integration Pattern

The following pattern is confirmed working and must be used when integrating ATUI Stencil components in Phase 1:

**1. Route page (`src/app/[route]/page.tsx`):**
```typescript
import dynamic from 'next/dynamic';

const AtuiDevTest = dynamic(() => import('@/components/AtuiDevTest'), { ssr: false });

export default function Page() {
  return <AtuiDevTest />;
}
```
Why `ssr: false`: Stencil references `window` during initialization. App Router server renders by default; wrapping with `next/dynamic` + `ssr: false` ensures the component only runs on the client.

**2. Client component (`src/components/AtuiDevTest.tsx`):**
```typescript
'use client';

import React, { useEffect } from 'react';
// CSS via relative path — package exports field blocks direct subpath import
import '../../node_modules/@alliedtelesis-labs-nz/atui-components-stencil/dist/atui-components-stencil/atui-components-stencil.css';

// TypeScript JSX namespace for at-button
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'at-button': React.HTMLAttributes<HTMLElement> & { variant?: string; disabled?: boolean; size?: string };
    }
  }
}

export default function AtuiDevTest() {
  useEffect(() => {
    import('@alliedtelesis-labs-nz/atui-components-stencil/loader').then(({ defineCustomElements }) => {
      defineCustomElements(window);
    });
  }, []);

  return <at-button variant="primary">Button</at-button>;
}
```

## Decisions Made

- **next/dynamic with ssr:false:** Stencil calls `window` at module load time; App Router SSR fails without this wrapper. Confirmed this is the correct approach for all ATUI component integrations.
- **Relative path CSS import:** The package's `exports` field does not expose the CSS subpath. Direct import (`@alliedtelesis-labs-nz/.../atui-components-stencil.css`) throws a module resolution error. Relative path (`../../node_modules/...`) bypasses the exports field and loads correctly.
- **defineCustomElements in useEffect:** Ensures registration runs client-side only, after `window` is available. Dynamic import inside useEffect avoids the module being evaluated during SSR.
- **Sandbox page kept in codebase:** The `/dev-test` page is intentionally retained as a reference for Phase 1 ATUI integration work.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CSS import via package subpath failed — switched to relative path**
- **Found during:** Task 1 (Create AtuiDevTest client component)
- **Issue:** The PLAN specified `import '@alliedtelesis-labs-nz/atui-components-stencil/dist/atui-components-stencil/atui-components-stencil.css'` but the package's `exports` field does not expose this subpath, causing a module resolution error at dev-server startup
- **Fix:** Changed to a relative path import: `import '../../node_modules/@alliedtelesis-labs-nz/atui-components-stencil/dist/atui-components-stencil/atui-components-stencil.css'`
- **Files modified:** `src/components/AtuiDevTest.tsx`
- **Verification:** Dev server started without CSS import errors; styles visible in browser
- **Committed in:** `b2a002d`

**2. [Rule 1 - Bug] Stencil hydration error — added next/dynamic ssr:false at route level**
- **Found during:** Task 1 verification / Task 2 human verification
- **Issue:** Stencil's `defineCustomElements` (and underlying loader) references `window` at module load time; Next.js App Router SSR evaluates this code on the server where `window` is undefined, causing a hydration mismatch or runtime error
- **Fix:** Changed `src/app/dev-test/page.tsx` from a direct import to `next/dynamic(() => import('@/components/AtuiDevTest'), { ssr: false })` so the component only loads on the client
- **Files modified:** `src/app/dev-test/page.tsx`
- **Verification:** Human verified — shadow root attached, no console errors
- **Committed in:** `fa01c1a`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were necessary for the integration to work. The resulting pattern is cleaner than the plan's original approach and resolves known Stencil/SSR incompatibilities. No scope creep.

## Issues Encountered

1. **Package CSS subpath not exported:** `@alliedtelesis-labs-nz/atui-components-stencil` has a restrictive `exports` field that does not expose the CSS file. Resolved by using a relative `node_modules` import path. This workaround should be noted for Phase 1 — if the package is updated, this path may need adjustment.

2. **Stencil + Next.js SSR incompatibility:** Stencil web component loaders reference `window` during module initialization. App Router's default SSR fails. Resolved with `next/dynamic({ ssr: false })`. This is a known Stencil/Next.js integration requirement and applies to all ATUI component usage.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Integration pattern confirmed and documented — Phase 1 (shadcn UI + ATUI migration) can proceed
- The `/dev-test` sandbox page remains available at `http://localhost:3000/dev-test` for reference during Phase 1 development
- Phase 1 must apply: `next/dynamic ssr:false`, `useEffect` dynamic import of `defineCustomElements`, and relative path CSS import for any ATUI Stencil components
- No blockers

## Self-Check: PASSED

- FOUND: `src/components/AtuiDevTest.tsx`
- FOUND: `src/app/dev-test/page.tsx`
- FOUND: `.planning/phases/02-.../02-01-SUMMARY.md`
- FOUND: commit `d44276e` (feat: ATUI dev-test sandbox)
- FOUND: commit `fa01c1a` (fix: ssr:false)

---
*Phase: 02-test-atui-component-library-confirm-button-can-be-imported-and-used*
*Completed: 2026-03-01*
