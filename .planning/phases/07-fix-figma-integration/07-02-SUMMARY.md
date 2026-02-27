---
phase: 07-fix-figma-integration
plan: "02"
subsystem: api
tags: [figma, api-routes, mongodb, import, server-proxy]
dependency_graph:
  requires: []
  provides: [GET /api/figma/test, GET /api/figma/collections, POST /api/figma/import]
  affects: [FigmaConfig component (07-01), ImportFigmaDialog (07-03)]
tech_stack:
  added: []
  patterns: [Next.js App Router API routes, server-side Figma proxy, multi-brand token conversion]
key_files:
  created:
    - src/app/api/figma/test/route.ts
    - src/app/api/figma/collections/route.ts
    - src/app/api/figma/import/route.ts
  modified: []
decisions:
  - default export dbConnect from '@/lib/mongodb' (matches existing collections route pattern)
  - convertFigmaValue and mapFigmaType as module-level functions in import/route.ts (collocated with single consumer; consistent with figma.service.ts logic)
  - 502 status for Figma API failures, 400 for missing params, 404 if collectionId not found in file
  - Typed FigmaVariable/FigmaMode/FigmaVariableCollection interfaces inline in import route (avoids importing client-side types; route is server-only)
metrics:
  duration_seconds: 110
  completed_date: "2026-02-28"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 7 Plan 02: Figma API Server-Side Proxy Routes Summary

Three Next.js API routes that proxy Figma API calls server-side (keeping the PAT out of the browser), handle collection listing, and convert multi-mode Figma variable collections into multi-brand MongoDB token documents.

## What Was Built

### GET /api/figma/test (`src/app/api/figma/test/route.ts`)

Validates a Figma Personal Access Token by calling `GET https://api.figma.com/v1/me` with `X-Figma-Token` header.

- Returns `{ ok: true, email }` on success (200)
- Returns `{ error: 'Invalid Figma token' }` on auth failure (401)
- Returns `{ error: 'token parameter required' }` if `?token=` missing (400)
- Returns `{ error: 'Failed to reach Figma API' }` on network error (500)

### GET /api/figma/collections (`src/app/api/figma/collections/route.ts`)

Lists all variable collections from a Figma file.

- Query params: `token`, `fileKey`
- Calls `GET https://api.figma.com/v1/files/{fileKey}/variables/local`
- Parses `data.meta.variableCollections` (object keyed by id) into an array
- Returns `{ collections: [{ id, name, modes: [{ modeId, name }] }] }`
- Returns 400 if either param missing; 502 if Figma API fails

### POST /api/figma/import (`src/app/api/figma/import/route.ts`)

Imports a Figma variable collection as a multi-brand MongoDB token document.

- Body: `{ token, fileKey, collectionId, collectionName }`
- Fetches all variables from the Figma file, filters to `collectionId`
- Converts: each mode becomes a top-level brand key; each variable's slash-separated name becomes a nested path; leaf value is `{ $value, $type }`
- Color conversion: `{r,g,b,a}` -> hex `#rrggbb` or `rgba(r,g,b,a)` when alpha < 1
- Type mapping: COLOR -> 'color', FLOAT -> 'number', STRING/BOOLEAN -> 'string'
- Saves via `TokenCollection.create()` with `sourceMetadata.type = 'figma'`, `figmaFileKey`, `figmaCollectionId`
- Returns `{ collection: { _id, name } }` with 201 Created

## Decisions Made

- **Import pattern for dbConnect:** Used `import dbConnect from '@/lib/mongodb'` (default export) — consistent with all existing API routes in the project.
- **Inline type definitions in import route:** `FigmaVariable`, `FigmaMode`, `FigmaVariableCollection` defined locally in the file rather than importing from `src/services/figma.service.ts`. The service types are tightly coupled to the client-side `FigmaService` class; the API route is server-only and uses only the subset it needs.
- **502 for upstream failures:** Figma API errors propagate as 502 Bad Gateway — signals to the caller that the error is from an upstream dependency, not from our application logic.
- **convertFigmaValue/mapFigmaType as module-level functions:** These helpers are only consumed by this one file; no premature abstraction to a shared module.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | /api/figma/test and /api/figma/collections | c3ac429 | src/app/api/figma/test/route.ts, src/app/api/figma/collections/route.ts |
| 2 | /api/figma/import | ea062e5 | src/app/api/figma/import/route.ts |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

All created files found on disk. All commits verified in git history.
