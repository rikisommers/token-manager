# Project Research Summary

**Project:** ATUI Tokens Manager — v1.4 Theme Token Sets
**Domain:** Design token management — per-theme value sets, inline editing, multi-format export
**Researched:** 2026-03-20
**Confidence:** HIGH (stack and architecture based on direct codebase inspection; MEDIUM for Figma Variables API integration)

## Executive Summary

ATUI Tokens Manager v1.4 extends an already-shipped milestone (v1.3) by making themes actual token value stores rather than visibility filters. The product already has theme CRUD, a ThemeGroupMatrix (Enabled/Source/Disabled group states), and a theme selector on the Tokens page — what is missing is the data layer that gives each theme its own embedded copy of token values, and the UI and export layers that read from it. Research across all four domains converges on a single clear verdict: **no new packages are required**, all capability is achievable with the existing stack (Next.js 13.5.6, React 18.2.0, Mongoose 9.3.0, Style Dictionary 5.3.3), and the implementation order is strictly dependency-driven.

The recommended approach is to treat embedded token data as the foundation everything else builds on. Themes should receive a deep copy of the collection's master tokens at creation time, inline editing on the Tokens page should route saves to a new `PATCH /themes/:themeId/tokens` endpoint (not the existing collection PUT), and export should pass the active theme's tokens to SD and Figma rather than the master collection. The existing debounce pattern (`useRef` + `setTimeout` already used in `tokens/page.tsx`) and the optimistic-update-with-rollback pattern (already in `ThemeGroupMatrix`) are the correct React primitives — no additional libraries are needed.

The dominant risks are: (1) the `Schema.Types.Mixed` Mongoose pattern makes positional `$set` on nested theme array elements unreliable — the safe path is whole-array replacement; (2) the Figma Variables API requires a strict object creation order (`variableCollections` → `variableModes` → `variables` → `variableModeValues`) and a 4 MB payload ceiling that requires chunked batching for large token sets; and (3) pre-existing theme documents in MongoDB have no `tokens` field, so every consumer must guard against `undefined` and a one-time migration must seed the field before any reading code is deployed.

---

## Key Findings

### Recommended Stack

The existing stack is sufficient for all v1.4 requirements. No new packages are needed, and several obvious candidates were explicitly rejected: `useOptimistic` (requires React 19, not React 18.2.0), `use-debounce` (trivial 8-line pattern already in the codebase), `@tanstack/react-query` (overkill for this fetch pattern), and a separate `ThemeTokenSet` MongoDB collection (joins and complexity not justified at this scale).

**Core technologies and their v1.4 roles:**
- **Mongoose 9.3.0** — embed `tokens: Record<string, unknown>` on `ITheme`; update via whole-array `$set: { themes: updatedArray }` (NOT positional `$set` — Mixed type makes that unreliable)
- **React 18.2.0** — inline editing via `useState` + `useRef` + `setTimeout` debounce; optimistic display with rollback on error; same pattern as existing `graphAutoSaveTimerRef`
- **Style Dictionary 5.3.3** — one `new StyleDictionary({ tokens: themeTokens })` instance per theme; call `sd.init()` then `sd.formatPlatform('css')`; integrate into existing `buildBrandTokens` function
- **Next.js 13.5.6** — new `PATCH /api/collections/[id]/themes/[themeId]/tokens` route; extend Figma export route to accept optional `themes` array for multi-mode output

### Expected Features

The feature dependency chain is strict and linear. Embedded token data is the prerequisite for everything else. Research identified a clear MVP scope for v1.4 and explicit deferral decisions.

**Must have (table stakes — v1.4 launch required):**
- Theme document stores a full embedded copy of collection tokens on creation — every other feature depends on this
- Inline value editing in the tokens table routes saves to the active theme's embedded data (not the master collection)
- Source group state = read from collection default, read-only; Enabled group state = read from and write to theme tokens
- Visual override indicator distinguishing theme-overridden values from collection-default values — without this editors are blind
- Theme selector on Config page for export target selection
- SD export: theme-selected output uses theme token values (not master collection)
- Figma export: each enabled theme becomes one Figma Variable mode

