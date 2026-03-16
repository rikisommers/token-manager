# Requirements: ATUI Tokens Manager

**Defined:** 2026-03-12
**Core Value:** Token collections are always available and editable — accessible via collection-scoped URLs, with per-collection Figma/GitHub config persisted to MongoDB, full CRUD from a card grid, and Figma import/export integrated.

## v1 Requirements

### Token Groups Tree

- [ ] **TREE-01**: Groups sidebar displays all token groups as a hierarchical tree, including groups that contain no direct tokens
- [ ] **TREE-02**: Tree node display names are parsed from the `group.name` path — path segments split, `.json` extension removed (e.g. `brands/brand2/color.json` → tree: Brand2 > Color)
- [x] **TREE-03**: Selecting a tree node shows only the direct tokens of that group in the content area
- [ ] **TREE-04**: User can add a new group from the tree sidebar (as a child of any node, or at root level)
- [ ] **TREE-05**: Tree nodes can be expanded and collapsed

### Breadcrumbs

- [x] **BREAD-01**: Content area shows breadcrumb trail reflecting the selected group's full path (e.g. `Brand2 / Color`)
- [x] **BREAD-02**: Each breadcrumb segment is clickable and selects the corresponding ancestor group

### Content Area

- [x] **CONT-01**: Content area shows only direct tokens of the selected group (not descendants)
- [ ] **CONT-02**: User can add tokens to the currently selected group
- [ ] **CONT-03**: User can edit token values in the currently selected group

## Phase 8 Requirements (Clean Code)

- [ ] **CLEAN-01**: Dead form component `TokenGeneratorForm.tsx` (legacy) deleted; `TokenGeneratorFormNew.tsx` renamed to `TokenGeneratorForm.tsx`; all import sites updated
- [ ] **CLEAN-02**: Legacy app routes (`/generate`, `/settings`, `/configuration`) deleted; `collections.tsx` audited and cleaned up
- [ ] **CLEAN-03**: All TypeScript errors fixed with no suppressors (`@ts-ignore`, `as any`); `AtuiDevTest.tsx` migrated from broken ATUI stencil loader to shadcn
- [ ] **CLEAN-04**: Components reorganized into feature domain subdirectories (`collections/`, `tokens/`, `layout/`, `figma/`, `github/`, `dev/`) each with `index.ts` barrel exports; `collectionHeader.tsx` renamed to `CollectionHeader.tsx`
- [ ] **CLEAN-05**: `src/utils/` functions are pure and framework-agnostic (no React/Next.js imports); `get-repository.ts` documented as live factory entry point
- [ ] **CLEAN-06**: SRP audit completed; non-rendering logic extracted from components to `src/utils/` or `src/services/`; `REFACTOR-SUGGESTIONS.md` created with out-of-scope ideas
- [ ] **CLEAN-07**: Application verified end-to-end in browser after all refactoring; zero TypeScript errors

## v2 Requirements

(none defined yet — milestone scope to be expanded via /gsd:add-phase)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Drag-and-drop group reordering | Complexity; deferred |
| Group renaming from tree | Deferred to future milestone |
| Token search / filter | Separate feature, future milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TREE-01 | Phase 5 | Pending |
| TREE-02 | Phase 5 | Pending |
| TREE-05 | Phase 5 | Pending |
| TREE-03 | Phase 6 | Complete |
| BREAD-01 | Phase 6 | Complete |
| BREAD-02 | Phase 6 | Complete |
| CONT-01 | Phase 6 | Complete |
| TREE-04 | Phase 7 | Pending |
| CONT-02 | Phase 7 | Pending |
| CONT-03 | Phase 7 | Pending |
| CLEAN-01 | Phase 8 | Pending |
| CLEAN-02 | Phase 8 | Pending |
| CLEAN-03 | Phase 8 | Pending |
| CLEAN-04 | Phase 8 | Pending |
| CLEAN-05 | Phase 8 | Pending |
| CLEAN-06 | Phase 8 | Pending |
| CLEAN-07 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓
- Phase 8 (clean code) requirements: 7 total
- Mapped to plans: 7 ✓

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-16 — CLEAN-01 through CLEAN-07 added for Phase 8 (Clean Code)*
