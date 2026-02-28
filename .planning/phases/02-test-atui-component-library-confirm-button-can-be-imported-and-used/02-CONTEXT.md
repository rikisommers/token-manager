# Phase 2: Test ATUI Component Library - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Spike to confirm that the ATUI Stencil component library (`@alliedtelesis-labs-nz/atui-components-stencil`) can be imported and a Button component rendered correctly in the Next.js 13.5.6 App Router. Not a production UI change — establishes the import/integration pattern for Phase 1.

</domain>

<decisions>
## Implementation Decisions

### Test placement
- Create a dedicated `/dev-test` route (page) — does not touch any existing UI
- Keep this page in the codebase after confirmation as a component sandbox for Phase 1 reference

### Success criteria
- ATUI Button component imports without errors
- Component renders visually with correct ATUI styles (not unstyled)
- Page is accessible at /dev-test in the running app

### Source library
- Package: `@alliedtelesis-labs-nz/atui-components-stencil` (already in package.json)
- This is a Stencil web component library — researcher must investigate the correct integration pattern for Next.js 13 App Router (SSR considerations, dynamic import with ssr:false, custom element registration, React wrapper if needed)

### Claude's Discretion
- Exact integration pattern (dynamic import, defineCustomElements, React output target, etc.)
- Whether a 'use client' wrapper component is needed
- Styling import approach (CSS from the Stencil package)

</decisions>

<specifics>
## Specific Ideas

- Phase 2 is a throwaway spike to de-risk Phase 1 — keep it minimal
- /dev-test page becomes the sandbox to verify components during Phase 1 migration

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-test-atui-component-library*
*Context gathered: 2026-03-01*
