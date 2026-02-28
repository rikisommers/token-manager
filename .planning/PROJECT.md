# ATUI Tokens Manager

## What This Is

A Next.js design token management tool for the Allied Telesis ATUI design system. It allows designers and developers to view, create, edit, and persist design tokens — importing from GitHub repositories and Figma, storing collections in MongoDB for durable access, and exporting to GitHub PRs, Figma, and multiple CSS/JS format files (CSS, SCSS, LESS, JS, TS, JSON).

## Core Value

Token collections are always available and editable: stored in MongoDB, loadable into the generator form, and visible on the view page — with Figma import/export and GitHub PR export fully integrated.

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

### Active

(None — planning next milestone)

### Out of Scope

- Multi-user auth / per-user collections — single-user now; userId field in schema is ready for multi-user later
- Real-time collaboration — no concurrent edit handling
- Token versioning / history — deferred; MongoDB timestamps provide basic backup
- Angular / Stencil / Vite workspaces — explicitly excluded; Angular port is a future milestone
- GitHub API caching — performance improvement, deferred
- CORS / CSRF protection — localhost dev tool; security hardening deferred

## Context

- **Shipped:** v1.0 on 2026-02-28 — 7 phases, 23 plans, 3-day build
- **Codebase:** ~16,868 LOC TypeScript; Next.js 13.5.6 + Mongoose + Style Dictionary v5 + JSZip
- **Brownfield:** Existing tool with GitHub import/export already working; MongoDB layer added on top
- **Monorepo:** Yarn 3 workspaces; Angular, Stencil, Vite variants exist but are out of scope
- **Token format:** W3C Design Token Specification; two structure variants
- **Architecture:** API routes in `src/app/api/`; Mongoose models in `src/lib/db/models/`; UI components in `src/components/`
- **Angular parity doc:** `.planning/ANGULAR_PARITY.md` documents all new API routes and UI patterns for future Angular port
- **Known issues:** Pre-existing TypeScript errors in `token.service.ts` and `ui.utils.ts` — not introduced in v1.0; out of scope

## Constraints

- **Tech stack:** Next.js 13.5.6 + TypeScript; must not require framework upgrade
- **Database:** MongoDB via Mongoose; connection string via environment variable `MONGODB_URI`
- **Styling:** Tailwind CSS only — no new CSS-in-JS or additional UI libraries
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
| Unified tabbed page (`/`) | Avoid route split between view and generate | ✓ Good — SharedCollectionHeader works cleanly across tabs |
| FigmaConfig before GitHubConfig in header | Locked decision per CONTEXT.md | ✓ Good — consistent layout |
| Dynamic import of dbConnect in export route | Avoids top-level module coupling | ✓ Good — consistent with Next.js patterns |
| hidden CSS class for tabs (not unmount) | Preserve TokenGeneratorFormNew state across tab switches | ✓ Good — no state loss on tab switch |

---
*Last updated: 2026-02-28 after v1.0 milestone*
