# Stack Research

**Domain:** Design token management — Theme Token Sets (v1.4 milestone)
**Researched:** 2026-03-20
**Confidence:** HIGH for SD v5 and Mongoose patterns; MEDIUM for Figma Variables API (atomic, well-documented but complex mode flow)

---

## Context: What This Research Covers

This is a SUBSEQUENT MILESTONE stack document. The existing stack (Next.js 13.5.6, React 18.2.0, Mongoose 9.3.0, Style Dictionary 5.3.3, shadcn/ui + Tailwind) is validated and locked. This document covers only what is needed for v1.4: Theme Token Sets.

**The verdict: no new packages required.** All four capability areas are achievable with the existing stack.

---

## Recommended Stack

### Core Technologies

No additions. Existing stack supports all four v1.4 requirements.

| Technology | Installed Version | v1.4 Role | Verified |
|------------|-------------------|-----------|----------|
| Style Dictionary | 5.3.3 | Multi-theme output via multiple SD instances | HIGH — official docs |
| Mongoose | 9.3.0 | Embedded token sets in themes array using `$set` + `arrayFilters` | HIGH — official docs |
| React | 18.2.0 | Inline editing via `useRef` + `setTimeout` debounce pattern | HIGH — built-in |
| Next.js | 13.5.6 | API routes for theme token PATCH/export endpoints | HIGH — existing pattern |

### Supporting Libraries

No new libraries needed. Pattern notes below.

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `use-debounce` | — | NOT NEEDED — custom `useRef`/`setTimeout` hook is sufficient | Only if debounce logic grows to 3+ consumers |
| `@tanstack/react-query` | — | NOT NEEDED — optimistic updates are simpler with local state + `useRef` rollback in React 18 | Only if global server state sync becomes a problem |

### Development Tools

No new tooling required. Existing `yarn build` + TypeScript setup is sufficient.

---

## Installation

No new packages to install. All capability is in the existing dependency tree.

---

## How Each Capability Works With the Existing Stack

### 1. MongoDB: Embedding Token Sets in Theme Documents

**Pattern:** Extend `ITheme` with a `tokens` field (`Record<string, unknown>`, the same Mixed type used on the collection). Update the Mongoose schema to match.

**Exact Mongoose update operation for a single theme's tokens:**

```typescript
// Update one theme's embedded token group by theme ID
await TokenCollection.findByIdAndUpdate(
  collectionId,
  {
    $set: {
      'themes.$[theme].tokens': newTokenData,
    },
  },
  {
    arrayFilters: [{ 'theme.id': themeId }],
    new: true,
  }
);
```

**Why `$set` + `arrayFilters` over re-saving the whole array:** The themes array can grow large once each theme embeds a full token set. Rewriting the entire array on every token edit is inefficient. The filtered positional operator `$[identifier]` with `arrayFilters` targets only the specific theme element. This is supported in Mongoose 9.x and MongoDB 3.6+.

**Schema change needed — extend `ITheme`:**

```typescript
// src/types/theme.types.ts — add tokens field
export interface ITheme {
  id: string;
  name: string;
  groups: Record<string, ThemeGroupState>;
  tokens: Record<string, unknown>;  // NEW: embedded token value set (Schema.Types.Mixed)
}
```

**No Mongoose schema migration needed** — `themes` is already `Schema.Types.Mixed` on `TokenCollection`. The new `tokens` sub-field on each theme object is stored as-is in MongoDB's flexible document model. No `markModified()` issues because the update uses `$set` with `arrayFilters`, which bypasses Mongoose's change tracking.

**Theme creation — copy-on-write:** When a new theme is created, the API route copies the collection's current `tokens` field into the new theme document before pushing. This gives each theme its own independent value set from the moment of creation.

