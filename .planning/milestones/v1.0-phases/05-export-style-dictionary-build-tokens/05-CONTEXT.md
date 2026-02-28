# Phase 5: Export style dictionary build tokens - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Run a style-dictionary build pipeline against the currently loaded/selected token collection and display the build output in a modal. The build produces per-brand, per-format output files (CSS, SCSS, LESS, JS, TS, JSON) that the user can copy or download as a ZIP. Scheduling, persisting build output to MongoDB, and GitHub publishing are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Build engine
- Use the actual `style-dictionary` npm package running server-side (API route)
- Do NOT reuse `file.service.ts` client-side exports — this is a proper server-side build pipeline
- The API endpoint receives the live token JSON from the client and returns all built format outputs

### Output formats
- Always build all 6 formats: CSS, SCSS, LESS, JS, TS, JSON
- No user selection of formats — all 6 always built in one request
- Formats match the existing `file.service.ts` format set

### Token normalization & naming
- Namespace IS included in variable names: `--token-colors-primary` (not `--colors-primary`)
- Brand is NOT included in variable names — it is the output file name, not a variable prefix
- Naming convention: `--{namespace}-{category}-{token}` (e.g. `--token-colors-primary`)
- For multi-brand collections, produce one file per brand per format (e.g. `tokens-brand1.css`, `tokens-brand2.css`)
- Shared globals/palette tokens are included in every brand's output file (each brand file is self-contained)
- Apply Structure A/B detection and brand flattening before building so output is consistent regardless of input structure

### Source of truth
- Build from the currently loaded collection — whatever token state is in the generator form (live, including unsaved edits)
- On the View Tokens page, build from the currently selected collection in the collection selector
- "Build Tokens" button is disabled when no collection is loaded/selected

### Modal UI
- Top-level tabs: one per format (CSS, SCSS, LESS, JS, TS, JSON)
- Sub-tabs within each format tab: one per brand (brand1, brand2, etc.)
- Single-brand collections show no sub-tabs (just the format tab content directly)
- Per-tab: copy to clipboard button for the visible code block
- Above all tabs: single "Download All" button (scope is all brands × all formats)
- Button label: "Build Tokens"
- Loading state: spinner + "Building..." text in the button while the API call runs

### Download output
- "Download All" produces a ZIP file with all brand × format files
- ZIP structure: flat (all files in root, e.g. `tokens-brand1.css`, `tokens-brand1.scss`, `tokens-brand2.css` ...)
- ZIP filename: `{collection-name}-tokens.zip`

### UI placement
- "Build Tokens" button appears in the page header of BOTH the View Tokens page and the Generator page
- The build modal component must be shared/portable — no code duplication between pages
- On the View Tokens page: button state (enabled/disabled) tied to whether a MongoDB collection is selected (local files option = disabled)
- On the Generator page: button state tied to whether a collection is loaded

### Claude's Discretion
- Style-dictionary platform config structure (how to configure CSS, SCSS, LESS, JS, TS, JSON transforms)
- How to pass token data to style-dictionary server-side (in-memory, temp files, or programmatic API)
- Exact style-dictionary transform/format definitions to produce the naming convention
- Error state handling in the modal if the build fails

</decisions>

<specifics>
## Specific Ideas

- "All I want to do is present the build token output to the user via modal" — display-focused, not a file system build
- "Make sure the code is portable and can be used on both pages — we don't want to repeat code" — shared component/hook
- The button above the tabs makes the ZIP download scope obvious before the user interacts with individual tabs
- Multi-brand output: `tokens-brand1.css`, `tokens-brand2.css` etc. as flat files in the ZIP

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-export-style-dictionary-build-tokens*
*Context gathered: 2026-02-26*
