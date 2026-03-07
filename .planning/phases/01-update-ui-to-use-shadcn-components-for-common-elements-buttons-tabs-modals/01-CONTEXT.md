# Phase 1: shadcn UI Component Migration - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace all common UI elements (buttons, tabs, modals/dialogs, inputs, selects) across the entire app with shadcn/ui components. Also replace all color token fields with native `<input type="color">` pickers (or a shadcn-compatible alternative if one exists — researcher to confirm).

**Note:** The phase directory is named "shadcn" which matches this intent. A prior ATUI Stencil web component migration was attempted and rolled back — that work is preserved in the `atui` branch.

</domain>

<decisions>
## Implementation Decisions

### Component coverage
- Replace `<button>` with shadcn `Button` everywhere
- Replace `<input>` with shadcn `Input` everywhere
- Replace `<select>` with shadcn `Select` everywhere
- Replace tabs UI with shadcn `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent`
- Replace modals/dialogs with shadcn `Dialog`
- Target all common elements: Button, Tabs, Dialog, Input, Select (full migration)

### Color picker fields
- Researcher to confirm: does shadcn have a color-aware input or color picker component?
- If no shadcn color picker: use native `<input type="color">` (live update via onInput, no text input alongside)
- Show color picker ONLY on fields explicitly typed as color (use token `type: 'color'` metadata, not hex heuristics)

### Migration scope
- Replace everywhere — all components and pages in `src/` (skip `/dev-test` sandbox page)
- Do NOT carry over any ATUI-specific patterns from the rolled-back implementation

### Registration strategy
- shadcn components are standard React components — no custom element registration or provider wrapper needed
- No AtuiProvider, no defineCustomElements, no custom JSX namespace types needed

### ATUI work preservation
- All ATUI migration work is preserved in the `atui` branch — do not delete it
- The `atui` branch can be revisited in a future milestone if the ATUI dist/react approach proves viable

### Claude's Discretion
- shadcn component variant mapping (e.g. primary/secondary → shadcn variant names)
- Whether to use shadcn's default theme or adapt to the existing Tailwind color scheme

</decisions>

<specifics>
## Specific Ideas

- The `/dev-test` sandbox page is kept as a reference — do not delete it
- Prior ATUI implementation is in the `atui` branch for reference if needed

</specifics>

<deferred>
## Deferred Ideas

- ATUI Stencil web component migration — preserved in `atui` branch for a future milestone (depends on ATUI providing a reliable dist/react React wrapper package)

</deferred>

---

*Phase: 01-update-ui-to-use-shadcn-components-for-common-elements-buttons-tabs-modals*
*Context gathered: 2026-03-08*
