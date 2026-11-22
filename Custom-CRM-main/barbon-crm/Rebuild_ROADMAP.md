# Barbon CRM — Next Roadmap Prompts

Use these prompts one phase at a time. Do not give the agent the entire roadmap in a single request.

Reference architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)

Current application: [barbon-crm/](./)

## Universal instructions

Paste this before every phase prompt:

```text
Act as a senior engineer working carefully in an existing production codebase.

Before changing code:
1. Inspect the repository and relevant existing behavior.
2. Identify affected files and dependencies.
3. State assumptions and risks.
4. Propose a small implementation plan.

Rules:
- Do not delete existing data.
- Do not commit secrets.
- Do not modify unrelated files.
- Do not rewrite working features without approval.
- Preserve backward compatibility where practical.
- Add tests for changed behavior.
- Run focused validation after implementation.
- Report files changed, tests run, risks, and remaining work.
- Stop after this phase; do not start the next phase automatically.
```

## Phase 1 — Backend foundation and security

### Goal

Create authentication, organizations, workspaces, memberships, RLS, migrations, and audit logging.

### Prompt

```text
Implement Phase 1 of ARCHITECTURE.md.

Use Supabase Auth, PostgreSQL, Row Level Security, and Supabase Edge Functions where privileged operations are required. Do not build a separate NestJS/Fastify backend in this phase.

Build:
- organizations
- organization_memberships
- workspaces
- workspace_memberships
- authenticated user profile mapping
- role capabilities: owner, admin, manager, operator, viewer
- PostgreSQL migrations
- Row Level Security policies
- audit_log
- health and readiness checks
- environment configuration
- minimal encrypted export and restore smoke test
- rate limits for authentication-related requests, admin functions, and public/unauthenticated endpoints

Security requirements:
- Deny access by default.
- Owners have organization-wide access.
- Admins have organization administration rights.
- Managers, operators, and viewers require explicit workspace membership.
- Never trust organization_id or workspace_id from the browser.
- Never expose service-role credentials to the frontend.
- Apply per-user, per-organization, and per-IP limits where appropriate.
- Add tests for cross-tenant access, role restrictions, invalid workspace IDs, expired sessions, clean migrations, atomic outbox writes, stale updates, and frontend secret leakage.

Do not build the full CRM frontend or AI features yet.
```

### Acceptance criteria

- Authentication works.
- Clean database migrations succeed.
- Cross-tenant reads and writes are denied.
- Owner can access all organization workspaces.
- Invalid workspace IDs are rejected.
- Expired sessions are rejected.
- Viewer cannot mutate data.
- Operator cannot manage members.
- Audit events are recorded.
- Business changes and outbox events commit atomically.
- Stale updates return HTTP 409 Conflict.
- No secrets appear in frontend bundles.

## Phase 2 — Database model and migration

### Goal

Move the current local JSON state into PostgreSQL without losing data.

### Prompt

```text
Implement Phase 2 of ARCHITECTURE.md.

Create a safe, repeatable migration from the current Barbon CRM state into PostgreSQL.

Use:
- barbon-crm-backup wed 23.09.26.json
- barbon-crm-prospects wed 23.09.26.csv
- js/seed.js
- js/data/seed-prospects.js
- js/data/seed-messages.js

Build:
- imports
- import_rows
- prospect migration
- workspace migration
- pipeline stage migration
- message template migration
- activity history migration
- KPI and checklist migration
- automation migration
- duplicate handle detection
- import preview
- import report
- rollback by import batch

Rules:
- Never modify the source files.
- Never silently discard rows.
- Preserve source IDs in migration metadata.
- Make imports idempotent.
- Use additive restore by default.
- Report inserted, updated, skipped, duplicate, and rejected records.
- Add reconciliation tests for counts and relationships.
```

### Acceptance criteria

- Original JSON remains unchanged.
- Import can be repeated safely.
- Counts reconcile with the source backup.
- Message templates and activity history are preserved.
- Failed imports can be rolled back.
- Existing automation rules are imported disabled, are not executed during the first import, and are enabled only after Phase 4 is implemented and tested.

## Phase 3 — Core CRM frontend

### Goal

Replace browser-local CRM data with shared, authenticated data while following the approved UX design.

### Prompt

