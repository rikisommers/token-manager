# Refactor Suggestions (Phase 8 Audit)

These are OUT OF SCOPE for Phase 8 — captured for future phases.
Do not implement these in the current phase.

## Suggestions

| Component | Issue | Suggested Fix | Priority |
|-----------|-------|---------------|----------|
| `TokenGeneratorForm.tsx` | 1394 lines — single file mixes token state management, GitHub I/O, collection CRUD, and rendering | Split into sub-components: `TokenGroupCard`, `TokenToolbar`, `GroupOverviewTable` and extract GitHub/collection operations into dedicated hooks (`useGitHubActions`, `useCollectionPersistence`) | High |
| `TokenGeneratorForm.tsx` | `handleSaveCollection` and `handleLoadCollection` contain raw `fetch()` calls to `/api/collections` — these belong in a collection service | Add `saveCollection` / `loadCollection` methods to a `CollectionService` (similar to how `tokenService.processImportedTokens` is already delegated) | Medium |
| `TokenGeneratorForm.tsx` | `handleDirectorySelect` mixes export/import logic in a single function with a mode flag; the two branches are largely independent | Split into `handleExportToGitHub` and `handleImportFromGitHub` helpers; consider extracting the fetch calls to `githubService` | Medium |
| `TokenGeneratorForm.tsx` | `buildTokenPath` wrapper calls `getPathPrefix` + `getAllGroups` but then does ad-hoc namespace stripping inline | Extend `getPathPrefix` in `token.utils.ts` to accept a flag for namespace-stripped output, removing the inline string manipulation | Low |
| `CollectionActions.tsx` | Inline `fetch()` calls to `DELETE /api/collections/:id` and `PUT /api/collections/:id` | Move to a collection service (`deleteCollection`, `renameCollection` functions) so the component only handles dialog state | Medium |
| `OrgHeader.tsx` | `useDbStatus` hook contains an inline `fetch('/api/database/config')` call | Move the fetch to a `DatabaseService.getConfig()` method; the hook becomes a thin wrapper that calls the service | Low |
| `LayoutShell.tsx` | Route-type detection (`isCollectionsRoute`, `isSettingsRoute`) is duplicated if other components need the same logic | Extract to a `route.utils.ts` in `src/utils/` for reuse | Low |
| `src/utils/tokenUpdater.ts` | Class-based file-system utility in `src/utils/` — I/O-bound operations belong in `src/services/` | Move `TokenUpdater` class to `src/services/tokenUpdater.service.ts` and update API route imports | Low |
