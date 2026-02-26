# Requirements: ATUI Tokens Manager

**Defined:** 2026-02-25
**Core Value:** Token collections are always available and editable — stored in MongoDB, loadable into the generator form, and visible on the view page.

## v1 Requirements

### Database Setup

- [x] **DB-01**: App connects to MongoDB via environment variable connection string
- [x] **DB-02**: MongoDB connection is established on server startup and reused across requests (singleton connection)
- [x] **DB-03**: `TokenCollection` document schema defined with: `id`, `name`, `tokens` (raw JSON object), `sourceMetadata` (nullable: repo, branch, path), `userId` (nullable — reserved for future multi-user), `createdAt`, `updatedAt`

### Seeding

- [x] **SEED-01**: A one-time setup script seeds all local `tokens/` directory JSON files into MongoDB as named collections (filename without extension → collection name)

### View Tokens Page

- [x] **VIEW-01**: View Tokens page shows a collection selector (select input) at the top of the page listing all MongoDB collections
- [x] **VIEW-02**: Selecting a collection from the dropdown displays its tokens in the existing TokenTable UI
- [x] **VIEW-03**: Local file-based tokens remain accessible as a "Local Files" option in the selector (original behavior preserved)

### Generator Form — Save

- [x] **GEN-01**: Token generator form has a "Save to Database" button
- [x] **GEN-02**: Clicking "Save to Database" prompts the user to enter a collection name before saving
- [x] **GEN-03**: Collection is saved to MongoDB with current token data and any GitHub source metadata (repo, branch, path) as a structured metadata field
- [x] **GEN-04**: User receives a toast/confirmation that the collection was saved successfully

### Generator Form — Load

- [x] **GEN-05**: Token generator form has a "Load Collection" button
- [x] **GEN-06**: Clicking "Load Collection" opens a dialog listing all MongoDB collections by name
- [x] **GEN-07**: User selects a collection from the dialog; the generator form is populated with the collection's full token data
- [x] **GEN-08**: Once loaded, the collection name is retained so "Save to Database" can update the existing collection without re-prompting for a name
- [x] **GEN-09**: All existing generator form functionality (GitHub import, Figma export, GitHub PR export, format download, JSON preview) remains fully functional when working with loaded collections

### Collection Management

- [x] **MGMT-01**: User can save edits back to an existing collection (overwrite) from the generator form
- [x] **MGMT-02**: User can delete a collection from MongoDB (with a confirmation prompt)
- [x] **MGMT-03**: User can rename a collection (via inline edit or dialog)
- [x] **MGMT-04**: User can duplicate a collection (creates a copy prompting for a new name)

### Angular Parity Tracking

- [x] **PARITY-01**: All new API routes (path, method, request/response shape), MongoDB schema, and significant UI patterns are documented in `.planning/ANGULAR_PARITY.md` as they are built

## v2 Requirements

### Multi-User

- **AUTH-01**: User can create an account and log in
- **AUTH-02**: Each user sees only their own collections (userId filter applied)
- **AUTH-03**: Admin can view all collections across users

### Token Versioning

- **VER-01**: Each collection save creates a version snapshot
- **VER-02**: User can view version history for a collection
- **VER-03**: User can restore a collection to a previous version

### Token Diff

- **DIFF-01**: User can compare two collections side-by-side
- **DIFF-02**: User can see what changed between the imported tokens and the saved collection before overwriting

## Out of Scope

| Feature | Reason |
|---------|--------|
| Angular / Stencil / Vite workspaces | Explicit user exclusion; Angular port is a future milestone |
| Real-time collaboration | No concurrent editing in v1; single-user only |
| Token validation rules | Deferred; no constraint enforcement on values in v1 |
| Undo/redo in generator form | Deferred; browser history and collection backups are sufficient for now |
| GitHub API caching | Performance improvement, not correctness; defer to later |
| CORS / CSRF protection | Localhost dev tool; security hardening deferred |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DB-01 | Phase 1 | Complete |
| DB-02 | Phase 1 | Complete |
| DB-03 | Phase 1 | Complete |
| SEED-01 | Phase 1 | Complete |
| VIEW-01 | Phase 2 | Complete |
| VIEW-02 | Phase 2 | Complete |
| VIEW-03 | Phase 2 | Complete |
| GEN-01 | Phase 3 | Complete |
| GEN-02 | Phase 3 | Complete |
| GEN-03 | Phase 3 | Complete |
| GEN-04 | Phase 3 | Complete |
| GEN-05 | Phase 3 | Complete |
| GEN-06 | Phase 3 | Complete |
| GEN-07 | Phase 3 | Complete |
| GEN-08 | Phase 3 | Complete |
| GEN-09 | Phase 3 | Complete |
| MGMT-01 | Phase 3 | Complete |
| MGMT-02 | Phase 4 | Complete |
| MGMT-03 | Phase 4 | Complete |
| MGMT-04 | Phase 4 | Complete |
| PARITY-01 | Phase 1 (ongoing through Phase 4) | Complete |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-26 after 03-01 completion (GEN-01 through GEN-04, MGMT-01)*
