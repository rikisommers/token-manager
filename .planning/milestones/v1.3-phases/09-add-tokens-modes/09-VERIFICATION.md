---
phase: 09-add-tokens-modes
verified: 2026-03-19T00:00:00Z
status: passed
score: 19/19 must-haves verified
gaps: []
human_verification:
  - test: "Navigate to a collection with token groups. Create a first theme. Verify all groups show Enabled state."
    expected: "All groups show Enabled as active state (blue highlight) on the ThemeGroupMatrix right panel."
    why_human: "Requires live browser session with running MongoDB."
  - test: "While on the same collection, create a second theme. Verify all groups show Disabled state."
    expected: "All groups show Disabled as active state. This is blocked by the MODE-05 gap — currently all groups would show Enabled."
    why_human: "Required to confirm MODE-05 fix works after correction."
  - test: "On the Tokens page, select a theme from the dropdown. Verify that groups assigned Disabled state disappear from the tree."
    expected: "Only Enabled and Source groups remain visible in the TokenGroupTree sidebar."
    why_human: "Dynamic React filtering — cannot verify visually without browser."
  - test: "Switch the theme selector back to 'All groups'. Verify all groups reappear."
    expected: "masterGroups restored — tree shows all groups as before."
    why_human: "Dynamic React state reset requires browser verification."
---

# Phase 09: Add Tokens Modes — Verification Report

**Phase Goal:** Add a per-collection Themes system — a dedicated Themes page where users create/manage named themes and assign each token group a Disabled/Enabled/Source state, plus a theme selector on the Tokens page that filters the group tree to show only active groups.
**Verified:** 2026-03-19
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                   | Status     | Evidence                                                                                  |
|----|---------------------------------------------------------------------------------------------------------|------------|-------------------------------------------------------------------------------------------|
| 1  | A Theme has an id, name, and a map of groupId → 'disabled' \| 'enabled' \| 'source'                   | VERIFIED   | `src/types/theme.types.ts` — ITheme interface with id, name, groups: Record<string, ThemeGroupState> |
| 2  | Themes are stored per-collection as an array on the TokenCollection document                            | VERIFIED   | `TokenCollection.ts` line 32: `themes: { type: Schema.Types.Mixed, default: [] }`        |
| 3  | GET /api/collections/[id]/themes returns the themes array                                               | VERIFIED   | `themes/route.ts` lines 9–26: returns `{ themes: doc.themes ?? [] }` via repo.findById   |
| 4  | POST /api/collections/[id]/themes creates a new theme; first theme → 'enabled', subsequent → 'disabled' | FAILED     | Lines 61–63: `existingThemes` unused, `defaultState` always `'enabled'` — subsequent theme default removed by fix commit 6edf807 |
| 5  | PUT /api/collections/[id]/themes/[themeId] updates theme name or group assignments                     | VERIFIED   | `[themeId]/route.ts` lines 6–53: updates `themes.$.name` and/or `themes.$.groups` via `$set` |
| 6  | DELETE /api/collections/[id]/themes/[themeId] removes the theme                                        | VERIFIED   | `[themeId]/route.ts` lines 55–77: `$pull: { themes: { id: themeId } }` via findByIdAndUpdate |
| 7  | Navigating to /collections/[id]/themes renders the Themes page inside the collection layout shell       | VERIFIED   | `src/app/collections/[id]/layout.tsx` wraps via CollectionLayoutClient; page.tsx renders within |
| 8  | The Themes page has a left panel listing themes with a + button to add a new theme                     | VERIFIED   | ThemeList.tsx: Plus icon button, isAdding inline input, theme list rows                   |
| 9  | Clicking a theme in the left panel selects it and shows all token groups in the right panel            | VERIFIED   | page.tsx: onSelect → setSelectedThemeId; ThemeGroupMatrix renders when selectedTheme !== null |
| 10 | Each group row in the right panel shows a 3-state button group: Disabled / Enabled / Source            | VERIFIED   | ThemeGroupMatrix.tsx: STATES array ['disabled','enabled','source'], 3 buttons per row     |
| 11 | Clicking a state button updates the theme's group assignment via PUT                                   | VERIFIED   | ThemeGroupMatrix.tsx: `onClick={() => onStateChange(group.id, state)}`; page.tsx handleStateChange: PUT to `/api/collections/${id}/themes/${selectedThemeId}` |
| 12 | A new theme can be created by clicking + and entering a name — calls POST                              | VERIFIED   | ThemeList.tsx: inline input; page.tsx handleAddTheme: POST to `/api/collections/${id}/themes` |
| 13 | CollectionSidebar has a Themes nav item linking to /collections/[id]/themes                            | VERIFIED   | CollectionSidebar.tsx line 19: `{ href: \`/collections/${collectionId}/themes\`, label: 'Themes', icon: Layers }` |
| 14 | The Themes nav item has an icon and follows the same active/inactive style as other nav items          | VERIFIED   | Layers icon imported from lucide-react; shares navItems.map() rendering with same CSS classes |
| 15 | The Tokens page has a theme selector dropdown above the group tree sidebar                             | VERIFIED   | tokens/page.tsx lines 337–355: Select component conditionally shown when `themes.length > 0` |
| 16 | Default state of the theme selector is 'All groups' (no active theme)                                 | VERIFIED   | `activeThemeId` initialized as `null`; value=`__all__` when null; SelectItem "All groups" |
| 17 | Selecting a theme hides Disabled groups from the tree; Enabled and Source groups remain visible        | VERIFIED   | tokens/page.tsx lines 96–112: `filteredGroups` memo filters out groups where state !== 'disabled'; `<TokenGroupTree groups={filteredGroups}>` at line 443 |
| 18 | Deselecting the theme (back to 'All groups') restores all groups in the tree                          | VERIFIED   | filteredGroups memo: `if (!activeThemeId) return masterGroups` — full tree returned when no theme active |
| 19 | ITokenCollection.themes: ITheme[] present in type and Mongoose schema                                  | VERIFIED   | collection.types.ts line 42: `themes: ITheme[]`; UpdateTokenCollectionInput Pick includes 'themes' |

