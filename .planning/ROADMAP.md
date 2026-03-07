# Roadmap: ATUI Tokens Manager

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-02-28)
- 🚧 **v1.1 shadcn UI** — Phases 1-2 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-7) — SHIPPED 2026-02-28</summary>

- [x] Phase 1: Database Foundation (3/3 plans) — completed 2026-02-25
- [x] Phase 2: View Integration (2/2 plans) — completed 2026-02-25
- [x] Phase 3: Generator Form (4/4 plans) — completed 2026-02-26
- [x] Phase 4: Collection Management (3/3 plans) — completed 2026-02-26
- [x] Phase 5: Export Style Dictionary (2/2 plans) — completed 2026-02-26
- [x] Phase 6: Collection UX Improvements (3/3 plans) — completed 2026-02-28
- [x] Phase 7: Fix Figma Integration (6/6 plans) — completed 2026-02-28

See: `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Database Foundation | v1.0 | 3/3 | Complete | 2026-02-25 |
| 2. View Integration | v1.0 | 2/2 | Complete | 2026-02-25 |
| 3. Generator Form | v1.0 | 4/4 | Complete | 2026-02-26 |
| 4. Collection Management | v1.0 | 3/3 | Complete | 2026-02-26 |
| 5. Export Style Dictionary | v1.0 | 2/2 | Complete | 2026-02-26 |
| 6. Collection UX Improvements | v1.0 | 3/3 | Complete | 2026-02-28 |
| 7. Fix Figma Integration | v1.0 | 6/6 | Complete | 2026-02-28 |
| 1. shadcn UI Components | v1.1 | 0/5 | Not started | - |
| 2. Test ATUI Component Library | v1.1 | 1/1 | Complete | 2026-03-01 |

### 🚧 v1.1 shadcn UI

### Phase 1: shadcn UI + Color Pickers

**Goal:** Migrate all common UI elements to shadcn/ui components (buttons, tabs, modals/dialogs) and replace all color token fields with native color picker inputs
**Depends on:** Nothing (first phase of v1.1)
**Plans:** 5 plans

Plans:
- [ ] 01-01-PLAN.md — Install shadcn/ui and generate Button, Input, Select, Tabs, Dialog components
- [ ] 01-02-PLAN.md — Migrate page.tsx (tabs, buttons) and TokenTable (Input, color picker)
- [ ] 01-03-PLAN.md — Migrate all dialog components (BuildTokensModal, ExportToFigmaDialog, ImportFromFigmaDialog, JsonPreviewDialog, LoadCollectionDialog, SaveCollectionDialog, CollectionActions)
- [ ] 01-04-PLAN.md — Migrate form and config components (TokenGeneratorFormNew, GitHubConfig, FigmaConfig, GitHubDirectoryPicker, CollectionSelector, SharedCollectionHeader, SourceContextBar)
- [ ] 01-05-PLAN.md — Final build sweep and visual verification checkpoint

### Phase 2: Test ATUI component library - confirm Button can be imported and used

**Goal:** Confirm the ATUI Stencil component library Button can be imported and rendered in the Next.js 13.5.6 App Router by creating a minimal /dev-test sandbox page that establishes the integration pattern for Phase 1.
**Depends on:** Phase 1
**Plans:** 1 plan

Plans:
- [x] 02-01-PLAN.md — Create /dev-test sandbox page with ATUI Button integration (complete 2026-03-01)
