# Phase 14: dark mode support - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Add `colorMode` (light/dark) support to the token export system. Each theme — including the default/master — carries a `colorMode` field. Exports include both light and dark token sets in a single combined output, structured so consuming design systems can apply the correct mode at runtime. This phase is about tokens and exports, not theming the app shell UI.

</domain>

<decisions>
## Implementation Decisions

### Dark mode representation
- Modes are baked into themes — NOT a separate axis. Each theme is either light or dark.
- Every theme (including the default collection) has a `colorMode: "light" | "dark"` field.
- The default/master theme is always `"light"` (not user-changeable).
- Custom themes have an editable `colorMode` — set at creation and changeable after.
- Only Light and Dark modes supported — no custom mode names.
- Each theme has its own token store (consistent with existing theme architecture).

### Token pairing UI
- `colorMode` is selectable in the **Create Theme** dialog (light/dark).
- `colorMode` is also editable on existing themes via a **theme settings panel or popover** (e.g., "..." menu on theme).
- Theme selector badges show a visual indicator of the mode (light/dark) for each theme chip.

### Export format — CSS/SCSS
- Dark mode tokens are wrapped in `[data-color-mode="dark"]` attribute selector.
- Light and dark are combined in a single output file (`:root { }` for light, `[data-color-mode="dark"] { }` for dark).
- GitHub export follows the same combined pattern — same file structure, not separate files per mode.

### Export format — Figma Variables
- `colorMode` maps to a Figma Variable Mode — themes with the same group structure are merged into one Figma collection with two modes (Light/Dark).
- Themes with different group structures are exported as separate Figma collections.

### Export format — JS/TS
- Dark mode tokens use the **same key names** as their light counterparts (no renaming).
- Dark tokens are exported as separate objects (e.g., `tokens.dark`) with matching structure.

### Scope
- `colorMode` applies per-theme, collection-wide — all groups within a theme share the same mode.
- `colorMode` is primarily metadata for export + a badge in the UI. The token table editing experience does not change based on mode.

### Claude's Discretion
- Exact badge design (icon, label, color) on theme chips.
- Positioning of colorMode field within the theme settings popover.
- How to handle edge cases where a collection has only dark themes and no light theme (warn, export as-is, etc.).

</decisions>

<specifics>
## Specific Ideas

- Theme chips/selector should show a light/dark badge (user specifically requested this).
- Future capability noted: merge light and dark values into CSS `light-dark()` function output for DS build pipelines — not in this phase, captured for later.

</specifics>

<deferred>
## Deferred Ideas

- CSS `light-dark()` function output — combining light and dark values into native CSS `light-dark(color1, color2)` syntax for design system builds. A future export format enhancement.

</deferred>

---

*Phase: 14-dark-mode-support*
*Context gathered: 2026-03-25*