**Confidence:** HIGH — `$set` + `arrayFilters` is standard MongoDB. Verified against [MongoDB filtered positional operator docs](https://www.mongodb.com/docs/manual/reference/operator/update/positional-filtered/) and [Mongoose 9.x SchemaTypes](https://mongoosejs.com/docs/schematypes.html).

---

### 2. React: Inline Token Value Editing

**Pattern:** Local state + `useRef` debounce + optimistic display. No new libraries.

**Why not `useOptimistic`:** `useOptimistic` requires React 19 (or React canary/experimental). The installed version is React 18.2.0. Confirmed absent from `node_modules/react/cjs/react.development.js`. Do not use it.

**The inline edit hook pattern:**

```typescript
// In the token table cell (client component)
const [displayValue, setDisplayValue] = useState(token.$value);
const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const lastSavedRef = useRef(token.$value);  // for rollback

function handleChange(newValue: string) {
  setDisplayValue(newValue);  // instant UI update
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(async () => {
    try {
      await patchThemeToken(collectionId, themeId, groupId, tokenKey, newValue);
      lastSavedRef.current = newValue;
    } catch {
      setDisplayValue(lastSavedRef.current);  // rollback on error
    }
  }, 600);  // 600ms debounce — enough to avoid per-keystroke saves
}
```

**Why this is correct for React 18.2 + Next.js 13:** The tokens page is already a `'use client'` component using `useState`, `useRef`, `useCallback`, and `useEffect`. This pattern is a direct extension of the existing `graphAutoSaveTimerRef` debounce pattern already in the file (`src/app/collections/[id]/tokens/page.tsx` line 54). No architectural change required.

**Edit permission gating:** Before calling `handleChange`, check the active theme's group state. Only dispatch edits when `groupState === 'enabled'`. Source groups display as read-only; disabled groups are not shown (existing filter behaviour).

**Confidence:** HIGH — standard React 18 pattern. The codebase already uses this exact debounce-with-ref approach for graph auto-save.

---

### 3. Style Dictionary: Theme-Aware Multi-File Export

**Pattern:** Run one `StyleDictionary` instance per theme (or collection default). Pass each theme's embedded token data as the `tokens` object. Collect results from `formatPlatform`. Existing `buildTokens` service is the integration point.

**SD v5 verified API:**

```typescript
// Exact SD v5 constructor + formatPlatform signature (verified against styledictionary.com/reference/api)
const sd = new StyleDictionary({
  tokens: themeTokens as Record<string, never>,  // same type cast used today
  platforms: { /* same format config as today */ },
  log: { verbosity: 'silent', warnings: 'disabled', errors: { brokenReferences: 'console' } },
});
await sd.init();
const platformFiles = await sd.formatPlatform('css');
// platformFiles: Array<{ output: unknown; destination?: string }>
// platformFiles[0].output is the CSS string
```

**Integration strategy — extend `buildBrandTokens` rather than replace it:**

The existing `buildBrandTokens` function already accepts `brandTokens: Record<string, unknown>`. To add theme-aware export:

1. Add a `buildTokensForTheme` wrapper that accepts a theme's embedded tokens and a theme name.
2. The theme name becomes the `brand` label (used in the output filename: `tokens-dark.css`).
3. The existing `detectBrands` / `mergeGlobalsIntoBrands` pipeline can be bypassed for theme exports — each theme IS already a complete merged set.

**Multi-theme output:** If the export request includes multiple themes, loop and build each as a separate brand entry. The existing ZIP packaging already handles multiple brand outputs.

**Export request flow on Config page:**

The Config page currently has a build/export trigger. Extend it with a theme selector (the same `Select` component used on the Tokens page). The user picks:
- "Collection default" — existing behaviour, no change
- A named theme — passes that theme's `tokens` field to `buildTokens` with `brand = theme.name`

**Confidence:** HIGH — `formatPlatform` return type verified against [official SD v5 API docs](https://styledictionary.com/reference/api/). The `tokens` object constructor form is confirmed documented.

---

### 4. Figma Variables Export: Modes from Themes

**Pattern:** Map each enabled theme to a Figma Variable Mode in the POST `/v1/files/:file_key/variables` endpoint. The existing `transformToFigmaVariables` function in `src/app/api/export/figma/route.ts` is the extension point.

**Verified Figma Variables POST request structure:**

```json
{
  "variableCollections": [
    {
      "action": "CREATE",
      "id": "tempCollectionId",
      "name": "CollectionName"
    }
  ],
  "variableModes": [
    { "action": "CREATE", "id": "tempModeId_light", "name": "Light", "variableCollectionId": "tempCollectionId" },
    { "action": "CREATE", "id": "tempModeId_dark",  "name": "Dark",  "variableCollectionId": "tempCollectionId" }
  ],
  "variables": [
    {
      "action": "CREATE",
      "id": "tempVarId_color_primary",
      "name": "color/primary",
      "variableCollectionId": "tempCollectionId",
      "resolvedType": "COLOR"
    }
  ],
  "variableModeValues": [
    { "variableId": "tempVarId_color_primary", "modeId": "tempModeId_light", "value": { "r": 1, "g": 0, "b": 0, "a": 1 } },
    { "variableId": "tempVarId_color_primary", "modeId": "tempModeId_dark",  "value": { "r": 0, "g": 0, "b": 0, "a": 1 } }
  ]
}
```

**Temporary IDs:** Figma accepts client-generated temporary IDs (strings starting with any prefix) in the same request payload. The API resolves them atomically — if any operation fails, nothing is written.

**Key constraints (verified):**
- Max 4MB request body
- Max 40 modes per collection
- Max 5,000 variables per collection
- All operations atomic per request

**Theme → Mode mapping rule:** Each `ITheme` with at least one group in `enabled` state becomes one Figma mode. Themes where all groups are `disabled` should be skipped. The collection default (no theme) becomes the first mode (Figma's `defaultModeId`).

**Integration strategy:** Create a new API route `/api/collections/[id]/export/figma-modes` (or extend the existing `/api/export/figma/route.ts` with a `withModes: true` flag). The route fetches the collection's themes array, builds the `variableModes` and `variableModeValues` arrays from theme token data, and posts to Figma.

**Confidence:** MEDIUM — Figma Variables REST API is well-documented at [developers.figma.com/docs/rest-api/variables-endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/). The `variableModeValues` pattern with temporary IDs is confirmed. MEDIUM (not HIGH) because the atomic batch POST is complex and error messages from Figma are often opaque — integration will need careful testing against a live Figma file.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `$set` + `arrayFilters` for theme token updates | Re-save entire `themes` array | Rewrites all themes on every keystroke save; O(themes × tokens) data transfer per edit |
| Multiple SD instances per theme | SD `filter` function on single instance | Filters only control which tokens appear in output — they don't provide separate value sets per theme |
| `useRef` + `setTimeout` debounce | `use-debounce` npm package | Extra dependency for ~8 lines of code; existing codebase already uses this pattern |
| `useRef` + `setTimeout` debounce | `useOptimistic` | Not available in React 18.2.0; requires React 19 |
| New `/export/figma-modes` route | Extend existing `/export/figma` route | Existing route has different payload shape; keeping separate avoids breaking the existing single-mode export |
| Embedded tokens in `ITheme.tokens` | Separate `ThemeTokenSet` MongoDB collection | Separate collection adds a join on every read; themes are always fetched with their collection; embedding is appropriate at this scale |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `useOptimistic` | React 19 API — not in React 18.2.0 (confirmed absent from installed package) | `useState` + `useRef` rollback pattern |
| `use-debounce` package | Adds a dependency for trivial functionality already in the codebase | `useRef` + `setTimeout` pattern (already used in `tokens/page.tsx`) |
| `@tanstack/react-query` | Overkill for this app's fetch pattern; no caching requirements stated | Direct `fetch` + local state (existing pattern) |
| Separate `ThemeTokenSet` MongoDB collection | Introduces a join and complicates theme CRUD; themes and their token data are always loaded together | Embed `tokens: Record<string, unknown>` directly on `ITheme` |
| SD `filter` functions for theme output | Filters control token visibility, not token values — they cannot substitute per-theme value sets | Separate SD instances with per-theme token objects |
| Figma batch export for all themes in one REST call | 4MB limit and 40-mode limit make large collections risky; atomic failure means no partial success visibility | One request per export with user-selected theme (single mode per export, or all modes in one well-bounded request) |

---

## Stack Patterns by Variant

**If exporting a single selected theme to SD formats:**
- Pass `theme.tokens` as the `tokens` object to `buildBrandTokens`
- Use `theme.name` as the `brand` label
- Skip `detectBrands` / `mergeGlobalsIntoBrands` — theme tokens are already a complete merged set

**If exporting collection default (no theme) to SD formats:**
- Existing code path, unchanged

**If exporting all themes as separate SD files (multi-file ZIP):**
- Loop over enabled themes, call `buildBrandTokens` for each
- One output file per theme per format: `tokens-light.css`, `tokens-dark.css`

**If exporting themes as Figma Variable modes:**
- One variableMode per enabled theme
- variableModeValues populated from each theme's `tokens` field
- Collection default = Figma's initial/default mode

**If a theme's group has `source` state:**
- For that group's tokens, read values from the collection's master `tokens` field (not the theme's embedded tokens)
- This applies at query time in the API route, not at storage time — theme tokens store only the overrides conceptually, but for simplicity can store a full copy and the read logic applies `source` group overrides at export time

---

## Version Compatibility

| Package | Version | Notes |
|---------|---------|-------|
| style-dictionary | 5.3.3 (installed) | `formatPlatform` returns `Array<{output: unknown; destination?: string}>` — confirmed. `tokens` object in constructor — confirmed. ESM-only: must use `import`, not `require`. |
| mongoose | 9.3.0 (installed) | `arrayFilters` supported. `$set` with filtered positional operator works. `Schema.Types.Mixed` does not need `markModified` when updated via `$set` (not `.save()`). |
| react | 18.2.0 (installed) | `useOptimistic` NOT available. `useRef`, `useState`, `useCallback`, `useEffect` — all available and used today. |
| next | 13.5.6 (installed) | App Router API routes (`NextRequest`/`NextResponse`). `'use client'` boundary at page level. Dynamic import pattern for `dbConnect`. All stable. |

---

## Sources

- [Style Dictionary v5 API Reference](https://styledictionary.com/reference/api/) — `formatPlatform` return type, `tokens` constructor object, `init()` requirement (HIGH confidence)
- [Figma Variables Endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/) — `variableCollections`, `variableModes`, `variables`, `variableModeValues` schema; 4MB limit; 40-mode limit (MEDIUM confidence — verified structure, not tested against live API)
- [MongoDB Filtered Positional Operator](https://www.mongodb.com/docs/manual/reference/operator/update/positional-filtered/) — `$set` + `arrayFilters` pattern (HIGH confidence)
- [Mongoose 9.x SchemaTypes](https://mongoosejs.com/docs/schematypes.html) — `Schema.Types.Mixed` behaviour with `$set` (HIGH confidence)
- [React 18.2.0 installed package](file:///Users/user/Dev/atui-tokens-manager/node_modules/react/) — confirmed `useOptimistic` absent (HIGH confidence — direct inspection)
- `src/app/collections/[id]/tokens/page.tsx` line 54 — existing `useRef` debounce pattern (`graphAutoSaveTimerRef`) as precedent (HIGH confidence)
- `src/services/style-dictionary.service.ts` — existing `buildBrandTokens` integration point (HIGH confidence)
- `src/app/api/export/figma/route.ts` — existing `transformToFigmaVariables` extension point (HIGH confidence)

---

*Stack research for: ATUI Tokens Manager v1.4 — Theme Token Sets*
*Researched: 2026-03-20*
