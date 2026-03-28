---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Org User Management
status: roadmap_ready
last_updated: "2026-03-28T00:00:00Z"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Token collections are always available and editable: stored in MongoDB, accessible via collection-scoped URLs, with per-collection Figma/GitHub config, full CRUD from the collections grid, Figma import/export fully integrated, and a Themes system where each theme is a complete token value set with per-group edit permissions, dark-mode awareness, and theme-targeted export.
**Current focus:** Phase 16 — Auth Infrastructure and Security Baseline

## Current Position

Phase: 16 of 21 (Auth Infrastructure and Security Baseline)
Plan: — (not started)
Status: Ready to plan
Last activity: 2026-03-28 — Roadmap created for v1.5 Org User Management (6 phases, 25 requirements mapped)

Progress: [░░░░░░░░░░] 0% (0/6 phases complete)

## Performance Metrics

**Velocity (v1.4 reference):**
- Total plans completed (v1.4): 21
- Average duration: ~3-5 min/plan
- Total execution time: ~8 days

**By Phase (v1.4):**

| Phase | Plans | Avg/Plan |
|-------|-------|----------|
| 10. Data Model Foundation | 2 | ~5 min |
| 11. Inline Token Editing UI | 3 | ~4 min |
| 12. Theme-Aware Export | 4 | ~3 min |
| 13. Groups Ordering DnD | 3 | ~5 min |
| 14. Dark Mode Support | 5 | ~3 min |
| 15. Multi-Row Actions | 4 | ~3 min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table.

Key decisions relevant to v1.5 (from research):
- `next-auth@^4.24.13` (not v5) — v5 requires Next.js 14+; project locked at 13.5.6 → 13.5.9
- No `@auth/mongodb-adapter` — Credentials provider requires JWT sessions; adapter is incompatible and creates conflicting MongoClient
- `session: { strategy: "jwt" }` explicit — role and id embedded in JWT via callbacks; never rely on default session strategy
- `crypto.randomBytes(32)` for invite tokens — no `jsonwebtoken` dep needed; SHA-256 hash stored in DB, plaintext sent in email
- JWT role re-fetch every 60s — `roleLastFetched` timestamp in JWT; re-fetch from DB in jwt callback if stale
- `getServerSession()` on every write Route Handler — middleware is UX, not security (CVE-2025-29927 proof)
- `SUPER_ADMIN_EMAIL` enforcement in jwt callback — always overrides DB role; no UI surface needed

### Pending Todos

None.

### Blockers/Concerns

- CVE-2025-29927: Next.js 13.5.6 middleware auth bypass (CVSS 9.1) — must patch to 13.5.9 as first step of Phase 16 before any auth code ships
- Per-collection override loading strategy (PERM-04) unresolved — lazy fetch on collection page mount vs. eager load of all user overrides at session start; resolve during Phase 19 planning
- Resend domain verification required for production — `onboarding@resend.dev` works in dev; production needs verified sending domain (operational gap, not code gap)
- Sign-in rate limiting deferred — `POST /api/auth/callback/credentials` unprotected against brute force; acceptable for internal tool; document in Phase 18 plan

## Session Continuity

Last session: 2026-03-28
Stopped at: Roadmap created — Phase 16 ready to plan
Resume file: None
