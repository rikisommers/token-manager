# Phase 15: multi-row-actions - Research

**Researched:** 2026-03-27
**Domain:** React table multi-select, bulk mutation logic, floating action bar UX
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Selection model**
- Checkboxes are always visible on every token row (not hidden until hover)
- Leftmost column, narrow fixed width (~40px)
- Header checkbox toggles all rows (select-all / deselect-all)
- Shift-click range selection supported
- Selection scoped to the currently active group only — cross-group selection not supported
- Selecting a different group clears the current selection

**Bulk actions available**
- **Delete** — remove all selected tokens; requires confirmation dialog before executing
- **Move to group** — reassign selected tokens to a destination picked via a group-tree-picker modal (not a flat dropdown)
- **Change type** — set all selected tokens to the same type at once (one type picker, applied to all)
- **Add prefix** — inline action in the action bar; text input expands with live rename preview as user types
- **Remove prefix** — separate action from add; auto-detects the longest common prefix of selected tokens and pre-fills the input field; user can edit; non-matching tokens are silently skipped

**Conflict handling**
- Both rename (add/remove prefix) and move-to-group conflicts resolved by auto-suffixing with a numeric index (e.g. `token-name-2`, `token-name-3`)
- No blocking or warning dialogs for conflicts — always proceed with auto-suffix

**Action bar**
- Floating bar appears above the token table when one or more rows are selected; disappears when none are selected
- Bar displays a selection count: "N selected"
- Actions in bar: Delete, Move to group, Change type, Add prefix, Remove prefix
- **Escape** keyboard shortcut clears selection and hides the bar
- Only **Delete** requires a confirmation dialog before executing

**Scope and constraints**
- Checkboxes hidden entirely when the active group is in **Source mode** (read-only under a theme)
- Multi-row actions work in both Default theme and custom themes (Enabled groups only)
- All bulk operations integrate with the **undo stack** (Ctrl+Z undoes a bulk action as a single step)

**Selected row styling**
- Selected rows get a highlight matching the existing focus/hover style (`bg-blue-50 ring-1 ring-inset ring-blue-200` — the same as the single-token focus style already in `TokenTableRow`)

**Empty state**
- If all tokens in a group are bulk-deleted, show the existing empty state — no special bulk-delete empty state needed

### Claude's Discretion

- Prefix add/remove should feel like multi-cursor editing in a text editor — inline, immediate, live preview
- Auto-detect common prefix for Remove Prefix pre-fills the input so the user rarely needs to type anything
- Action bar floating above the table (not sticky bottom) — like Notion / Linear contextual bars

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 15 adds multi-row selection to the existing token table (`TokenTableRow` / `renderGroup` in `TokenGeneratorForm.tsx`) and a floating bulk-action bar. The table currently has no selection model at all — a `Set<string>` of selected token IDs is the natural fit, held in state alongside the existing `expandedTokens: Set<string>` pattern.

All bulk mutations are pure tree transformations on `TokenGroup[]` and follow the exact same dual-path already used by every single-token operation: if `themeTokens` is active, route through `onThemeTokensChange`; otherwise mutate `tokenGroups` and mark `isDirty`. No new API routes are needed — save, undo, and theme propagation all reuse existing plumbing in `page.tsx`.

The biggest novel piece is the prefix-rename logic (add prefix / remove prefix with longest-common-prefix detection and conflict-free suffix) and the group-tree-picker modal for move-to-group. Both belong in `src/utils/` as pure functions following the established `groupMove.ts` pattern. The floating action bar is a simple conditional render above the table — no portal or special positioning needed since the table container already handles overflow correctly.

