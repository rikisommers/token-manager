# Milestones

## v1.0 MVP (Shipped: 2026-02-28)

**Phases completed:** 7 phases, 23 plans
**Timeline:** 2026-02-25 → 2026-02-28 (3 days)
**Files changed:** 91 files, ~13,200 insertions
**Codebase:** ~16,868 LOC TypeScript

**Key accomplishments:**
1. MongoDB persistence layer with Mongoose singleton connection, TokenCollection schema, and one-time seed script for local `tokens/` files
2. View Tokens page collection selector — browse and display any MongoDB collection alongside local files
3. Generator form full save/load/update cycle — SaveCollectionDialog, LoadCollectionDialog, dirty-flag tracking, and overwrite confirmation
4. Collection management actions — delete (with confirmation), rename, and duplicate via CollectionActions component
5. Style-dictionary build pipeline — CSS, SCSS, LESS, JS, TS, JSON output in a BuildTokensModal with per-tab copy and ZIP download
6. Unified tabbed interface at `/` — View and Generate tabs with SharedCollectionHeader providing consistent collection CRUD on both tabs
7. Complete Figma integration fix — persistent FigmaConfig credentials, Figma API proxy routes, ExportToFigmaDialog, ImportFromFigmaDialog, and SourceContextBar for upstream source visibility

**Delivered:** Full MongoDB-backed token collection management layered on top of the existing Next.js design token tool — collections are persistent, shareable, and manageable from both the View and Generate tabs with Figma import/export fully functional.

---


## v1.1 shadcn UI (Shipped: 2026-03-12)

**Phases completed:** 4 phases, 16 plans
**Timeline:** 2026-03-08 → 2026-03-12 (4 days)
**Files changed:** 179 files, ~21,749 insertions
**Codebase:** ~12,000 LOC TypeScript

**Key accomplishments:**
1. Migrated all UI elements (buttons, tabs, modals, inputs, selects) to shadcn/ui via Radix UI primitives across the entire app
2. Established ATUI Stencil web component integration pattern for Next.js 13.5.6 App Router (`next/dynamic` + `ssr:false` + `useEffect` registration)
3. Restructured app navigation with persistent 200px left sidebar, collection selector, and 3 nav items (Tokens, Config, Settings)
4. Full collection management flow: browseable card grid at `/collections` with CRUD, collection-scoped routing at `/collections/[id]/tokens|config|settings`
5. Extended MongoDB collection schema with `description`, `tags`, `figmaToken`, `figmaFileId`, `githubRepo`, `githubBranch` per-collection config fields
6. Auto-saving per-collection Settings page with debounced config persistence to MongoDB and localStorage pre-population

**Delivered:** Complete UI modernization with shadcn/ui, a new sidebar-driven navigation architecture, and collection-scoped pages with per-collection Figma/GitHub config stored in MongoDB.

---

