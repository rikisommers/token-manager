# Phase 9: Add tokens modes - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a Themes system to token collections. A "theme" is a named configuration that assigns each token group a state (Disabled / Enabled / Source). Themes live per collection. The phase delivers:
1. A **Themes page** — dedicated tab in the collection nav to create/manage themes and assign groups to them
2. A **theme selector** on the Tokens page — filters the group tree to show only Enabled/Source groups for the active theme

**Out of scope this phase:** Wiring themes into the build/export pipeline (deferred to a follow-up phase).

</domain>

<decisions>
## Implementation Decisions

### Theme scope
- Themes are per-collection (not per-group)
- All token groups in a collection are managed through the Themes page

### Themes page navigation
- Themes is a new tab in the collection sidebar, alongside Tokens
- Same shell/layout as the Tokens page
- Navigation: `/collections/[id]/themes` or equivalent scoped route

### Themes page layout
- **Left panel:** list of themes — same add/remove interaction pattern as the group list on the Tokens page ("+" to add, same pattern for rename/delete as groups use)
- **Right panel:** when a theme is selected, shows all token groups in the collection as rows
- Each row has a **3-state button group**: Disabled / Enabled / Source
  - **Disabled:** group not included in this theme
  - **Enabled:** all tokens in the group included
  - **Source:** for Figma Variables — ensures references between collections remain intact

### Theme creation
- Same UX pattern as adding groups on the Tokens page (inline "+" or similar affordance in the left panel)
- Only a name is required

### Theme selector on Tokens page
- A dropdown/select at the top of the Tokens page
- Default state: no theme selected — shows all groups (unchanged from current behavior)
- When a theme is selected: only Enabled and Source groups appear in the tree; Disabled groups are hidden entirely

### Token editing with theme active
- Themes control group visibility, not per-token values — tokens still have one value per row
- Full add/edit token functionality is available regardless of active theme
- Selecting a theme only filters the visible groups

### Default state logic
- **Creating first theme:** all existing groups default to Enabled
- **Adding a new group to a collection that has themes:** defaults to Disabled in all existing themes
- **Deleting a theme:** theme record is removed; all groups remain in the collection untouched

### Claude's Discretion
- Exact layout/styling of the button group (Disabled / Enabled / Source)
- Visual distinction between Enabled and Source rows in the right panel
- Whether theme selector on Tokens page persists across navigation (session state)
- Error states (e.g., attempting to delete the last theme)

</decisions>

<specifics>
## Specific Ideas

- Themes page should feel similar to the Tokens page — same shell, groups list replaced by themes list
- The 3-state button group (Disabled / Enabled / Source) is the primary interaction on the right panel
- The theme selector on the Tokens page is a simple dropdown — "All groups" as default/empty state
- Build pipeline output per theme: each theme gets its own entry in the config page (deferred phase will wire this up)

</specifics>

<deferred>
## Deferred Ideas

- **Build pipeline integration** — wiring themes into CSS/Style Dictionary output, per-theme file generation. Config page already shows per-theme output entries; actual build integration is a separate follow-up phase.

</deferred>

---

*Phase: 09-add-tokens-modes*
*Context gathered: 2026-03-19*
