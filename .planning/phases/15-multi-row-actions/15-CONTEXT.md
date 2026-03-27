# Phase 15: multi-row-actions - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Add multi-row selection to the token table and a contextual bulk-action bar. Users can select multiple tokens within the active group and perform bulk operations: delete, move to group, change type, and add/remove prefix. Single-token editing, group management, and theme management are out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Selection model
- Checkboxes are always visible on every token row (not hidden until hover)
- Leftmost column, narrow fixed width (~40px)
- Header checkbox toggles all rows (select-all / deselect-all)
- Shift-click range selection supported
- Selection scoped to the currently active group only — cross-group selection not supported
- Selecting a different group clears the current selection

### Bulk actions available
- **Delete** — remove all selected tokens; requires confirmation dialog before executing
- **Move to group** — reassign selected tokens to a destination picked via a group-tree-picker modal (not a flat dropdown)
- **Change type** — set all selected tokens to the same type at once (one type picker, applied to all)
- **Add prefix** — inline action in the action bar; text input expands with live rename preview as user types
- **Remove prefix** — separate action from add; auto-detects the longest common prefix of selected tokens and pre-fills the input field; user can edit; non-matching tokens are silently skipped

### Conflict handling
- Both rename (add/remove prefix) and move-to-group conflicts resolved by **auto-suffixing** with a numeric index (e.g. `token-name-2`, `token-name-3`)
- No blocking or warning dialogs for conflicts — always proceed with auto-suffix

### Action bar
- Floating bar appears **above the token table** when one or more rows are selected; disappears when none are selected
- Bar displays a selection count: "N selected"
- Actions in bar: Delete, Move to group, Change type, Add prefix, Remove prefix
- **Escape** keyboard shortcut clears selection and hides the bar
- Only **Delete** requires a confirmation dialog before executing

### Scope & constraints
- Checkboxes hidden entirely when the active group is in **Source mode** (read-only under a theme) — consistent with existing read-only behaviour
- Multi-row actions work in both **Default theme** and **custom themes** (Enabled groups only)
- All bulk operations integrate with the **undo stack** (Ctrl+Z undoes a bulk action as a single step)

### Selected row styling
- Selected rows get a highlight matching the **existing focus/hover style** in the current design (not a new blue tint — use whatever is already used for focused state)

### Empty state
- If all tokens in a group are bulk-deleted, show the **existing empty state** for the group — no special bulk-delete empty state needed

</decisions>

<specifics>
## Specific Ideas

- Prefix add/remove should feel like multi-cursor editing in a text editor — inline, immediate, live preview
- Auto-detect common prefix for Remove Prefix pre-fills the input so the user rarely needs to type anything
- Action bar floating above the table (not sticky bottom) — like Notion / Linear contextual bars

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 15-multi-row-actions*
*Context gathered: 2026-03-27*
