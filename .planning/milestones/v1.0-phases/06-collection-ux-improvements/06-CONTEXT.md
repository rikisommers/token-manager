# Phase 6: Collection UX Improvements - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Merge the View Tokens and Generate Tokens pages into a single tabbed page. Add a shared collection management header above both tabs. Move inline color editing from View to Generate. Add Save As Collection and New Collection actions. The result is a clean split: View tab = read-only, Generate tab = edit mode.

</domain>

<decisions>
## Implementation Decisions

### Page Architecture
- Merge / and /generate into a single route at / with `?tab=view|generate` query param
- `View` and `Generate` are tabs inside one page — NOT separate routes
- `/generate` redirects to `/?tab=generate`
- Both tabs share collection context — selecting a collection in the shared header affects both tabs

### Shared Header (above both tabs)
The shared header sits above the tab switcher and is always visible. It contains:
1. **Collection Selector** — dropdown listing all MongoDB collections + "Local Files"
2. **Save As Collection** button — always visible, saves current tokens (from either tab's active view) as a new named collection; opens SaveCollectionDialog prompt for name
3. **New Collection** button — always visible; clears the Generate form and switches to the Generate tab (blank editor for a fresh token set)
4. **CollectionActions** (Delete / Rename / Duplicate) — visible when a MongoDB collection is selected (hidden for Local Files)

Save As Collection behaviour:
- When Local Files is selected: saves the currently displayed local file tokens as a new MongoDB collection
- When a MongoDB collection is selected: acts as "Save As" (creates a named copy)
- After saving: stays on current tab, selector updates to the new collection automatically

### Tab: View (read-only)
- Displays the token table for whatever is selected in the shared selector
- No inline color editing (removed from View tab)
- No action buttons specific to View — all actions are in the shared header
- Unchanged from current View Tokens behaviour except removal of color editing

### Tab: Generate (edit mode)
- Full TokenGeneratorFormNew editor — all existing generator form functionality retained
- Inline color editing lives here (moved from View tab)
- Form-specific action buttons remain inside the Generate tab (NOT moved to shared header):
  - Preview JSON
  - Load Collection (dialog remains for quick load within the form)
  - Download JSON
  - Push to GitHub
  - Import from GitHub
  - Export to Figma
- CollectionActions (Delete/Rename/Duplicate) are shared header items — NOT duplicated inside the Generate tab

### Switching tabs with a collection loaded
- Collection stays selected; tab loads its content for that collection
- No unsaved-changes warning when switching tabs (Generate form state is preserved in memory while tab is inactive)

### New Collection flow
- "New Collection" button in shared header clears the Generate form and switches to the Generate tab
- Same as the existing "Clear form" flow — sets loadedCollection to null, clears token groups

### Save As Collection (shared header) — post-save
- After save: stays on current tab, selector updates to the newly saved collection, toast confirms

### Claude's Discretion
- Tab switcher component design (pill tabs, underline tabs, etc.)
- Exact spacing and layout of the shared header row
- Whether to use a sticky header as the page scrolls

</decisions>

<specifics>
## Specific Ideas

- Generate tab = "edit mode" was the user's framing — keep that mental model in UI copy if any labels are needed
- View tab should feel like a clean read-only display — no clutter, no action buttons inline
- The shared header is the control panel: selector + actions, always accessible

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within the phase scope

</deferred>

---

*Phase: 06-collection-ux-improvements*
*Context gathered: 2026-02-27*
