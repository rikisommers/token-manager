# Angular Parity Tracking

Documents all new API routes, data models, and significant patterns introduced in the ATUI Tokens Manager Next.js milestone.
Use this as the contract for implementing equivalent functionality in the Angular workspace.

**Last updated:** Phase 3 — Generator Form

---

## Phase 3 — Generator Form

### 1. POST /api/collections — Create Collection

**Method:** POST
**Path:** `/api/collections`
**Purpose:** Create a new token collection document in MongoDB.

**Request body:**
```json
{
  "name": "string (required)",
  "tokens": "Record<string, unknown> (required)",
  "sourceMetadata": {
    "repo": "string | null",
    "branch": "string | null",
    "path": "string | null"
  }
}
```
`sourceMetadata` is optional; omit or pass `null` for manually-created collections.

**Response shapes:**

| Status | Body | Condition |
|--------|------|-----------|
| 201 | `{ collection: ITokenCollection }` | Created successfully |
| 400 | `{ error: 'name is required' }` | `name` missing or empty string |
| 409 | `{ error: 'A collection named "…" already exists', existingId: string }` | Duplicate name |
| 500 | `{ error: 'Failed to create collection' }` | Unexpected server error |

**409 + existingId pattern:**
When a collection with the same name already exists, the response includes `existingId` — the MongoDB `_id` of the existing document. The client can present a confirmation dialog and then call `PUT /api/collections/[existingId]` to overwrite it.

---

### 2. PUT /api/collections/[id] — Update Collection

**Method:** PUT
**Path:** `/api/collections/[id]`
**Purpose:** Update one or more fields on an existing collection (name, tokens, sourceMetadata).

**Request body (`UpdateTokenCollectionInput`):**
```typescript
type UpdateTokenCollectionInput = Partial<Pick<ITokenCollection, 'name' | 'tokens' | 'sourceMetadata'>>;
```
At least one field must be present; sending an empty object returns 400.

**Response shapes:**

| Status | Body | Condition |
|--------|------|-----------|
| 200 | `{ collection: ITokenCollection }` | Updated successfully |
| 400 | `{ error: 'Nothing to update' }` | Body has no recognised fields |
| 404 | `{ error: 'Collection not found' }` | `[id]` does not match any document |
| 500 | `{ error: 'Failed to update collection' }` | Unexpected server error |

**Implementation notes:**
- Uses `findByIdAndUpdate(..., { $set: body }, { new: true, runValidators: true })` — validators re-run on update, and the updated document is returned.
- `.lean()` is used for plain JSON-serialisable response objects (consistent with GET routes).

---

### 3. UI Contracts — Save/Load Dialog Behaviour

#### Save Dialog
- Triggered when the user clicks "Save" on the generator form.
- Prompts for a collection name (modal/inline input).
- Pre-fills the name with the currently-loaded collection name (if any).
- On submit: calls `POST /api/collections`.
  - 201 → save succeeded; update "Editing: [name]" indicator; clear dirty flag.
  - 409 → present duplicate-name confirmation: "A collection named '[name]' already exists. Overwrite?"
    - Confirm → call `PUT /api/collections/[existingId]` with current form data.
    - Cancel → return to name prompt.

#### Load Dialog
- Shows a scrollable list of all saved collections (from `GET /api/collections`).
- Empty state: "No saved collections yet."
- If dirty flag is set (unsaved changes since last save/load), show confirmation before replacing form state: "You have unsaved changes. Load anyway?"
  - Confirm → fetch `GET /api/collections/[id]`, replace form state, clear dirty flag, set "Editing: [name]".
  - Cancel → dismiss dialog, keep current form state.

#### "Editing: [name]" Indicator
- Displayed near the Save/Load buttons when a collection has been loaded or just saved.
- Cleared when "Clear Form" is triggered (resets form to default empty state).

#### Dirty Flag
- Set when any `tokenGroups` or `globalNamespace` field changes after the last save or load.
- Used to trigger the unsaved-changes confirmation in the Load dialog.
- Cleared after a successful save or load.

---

## Phase 1 — Database Foundation

### 1. MongoDB Schema — TokenCollection

The primary data model. Stored in the `tokencollections` collection (Mongoose pluralises the model name).

| Field | Mongoose Type | Required | Default | Index | Notes |
|-------|--------------|----------|---------|-------|-------|
| `name` | `String` | yes | — | `{ name: 1 }` | User-defined free-text label |
| `tokens` | `Schema.Types.Mixed` | yes | — | — | Arbitrary token JSON (see note below) |
| `sourceMetadata` | Sub-schema (embedded) | no | `null` | — | GitHub provenance; nullable value object |
| `userId` | `String` | no | `null` | `{ userId: 1 }` | Reserved for multi-user; null in v1 |
| `createdAt` | `Date` | auto | — | — | Managed by `timestamps: true` |
| `updatedAt` | `Date` | auto | — | — | Managed by `timestamps: true` |

**`tokens` field — `Schema.Types.Mixed`:**
The W3C Design Token format is a deeply-nested JSON object with arbitrary, user-defined token names and groups. No Mongoose schema validation is applied to the internal structure; it is stored as-is. On the TypeScript side, this is typed as `Record<string, unknown>` rather than `any`, preserving type-safety at the API boundary while allowing arbitrary depth.

**`timestamps: true`:**
Mongoose auto-manages `createdAt` and `updatedAt`. No explicit field definitions required.

