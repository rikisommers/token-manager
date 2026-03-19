# Feature Research

**Domain:** Per-theme token value sets in a design token manager (v1.4 milestone)
**Researched:** 2026-03-20
**Confidence:** HIGH (core patterns), MEDIUM (export format specifics)

---

## Context: What Already Exists

This is a subsequent milestone on an existing tool. The following features are already built and must not be re-planned:

- Per-collection theme CRUD (create/rename/delete themes)
- ThemeGroupMatrix: sets each group's state to Disabled/Enabled/Source
- Theme selector on Tokens page filters the group tree
- Token group tree sidebar with hierarchical navigation and breadcrumbs
- Tokens table (currently read-only)
- Figma import/export (variables collections)
- Style Dictionary v5 export (multi-format ZIP)

The v1.4 milestone adds: themes become actual token value stores, inline editing writes to the active theme, and export is theme-aware.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that any multi-theme token system must have. Missing these makes the feature feel incomplete or broken.

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| Theme embeds a full copy of token data on creation | Themes need isolated values; shared-reference model produces confusing cross-contamination | MEDIUM | Theme CRUD (v1.3), token group tree structure |
| Source group state = always reads collection default, not per-theme copy | The Tokens Studio Source concept is the industry standard; read-only reference semantics are expected by design system practitioners | LOW | ThemeGroupMatrix (v1.3) |
| Enabled group state = per-theme editable, shows theme value in table | Standard theme editing flow; seeing the theme's value (not collection default) when a theme is active is a baseline expectation | MEDIUM | Token table (v1.3), theme selector (v1.3) |
| Disabled group state = group hidden in tree when theme active | Already shipping in v1.3 — hidden groups stay hidden | ALREADY DONE | Tree sidebar (v1.2), theme selector (v1.3) |
| Inline value editing directly in the tokens table | Users expect spreadsheet-style editing, not a separate edit dialog for each token; a dedicated edit form per token is too slow | MEDIUM | Tokens table (v1.3) |
| Edited value saved to the active theme's embedded data, not the collection default | Without this, editing under a theme is meaningless — changes must be scoped to that theme | MEDIUM | Theme model (v1.3 MongoDB) |
| Visual distinction between "this value is overridden in the theme" vs "this value falls through to the collection default" | Users need to understand what is theme-specific vs inherited; Tokens Studio uses a visual indicator for this; without it, editors can't tell what they've customized | MEDIUM | Tokens table (v1.3) |
| Theme-aware SD export: select a theme, get theme values in output | SD multi-theme output (looping SD builds per theme, CSS class or file per theme) is the standard pattern | HIGH | SD export (v1.0), Config page (v1.1) |
| Figma Variables export: each enabled theme becomes a mode in the collection | Figma's own mode system is one-mode-per-collection-variable, one-mode-per-theme; this is the direct mapping all practitioners expect | HIGH | Figma export (v1.1) |
| Export collection default as a baseline mode or "Default" theme output | Users need a known-good fallback; SD and Figma both support a default mode | LOW | SD export (v1.0), Figma export (v1.1) |

### Differentiators (Competitive Advantage)

Features that go beyond table stakes for this specific context.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Override indicator with reset-to-default action | Lets users see at a glance which tokens have been customized in the active theme, and revert individual overrides without clearing the whole theme | MEDIUM | Tokens Studio has this; enhances inline editing UX significantly |
| Source group values always displayed from collection default (live passthrough) | Unlike a cloned copy that diverges silently, Source groups always show the current collection value — changes to collection propagate instantly | LOW | Semantically natural; avoids stale-copy bugs |
| Multi-theme SD export in a single ZIP (one file per theme) | Export all themes in one action rather than per-theme runs; aligns with the `permutateThemes` pattern from `sd-transforms` | MEDIUM | Useful for CI; requires looping SD builds server-side |
| Figma Variables JSON format conforming to REST API POST payload | The Figma Variables REST API POST body (`variableCollections`, `variableModes`, `variables`, `variableModeValues`) is the correct format for direct API sync — not just a readable JSON dump | HIGH | Already partially done for Figma export; extend to include modes per theme |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Token inheritance / alias resolution across themes | Users want `{color.brand.primary}` to resolve differently per theme | Aliases that cross theme boundaries create resolution ambiguity; the collection-default model with Source groups is simpler and avoids circular reference explosions | Use Source group state for shared reference tokens; only override primitive values per theme |
| Real-time cross-theme diff view | Seeing all themes side by side seems useful | Requires rendering multiple complete token sets simultaneously; massive complexity for a single-user internal tool | Single-theme view is sufficient; diff belongs in a future milestone if needed |
| Per-token theme inheritance with partial override chains | "Theme B inherits Theme A, overrides only color.bg.primary" | Inheritance chains require a resolver traversal at read time; MongoDB embedded documents make this very complex; Tokens Studio defers this to their multi-group theme system | Flat per-theme value store with Source fallback covers 90% of cases; defer inheritance chains |
| Automatic sync of theme data when collection tokens are edited | If collection default changes, auto-update all theme copies | Silent background mutations are dangerous; users can't tell what changed and in which themes | Manual "Reset group to collection default" per group; explicit, auditable |
| Live preview of theme applied to components | Showing rendered components with theme applied | Component rendering is out of scope for this tool (design system consumers render components, not the token manager) | Export theme and apply in Figma or consuming app |