**Primary recommendation:** Implement selection state in `TokenGeneratorForm` (co-located with `expandedTokens`), extract all bulk mutation logic to `src/utils/bulkTokenActions.ts`, and create three new lightweight components: `BulkActionBar`, `GroupPickerModal`, and a reused `ClearFormDialog`-style `DeleteConfirmDialog`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React `useState` / `useCallback` | 18.2.0 | Selection set, bar visibility | Already in use everywhere |
| Tailwind CSS | 3.3.0 | Checkbox + bar styling | Project-wide styling solution |
| Radix UI `@radix-ui/react-dialog` | 1.1.15 | Delete confirm + group picker modals | Already installed, used for all dialogs |
| `lucide-react` | 0.577.0 | Icons in action bar | Already in use |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native `<input type="checkbox">` | N/A | Checkbox column | Radix Checkbox is not installed; native `<input type="checkbox">` styled with Tailwind is simpler and sufficient |
| `@radix-ui/react-select` | 2.2.6 | Type picker in action bar | Already installed, used for single-token type select |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native checkbox | `@radix-ui/react-checkbox` | Radix Checkbox is not in package.json; installing it adds ~5KB for no functional gain — native checkbox with `accent-color` CSS or Tailwind classes is adequate |
| Inline prefix bar | Separate modal | CONTEXT.md locks this as inline/live preview |
| Flat dropdown for move-to-group | Tree picker modal | CONTEXT.md locks this as group-tree-picker modal |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended File Changes

```
src/
├── utils/
│   └── bulkTokenActions.ts       # NEW — pure bulk mutation helpers
├── components/tokens/
│   ├── TokenGeneratorForm.tsx    # MODIFY — selection state, checkbox column, wire bulk ops
│   ├── BulkActionBar.tsx         # NEW — floating bar component
│   ├── GroupPickerModal.tsx      # NEW — tree picker for move-to-group
│   └── DeleteConfirmDialog.tsx   # NEW — bulk-delete confirm (reuse ClearFormDialog pattern)
```

### Pattern 1: Selection State Co-located with Table State

**What:** `selectedTokenIds: Set<string>` lives in `TokenGeneratorForm` next to `expandedTokens: Set<string>`.

**When to use:** The selection is scoped to the active group view. Changing `selectedGroupId` (the prop) clears the set — handle this with a `useEffect` on `selectedGroupId` that calls `setSelectedTokenIds(new Set())`.

**Example:**
```typescript
// In TokenGeneratorForm
const [selectedTokenIds, setSelectedTokenIds] = useState<Set<string>>(new Set());
const prevGroupId = useRef<string | undefined>(undefined);

// Clear selection when group changes
useEffect(() => {
  if (prevGroupId.current !== selectedGroupId) {
    prevGroupId.current = selectedGroupId;
    setSelectedTokenIds(new Set());
  }
}, [selectedGroupId]);
```

### Pattern 2: Bulk Mutation Dual-Path (themeTokens vs tokenGroups)

**What:** Every bulk operation must mirror the dual-path routing already used by `deleteToken`, `updateToken`, etc.

**When to use:** All bulk actions.

**Example:**
```typescript
// In TokenGeneratorForm — wraps bulkDeleteTokens pure util
const handleBulkDelete = (tokenIds: Set<string>) => {
  const applyDelete = (groups: TokenGroup[]) =>
    bulkDeleteTokens(groups, activeGroupId, tokenIds);

  const groupInTheme = themeTokens && onThemeTokensChange;
  if (groupInTheme) {
    onThemeTokensChange!(applyDelete(themeTokens!));
  } else {
    setTokenGroups(applyDelete(tokenGroups));
    setIsDirty(true);
  }
  setSelectedTokenIds(new Set());
};
```

### Pattern 3: Undo Stack Integration

**What:** The existing `undoStackRef` in `page.tsx` tracks `TokenGroup[][]` with max 20 steps. Bulk operations must push to this stack the same way `handleGroupsReordered` does today.

**When to use:** Every bulk action that mutates tokens.

**Key insight:** The undo stack in `page.tsx` currently only tracks group-level moves (used by drag-and-drop). Bulk token operations mutate `tokenGroups` inside `TokenGeneratorForm` — this state lives in `TokenGeneratorForm`, not `page.tsx`. The existing undo stack only restores `masterGroups` (the group tree), not the token content within groups. Therefore, the undo stack for bulk token actions needs to be a new `undoStackRef` inside `TokenGeneratorForm`, or the existing mechanism needs to be extended.

