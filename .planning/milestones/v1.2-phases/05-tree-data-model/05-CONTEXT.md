# Phase 5: Tree Data Model - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Parse token group path names into a `TokenGroup[]` tree structure and render the hierarchy in the sidebar. This phase covers the data model and static visual rendering only. Node selection, breadcrumbs, and content scoping are Phase 6. Adding groups/tokens is Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Tree state
- Tree is always fully expanded — no collapse functionality
- No expand/collapse toggle controls at all (simplifies implementation; deviates from TREE-05 by user decision)
- All nodes visible at all times

### Node appearance
- Indentation only to communicate hierarchy — no connecting lines, no folder icons
- Parent nodes (those with children) use **bold** labels
- Leaf nodes (no children) use normal weight
- No hover state in this phase — interaction styles added in Phase 6
- Compact density (small line height, tight padding)

### Path parsing rules
- Split path by `/`
- Strip `.json` extension from the final segment only
- Apply title-case with separator removal to each segment:
  - Hyphens and underscores become spaces: `border-color` → `Border Color`, `border-radius` → `Border Radius`
  - Capitalize first letter of each word
  - `brand1`, `brand2` → `Brand1`, `Brand2` (no separator present, just capitalize first letter)
- Numeric-only segments shown as-is
- Real data examples (from "Design Tokens" collection):
  - `brands/brand1/color.json` → **Brands > Brand1 > Color**
  - `brands/brand2/color.json` → **Brands > Brand2 > Color**
  - `globals/border-color.json` → **Globals > Border Color**
  - `globals/border-radius.json` → **Globals > Border Radius**
  - `globals/breakpoint.json` → **Globals > Breakpoint**

### Sidebar layout
- Tree **replaces** the existing `TokenGeneratorFormNew` sidebar content
- Sidebar section heading: **"Groups"**
- Namespace label from `TokenGeneratorFormNewProps.namespace` (optional string prop) rendered as a read-only label **above the tree**, serving as a section heading/prefix context
- Empty state: short message (e.g. "No groups yet") when collection has no token groups

### Claude's Discretion
- Exact indentation amount per level
- Typography details (font size, color) for node labels — match existing sidebar patterns
- Empty state illustration or icon, if any

</decisions>

<specifics>
## Specific Ideas

- Namespace prop lives on `TokenGeneratorFormNewProps` as `namespace?: string` — read it from there, render it as a read-only label above the tree
- Real group structure in "Design Tokens" collection: two top-level namespaces (`brands`, `globals`), with `brands` having two child folders (`brand1`, `brand2`)

</specifics>

<deferred>
## Deferred Ideas

- **+ button on tree nodes to add subgroups** — This is TREE-04, scoped to Phase 7 (Mutations). User wants it, but it belongs in Phase 7.
- **Expand/collapse per node** — TREE-05 was skipped by user decision (always-expanded preferred). Could be re-added as a future enhancement if collections grow very large.

</deferred>

---

*Phase: 05-tree-data-model*
*Context gathered: 2026-03-12*
