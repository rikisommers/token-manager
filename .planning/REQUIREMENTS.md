# Requirements: ATUI Tokens Manager

**Defined:** 2026-03-12
**Core Value:** Token collections are always available and editable — accessible via collection-scoped URLs, with per-collection Figma/GitHub config persisted to MongoDB, full CRUD from a card grid, and Figma import/export integrated.

## v1 Requirements

### Token Groups Tree

- [ ] **TREE-01**: Groups sidebar displays all token groups as a hierarchical tree, including groups that contain no direct tokens
- [ ] **TREE-02**: Tree node display names are parsed from the `group.name` path — path segments split, `.json` extension removed (e.g. `brands/brand2/color.json` → tree: Brand2 > Color)
- [ ] **TREE-03**: Selecting a tree node shows only the direct tokens of that group in the content area
- [ ] **TREE-04**: User can add a new group from the tree sidebar (as a child of any node, or at root level)
- [ ] **TREE-05**: Tree nodes can be expanded and collapsed

### Breadcrumbs

- [ ] **BREAD-01**: Content area shows breadcrumb trail reflecting the selected group's full path (e.g. `Brand2 / Color`)
- [ ] **BREAD-02**: Each breadcrumb segment is clickable and selects the corresponding ancestor group

### Content Area

- [ ] **CONT-01**: Content area shows only direct tokens of the selected group (not descendants)
- [ ] **CONT-02**: User can add tokens to the currently selected group
- [ ] **CONT-03**: User can edit token values in the currently selected group

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
| TREE-03 | Phase 6 | Pending |
| BREAD-01 | Phase 6 | Pending |
| BREAD-02 | Phase 6 | Pending |
| CONT-01 | Phase 6 | Pending |
| TREE-04 | Phase 7 | Pending |
| CONT-02 | Phase 7 | Pending |
| CONT-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 — traceability mapped to v1.2 phases 5-7*