```text
Implement Phase 3 of ARCHITECTURE.md using the approved UX design.

Build the Attio-inspired CRM experience with:
- workspace switcher
- dashboard shell
- Today queue
- Pipeline table
- search and filters
- cursor pagination
- prospect drawer
- prospect detail page
- add/edit prospect form
- tags
- custom fields
- activity timeline
- bulk actions
- import/export screens

Use:
- Next.js
- React
- TypeScript
- TanStack Query
- TanStack Table
- accessible component primitives

Rules:
- PostgreSQL is the source of truth.
- Do not use localStorage for business data.
- Every mutation must use the approved repository/API boundary.
- Match the UX specification rather than inventing layouts.
- Include loading, empty, error, offline, and permission states.
- Preserve keyboard navigation and responsive behavior.
- Do not load thousands of records into the browser at once.
- Use a parallel rebuild in a separate application directory; do not convert the current Preact routes in place.
- Keep the current Preact application working as the read-only reference/fallback.
- Migrate and reconcile data before switching production writes.
- Use a static-exported Next.js frontend on Cloudflare Pages.
- Use the Supabase client with RLS for normal authenticated CRUD and Supabase Edge Functions for privileged operations.
- Do not use Next.js server actions, SSR, or server-only secrets in the first deployment model.
- Do not delete the old application until migration, security, and restore tests pass.
```

### Acceptance criteria

- Two browser sessions see the same changes.
- Unauthorized records never appear.
- Large lists are paginated.
- Failed mutations are visible and recoverable.
- UI matches the approved UX design.

## Phase 4 — Follow-ups, jobs, and automations

### Goal

Make follow-ups reliable even when the browser is closed.

### Prompt

```text
Implement Phase 4 of ARCHITECTURE.md.

Build:
- follow_up_tasks
- message_sequences
- message_stages
- sequence_enrollments
- outbox_events
- task claiming
- retries with exponential backoff
- idempotency keys
- dead-letter handling
- snoozing
- timezone-aware scheduling
- notification events
- automation execution history

Every business mutation that creates downstream work must atomically write:
1. The business record change.
2. The activity event.
3. The audit event.
4. The outbox event.

Rules:
- Do not use browser timers for critical scheduling.
- Do not send Instagram messages automatically.
- Prevent duplicate processing.
- Handle worker crashes safely.
- Store diagnostic information for failed jobs.
- Test retries, duplicate events, and provider failures.
```

### Acceptance criteria

- Follow-ups run without an open browser.
- Retried jobs do not duplicate actions.
- Failed jobs are visible.
- Time zones are correct.
- Automation actions are audited.

## Phase 5 — Analytics

### Goal

Create trustworthy CRM reporting from activity data.

### Prompt

```text
Implement Phase 5 of ARCHITECTURE.md.

First define the calculation for every metric. Then build:
- funnel reporting
- reply rate
- conversion rate
- lead-source reporting
- prospect-type reporting
- message-variant performance
- follow-up backlog
- KPI dashboards
- daily aggregate tables where necessary

Rules:
- Activities are the audit source.
- All queries must be workspace-scoped.
- Test timezone boundaries.
- Test empty and archived data.
- Add indexes and inspect query plans.
- Reconcile dashboard values against raw activity events.
- Do not use AI to calculate the underlying numbers.
```

### Acceptance criteria

- Metric definitions are documented.
- Results reconcile with raw data.
- Reports do not slow down CRM pages.
- Date ranges and time zones are correct.

## Phase 6 — Backup and restore

### Goal

Provide reliable recovery under the $30/month infrastructure budget.

### Prompt

```text
Implement Phase 6 of ARCHITECTURE.md.

Build:
- backup_manifests
- backup_events
- encrypted logical database exports
- checksum verification
- Cloudflare R2 upload
- scheduled backup automation
- incremental backup events
- backup retention cleanup
- restore into a safe target
- restore validation
- backup failure alerts

Retention:
- Supabase managed backup: 7 days.
- Encrypted daily R2 exports: 90 days.
- Weekly R2 snapshots: long-term retention.
- Monthly restore drill.

Rules:
- Encrypt before upload.
- Never store encryption passwords in Git.
- Never overwrite production during a normal restore.
- Require owner/admin approval for restore.
- Record schema version, checksum, source timestamp, and restore result.
- Test corrupted files, interrupted uploads, duplicate events, and failed restores.
- Phase 1 must already have passed the minimal encrypted export and restore smoke test; Phase 6 adds production scheduling, retention, incremental events, checksums, alerts, and monthly drills.
```

### Acceptance criteria

- A backup can be restored into a clean database.
- Backup files are encrypted.
- Restore does not silently delete data.
- Failed backup jobs alert someone.
- A documented restore drill succeeds.

## Phase 7 — AI-assisted workflows

### Goal

Add AI as a controlled assistant, not an uncontrolled actor.

### Prompt

```text
Implement Phase 7 of ARCHITECTURE.md only after core CRM, security, and backups pass.

Build these agents in order:
1. Reply classifier.
2. Follow-up prioritizer.
3. Message drafting assistant.
4. Data hygiene assistant.
5. Weekly analytics narrator.

Build:
- agent_runs
- agent_tools
- ai_prompt_versions
- structured output schemas
- approved context builder
- tool allowlist
- human approval state
- token and cost tracking
- audit logging

The AI must not:
- send external messages
- delete contacts
- change permissions
- export all tenant data
- execute arbitrary SQL
- invent prospect facts

Test prompt injection, malformed output, hallucinated facts, unauthorized tools, provider timeout, and excessive usage.
```

