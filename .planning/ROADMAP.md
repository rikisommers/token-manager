# Roadmap: ATUI Tokens Manager

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-02-28)
- ✅ **v1.1 shadcn UI** — Phases 1-4 (shipped 2026-03-12)
- ✅ **v1.2 Token Groups Tree** — Phases 5-6 (shipped 2026-03-13; Phase 7 Mutations deferred)
- ✅ **v1.3 Add Tokens Modes** — Phases 8-9 (shipped 2026-03-19)
- 🚧 **v1.4 Theme Token Sets** — Phases 10-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-7) — SHIPPED 2026-02-28</summary>

- [x] **Phase 1: Database Foundation** — MongoDB connection, Mongoose schema, seed script
- [x] **Phase 2: View Integration** — Browse and display collections from MongoDB
- [x] **Phase 3: Generator Form** — Save/load/update/dirty-flag cycle
- [x] **Phase 4: Collection Management** — Delete, rename, duplicate actions
- [x] **Phase 5: Export Style Dictionary** — Build pipeline + ZIP download
- [x] **Phase 6: Collection UX Improvements** — UX polish across collection flows
- [x] **Phase 7: Fix Figma Integration** — Figma import/export, proxy routes, source context bar

See: `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

</details>

<details>
<summary>✅ v1.1 shadcn UI (Phases 1-4) — SHIPPED 2026-03-12</summary>

- [x] **Phase 1: shadcn UI + Color Pickers** — All UI migrated to shadcn/ui, color pickers
- [x] **Phase 2: Test ATUI Component Library** — ATUI Stencil integration pattern established
- [x] **Phase 3: App Layout UX** — Persistent sidebar, scoped pages, collection-scoped routing
- [x] **Phase 4: Collection Management** — Card grid, CRUD, per-collection config persistence

See: `.planning/milestones/v1.1-ROADMAP.md` for full phase details.

</details>

<details>
<summary>✅ v1.2 Token Groups Tree (Phases 5-6) — SHIPPED 2026-03-13</summary>

- [x] **Phase 5: Tree Data Model** — Parse group path names into `TokenGroup[]` tree; render collapsible nodes in sidebar
- [x] **Phase 6: Selection + Breadcrumbs + Content Scoping** — Node selection drives breadcrumbs; content scoped to selected group's direct tokens
- [ ] ~~**Phase 7: Mutations**~~ — *(deferred: add group from tree, add/edit tokens in selected group — moved to v1.4)*

See: `.planning/milestones/v1.3-ROADMAP.md` (archived at v1.3 completion) for full phase details.

</details>

<details>
<summary>✅ v1.3 Add Tokens Modes (Phases 8-9) — SHIPPED 2026-03-19</summary>

- [x] **Phase 8: Clean Code** — Dead code removal, TS errors fixed, component domain reorganization, SRP extraction, e2e verified
- [x] **Phase 9: Add Tokens Modes** — Themes data model + CRUD API, Themes page UI, Themes nav + token page theme selector, e2e verified

See: `.planning/milestones/v1.3-ROADMAP.md` for archived roadmap details.

</details>

### 🚧 v1.4 Theme Token Sets (In Progress)

**Milestone Goal:** Themes become actual token value sets — each theme embeds a full copy of token data, group states control edit permissions, inline editing on the Tokens page writes to the active theme's embedded data, and export is theme-aware.

- [x] **Phase 10: Data Model Foundation** — Extend ITheme with embedded tokens, deep-copy on creation, migration script, theme count guard (completed 2026-03-19)
- [ ] **Phase 11: Inline Token Editing UI** — PATCH API endpoint + ThemeTokenEditor component, group-state-aware save routing, override indicator
- [ ] **Phase 12: Theme-Aware Export** — Config page theme selector, SD export uses theme tokens, Figma export generates one mode per enabled theme

## Phase Details

### Phase 10: Data Model Foundation
**Goal**: Themes store their own embedded token data, making every subsequent v1.4 feature possible
**Depends on**: Phase 9 (themes CRUD API and ITheme type exist)
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-04
**Success Criteria** (what must be TRUE):
  1. Creating a new theme causes the theme document in MongoDB to contain a full copy of all the collection's current token groups and values
  2. A one-time migration script runs against MongoDB and seeds `tokens` on all pre-existing theme documents that lack the field
  3. Attempting to create an 11th theme on a collection returns an error; the UI surfaces it and the theme is not created
  4. All code reading `theme.tokens` handles the `undefined` case without crashing (pre-migration guard)
**Plans**: 2 plans

Plans:
- [ ] 10-01-PLAN.md — Extend ITheme type, normalize toDoc(), embed tokens in POST handler, enforce 10-theme API cap
- [ ] 10-02-PLAN.md — UI 10-theme limit guard in ThemeList + one-time migration script

### Phase 11: Inline Token Editing UI
**Goal**: Users can edit token values inline on the Tokens page when an Enabled group is active under a selected theme, and changes persist to that theme's embedded token data
**Depends on**: Phase 10
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04
**Success Criteria** (what must be TRUE):
  1. When a theme is active and the selected group is Enabled, token value fields are editable inputs; edits are saved to that theme's token data (not the master collection)
  2. When a theme is active and the selected group is Source, token values are read-only and display the collection-default values
  3. When a theme is active and the selected group is Disabled, the group does not appear in the tree
  4. Token cells where the active theme's value differs from the collection default show a visible override indicator
  5. PATCH `/api/collections/[id]/themes/[themeId]/tokens` accepts full token replacement using whole-array `$set`; Source-group writes are rejected with 422
**Plans**: 3 plans

Plans:
- [ ] 11-01-PLAN.md — PATCH /api/collections/[id]/themes/[themeId]/tokens route (source-group guard + whole-array $set)
- [ ] 11-02-PLAN.md — Theme selector UX (Default label, hide-when-empty) + activeThemeTokens state + debounced PATCH save
- [ ] 11-03-PLAN.md — TokenGeneratorForm read-only + reset button (RotateCcw) + full wiring + human verify

### Phase 12: Theme-Aware Export
**Goal**: Export is targeted at a specific theme or the collection default, and Figma export represents each enabled theme as a variable mode
**Depends on**: Phase 10
**Requirements**: EXPORT-01, EXPORT-02, EXPORT-03
**Success Criteria** (what must be TRUE):
  1. The Config page has a theme selector control; user can choose "Collection default" or any named theme as the export target
  2. Triggering a Style Dictionary build with a theme selected produces token output that uses the theme's values for Enabled groups and the collection-default values for Source groups
  3. Triggering a Figma Variables export produces a payload where each enabled theme in the collection becomes a distinct variable mode
**Plans**: TBD

Plans:
- [ ] 12-01: TBD
- [ ] 12-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 10 → 11 → 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Database Foundation | v1.0 | 3/3 | Complete | 2026-02-25 |
| 2. View Integration | v1.0 | 2/2 | Complete | 2026-02-25 |
| 3. Generator Form | v1.0 | 4/4 | Complete | 2026-02-26 |
| 4. Collection Management | v1.0 | 3/3 | Complete | 2026-02-26 |
| 5. Export Style Dictionary | v1.0 | 2/2 | Complete | 2026-02-26 |
| 6. Collection UX Improvements | v1.0 | 2/3 | Complete | 2026-02-28 |
| 7. Fix Figma Integration | v1.0 | 6/6 | Complete | 2026-02-28 |
| 1. shadcn UI Components | v1.1 | 5/5 | Complete | 2026-03-09 |
| 2. Test ATUI Component Library | v1.1 | 1/1 | Complete | 2026-03-01 |
| 3. App Layout UX | v1.1 | 4/4 | Complete | 2026-03-11 |
| 4. Collection Management (grid + routing + config) | v1.1 | 6/6 | Complete | 2026-03-12 |
| 5. Tree Data Model | v1.2 | 2/2 | Complete | 2026-03-13 |
| 6. Selection + Breadcrumbs + Content Scoping | v1.2 | 3/3 | Complete | 2026-03-13 |
| 7. Mutations | v1.4 | 0/TBD | Deferred | - |
| 8. Clean Code | v1.3 | 5/5 | Complete | 2026-03-16 |
| 9. Add Tokens Modes | v1.3 | 4/4 | Complete | 2026-03-19 |
| 10. Data Model Foundation | 2/2 | Complete    | 2026-03-19 | - |
| 11. Inline Token Editing UI | 1/3 | In Progress|  | - |
| 12. Theme-Aware Export | v1.4 | 0/TBD | Not started | - |
