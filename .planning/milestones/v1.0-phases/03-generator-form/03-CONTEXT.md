# Phase 3: Generator Form - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Add "Save to Database" and "Load Collection" buttons to the generator form so users can persist token collections to MongoDB, reload them for editing, and save changes back. All existing generator functionality (GitHub import, Figma export, GitHub PR export, format download, JSON preview) is unchanged.

</domain>

<decisions>
## Implementation Decisions

### Save dialog behavior
- Use a **modal dialog** for the collection name prompt (not inline or browser prompt)
- If the typed name already exists: warn with "A collection named X already exists. Overwrite it?" and Overwrite/Cancel options — do not silently overwrite
- "Save to Database" button lives in the **top action bar**, grouped with existing export/action buttons
- On successful save: show a **toast notification** ("Saved to database: [name]") — brief, non-blocking, auto-dismisses

### Load dialog behavior
- **Simple scrollable list** of collection names — no search filter needed
- Display **name only** per item — no date or token count
- "Load Collection" button placed **next to "Save to Database"** in the top action bar
- If no collections exist: open the dialog anyway and show an **empty state message** ("No collections saved yet") — don't disable the button or show a toast instead

### Edit & overwrite flow
- When a collection is loaded and user clicks "Save to Database": **pre-fill the modal name field** with the loaded collection's name, then proceed through the standard duplicate-name confirmation flow before overwriting
- Show a **"Editing: [name]" label** near the Save/Load buttons so the user always knows which collection is active
- After saving (overwriting), the loaded-collection state **stays set** — repeated saves keep targeting the same collection

### Unsaved changes handling
- If user has unsaved changes and clicks "Load Collection": show a **confirmation dialog** ("You have unsaved changes. Loading a collection will replace them. Continue?")
- **Dirty flag** tracks any change since last save or last load — covers both loaded-collection edits and fresh unsaved work
- The **existing "clear form" action** should also clear the loaded-collection state — after clearing, the "Editing: X" indicator disappears and the next Save prompts for a fresh name

### Claude's Discretion
- Exact modal and dialog styling (consistent with existing modal patterns in the app)
- Loading/spinner states while fetching the collections list in the Load dialog
- Error handling if save or load API calls fail (toast the error, stay in modal)

</decisions>

<specifics>
## Specific Ideas

- The "Editing: X" indicator should be subtle — a small label, not a banner. Something that's visible at a glance but doesn't compete with the form itself.
- There is already an existing "clear form" action in the generator — hook into it to reset collection state rather than adding a new button.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-generator-form*
*Context gathered: 2026-02-26*
