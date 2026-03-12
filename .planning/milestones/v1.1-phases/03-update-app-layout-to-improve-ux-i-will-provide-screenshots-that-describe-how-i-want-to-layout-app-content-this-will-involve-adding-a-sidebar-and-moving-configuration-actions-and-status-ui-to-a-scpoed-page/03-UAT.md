---
status: testing
phase: 03-app-layout-ux
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md]
started: 2026-03-11T09:30:00Z
updated: 2026-03-11T09:30:00Z
---

## Current Test

number: 2
name: Sidebar active nav highlighting
expected: |
  The currently active page's nav item has a filled dark background highlight.
  Navigating between pages updates the highlight to match the current page.
awaiting: user response

## Tests

### 1. Sidebar visible on all pages
expected: A fixed ~200px dark sidebar is visible. It shows "ATUI Tokens" at the top, followed by three nav items with icons: Tokens, Configuration, Settings. The sidebar stays fixed while main content scrolls.
result: pass

### 2. Sidebar active nav highlighting
expected: The currently active page's nav item has a filled dark background highlight. Navigating between pages updates the highlight to match the current page.
result: issue
reported: "the sidebar background color should be white. the active nav item should be background dark. The main app header should be above the sidebar and page content"
severity: major

### 3. Global header — collection selector loads collections from DB
expected: A header bar is visible above all page content with a Collection selector dropdown. Opening the dropdown shows all your saved collections from the database (not just "Local Files"). Selecting a collection updates the context across the app.
result: [pending]

### 4. Global header — New Collection button
expected: A "New Collection" button is in the global header. Clicking it creates a new blank collection, adds it to the dropdown, and selects it.
result: [pending]

### 5. Tokens page layout
expected: The Tokens page (/) shows a collection actions bar at the top (Save As + Delete/Rename/Duplicate actions), SourceContextBar below it, and the Generate Tokens form as the primary content — no old title header, no tab switcher.
result: [pending]

### 6. Configuration page — shows selected collection
expected: Navigating to /configuration shows the name of the currently selected collection in the Build Settings column. Changing the collection in the header updates the Configuration page to reflect the new selection (reactive, not requiring a page refresh).
result: [pending]

### 7. Configuration page — inline build output
expected: The Configuration page has a two-column layout. The right column shows the BuildTokensPanel — format tabs (CSS, SCSS, LESS, JS, TS, JSON) and a Download All button that produces a ZIP file.
result: [pending]

### 8. Settings page — always-expanded forms
expected: The Settings page (/settings) shows two sections: Figma and GitHub. Both forms are always visible — no expand/collapse button required to see the fields.
result: [pending]

## Summary

total: 8
passed: 1
issues: 1
pending: 6
skipped: 0

## Gaps

[none yet]