---

## Feature Dependencies

```
[Embedded token data in theme document] (data model)
    └──required-by──> [Inline editing writes to theme]
    └──required-by──> [Source group passthrough reads from collection]
    └──required-by──> [Theme-aware SD export]
    └──required-by──> [Figma export with modes per theme]

[Inline editing in tokens table]
    └──requires──> [Embedded token data in theme document]
    └──requires──> [Active theme context in Tokens page state]
    └──requires──> [Group state awareness (Enabled vs Source vs Disabled)]

[Visual override indicator]
    └──requires──> [Inline editing in tokens table]
    └──requires──> [Embedded token data] (to compare theme value vs collection default)

[Theme-aware SD export]
    └──requires──> [Embedded token data in theme document]
    └──requires──> [Theme selector on Config page]

[Figma export with modes]
    └──requires──> [Embedded token data in theme document]
    └──requires──> [Theme selector on Config page]
    └──enhances──> [Existing Figma export] (adds mode-per-theme payload)

[Existing ThemeGroupMatrix (v1.3)] ──constrains──> [Inline editing]
    (Enabled = editable, Source = read-only passthrough, Disabled = hidden)

[Existing theme selector on Tokens page (v1.3)] ──drives──> [Inline editing context]
    (No active theme = collection default mode, read-only or standard editing)
```

### Dependency Notes

- **Embedded token data is the foundation:** Every other v1.4 feature depends on themes storing their own copy of token values in the MongoDB document. This must be the first thing built.
- **Group state semantics are already defined in the ThemeGroupMatrix (v1.3):** The Enabled/Source/Disabled distinction existed as a visibility filter; v1.4 extends those semantics to edit permissions. No new UX is needed for the states themselves.
- **Inline editing depends on active theme context:** The Tokens page must know which theme is active to route saves to the right embedded document. The theme selector already exists; it just needs to provide context to the editing layer.
- **SD and Figma export depend on embedded data but are independent of each other:** They can be built in either order after the data model is in place.

---

## How Figma Modes Map to Themes

Figma's variable system stores one value per variable per mode. The REST API POST body shape is:

```
variableCollections[]     — one collection per token collection
variableModes[]           — one mode per theme (e.g. "Light", "Dark", "Brand-A")
variables[]               — one variable per token
variableModeValues[]      — cross-product: one entry per (variable, mode) pair
```

**The direct mapping is:**
- One Figma collection = one ATUI token collection
- One Figma mode = one ATUI theme (Enabled in that theme)
- The collection's "default mode" = the ATUI collection default (no theme active)
- Figma mode limit: 40 modes per collection (Figma Enterprise plan)

**Export rule for Figma:**
- Source groups: export collection default value for all modes (the token is shared across themes)
- Enabled groups: export per-theme embedded value for that mode
- Disabled groups: omit from the collection entirely, or export as collection default with a note

---

## How Style Dictionary Themes Map to Token Sets

Style Dictionary's multi-theme pattern (industry standard, confirmed by sd-transforms and SD docs):

**Option A — Multi-file approach (recommended for this codebase):**
- Run SD once per theme
- Each run uses: `include: [collection-default-tokens]`, `source: [theme-overrides]`
- Source groups contribute their collection-default values directly (no override file needed)
- Enabled groups contribute their per-theme values as the source file
- Output: one CSS/JSON file per theme, wrapped in a class selector or at-rule

```
themes/light.css   → .theme-light { --color-bg: #ffffff; ... }
themes/dark.css    → .theme-dark  { --color-bg: #1a1a1a; ... }
```

**Option B — SD `permutateThemes` from sd-transforms (if multi-dimensional themes needed):**
- `$themes.json` with `selectedTokensets` using `source`/`enabled`/`disabled` states maps exactly to ATUI's group state model
- The ATUI `ThemeGroupMatrix` is semantically identical to sd-transforms' `selectedTokensets`
- `permutateThemes()` produces all combinations for multi-axis systems (e.g., light+brand-A, dark+brand-A)

**For v1.4, Option A is sufficient.** Multi-dimensional permutation is a future differentiator. Run SD N times (once per theme), merging collection default tokens with the theme's embedded override values.

**$value override semantics in SD:**
- Later files in `source[]` override earlier ones with the same token path
- Collection default tokens go into `include[]`; theme-specific overrides go into `source[]`
- This is a deep merge — only differing token paths need to appear in the theme file

---

## MVP Definition for v1.4

