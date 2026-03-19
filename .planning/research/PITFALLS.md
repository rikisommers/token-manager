# Pitfalls Research

**Domain:** Design token manager — per-theme token value sets, inline editing, SD/Figma export
**Researched:** 2026-03-20
**Confidence:** HIGH (codebase directly inspected; external claims verified against official docs and community sources)

---

## Critical Pitfalls

### Pitfall 1: Embedded Token Copy Blows the 16 MB MongoDB BSON Limit

**What goes wrong:**
Each theme stores a full copy of all token groups. The collection document already holds the master `tokens` field (Schema.Types.Mixed). Adding `N` themes each with a full copy multiplies document size by `N+1`. A collection with 500 tokens at ~2 KB each is already ~1 MB raw JSON. Three themes triples that to ~3 MB inside a single document. With descriptions, graph state, and Mongoose overhead the ceiling is reachable before any users notice.

**Why it happens:**
MongoDB's hard BSON limit is 16 mebibytes per document. The existing schema stores everything — master tokens, graphState, and the themes array — in one `TokenCollection` document. The themes field is `Schema.Types.Mixed` with `default: []`, and theme creation uses `$push`, so nothing prevents unbounded growth. The `tokens` field on each theme is not bounded.

**How to avoid:**
- Before adding `tokens` to the theme type, calculate a realistic worst-case size: count the largest collection's token JSON size, multiply by `(max expected themes + 1)`, add overhead for graphState and other fields.
- Enforce a per-collection theme limit in the POST handler (e.g., 10 themes max) and return a 422 with a clear message when exceeded.
- If collections regularly exceed ~2 MB with master tokens alone, treat theme token data as a separate document referenced by ID (bucket pattern). This adds a fetch per theme switch but removes the size risk entirely.
- Monitor document size server-side in the theme POST route before confirming creation: use `BSON.calculateObjectSize()` or estimate from JSON string length.

**Warning signs:**
- `BSONObjectTooLarge` error from MongoDB on theme creation or collection update.
- Slow `findById` on the collection document (MongoDB loads the entire document into memory; large documents slow all reads even when projecting).
- `themes` array length approaching 5+ with a collection that has 200+ tokens.

**Phase to address:**
Theme data model extension phase (schema migration + theme POST route). Enforce the theme limit and document size guard before writing any token data to themes.

---

### Pitfall 2: `$set themes.$.tokens` Fails When `themes` Is `Schema.Types.Mixed`

