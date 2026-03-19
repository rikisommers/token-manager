# ATUI Tokens Manager

## What This Is

A Next.js design token management tool for the Allied Telesis ATUI design system. It allows designers and developers to view, create, edit, and persist design tokens — importing from GitHub repositories and Figma, storing collections in MongoDB for durable access, and exporting to GitHub PRs, Figma, and multiple CSS/JS format files (CSS, SCSS, LESS, JS, TS, JSON). Collections are browseable in a card grid; each collection has scoped pages (Tokens, Themes, Config, Settings) with per-collection Figma/GitHub config persisted to MongoDB. The Tokens page shows all groups as a hierarchical tree with breadcrumb navigation and supports per-collection Themes to filter which groups are active.

## Core Value

Token collections are always available and editable: stored in MongoDB, accessible via collection-scoped URLs, with per-collection Figma/GitHub config, full CRUD from the collections grid, Figma import/export fully integrated, and a Themes system for filtering active token groups.

## Requirements

### Validated

- ✓ User can view all tokens from local `tokens/` directory — existing
- ✓ User can edit individual token values in the token table — existing
- ✓ User can import tokens from a GitHub repository (recursive directory fetch) — existing
- ✓ User can generate/create new token definitions via the generator form — existing
- ✓ User can export tokens to GitHub as a pull request — existing
- ✓ User can export tokens to Figma — existing (fixed and improved in v1.0)
- ✓ User can export tokens in multiple formats (JSON, JS, TS, CSS, SCSS, LESS) — existing
- ✓ App connects to MongoDB for persistent token collection storage — v1.0
- ✓ Local `tokens/` directory files are seeded into MongoDB as default collections on first setup — v1.0
- ✓ User can save a token collection from the generator form to MongoDB (requires naming the collection) — v1.0
- ✓ User can view MongoDB collections on the View Tokens page via a select input — v1.0
- ✓ User can load a collection from MongoDB into the generator form (via dialog listing all collections) — v1.0
- ✓ User can edit a loaded collection's full token data in the generator form — v1.0
- ✓ User can save edits back to MongoDB (update existing collection) — v1.0
- ✓ User can delete a collection from MongoDB — v1.0
- ✓ User can rename a collection in MongoDB — v1.0
- ✓ User can duplicate a collection in MongoDB — v1.0
- ✓ User can build tokens via style-dictionary and download all formats as ZIP — v1.0
- ✓ View and Generate are unified into a single tabbed interface at `/` — v1.0
- ✓ User can import a Figma variable collection and save it as a MongoDB token collection — v1.0
- ✓ User can see which upstream source (GitHub or Figma) a collection came from — v1.0
- ✓ UI uses shadcn/ui components (buttons, tabs, modals, inputs, selects) throughout — v1.1
- ✓ Color token fields use native color picker inputs — v1.1
- ✓ App has persistent left sidebar with collection selector and nav items (Tokens, Config, Settings) — v1.1
- ✓ Collections are browseable in a card grid at `/collections` with CRUD (rename, delete, duplicate) — v1.1
- ✓ Each collection has scoped pages at `/collections/[id]/tokens`, `/collections/[id]/config`, `/collections/[id]/settings` — v1.1
- ✓ Per-collection Figma and GitHub config fields are persisted to MongoDB — v1.1
- ✓ Per-collection Settings page auto-saves config to MongoDB with debounce — v1.1
- ✓ Token groups sidebar displays a hierarchical tree built from parsed path names — v1.2
- ✓ Tree node display names parsed from group path (segments split, `.json` stripped) — v1.2
- ✓ Selecting a tree node highlights it and scopes content area to that group's direct tokens — v1.2
- ✓ Breadcrumb trail above content area reflects full path; each segment navigates to ancestor — v1.2
- ✓ Codebase has zero TypeScript errors; no `@ts-ignore`/`as any` suppressors — v1.3
- ✓ Components organized into feature domain subdirectories with barrel exports — v1.3
- ✓ Dead code and legacy routes removed; single canonical form component — v1.3
- ✓ User can create and manage named themes per collection on a dedicated Themes page — v1.3
- ✓ Each theme assigns every token group a state: Disabled, Enabled, or Source — v1.3
- ✓ Themes page is accessible via a Themes nav tab in the collection sidebar — v1.3
- ✓ Theme selector on Tokens page filters the group tree to show only Enabled/Source groups — v1.3
- ✓ First new theme defaults all groups to Enabled; subsequent themes default to Disabled — v1.3

