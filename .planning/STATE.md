---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: Theme Token Sets
status: complete
last_updated: "2026-03-25T00:00:00Z"
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 6
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-19)

**Core value:** Token collections are always available and editable: stored in MongoDB, accessible via collection-scoped URLs, with per-collection Figma/GitHub config, full CRUD from the collections grid, Figma import/export fully integrated, and a Themes system for filtering active token groups.
**Current focus:** Phase 14 Dark Mode Support — In Progress

## Current Position

Phase: 14 of 14 (Dark Mode Support) — In Progress
Plan: 01 complete — 2 tasks done
Status: In Progress
Last activity: 2026-03-25 — 14-01 complete: ColorMode type + ITheme.colorMode + POST/PUT colorMode support

Progress: [█▒▒▒] Phase 14 in progress (1/3 plans done)

## Performance Metrics

**Velocity (v1.3 reference):**
- Total plans completed (v1.3): 9
- Average duration: ~5 min
- Total execution time: ~42 min

**By Phase (v1.3):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 8. Clean Code | 5 | ~25 min | ~5 min |
| 9. Add Tokens Modes | 4 | ~21 min | ~5 min |

*Updated after each plan completion*
| Phase 11-inline-token-editing-ui P01 | 2 | 1 tasks | 1 files |
| Phase 11-inline-token-editing-ui P02 | 3 | 2 tasks | 1 files |
| Phase 11-inline-token-editing-ui P03 | 5 | 2 tasks | 2 files |
| Phase 12-theme-aware-export P01 | ~2 min | 2 tasks | 3 files |
| Phase 12-theme-aware-export P02 | ~2 min | 2 tasks | 3 files |
| Phase 12-theme-aware-export P03 | ~2 min | 1 tasks | 1 files |
| Phase 12-theme-aware-export P04 | 1 | 0 tasks | 0 files |
| Phase 13-groups-ordering-drag-and-drop P01 | ~3 min | 2 tasks | 3 files |
| Phase 13-groups-ordering-drag-and-drop P02 | ~1 min | 1 tasks | 1 files |
| Phase 13-groups-ordering-drag-and-drop P03 | ~10min | 2 tasks | 2 files |
| Phase 14-dark-mode-support P01 | ~2 min | 2 tasks | 3 files |

## Accumulated Context

### Roadmap Evolution

- v1.0 (Phases 1-7): MongoDB persistence, collection CRUD, Figma integration, unified tabbed UI
- v1.1 (Phases 1-4): shadcn/ui migration, sidebar layout restructure, collection card grid, collection-scoped routing, per-collection config persistence to MongoDB
- v1.2 (Phases 5-6): Token groups tree in sidebar, breadcrumb navigation, content scoped to selected group (Phase 7 Mutations deferred)
- v1.3 (Phases 8-9): Clean code + Add Tokens Modes (Themes feature)
- v1.4 (Phases 10-12): Theme Token Sets — themes become actual value stores
- Phase 13 added: groups ordering drag and drop
- Phase 14 added: dark mode support

### Decisions

All decisions logged in PROJECT.md Key Decisions table.

