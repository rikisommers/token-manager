---
phase: 04-collection-management
plan: "05"
subsystem: collection-settings
tags: [settings, auto-save, figma, github, per-collection, debounce]
dependency_graph:
  requires:
    - 04-01  # Collection schema + API extension (figmaToken, figmaFileId, githubRepo, githubBranch fields)
    - 04-04  # Collection-scoped layout + CollectionSidebar (Settings nav link)
  provides:
    - per-collection settings page at /collections/[id]/settings
    - auto-save config persistence to MongoDB
  affects:
    - src/app/api/collections/[id]/route.ts (PUT called by settings page)
tech_stack:
  added: []
  patterns:
    - debounced auto-save with useRef timer
    - didMountRef pattern to skip initial mount effect
    - localStorage fallback pre-population from existing config keys
key_files:
  created:
    - src/app/collections/[id]/settings/page.tsx
  modified: []
decisions:
  - localStorage keys used are 'figma-config' (JSON: {token, fileUrl, fileKey}) and 'github-config' (JSON: {repository, token, branch}) — these are the actual keys used by FigmaConfig.tsx and GitHubConfig.tsx, not the atui-* keys mentioned in the plan spec
  - figmaFileId mapped from figmaConfig.fileKey (the extracted file key, not the full URL)
  - githubRepo mapped from githubConfig.repository
  - Clear buttons bypass debounce and call saveToDb immediately; React state update then fires debounced auto-save too (harmless double-save with same null values)
  - No shadcn Label component available — used standard <label> elements with Tailwind classes
metrics:
  duration: ~15 minutes
  completed: 2026-03-12
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 4 Plan 5: Per-Collection Settings Page Summary

**One-liner:** Per-collection settings page at /collections/[id]/settings with debounced auto-save for Figma token, Figma file ID, GitHub repo, and GitHub branch — values persisted to MongoDB, pre-populated from localStorage when DB values are null.

## What Was Built

A `'use client'` settings page (`src/app/collections/[id]/settings/page.tsx`) that:

1. On mount, fetches the collection from `GET /api/collections/[id]` to load the collection name and current config values
2. For each of the four config fields (figmaToken, figmaFileId, githubRepo, githubBranch): uses DB value if non-null, otherwise falls back to matching localStorage key
3. Watches all four fields in a `useEffect` with an 800ms debounce timer (stored in `useRef`) — sets `saveStatus = 'saving'` immediately, then PUTs to `/api/collections/[id]` after the delay
4. On successful save: shows "Saved" badge for 2 seconds then returns to idle
5. Per-section "Clear" buttons bypass the debounce and call `saveToDb` immediately with empty strings converted to `null`
6. Save status badge in heading row: animated spinner ("Saving..."), green dot ("Saved"), red dot ("Error saving")
7. `didMountRef` prevents auto-save from firing on the initial data load

## localStorage Key Discovery

The plan noted to verify actual localStorage keys from FigmaConfig.tsx and GitHubConfig.tsx. The actual keys found:
- `figma-config` — stores a JSON object `{ token: string, fileUrl: string, fileKey: string }`
  - Maps to: `figmaToken = figmaConfig.token`, `figmaFileId = figmaConfig.fileKey`
- `github-config` — stores a JSON object `{ repository: string, token: string, branch: string }`
  - Maps to: `githubRepo = githubConfig.repository`, `githubBranch = githubConfig.branch`

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written with one discovery deviation (localStorage key names).

### Noted Differences

**1. [Discovery] Different localStorage key names than plan spec**
- Plan specified: `atui-figma-token`, `atui-figma-file-id`, `atui-github-repo`, `atui-github-branch`
- Actual keys in FigmaConfig.tsx / GitHubConfig.tsx: `figma-config` (JSON object) and `github-config` (JSON object)
- Resolution: Used actual keys as instructed — "Verify actual key names... If different keys are used, adopt the actual keys"

## Self-Check: PASSED

Files created:
- `src/app/collections/[id]/settings/page.tsx` — FOUND

Commits:
- `397967d` feat(04-05): per-collection settings page with auto-saving config fields — FOUND
