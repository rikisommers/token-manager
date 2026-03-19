# Phase 11: Inline Token Editing UI - Research

**Researched:** 2026-03-20
**Domain:** React inline editing, Next.js App Router client components, MongoDB whole-array $set, theme-aware token display
**Confidence:** HIGH

## Summary

Phase 11 wires the theme selector on the Tokens page into a genuine read/write layer. When a named theme is active and the selected group is Enabled, the token value column becomes editable inline — saves go to `PATCH /api/collections/[id]/themes/[themeId]/tokens` (new route) which replaces `theme.tokens` via whole-array `$set`. When a group is Source, values are read-only (no click-to-edit). When a group is Disabled, it has already been filtered from the tree by the existing `filteredGroups` memo in `tokens/page.tsx`.

The key architectural insight is that `theme.tokens` (a `TokenGroup[]` tree) is the data source for a named theme, while `masterGroups` (the collection's live token data) is the data source for Default/Source mode. Editing in named-theme mode requires: (1) loading `activeTheme.tokens` into a local editable copy, (2) modifying that local copy on cell blur/Enter, (3) PATCHing the whole tokens array to the API on each auto-save. The existing `TokenTableRow` component in `TokenGeneratorForm.tsx` already implements the click-to-edit / blur-to-save / Enter-to-save pattern — Phase 11 reuses it directly for theme-mode editing.

A "Default" theme dropdown option maps to `activeThemeId === null`, which is the existing behavior — master collection tokens, fully editable. Named themes (`activeThemeId !== null`) need the new editing mode. The theme selector already exists in the header bar; the only change needed is making "Default" the pre-selected permanent first option and hiding the selector when no named themes exist.

**Primary recommendation:** Build Phase 11 as three connected pieces: (1) fix the theme selector UX (Default always selected, hidden when no themes), (2) add the PATCH `/api/collections/[id]/themes/[themeId]/tokens` API route, (3) update the Tokens page to switch the token display source and editability based on active theme + group state, with a reset button on overridden values.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Theme Selector Placement**
- Header bar dropdown on the Tokens page, next to the collection name
- Compact, always visible, doesn't change the page layout
- Hidden entirely when no named themes exist (collection-only state)
- When themes exist, "Default" is always the first option and is pre-selected

**Default Theme Behavior**
- There is always a selected theme — no "no-theme" state
- "Default" option in the dropdown = the **Source** state — master collection tokens, editable directly
- Default is always first in the dropdown and auto-selected on page load
- All token fields are editable in Default/Source mode (this is the existing token editing behavior)
- Named themes (dark, light, etc.) are layered on top of the Source defaults

**Theme Switching**
- Switching themes keeps context — if the current group is Enabled in the new theme, stay on it; if not (Disabled/unavailable), fall back to first available Enabled group
- The entire Tokens page reflects the active theme: group tree shows only Enabled groups (Disabled ones hidden), token values show the theme's values

**Editing Interaction**
- Click the value cell to edit inline (text → input on click)
- Auto-save on blur or Enter key — no explicit save button
- Source group values: no edit cursor, visually read-only (no click-to-edit)
- Disabled groups: not shown in the group tree at all

**Reset to Default**
- A reset icon is always visible beside token values that differ from the collection default
- Clicking reset restores the collection default value for that token in the active theme
- No general "override indicator" — theme values are expected to differ, so no badge/dot/color needed beyond the reset button itself

### Claude's Discretion
- Exact reset icon design (follow existing icon patterns in codebase)
- Inline input styling (width, focus ring, etc.)
- Loading/saving state feedback during PATCH calls
- Error handling for failed saves

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EDIT-01 | Group state controls token display when a theme is active: Enabled shows theme token values (editable), Source shows collection-default values (read-only), Disabled hides the group from the tree | `filteredGroups` memo already hides Disabled groups. Source/Enabled distinction requires checking `activeTheme.groups[groupId]` to decide editable vs read-only rendering. |
| EDIT-02 | User can edit token values inline on the Tokens page when an Enabled group is selected under an active theme | The `TokenTableRow` component in `TokenGeneratorForm.tsx` already has click-to-edit / blur / Enter patterns. Phase 11 extends this with a theme-mode copy of the active theme's token tree. |
| EDIT-03 | Inline token edits are saved to the active theme's embedded token data (not the master collection) | New `PATCH /api/collections/[id]/themes/[themeId]/tokens` route. Body: `{ tokens: TokenGroup[] }`. Whole-array `$set: { themes: updatedThemes }` per STATE.md pattern. Source-group writes rejected 422. |
| EDIT-04 | Tokens whose values differ from the collection default are visually indicated (override indicator) | Per CONTEXT.md: a reset button (always visible when value differs), using `RotateCcw` or `RefreshCw` from lucide-react. Compare `themeToken.value` vs `masterToken.value` by token path. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.2.0 (installed) | Client component state for editable cells, theme selector | Project baseline |
| Next.js | 13.5.6 (installed) | App Router API route for PATCH endpoint | Project baseline |
| lucide-react | ^0.577.0 (installed) | Reset icon (`RotateCcw`) | Already used throughout codebase for action icons; `RefreshCw` is used in `AppHeader.tsx`, `RotateCcw` is available |
| Mongoose | ^9.2.2 (installed) | Whole-array `$set: { themes: updatedThemes }` for token persistence | Established project pattern |
| TypeScript | 5.2.2 (installed) | Type safety for `ITheme.tokens`, group state lookups | Project baseline |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-select | ^2.2.6 (installed) | Theme selector dropdown (already used in header bar) | Already wired in `tokens/page.tsx` |
| react-colorful | ^5.6.1 (installed) | Color picker for color-type tokens (already used in `TokenTableRow`) | Color tokens only |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Whole-array PATCH (replace `theme.tokens`) | Partial update (patch individual token) | Positional `$set` on Mixed arrays is unreliable (Mongoose #14595, #12530). STATE.md mandates whole-array `$set`. |
| Auto-save on blur/Enter | Explicit Save button | CONTEXT.md decision: auto-save. Matches existing `TokenTableRow` behavior. |
| In-place edit in `TokenGeneratorForm` | Separate theme-mode component | `TokenGeneratorForm` is the authoritative token editor — its `TokenTableRow` sub-component is reusable. Phase 11 should hook into it with props, not duplicate it. |

**Installation:**
```bash
# No new packages required — all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── api/collections/[id]/themes/[themeId]/
│   │   ├── route.ts             # EXISTING — PUT (name/groups), DELETE
│   │   └── tokens/
│   │       └── route.ts         # NEW — PATCH (replace theme.tokens)
│   └── collections/[id]/tokens/
│       └── page.tsx             # MODIFY — theme-aware render, reset button
├── components/
│   └── tokens/
│       └── TokenGeneratorForm.tsx  # MODIFY — accept activeTheme + groupState props
```

### Pattern 1: The PATCH `/api/collections/[id]/themes/[themeId]/tokens` route

**What:** A new Next.js App Router route that accepts `{ tokens: TokenGroup[] }` in the body and replaces `theme.tokens` using whole-array `$set`. Source groups are identified by `theme.groups[groupId] === 'source'` — if any source-group token is being edited, return 422.

**When to use:** Called automatically on every auto-save (blur or Enter in a themed-mode editable cell).

```typescript
// src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';
import type { TokenGroup } from '@/types';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; themeId: string } }
) {
  try {
    const body = await request.json() as { tokens?: TokenGroup[] };

    if (!Array.isArray(body.tokens)) {
      return NextResponse.json({ error: 'tokens must be an array' }, { status: 400 });
    }

    await dbConnect();

    const collection = await TokenCollection.findById(params.id).lean() as Record<string, unknown> | null;
    if (!collection) {
      return NextResponse.json({ error: 'Collection or theme not found' }, { status: 404 });
    }

    const themes = (collection.themes as Array<Record<string, unknown>>) ?? [];
    const themeIndex = themes.findIndex((t) => (t.id as string) === params.themeId);

    if (themeIndex === -1) {
      return NextResponse.json({ error: 'Collection or theme not found' }, { status: 404 });
    }

    const theme = themes[themeIndex];
    const groups = (theme.groups as Record<string, string>) ?? {};

    // Source-group write guard: reject if any token in the payload belongs to a source group
    // (Source groups should display master collection values — writes are blocked)
    // Note: group ownership is determined by the group ID on each TokenGroup in the token tree
    const hasSourceWrite = (body.tokens as TokenGroup[]).some(
      (g) => groups[g.id] === 'source'
    );
    if (hasSourceWrite) {
      return NextResponse.json(
        { error: 'Cannot write to source groups' },
        { status: 422 }
      );
    }

    const updatedTheme = { ...theme, tokens: body.tokens };
    const updatedThemes = [
      ...themes.slice(0, themeIndex),
      updatedTheme,
      ...themes.slice(themeIndex + 1),
    ];

    await TokenCollection.findByIdAndUpdate(
      params.id,
      { $set: { themes: updatedThemes } }
    ).lean();

    return NextResponse.json({ tokens: body.tokens });
  } catch (error) {
    console.error('[PATCH /api/collections/[id]/themes/[themeId]/tokens]', error);
    return NextResponse.json({ error: 'Failed to update theme tokens' }, { status: 500 });
  }
}
```

### Pattern 2: Theme-aware token display in `tokens/page.tsx`

**What:** The Tokens page already loads `themes` and has `activeThemeId` state. The `filteredGroups` memo already hides Disabled groups. Phase 11 adds:
1. A `activeTheme` derived value from `themes.find(t => t.id === activeThemeId)`.
2. The token display source switches: when `activeThemeId !== null` and group state is `'enabled'`, render tokens from `activeTheme.tokens` (the theme's embedded copy), not `masterGroups`.
3. When group state is `'source'`, render from `masterGroups` as read-only.
4. When `activeThemeId === null` (Default), existing behavior — render from `masterGroups` as editable.

**Theme selector UX fix:**
- Currently the selector shows "All groups" as the null option. Change to "Default" (always first, always pre-selected on load).
- Hide the entire selector `div` when `themes.length === 0`.
- Initialize `activeThemeId` to `null` on load (represents Default); do not auto-select the first named theme.

**Theme switching — group fallback:**
```typescript
// When activeThemeId changes:
const handleThemeChange = (newThemeId: string | null) => {
  setActiveThemeId(newThemeId);
  if (!newThemeId) return; // Default — keep current group if it exists in masterGroups
  const newTheme = themes.find(t => t.id === newThemeId);
  if (!newTheme) return;
  const currentGroupState = selectedGroupId ? (newTheme.groups[selectedGroupId] ?? 'disabled') : 'disabled';
  if (currentGroupState === 'disabled' || !selectedGroupId) {
    // Fall back to first enabled group in the new theme
    const allGroupIds = flattenGroups(masterGroups).map(g => g.id);
    const firstEnabled = allGroupIds.find(id => newTheme.groups[id] === 'enabled');
    setSelectedGroupId(firstEnabled ?? '');
  }
  // If 'enabled' or 'source', stay on current group
};
```

### Pattern 3: Override indicator + reset button

**What:** When a named theme is active and a token value in `activeTheme.tokens` differs from the corresponding token in `masterGroups` (matched by token `path`), show a reset button (always visible, not hover-only per CONTEXT.md).

**Reset icon:** Use `RotateCcw` from `lucide-react` (consistent with the `RefreshCw` used in `AppHeader.tsx` — same icon family). Size `12` to match `Trash2` size `12` used in `TokenTableRow`.

**Reset action:** Find the master token by path, set the theme token's value back to the master value, trigger the auto-save PATCH.

```typescript
// In the themed TokenTableRow (or as a prop to TokenTableRow):
const masterToken = findTokenByPath(masterGroups, token.path);
const isDifferentFromDefault = masterToken && String(token.value) !== String(masterToken.value);

// In JSX, beside the value column:
{isDifferentFromDefault && activeThemeId && (
  <button
    title="Reset to collection default"
    onClick={(e) => { e.stopPropagation(); onResetToDefault(group.id, token.id, masterToken.value); }}
    className="text-gray-400 hover:text-indigo-600 flex-shrink-0"
  >
    <RotateCcw size={12} />
  </button>
)}
```

### Pattern 4: Auto-save PATCH on blur/Enter in themed mode

**What:** The existing `TokenTableRow` auto-saves locally (in memory) on blur/Enter. In theme mode, after each local state update, trigger a PATCH to `/api/collections/[id]/themes/[themeId]/tokens` with the full updated `theme.tokens` array.

**Debounce:** Use a debounced save (300–500ms after the last change) to avoid a PATCH on every keystroke. The existing graph auto-save in `tokens/page.tsx` already uses `setTimeout` for this pattern:

```typescript
// tokens/page.tsx — debounced theme token save
const themeTokenSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleThemeTokenChange = useCallback((updatedTokens: TokenGroup[]) => {
  setActiveThemeTokens(updatedTokens);

  if (themeTokenSaveTimerRef.current) clearTimeout(themeTokenSaveTimerRef.current);
  themeTokenSaveTimerRef.current = setTimeout(async () => {
    if (!activeThemeId) return;
    await fetch(`/api/collections/${id}/themes/${activeThemeId}/tokens`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens: updatedTokens }),
    });
  }, 400);
}, [id, activeThemeId]);
```

### Pattern 5: Read-only rendering for Source groups

**What:** When `activeTheme.groups[selectedGroupId] === 'source'`, render token values as plain text (no cursor-pointer / click-to-edit). The `cursor-text` class is used in `TokenTableRow` for editable fields — simply omit it, or use `cursor-default`, for Source mode.

**Implementation approach:** Pass an `isReadOnly` boolean prop to `TokenTableRow` (or to the value cell's `enterEdit` handler) that disables the `onClick` on the value display div. The name, type, description columns should also be read-only in Source mode since the user is viewing collection defaults.

### Anti-Patterns to Avoid

- **Storing the flat group list for theme tokens:** `activeTheme.tokens` is `TokenGroup[]` (a tree). Do not flatten it before passing to the editor — the tree structure is needed for rendering.
- **Positional `$set` on Mixed-typed theme arrays:** The project decision (STATE.md) mandates whole-array `$set: { themes: updatedThemes }` for all theme mutations. The PATCH route must follow this.
- **Writing to source groups:** Source-group tokens display collection defaults (read-only). If a PATCH arrives with source-group token IDs in the payload, the API returns 422. The UI should never allow edits to Source groups.
- **Auto-selecting the first theme on load:** Default is always selected on page load. Named themes must be explicitly selected by the user.
- **PATCHing the master collection when in theme mode:** Theme edits must go to `PATCH .../themes/[themeId]/tokens`, not to `PUT /api/collections/[id]`.
- **Duplicating `TokenTableRow`:** The existing inline-edit component in `TokenGeneratorForm.tsx` should be reused or extended, not copied. Add `isReadOnly` and `onResetToDefault` props to the existing component.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Inline click-to-edit cells | Custom div-based editor | Extend existing `TokenTableRow` in `TokenGeneratorForm.tsx` | Already handles blur, Enter, Escape, focus-within, color picker |
| Debounced auto-save | Custom debounce utility | `useRef<setTimeout>` pattern already in `tokens/page.tsx` for graph auto-save | Consistent with existing pattern |
| Token lookup by path | Custom tree traversal | Adapt existing `findGroupById` in `utils/` | Path-based lookup is a simple recursive walk — minimal new code |
| MongoDB whole-array update | Positional $set | `findByIdAndUpdate(..., { $set: { themes: updatedThemes } })` | Established project decision |

**Key insight:** The hard parts already exist: the inline editor (`TokenTableRow`), the debounce pattern (graph auto-save), the API update pattern (whole-array `$set`), and the group-state filtering (`filteredGroups` memo). Phase 11 connects these pieces rather than building new infrastructure.

## Common Pitfalls

### Pitfall 1: Token lookup by path vs. by ID

**What goes wrong:** `masterGroups` tokens have IDs that were generated at import time. `activeTheme.tokens` has the same IDs (snapshot at creation time). But if new tokens were added to the master collection after theme creation, those tokens do not exist in `activeTheme.tokens`. Lookup by `token.id` will fail for post-creation master tokens.

**Why it happens:** `theme.tokens` is a snapshot — it is not kept in sync with master automatically.

**How to avoid:** Always use `token.path` (the dot-path within a group, e.g. `"primary"`) as the key for comparing theme values against master values. Path is stable even if IDs differ.

**Warning signs:** Reset button never appears even when values differ; or override indicator shows for tokens that have not been edited.

### Pitfall 2: Theme selector defaults to "All groups" (null) but CONTEXT.md requires "Default"

**What goes wrong:** The current `tokens/page.tsx` uses `value="__all__"` as the null option label "All groups". CONTEXT.md requires this be relabeled "Default" and be pre-selected on page load (same null value, different label).

**Why it happens:** The existing code predates the Phase 11 decision. The selector was built for a "no active theme" concept, but CONTEXT.md reframes it as "Default is always selected".

**How to avoid:** Change `SelectItem value="__all__"` label from "All groups" to "Default". The underlying `null` state value is correct — only the label changes. Ensure the selector is hidden (`themes.length === 0`) not just when there are zero themes, but the `themes` array from the API is used (the selector already checks `themes.length > 0`).

### Pitfall 3: Editing theme tokens modifies masterGroups state

**What goes wrong:** The `TokenGeneratorForm` manages `tokenGroups` state internally. If the form is reused for theme editing without isolation, edits to theme tokens could accidentally propagate to the master collection via `onTokensChange`.

**Why it happens:** `TokenGeneratorForm` calls `onTokensChange` whenever `tokenGroups` changes; `tokens/page.tsx` uses this to set `generateTabTokens`, which feeds into the Save button.

**How to avoid:** Either (a) pass a separate `themeTokens` state tracked independently of `masterGroups`, or (b) render a different editable surface for theme mode (e.g., a simpler table in the tokens page that doesn't use `TokenGeneratorForm`'s internal state). The cleanest approach is to add an `activeTheme` prop to `tokens/page.tsx` that changes the token source and save target without touching `masterGroups`.

### Pitfall 4: Group state check uses masterGroups group IDs vs. theme.groups keys

**What goes wrong:** `activeTheme.groups` uses path-based group IDs (e.g. `"colors"`, `"colors/brand"`). The `masterGroups` `TokenGroup.id` values must match these keys exactly. If they diverge (due to re-import or rename), state checks fail.

**Why it happens:** Group IDs are derived from `tokenService.processImportedTokens` which uses path-based IDs. As long as master tokens haven't changed structure since theme creation, they match.

**How to avoid:** Use `group.id` from `masterGroups` to look up `activeTheme.groups[group.id]` — this is the established pattern already used in `ThemeGroupMatrix` and `filteredGroups`. Do not generate new IDs for theme-mode rendering.

### Pitfall 5: Source group write not blocked at API

**What goes wrong:** A future bug or race condition causes the UI to send a PATCH with source-group tokens. Without server-side validation, these writes silently corrupt the theme.

**Why it happens:** UI-only guards are not sufficient for write safety.

**How to avoid:** The PATCH route must check `theme.groups[g.id] === 'source'` for each root group in the payload and return 422 if found. This is a Success Criterion in the phase description.

### Pitfall 6: Theme switch doesn't fall back when current group is Disabled in new theme

**What goes wrong:** User selects a different theme; the current selected group has state `'disabled'` in the new theme. The tree hides the group but the `selectedGroupId` still points to it. The main panel shows nothing.

**Why it happens:** `selectedGroupId` is not cleared or updated when the theme changes.

**How to avoid:** In the `handleThemeChange` handler, check `newTheme.groups[selectedGroupId]`. If `'disabled'` or missing, find and select the first enabled group. This is a locked decision from CONTEXT.md.

## Code Examples

Verified patterns from codebase inspection:

### Existing theme selector in `tokens/page.tsx` (current shape — needs label change)

```typescript
// src/app/collections/[id]/tokens/page.tsx — existing selector (lines ~337-355)
{themes.length > 0 && (
  <div className="flex items-center gap-2">
    <label className="text-sm text-gray-600 whitespace-nowrap">Theme:</label>
    <Select
      value={activeThemeId ?? '__all__'}
      onValueChange={(v) => setActiveThemeId(v === '__all__' ? null : v)}
    >
      <SelectTrigger className="w-36 h-8 text-sm">
        <SelectValue placeholder="All groups" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">All groups</SelectItem>  {/* CHANGE TO: "Default" */}
        {themes.map(t => (
          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

### Existing whole-array $set pattern (from PUT themes/[themeId]/route.ts)

```typescript
// Established pattern — Phase 11 PATCH route follows the same shape
await TokenCollection.findByIdAndUpdate(
  params.id,
  { $set: { themes: updatedThemes } }
).lean();
```

### Existing graph auto-save debounce (from tokens/page.tsx)

```typescript
// Reference pattern for the theme token debounced auto-save
if (graphAutoSaveTimerRef.current) clearTimeout(graphAutoSaveTimerRef.current);
graphAutoSaveTimerRef.current = setTimeout(() => {
  // ... fetch PATCH
}, 1500);
```

### Existing TokenTableRow click-to-edit pattern

```typescript
// TokenGeneratorForm.tsx — enterEdit pattern (already implemented)
const enterEdit = useCallback((field: string) => (e: React.MouseEvent) => {
  e.stopPropagation();
  setEditingField(field);
}, []);

// Value display — click activates input
<div
  className="flex-1 cursor-text text-sm font-mono text-gray-700 truncate"
  onClick={enterEdit('value')}
>
  {token.value?.toString() || ...}
</div>
// For read-only Source mode: remove onClick, change cursor-text → cursor-default
```

### lucide-react icons used in project (reset icon options)

```typescript
// RotateCcw is available in lucide-react ^0.577.0 — best fit for "reset"
// RefreshCw is already imported in AppHeader.tsx (same icon family)
import { RotateCcw } from 'lucide-react';

// Usage pattern (consistent with Trash2 size={12} in TokenTableRow):
<RotateCcw size={12} />
```

### Finding a token by path across TokenGroup tree

```typescript
// Utility needed for comparing theme token vs master token
function findTokenByPath(groups: TokenGroup[], groupId: string, tokenPath: string): GeneratedToken | null {
  for (const g of groups) {
    if (g.id === groupId) {
      return g.tokens.find(t => t.path === tokenPath) ?? null;
    }
    if (g.children?.length) {
      const found = findTokenByPath(g.children, groupId, tokenPath);
      if (found) return found;
    }
  }
  return null;
}
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Theme selector shows "All groups" null state | Theme selector shows "Default" (always first, always pre-selected) | Clarifies the mental model: Default = master collection, named theme = layered overrides |
| No theme-mode editing | Named theme active + Enabled group → editable theme.tokens | EDIT-01, EDIT-02, EDIT-03 |
| No override indicator | Reset button visible when theme value differs from master | EDIT-04 |
| `PUT /themes/[themeId]` only patches name + groups | New `PATCH /themes/[themeId]/tokens` patches the token tree | Separates concern — group state vs token values |

**Deprecated/outdated:**
- The "All groups" label for the null theme state: replaced by "Default".

## Open Questions

1. **How deeply nested can `activeTheme.tokens` be vs. displayed group?**
   - What we know: `theme.tokens` is a full `TokenGroup[]` tree (same shape as `masterGroups`). When a sub-group is selected (e.g. `"colors/brand"`), the page uses `findGroupById` to locate it within the tree. The same lookup must work on `theme.tokens`.
   - What's unclear: Whether `findGroupById` is imported and used from `utils/` or is defined inline in `TokenGeneratorForm`.
   - Recommendation: The existing `findGroupById` from `src/utils/` works on any `TokenGroup[]` tree. Use it on `activeTheme.tokens` the same way it's used on `masterGroups`.

2. **Should the PATCH body be the full `theme.tokens` tree or just the changed group?**
   - What we know: STATE.md mandates whole-array `$set` for theme mutations. `theme.tokens` is a `TokenGroup[]` — the entire field is replaced in one operation.
   - What's unclear: Whether sending the full tree on every single token keystroke (even with debounce) could be a performance issue for large collections.
   - Recommendation: Send the full `theme.tokens` tree (debounced 400ms). For Phase 11 with a 10-theme limit and typical token counts, this is acceptable. Performance optimization (partial patch) is a future concern.

3. **What happens to theme tokens when the master collection is modified?**
   - What we know: REQUIREMENTS.md explicitly says "Automatic propagation of master collection edits into themes" is out of scope. `theme.tokens` is a snapshot; drift is expected.
   - What's unclear: Whether to surface a warning when master and theme are out of sync (e.g., master has tokens not in theme).
   - Recommendation: Ignore drift for Phase 11. THEME-07 (future) handles the resync action. For now, if master has tokens not in `theme.tokens`, those tokens are not shown in theme-edit mode — the theme only knows about tokens that existed at creation time.

## Sources

### Primary (HIGH confidence)

- Codebase inspection: `src/app/collections/[id]/tokens/page.tsx` — existing theme selector, `filteredGroups` memo, `activeThemeId` state, graph auto-save debounce pattern
- Codebase inspection: `src/components/tokens/TokenGeneratorForm.tsx` — `TokenTableRow` click-to-edit pattern, `enterEdit`, blur/Enter save, color picker, `resolveRef`
- Codebase inspection: `src/app/api/collections/[id]/themes/[themeId]/route.ts` — whole-array `$set` pattern for theme updates
- Codebase inspection: `src/types/theme.types.ts` — `ITheme` shape: `{ id, name, groups: Record<string, ThemeGroupState>, tokens: TokenGroup[] }`
- Codebase inspection: `src/types/token.types.ts` — `TokenGroup`, `GeneratedToken` shapes
- Codebase inspection: `src/components/themes/ThemeGroupMatrix.tsx` — `theme.groups[group.id] ?? 'disabled'` state lookup pattern
- Codebase inspection: `src/lib/db/mongo-repository.ts` — `toDoc()` `tokens: (t.tokens as TokenGroup[]) ?? []` normalization (Phase 10 complete)
- `.planning/STATE.md` — Whole-array `$set` decision; `PATCH .../tokens` built in Phase 11; `theme.tokens` stores full `groupTree`
- `.planning/REQUIREMENTS.md` — EDIT-01..04 requirement text

### Secondary (MEDIUM confidence)

- `.planning/phases/11-inline-token-editing-ui/11-CONTEXT.md` — all locked decisions

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in `package.json`, versions verified
- Architecture: HIGH — all patterns derived from existing codebase code; PATCH route modeled directly on PUT route
- Pitfalls: HIGH — all pitfalls derived from reading existing code and STATE.md decisions

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable stack — Next.js 13, Mongoose 9, TypeScript 5, React 18)
