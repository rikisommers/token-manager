# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Token collections are always available and editable — stored in MongoDB, loadable into the generator form, and visible on the view page, with Figma import/export fully integrated.
**Current focus:** Phase 3 in progress — app layout UX (sidebar + scoped config/status pages)

## Current Position

Phase: 03-update-app-layout-to-improve-ux
Plan: 3/4 complete
Status: IN PROGRESS — 03-03 Configuration + Settings pages complete
Last activity: 2026-03-11 — 03-03 Configuration/Settings pages created; BuildTokensPanel inline component added

Progress: [███████░░░] 75% — Phase 3 plan 3/4 done

## Accumulated Context

### Roadmap Evolution

- Phase 1 (v1.1) added: shadcn UI components (buttons, tabs, modals) + color picker inputs for all color token fields
- Phase 2 (v1.1) added: Test ATUI component library — confirm Button can be imported and used
- Phase 3 (v1.1) added: Update app layout to improve UX — sidebar, scoped config/status pages

### Decisions

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

### Pending Todos

None.

### Blockers/Concerns

Pre-existing TypeScript error in src/services/token.service.ts line 131 (string index on `{}`). Not caused by shadcn work. Deferred.

## Session Continuity

Last session: 2026-03-11
Stopped at: Phase 3, Plan 03 complete. Configuration and Settings pages created — BuildTokensPanel inline, FigmaConfig and GitHubConfig always-expanded.
Resume file: None
