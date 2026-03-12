# ATUI Tokens Manager

## What This Is

A Next.js design token management tool for the Allied Telesis ATUI design system. It allows designers and developers to view, create, edit, and persist design tokens — importing from GitHub repositories and Figma, storing collections in MongoDB for durable access, and exporting to GitHub PRs, Figma, and multiple CSS/JS format files (CSS, SCSS, LESS, JS, TS, JSON). Collections are browseable in a card grid and each collection has its own scoped pages (Tokens, Config, Settings) with per-collection Figma/GitHub config persisted to MongoDB.

## Core Value

Token collections are always available and editable: stored in MongoDB, accessible via collection-scoped URLs, with per-collection Figma/GitHub config, full CRUD from the collections grid, and Figma import/export fully integrated.

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

### Active

(None — planning next milestone)

### Out of Scope

- Multi-user auth / per-user collections — single-user now; userId field in schema is ready for multi-user later
- Real-time collaboration — no concurrent edit handling
- Token versioning / history — deferred; MongoDB timestamps provide basic backup
- Angular / Stencil / Vite workspaces — explicitly excluded; Angular port is a future milestone
- GitHub API caching — performance improvement, deferred
- CORS / CSRF protection — localhost dev tool; security hardening deferred
- ATUI Stencil components replacing shadcn/ui — integration pattern established in v1.1 (Phase 2) but full replacement deferred

## Context

- **Shipped:** v1.1 on 2026-03-12 — 4 phases, 16 plans, 4-day build
- **Prior:** v1.0 on 2026-02-28 — 7 phases, 23 plans, 3-day build
- **Codebase:** ~12,000 LOC TypeScript; Next.js 13.5.6 + Mongoose + Style Dictionary v5 + JSZip + shadcn/ui (Radix UI)
- **Brownfield:** Existing tool with GitHub import/export; MongoDB layer added in v1.0; UI modernized and routing restructured in v1.1
- **Monorepo:** Yarn 3 workspaces; Angular, Stencil, Vite variants exist but are out of scope (excluded from root tsconfig)
- **Token format:** W3C Design Token Specification; two structure variants
- **Architecture:** API routes in `src/app/api/`; Mongoose models in `src/lib/db/models/`; UI components in `src/components/`; shadcn primitives in `src/components/ui/`; collection-scoped routes in `src/app/collections/[id]/`
- **Angular parity doc:** `.planning/ANGULAR_PARITY.md` documents all new API routes and UI patterns for future Angular port
- **Known issues:** Pre-existing TypeScript errors resolved — yarn build now passes cleanly

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

---
*Last updated: 2026-03-12 after v1.1 milestone*
