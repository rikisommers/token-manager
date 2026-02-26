# Phase 4: Collection Management - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can delete, rename, and duplicate MongoDB collections from within the tool. Local Files collections are read-only and not affected by these operations. Creating collections is a separate phase.

</domain>

<decisions>
## Implementation Decisions

### Action Surface
- Action buttons appear **below the collection selector** when a collection is active
- Buttons are hidden entirely when "Local Files" is selected — MongoDB collections only
- Three icon + label buttons: 🗑️ Delete, ✏️ Rename, 📋 Duplicate

### Rename Interaction
- Clicking Rename opens a **modal dialog** pre-filled with the current collection name
- Modal has Save and Cancel buttons
- **Inline validation**: if the typed name already exists in MongoDB, show an error message in the modal and disable the Save button
- After successful save: selector updates immediately (optimistic), modal closes

### Duplicate Flow
- Clicking Duplicate opens a **modal dialog** pre-filled with "Copy of [original name]"
- Same Save/Cancel pattern as rename modal
- After successful duplication: **switch to the new duplicate collection** as the active selection
- What gets copied: **token data + source metadata** (fresh createdAt/updatedAt timestamps)

### Feedback & Confirmation
- Delete: **modal confirmation dialog** — "Delete '[collection name]'? This cannot be undone." with Delete/Cancel buttons
- Delete button uses **red/destructive styling**, and the Delete button inside the confirmation modal is also red
- Success and failure communicated via **toast notifications** ("Collection deleted", "Renamed to [new name]", "Duplicated as 'Copy of [name]'")
- After a successful delete: **empty/no selection state** — selector cleared, user must choose a collection

### Claude's Discretion
- Exact toast library or implementation (native or existing UI component)
- Animation/transition details for modal open/close
- Exact wording of error messages (beyond the patterns described above)
- Loading/spinner state during async operations

</decisions>

<specifics>
## Specific Ideas

- No specific UI references provided — open to standard patterns that match the existing app's style

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-collection-management*
*Context gathered: 2026-02-26*
