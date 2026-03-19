# Phase 11: Inline Token Editing UI - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Theme-aware token value editing on the Tokens page. When a theme is active, users edit token values for that theme's "Enabled" groups — edits save to the theme's embedded token data, not the master collection. "Source" groups display collection defaults (read-only). "Disabled" groups are hidden from the tree.

A "Default" theme always exists and is always selected — editing in Default mode edits the master collection tokens directly (existing behavior).

</domain>

<decisions>
## Implementation Decisions

### Theme Selector Placement
- Header bar dropdown on the Tokens page, next to the collection name
- Compact, always visible, doesn't change the page layout
- Hidden entirely when no named themes exist (collection-only state)
- When themes exist, "Default" is always the first option and is pre-selected

### Default Theme Behavior
- There is always a selected theme — no "no-theme" state
- "Default" theme = editing the master collection directly (existing behavior)
- Default theme is always first in the dropdown and auto-selected on page load
- All token fields are editable in Default mode (same as current behavior)

### Theme Switching
- Switching themes keeps context — if the current group is Enabled in the new theme, stay on it; if not (Disabled/unavailable), fall back to first available Enabled group
- The entire Tokens page reflects the active theme: group tree shows only Enabled groups (Disabled ones hidden), token values show the theme's values

### Editing Interaction
- Click the value cell to edit inline (text → input on click)
- Auto-save on blur or Enter key — no explicit save button
- Source group values: no edit cursor, visually read-only (no click-to-edit)
- Disabled groups: not shown in the group tree at all

### Reset to Default
- A reset icon is always visible beside token values that differ from the collection default
- Clicking reset restores the collection default value for that token in the active theme
- No general "override indicator" — theme values are expected to differ, so no badge/dot/color needed beyond the reset button itself

### Claude's Discretion
- Exact reset icon design (follow existing icon patterns in codebase)
- Inline input styling (width, focus ring, etc.)
- Loading/saving state feedback during PATCH calls
- Error handling for failed saves

</decisions>

<specifics>
## Specific Ideas

- Mental model the user described: `collection → theme1 (default) → colors / theme2 (dark) → colors` — each theme owns its own copy of the group values
- The reset button should be always visible (not hover-only) when a value differs from the default
- Source groups: no tooltip needed, just non-editable cursor is sufficient

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-inline-token-editing-ui*
*Context gathered: 2026-03-20*
