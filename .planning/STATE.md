# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-12)

**Core value:** Token collections are always available and editable — accessible via collection-scoped URLs, with per-collection Figma/GitHub config persisted to MongoDB, full CRUD from a card grid, and Figma import/export integrated.
**Current focus:** v1.2 — Phase 6: Selection, Breadcrumbs, Content Scoping

## Current Position

Phase: 6 of 7 (Selection, Breadcrumbs, Content Scoping)
Plan: 3 of 3 in current phase
Status: 06-03 complete — Phase 6 fully complete, human-verified in browser
Last activity: 2026-03-13 — Phase 6 Plan 03 complete (GroupBreadcrumb wired, content scoping, empty state)

Progress: [████░░░░░░] 40% (v1.2)

## Performance Metrics

**Velocity:**
- Total plans completed (v1.2): 5
- Average duration: ~8 min
- Total execution time: ~42 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 5. Tree Data Model | 2 | ~30 min | ~15 min |
| 6. Selection + Breadcrumbs | 3 | ~12 min | ~4 min |

*Updated after each plan completion*

## Accumulated Context

### Roadmap Evolution

- v1.0 (Phases 1-7): MongoDB persistence, collection CRUD, Figma integration, unified tabbed UI
- v1.1 (Phases 1-4): shadcn/ui migration, sidebar layout restructure, collection card grid, collection-scoped routing, per-collection config persistence to MongoDB
- v1.2 (Phases 5-7): Token groups tree in sidebar, breadcrumb navigation, content scoped to selected group
- Phase 8 added: Clean code

### Decisions

All decisions logged in PROJECT.md Key Decisions table.

**Phase 5 key decisions:**
- Flat-node rendering for TokenGroupTree (FlatNode[] list, not nested JSX recursion)
- No expand/collapse toggle in Phase 5 — all nodes always visible (overrides TREE-05; deferred)
- Dynamic indent via inline style (paddingLeft), not Tailwind (Tailwind cannot compute runtime values)
- Add-group sidebar UI deferred to Phase 7 (Mutations)
**Phase 6 key decisions:**
- [06-01]: Background-only highlight (bg-gray-200) on selected node — no left border (user decision)
- [06-01]: onGroupSelect uses optional chaining (onGroupSelect?.) so TokenGroupTree works standalone without a handler
- [06-02]: Used local findAncestors helper instead of findGroupById — findGroupById returns only the node, not its ancestors
- [06-02]: GroupBreadcrumb display labels derived from last segment of parseGroupPath(group.name) — consistent with TokenGroupTree FlatNode.displayLabel
- [06-03]: Recursive group resolution in TokenGeneratorFormNew: fast path for top-level, findGroupById fallback for nested nodes
- [06-03]: Empty state checks found.tokens.length === 0 regardless of children — parent-only groups show "No tokens in this group"

### Pending Todos

None.

### Blockers/Concerns

None — Phase 5 complete. Blocker resolved: onGroupsChange now emits full TokenGroup[] with children (05-01).

## Session Continuity

Last session: 2026-03-13
Stopped at: Completed 06-03-PLAN.md (GroupBreadcrumb wiring, content scoping, empty state) — Phase 6 complete, human-verified
Resume file: None