**Resolution:** Add a `tokenUndoStackRef: useRef<TokenGroup[][]>([])` inside `TokenGeneratorForm`, similar to the existing `undoStackRef` pattern in `page.tsx`. Push the current `tokenGroups` snapshot before each bulk mutation. The existing Ctrl+Z handler in `page.tsx` handles group reorder undo; a new `keydown` handler in `TokenGeneratorForm` (or a shared Escape/Ctrl+Z hook) handles token undo.

**However:** The CONTEXT.md says "All bulk operations integrate with the undo stack (Ctrl+Z undoes a bulk action as a single step)." The existing Ctrl+Z is wired globally in `page.tsx`. The cleanest approach is to propagate undo snapshots upward via a callback prop `onUndoSnapshot?: (groups: TokenGroup[]) => void` so `page.tsx` can push them to its `undoStackRef`. This keeps a single undo stack.

### Pattern 4: Pure Bulk Mutation Helpers in `utils/bulkTokenActions.ts`

**What:** Extract all bulk logic as pure functions operating on `TokenGroup[]` — no React, no side effects.

**Functions to implement:**

```typescript
// Delete selected token IDs from a specific group
export function bulkDeleteTokens(
  groups: TokenGroup[],
  groupId: string,
  tokenIds: Set<string>
): TokenGroup[]

// Move selected tokens to a destination group, with auto-suffix collision avoidance
export function bulkMoveTokens(
  groups: TokenGroup[],
  sourceGroupId: string,
  destGroupId: string,
  tokenIds: Set<string>
): TokenGroup[]

// Set all selected tokens to a new type
export function bulkChangeType(
  groups: TokenGroup[],
  groupId: string,
  tokenIds: Set<string>,
  newType: TokenType
): TokenGroup[]

// Add prefix to selected token paths, with auto-suffix on collision
export function bulkAddPrefix(
  groups: TokenGroup[],
  groupId: string,
  tokenIds: Set<string>,
  prefix: string
): TokenGroup[]

// Remove prefix from selected token paths; skip tokens that don't match
export function bulkRemovePrefix(
  groups: TokenGroup[],
  groupId: string,
  tokenIds: Set<string>,
  prefix: string
): TokenGroup[]

// Detect the longest common prefix across a set of token paths (for pre-fill)
export function detectCommonPrefix(tokenPaths: string[]): string
```

### Pattern 5: Conflict-Free Suffix for Token Paths

**What:** When bulk-moving or renaming causes a `path` collision within a group's token list, append `-2`, `-3`, … up to `-10`, then fall back to a timestamp. This mirrors `resolveCollisionFreeId` in `groupMove.ts`.

```typescript
function resolveTokenPathConflict(
  existingPaths: Set<string>,
  candidate: string
): string {
  if (!existingPaths.has(candidate)) return candidate;
  for (let i = 2; i <= 10; i++) {
    const attempt = `${candidate}-${i}`;
    if (!existingPaths.has(attempt)) return attempt;
  }
  return `${candidate}-${Date.now()}`;
}
```

### Pattern 6: Checkbox Column in TokenTableRow

**What:** Add a leftmost `<td>` with a native checkbox. Pass `isSelected` and `onToggleSelect` as props.

**Shift-click range selection:** Requires a `lastSelectedIndexRef` within `TokenGeneratorForm`. On shift+click, compute the range between last selected index and current index in `group.tokens`, toggle all in that range to the new selected state.

```typescript
// In TokenTableRow props
isMultiSelected?: boolean;
onMultiSelect?: (tokenId: string, shiftKey: boolean) => void;
```

**Source mode hiding:** When `isReadOnly` prop is true (Source group under a theme), render `null` for the checkbox cell and the header checkbox.

### Pattern 7: BulkActionBar Component

**What:** A div absolutely/relatively positioned above the token table, conditionally rendered when `selectedTokenIds.size > 0`.

**Escape key:** Add a `keydown` listener in `BulkActionBar` or pass an `onClearSelection` callback that the Escape key invokes from `TokenGeneratorForm`'s global keydown handler.

