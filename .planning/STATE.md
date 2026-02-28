# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Token collections are always available and editable — stored in MongoDB, loadable into the generator form, and visible on the view page.
**Current focus:** Phase 7 — Fix Figma Integration (in progress)

## Current Position

Phase: 7 of 7 (Fix Figma Integration)
Plan: 6 of 6 in current phase (checkpoint - awaiting human verify)
Status: In Progress
Last activity: 2026-02-28 — Completed 07-06 Task 1 (build verification); paused at human-verify checkpoint

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 2.7 min
- Total execution time: ~0.37 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-database-foundation | 3 | 10 min | 3.3 min |
| 02-view-integration | 2 | 4 min | 2.0 min |
| 03-generator-form | 3 | 7 min | 2.3 min |
| 04-collection-management | 2 | 3 min | 1.5 min |
| 05-export-style-dictionary-build-tokens | 2 | 21 min | 10.5 min |
| 06-collection-ux-improvements | 3 of 3 | 6 min | 2 min |

**Recent Trend:**
- Last 5 plans: 05-02 (16 min), 06-01 (3 min), 06-02 (3 min), 06-03 (human verify + bug fixes)
- Trend: Milestone complete

*Updated after each plan completion*
| Phase 05 P02 | 16 | 3 tasks | 5 files |
| Phase 06 P01 | 3 | 2 tasks | 4 files |
| Phase 06 P02 | 3 | 2 tasks | 2 files |
| Phase 07 P02 | 110 | 2 tasks | 3 files |
| Phase 07-fix-figma-integration P04 | 108 | 2 tasks | 2 files |
| Phase 07 P03 | 3 | 2 tasks | 3 files |
| Phase 07-fix-figma-integration P05 | 7 | 2 tasks | 3 files |
| Phase 07-fix-figma-integration P06 | 80 | 1 tasks | 1 files |

## Accumulated Context

### Roadmap Evolution

- Phase 5 added: Export style dictionary build tokens
- Phase 6 added: Collection UX Improvements
- Phase 7 added: Fix Figma Integration (unified credentials dialog, persistent storage, import-from-Figma, upstream source highlighting)

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- MongoDB as persistence layer (specified by user; natural fit for JSON token documents)
- Seed local tokens/ once at setup (keep local files as read-only reference; MongoDB becomes editable source)
- Store GitHub source as structured metadata field on document (queryable, not a JSON comment)
- userId nullable in schema (single-user now; architecture ready for multi-user later)
- Use TokenGeneratorFormNew.tsx as base (active component with most features)
- Document all new features in .planning/ANGULAR_PARITY.md for future Angular port

**01-01 decisions:**
- Mongoose ODM over native MongoDB driver (ODM chosen for schema validation + model layer convenience; used in phases 02+)
- Error thrown at module load time when MONGODB_URI missing (fail-fast rather than silent hang)
- global.__mongoose_cache singleton (standard Next.js pattern to survive hot-reload without exhausting connection pool)
- bufferCommands: false (surface connection failures immediately rather than queuing queries)
- Event handlers registered outside dbConnect() to avoid duplicate registration on repeated calls

**01-02 decisions:**
- Schema.Types.Mixed for tokens field (W3C Design Token format is arbitrary nested JSON; no Mongoose schema validation on internal structure)
- No unique index on name (uniqueness is userId-scoped in future multi-user; premature unique constraint would require migration)
- userId nullable with index (single-user v1; index in place for multi-user query patterns without future migration)
- Sub-schema with _id: false for sourceMetadata (embedded value object, not subdocument)
- Record<string, unknown> in TypeScript interface instead of any (preserves type safety at the API boundary)

**01-03 decisions:**
- ts-node --transpile-only with separate tsconfig.scripts.json (CommonJS/node) for running TypeScript scripts outside Next.js bundler context
- DOTENV_CONFIG_PATH + -r dotenv/config register to load .env.local before hoisted module imports check MONGODB_URI
- Collection name derivation: path.relative + regex (slashes to ' / ') giving readable defaults users can rename in Phase 4

**02-01 decisions:**
- lean() projection for API route (find with { name: 1, createdAt: 1 }.lean() returns JSON-serialisable plain objects; avoids Mongoose Document overhead)
- Explicit _id.toString() and createdAt.toISOString() in map (lean() preserves native ObjectId and Date types; explicit cast required for safe JSON serialisation)
- No sort in collections query (UI displays in natural insertion order; sort is a UI concern per plan requirement)

**02-02 decisions:**
- flattenMongoTokens() inline in page.tsx (not a new file) — collocated with only consumer; no premature abstraction
- Select stays enabled during loading — user can cancel by switching; AbortController handles in-flight fetch cancellation
- localStorage id validated against live collections on mount — stale ids silently fall back to 'local'
- GET /api/collections/[id] uses .lean() — consistent with collections list route pattern

**03-01 decisions:**
- 409 response includes existingId so client can call PUT /api/collections/[existingId] directly — no second GET needed
- PUT body empty-check tests all three UpdateTokenCollectionInput fields; {} returns 400 rather than a no-op DB call
- runValidators: true on findByIdAndUpdate ensures Mongoose schema validators run on updates

**03-02 decisions:**
- Step advance on onSave return: dialog advances to confirm-overwrite after await onSave() if dialog stays open — no extra prop needed
- saveDialogDuplicateName state tracked in parent for future use; not passed to dialog as prop — dialog derives step from onSave flow
- Rule 1 auto-fix: replaced pre-existing setIsLoading/setLoadingMessage with correct setLoading() to meet no-TypeScript-errors criterion

