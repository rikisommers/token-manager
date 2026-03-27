# Requirements: ATUI Tokens Manager

**Defined:** 2026-03-20
**Core Value:** Token collections are always available and editable: stored in MongoDB, accessible via collection-scoped URLs, with per-collection Figma/GitHub config, full CRUD from the collections grid, Figma import/export fully integrated, and a Themes system for filtering active token groups.

## v1.4 Requirements

Requirements for milestone v1.4 — Theme Token Sets. Phases start at Phase 10.

### Theme Data Model

- [x] **THEME-01**: Each theme stores a full copy of all collection token data embedded in the theme document
- [x] **THEME-02**: Theme creation initializes embedded token data as a 1:1 deep copy of the collection's current tokens
- [x] **THEME-03**: Pre-existing themes without token data are migrated via a one-time script before any reading code ships
- [x] **THEME-04**: Theme creation enforces a maximum of 10 themes per collection to prevent MongoDB document size overflow

### Token Editing

- [x] **EDIT-01**: Group state controls token display when a theme is active: Enabled shows theme token values (editable), Source shows collection-default values (read-only), Disabled hides the group from the tree
- [x] **EDIT-02**: User can edit token values inline on the Tokens page when an Enabled group is selected under an active theme
- [x] **EDIT-03**: Inline token edits are saved to the active theme's embedded token data (not the master collection)
- [x] **EDIT-04**: Tokens whose values differ from the collection default are visually indicated (override indicator)

### Export

- [x] **EXPORT-01**: User can select which theme (or collection default) to target for export on the Config page
- [x] **EXPORT-02**: Style Dictionary export uses the selected theme's token values for the active export
- [x] **EXPORT-03**: Figma Variables export generates one mode per enabled theme in the collection

## Phase 14 Requirements

Requirements for Phase 14 — Dark Mode Support.

### Dark Mode

- [x] **DARK-01**: Every theme (including the default/master) carries a `colorMode: "light" | "dark"` field. The default/master is always `"light"`. Custom themes have a user-settable colorMode.
- [x] **DARK-02**: Theme creation API (POST) accepts `colorMode` in the request body (defaults to `"light"`). Theme update API (PUT) accepts `colorMode` as a patchable field.
- [x] **DARK-03**: Theme UI shows a colorMode badge (sun for light, moon for dark) on each theme item. Create Theme dialog includes a light/dark selector. Existing themes can have their colorMode toggled via a settings action.
- [x] **DARK-04**: CSS/SCSS/LESS build output combines light tokens in `:root {}` and dark tokens in `[data-color-mode="dark"] {}` in a single file when both light and dark themes exist in the collection.
- [x] **DARK-05**: Figma Variables export groups themes by group structure: themes with the same group structure and different colorModes are exported as "Light" and "Dark" modes in one Figma variable collection.
- [x] **DARK-06**: All Phase 14 features verified working end-to-end: badge display, create dialog, colorMode toggle, combined CSS export, JS/TS dark namespace export, Figma mode grouping.

## Future Requirements

### Token Mutations (deferred from v1.2 Phase 7)

- **TREE-04**: User can add a new group from the tree sidebar (as a child of any node, or at root level)
- **TREE-05**: Tree nodes can be expanded and collapsed (expand/collapse toggle per node)
- **CONT-02**: User can add tokens to the currently selected group

### Theme Enhancements (v1.4.x+)

- **THEME-05**: Override indicator includes a reset-to-collection-default action per token
- **THEME-06**: Multi-theme ZIP export (all themes in one SD build action)
- **THEME-07**: "Resync from collection" action when master tokens have changed since theme creation

## Phase 15 Requirements

Requirements for Phase 15 — Multi-Row Actions.

### Bulk Token Operations

- **BULK-01**: Token table has an always-visible checkbox column (leftmost, ~40px); header checkbox toggles all; shift-click range selection; checkboxes hidden when active group is in Source mode; switching groups clears the selection
- **BULK-02**: A floating action bar appears above the token table when one or more rows are selected; bar shows "N selected"; Escape key clears selection and hides bar; bar disappears when no rows are selected
- **BULK-03**: Bulk delete removes all selected tokens after a confirmation dialog; operation is undoable via Ctrl+Z as a single step
- **BULK-04**: Bulk move reassigns selected tokens to a destination group chosen via a group-tree-picker modal; path collisions are resolved by auto-suffixing with a numeric index; operation is undoable via Ctrl+Z
- **BULK-05**: Bulk change type sets all selected tokens to the same type at once; operation is undoable via Ctrl+Z
- **BULK-06**: Bulk add prefix renames selected token paths inline with live preview; bulk remove prefix auto-detects the longest common prefix and pre-fills the input; within-group alias references are rewritten after rename; non-matching tokens silently skipped for remove; both operations undoable via Ctrl+Z
- **BULK-07**: All bulk operations route through themeTokens/onThemeTokensChange when a custom theme is active (Enabled groups only); undo integrates with the existing undo stack in both Default and theme modes

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
| THEME-03 | Phase 10 | Complete |
| THEME-04 | Phase 10 | Complete |
| EDIT-01 | Phase 11 | Complete |
| EDIT-02 | Phase 11 | Complete |
| EDIT-03 | Phase 11 | Complete |
| EDIT-04 | Phase 11 | Complete |
| EXPORT-01 | Phase 12 | Complete |
| EXPORT-02 | Phase 12 | Complete |
| EXPORT-03 | Phase 12 | Complete |
| DARK-01 | Phase 14 | Planned |
| DARK-02 | Phase 14 | Planned |
| DARK-03 | Phase 14 | Planned |
| DARK-04 | Phase 14 | Planned |
| DARK-05 | Phase 14 | Planned |
| DARK-06 | Phase 14 | Planned |
| BULK-01 | Phase 15 | Planned |
| BULK-02 | Phase 15 | Planned |
| BULK-03 | Phase 15 | In Progress (core logic done in P01) |
| BULK-04 | Phase 15 | In Progress (core logic done in P01) |
| BULK-05 | Phase 15 | In Progress (core logic done in P01) |
| BULK-06 | Phase 15 | In Progress (core logic done in P01) |
| BULK-07 | Phase 15 | In Progress (core logic done in P01) |

**Coverage:**
- v1.4 requirements: 11 total
- Phase 14 requirements: 6 total
- Phase 15 requirements: 7 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-27 — Phase 15 multi-row actions requirements added*