**Prefix inline expand:** The Add Prefix and Remove Prefix actions expand an `<Input>` inline within the bar. The live preview (rename preview as user types) renders below or beside the input as a small list or count — e.g. "Renames 5 tokens: `color-red` → `brand-color-red`".

```typescript
interface BulkActionBarProps {
  selectedCount: number;
  allTokenPaths: string[];       // paths of selected tokens for preview
  onDelete: () => void;
  onMoveToGroup: () => void;
  onChangeType: (type: TokenType) => void;
  onAddPrefix: (prefix: string) => void;
  onRemovePrefix: (prefix: string) => void;
  onClearSelection: () => void;
  detectedPrefix: string;        // pre-filled for remove-prefix input
  isReadOnly: boolean;
}
```

### Anti-Patterns to Avoid

- **Storing selection in `page.tsx`:** The selection is a UI concern scoped to the table component; keeping it in `page.tsx` would require passing it through two levels of props.
- **Using a flat dropdown for move-to-group:** CONTEXT.md explicitly requires a group-tree-picker modal, not a `<Select>` dropdown.
- **Directly mutating `tokenGroups` inside handlers:** Always create new arrays (immutable updates) to keep React diffing correct and undo snapshots clean.
- **A separate undo stack per bulk operation type:** Use one unified stack; push one snapshot per bulk action regardless of type.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Checkbox column | Custom toggle button | Native `<input type="checkbox">` with Tailwind `accent-blue-500` | Already handles keyboard, focus, accessibility — no Radix needed |
| Dialog for delete confirm | Custom alert | Existing `Dialog` + `DialogFooter` pattern (see `ClearFormDialog.tsx`) | Pattern already established in 3+ places in the codebase |
| Group tree picker | Build from scratch | Reuse `TokenGroupTree` render logic or a simplified recursive tree component | The tree structure and data are already available as `masterGroups` |
| Conflict suffix generation | One-off logic | Extract `resolveTokenPathConflict` mirroring `resolveCollisionFreeId` in `groupMove.ts` | Edge cases at suffix boundaries already solved there |

**Key insight:** Every building block already exists — the challenge is wiring them together correctly in the dual-path (themeTokens vs tokenGroups) routing model.

---

## Common Pitfalls

### Pitfall 1: Selection Not Cleared on Group Switch

**What goes wrong:** User selects tokens in group A, navigates to group B, action bar still shows and acts on wrong tokens.

**Why it happens:** `selectedTokenIds` is a Set inside `TokenGeneratorForm`; `selectedGroupId` prop comes from outside. The internal set doesn't know the group changed.

**How to avoid:** `useEffect(() => { setSelectedTokenIds(new Set()); }, [selectedGroupId])` inside `TokenGeneratorForm`. Also clear on theme change since `TokenGeneratorForm` remounts with a new `key` (`key={${id}-${activeThemeId ?? 'default'}}`) — which means the entire component unmounts and remounts, so state resets naturally on theme switch.

**Warning signs:** Action bar shows "5 selected" after clicking a different group in the sidebar.

### Pitfall 2: Source Mode Shows Checkboxes

**What goes wrong:** Checkboxes appear in a Source group (read-only under a theme), allowing apparent selection with no actual effect.

**Why it happens:** The `isReadOnly` prop is already threaded into `TokenTableRow`; forgetting to conditionally hide the checkbox column.

**How to avoid:** Render the checkbox `<td>` as `null` when `isReadOnly` is true. Also hide the header checkbox in `renderGroup`.

**Warning signs:** Checkboxes visible when viewing a Source group; bulk delete confirmation runs but nothing changes.

### Pitfall 3: Undo Captures Too Late (After Mutation)

**What goes wrong:** Pressing Ctrl+Z restores the already-mutated state, not the pre-mutation state.

**Why it happens:** Pushing the snapshot after calling the mutation helper instead of before.

**How to avoid:** Always push the snapshot to the undo stack BEFORE calling the bulk mutation. Pattern from `handleGroupsReordered` in `page.tsx`:
```typescript
undoStackRef.current = [currentTokenGroups, ...undoStackRef.current.slice(0, MAX_UNDO - 1)];
// THEN apply the mutation
```

