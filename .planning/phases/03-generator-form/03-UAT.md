---
status: complete
phase: 03-generator-form
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md
started: 2026-02-26T00:00:00Z
updated: 2026-02-26T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Save to Database button visible
expected: Header action bar on /generate shows green "Save to Database" button and indigo "Load Collection" button
result: pass

### 2. Save new collection
expected: Click "Save to Database" → dialog opens with name input → enter a new name → save → toast "Saved to database: [name]" → "Editing: [name]" indicator appears in header
result: pass

### 3. Save duplicate name → overwrite flow
expected: Save with a name that already exists → dialog shows "A collection with this name already exists. Overwrite it?" → click Overwrite → succeeds with toast → no overwrite dialog bypass on first save
result: pass

### 4. Scenario 4 regression — loaded collection same-name save
expected: Load an existing collection, modify a token, click "Save to Database" with the same name as the loaded collection → overwrite confirmation dialog appears (NOT a silent save)
result: pass

### 5. Load Collection dialog
expected: Click "Load Collection" → dialog opens, fetches list of saved collections, shows them in a scrollable list; clicking a name populates the generator form with those tokens and shows "Editing: [name]" in header
result: pass

### 6. Unsaved-changes guard
expected: Load a collection, modify a token (isDirty), then click "Load Collection" and choose another → browser confirm dialog appears asking about unsaved changes before proceeding
result: pass

### 7. Clear form resets editing context
expected: Load a collection (header shows "Editing: [name]"), click Clear Form → "Editing" indicator disappears → clicking "Save to Database" now prompts for a new name (not overwrite)
result: pass

### 8. Token name column — kebab-case display
expected: On /generate, the token table shows a "Token Name" column (not "Path") with values in kebab-case format like `token-color-brand-primary` (hyphens, not dots; no slashes)
result: pass

### 9. Inherited color swatches on /generate
expected: Color tokens that reference another token (e.g. {token.color.brand.primary.value}) show the actual inherited color swatch — not grey (#cccccc)
result: issue
reported: "no"
severity: major

### 10. Token name column on View Tokens page
expected: On /, the table column header reads "Token Name" and values are shown in kebab-case (hyphens not dots)
result: pass

## Summary

total: 10
passed: 9
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Color tokens referencing another token show the actual inherited color swatch on /generate"
  status: failed
  reason: "User reported: no"
  severity: major
  test: 9
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