**What goes wrong:**
The current schema defines `themes: { type: Schema.Types.Mixed, default: [] }`. The positional operator `$set: { 'themes.$.tokens': ... }` requires Mongoose to know the array element schema to correctly cast and update. With `Schema.Types.Mixed`, Mongoose loses type information and can miscast or silently drop updates. This is a known Mongoose bug (issue #14595, #12530) where positional filtered operators on Mixed-typed arrays produce unexpected results.

**Why it happens:**
`Schema.Types.Mixed` was chosen for the themes field to match the same pattern as `graphState` (also Mixed). This works for whole-field replacement but becomes fragile for surgical updates to individual array elements. When you add a `tokens` sub-field to each theme object, the update path `themes.$.tokens` requires Mongoose to understand that `themes` is an array of objects — which it cannot infer from Mixed.

**How to avoid:**
Two options:
1. Keep `Schema.Types.Mixed` but always update the entire themes array atomically: fetch the document, modify the theme in-process, write the entire array back with `$set: { themes: updatedArray }`. This avoids positional operators entirely and is consistent with how the v1.3 PUT already works for group states.
2. Define a proper subdocument schema for themes (with `_id: false`, `id`, `name`, `groups`, `tokens` fields). This enables positional operators safely and makes Mongoose schema validation a first-class guard.

Option 1 has a TOCTOU risk (two concurrent writes overwrite each other's changes) but is acceptable for single-user, non-collaborative use. Option 2 is cleaner for the long term. Either way: never use `$set: 'themes.$.tokens'` with a Mixed-typed array.

**Warning signs:**
- Updates to theme tokens silently succeed (200 response) but the stored value is unchanged or wrapped in an extra array.
- Mongoose throws `CastError` when writing token objects to a Mixed positional path.
- `findOneAndUpdate` with `themes.$.tokens` returns the document but the token data is not persisted.

**Phase to address:**
Theme data model extension phase — decide the update strategy before writing any API route that modifies theme token data.

---

### Pitfall 3: Inline Token Edit Writes to Master Collection Tokens Instead of Theme Tokens

**What goes wrong:**
The Tokens page (`page.tsx`) currently calls `handleSave` which issues `PUT /api/collections/${id}` with the full `tokens` object. When an active theme is selected and an Enabled group is being edited, this save path writes changes back to the master `tokens` field — not to the active theme's embedded token data. The user sees their edit reflected in the UI, but on next load the theme's token value is unchanged while the master collection has been silently mutated.

**Why it happens:**
`handleSave` is the single primary save action used for all editing contexts. The tokens page does not yet distinguish between "editing master" and "editing an active theme's Enabled group." The `activeThemeId` state exists but is not consulted during save. This will remain the default behavior unless the save path is explicitly branched.

**How to avoid:**
When an `activeThemeId` is set and a group is in `enabled` state:
- Route saves to `PUT /api/collections/${id}/themes/${activeThemeId}` with a `tokens` payload.
- Block the master `PUT /api/collections/${id}` token save entirely (or gray out the Save button with a tooltip explaining the theme context).
- Make the active theme context visually obvious so users understand which data layer they are editing.

For Source groups, writes must be blocked at the UI level — Source = read-only in the context of theme editing.

**Warning signs:**
- Master collection token values change after editing while in theme mode.
- Theme switch shows the old values even after a confirmed save.
- No distinction between "Save" behavior in theme mode vs. no-theme mode.

**Phase to address:**
Inline token editing phase — the conditional save routing must be implemented in the same phase as the editing UI, not a later cleanup.

---

### Pitfall 4: Optimistic Update Race Condition on Rapid Token Value Changes

**What goes wrong:**
The existing `ThemeGroupMatrix` already uses an optimistic update pattern for group state changes (immediately updates local `themes` state, then PUTs to the API, reverts on error). When inline token value editing is added with debounce, a race condition can occur: user edits token A (debounced, in-flight), immediately edits token B (new debounce starts), first request completes and the response is used to reconcile state — overwriting token B's optimistic value with the server's stale response that doesn't include B's change.

**Why it happens:**
Debounced saves fire asynchronously. If the response from request 1 is used to replace local state, it will contain server token data that predates request 2's optimistic write. This is especially risky if the theme's token data is fetched fresh from the API response and set into React state.

**How to avoid:**
- Do not reconcile local state from API responses during an active edit session. Issue `PUT` fire-and-forget (catch errors for toast) and trust the local optimistic state.
- Use a `useRef` for the pending token data (same pattern as `generateTabTokensRef` / `graphStateMapRef` already in the Tokens page) so the debounced function always reads the latest values, not a stale closure.
- Cancel the in-flight debounce timer when a new edit arrives (already the correct pattern with `clearTimeout` before scheduling).
- If the API returns an error, revert to the pre-edit snapshot, not the most recent in-flight state.

**Warning signs:**
- After rapid edits, one or more token values snap back to a previous value on focus-out.
- Console shows API responses returning token values that contradict what the user typed.
- Edit of token A at t=0ms, edit of token B at t=200ms, save of A completes at t=600ms — B's value disappears.

**Phase to address:**
Inline token editing phase — implement the save strategy with explicit handling of concurrent edits before wiring the UI.

---

### Pitfall 5: Group State Permission Check Not Applied at API Layer

**What goes wrong:**
The plan is that `enabled` groups are editable per-theme, `source` groups use the master collection token values (read-only), and `disabled` groups are hidden. If this permission check is only enforced in the UI (by disabling input fields), a direct API call to `PUT /api/collections/${id}/themes/${themeId}` with a tokens payload for a Source group will succeed and overwrite the Source group's values — even though the intent is that Source groups are always read-only in theme context.

**Why it happens:**
The existing theme PUT route only validates the `name` and `groups` fields from the request body. When a `tokens` field is added to the PUT body, nothing in the API currently checks the group state before accepting the write.

**How to avoid:**
In the theme tokens PUT handler, look up the theme's `groups` map for each group being written. Reject writes to groups that are in `source` state with a 422 and a clear error message. This server-side guard is the authoritative check; the UI disable is secondary UX affordance only.

**Warning signs:**
- Postman or curl can write to Source groups without error.
- Token values in Source groups diverge between the theme and the master collection.
- UI shows Source group values as read-only but a reload shows different values.

**Phase to address:**
Theme tokens API route phase — add the group-state authorization check in the same PR that adds the tokens write endpoint.

---

### Pitfall 6: Style Dictionary Programmatic API — `tokens` Property vs. `source/include` for Theme Merging

**What goes wrong:**
The existing `style-dictionary.service.ts` uses the `tokens` property to pass a raw object directly to SD v5 (`new StyleDictionary({ tokens: sanitizedTokens })`). This works for single-token-set builds. For theme-aware export, the natural instinct is to merge the theme token values with the master tokens before passing to SD. If done naively (e.g., `Object.assign(masterTokens, themeTokens)`), Source groups get overwritten by the master values, Enabled groups may not correctly override base values if the merge strategy is wrong, and reference resolution (`{colors.base.blue.200}`) can silently resolve against the merged set rather than the intended source.

**Why it happens:**
SD v5's `source`/`include` array approach handles override semantics natively (source files override include files). The programmatic `tokens` property bypasses this — it's a single merged object, so override priority must be implemented manually. Developers often reach for a simple shallow merge but token structures are deeply nested.

**How to avoid:**
- Use the existing `deepMerge()` function in `style-dictionary.service.ts` — it already implements non-destructive deep merge (target wins on key conflict).
- For theme export: start with master tokens as the base, deep-merge the theme's Enabled group token data on top (theme values win). Source groups: use master values only. Disabled groups: exclude.
- Test the merge output before passing to SD by serializing to JSON and checking that each path resolves to the expected value.
- Log broken references at `console` level (already configured in the service) — do not throw on reference errors during theme export.

**Warning signs:**
- Exported CSS has wrong values for theme-specific overrides (showing base values instead of theme overrides).
- SD throws `BrokenReferences` errors because a Source group token reference points to a group that was excluded.
- Theme export output is identical to the no-theme export.

**Phase to address:**
Style Dictionary theme export phase — the merge strategy must be specified in the phase plan before any SD export code is written.

---

### Pitfall 7: Style Dictionary New SD Instance Per Build Accumulates State Across Multiple Theme Exports

**What goes wrong:**
The current `buildBrandTokens` creates `new StyleDictionary(...)` per format. When exporting multiple themes in sequence, if SD holds any global or static state (registered transforms, formatters, etc.), the second instance may inherit state from the first, producing inconsistent output or caching resolved references from the previous theme's tokens.

**Why it happens:**
SD v5 is designed for CLI use with `buildAllPlatforms()`. The `formatPlatform()` programmatic path is less tested for rapid successive instantiation. Some SD versions maintained a module-level cache for registered tokens. The `log.verbosity: 'silent'` configuration suppresses warning output that would otherwise reveal this.

**How to avoid:**
- Instantiate a fresh `StyleDictionary` object for each theme export, not reusing the same instance.
- Do not register custom transforms or formats outside the constructor (use inline configuration).
- After exporting all themes, verify at least two themes produce demonstrably different output (run a diff in the test).
- Call `sd.init()` before `sd.formatPlatform()` for every instance — this is already done in the current service.

**Warning signs:**
- Second theme export produces identical output to the first.
- Reference values from theme 1 appear in theme 2's output.
- `sd.formatPlatform()` throws a "tokens already registered" or similar error on second call.

**Phase to address:**
Style Dictionary theme export phase — test with at least two themes with distinct values before shipping.

---

### Pitfall 8: Figma Variables API — Modes Require Separate Creation Before Values Can Be Set

**What goes wrong:**
The current Figma export route (`/api/export/figma/route.ts`) sends variables with a single `valuesByMode: { default: ... }` payload. For multi-theme (multi-mode) export, the intuitive approach is to include all mode values inline in the variable creation payload. The Figma Variables API does not work this way: mode IDs must exist before `variableModeValues` can reference them. If you try to create variables with mode references that do not yet exist, the entire atomic operation returns a 400 error and nothing is written.

**Why it happens:**
The Figma POST `/v1/files/:file_key/variables` endpoint treats all operations as one atomic transaction. The four sections — `variableCollections`, `variableModes`, `variables`, `variableModeValues` — are processed in order. You can use temporary IDs (prefixed with `"temp:"`) to reference objects created earlier in the same request, but the order must be correct: collections first, then modes referencing collections, then variables referencing collections, then mode values referencing both variables and modes.

**How to avoid:**
Always structure the payload in the correct dependency order:
1. `variableCollections` — create the collection if it doesn't exist yet.
2. `variableModes` — create one mode per theme, using `variableCollectionId: "temp:col1"` to reference the collection created in step 1.
3. `variables` — create each variable, referencing the collection.
4. `variableModeValues` — set values, referencing variable IDs and mode IDs from steps 2–3.

Use `"temp:X"` prefix for IDs that are created in the same request. The API returns a mapping of temp IDs to real IDs in the response, which must be stored for subsequent update requests.

**Warning signs:**
- 400 response with "variable mode not found" or "invalid modeId" message.
- Variables created but with no values (mode values silently skipped).
- Figma file shows the collection but all variable values are empty.

**Phase to address:**
Figma Variables export phase — the payload construction logic must be rewritten from scratch; the existing single-mode approach cannot be extended incrementally.

---

### Pitfall 9: Figma Variables API — 4 MB Request Body Limit With Large Token Sets

**What goes wrong:**
The Figma POST variables endpoint has a hard 4 MB request body limit (documented: "Request payload too large. The max allowed body size is 4MB"). Exporting multiple themes as modes multiplies the `variableModeValues` array by the number of themes. A collection with 500 tokens and 5 themes generates 2,500 mode value entries. Each entry is a JSON object with variableId, modeId, and a value (color objects are 5 fields). The payload can easily exceed 4 MB before minification.

**Why it happens:**
The current export sends all variables in a single POST. This was acceptable for single-mode export but does not scale to multi-theme mode values.

**How to avoid:**
- Estimate payload size before sending: `JSON.stringify(payload).length` in bytes. If over 3.5 MB, batch the `variableModeValues` across multiple requests.
- On the first request, create collections, modes, and variables. Subsequent requests only update `variableModeValues` in batches of 200–300 entries.
- Store the mode ID and variable ID mapping returned from the first request to use in subsequent batches.

**Warning signs:**
- 413 response from Figma API.
- Export works for small collections but fails silently for large ones.
- `fetch` throws a payload size error before the request even reaches Figma.

**Phase to address:**
Figma Variables export phase — implement chunked export as part of the initial implementation, not as a later fix.

---

### Pitfall 10: Migration of Existing Themes — Missing `tokens` Field Causes Runtime Errors

**What goes wrong:**
The current `ITheme` type has `id`, `name`, and `groups` only. Existing themes in MongoDB have no `tokens` field. When the Tokens page tries to read `activeTheme.tokens` to display per-theme token values, it will get `undefined`. If token display code does not guard against this, the page will either throw a runtime error or silently show no tokens for existing themes. The `ThemeGroupMatrix` renders based on `theme.groups` and will not be affected, but any new code that assumes `theme.tokens` exists will fail for all pre-existing theme documents.

**Why it happens:**
MongoDB is schemaless at the document level even though Mongoose defines a schema. Existing documents written before the schema migration will not have the new `tokens` field — Mongoose defaults only apply to new documents, not to reads of existing ones. The `Schema.Types.Mixed` definition for themes means Mongoose does not apply defaults to array elements.

**How to avoid:**
- Add a Mongoose `get` transform or a service-layer normalization that ensures `theme.tokens` always defaults to `{}` when absent (nullish coalescing in every consumer: `theme.tokens ?? {}`).
- Write a one-time migration script that runs on server startup: fetch all collections, find themes without a `tokens` field, initialize their tokens as a copy of the collection's master tokens, and write back. Gate this on an environment variable flag so it only runs once.
- After migration, validate by counting themes in MongoDB that still lack a `tokens` field: `db.tokencollections.find({ 'themes.tokens': { $exists: false } }).count()` should return 0.

**Warning signs:**
- `TypeError: Cannot read properties of undefined (reading 'X')` in the Tokens page console when switching to an existing theme.
- Token table renders empty when an existing theme is active.
- Theme export for pre-migration themes produces empty output.

**Phase to address:**
Theme data model extension phase — the migration script must run (or migration guard must be in place) before any code that reads `theme.tokens` is deployed.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep `themes` as `Schema.Types.Mixed`, update whole array on every write | No schema migration needed; consistent with existing pattern | Full array round-trips on every edit; TOCTOU risk if multi-user ever added; no Mongoose validation | Acceptable for single-user v1.4; revisit before multi-user |
| Merge master + theme tokens in memory before SD export, skip `source`/`include` | Simpler than multi-file SD setup; no temp files needed | Manual merge must exactly replicate SD override semantics; bugs are silent | Acceptable if deepMerge() is unit-tested with known inputs and expected outputs |
| No per-theme document size guard (rely on MongoDB throwing) | Saves implementation time | 500 error with no useful user message; document may be partially written | Never — always guard before write |
| Inline group-state permission check in UI only (disable input) | Faster to implement | API remains writable; future consumers bypass UI guard | Never — server-side guard is required |
| Use the existing Figma export route with `valuesByMode: { default: ... }` for all themes | Zero new code | Wrong format — multiple modes require separate mode creation; will 400 on multi-mode export | Never — API contract is incompatible with this approach |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| MongoDB / Mongoose | Using `$set: 'themes.$.tokens'` to update token data in a Mixed-typed array | Fetch the document, mutate the theme object in memory, write the entire `themes` array back with `$set: { themes: updatedArray }` |
| Style Dictionary v5 | Passing theme + master tokens merged as the `tokens` property without accounting for Source groups | Build the merged token set explicitly: master for Source groups, theme values for Enabled groups, exclude Disabled groups; then pass to SD |
| Style Dictionary v5 | Calling `buildAllPlatforms()` instead of `formatPlatform()` for in-memory export | Always use `formatPlatform()` for server-side in-memory output; `buildAllPlatforms()` writes to disk and will fail in Next.js API routes |
| Figma Variables API | Sending all themes as mode values in a single flat payload without first creating modes | Create collections and modes in step 1; create variables in step 2; set mode values in step 3 — all in one atomic POST with correct ordering |
| Figma Variables API | Reusing a hardcoded `variableCollectionId: 'default'` (current code) | Use the collection ID returned from a prior GET or from the collection's `figmaCollectionId` metadata; `'default'` will cause 400 |
| Figma Variables API | Assuming the write API is available on all Figma plans | The POST variables endpoint requires Enterprise plan; test against a real Enterprise file or document the requirement clearly in the UI |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching full collection document on every token edit to check group state | Noticeable latency on each keystroke or blur in inline edit; server load spikes | Cache the group state map in the Tokens page React state (already loaded on mount); do not re-fetch from API on each edit | Immediately at any typing speed; already problematic with current debounce |
| Re-running `tokenService.processImportedTokens()` on every theme switch to rebuild groups | UI freezes or stutters when switching themes with large token sets | Call `processImportedTokens` once on load; store result in state; filtering for active theme uses the already-computed `masterGroups` (existing pattern) | Collections with 500+ tokens; noticeable at 200ms+ parse time |
| SD building all 6 formats for all themes in a single API call | Config page hangs or times out; Next.js API route hits the 10-second default timeout | Build formats on demand (user selects format + theme before building); or build asynchronously and stream progress | Any theme count >= 3 with a large collection; Next.js serverless functions have a 10s default limit |
| Figma mode values payload growing linearly with `tokens * themes` | 413 from Figma API; or response timeout before 413 | Batch variableModeValues in groups of 200 per request | ~500 tokens * 3 themes = 1500 entries, approaching 4MB limit |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual distinction between "editing master" and "editing theme Enabled group" | User believes they are editing the theme but actually mutates the master collection | Show a clearly labeled banner ("Editing theme: Dark Mode") with a different background or accent color when an active theme with Enabled group is selected |
| Save button behavior changes silently based on active theme | User hits Ctrl+S expecting to save the collection; instead saves the theme — or vice versa | Make the Save button label reflect context: "Save Collection" vs. "Save Theme Tokens"; disable Ctrl+S for theme edits or re-route it explicitly |
| Source groups look the same as Enabled groups but do not respond to editing | User repeatedly tries to edit Source group tokens, gets no feedback on why inputs are unresponsive | Show a lock icon and "Source" badge on read-only groups; show a tooltip: "This group uses collection default values" |
| Disabled groups simply disappear from the tree when a theme is active | User cannot tell if a group is Disabled vs. genuinely absent from the collection | Add a faint "N groups hidden" count below the tree when theme filtering is active; link to the Themes page to change states |
| No indication when a theme's token data was last synced from the master collection | After the master collection is edited, theme token copies are stale | Show a "synced from collection on [date]" note per theme; offer a "Resync from collection" action that re-copies master values to Enabled groups |

---

## "Looks Done But Isn't" Checklist

- [ ] **Theme token copy on creation:** Theme creation copies master tokens — verify that token references (`{colors.base.blue}`) are preserved as-is (not resolved) in the copied data.
- [ ] **Inline edit permission check:** UI disables Source group inputs — verify that the API also rejects writes to Source groups (not just the UI guard).
- [ ] **Save routing:** Ctrl+S works in theme mode — verify it routes to the theme PUT route, not the master collection PUT.
- [ ] **Migration guard:** Existing themes work after schema addition — verify that `theme.tokens` is initialized before any code reads it on pre-migration documents.
- [ ] **SD export includes theme merge:** Theme export produces different CSS output than no-theme export — verify by diffing the two outputs with a token that differs between theme and master.
- [ ] **Figma export mode ordering:** Figma collection shows N modes (one per theme) after export — verify the mode count in the Figma file matches the number of enabled themes.
- [ ] **BSON size guard:** Creating the Nth theme on a large collection succeeds with a clear error, not a 500 from MongoDB — verify by attempting to add a theme to a collection at 80% of the estimated BSON limit.
- [ ] **Theme selector on Config page:** Selecting a theme on the Config page changes the SD output — verify it actually changes the token input to SD, not just a label.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| BSON limit hit — document write fails | MEDIUM | Drop the newest themes until the document is under limit; implement chunked theme storage (separate documents) retroactively |
| Mixed array $set writes silently fail | LOW | Switch to whole-array replacement strategy: `setThemes` with full array in `$set` instead of positional operator; no data migration needed |
| Master tokens mutated instead of theme tokens | HIGH | Restore master tokens from MongoDB `updatedAt` timestamp (latest correct backup); add diff review to catch future instances |
| Figma export 400 on mode payload | LOW | Restructure payload to correct order (collections → modes → variables → values) in a single deploy; no user data affected |
| Pre-migration themes throw on `theme.tokens` | MEDIUM | Deploy migration script immediately; script is non-destructive (only adds missing fields); run against production with dry-run flag first |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| BSON limit from embedded token copies | Theme data model + schema migration | After creating max themes on largest collection, `Object.keys(theme.tokens).length > 0` and no 500 errors |
| `$set themes.$.tokens` fails with Mixed | Theme data model + schema migration | Unit test: update theme tokens via whole-array $set and verify round-trip equality |
| Inline edit writes to master instead of theme | Inline token editing phase | Edit a token in theme mode; confirm master collection token unchanged; confirm theme token updated |
| Optimistic update race condition | Inline token editing phase | Simulate rapid edits: 5 values in 500ms; all 5 values persist correctly after debounce settles |
| Group state permission not enforced at API | Theme tokens API route | Direct curl PUT to Source group tokens; expect 422 response |
| SD `tokens` property merge strategy | SD theme export phase | SD output for theme with 1 overridden token differs from master export by exactly 1 value |
| SD new instance state accumulation | SD theme export phase | Export 2+ themes sequentially; diff outputs and confirm expected differences |
| Figma mode creation ordering | Figma Variables export phase | POST results in Figma collection with correct mode count and non-empty variable values |
| Figma 4 MB limit | Figma Variables export phase | Test export with 500+ tokens and 3+ themes; no 413 error |
| Migration of existing themes | Theme data model + schema migration phase | After migration, `db.tokencollections.find({'themes.tokens': {$exists:false}}).count() === 0` |

---

## Sources

- MongoDB BSON 16 MB limit: [MongoDB Limits and Thresholds](https://docs.mongodb.com/manual/reference/limits/) — HIGH confidence (official docs)
- MongoDB unbounded arrays anti-pattern: [Avoid Unbounded Arrays](https://www.mongodb.com/docs/atlas/schema-suggestions/avoid-unbounded-arrays/) — HIGH confidence (official Atlas docs)
- Mongoose Mixed type positional operator bug: [Issue #14595](https://github.com/Automattic/mongoose/issues/14595), [Issue #12530](https://github.com/Automattic/mongoose/issues/12530) — HIGH confidence (confirmed Mongoose bug reports)
- Mongoose Mixed type deep modification: [Issue #1694](https://github.com/Automattic/mongoose/issues/1694) — MEDIUM confidence (older, but pattern confirmed by multiple subsequent issues)
- React optimistic update + debounce race conditions: [tkdodo.eu — Concurrent Optimistic Updates](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) — HIGH confidence (authoritative React Query maintainer)
- React stale closure with debounce: [developerway.com — Debouncing in React](https://www.developerway.com/posts/debouncing-in-react) — MEDIUM confidence (verified by React documentation on useRef pattern)
- Style Dictionary v5 programmatic API (`formatPlatform`, `tokens` property vs `source/include`): [styledictionary.com/reference/config](https://styledictionary.com/reference/config/) and [styledictionary.com/reference/hooks/formats](https://styledictionary.com/reference/hooks/formats/) — HIGH confidence (official SD v5 docs)
- Style Dictionary multi-theme pattern: [Multi-axis design tokens with SD — Matt McAdams, 2025](https://mattmcadams.com/posts/2025/multi-axis-design-tokens/) — MEDIUM confidence (verified against SD v5 docs)
- Figma Variables API POST format, atomic operations, 4 MB limit: [developers.figma.com/docs/rest-api/variables-endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/) — HIGH confidence (official Figma developer docs, accessed 2026-03-20)
- Figma Variables API modes and temp IDs: [developers.figma.com/docs/rest-api/variables-types](https://developers.figma.com/docs/rest-api/variables-types/) — HIGH confidence (official Figma docs)
- Codebase inspection: `src/lib/db/models/TokenCollection.ts`, `src/app/api/collections/[id]/themes/route.ts`, `src/app/api/collections/[id]/themes/[themeId]/route.ts`, `src/app/api/export/figma/route.ts`, `src/services/style-dictionary.service.ts`, `src/app/collections/[id]/tokens/page.tsx`, `src/components/themes/ThemeGroupMatrix.tsx` — HIGH confidence (direct inspection of current production code)

---

*Pitfalls research for: ATUI Tokens Manager v1.4 — Theme Token Sets*
*Researched: 2026-03-20*