### Launch With (v1.4 scope — all required)

- [x] Theme document stores embedded token groups as a 1:1 copy of collection on creation — **data model foundation, everything else depends on this**
- [x] Tokens page inline editing is enabled for Enabled groups when a theme is active, saving to the theme's embedded data — **core authoring UX**
- [x] Source groups always read from collection default, never from theme embedded copy — **critical semantic correctness**
- [x] Visual indicator in the tokens table showing which values have been overridden in the active theme vs matching the collection default — **essential for usability; without this editors are blind**
- [x] Config page theme selector for export — **ties authoring to export**
- [x] SD export: generate theme-aware output for the selected theme — **developer-facing deliverable**
- [x] Figma export: each enabled theme becomes a mode in the variables collection — **designer-facing deliverable**

### Add After Validation (v1.4.x)

- [ ] Reset individual token to collection default (revert override) — trigger: users ask for undo; not blocking for launch
- [ ] Multi-theme ZIP export (all themes in one SD build run) — trigger: users export frequently and find per-theme export tedious
- [ ] "Propagate collection default change to theme copies" prompt — trigger: users edit collection defaults and find themes stale

### Future Consideration (v2+)

- [ ] Theme inheritance chains (Theme B inherits Theme A) — defer: full resolver complexity; flat model covers current use case
- [ ] Multi-dimensional theme permutation (mode x brand matrix) — defer: requires sd-transforms integration and UX redesign
- [ ] Token-level diff view across themes — defer: analytical feature, not authoring

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Embedded token data on theme creation | HIGH | MEDIUM | P1 |
| Inline editing saves to theme | HIGH | MEDIUM | P1 |
| Source group passthrough semantics | HIGH | LOW | P1 |
| Visual override indicator | HIGH | MEDIUM | P1 |
| Theme-aware SD export | HIGH | HIGH | P1 |
| Figma export with modes | HIGH | HIGH | P1 |
| Reset individual override | MEDIUM | LOW | P2 |
| Multi-theme ZIP export | MEDIUM | MEDIUM | P2 |
| Theme inheritance | LOW | HIGH | P3 |
| Multi-axis permutation | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.4 launch
- P2: Add in v1.4.x when core is stable
- P3: Future milestone consideration

---

## Competitor Feature Analysis

Reference tools surveyed: Tokens Studio for Figma, Supernova, Knapsack, sd-transforms.

| Feature | Tokens Studio | Supernova | Our Approach |
|---------|---------------|-----------|--------------|
| Per-theme token values | Token sets with enabled/source/disabled states; theme = combination of sets | Themes with per-token value overrides | Embedded token copy per theme; group state controls Source/Enabled/Disabled |
| Inline editing in theme context | Spreadsheet-style inline editing in token set view | Table view with inline edit per theme | Inline editing in tokens table when Enabled group + active theme |
| Override indicator | Visual dot/badge on tokens that differ from base | Highlighted cells for overridden values | Badge/dot on cells where theme value !== collection default value |
| SD export | permutateThemes + sd-transforms; one file per theme combo | Built-in with class-selector output | Run SD per theme with collection default in include[], theme overrides in source[] |
| Figma modes | One Figma mode per Tokens Studio theme option | Sync via Figma Variables REST API | One Figma mode per ATUI theme; variableModeValues per (token, theme) pair |

---

## Sources

- Tokens Studio documentation: token sets enabled/source/disabled states — [Token Sets](https://docs.tokens.studio/manage-tokens/token-sets), [Themes Overview](https://docs.tokens.studio/manage-themes/themes-overview), [Theme Groups and Options](https://documentation.tokens.studio/platform/themes/theme-groups-and-theme-options)
- Figma Variables REST API: modes structure, variableModeValues, POST payload — [REST API Variables Endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/)
- Figma Plugin API: valuesByMode on Variable objects — [Working with Variables](https://developers.figma.com/docs/plugins/working-with-variables/)
- Figma modes UX overview — [Overview of variables, collections, and modes](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes)
- Style Dictionary multi-theme multi-file pattern — [Creating Multiple Themes with Style Dictionary](https://www.alwaystwisted.com/articles/a-design-tokens-workflow-part-10)
- Style Dictionary token file layering (include vs source) — [Design Tokens | Style Dictionary](https://styledictionary.com/info/tokens/)
- sd-transforms permutateThemes function and $themes.json format — [sd-transforms README](https://github.com/tokens-studio/sd-transforms/blob/main/README.md)
- Multi-axis SD pattern with SCSS — [Multi axis design tokens with Style Dictionary](https://mattmcadams.com/posts/2025/multi-axis-design-tokens/)
- Inline editing UX table patterns — [Best Practices for Inline Editing in Table Design](https://uxdworld.com/inline-editing-in-tables-design/)

---

*Feature research for: ATUI Tokens Manager v1.4 — Theme Token Sets*
*Researched: 2026-03-20*
