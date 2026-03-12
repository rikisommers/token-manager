# Phase 3: App Layout UX (sidebar + scoped config/status pages) - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the app's navigation and layout: add a persistent left sidebar, move GitHub/Figma configuration to a dedicated Settings page, move the Build Tokens action + output to a Configuration page, and promote the Generate Tokens view as the primary Tokens interface. The View Tokens code is preserved but hidden from navigation. No new capabilities — this is a layout reorganization.

</domain>

<decisions>
## Implementation Decisions

### Sidebar navigation
- 3 nav items: **Tokens**, **Configuration**, **Settings**
- **Tokens** — the current Generate Tokens view becomes the main tokens interface (primary landing page)
- **Configuration** — Build Tokens action + build output
- **Settings** — FigmaConfig + GitHubConfig inline forms
- View Tokens code is preserved but hidden from sidebar navigation (not removed)
- Icons + labels always visible — no collapse functionality
- Active item uses a filled dark background highlight (matches Tokens Studio reference pattern)
- App name ("ATUI Tokens" or similar) at the very top of the sidebar
- Collection selector (dropdown) sits below the app name — acts as a project-level switcher
- Sidebar is full-height fixed (~200px wide); only the main content area scrolls

### Sidebar layout
- Fixed ~200px wide left column
- Main content fills the remaining viewport width (no max-width constraint)
- Full-height sticky; sidebar stays in place while content scrolls

### Configuration page (Build Tokens)
- Two-column layout: left column has the Build Tokens action + settings; right column shows build output / token preview inline (no modal)
- Download JSON action also moves to this page
- Export to Figma and Import from Figma stay in their current location (main content area of Tokens page)

### Settings page (Sync Config)
- FigmaConfig and GitHubConfig rendered as expanded inline forms (always visible, no click-to-reveal buttons or dialogs)
- Figma config and GitHub config are separate sections on the page
- Figma/GitHub connection status stays in the collection header area (always visible) — not on Settings page

### Collection selector & actions
- Collection selector (dropdown) lives at the top of the sidebar, below the app name
- Collection actions (Save As, New Collection, Delete, Rename, Duplicate) move to the main content area top bar of the Tokens page
- SourceContextBar (upstream GitHub branch/file info) stays in the main content area, just below the top bar

### Claude's Discretion
- Exact sidebar color scheme and typography (reference: Tokens Studio dark sidebar look)
- Icon choices for each nav item
- Exact spacing and visual styling of the collection selector in the sidebar
- Whether the main content area has its own top bar / page title header per page

</decisions>

<specifics>
## Specific Ideas

- Reference design: Tokens Studio (pumpkin.tokens.studio) — sidebar with app name, project selector, nav items with icons + labels, active item with filled dark background
- The Generate Tokens view is the main interface going forward — View Tokens is kept in code but not surfaced in navigation
- Build output should feel like an inline panel (replacing the current BuildTokensModal dialog) — content visible directly on the Configuration page
- Figma/GitHub status must always be visible — it lives in the collection header regardless of which page is active

</specifics>

<deferred>
## Deferred Ideas

- **Releases page** (export history, version history with commit data) — mentioned during discussion, needs GitHub commit data access, future phase
- **Sidebar collapse** (toggle between icons+labels and icons-only) — explicitly decided against for now, could be added later

</deferred>

---

*Phase: 03-update-app-layout-to-improve-ux*
*Context gathered: 2026-03-11*
