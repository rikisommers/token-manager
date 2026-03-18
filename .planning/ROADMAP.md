# Roadmap: ATUI Tokens Manager

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-02-28)
- ✅ **v1.1 shadcn UI** — Phases 1-4 (shipped 2026-03-12)
- 🚧 **v1.2 Token Groups Tree** — Phases 5-7 (in progress)

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

### 🚧 v1.2 Token Groups Tree (In Progress)

**Milestone Goal:** Refactor the token generator page so all groups appear as a navigable, collapsible tree in the master sidebar, with breadcrumb navigation and content scoped to the selected group's direct tokens.

- [x] **Phase 5: Tree Data Model** — Parse group path names into a `TokenGroup[]` tree structure and render collapsible nodes in the sidebar
- [x] **Phase 6: Selection + Breadcrumbs + Content Scoping** — Node selection drives breadcrumbs and scopes the content area to the selected group's direct tokens
- [ ] **Phase 7: Mutations** — Add group from tree and add/edit tokens in the selected group

## Phase Details

### Phase 5: Tree Data Model
**Goal**: Groups sidebar displays a hierarchical tree built from parsed path names
**Depends on**: Phase 4 (v1.1) — master-detail layout and TokenGeneratorFormNew in place
**Requirements**: TREE-01, TREE-02, TREE-05
**Success Criteria** (what must be TRUE):
  1. The sidebar shows all token groups as a tree — groups that contain no direct tokens appear as nodes with children
  2. A group named `brands/brand2/color.json` renders in the tree as Brand2 > Color (segments split, extension stripped)
  3. Tree nodes with children have an expand/collapse toggle; nodes without children have none
  4. Expanding a parent reveals its children; collapsing hides them
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Path-parsing utility + upgrade onGroupsChange to emit TokenGroup[]
- [x] 05-02-PLAN.md — TokenGroupTree component + wire into tokens page sidebar

### Phase 6: Selection + Breadcrumbs + Content Scoping
**Goal**: Clicking any tree node selects it, shows a breadcrumb trail, and scopes the content area to that group's direct tokens only
**Depends on**: Phase 5
**Requirements**: TREE-03, BREAD-01, BREAD-02, CONT-01
**Success Criteria** (what must be TRUE):
  1. Clicking a tree node highlights it as selected and the content area updates immediately
  2. The content area shows only the direct tokens of the selected group — tokens from descendant groups are not shown
  3. A breadcrumb trail above the content area reflects the full path of the selected group (e.g. `Brand2 / Color`)
  4. Clicking any breadcrumb segment navigates to and selects that ancestor group
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Tree node selection highlight + onGroupSelect wiring
- [x] 06-02-PLAN.md — GroupBreadcrumb component
- [x] 06-03-PLAN.md — Wire breadcrumb into tokens page + content scoping + human verify

### Phase 7: Mutations
**Goal**: Users can add new groups from the tree and add or edit tokens within the currently selected group
**Depends on**: Phase 6
**Requirements**: TREE-04, CONT-02, CONT-03
**Success Criteria** (what must be TRUE):
  1. An "add group" action is available from any tree node (and at root level) — invoking it creates a child group under that node
  2. The newly added group appears in the tree immediately and is selectable
  3. The content area for the selected group has an "add token" action that appends a new token to that group
  4. Existing token values in the selected group are editable inline
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Database Foundation | v1.0 | 3/3 | Complete | 2026-02-25 |
| 2. View Integration | v1.0 | 2/2 | Complete | 2026-02-25 |
| 3. Generator Form | v1.0 | 4/4 | Complete | 2026-02-26 |
| 4. Collection Management | v1.0 | 3/3 | Complete | 2026-02-26 |
| 5. Export Style Dictionary | v1.0 | 2/2 | Complete | 2026-02-26 |
| 6. Collection UX Improvements | 2/3 | In Progress|  | 2026-02-28 |
| 7. Fix Figma Integration | v1.0 | 6/6 | Complete | 2026-02-28 |
| 1. shadcn UI Components | v1.1 | 5/5 | Complete | 2026-03-09 |
| 2. Test ATUI Component Library | v1.1 | 1/1 | Complete | 2026-03-01 |
| 3. App Layout UX (sidebar + scoped pages) | v1.1 | 4/4 | Complete | 2026-03-11 |
| 4. Collection Management (grid + scoped routing + config persistence) | v1.1 | 6/6 | Complete | 2026-03-12 |
| 5. Tree Data Model | v1.2 | 2/2 | Complete | 2026-03-13 |
| 6. Selection + Breadcrumbs + Content Scoping | v1.2 | 3/3 | Complete | 2026-03-13 |
| 7. Mutations | v1.2 | 0/TBD | Not started | - |

### Phase 8: Clean code

**Goal:** Remove dead code, fix all TypeScript errors, reorganize components into feature domain folders, and enforce separation of concerns — leaving a clean, maintainable codebase with zero TS errors
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04, CLEAN-05, CLEAN-06, CLEAN-07
**Depends on:** Phase 7
**Plans:** 5/5 plans complete

Plans:
- [ ] 08-01-PLAN.md — Dead code removal + TokenGeneratorFormNew → TokenGeneratorForm rename
- [ ] 08-02-PLAN.md — Fix all TypeScript errors + AtuiDevTest shadcn migration
- [ ] 08-03-PLAN.md — Component reorganization into feature domain folders + barrel exports
- [ ] 08-04-PLAN.md — SRP audit: extract logic to utils/services, document DB factory, produce refactor suggestions
- [ ] 08-05-PLAN.md — Final build verification + human end-to-end check

### Phase 9: Add tokens modes

**Goal:** Add a per-collection Themes system — a dedicated Themes page where users create/manage named themes and assign each token group a Disabled/Enabled/Source state, plus a theme selector on the Tokens page that filters the group tree to show only active groups
**Depends on:** Phase 8
**Requirements:** MODE-01, MODE-02, MODE-03, MODE-04, MODE-05
**Plans:** 4 plans

Plans:
- [ ] 09-01-PLAN.md — Theme types + MongoDB schema extension + CRUD API routes
- [ ] 09-02-PLAN.md — Themes page UI (ThemeList + ThemeGroupMatrix components + route)
- [ ] 09-03-PLAN.md — CollectionSidebar Themes nav item + Tokens page theme selector
- [ ] 09-04-PLAN.md — Build verification + human end-to-end checkpoint