**Warning signs:** Ctrl+Z appears to do nothing or restores to post-mutation state.

### Pitfall 4: Shift-Click Range with Filtered / Theme Tokens

**What goes wrong:** Shift-click computes a range based on `group.tokens` index, but when `themeTokens` is active the rendered tokens come from `themeTokens` not `tokenGroups`. The index mapping breaks.

**Why it happens:** `renderGroup` already has this dual-source logic (`themeTokens && themeTokens.length > 0 ? themeTokens : tokenGroups`). Range selection must use the same source array.

**How to avoid:** Pass the `activeTokens` array (whichever source was used to render) to the shift-click handler, not a hardcoded `tokenGroups.find(...)`.

### Pitfall 5: Move-to-Group Puts Tokens in Wrong Location for Themes

**What goes wrong:** Moving tokens when a custom theme is active mutates `themeTokens` (correct) but does not update `masterGroups` (the default collection token content). The destination group in `masterGroups` does not gain the tokens.

**Why it happens:** In theme mode, edits go to `themeTokens` only (via `onThemeTokensChange`). The design is intentional — theme edits don't touch master. However, "move-to-group" in theme context is ambiguous: are you moving the theme-specific token or the master token?

**How to avoid:** Per CONTEXT.md, "multi-row actions work in both Default theme and custom themes (Enabled groups only)." Accept the behaviour: in theme mode, move only affects the theme's token copy. The user moves a token to group B in the theme; the master collection still has the token in group A. This is consistent with how individual token edits work. Document this as expected behaviour in code comments.

### Pitfall 6: Prefix Rename Breaks Token References (Alias Values)

**What goes wrong:** Token A has path `base-red` and token B references it as `{my-group.base-red}`. After adding prefix `color-`, token A becomes `color-base-red` but token B's alias still points to `{my-group.base-red}`.

**Why it happens:** Prefix rename only rewrites `token.path`; it does not scan the group for alias references pointing to the renamed tokens.

**How to avoid:** `bulkAddPrefix` and `bulkRemovePrefix` should also rewrite alias values within the same group that reference the renamed token paths. Scope the rewrite to the active group only (cross-group alias resolution is not in scope for this phase).

**Warning signs:** After bulk rename, some tokens show broken reference warnings or `undefined` resolved values.

---

## Code Examples

Verified patterns from existing codebase:

### Existing Single-Token Delete (model to follow for bulk)
```typescript
// TokenGeneratorForm.tsx ~line 1055
const deleteToken = (groupId: string, tokenId: string) => {
  if (isReadOnly) return;
  const updateGroup = (groups: TokenGroup[]): TokenGroup[] =>
    groups.map((group) => {
      if (group.id === groupId) {
        return { ...group, tokens: group.tokens.filter((t) => t.id !== tokenId) };
      }
      if (group.children?.length) return { ...group, children: updateGroup(group.children) };
      return group;
    });

  const groupInTheme = themeTokens && onThemeTokensChange &&
    (themeTokens.some((g) => g.id === groupId) || !!findGroupById(themeTokens, groupId));
  if (groupInTheme) {
    onThemeTokensChange!(updateGroup(themeTokens!));
  } else {
    setTokenGroups(updateGroup(tokenGroups));
    setIsDirty(true);
  }
};
```