### Acceptance criteria

- Every AI run is logged.
- Output is schema-validated.
- Risky actions require approval.
- AI failure does not break core CRM workflows.
- Usage and cost are visible.

## Phase 8 — Security and reliability testing

### Goal

Prove that the application fails safely.

### Prompt

```text
Act as a Principal QA, Security, and Reliability Engineer.

Test the complete CRM:
- authentication
- session expiry
- authorization
- tenant isolation
- Row Level Security
- contact CRUD
- pipeline changes
- follow-up jobs
- automation idempotency
- imports and exports
- backup and restore
- AI approval workflows

Security tests:
- forged workspace IDs
- cross-tenant access
- invalid tokens
- expired sessions
- rate-limit bypass
- malicious CSV and JSON
- formula injection
- prompt injection
- secret leakage
- unsafe file uploads

Reliability tests:
- worker crash
- duplicate event
- database timeout
- provider timeout
- network interruption
- restore from backup
- concurrent edits

For every failure report severity, reproduction, root cause, user impact, fix, and regression test.
```

### Acceptance criteria

- No unresolved critical security issues.
- RLS tests pass.
- Restore test passes.
- Critical workflows have regression coverage.
- Monitoring captures failures without logging sensitive data.

## Phase 9 — Deployment

### Goal

Deploy safely while keeping the initial monthly infrastructure cost below $30.

### Prompt

```text
Implement Phase 9 deployment for the Barbon CRM.

Target:
- Static-exported Next.js frontend on Cloudflare Pages
- Supabase for Auth and PostgreSQL
- Cloudflare R2 for encrypted backups
- Free-tier monitoring initially

Set up:
- local development environment
- staging environment where affordable
- production environment
- secure environment variables
- database migration pipeline
- HTTPS
- health and readiness checks
- error monitoring
- scheduled backups
- spend alerts
- rollback process
- rate limits for authentication, imports, backups/restores, AI, admin functions, and public endpoints

Rules:
- Never commit secrets.
- Never use production credentials locally.
- Never deploy unreviewed migrations.
- Run smoke tests after deployment.
- Verify backup creation and restoration.
- Verify the static export contains no server-only secrets and uses no SSR/server actions.
- Document every manual production step.
- Report the monthly cost.
```

### Acceptance criteria

- Production URL works.
- Authentication works in production.
- RLS works in production.
- Smoke tests pass.
- Backup test passes.
- Rollback instructions are documented.
- Monthly cost remains within budget.

## Phase 10 — PWA and iOS decision

### Goal

Validate mobile web usage before funding native iOS development.

### Prompt

```text
Evaluate the Barbon CRM PWA before building native iOS.

Test on desktop, mobile Safari, and the installed PWA:
- Today queue
- Prospect drawer
- Search
- Message copy workflow
- Reply logging
- Snooze
- Notifications
- Safe-area layout
- Authentication expiry
- Offline/read-only behavior

Measure:
- Task completion time
- Failure rate
- Missing mobile interactions
- PWA install usage
- Notification usefulness
- Copy/share workflow quality

Recommend one decision:
1. Continue with PWA.
2. Build a thin native wrapper.
3. Build a native Expo application.

Do not start native development without evidence that the PWA cannot support the required workflow.
```

## Definition of done for every phase

```text
Architecture reviewed
UX behavior reviewed
Implementation completed
Unit tests passed
Integration tests passed
Security checks completed
Migration impact understood
Backup/recovery impact understood
Manual smoke test completed
Code diff reviewed
Documentation updated
Rollback plan documented
```

## Phase 0 completion checklist

- [x] Architecture links verified against the actual repository filenames.
- [x] User profile schema added.
- [x] Backend boundary selected: Next.js static export, Supabase client/RLS, and Supabase Edge Functions.
- [x] Frontend migration strategy selected: parallel rebuild with the current Preact app retained as read-only fallback.
- [x] Automation activation policy selected: import disabled, enable only after Phase 4 testing.
- [x] Deployment model selected: static-exported Next.js on Cloudflare Pages; no SSR/server actions initially.
- [x] Rate limits defined for auth, imports, backups/restores, AI, admin, and public endpoints.
- [x] Backup retention defined: Supabase 7 days, R2 daily 90 days, weekly long-term snapshots, monthly restore tests.
- [x] Phase 1 acceptance tests defined.
- [x] Phase 1 includes a minimal encrypted export and restore smoke test; Phase 6 owns production backup automation.

## Recommended immediate next prompt

Ask for a **Phase 1 implementation plan only**. Do not authorize Phase 1 development until that plan has been reviewed. The plan should cover authentication, organizations, workspace membership, RLS, audit/outbox writes, minimal encrypted export/restore smoke testing, rate limiting, migrations, and focused acceptance tests. Do not begin AI, native iOS, offline writes, or advanced analytics.