**Should have (competitive differentiators — v1.4.x after validation):**
- Override indicator with reset-to-collection-default action per token
- Multi-theme ZIP export (all themes in one SD build action)
- "Resync from collection" action when master tokens have changed since theme creation

**Defer to v2+:**
- Theme inheritance chains (Theme B inherits Theme A) — requires resolver complexity; flat per-theme model covers current use case
- Multi-dimensional theme permutation (mode x brand matrix) — needs `sd-transforms permutateThemes` and UX redesign
- Real-time cross-theme diff view — analytical feature, not core authoring

**Anti-features to explicitly reject:**
- Token alias resolution across theme boundaries (circular reference explosions)
- Automatic propagation of master collection edits into all themes (silent mutations)
- Live component preview (out of scope for a token manager)

### Architecture Approach

The implementation follows a six-step dependency-ordered sequence grounded in the existing codebase patterns. The data layer must be completed first (ITheme type extension, theme creation token copy, PATCH endpoint) before any UI or export work begins. Two new components are added (`ThemeTokenEditor`, `ThemeExportSelector`) and four existing files are modified (`CollectionTokensPage`, `CollectionConfigPage`, `BuildTokensPanel`, `ExportToFigmaDialog`). No new pages, no new services, no new MongoDB collections.

**Major components and responsibilities:**
1. **`ITheme` type extension** (`src/types/theme.types.ts`) — adds `tokens?: Record<string, unknown>`; optional for backward compatibility with pre-v1.4 documents
2. **Theme creation handler** (`POST /api/collections/[id]/themes`) — deep-copies `collection.tokens` into `theme.tokens` via `structuredClone` before `$push`
3. **`PATCH /api/collections/[id]/themes/[themeId]/tokens`** (new file) — accepts full token replacement; uses whole-array `$set` to avoid Mixed-type positional operator issues; validates that source-state groups are not written to
4. **`ThemeTokenEditor`** (new component) — inline editing UI for Enabled groups under an active theme; replaces the form panel section (not the page layout) when theme context is active
5. **`ThemeExportSelector`** (new component) — shadcn/ui `Select` on Config page; "Collection default" or a named theme; drives which token set is passed to SD and Figma export
6. **Figma export route extension** (`/api/export/figma`) — when `themes` array present in request body, build `variableCollections` + `variableModes` + `variables` + `variableModeValues` in correct dependency order with temp IDs

**Key patterns to follow (all established in existing code):**
- Whole-array theme update: fetch document, mutate theme in memory, `$set: { themes: updatedArray }` — bypass positional operator entirely
- Optimistic UI with revert: apply changes to local state immediately, PATCH to API, revert to pre-edit snapshot on failure
- Token source resolution at render time: `activeGroupState === 'source'` reads `rawCollectionTokens`; `'enabled'` reads `activeThemeTokens`; no merged store
- Repository bypass for theme mutations: direct `TokenCollection` model access for array operator updates (established pattern, documented in PROJECT.md)

### Critical Pitfalls

