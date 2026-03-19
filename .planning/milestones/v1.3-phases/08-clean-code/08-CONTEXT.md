# Phase 8: Clean code - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove dead code, fix TypeScript errors, reorganize components by feature domain, enforce consistent naming, and improve separation of concerns (SOLID principles, pure utils/services). No new features — this phase only improves code quality after Phase 7 (Mutations) is complete.

</domain>

<decisions>
## Implementation Decisions

### Dead Code Removal
- Delete `TokenGeneratorForm.tsx` (old form, superseded)
- Rename `TokenGeneratorFormNew.tsx` → `TokenGeneratorForm.tsx`
- Delete all legacy routes: `src/app/generate/`, `src/app/settings/`, `src/app/configuration/`
- Keep `supabase-repository.ts` — Supabase integration is planned for a future milestone; do not delete

### TypeScript Errors
- Fix all 4 TS errors in route handlers properly — no `@ts-ignore`, no `as any` casts
  - `src/app/api/collections/route.ts`: ISourceMetadata type mismatch
  - `src/app/api/database/test/route.ts`: mongoose Connection type errors
  - `src/app/collections/[id]/tokens/page.tsx`: null incompatibility in callback signature
- Replace the ATUI stencil loader in `AtuiDevTest.tsx` with a shadcn equivalent (the ATUI integration pattern is established; this dev-test component should use shadcn instead)

### DB Abstraction Layer
- Keep the repository abstraction (interface + factory + implementations) — it supports the future Supabase swap
- Rename files to follow standard naming guidelines:
  - Interface files should follow a clear naming convention (e.g., `ICollectionRepository` already in use — ensure filenames match)
  - Audit `get-repository.ts`: check whether API routes actually use the factory or call `mongo-repository` directly; if it's dead, remove it; if it's live, document it clearly
- Do not collapse the abstraction to direct Mongoose calls

### Component Grouping (Feature Domain)
- Reorganize `src/components/` into feature domain subdirectories:
  - `collections/` — CollectionCard, CollectionActions, CollectionSelector, CollectionSidebar, CollectionLayoutClient, NewCollectionDialog, DeleteCollectionDialog, LoadCollectionDialog, SaveCollectionDialog, CollectionHeader
  - `tokens/` — TokenTable, TokenGeneratorForm (renamed), TokenGroupTree, GroupBreadcrumb, TokenReferencePicker, TokenGeneratorDocs
  - `layout/` — LayoutShell, AppSidebar, AppHeader, OrgSidebar, OrgHeader, SharedCollectionHeader, SourceContextBar, LoadingIndicator, ToastNotification
  - `figma/` — FigmaConfig, ImportFromFigmaDialog, ExportToFigmaDialog
  - `github/` — GitHubConfig, GitHubDirectoryPicker
  - `ui/` — shadcn primitives (already in `src/components/ui/`, keep as-is)
  - `graph/` — already grouped (keep as-is)
  - `dev/` — AtuiDevTest, BuildTokensPanel, BuildTokensModal, JsonPreviewDialog, DatabaseConfig
- Each feature domain folder gets an `index.ts` barrel export

### Naming Consistency
- Fix `collectionHeader.tsx` → `CollectionHeader.tsx` (PascalCase)
- After renaming TokenGeneratorFormNew → TokenGeneratorForm, update all import sites
- All component folders must have `index.ts` re-exporting their components

### SOLID / Utils / Services
- **SRP (full pass)**: Review all components — extract any non-rendering logic (data transforms, business rules, API calls inline in components) into utils or services
- **Pure functions**: Extracted utility functions must be pure and framework-agnostic (no React imports, no Next.js imports in `src/utils/`)
- **Audit and document**: During the SRP pass, produce a list of additional refactor suggestions that are out of scope for Phase 8 — capture for future phases, don't act on them
- Move obviously misplaced logic first, then do the full audit
- Existing structure to follow: `src/utils/` for pure transforms, `src/services/` for I/O-bound operations (API, DB, file system)

### Claude's Discretion
- Exact folder structure details within each domain group (e.g., whether BuildTokensModal belongs in `tokens/` or `dev/`)
- Whether `DatabaseConfig.tsx` belongs in `dev/` or a new `database/` group
- Internal refactoring approach for each TS error fix
- How to structure barrel `index.ts` files

</decisions>

<specifics>
## Specific Ideas

- "Ensure functions are pure and framework-agnostic if possible" — utils should have zero React/Next.js imports
- SOLID practices as the guiding principle for the SRP pass
- Produce a suggestions list during audit (for future phases) — don't lose ideas, don't act on them in Phase 8

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils/`: tokenUpdater.ts, token.utils.ts, tree.utils.ts, ui.utils.ts, validation.utils.ts — already structured, may need additions from SRP pass
- `src/services/`: figma.service.ts, file.service.ts, github.service.ts, style-dictionary.service.ts, token.service.ts — already structured

### Established Patterns
- shadcn/ui primitives live in `src/components/ui/` — keep this location unchanged
- `graph/` subdirectory already exists in `src/components/` — keep as-is
- Repository pattern: `repository.ts` (interface) + `mongo-repository.ts` + `supabase-repository.ts` + `get-repository.ts` (factory)

### Integration Points
- All import sites for moved/renamed components must be updated (especially `TokenGeneratorFormNew` → `TokenGeneratorForm` across collection-scoped pages and layout)
- `src/app/collections/[id]/tokens/page.tsx` is the main consumer of `TokenGeneratorForm`, `TokenGroupTree`, `GroupBreadcrumb`
- DB repository is consumed by `src/app/api/` routes — audit before restructuring

### Dead Code Confirmed
- `TokenGeneratorForm.tsx` — old form component, superseded by `TokenGeneratorFormNew.tsx`
- `src/app/generate/page.tsx` — just a redirect stub
- `src/app/settings/page.tsx` — legacy settings page
- `src/app/configuration/page.tsx` — legacy configuration page
- `src/app/collections.tsx` — audit: this file alongside `src/app/collections/` directory is suspicious, check if it's dead

### Dead Code — Keep
- `supabase-repository.ts` — future Supabase integration; do not delete

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-clean-code*
*Context gathered: 2026-03-16*
