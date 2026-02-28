# Roadmap: ATUI Tokens Manager

## Overview

This milestone adds MongoDB persistence to an existing Next.js design token tool. The work progresses from infrastructure (database connection and schema) through read-only UI integration (View Tokens page), then the full save/load cycle in the generator form, and finally the remaining collection management operations (delete, rename, duplicate). Each phase delivers a coherent, independently verifiable capability on top of the previous.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Database Foundation** - MongoDB connection, schema, and seed script (completed 2026-02-25)
- [x] **Phase 2: View Integration** - Collection selector on View Tokens page (completed 2026-02-25)
- [x] **Phase 3: Generator Form** - Save, load, and update collections from the generator (completed 2026-02-26)
- [x] **Phase 4: Collection Management** - Delete, rename, and duplicate collections (completed 2026-02-26)
- [x] **Phase 5: Export style dictionary build tokens** - Style-dictionary build pipeline with modal output (completed 2026-02-26)
- [x] **Phase 6: Collection UX Improvements** - Unified tabbed page with shared collection header (completed 2026-02-28)

## Phase Details

### Phase 1: Database Foundation
**Goal**: MongoDB is connected, the TokenCollection schema is defined, and local tokens are seeded as named collections
**Depends on**: Nothing (first phase)
**Requirements**: DB-01, DB-02, DB-03, SEED-01, PARITY-01
**Success Criteria** (what must be TRUE):
  1. The app starts without error when a valid MongoDB connection string is set in the environment
  2. Multiple API requests share the same MongoDB connection (no new connection per request)
  3. A TokenCollection document can be created, queried, and deleted with all required fields present (name, tokens, sourceMetadata, userId, createdAt, updatedAt)
  4. Running the seed script once populates MongoDB with collections named after the local tokens/ JSON files
  5. New API routes and the MongoDB schema are documented in .planning/ANGULAR_PARITY.md
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Install mongoose + connection singleton (DB-01, DB-02)
- [x] 01-02-PLAN.md — TokenCollection schema + TypeScript types (DB-03)
- [x] 01-03-PLAN.md — Seed script + Angular parity doc (SEED-01, PARITY-01)

### Phase 2: View Integration
**Goal**: Users can browse and view any MongoDB collection on the View Tokens page alongside local files
**Depends on**: Phase 1
**Requirements**: VIEW-01, VIEW-02, VIEW-03
**Success Criteria** (what must be TRUE):
  1. The View Tokens page displays a collection selector listing all MongoDB collections by name
  2. Selecting a MongoDB collection from the dropdown renders its tokens in the existing TokenTable UI
  3. A "Local Files" option remains in the selector and displays the original file-based tokens unchanged
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — GET /api/collections route (VIEW-01, VIEW-02, VIEW-03)
- [x] 02-02-PLAN.md — CollectionSelector component + page.tsx integration + GET /api/collections/[id] route (VIEW-01, VIEW-02, VIEW-03)

### Phase 3: Generator Form
**Goal**: Users can save new collections to MongoDB, load existing collections into the generator form, and save edits back
**Depends on**: Phase 2
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-04, GEN-05, GEN-06, GEN-07, GEN-08, GEN-09, MGMT-01
**Success Criteria** (what must be TRUE):
  1. A "Save to Database" button appears in the generator form and prompts for a collection name before saving; a toast confirms success
  2. A "Load Collection" button opens a dialog listing all MongoDB collections; selecting one populates the form with its token data
  3. After loading a collection, the collection name is retained so "Save to Database" overwrites it without re-prompting for a name
  4. All existing generator form functionality (GitHub import, Figma export, GitHub PR export, format download, JSON preview) works normally when a MongoDB collection is loaded
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — POST /api/collections + PUT /api/collections/[id] + ANGULAR_PARITY.md
- [x] 03-02-PLAN.md — SaveCollectionDialog component + "Save to Database" button + collection state
- [x] 03-03-PLAN.md — LoadCollectionDialog component + "Load Collection" button + dirty flag + clear form
- [x] 03-04-PLAN.md — Human verify save/load/overwrite cycle end-to-end