**`userId` — nullable with index:**
In v1 (single-user), all documents have `userId: null`. The index (`{ userId: 1 }`) is already in place so that adding authentication in a future phase requires only a backfill — no schema migration.

**`sourceMetadata` sub-schema (`_id: false`):**
An embedded value object for GitHub provenance. Using `_id: false` prevents Mongoose from generating a spurious ObjectId for the embedded object.

| Sub-field | Type | Default | Description |
|-----------|------|---------|-------------|
| `repo` | `String` | `null` | e.g. `"org/design-tokens"` |
| `branch` | `String` | `null` | e.g. `"main"` |
| `path` | `String` | `null` | e.g. `"tokens/globals"` |

**Indexes:**
- `{ name: 1 }` — fast listing and sorting by collection name
- `{ userId: 1 }` — future user-scoped collection filtering

---

### 2. TypeScript Interfaces

Source file: `src/types/collection.types.ts`

```typescript
/**
 * Source metadata for tokens imported from GitHub.
 * All fields nullable — tokens created manually have no source.
 */
export interface ISourceMetadata {
  repo: string | null;    // e.g. "org/design-tokens"
  branch: string | null;  // e.g. "main"
  path: string | null;    // e.g. "tokens/globals"
}

/**
 * Plain data shape for a token collection (use for API responses).
 */
export interface ITokenCollection {
  _id: string;                              // MongoDB ObjectId as string
  name: string;                             // User-defined collection name (free text)
  tokens: Record<string, unknown>;          // Raw token JSON — W3C Design Token spec object
  sourceMetadata: ISourceMetadata | null;   // GitHub provenance, nullable
  userId: string | null;                    // Reserved for multi-user; null in v1
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Shape for creating a new collection (omit auto-generated fields).
 */
export type CreateTokenCollectionInput = Omit<ITokenCollection, '_id' | 'createdAt' | 'updatedAt'>;

/**
 * Shape for updating an existing collection.
 */
export type UpdateTokenCollectionInput = Partial<Pick<ITokenCollection, 'name' | 'tokens' | 'sourceMetadata'>>;
```

---

### 3. Planned API Routes

These routes are not yet implemented (Phase 1 defines schema only). They are documented here as contracts for Phases 2–4 and for the Angular equivalent implementation.

| Method | Path | Purpose | Request Body | Response |
|--------|------|---------|--------------|----------|
| GET | `/api/collections` | List all collections (name + _id only) | — | `{ collections: Array<{ _id: string; name: string; createdAt: string }> }` |
| POST | `/api/collections` | Create new collection | `{ name: string; tokens: object; sourceMetadata?: ISourceMetadata }` | `{ collection: ITokenCollection }` |
| GET | `/api/collections/[id]` | Get single collection by ID | — | `{ collection: ITokenCollection }` |
| PUT | `/api/collections/[id]` | Update collection fields | `UpdateTokenCollectionInput` | `{ collection: ITokenCollection }` |
| DELETE | `/api/collections/[id]` | Delete collection | — | `{ success: true }` |

**Notes:**
- `[id]` is the MongoDB ObjectId as a hex string.
- All responses use `Content-Type: application/json`.
- Error shape: `{ error: string }` with appropriate HTTP status codes (400, 404, 500).
- In v1, no authentication is required (`userId` is always `null`).

---

### 4. Seed Behavior

The seed script (`scripts/seed.ts`) is a one-time setup tool, not an API route.

**Source:** `tokens/` directory at the project root — recursively walks all `.json` files.

**Name derivation:** The collection name is derived from the file's path relative to `tokens/`, with the `.json` extension stripped and path separators replaced by ` / ` (space-slash-space):

| File path (relative to tokens/) | Derived collection name |
|---------------------------------|------------------------|
| `globals/color-base.json` | `globals / color-base` |
| `palette/color-palette.json` | `palette / color-palette` |
| `brands/brand1/color.json` | `brands / brand1 / color` |
| `brands/brand2/color.json` | `brands / brand2 / color` |

**Idempotency:** Before inserting, the script calls `TokenCollection.findOne({ name })`. If a document with that name already exists, it is skipped with a `[SKIP]` log message. Running the seed twice is safe.

**Invocation:**
```bash
yarn seed
# Equivalent to:
DOTENV_CONFIG_PATH=.env.local npx ts-node --transpile-only -r dotenv/config --project tsconfig.scripts.json scripts/seed.ts
```

**Environment:** Requires `MONGODB_URI` in `.env.local`. Template provided in `.env.local.example`.

---

### 5. Connection Management

Source file: `src/lib/mongodb.ts`

**Pattern:** Singleton using a global cache (`global.__mongoose_cache`). Standard Next.js 13 pattern to survive hot-reload without exhausting the MongoDB connection pool.

**Environment variable:** `MONGODB_URI` — checked at module load time. A descriptive error is thrown immediately if absent (fail-fast, not silent hang).

**Singleton shape:**
```typescript
global.__mongoose_cache = { conn: typeof mongoose | null, promise: Promise<...> | null }
```

**Connection options:** `{ bufferCommands: false }` — surfaces connection failures immediately rather than queuing queries that may never execute.

**Lifecycle events:** `connected`, `error`, and `disconnected` handlers registered once on `mongoose.connection` (outside `dbConnect()` to avoid duplicate registration on repeated calls).

**Usage in API routes:**
```typescript
import dbConnect from '@/lib/mongodb';

// Inside any route handler:
await dbConnect();
// Mongoose queries can now be made
```

---

*This document will be updated as new phases introduce additional routes, models, and patterns.*
