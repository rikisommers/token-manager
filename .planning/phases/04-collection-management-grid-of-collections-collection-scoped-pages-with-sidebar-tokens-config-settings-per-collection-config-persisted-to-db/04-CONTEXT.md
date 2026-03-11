# Phase 4: Collection Management — Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a full collection management flow: a browseable grid of all collections (no sidebar), collection-scoped navigation where each collection has its own Tokens/Config/Settings pages with a sidebar, and per-collection Figma/GitHub config persisted to MongoDB. The URL structure changes to /collections/[id]/tokens etc.

</domain>

<decisions>
## Implementation Decisions

### Collections Grid Page
- Grid is the default landing page when no collection is selected
- No sidebar on the grid page — full-width layout
- Cards show: collection name, token count, last modified date, description, tags/labels, and small Figma/GitHub configured badges
- Default sort: last modified (most recent first)
- "+ New Collection" card displayed in the grid (position 0 or end) as a special card
- Empty state: friendly illustration + "Create your first collection" CTA + helper text (not auto-open create dialog)

### Sidebar Behavior (Inside a Collection)
- Sidebar shows: collection name prominently + 3 nav items (Tokens, Config, Settings)
- Two ways back to the collections grid: app name/logo click AND explicit "Collections" link in sidebar
- The Phase 3 collection selector dropdown is removed — switching collections = go back to grid and pick one
- No sidebar on the collections grid page itself

### Collection Card Actions (from Grid)
- Kebab (three-dot) menu on hover: Rename, Delete, Duplicate
- Rename: inline edit directly on the card title
- Delete: confirmation dialog before deleting ("Delete [name]? This will remove all tokens and config.")
- Duplicate: creates a full copy including name, tokens, and config

### Collection Metadata
- Collections store: name + optional description + tags/labels
- Cards display integration status badges (small icons/checkmarks for Figma configured, GitHub configured)

### Config Persistence Per Collection
- Fields saved to DB per collection: Figma token, Figma file ID, GitHub repo, GitHub branch
- Truly per-collection — each collection has its own independent Figma and GitHub config
- Save behavior: auto-save on field change, with a clear/reset action to revert
- Existing collections without DB config: pre-populate fields from the global config already in the app (current localStorage values as defaults), not truly blank

### Tokens Page Scoping
- Tokens page is fully scoped to the current collection — generate, view, and export only affect that collection's tokens
- Collection name shown in the main content page header ("Tokens: [Collection Name]")
- Generate/export/Figma actions work the same as before, but auto-load the collection's saved config (Figma token, file ID, GitHub repo/branch)
- Token data stored in the collection's MongoDB record — one source of truth

### URL Structure and Navigation
- URL structure: `/collections/[id]/tokens`, `/collections/[id]/config`, `/collections/[id]/settings`
- When entering any collection (from the grid), always land on the Tokens page
- Unsaved changes (if any remain despite auto-save): warn with a confirmation dialog before navigating away
- Empty tokens state on Tokens page: existing page already handles this — no changes needed

### Responsive / Mobile
- Desktop is the primary target — responsive is nice-to-have, not a hard requirement
- Collections grid on mobile: single-column list (cards stack vertically)
- Sidebar on mobile (inside a collection): Claude's discretion — handle reasonably

### Claude's Discretion
- Mobile sidebar collapse pattern (drawer, hamburger, bottom nav — pick what fits)
- Card grid column count on desktop (2, 3, or 4 columns based on screen width)
- Loading skeleton design for grid and token pages
- Exact tag/label UI on cards (chips, badges, etc.)
- Animation/transition when navigating from grid into a collection

</decisions>

<specifics>
## Specific Ideas

- The collections grid replaces the current app entry point — previously the app landed on the Tokens page with a collection selector in the sidebar; now the grid IS the home page
- Phase 3 built the sidebar + scoped pages, but they're not yet tied to specific collection routes; Phase 4 wires the routing and DB persistence

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-collection-management*
*Context gathered: 2026-03-12*