### Phase 4: Collection Management
**Goal**: Users can delete, rename, and duplicate collections from the tool
**Depends on**: Phase 3
**Requirements**: MGMT-02, MGMT-03, MGMT-04
**Success Criteria** (what must be TRUE):
  1. User can delete a collection from MongoDB with a confirmation prompt; the collection no longer appears in any selector after deletion
  2. User can rename a collection; the new name appears immediately in selectors and dialogs
  3. User can duplicate a collection by providing a new name; the duplicate appears as a separate entry with identical token data
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — DELETE API endpoint + CollectionActions component (MGMT-02, MGMT-03, MGMT-04)
- [x] 04-02-PLAN.md — Wire CollectionActions into page.tsx + ANGULAR_PARITY.md update (MGMT-02, MGMT-03, MGMT-04)
- [x] 04-03-PLAN.md — Human verify delete/rename/duplicate end-to-end

### Phase 5: Export style dictionary build tokens
**Goal**: Users can trigger a style-dictionary build from either page header and view all format outputs (CSS, SCSS, LESS, JS, TS, JSON) in a modal with per-tab copy and ZIP download
**Depends on:** Phase 4
**Requirements**: EXPORT-01, EXPORT-02, EXPORT-03, EXPORT-04, EXPORT-05, EXPORT-06, EXPORT-07
**Success Criteria** (what must be TRUE):
  1. A "Build Tokens" button appears in the header of both the View Tokens page and the Generator page
  2. The button is disabled when no buildable collection is present (local files on View page, no tokens on Generator page)
  3. Clicking "Build Tokens" opens a modal showing built output for all 6 formats (CSS, SCSS, LESS, JS, TS, JSON)
  4. Multi-brand collections produce per-brand output with brand sub-tabs inside each format tab
  5. Each format tab has a copy-to-clipboard button; a "Download All" button produces a ZIP with all brand x format files
  6. Both pages use the same BuildTokensModal component — no code duplication
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Install style-dictionary + jszip, build service, API route, BuildTokensModal component
- [x] 05-02-PLAN.md — Wire Build Tokens button into both pages + ANGULAR_PARITY.md + human verify

### Phase 6: Collection UX Improvements
**Goal**: View Tokens and Generate Tokens are unified into a single tabbed page at / with a shared collection management header, clean separation between read-only View and edit-mode Generate
**Depends on:** Phase 5
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — SharedCollectionHeader component + restructure page.tsx with tab scaffold and View tab
- [x] 06-02-PLAN.md — Wire Generate tab into page.tsx + /generate redirect
- [x] 06-03-PLAN.md — Human verify unified tabbed page end-to-end

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Database Foundation | 3/3 | Complete   | 2026-02-25 |
| 2. View Integration | 2/2 | Complete   | 2026-02-25 |
| 3. Generator Form | 4/4 | Complete   | 2026-02-26 |
| 4. Collection Management | 3/3 | Complete   | 2026-02-26 |
| 5. Export style dictionary | 2/2 | Complete   | 2026-02-26 |
| 6. Collection UX Improvements | 3/3 | Complete   | 2026-02-28 |
| 7. Fix Figma Integration | 6/6 | Complete   | 2026-02-28 |

### Phase 7: Fix Figma Integration

**Goal:** Fix broken Figma export by consolidating user key + page key into a single persistent credentials dialog (stored like GitHub config, set once). Add import-from-Figma action to save as a collection. Highlight the upstream source (GitHub or Figma) clearly on both the View and Generate tabs so users know that pushing will affect the upstream source.
**Depends on:** Phase 6
**Plans:** 6/6 plans complete

Plans:
- [x] 07-01-PLAN.md — FigmaConfig component + fix export auth header + extend sourceMetadata schema
- [x] 07-02-PLAN.md — Figma API proxy routes (test, list collections, import-and-save)
- [x] 07-03-PLAN.md — ExportToFigmaDialog component + wire into TokenGeneratorFormNew + post-export sourceMetadata update
- [ ] 07-04-PLAN.md — ImportFromFigmaDialog component + Import from Figma button in Generate tab
- [ ] 07-05-PLAN.md — SourceContextBar component + wire into page.tsx
- [ ] 07-06-PLAN.md — Human verify complete Figma integration