**03-03 decisions:**
- isDirty tracking in individual mutation handlers (not useEffect on tokenGroups): avoids false dirty on programmatic loads
- handleLoadCollection does NOT call setIsDirty(true): programmatic state update distinguishes load from user edit
- clearForm resets both loadedCollection and isDirty: clears full editing session context so next Save prompts for a new name
- LoadCollectionDialog manages isFetching and isLoading separately: fetch on open vs load-in-progress are independent loading states

**04-01 decisions:**
- CollectionActions renders null when selectedId is falsy, 'local', or collections is empty — single guard covers all hidden states
- Rename Save disabled when value unchanged from current name — prevents no-op PUT call
- Duplicate 409 handled inline in modal (not via onError) — error stays visible in context where user can fix the name
- Two-step duplicate (GET source then POST copy) avoids adding server-side duplicate endpoint; reuses existing POST /api/collections

**04-02 decisions:**
- handleDeleted calls handleSelectionChange('local') with no second arg — detects id === 'local' and calls fetchTokens() directly
- handleDuplicated updates collections state before switching selection — React batches setState so new entry is present when selector renders

**05-01 decisions:**
- Use formatPlatform() (SD v5) instead of exportPlatform() — exportPlatform returns transformed token dict, not formatted file strings
- Call sd.init() before formatPlatform() — SD v5 requires explicit initialization before formatting
- normalizeTokens() converts value/type keys to $value/$type before passing to SD — W3C DTCG spec compliance
- globals brand is NOT emitted as separate output when non-globals brands exist — only used as merge source (self-contained brand files)
- [Phase 05-02]: namespace hardcoded to 'token' on View Tokens page — convention --token-{category}-{token} per plan spec
- [Phase 05-02]: Three-argument onTokensChange in TokenGeneratorFormNew exposes collectionName so Generator page ZIP filename uses actual loaded collection name
- [Phase 05-02]: Recursive token count in useEffect: countTokensRecursive() descends into child TokenGroups — flat count misses tokens in nested structures from processImportedTokens()
- [Phase 05-02]: SD v5 brokenReferences: 'console' — only throw/console valid in SD v5 type system; 'warn' does not exist; 'console' routes diagnostic to console without throwing
- [Phase 05-02]: generate/page.tsx header layout: outer justify-between must have two direct children; flattened nested structure so Build Tokens button anchors to right side

**06-01 decisions:**
- CollectionSelector wrapper changed from full-width border-b container to inline flex div — enables embedding in SharedCollectionHeader horizontal row
- CollectionActions mt-3 removed — vertical margin inappropriate in flex row context (SharedCollectionHeader is now layout parent)
- SharedCollectionHeader is pure presentation component — no internal state, all callbacks from page.tsx
- Save As uses rawCollectionTokens (MongoDB) or tokenData (local flat) — flat format is valid SD token structure
- switchTab uses router.push('/' | '/?tab=generate') — clean URL for default view tab
- Suspense wrapper: export default Home wraps HomeContent in Suspense; all hooks/state in HomeContent (required for useSearchParams in Next.js App Router)
- [Phase 06]: hidden CSS class for tab divs preserves TokenGeneratorFormNew state across tab switches without lifting state
- [Phase 06]: generateFormKey increment triggers controlled remount of TokenGeneratorFormNew on New Collection action
- [Phase 06]: generate/page.tsx is a server component with only redirect() to /?tab=generate
- [Phase 06-03]: GitHubConfig moved from Generate tab header to global app header — visible on both tabs
- [Phase 06-03]: + Add Token button rendered unconditionally outside {hasTokens && ...} block — visible on empty groups
- [Phase 06-03]: collectionToLoad prop added to TokenGeneratorFormNew — selecting a MongoDB collection in shared header auto-populates the generator form via useEffect on collectionToLoad?.id
- [Phase 07-02]: dbConnect default export used in import route (consistent with existing routes); FigmaVariable types defined inline server-side (server-only route; avoids client class coupling); 502 for Figma upstream failures
- [Phase 07-04]: handleImported appends new collection then calls handleSelectionChange(newId) — mirrors handleDuplicated pattern
- [Phase 07-04]: noCredentials state shown inline in dialog when localStorage figma-config absent or malformed
- [Phase 07-03]: ExportToFigmaDialog reads figma-config from localStorage on open — no prop drilling of credentials
- [Phase 07-03]: mongoCollectionId update in export route is non-fatal — console.error logged but export response still returns 200
- [Phase 07-03]: Dynamic import of dbConnect and TokenCollection in export route — avoids top-level module import coupling
- [Phase 07-05]: SourceContextBar returns null for null/undefined/no-type sourceMetadata to avoid layout gaps
- [Phase 07-05]: FigmaConfig placed before GitHubConfig in header flex div per CONTEXT.md locked decision
- [Phase 07-05]: GET /api/collections/[id] changed to explicit shape for consistency and safety
- [Phase 07-fix-figma-integration]: Pre-existing TypeScript errors in token.service.ts and ui.utils.ts are out of scope — not introduced by Phase 7 work

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-28
Stopped at: Checkpoint 07-06-PLAN.md — awaiting human verification of complete Figma integration UI flows
Resume file: None
