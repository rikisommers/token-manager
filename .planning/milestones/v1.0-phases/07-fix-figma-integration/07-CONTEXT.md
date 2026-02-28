# Phase 7: Fix Figma Integration - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the broken Figma export flow (currently uses prompt() dialogs, wrong auth header). Add persistent Figma credentials storage (like GitHub config). Add import-from-Figma action to save a Figma variable collection as a MongoDB collection. Highlight the upstream source (GitHub or Figma) on both View and Generate tabs. Export-to-Figma updates source metadata. No new token editing capabilities or UI pages.

</domain>

<decisions>
## Implementation Decisions

### Figma credentials dialog
- Button lives in the app header alongside the GitHub config button — same consistent pattern
- Stores personal access token + Figma file URL (the app auto-extracts the file key from the URL)
- Green dot indicator on the button when credentials are configured (matches GitHubConfig behavior)
- Dialog includes an explicit "Test Connection" button that calls `figma.service.ts testConnection()` — green indicator only shows if test passed

### Import-from-Figma flow
- Trigger: A button inside the Generate tab header/actions area (not the app header, not both tabs)
- After opening: Fetch all variable collections from the stored Figma file, show a picker — user selects which one to import
- Mode handling: Import all modes as a multi-brand collection (each mode becomes a brand key in the token structure, matching the existing multi-brand format)
- After conversion: Show a name prompt dialog (pre-filled with the Figma collection name), user confirms → auto-save to MongoDB with Figma as the source

### Source bar (upstream indicator)
- Location: A slim context bar below the tab switcher, visible on both View and Generate tabs
- Content: Icon + source type + identifier — e.g., Figma icon + file name/key, or GitHub icon + owner/repo
- Hidden entirely when the selected collection has no upstream source (no bar for manual/local collections)
- No warning text in the bar itself — warnings about "pushing will affect upstream" are shown only inline within the Push/Export action dialogs

### Export-to-Figma behavior
- After a successful export, the MongoDB collection is updated to mark Figma as its upstream source (file key stored in sourceMetadata)
- Export dialog pre-fills the file key from FigmaConfig but allows override for one-off exports
- User picks the target Figma variable collection from a dropdown (fetched from the file) — prevents accidental overwrites
- Multi-brand structure is preserved: each brand in the collection maps to a corresponding mode in the Figma variable collection

### Claude's Discretion
- Exact visual styling of the source context bar (colors, border, padding)
- How to handle the case where a Figma collection picker fails to load (error state)
- The sourceMetadata schema extension for Figma fields (fileKey, collectionId, type discriminator)
- Fix to the export API route auth header (use X-Figma-Token instead of Authorization: Bearer)

</decisions>

<specifics>
## Specific Ideas

- The FigmaConfig component should mirror GitHubConfig.tsx closely — same localStorage pattern, same dialog style, same green-dot connection indicator
- Import modal flow: 1) Pick Figma variable collection → 2) App fetches and converts all modes → 3) Name dialog → 4) Save. One linear flow, no back-navigation needed.
- The source context bar should feel lightweight — not a warning banner, just quiet contextual info (icon + text, muted style)
- Export dialog warning about upstream: only shown inline in the export action dialog, not as persistent UI

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-fix-figma-integration*
*Context gathered: 2026-02-28*
