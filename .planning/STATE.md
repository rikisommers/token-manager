# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Token collections are always available and editable — stored in MongoDB, loadable into the generator form, and visible on the view page, with Figma import/export fully integrated.
**Current focus:** v1.1 — Phase 1: shadcn UI components

## Current Position

Phase: 01-update-ui-to-use-shadcn-components-for-common-elements-buttons-tabs-modals (v1.1)
Plan: 4/5 complete (Wave 3 — 01-05 human verification pending)
Status: Wave 2 complete — all src/ components migrated to shadcn Button/Input/Select/Tabs/Dialog; awaiting human visual verification
Last activity: 2026-03-09 — 01-02, 01-03, 01-04 complete

Progress: [████████░░] 80% — v1.0 shipped; v1.1 Phase 1 Wave 2 complete (4/5 plans)

## Accumulated Context

### Roadmap Evolution

- Phase 1 (v1.1) added: shadcn UI components (buttons, tabs, modals) + color picker inputs for all color token fields
- Phase 2 (v1.1) added: Test ATUI component library — confirm Button can be imported and used

### Decisions

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

### Pending Todos

None.

### Blockers/Concerns

Pre-existing TypeScript error in src/services/token.service.ts line 131 (string index on `{}`). Not caused by shadcn work. Deferred.

## Session Continuity

Last session: 2026-03-09
Stopped at: Wave 2 complete (01-02, 01-03, 01-04 done). Wave 3: 01-05 human visual verification checkpoint pending — run `yarn dev` and visit http://localhost:3000
Resume file: None