Key decisions relevant to v1.4:
- Whole-array `$set: { themes: updatedArray }` for all theme mutations — positional `$set` on Mixed-typed arrays is unreliable (Mongoose bugs #14595, #12530)
- `ITheme.tokens` is required (not optional) — backward compat handled solely in `toDoc()` normalization with `?? []`; consuming code stays clean
- Theme count limit (max 10) enforced in POST handler (HTTP 422) before BSON document size becomes a problem
- Store full `groupTree` as `theme.tokens` (not `flattenAllGroups` result) — flat list strips children hierarchy needed by Phase 11
- PATCH `/api/collections/[id]/themes/[themeId]/tokens` built in Phase 11 plan 01 — whole-array $set, source-group 422 guard on root-level group IDs only
- Cast `.lean()` result through `unknown` before narrowing to `Record<string,unknown>[]` — TypeScript strict overlap check rejects direct cast from typed Mongoose document arrays
- `atLimit` UI guard pattern: `disabled={atLimit}` + title tooltip + `disabled:opacity-40 disabled:cursor-not-allowed` Tailwind classes
- Root-level source-group guard only (not recursive) — theme.groups maps root-level group IDs; children governed by parent
- [Phase 11-inline-token-editing-ui]: Root-level source-group guard only (not recursive) — theme.groups maps root-level group IDs; children governed by parent
- [Phase 11-02]: activeThemeTokens uses JSON.parse/stringify deep copy — sufficient for plain TokenGroup data objects
- [Phase 11-02]: handleThemeTokenChange is silent on fetch error — mirrors existing graph auto-save pattern
- [Phase 11-inline-token-editing-ui]: themeTokens overlay (not state replacement) in TokenGeneratorForm keeps master collection clean; updateToken routes through onThemeTokensChange when overlay active; switching themes or turning off theme resets to master without any state cleanup
- [Phase 11-inline-token-editing-ui]: updateGroupToken is a pure recursive helper outside component; handleResetToDefault maps activeThemeTokens through it then calls handleThemeTokenChange
- [Phase 12-01]: mergeThemeTokens is a pure helper — merge is done before calling the route; route only reads themeLabel for comment injection (style-dictionary.service.ts stays pure)
- [Phase 12-01]: COMMENT_FORMATS covers css/scss/less/js/ts only — JSON format excluded (JSON spec forbids comments)
- [Phase 12-02]: Theme selector hidden when collection has no themes (themes.length > 0 guard); overflow-auto replaces overflow-hidden on right column
- [Phase 12-03]: Route fetches themes from MongoDB itself using mongoCollectionId — no changes required in ExportToFigmaDialog caller
- [Phase 12-03]: Figma export always includes ALL enabled themes as modes — ignores Config page theme selector entirely
- [Phase 12-theme-aware-export]: Human verification gate for Phase 12 complete feature set — all 6 scenarios approved by user on 2026-03-20
- [Phase 13-01]: applyGroupMove returns { groups, themes } tuple — callers receive updated tree and theme snapshots atomically
- [Phase 13-01]: isDragOverlay split into SortableRowInner — hook calls stay unconditional, overlay uses plain div
- [Phase 13-01]: resolveCollisionFreeId increments suffix -2..-10 then falls back to timestamp — prevents duplicate IDs on reparent
- [Phase 13-02]: DndContext placed inside overflow-y-auto div — DragOverlay portal renders at body level so ghost is never clipped by sidebar overflow
- [Phase 13-02]: applyGroupMove called without themes in TokenGroupTree — theme sync delegated to page (Plan 03)
- [Phase 13-02]: Local FlatNode + flattenTree removed from TokenGroupTree — @/utils/groupMove is canonical source
- [Phase 13-03]: _newGroupsFromTree parameter intentionally unused in page handler — page re-derives from masterGroups + activeId + overId + themes; leading underscore signals intent
- [Phase 13-03]: nonDefaultThemes excludes __default__ from applyGroupMove — synthetic theme rebuilt from masterGroups, not stored in MongoDB
- [Phase 13-03]: Undo stack via useRef (not useState) — no re-renders from stack mutations; max 20 steps
- [Phase 13-03]: Two-call pattern: TokenGroupTree calls applyGroupMove without themes (optimistic UI), page re-calls with themes (authoritative cascade)
- [Phase 13-groups-ordering-drag-and-drop]: Human verification gate for Phase 13 complete drag-and-drop feature set — all 8 scenarios approved by user on 2026-03-21
- [Phase 14-01]: colorMode typed as non-optional (required) on ITheme — backward compat handled via ?? 'light' at DB read sites; no migration script needed
- [Phase 14-01]: POST handler validates colorMode against ['light','dark'] allowlist, defaults to 'light' — graceful default, no 400 on omission
- [Phase 14-01]: PUT handler does not add runtime colorMode validation — body type ColorMode constrains it at TypeScript level

### Pending Todos

None.

### Blockers/Concerns

- Figma Variables POST API requires Figma Enterprise plan — must surface this in export UI (tooltip or note) during Phase 12
- Measure actual BSON size of largest existing collection before Phase 10 ships to calibrate the theme count limit

## Session Continuity

Last session: 2026-03-25
Stopped at: Completed Phase 14 plan 01 — ColorMode type and theme API colorMode support
Resume file: None