### Existing Dialog Pattern (model for DeleteConfirmDialog)
```typescript
// ClearFormDialog.tsx — the pattern to replicate
<Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader><DialogTitle>Delete tokens</DialogTitle></DialogHeader>
    <p className="text-sm text-gray-600">Delete {count} selected tokens?</p>
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={onConfirm}>Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Undo Stack Push Pattern
```typescript
// page.tsx ~line 347 — copy this pattern for bulk token undo
undoStackRef.current = [
  masterGroups,
  ...undoStackRef.current.slice(0, MAX_UNDO - 1),
];
```

### Existing Selected Row Styling (reuse for multi-select)
```typescript
// TokenTableRow.tsx ~line 172 — the blue-50 ring style is already there
className={`transition-colors group/row ${
  isSelected
    ? "bg-blue-50 ring-1 ring-inset ring-blue-200"
    : "hover:bg-gray-50/60"
}`}
```

### Checkbox Column (native approach)
```typescript
// New leftmost <td> in TokenTableRow
<td className="w-10 px-2 py-0 border-r border-gray-100" onClick={(e) => e.stopPropagation()}>
  <input
    type="checkbox"
    checked={isMultiSelected}
    onChange={(e) => onMultiSelect?.(token.id, e.nativeEvent instanceof MouseEvent && (e.nativeEvent as MouseEvent).shiftKey)}
    className="accent-blue-500 w-4 h-4 cursor-pointer"
    aria-label={`Select token ${token.path}`}
  />
</td>
```

### Longest Common Prefix Detection
```typescript
// Pure util function for bulkTokenActions.ts
export function detectCommonPrefix(paths: string[]): string {
  if (paths.length === 0) return '';
  if (paths.length === 1) return '';
  const sorted = [...paths].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  let i = 0;
  while (i < first.length && first[i] === last[i]) i++;
  // Trim to last '-' or '.' boundary to avoid partial word splits
  const raw = first.slice(0, i);
  const lastSep = Math.max(raw.lastIndexOf('-'), raw.lastIndexOf('.'));
  return lastSep > 0 ? raw.slice(0, lastSep + 1) : raw;
}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| No checkbox column | Always-visible checkbox column (leftmost, ~40px) | CONTEXT.md decision |
| Single token delete (row hover action) | Bulk delete via action bar | Both coexist |
| Flat dropdown for group move | Group-tree-picker modal | CONTEXT.md decision |

---

## Open Questions

1. **GroupPickerModal tree depth**
   - What we know: `masterGroups` is a recursive `TokenGroup[]` tree with arbitrary depth.
   - What's unclear: Should the modal show all groups (including sub-groups) or only top-level groups?
   - Recommendation: Show all groups including sub-groups, matching the existing `TokenGroupTree` sidebar. Reuse the `flattenTree` utility from `groupMove.ts` to render the flat list with indentation.

2. **Prefix live preview scope**
   - What we know: CONTEXT.md says "live rename preview as user types."
   - What's unclear: How many tokens to show in the preview before truncating?
   - Recommendation: Show all selected token paths with the prefix applied, up to 5 tokens; show "+N more" for the remainder. Keep the preview compact — one line per token, monospace font, same pattern as token path display in the table.

3. **Undo for theme-mode bulk actions**
   - What we know: Theme token mutations call `handleThemeTokenChange` which does a debounced PATCH to the API.
   - What's unclear: Should Ctrl+Z after a theme-mode bulk delete undo the local state and re-trigger the PATCH, or only undo local state?
   - Recommendation: Undo only local state (same as single-token edit undo is not implemented). Add a `themeTokenUndoStackRef` inside `TokenGeneratorForm` that mirrors the approach. On undo, restore `activeThemeTokens` and call `handleThemeTokenChange` with the restored state.

---

## Validation Architecture

> Skipped — `workflow.nyquist_validation` is not present in `.planning/config.json` (no `nyquist_validation` key).

---

## Sources

### Primary (HIGH confidence)

- Direct codebase reading — `src/components/tokens/TokenGeneratorForm.tsx`, `src/app/collections/[id]/tokens/page.tsx`, `src/utils/groupMove.ts`, `src/utils/token.utils.ts`, `src/types/token.types.ts`
- `src/components/ui/` directory listing — confirmed no Radix Checkbox installed
- `package.json` — confirmed dependency versions and available libraries

### Secondary (MEDIUM confidence)

- Pattern inference from `ClearFormDialog.tsx`, `SortableGroupRow.tsx`, `TokenGroupTree.tsx` — established project component patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed from package.json and component directory
- Architecture: HIGH — based on direct codebase reading; all patterns are observed, not hypothesized
- Pitfalls: HIGH — derived from reading the actual dual-path routing logic and undo stack code

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable codebase, no fast-moving external dependencies)