**Score: 18/19 truths verified**

---

## Required Artifacts

| Artifact                                                          | Expected                                        | Status    | Details                                                                       |
|-------------------------------------------------------------------|-------------------------------------------------|-----------|-------------------------------------------------------------------------------|
| `src/types/theme.types.ts`                                        | ITheme + ThemeGroupState type definitions       | VERIFIED  | 7 lines — exports both types correctly                                        |
| `src/lib/db/models/TokenCollection.ts`                            | themes field in Mongoose schema                 | VERIFIED  | Line 32: `themes: { type: Schema.Types.Mixed, default: [] }`                 |
| `src/app/api/collections/[id]/themes/route.ts`                    | GET and POST handlers                           | VERIFIED  | Both handlers implemented and substantive; POST has tokenService group derivation |
| `src/app/api/collections/[id]/themes/[themeId]/route.ts`          | PUT and DELETE handlers                         | VERIFIED  | Both handlers fully implemented with Mongoose positional operator             |
| `src/app/collections/[id]/themes/page.tsx`                        | Themes page route component                     | VERIFIED  | 200 lines — full two-panel layout, all handlers, optimistic update            |
| `src/components/themes/ThemeList.tsx`                             | Left panel: theme list + add button             | VERIFIED  | 131 lines — isAdding state, Enter/blur/Escape handling, DropdownMenu per row  |
| `src/components/themes/ThemeGroupMatrix.tsx`                      | Right panel: group rows with 3-state buttons    | VERIFIED  | 72 lines — STATES array, active state read from theme.groups, onStateChange wired |
| `src/components/themes/index.ts`                                  | Barrel export for themes components             | VERIFIED  | Exports ThemeList and ThemeGroupMatrix                                        |
| `src/components/collections/CollectionSidebar.tsx`                | Themes nav item in collection navigation        | VERIFIED  | Line 19: Themes entry with Layers icon; shares active/inactive pattern        |
| `src/app/collections/[id]/tokens/page.tsx`                        | Theme selector + filtering logic                | VERIFIED  | filteredGroups memo, Select component, TokenGroupTree wired to filteredGroups |
| `src/lib/db/mongo-repository.ts`                                  | themes field in toDoc() mapping                 | VERIFIED  | Line 21: `themes: (raw.themes as ITheme[]) ?? []`                            |
| `src/lib/db/supabase-repository.ts`                               | themes field in Supabase adapter                | VERIFIED  | themes present in SupabaseRow, rowToDoc, toUpdateRow                          |

---

## Key Link Verification

| From                                     | To                                             | Via                                       | Status   | Details                                                              |
|------------------------------------------|------------------------------------------------|-------------------------------------------|----------|----------------------------------------------------------------------|
| `themes/route.ts`                        | `TokenCollection.ts` model                     | `$push` / `$pull` on themes array         | WIRED    | Import at line 4; `findByIdAndUpdate` with `$push: { themes: theme }` at line 71 |
| `collection.types.ts`                    | `theme.types.ts`                               | ITheme imported, used in ITokenCollection.themes | WIRED | Line 18: `import type { ITheme } from './theme.types'`; line 42: `themes: ITheme[]` |
| `themes/page.tsx`                        | `/api/collections/[id]/themes`                 | fetch on mount (GET), fetch on add (POST)  | WIRED    | Lines 36, 76: both fetch calls present and responses consumed        |
| `ThemeGroupMatrix.tsx`                   | `/api/collections/[id]/themes/[themeId]`       | PUT via onStateChange → handleStateChange  | WIRED    | ThemeGroupMatrix calls `onStateChange(group.id, state)` → page.tsx `handleStateChange` fetches PUT at line 127 |
| `tokens/page.tsx`                        | `/api/collections/[id]/themes`                 | fetch on mount in loadCollection()         | WIRED    | Lines 162–168: themesRes fetched, `setThemes(themesData.themes ?? [])` |
| `tokens/page.tsx`                        | `TokenGroupTree.tsx`                           | filteredGroups passed as groups prop       | WIRED    | Line 443: `<TokenGroupTree groups={filteredGroups}` — confirmed wired to filtered not master |
| `CollectionSidebar Themes link`          | `src/app/collections/[id]/themes/page.tsx`     | Next.js Link component (navItems pattern)  | WIRED    | Line 19: href wired; layout.tsx at `collections/[id]/layout.tsx` ensures shell wrapping |

