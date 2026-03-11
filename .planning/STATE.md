# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Token collections are always available and editable — stored in MongoDB, loadable into the generator form, and visible on the view page, with Figma import/export fully integrated.
**Current focus:** Phase 4 in progress — Collection Management (grid, collection-scoped pages, config persisted to DB)

## Current Position

Phase: 04-collection-management
Plan: 5/5 complete
Status: COMPLETE — 04-05 Per-collection settings page with auto-saving config fields
Last activity: 2026-03-12 — 04-05 CollectionSettingsPage, /collections/[id]/settings, auto-save debounce, localStorage fallback

Progress: [██████████] 100% — Phase 4 plan 5/5 done

## Accumulated Context

### Roadmap Evolution

- Phase 1 (v1.1) added: shadcn UI components (buttons, tabs, modals) + color picker inputs for all color token fields
- Phase 2 (v1.1) added: Test ATUI component library — confirm Button can be imported and used
- Phase 3 (v1.1) added: Update app layout to improve UX — sidebar, scoped config/status pages
- Phase 4 (v1.1) added: Collection Management — grid of collections, collection-scoped pages with sidebar, tokens/config/settings per collection, config persisted to DB

### Decisions

**04-01 (Collection schema + API extension):**
- CollectionCardData omits raw integration tokens — only boolean figmaConfigured/githubConfigured flags in list response (security)
- tokenCount computed as Object.keys(tokens ?? {}).length at request time — no counter field to sync
- Timestamp suffix for duplicate name collision — simple, unique, avoids sequential counter complexity
- Lean query casts new fields with (doc.field as T | undefined) ?? default — safe for pre-existing docs missing fields

**03-03 (Configuration + Settings pages):**
- BuildTokensPanel is a standalone component — does not import BuildTokensModal; logic duplicated to keep files independent
- alwaysOpen prop in FigmaConfig and GitHubConfig: when true, initializes isOpen=true and renders form inline (no modal overlay)
- GitHubConfig uses shared formContent JSX variable to avoid markup duplication between inline and modal render paths
- Configuration page reads atui-selected-collection-id from localStorage — same key used by AppSidebar

**03-02 (Tokens page refactor):**
- View Tokens section preserved as hidden div — code intact, not navigable via sidebar
- githubConfig and figmaConfig kept as local state for future Settings page integration
- HomeContent/Home split collapsed into single default export — Suspense removed (no useSearchParams)
- handleSaveAs uses generateTabTokens ?? rawCollectionTokens ?? tokenData — no activeTab discrimination needed

**03-01 (sidebar + layout shell):**
- AppSidebar is fully self-contained: fetches /api/collections via useEffect, persists selectedId to localStorage (key: atui-selected-collection-id)
- layout.tsx remains a server component; importing a client component (AppSidebar) into a server layout is valid in Next.js App Router
- Sidebar width set via w-[200px] flex-shrink-0 wrapper div in layout; AppSidebar fills h-full
- CollectionSelectorSidebar inline sub-component uses Tailwind descendant selectors to apply dark styling over CollectionSelector without forking it

All v1.0 decisions logged in PROJECT.md Key Decisions table.

**02-01 (ATUI Stencil integration):**
- Use `next/dynamic` with `ssr: false` for Stencil components — avoids hydration mismatch (window unavailable in SSR)
- Import ATUI CSS via relative path to node_modules — package exports field blocks direct subpath import
- Call `defineCustomElements(window)` inside `useEffect` — ensures client-only registration

**01-01 (shadcn/ui installation):**
- Manually created components.json and component files — shadcn CLI requires interactive input unavailable in Claude Code
- Used canonical shadcn/ui source directly — no hand-rolled implementations
- CSS variable defaults are neutral slate — do not override existing app styles
- Client components (Select, Tabs, Dialog) use 'use client' directive — required for Radix UI event handlers
- CSS variables follow hsl(H S% L%) format without hsl() wrapper — tailwind.config.js adds hsl(var(...))

**01-02 (page.tsx + TokenTable migration):**
- shadcn Tabs used as visual-only tab UI; content switching driven by activeTab React state (not TabsContent) — preserves form state across tab switches
- Color tokens retain native <input type="color"> — color picker only, no text input alongside

**01-03 (dialog migration):**
- CollectionActions uses 3 separate Dialog components (delete/rename/duplicate) controlled by separate state vars
- shadcn Select replaces native <select> in Figma dialogs: onValueChange replaces onChange event handler
- ImportFromFigmaDialog handleSelectChange removed; logic inlined into Select onValueChange

**01-04 (form components migration):**
- SourceContextBar is display-only (no interactive elements) — no migration needed
- shadcn Select onValueChange pattern: (v) => setState(v) throughout all form components
- [Phase 03-04]: ui.utils.ts TS2339 ( on object) auto-fixed by casting to Record<string, unknown> — pre-existing error not caused by Phase 3

**04-04 (Collection-scoped layout and pages):**
- LayoutShell updated to pathname.startsWith('/collections') — suppresses root sidebar for all collection-scoped routes; their own CollectionLayoutClient provides sidebar
- CollectionLayoutClient is a 'use client' component fetching collection name — keeps layout.tsx as a clean server component
- CollectionSidebar has two distinct back links to /collections: app name at top and explicit Collections chevron link
- Collection-scoped Tokens and Config pages use params.id directly — no localStorage dependency, clean URL-driven scoping

**04-05 (Per-collection settings page):**
- localStorage keys used are 'figma-config' (JSON: {token, fileUrl, fileKey}) and 'github-config' (JSON: {repository, token, branch}) — these are the actual keys from FigmaConfig/GitHubConfig, not the atui-* keys mentioned in plan spec
- figmaFileId mapped from figmaConfig.fileKey (extracted file key, not full URL)
- didMountRef prevents auto-save from firing during initial data load; separate useEffect sets it true after loading=false
- Clear buttons bypass debounce and call saveToDb immediately with empty strings → null

**04-02 (Layout restructure):**
- LayoutShell is a 'use client' component in src/components/ — root layout.tsx stays a clean server component (required for Next.js metadata export)
- CollectionProvider moved into LayoutShell so it wraps both the grid path and the sidebar shell path
- pathname === '/collections' strict equality — collection-scoped routes (/collections/[id]) still get sidebar via their own layout in plan 04-04

**04-03 (Collections grid page):**
- CollectionCard uses local isMenuOpen state and document click listener for kebab dropdown — no Radix DropdownMenu needed for three-item list
- handleRename uses optimistic update in local state, reverts to server fetch on error — avoids stale UI
- Empty state shown separately from grid when collections.length === 0 and !loading — grid only renders when data is available
- New Collection card always rendered at grid position 0 — consistent spatial anchor regardless of collection count

### Pending Todos

None.

### Blockers/Concerns

Pre-existing TypeScript error in src/services/token.service.ts line 131 (string index on `{}`). Not caused by shadcn work. Deferred.

## Session Continuity

Last session: 2026-03-12
Stopped at: Phase 4, Plan 05 complete. Per-collection settings page — CollectionSettingsPage at /collections/[id]/settings, auto-save debounce, localStorage fallback, save status badge.
Resume file: None
