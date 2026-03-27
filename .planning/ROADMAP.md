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
- [x] **Phase 11: Inline Token Editing UI** — PATCH API endpoint + ThemeTokenEditor component, group-state-aware save routing, override indicator (completed 2026-03-19)
- [x] **Phase 12: Theme-Aware Export** — Config page theme selector, SD export uses theme tokens, Figma export generates one mode per enabled theme (completed 2026-03-20)

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
**Plans**: 4 plans

Plans:
- [x] 12-01-PLAN.md — themeTokenMerge helper + BuildTokensRequest.themeLabel extension + SD build comment injection
- [x] 12-02-PLAN.md — Config page theme fetch + "Export theme:" selector + BuildTokensPanel themeLabel wiring + Figma Enterprise note
- [x] 12-03-PLAN.md — Figma export route rewrite: multi-mode payload (variableModes + variableModeValues)
- [x] 12-04-PLAN.md — Human verify: theme selector, SD comment header, Figma Enterprise note

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
| 11. Inline Token Editing UI | 3/3 | Complete    | 2026-03-19 | - |
| 12. Theme-Aware Export | 4/4 | Complete    | 2026-03-20 | - |
| 13. Groups Ordering Drag and Drop | 3/3 | Complete    | 2026-03-20 | - |

### Phase 13: Groups Ordering Drag and Drop

**Goal:** Users can drag and drop token groups in the sidebar tree to reorder siblings and reparent groups; drag order persists to MongoDB, updates all theme snapshots, and becomes the canonical export sequence
**Depends on:** Phase 12
**Requirements:** ORD-01, ORD-02, ORD-03, ORD-04
**Plans:** 3/3 plans complete

Plans:
- [x] 13-01-PLAN.md — Install @dnd-kit packages + applyGroupMove cascade utility + SortableGroupRow component
- [x] 13-02-PLAN.md — Refactor TokenGroupTree with DndContext, SortableContext, DragOverlay
- [x] 13-03-PLAN.md — Page wiring: handleGroupsReordered + undo stack + MongoDB persist + human verify

### Phase 14: dark mode support

**Goal:** Each theme carries a colorMode (light/dark), visible as a badge in the UI, selectable at theme creation, and used at export time to produce combined CSS files and Figma variable mode groupings
**Depends on:** Phase 13
**Requirements:** DARK-01, DARK-02, DARK-03, DARK-04, DARK-05, DARK-06
**Plans:** 5/5 plans complete

Plans:
- [ ] 14-01-PLAN.md — Add ColorMode type + colorMode field to ITheme; POST/PUT theme routes accept colorMode
- [ ] 14-02-PLAN.md — ThemeList create dialog + ColorModeBadge + settings popover; token/config selector badges
- [ ] 14-03-PLAN.md — buildCombinedOutput helper (CSS/SCSS/LESS + JS/TS); BuildTokensRequest extension; config page dark token auto-detection
- [ ] 14-04-PLAN.md — Figma export: colorMode-aware theme pairing (Light/Dark modes per group structure)
- [x] 14-05-PLAN.md — Pre-build check + human verification gate for complete Phase 14 feature set (completed 2026-03-25)

### Phase 15: multi-row actions

**Goal:** Users can select multiple tokens in the active group via always-visible checkboxes and perform bulk operations (delete, move to group, change type, add/remove prefix) from a floating action bar, with undo support and theme-aware dual-path routing
**Depends on:** Phase 14
**Requirements:** BULK-01, BULK-02, BULK-03, BULK-04, BULK-05, BULK-06, BULK-07
**Plans:** 4/4 plans complete

Plans:
- [ ] 15-01-PLAN.md — Pure bulk mutation utils (TDD): bulkDeleteTokens, bulkMoveTokens, bulkChangeType, bulkAddPrefix, bulkRemovePrefix, detectCommonPrefix
- [ ] 15-02-PLAN.md — UI components: DeleteConfirmDialog, GroupPickerModal, BulkActionBar (with inline prefix expand + live preview)
- [ ] 15-03-PLAN.md — Integration: selection state + checkbox column + bulk handlers + undo wiring in TokenGeneratorForm and page.tsx
- [ ] 15-04-PLAN.md — Human verify: 12-scenario walkthrough of complete multi-row actions feature