1. **`$set themes.$.tokens` silently fails on Mixed-typed array** — Mongoose does not correctly cast positional updates on `Schema.Types.Mixed` arrays (confirmed bugs #14595, #12530). Prevention: fetch document, modify theme in memory, write full `themes` array back. Decide this before writing any PATCH endpoint code.

2. **Inline edit writes to master collection instead of theme** — The existing `handleSave` in `tokens/page.tsx` issues `PUT /api/collections/${id}` regardless of active theme. Prevention: explicitly branch the save path on `activeThemeId` + group state; block the master PUT while in theme editing context.

3. **Pre-existing themes have no `tokens` field — runtime crashes** — MongoDB does not backfill new fields on existing documents. Prevention: mark `ITheme.tokens` as optional; add `theme.tokens ?? {}` guards everywhere; run a one-time migration script before any v1.4 reading code ships.

4. **Figma Variables API requires strict creation order** — `variableModes` must reference an already-created `variableCollectionId`; `variableModeValues` must reference already-created variable and mode IDs. All within one atomic POST using `"temp:X"` prefix IDs. The entire POST fails if order is wrong — nothing is written. Prevention: always structure payload as collections → modes → variables → mode values; do not attempt to extend the existing single-mode export incrementally.

5. **Figma 4 MB request body limit with multi-theme exports** — 500 tokens × 5 themes = 2,500 mode value entries, easily approaching 4 MB. Prevention: estimate `JSON.stringify(payload).length` before sending; batch `variableModeValues` in groups of 200–300 across sequential requests if over 3.5 MB threshold.

6. **BSON document size** — each theme embeds a full token copy; with many themes on large collections the 16 MB MongoDB document limit is reachable. Prevention: enforce a per-collection theme count limit (e.g., 10 max) in the POST handler; calculate estimated size before writing.

7. **SD instance state accumulation on sequential theme exports** — SD v5 may retain state across successive instantiations. Prevention: create a fresh `StyleDictionary` instance for each theme build; always call `sd.init()` before `sd.formatPlatform()`; verify two themes produce distinct output in testing.

---

## Implications for Roadmap

Based on the strict dependency chain identified in research, four implementation phases are recommended. The first two are purely backend and must complete before any UI work.

### Phase 1: Data Model Foundation

**Rationale:** Every other v1.4 feature reads from `theme.tokens`. Nothing can be built until themes store their own token data. This is a pure backend phase with zero UI changes.

**Delivers:**
- `ITheme` interface gains `tokens?: Record<string, unknown>` (optional for backward compat)
- Theme creation (`POST /themes`) deep-copies `collection.tokens` into `theme.tokens`
- One-time migration script seeds `tokens` on all existing theme documents
- Document size guard (theme count limit) in POST handler

**Features addressed:** "Theme embeds full copy of token data on creation" (table stakes, P1 foundation)

**Pitfalls to avoid:**
- Mark `tokens` as optional type; add nullish coalescing guards before migration runs (Pitfall 10)
- Enforce theme count limit before size becomes a problem (Pitfall 1)
- Use `structuredClone` for deep copy — no shared references between theme and master (functional correctness)

**Research flag:** Standard patterns — no additional research needed. `structuredClone`, Mongoose `$push`, and TypeScript interface extension are all well-documented.

---

### Phase 2: Theme Tokens API Route

**Rationale:** The inline editing UI (Phase 3) cannot save until this endpoint exists. Building the API first allows the endpoint to be tested independently before the UI is wired.

**Delivers:**
- New `PATCH /api/collections/[id]/themes/[themeId]/tokens` route
- Accepts `{ tokens: Record<string, unknown> }` — full replacement of theme's embedded data
- Server-side group-state validation: rejects writes to Source-state groups with 422
- Uses whole-array `$set` pattern (fetch → mutate → `$set: { themes: updatedArray }`)

**Features addressed:** Save routing for theme token edits (table stakes, P1); server-side permission enforcement (security)

**Pitfalls to avoid:**
- Do not use positional `$set: 'themes.$.tokens'` on a Mixed-typed array (Pitfall 2)
- Add group-state check at API layer — UI guard alone is insufficient (Pitfall 5)

**Research flag:** Standard patterns — established positional array update approach is already used in the existing PUT route. No additional research needed.

---

### Phase 3: Inline Token Editing UI

**Rationale:** With data model (Phase 1) and API (Phase 2) in place, the UI can be built against real endpoints. This is the core authoring UX and the most visible user-facing change in v1.4.

**Delivers:**
- `ThemeTokenEditor` component: inline editable inputs for Enabled groups under active theme; read-only display for Source groups
- `CollectionTokensPage` extended: branches save path on `activeThemeId` + group state; passes `rawCollectionTokens` for source groups and `activeThemeTokens` for enabled groups
- Visual override indicator: badge/dot on cells where `theme.$value !== collection.$value`
- Debounced save using existing `useRef` + `setTimeout` pattern; optimistic display with rollback on error

**Features addressed:** Inline editing (P1 table stakes), visual override indicator (P1 table stakes), group-state-aware display (P1)

**Pitfalls to avoid:**
- Save path must route to PATCH theme tokens, never to master collection PUT (Pitfall 3)
- Use `useRef` for pending token data to avoid stale closure in debounce (Pitfall 4)
- Make active theme context visually obvious (UX pitfall — "Editing theme: Dark Mode" banner)

**Research flag:** Standard patterns — existing `graphAutoSaveTimerRef` debounce and `ThemeGroupMatrix` optimistic update are direct precedents. No additional research needed.

---

### Phase 4: Theme-Aware Export (SD + Figma)

**Rationale:** SD and Figma exports are independent of each other but both depend on themes having token data (Phase 1). SD export is lower risk and should be implemented first. Figma export requires careful payload ordering and batching.

**Delivers (SD export):**
- `ThemeExportSelector` component on Config page: "Collection default" or named theme
- `BuildTokensPanel` receives resolved tokens (theme or collection) — no internal change to the panel or `/api/build-tokens` route
- SD build uses `deepMerge(masterTokens, themeEnabledGroupTokens)`: master in base, theme values on top; Source groups use master values only; Disabled groups excluded

**Delivers (Figma export):**
- `ExportToFigmaDialog` receives themes array from Config page
- Figma export route builds payload in correct order: `variableCollections` → `variableModes` → `variables` → `variableModeValues`
- Temp ID scheme (`"temp:X"`) for cross-referencing within single atomic POST
- Payload size estimation before sending; chunked `variableModeValues` batches if over 3.5 MB

**Features addressed:** Theme-aware SD export (P1), Figma export with modes (P1), Config page export selector (P1)

**Pitfalls to avoid:**
- SD merge must use `deepMerge` — not `Object.assign` (shallow merge breaks nested token structure) (Pitfall 6)
- Fresh SD instance per theme; always call `sd.init()` before `sd.formatPlatform()` (Pitfall 7)
- Figma payload must be structured in dependency order — cannot extend existing single-mode code incrementally (Pitfall 8)
- Batch `variableModeValues` if payload exceeds 3.5 MB threshold (Pitfall 9)

**Research flag:** SD export is standard. Figma multi-mode export needs careful implementation against the verified API docs — no additional research needed, but plan for integration testing against a real Figma file as the Figma API error messages are opaque.

---

### Phase Ordering Rationale

The sequence (Data Model → API Route → Inline Editing → Export) is forced by the dependency chain:
- All phases require `theme.tokens` to exist in MongoDB — Phase 1 cannot be skipped or deferred
- Inline editing cannot save until the PATCH endpoint exists — Phase 2 before Phase 3
- Export can be parallelized in Phase 4 (SD and Figma are independent), but both require Phase 1
- The migration script (Phase 1) must run before any code that reads `theme.tokens` is deployed — this means Phase 1 must ship as a complete atomic unit before Phase 2 or 3 reaches production

### Research Flags Summary

Phases needing deeper research during planning: **none** — all patterns are documented and verified.

Phases with well-established patterns (skip research-phase):
- **Phase 1** — TypeScript interface extension, `structuredClone`, Mongoose `$push`
- **Phase 2** — whole-array Mongoose update, Next.js API route structure
- **Phase 3** — React `useRef` debounce, optimistic update with rollback
- **Phase 4 (SD)** — Style Dictionary v5 `formatPlatform` API, existing `buildBrandTokens` extension point

One integration requiring careful testing (not research):
- **Phase 4 (Figma)** — validate payload construction against a live Figma Enterprise file before considering complete; Figma API errors are opaque and the atomic transaction semantics make debugging difficult

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All four capability areas verified against installed package versions; `useOptimistic` absence confirmed by direct `node_modules` inspection; SD v5 `formatPlatform` return type confirmed from official docs |
| Features | HIGH | Dependency chain is unambiguous; industry precedent (Tokens Studio) validates the Source/Enabled/Disabled model; MVP scope is conservative and well-bounded |
| Architecture | HIGH | Based entirely on direct codebase inspection — existing routes, components, services, and type files all reviewed; no guesswork about existing code structure |
| Pitfalls | HIGH | Critical Mongoose Mixed-type positional operator issue confirmed against open bug reports; Figma API constraints from official developer docs; React 18.2 stale closure pattern from authoritative sources |

**Overall confidence: HIGH**

### Gaps to Address

- **Figma Enterprise plan requirement** — the Figma Variables POST API requires Enterprise plan. This is a product constraint that must be surfaced in the export UI (tooltip or documentation) rather than a technical gap. Validate during Phase 4 testing.

- **BSON document size on real collections** — the 16 MB limit analysis is based on estimates. Before Phase 1 ships, measure the actual size of the largest current collection document (`BSON.calculateObjectSize()`) to calibrate the theme count limit accurately.

- **SD deep merge correctness for alias references** — the `deepMerge` function in `style-dictionary.service.ts` is the assumed merge tool. Verify it preserves `{colors.base.blue.200}` reference strings as-is rather than resolving them, because SD must do alias resolution after merge, not before.

- **Figma "modes must exist before values" in update scenarios** — the Figma API atomic POST handles creation. For subsequent updates to an already-synced collection (re-export after token edits), the route needs to handle the `UPDATE` action variant rather than `CREATE`. This is a Phase 4 edge case to plan for.

---

## Sources

### Primary (HIGH confidence)
- [MongoDB Filtered Positional Operator](https://www.mongodb.com/docs/manual/reference/operator/update/positional-filtered/) — `$set` + `arrayFilters` pattern
- [MongoDB Limits and Thresholds](https://docs.mongodb.com/manual/reference/limits/) — 16 MB BSON limit
- [MongoDB Avoid Unbounded Arrays](https://www.mongodb.com/docs/atlas/schema-suggestions/avoid-unbounded-arrays/) — embedded token copy design
- [Mongoose 9.x SchemaTypes](https://mongoosejs.com/docs/schematypes.html) — Mixed type behavior with `$set`
- [Style Dictionary v5 API Reference](https://styledictionary.com/reference/api/) — `formatPlatform` return type, `tokens` constructor, `init()` requirement
- [Figma Variables REST API Endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/) — POST payload schema, 4 MB limit, 40-mode limit, atomic transaction behavior
- [Figma Variables REST API Types](https://developers.figma.com/docs/rest-api/variables-types/) — temp ID scheme, `variableModeValues` structure
- Direct codebase inspection: `src/types/theme.types.ts`, `src/app/api/collections/[id]/themes/route.ts`, `src/app/api/collections/[id]/themes/[themeId]/route.ts`, `src/app/collections/[id]/tokens/page.tsx`, `src/app/collections/[id]/config/page.tsx`, `src/app/api/export/figma/route.ts`, `src/services/style-dictionary.service.ts`, `src/lib/db/models/TokenCollection.ts`

### Secondary (MEDIUM confidence)
- [Mongoose issue #14595](https://github.com/Automattic/mongoose/issues/14595), [#12530](https://github.com/Automattic/mongoose/issues/12530) — confirmed Mixed-type positional operator bugs
- [Tokens Studio documentation](https://docs.tokens.studio/) — Source/Enabled/Disabled state semantics; industry precedent for override indicator
- [sd-transforms README](https://github.com/tokens-studio/sd-transforms/blob/main/README.md) — `permutateThemes` pattern reference for v2 consideration
- [Multi-axis design tokens with Style Dictionary — Matt McAdams, 2025](https://mattmcadams.com/posts/2025/multi-axis-design-tokens/) — multi-file SD export pattern
- [tkdodo.eu — Concurrent Optimistic Updates](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) — debounce race condition analysis
- [Figma Variables overview](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes) — mode limit (40 per collection, Enterprise plan)

---
*Research completed: 2026-03-20*
*Ready for roadmap: yes*