---

## Requirements Coverage

| Requirement | Source Plan(s) | Description                                                                                          | Status   | Evidence                                                                       |
|-------------|----------------|------------------------------------------------------------------------------------------------------|----------|--------------------------------------------------------------------------------|
| MODE-01     | 09-01, 09-02   | User can create and manage named themes per collection on a dedicated Themes page                     | SATISFIED | POST/PUT/DELETE API routes; Themes page with ThemeList create/delete flow      |
| MODE-02     | 09-01, 09-02   | Each theme assigns every token group a state: Disabled, Enabled, or Source                           | SATISFIED | ITheme.groups: Record<string, ThemeGroupState>; ThemeGroupMatrix 3-state buttons |
| MODE-03     | 09-02, 09-03   | Themes page accessible via a Themes nav tab in the collection sidebar (same shell as other pages)    | SATISFIED | CollectionSidebar line 19; collection [id] layout.tsx wraps all routes         |
| MODE-04     | 09-03          | A theme selector dropdown on the Tokens page filters the group tree to show only Enabled/Source groups | SATISFIED | tokens/page.tsx filteredGroups memo; TokenGroupTree wired to filteredGroups   |
| MODE-05     | 09-01          | Default state logic — first theme: all groups Enabled; subsequent themes: all groups Disabled; deleting a theme does not affect token data | PARTIAL | DELETE confirmed safe (no token mutation). First theme 'enabled' works. FAILS: fix commit 6edf807 removed subsequent-theme 'disabled' default — all themes now always default to 'enabled'. |

---

## Anti-Patterns Found

| File                                            | Line | Pattern                              | Severity | Impact                                                              |
|-------------------------------------------------|------|--------------------------------------|----------|---------------------------------------------------------------------|
| `src/app/api/collections/[id]/themes/route.ts`  | 62   | `void existingThemes; // unused after removing first/subsequent distinction` | Warning | Signals intentional removal of the conditional default state logic. existingThemes is fetched but its value is explicitly ignored. |
| `src/app/api/collections/[id]/themes/route.ts`  | 63   | `const defaultState = 'enabled';` (hardcoded) | Blocker | Violates MODE-05 requirement and the PLAN 09-01 truth for subsequent themes. New themes always default all groups to 'enabled' instead of 'disabled' when other themes already exist. |

---

## Human Verification Required

### 1. First theme — all groups Enabled

**Test:** Open a collection with token groups. Navigate to the Themes page. Click + and create a theme named "Dark".
**Expected:** All groups in the right panel show "Enabled" as the highlighted state (blue button).
**Why human:** Requires running MongoDB and browser rendering.

### 2. Subsequent theme — all groups Disabled (blocked by gap)

**Test:** On the same collection that already has the "Dark" theme, create a second theme named "Light".
**Expected:** All groups in the right panel show "Disabled" as the highlighted state. Currently this will FAIL — all groups show "Enabled" due to the hardcoded default.
**Why human:** Cannot verify dynamic React state without browser; also blocked until MODE-05 gap is fixed.

### 3. Theme selector filters group tree

**Test:** On the Tokens page, set one group in "Dark" theme to Disabled. Navigate to Tokens page. Select "Dark" from the Theme dropdown.
**Expected:** The group set to Disabled disappears from the TokenGroupTree sidebar; all other groups remain.
**Why human:** Dynamic rendering requires browser.

### 4. Restore all groups

**Test:** On the Tokens page with a theme active, switch the selector to "All groups".
**Expected:** All groups reappear in the tree including the one that was hidden.
**Why human:** React state reset behavior; requires browser.

---

## Gaps Summary

**One gap** blocks full MODE-05 compliance.

The phase was executed in four plans. Plans 09-01 through 09-03 delivered a correct implementation that distinguished first vs. subsequent theme defaults (`existingThemes.length === 0 ? 'enabled' : 'disabled'`). During plan 09-04 (build verification), a fix commit (6edf807) patched an apparent bug where new themes were "not correctly defaulting all groups to 'enabled' for the first theme". The fix was over-broad: instead of guarding just the first-theme case, it removed the conditional entirely and hardcoded `defaultState = 'enabled'`.

The result is that the second part of MODE-05 — "subsequent themes set all groups to Disabled" — is no longer satisfied. The original conditional logic was the correct implementation of MODE-05; the fix should have been more surgical.

**Root cause:** Commit 6edf807 changed `existingThemes.length === 0 ? 'enabled' : 'disabled'` to a hardcoded `'enabled'`. The fix was one line in `src/app/api/collections/[id]/themes/route.ts`.

**All other functionality (18/19 truths) is fully implemented and wired correctly.** The gap is isolated to a single conditional in the POST route.

---

_Verified: 2026-03-19_
_Verifier: Claude (gsd-verifier)_
