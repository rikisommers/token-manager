# Requirements: ATUI Tokens Manager

**Defined:** 2026-03-20
**Core Value:** Token collections are always available and editable: stored in MongoDB, accessible via collection-scoped URLs, with per-collection Figma/GitHub config, full CRUD from the collections grid, Figma import/export fully integrated, and a Themes system for filtering active token groups.

## v1.4 Requirements

Requirements for milestone v1.4 — Theme Token Sets. Phases start at Phase 10.

### Theme Data Model

- [x] **THEME-01**: Each theme stores a full copy of all collection token data embedded in the theme document
- [x] **THEME-02**: Theme creation initializes embedded token data as a 1:1 deep copy of the collection's current tokens
- [ ] **THEME-03**: Pre-existing themes without token data are migrated via a one-time script before any reading code ships
- [x] **THEME-04**: Theme creation enforces a maximum of 10 themes per collection to prevent MongoDB document size overflow

### Token Editing

- [ ] **EDIT-01**: Group state controls token display when a theme is active: Enabled shows theme token values (editable), Source shows collection-default values (read-only), Disabled hides the group from the tree
- [ ] **EDIT-02**: User can edit token values inline on the Tokens page when an Enabled group is selected under an active theme
- [ ] **EDIT-03**: Inline token edits are saved to the active theme's embedded token data (not the master collection)
- [ ] **EDIT-04**: Tokens whose values differ from the collection default are visually indicated (override indicator)

### Export

- [ ] **EXPORT-01**: User can select which theme (or collection default) to target for export on the Config page
- [ ] **EXPORT-02**: Style Dictionary export uses the selected theme's token values for the active export
- [ ] **EXPORT-03**: Figma Variables export generates one mode per enabled theme in the collection

## Future Requirements

### Token Mutations (deferred from v1.2 Phase 7)

- **TREE-04**: User can add a new group from the tree sidebar (as a child of any node, or at root level)
- **TREE-05**: Tree nodes can be expanded and collapsed (expand/collapse toggle per node)
- **CONT-02**: User can add tokens to the currently selected group

### Theme Enhancements (v1.4.x+)

- **THEME-05**: Override indicator includes a reset-to-collection-default action per token
- **THEME-06**: Multi-theme ZIP export (all themes in one SD build action)
- **THEME-07**: "Resync from collection" action when master tokens have changed since theme creation

## Out of Scope

| Feature | Reason |
|---------|--------|
| Theme inheritance chains | Requires resolver complexity; flat per-theme model covers current use case |
| Multi-dimensional theme permutation (mode × brand matrix) | Needs sd-transforms permutateThemes + UX redesign; v2+ |
| Real-time cross-theme diff view | Analytical feature, not core authoring |
| Automatic propagation of master collection edits into themes | Silent mutations are dangerous; resync must be explicit |
| Token alias resolution across theme boundaries | Circular reference risk; SD must do resolution after merge |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| THEME-01 | Phase 10 | Complete |
| THEME-02 | Phase 10 | Complete |
| THEME-03 | Phase 10 | Pending |
| THEME-04 | Phase 10 | Complete |
| EDIT-01 | Phase 11 | Pending |
| EDIT-02 | Phase 11 | Pending |
| EDIT-03 | Phase 11 | Pending |
| EDIT-04 | Phase 11 | Pending |
| EXPORT-01 | Phase 12 | Pending |
| EXPORT-02 | Phase 12 | Pending |
| EXPORT-03 | Phase 12 | Pending |

**Coverage:**
- v1.4 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 — traceability confirmed during roadmap creation*
