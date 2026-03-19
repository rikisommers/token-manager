# Architecture Research

**Domain:** Design token manager — Theme Token Sets feature (v1.4)
**Researched:** 2026-03-20
**Confidence:** HIGH — all findings based on direct inspection of existing codebase

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Next.js App Router                           │
├───────────────────┬─────────────────────────────────────────────────┤
│  Page Routes      │  API Routes                                      │
│                   │                                                  │
│  /collections/    │  /api/collections/[id]          PUT              │
│    [id]/tokens    │  /api/collections/[id]/themes   GET POST         │
│    [id]/themes    │  /api/collections/[id]/themes/  PUT DELETE       │
│    [id]/config    │    [themeId]                                     │
│    [id]/settings  │  /api/collections/[id]/themes/  PATCH  ← NEW    │
│                   │    [themeId]/tokens                              │
│                   │  /api/build-tokens              POST             │
│                   │  /api/export/figma              POST             │
├───────────────────┴─────────────────────────────────────────────────┤
│                    Service / Utility Layer                            │
│  tokenService (TokenService)  style-dictionary.service  figma.service│
├─────────────────────────────────────────────────────────────────────┤
│                    Data Layer                                         │
│  ICollectionRepository  →  MongoRepository  →  Mongoose ODM          │
│  TokenCollection model  (themes: Schema.Types.Mixed — array of ITheme│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Current State: ITheme Schema (v1.3)

```typescript
// src/types/theme.types.ts — CURRENT
export type ThemeGroupState = 'disabled' | 'enabled' | 'source';

export interface ITheme {
  id: string;
  name: string;
  groups: Record<string, ThemeGroupState>;  // groupId → state only
  // tokens field MISSING — must be added in v1.4
}
```

The `themes` field on `TokenCollection` Mongoose schema is `Schema.Types.Mixed` with `default: []`. This means no Mongoose migration is needed — new fields can be added to theme objects in the array without touching the schema definition. However, the TypeScript `ITheme` type and the application logic that reads/writes themes must both be updated.

---

## Target State: ITheme Schema (v1.4)

```typescript
// src/types/theme.types.ts — TARGET
export type ThemeGroupState = 'disabled' | 'enabled' | 'source';

export interface ITheme {
  id: string;
  name: string;
  groups: Record<string, ThemeGroupState>;
  tokens: Record<string, unknown>;  // NEW — full copy of collection.tokens at creation time
}
```

The `tokens` field stores the same shape as `TokenCollection.tokens` — raw W3C Design Token spec JSON keyed by group name. This is the per-theme mutable copy that inline edits on the Tokens page write into.

---

## Component Map: New vs Modified

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ThemeTokenEditor` | `src/components/themes/ThemeTokenEditor.tsx` | Read-only/editable token value rows displayed inside the Tokens page when an Enabled group is active under an active theme. Replaces the default `TokenGeneratorForm` display when theme context is active. |
| `ThemeExportSelector` | `src/components/themes/ThemeExportSelector.tsx` | Dropdown on Config page: select "Collection default" or a specific named theme to export. |

### Modified Components

| Component | File | Change Required |
|-----------|------|----------------|
| `CollectionTokensPage` | `src/app/collections/[id]/tokens/page.tsx` | Add `activeThemeTokens` state. When `activeThemeId` is set AND `selectedGroupId` maps to an Enabled group in that theme, pass `themeTokens` instead of `rawCollectionTokens` to the editor. Wire save to `PATCH /themes/:themeId/tokens` instead of `PUT /api/collections/:id`. |
| `CollectionConfigPage` | `src/app/collections/[id]/config/page.tsx` | Fetch themes list on mount. Render `ThemeExportSelector`. Pass selected theme tokens (or collection default) to `BuildTokensPanel`. Pass theme list structure to Figma export for multi-mode generation. |
| `BuildTokensPanel` | `src/components/dev/BuildTokensPanel.tsx` | Accept optional `selectedThemeId` and `themes` props. When a theme is selected, send that theme's `tokens` to `/api/build-tokens` instead of the collection's `tokens`. |
| `ExportToFigmaDialog` | `src/components/figma/ExportToFigmaDialog.tsx` | Accept `themes` prop. When themes are present, restructure the export payload to use `valuesByMode` with one mode per enabled theme. |

### Modified API Routes

| Route | File | Change Required |
|-------|------|----------------|
| `POST /api/collections/[id]/themes` | `src/app/api/collections/[id]/themes/route.ts` | After building `groupIds`, deep-copy `collection.tokens` into `theme.tokens`. The `ITheme` object gains the `tokens` field at creation time. |
| `PUT /api/collections/[id]/themes/[themeId]` | `src/app/api/collections/[id]/themes/[themeId]/route.ts` | Extend `body` type to accept optional `tokens` field in addition to `name` and `groups`. Add `setFields['themes.$.tokens']` when tokens are in the body. OR keep this route for metadata only and create the dedicated PATCH route (preferred — cleaner separation). |
| `POST /api/export/figma` | `src/app/api/export/figma/route.ts` | Accept optional `themes` array in request body. When present, use `valuesByMode` with theme names as mode identifiers rather than a single `default` mode. |
| `POST /api/build-tokens` (via service) | `src/app/api/build-tokens/route.ts` | No route change needed. Caller passes pre-selected tokens; the route passes them through to `buildTokens()` unchanged. |

### New API Routes

| Route | File | Purpose |
|-------|------|---------|
| `PATCH /api/collections/[id]/themes/[themeId]/tokens` | `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts` | Accepts `{ tokens: Record<string, unknown> }` — full replacement of a theme's embedded token data. Uses `TokenCollection.findOneAndUpdate` with `$set: { 'themes.$.tokens': tokens }` (same positional operator pattern as existing PUT). Returns `{ theme }`. |

---

## Data Flow Changes

### Flow 1: Theme Creation (POST /themes) — Modified

```
CollectionThemesPage.handleAddTheme(name)
    ↓
POST /api/collections/:id/themes  { name }
    ↓
[existing] derive groupIds from collection.tokens via tokenService
    ↓
[NEW] deep-copy collection.tokens → theme.tokens
    ↓
push ITheme { id, name, groups, tokens } into themes array via $push
    ↓
return { theme }  (now includes tokens field)
    ↓
setThemes([...themes, newTheme])
```

**Key constraint:** The tokens copy happens at creation time using `collection.tokens` as the source of truth. Later edits to the collection's tokens do NOT automatically propagate into existing themes — themes become independent copies.

### Flow 2: Inline Token Edit on Tokens Page — New

```
User clicks token value in an Enabled group row under active theme
    ↓
CollectionTokensPage detects: activeThemeId set AND group state === 'enabled'
    ↓
ThemeTokenEditor renders editable input (not read-only)
    ↓
User changes value, saves
    ↓
PATCH /api/collections/:id/themes/:themeId/tokens  { tokens: updatedThemeTokens }
    ↓
MongoDB: $set { 'themes.$.tokens': updatedThemeTokens }
    ↓
Update local themes state with new tokens
```

**Source group behavior:** Groups with state `source` render the same token values as the collection default but in a read-only state. No PATCH is sent. The Tokens page reads from `collection.tokens` (not theme tokens) for source groups.

**Disabled group behavior:** Already filtered from `filteredGroups` in existing v1.3 code — no change needed.

### Flow 3: Theme-Aware SD Export — Modified

```
CollectionConfigPage: user selects theme from ThemeExportSelector
    ↓
"selected theme" resolves tokens:
  - "Collection default" → collection.tokens
  - Named theme → theme.tokens (from themes array)
    ↓
BuildTokensPanel receives resolved tokens
    ↓
POST /api/build-tokens { tokens: resolvedTokens, namespace, collectionName }
    ↓
style-dictionary.service.buildTokens() — no change needed
    ↓
BuildTokensPanel displays result
```

### Flow 4: Theme-Aware Figma Export (Modes) — Modified

```
CollectionConfigPage: user triggers Figma export
    ↓
ExportToFigmaDialog receives themes array (all enabled themes)
    ↓
POST /api/export/figma {
  tokenSet,         // collection.tokens (base structure)
  figmaToken,
  fileKey,
  collectionId,
  themes: [         // NEW — each enabled theme becomes a Figma mode
    { id, name, tokens },
    ...
  ]
}
    ↓
export/figma/route.ts: when themes present, build valuesByMode:
  {
    [themeId or themeName]: mapTokenValueToFigmaValue(themeToken.$value)
  }
    ↓
POST Figma Variables API with multi-mode variables
```

---

## API Contract Changes

### POST /api/collections/[id]/themes — Response Change

```typescript
// BEFORE (v1.3)
// Response: { theme: { id, name, groups } }

// AFTER (v1.4)
// Response: { theme: { id, name, groups, tokens: Record<string, unknown> } }
```

The `tokens` field is the full copy of `collection.tokens` at creation time. Clients already store the returned `theme` object in React state — the field is added transparently. No client-side response parsing change is required because the existing code does `setThemes(prev => [...prev, newTheme])` where `newTheme = data.theme`.

### PATCH /api/collections/[id]/themes/[themeId]/tokens — New Endpoint

```typescript
// Request
PATCH /api/collections/:id/themes/:themeId/tokens
Content-Type: application/json
{
  tokens: Record<string, unknown>  // Full replacement of theme.tokens
}

// Response 200
{
  theme: ITheme  // Full updated theme including new tokens
}

// Response 400
{ error: 'tokens is required and must be an object' }

// Response 404
{ error: 'Collection or theme not found' }
```

The implementation uses the same positional `$` operator pattern already established in the existing PUT route:
```typescript
await TokenCollection.findOneAndUpdate(
  { _id: params.id, 'themes.id': params.themeId },
  { $set: { 'themes.$.tokens': tokens } },
  { new: true }
).lean();
```

### PUT /api/collections/[id]/themes/[themeId] — No Breaking Change

The existing PUT body type is extended to optionally accept `tokens`:
```typescript
// Before
{ name?: string; groups?: Record<string, ThemeGroupState> }

// After — backwards compatible
{ name?: string; groups?: Record<string, ThemeGroupState>; tokens?: Record<string, unknown> }
```

However, the preferred approach is to keep the PUT route for metadata only (name, groups) and use the dedicated PATCH route for token data updates. This maintains single-responsibility and allows the PATCH to have targeted validation.

### POST /api/export/figma — Extended Request Body

```typescript
// Before
{
  tokenSet: Record<string, unknown>;
  figmaToken: string;
  fileKey: string;
  collectionId?: string;
  mongoCollectionId?: string;
}

// After — backwards compatible (themes optional)
{
  tokenSet: Record<string, unknown>;
  figmaToken: string;
  fileKey: string;
  collectionId?: string;
  mongoCollectionId?: string;
  themes?: Array<{ id: string; name: string; tokens: Record<string, unknown> }>;  // NEW
}
```

When `themes` is absent, the route behaves identically to v1.3 (single `default` mode). When present, each theme becomes a Figma variable mode.

---

## Mongoose Schema Evolution

No schema migration is required. The `themes` field is already `Schema.Types.Mixed` with `default: []`. MongoDB is schema-less — adding a `tokens` property to each theme object in the array is handled automatically.

The only required changes are:
1. TypeScript `ITheme` interface gains `tokens: Record<string, unknown>`
2. The POST /themes handler sets `theme.tokens` before pushing
3. The PATCH /themes/:themeId/tokens handler updates it

**Backward compatibility:** Existing theme documents in MongoDB will not have a `tokens` field. All code reading `theme.tokens` must treat it as potentially `undefined` and fall back to `collection.tokens`. The `ITheme` type should mark it as optional during the transition period:

```typescript
export interface ITheme {
  id: string;
  name: string;
  groups: Record<string, ThemeGroupState>;
  tokens?: Record<string, unknown>;  // Optional for backward compat with pre-v1.4 theme docs
}
```

---

## State Management Changes: Tokens Page

The Tokens page (`CollectionTokensPage`) currently holds:
- `rawCollectionTokens` — the collection's tokens from MongoDB
- `themes` — array of ITheme (now including `.tokens`)
- `activeThemeId` — which theme is selected

**New state needed:**
```typescript
// Derived from themes[activeThemeId].tokens — no separate fetch needed
// because themes are already loaded in loadCollection()
```

The active theme's tokens are accessible as:
```typescript
const activeTheme = themes.find(t => t.id === activeThemeId);
const activeThemeTokens = activeTheme?.tokens ?? rawCollectionTokens;
```

**Group-state-aware token source selection:**
```typescript
// When rendering a group under an active theme:
// - 'disabled'  → group not shown (existing filteredGroups handles this)
// - 'source'    → show group, read from rawCollectionTokens (read-only)
// - 'enabled'   → show group, read from activeThemeTokens (editable)
```

The `TokenGeneratorForm` currently receives `collectionToLoad` with the full token set. To support per-group source switching, the Tokens page needs to pass either `rawCollectionTokens` or `activeThemeTokens` depending on the selected group's state.

**Recommended approach:** Pass both `rawCollectionTokens` and `activeThemeTokens` as separate props to the form/editor layer. The form checks `activeGroupState` to decide which dataset to render and edit.

---

## Component Boundaries

### ThemeTokenEditor (New)

Responsibility: Inline editing of token values within a theme's token set for a specific group.

```
Props:
  groupId: string
  groupState: ThemeGroupState      // 'enabled' | 'source'
  themeTokens: Record<string, unknown>   // theme.tokens
  collectionTokens: Record<string, unknown>  // fallback for source groups
  onSave: (updatedTokens: Record<string, unknown>) => Promise<void>
```

This component renders the same kind of token row editing as `TokenGeneratorForm` but:
- For `source` groups: read-only display of collection token values
- For `enabled` groups: editable inputs that call `onSave` on change/blur

**Implementation note:** The component does NOT need to be a full replacement for `TokenGeneratorForm`. It operates at the group level — it receives only the tokens in the currently-selected group, not the whole collection.

### ThemeExportSelector (New)

Responsibility: UI to select which token set to export from the Config page.

```
Props:
  themes: ITheme[]
  selectedExportTarget: string | null   // null = collection default; theme.id = theme
  onSelect: (themeId: string | null) => void
```

Renders as a `Select` component (reusing shadcn/ui Select already in the codebase) with:
- "Collection default" as the first option (value `__default__`)
- One entry per theme

---

## Build Order (Dependency-Ordered)

The features have clear dependencies. This is the correct implementation sequence:

### Step 1: Type + Schema Foundation
**File:** `src/types/theme.types.ts`
**Change:** Add `tokens?: Record<string, unknown>` to `ITheme`
**Why first:** Every subsequent step depends on this type being correct.

### Step 2: Theme Creation — Copy Tokens on POST
**File:** `src/app/api/collections/[id]/themes/route.ts`
**Change:** Set `theme.tokens = structuredClone(collection.tokens)` before `$push`
**Why second:** All new themes must embed tokens from the moment they are created. This is the data foundation that all subsequent UI steps read from.

### Step 3: New PATCH Endpoint
**File:** `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts` (new file)
**Change:** New route with `PATCH` handler using positional `$` operator
**Why third:** The Tokens page inline editor cannot save until this endpoint exists.

### Step 4: Tokens Page — Inline Editing
**Files:** `src/app/collections/[id]/tokens/page.tsx`, new `src/components/themes/ThemeTokenEditor.tsx`
**Change:** When active theme + enabled group: render editable inputs backed by `theme.tokens`; save via PATCH
**Why fourth:** Depends on Step 2 (themes have tokens to read) and Step 3 (endpoint to save to).

### Step 5: Config Page — Theme-Aware SD Export
**Files:** `src/app/collections/[id]/config/page.tsx`, `src/components/themes/ThemeExportSelector.tsx`, `src/components/dev/BuildTokensPanel.tsx`
**Change:** Theme selector dropdown; pass theme tokens to build endpoint when selected
**Why fifth:** Depends on Step 2 (themes have tokens). Independent of Step 4.

### Step 6: Config Page — Theme-Aware Figma Export
**Files:** `src/app/api/export/figma/route.ts`, `src/components/figma/ExportToFigmaDialog.tsx`
**Change:** Accept themes array; generate `valuesByMode` structure; each theme = one Figma mode
**Why sixth:** Depends on Step 2 (themes have tokens). More complex than SD export; deferred last.

---

## Architectural Patterns to Follow

### Pattern 1: Positional Array Updates in MongoDB

**What:** Theme mutations use `{ _id: params.id, 'themes.id': params.themeId }` as the query filter and `$set: { 'themes.$.tokens': ... }` as the update. This is the established pattern from the existing PUT route.

**When to use:** Any time a field on a specific theme (inside the `themes` Mixed array) must be updated.

**Trade-offs:** The positional `$` operator only matches the first array element. Since theme `id` fields are UUIDs and guaranteed unique, this is safe. No risk of multi-element match.

### Pattern 2: Repository Bypass for Theme Mutations

**What:** Theme mutations (POST/PUT/DELETE/PATCH on themes) import `TokenCollection` directly and bypass `ICollectionRepository`. The GET route uses the repository.

**When to use:** Any mutation requiring MongoDB array operators (`$push`, `$pull`, `$set` on nested path). The repository's `update()` method accepts `UpdateTokenCollectionInput` which is a shallow partial — it does not support dotted-path updates like `themes.$.tokens`.

**Trade-offs:** Direct model access loses the repository abstraction. This is a documented pragmatic decision in PROJECT.md. The new PATCH endpoint follows the same pattern.

### Pattern 3: Optimistic UI with Revert

**What:** `CollectionThemesPage.handleStateChange` applies the state change to local React state immediately, then fires the API call. If the API call fails, the original state is restored.

**When to use:** Theme token edits on the Tokens page. Apply the value change to `themes` state immediately (fast perceived response), then PATCH. On failure, revert to previous theme tokens.

**Trade-offs:** Requires keeping a pre-edit snapshot in the event handler closure. Already established pattern — follow it for the new PATCH calls.

### Pattern 4: Token Source Resolution at Render Time

**What:** The Tokens page does not store a "merged view" of tokens — it holds `rawCollectionTokens` and `activeThemeTokens` as separate state slices. The render path decides which source to use based on `groupState`.

**When to use:** When a group is rendered inside the Tokens page editor area.

**Trade-offs:** Requires the group state to be checked on every render of the group content area. This is inexpensive because `activeTheme.groups[selectedGroupId]` is a direct object lookup.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Merging Theme Tokens Back to Collection

**What people do:** When a user edits a token under a theme, write the change back to `collection.tokens` instead of `theme.tokens`.

**Why it's wrong:** This destroys the separation between the collection default and theme-specific values. The entire purpose of theme token sets is that each theme has its own mutable copy.

**Do this instead:** Always PATCH `themes.$.tokens`. Only collection-level saves (the existing Ctrl+S flow) touch `collection.tokens`.

### Anti-Pattern 2: Fetching Theme Tokens as a Separate API Call

**What people do:** Add a GET endpoint for a single theme's tokens and fetch it every time the user switches theme.

**Why it's wrong:** The Tokens page already fetches the full themes array (including tokens) on mount. `theme.tokens` is embedded in the ITheme object in local state. A separate fetch adds latency and network overhead for data already present.

**Do this instead:** Read `themes.find(t => t.id === activeThemeId)?.tokens` from the in-memory `themes` state array.

### Anti-Pattern 3: Storing Token Copies Outside the Theme Document

**What people do:** Create a separate MongoDB collection or a separate top-level field like `themeTokenSets` to avoid nesting tokens in each theme.

**Why it's wrong:** The existing architecture stores themes as a `Mixed` array embedded in the collection document. Splitting this requires joins/lookups and breaks the existing GET/PUT/POST pattern. The embedded approach works well for the single-user, moderate-collection-count use case this tool targets.

**Do this instead:** Keep `tokens` embedded in each ITheme object. The `Schema.Types.Mixed` type already supports arbitrary depth nesting.

### Anti-Pattern 4: Making ThemeTokenEditor a Full Form Replacement

**What people do:** Build a separate full-page editor that replaces the TokenGeneratorForm entirely when a theme is active.

**Why it's wrong:** The Tokens page layout (sidebar tree + breadcrumb + resizable panels) is already established. The graph panel on the right still needs to function regardless of theme context. Replacing the form entirely would break the graph integration.

**Do this instead:** Build ThemeTokenEditor as a targeted component that renders within the existing form panel space, scoped to the currently selected group and theme. It supplements the form panel, it does not replace the page layout.

---

## Integration Points

### TokenGeneratorForm ↔ Tokens Page

**Current:** The page passes `collectionToLoad` with the full collection token set to the form. The form renders all groups.

**After v1.4:** When active theme + enabled group, the page needs to intercept the display and save path for that group. Two options:
- Option A: Pass `activeThemeTokens` as an override to the form so the form renders from theme tokens for enabled groups.
- Option B: Render `ThemeTokenEditor` instead of the form section when an enabled group is active under a theme.

Option B is recommended because it avoids threading theme-awareness deep into `TokenGeneratorForm` (which already manages considerable internal state). `ThemeTokenEditor` is a focused, simpler component.

### CollectionConfigPage ↔ BuildTokensPanel

**Current:** Config page fetches collection and passes `tokens` and `namespace` to `BuildTokensPanel`. The panel sends these to `/api/build-tokens`.

**After v1.4:** Config page additionally fetches themes, renders `ThemeExportSelector`. When a theme is selected, `tokens` passed to `BuildTokensPanel` is `selectedTheme.tokens`. When "Collection default" is selected, `tokens` is `collection.tokens` (unchanged behavior).

**BuildTokensPanel change:** The panel only needs to receive different `tokens`. No internal change to the panel or the `/api/build-tokens` route is needed — the caller controls which token set is passed.

### ExportToFigmaDialog ↔ Figma Export Route

**Current:** The dialog collects Figma token + file key from the per-collection settings. It posts the full `collection.tokens` as `tokenSet` to `/api/export/figma`. The route calls `transformToFigmaVariables(tokenSet)` which produces single-mode variables with `valuesByMode: { default: ... }`.

**After v1.4:** The dialog also receives the `themes` array from the Config page. It posts `themes` alongside `tokenSet`. The route's `transformToFigmaVariables` function is extended (or a new function added) that, when `themes` is present, builds `valuesByMode` with one entry per theme using that theme's token values.

**Figma API constraint:** Each theme (mode) must be pre-created in Figma before values can be assigned. The current route uses the Figma Variables API POST. Multi-mode export requires the Figma collection to have modes that match the theme names. This is a product-level constraint that may require creating modes in Figma as part of the export call or documenting that the Figma collection must be pre-configured.

---

## Scaling Considerations

This is a single-user localhost tool — scaling is not a concern for v1.4. The one relevant consideration:

**Token copy size:** Each theme stores a full copy of `collection.tokens`. For collections with large token sets, the MongoDB document grows proportionally with the number of themes. At typical design-token scales (hundreds to low thousands of tokens), this is negligible. Each token is a small JSON object (~100 bytes), so a collection with 1,000 tokens and 10 themes adds ~1MB to the document — well within MongoDB's 16MB document limit.

---

## Sources

- Direct code inspection: `src/app/api/collections/[id]/themes/route.ts`
- Direct code inspection: `src/app/api/collections/[id]/themes/[themeId]/route.ts`
- Direct code inspection: `src/app/collections/[id]/tokens/page.tsx`
- Direct code inspection: `src/app/collections/[id]/config/page.tsx`
- Direct code inspection: `src/app/api/export/figma/route.ts`
- Direct code inspection: `src/app/api/build-tokens/route.ts`
- Direct code inspection: `src/services/style-dictionary.service.ts`
- Direct code inspection: `src/services/token.service.ts`
- Direct code inspection: `src/lib/db/models/TokenCollection.ts`
- Direct code inspection: `src/lib/db/repository.ts`
- Direct code inspection: `src/types/theme.types.ts`
- Direct code inspection: `src/types/collection.types.ts`
- Direct code inspection: `src/components/themes/ThemeList.tsx`
- Direct code inspection: `src/components/themes/ThemeGroupMatrix.tsx`
- Direct code inspection: `src/components/dev/BuildTokensPanel.tsx`
- Architectural decisions table in `.planning/PROJECT.md`

---

*Architecture research for: ATUI Tokens Manager — v1.4 Theme Token Sets*
*Researched: 2026-03-20*