### Active

- [ ] Tree nodes can be expanded and collapsed (expand/collapse toggle per node)
- [ ] User can add a new group from the tree sidebar (as a child of any node, or at root level)
- [ ] User can add tokens to the currently selected group
- [ ] User can edit token values inline in the currently selected group

### Out of Scope

- Multi-user auth / per-user collections — single-user now; userId field in schema is ready for multi-user later
- Real-time collaboration — no concurrent edit handling
- Token versioning / history — deferred; MongoDB timestamps provide basic backup
- Angular / Stencil / Vite workspaces — explicitly excluded; Angular port is a future milestone
- GitHub API caching — performance improvement, deferred
- CORS / CSRF protection — localhost dev tool; security hardening deferred
- ATUI Stencil components replacing shadcn/ui — integration pattern established in v1.1 but full replacement deferred

## Context

- **Shipped:** v1.3 on 2026-03-19 — 2 phases (8-9), 9 plans, 86 source files changed
- **Prior:** v1.2 phases (5-6) on 2026-03-13 — tree sidebar + breadcrumbs shipped; Phase 7 (Mutations) deferred
- **Prior:** v1.1 on 2026-03-12 — 4 phases, 16 plans, 4-day build
- **Prior:** v1.0 on 2026-02-28 — 7 phases, 23 plans, 3-day build
- **Codebase:** ~22,000 LOC TypeScript; Next.js 13.5.6 + Mongoose + Style Dictionary v5 + JSZip + shadcn/ui (Radix UI)
- **Component structure:** Feature domain folders: `collections/`, `tokens/`, `layout/`, `figma/`, `github/`, `dev/` — each with `index.ts` barrel exports
- **Brownfield:** Existing tool with GitHub import/export; MongoDB layer added in v1.0; UI modernized and routing restructured in v1.1
- **Monorepo:** Yarn 3 workspaces; Angular, Stencil, Vite variants exist but are out of scope (excluded from root tsconfig)
- **Token format:** W3C Design Token Specification; two structure variants
- **Architecture:** API routes in `src/app/api/`; Mongoose models in `src/lib/db/models/`; UI components in `src/components/[domain]/`; shadcn primitives in `src/components/ui/`; collection-scoped routes in `src/app/collections/[id]/`; Themes API at `src/app/api/collections/[id]/themes/`
- **Angular parity doc:** `.planning/ANGULAR_PARITY.md` documents all new API routes and UI patterns for future Angular port
- **Refactor backlog:** `.planning/phases/08-clean-code/REFACTOR-SUGGESTIONS.md` — out-of-scope ideas from Phase 8 SRP audit
- **Build:** Zero TypeScript errors; `yarn build` passes cleanly

## Constraints

