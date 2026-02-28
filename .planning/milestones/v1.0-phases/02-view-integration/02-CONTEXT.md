# Phase 2: View Integration - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a collection selector to the View Tokens page so users can browse tokens from any MongoDB collection or from local files. The selector lists all MongoDB collections by name alongside a "Local Files" option. Selecting any source renders its tokens in the existing TokenTable UI. Creating, saving, or managing collections is out of scope — that is Phase 3 and 4.

</domain>

<decisions>
## Implementation Decisions

### Selector placement & style
- Dedicated full-width bar above the token table (not inline with existing controls)
- Native HTML `<select>` element — no custom dropdown component
- Two groups separated by an `<optgroup>` divider: "Local" group first (containing "Local Files"), then "Database" group (containing MongoDB collections)
- Name only — no token count or date metadata in options

### Default/initial selection
- Local Files is selected by default on first page load
- Last selected collection is persisted in localStorage
- If the localStorage-remembered collection no longer exists in MongoDB, fall back to Local Files silently (no error shown, no toast)

### Loading behavior
- Progressive loading: page mounts with "Local Files" already in selector; MongoDB collections are appended to the selector once the API call resolves (no blocking spinner on the selector itself)
- When a collection is selected and its tokens are fetching: show a spinner overlay on the existing token table (layout stays stable)
- Selector stays enabled during token loading — user can switch at any time; in-flight token fetch is cancelled using AbortController

### Empty & error states
- If no MongoDB collections exist: show only "Local Files" — the Database optgroup is omitted entirely (no "No collections" placeholder item)
- If the MongoDB collections list fetch fails: fall back to showing Local Files only, show a brief error toast
- If a specific collection's token data fails to load: show error toast + leave selector positioned on the failed collection, token table shows empty/cleared

### Claude's Discretion
- Toast implementation (duration, position, styling) — use whatever toast mechanism the app already has, or a simple inline one if none exists
- Exact spinner overlay appearance
- AbortController integration details

</decisions>

<specifics>
## Specific Ideas

- No specific visual references provided — standard approaches are fine
- The experience should feel continuous with the current View Tokens page (no jarring changes to the table area or page layout)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-view-integration*
*Context gathered: 2026-02-25*
