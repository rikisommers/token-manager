# Roadmap: ATUI Tokens Manager

## Overview

This milestone adds MongoDB persistence to an existing Next.js design token tool. The work progresses from infrastructure (database connection and schema) through read-only UI integration (View Tokens page), then the full save/load cycle in the generator form, and finally the remaining collection management operations (delete, rename, duplicate). Each phase delivers a coherent, independently verifiable capability on top of the previous.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Database Foundation** - MongoDB connection, schema, and seed script
- [ ] **Phase 2: View Integration** - Collection selector on View Tokens page
- [ ] **Phase 3: Generator Form** - Save, load, and update collections from the generator
- [ ] **Phase 4: Collection Management** - Delete, rename, and duplicate collections

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
- [ ] 01-03-PLAN.md — Seed script + Angular parity doc (SEED-01, PARITY-01)

### Phase 2: View Integration
**Goal**: Users can browse and view any MongoDB collection on the View Tokens page alongside local files
**Depends on**: Phase 1
**Requirements**: VIEW-01, VIEW-02, VIEW-03
**Success Criteria** (what must be TRUE):
  1. The View Tokens page displays a collection selector listing all MongoDB collections by name
  2. Selecting a MongoDB collection from the dropdown renders its tokens in the existing TokenTable UI
  3. A "Local Files" option remains in the selector and displays the original file-based tokens unchanged
**Plans**: TBD

### Phase 3: Generator Form
**Goal**: Users can save new collections to MongoDB, load existing collections into the generator form, and save edits back
**Depends on**: Phase 2
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-04, GEN-05, GEN-06, GEN-07, GEN-08, GEN-09, MGMT-01
**Success Criteria** (what must be TRUE):
  1. A "Save to Database" button appears in the generator form and prompts for a collection name before saving; a toast confirms success
  2. A "Load Collection" button opens a dialog listing all MongoDB collections; selecting one populates the form with its token data
  3. After loading a collection, the collection name is retained so "Save to Database" overwrites it without re-prompting for a name
  4. All existing generator form functionality (GitHub import, Figma export, GitHub PR export, format download, JSON preview) works normally when a MongoDB collection is loaded
**Plans**: TBD

### Phase 4: Collection Management
**Goal**: Users can delete, rename, and duplicate collections from the tool
**Depends on**: Phase 3
**Requirements**: MGMT-02, MGMT-03, MGMT-04
**Success Criteria** (what must be TRUE):
  1. User can delete a collection from MongoDB with a confirmation prompt; the collection no longer appears in any selector after deletion
  2. User can rename a collection; the new name appears immediately in selectors and dialogs
  3. User can duplicate a collection by providing a new name; the duplicate appears as a separate entry with identical token data
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Database Foundation | 2/3 | In Progress |  |
| 2. View Integration | 0/? | Not started | - |
| 3. Generator Form | 0/? | Not started | - |
| 4. Collection Management | 0/? | Not started | - |