- **Tech stack:** Next.js 13.5.6 + TypeScript; must not require framework upgrade
- **Database:** MongoDB via Mongoose; connection string via environment variable `MONGODB_URI`
- **Styling:** Tailwind CSS + shadcn/ui (Radix UI primitives) — no additional UI libraries
- **Scope:** Next.js app only — do not touch Angular, Stencil, or Vite workspaces

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MongoDB as persistence layer | User specified; natural fit for JSON token documents | ✓ Good — Mongoose ODM provided schema validation and convenient model layer |
| Seed from local files once at setup | Keep local `tokens/` as reference without continuous sync | ✓ Good — ts-node + dotenv approach works cleanly |
| Store source config as metadata field (not JSON comment) | Queryable and structured; easier to display in UI | ✓ Good — sourceMetadata used for Figma source context bar |
| userId field nullable in schema | Single-user now, multi-user later — avoids breaking migration | ✓ Good — no friction in v1 |
| Use `TokenGeneratorFormNew` as base | Active component with most features | ✓ Good — saved significant rework |
| Mongoose ODM over native driver | Schema validation + model layer convenience | ✓ Good — used across all API routes |
| Schema.Types.Mixed for tokens field | W3C DTCG format is arbitrary nested JSON | ✓ Good — no issues with arbitrary token structures |
| flattenMongoTokens() inline in page.tsx | Single consumer; avoid premature abstraction | ✓ Good — stayed simple |
| Unified tabbed page (`/`) | Avoid route split between view and generate | ✓ Good (v1.0); superseded by collection-scoped routing in v1.1 |
| FigmaConfig before GitHubConfig in header | Locked decision per CONTEXT.md | ✓ Good — consistent layout |
| Dynamic import of dbConnect in export route | Avoids top-level module coupling | ✓ Good — consistent with Next.js patterns |
| hidden CSS class for tabs (not unmount) | Preserve TokenGeneratorFormNew state across tab switches | ✓ Good — no state loss on tab switch |
| shadcn/ui components manually created | CLI requires interactive input; used canonical source directly | ✓ Good — no hand-rolled implementations, matches shadcn docs |
| shadcn Tabs as UI-only (not TabsContent) | Preserves form state across tab switches | ✓ Good — consistent with v1.0 hidden-tab pattern |
| ATUI Stencil: `next/dynamic` + `ssr:false` | Avoids hydration mismatch in App Router | ✓ Good — established integration pattern for future ATUI adoption |
| `LayoutShell` as 'use client' component | Keeps root layout.tsx as server component (required for metadata export) | ✓ Good — clean server/client boundary |
| `pathname.startsWith('/collections')` in LayoutShell | Suppresses root sidebar for all collection-scoped routes | ✓ Good — clean conditional layout without duplication |
| `CollectionLayoutClient` for collection name fetch | Keeps collection layout.tsx as server component | ✓ Good — proper App Router pattern |
| Per-collection config in MongoDB | Config scoped to collection — no cross-collection leakage | ✓ Good — removes localStorage ambiguity for multi-collection setup |
| `didMountRef` in Settings page | Prevents auto-save firing during initial data load | ✓ Good — avoids overwriting DB data with empty form on mount |
| Exclude sub-workspaces from root tsconfig | Angular/Stencil/Vite TS errors blocked yarn build | ✓ Good — build clean; sub-projects have own TS configs |
| Flat-node rendering for TokenGroupTree | FlatNode[] list, not nested JSX recursion | ✓ Good — simpler to maintain; dynamic indent via inline paddingLeft |
| No expand/collapse in Phase 5 | All nodes always visible; deferred toggle to later milestone | ⚠ Revisit — TREE-05 still open; tree gets long with many groups |
| Background-only highlight for selected node | User decision: bg-gray-200, no left border | ✓ Good — clean minimal styling |
| Recursive group resolution in tokens page | Fast path for top-level, findGroupById fallback for nested | ✓ Good — handles both cases without code duplication |
| Feature domain component folders | collections/, tokens/, layout/, figma/, github/, dev/ each with barrel | ✓ Good — cross-domain imports use absolute @/components/[domain] paths |
| Pure utils in src/utils/ | No React/Next.js imports; framework-agnostic | ✓ Good — parseTokenValue, countTokensRecursive moved cleanly |
| Schema.Types.Mixed for themes array | Same pattern as graphState; avoids TS errors from array notation | ✓ Good — works correctly with default: [] |
| Repository layer bypass for theme mutations | ICollectionRepository lacks $push/$pull; direct TokenCollection import | ✓ Good — pragmatic; GET still uses repository for portability |
| First theme defaults all groups to enabled | Clear onboarding — everything visible on first theme creation | ✓ Good — fixed by guard in 09-04 so only first theme gets this treatment |
| tokenService for path-based group IDs | Canonical group key derivation consistent across all theme operations | ✓ Good — fixed in 09-04; prevents key mismatch bugs |
| Themes nav item: Layers icon between Tokens and Config | Visual metaphor for themes/modes; consistent nav ordering | ✓ Good — clean sidebar layout |
| filteredGroups falls back to masterGroups when no theme active | Preserves "all groups" default; no empty state when theme deselected | ✓ Good — seamless UX |

---
*Last updated: 2026-03-19 after v1.3 milestone*
