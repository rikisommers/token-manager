# Phase 20: Email Invite Flow and Account Setup - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can invite a new user by email (entering email + role); the invited user receives a setup link, sets their display name and password, and gains access with their assigned role. Pending invites are visible in a stub /org/users page with expiry status, resend, and revoke. Phase 21 builds out full member management on top of this foundation.

</domain>

<decisions>
## Implementation Decisions

### Invite trigger & form
- Invite modal is triggered from the /org/users page (Phase 20 builds this stub page)
- Fields: Email + Role (Admin / Editor / Viewer) only — no optional message
- On success: modal closes; the table row appearing is the visual confirmation — no separate toast
- Duplicate check: if email already has a pending invite or active account, show an inline validation error inside the modal (no silent replacement)

### Email template
- Simple styled email — minimal HTML, not a fully-branded template
- Content: app name + assigned role + setup link + expiry notice (e.g. "Link expires in 7 days")
- Invite token expiry: 7 days
- No inviter name in the email

### Pending invites display
- /org/users stub page built in Phase 20; Phase 21 extends it with active member rows
- Single unified table with a Status column — pending invites are rows in the same table, not a separate section
- Columns: Email | Role | Status badge (Pending / Expired) | Expiry date | Actions
- Row actions: Resend (generates new token, sends fresh email, resets 7-day clock) + Revoke (deletes invite)
- /org/users nav link is added to the main nav, visible to Admins only (RBAC already in place)

### Account setup page (/setup?token=...)
- Centered card layout — matches the existing sign-in page style
- Fields: Display Name + Password
- Password requirements shown as inline hint text below the password field; validation error only shown after the field is touched
- After successful setup: user is signed in and redirected to the specific collection if the invite carried a collectionId; otherwise redirects to collections home
- Invites are org-level (role only) but the Admin can optionally attach a specific collectionId — stored on the Invite document and used for the post-setup redirect
- Invite token is single-use: attempting to load the setup page a second time after account setup shows an error page

### Claude's Discretion
- Exact error page design for expired / already-used invite tokens
- Password minimum length (8 characters is standard)
- Loading / submission states on the invite modal and setup form
- Revoke confirmation dialog (or immediate with undo)

</decisions>

<specifics>
## Specific Ideas

- The /org/users table in Phase 20 is intentionally minimal — Phase 21 will add active member rows, role-change controls, and removal. The table schema should be designed with that extension in mind.
- The invite email should feel functional and clear, not marketing-y. "You've been invited to ATUI Tokens Manager as Editor. Set up your account here. Link expires in 7 days."

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-email-invite-flow-and-account-setup*
*Context gathered: 2026-03-28*
