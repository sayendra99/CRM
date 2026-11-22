# Barbon CRM — Phase 0 Product Discovery & Architecture

Status: Proposed production design  
Scope: Discovery and architecture only; no application code or user data changed.  
Date: 22 November 2026

## 1. Executive summary

Barbon CRM is currently a zero-build, local-first Preact application for manual Instagram outreach. The browser owns the state, which is persisted as one JSON document in `localStorage`. It supports multiple local workspaces, prospect records, pipeline stages, message templates, follow-up scheduling, manual replies, automations, KPIs, checklists, analytics, CSV import, and JSON/CSV export.

The production direction should preserve the current workflow and data vocabulary while moving persistence and identity to a hosted, tenant-aware backend. The recommended first production architecture is:

- Next.js frontend, still installable as a PWA.
- Supabase Auth + Postgres + Row Level Security for normal authenticated CRUD.
- Supabase Edge Functions for privileged operations: imports, backups, AI calls, restores, admin operations, and complex multi-table transactions.
- No separate NestJS/Fastify backend in Phase 1. A separate API may be introduced later if scale or domain complexity justifies it.
- Manual Instagram sending remains a hard product boundary. No Instagram credentials, scraping, or automated sending in the first production release.
- A staged local-export migration, followed by an additive cloud import, with the original JSON retained as an immutable source backup.

This design is intentionally conservative: it introduces shared persistence and access control without rewriting the existing product behavior.

## 2. Current application behavior (observed)

### Runtime and deployment

- [`index.html`](./index.html) loads vendored Preact, htm, hooks, CSS, and ES modules through an import map.
- [`serve.py`](./serve.py) is a small Python static HTTP server. There is no build pipeline, package manager, API server, or database.
- A service worker and web manifest provide offline/PWA behavior.
- Theme, palette, and glass-mode values are applied before first paint from `localStorage`.

### Application shell

- [`js/main.js`](./js/main.js) provides navigation for Home, Today, Pipeline, Insights, Messages, KPIs, Standard, Automations, and Settings.
- Workspaces can be switched, created, and deleted locally.
- Global keyboard shortcuts include search and new-prospect creation.
- Browser notifications are optional and permission-based.

### State and persistence

- [`js/storage.js`](./js/storage.js) defines a local adapter at key `barbon-crm-v1` and a placeholder remote adapter that is not implemented.
- [`js/store.js`](./js/store.js) holds the raw state, creates a projected active-workspace state for views, debounces writes by 150 ms, and exposes all mutations.
- `resetAll()` creates one safety snapshot before resetting. This is a local undo mechanism, not a durable backup.
- `replaceState()` accepts older JSON backups and routes them through migration.

### Data and migration

- [`js/seed.js`](./js/seed.js) builds version 3 state with two workspaces: Barbon Photography and SA Management.
- The current state is a single root object with `version`, `activeWs`, `workspaces`, and global `settings`.
- `migrateToV2()` and `migrateToV3()` are additive, in-place transformations. V3 separates prospect type, lead source, tags/groups, and pipeline stage while preserving legacy internal field names.
- Seed data and message libraries live in [`js/data/`](./js/data/).

### Prospect lifecycle and workflow

- A prospect is created or imported with a handle, name, service/type, lead source, pipeline group/stage, follow-up date, notes, tags, custom values, and history.
- A prospect starts at message stage `0`. `markSent()` appends a sent event, advances the message stage, calculates the next follow-up date, and may run automations.
- Reply values are `none`, `positive`, or `negative`; reply automations can move a prospect between stages.
- Time-based automations can act on contacted prospects that have not replied.
- The Today queue prioritizes overdue follow-ups, then due follow-ups, then fresh prospects.
- Sending is explicitly manual: the app copies text to the clipboard and records the send only after the operator confirms.

### Views and components

- [`js/views/`](./js/views/) contains view-level behavior for dashboard, pipeline, today queue, messages, KPIs, checklist, automations, analytics, and settings.
- [`js/components/`](./js/components/) contains prospect editing/drawer UI, send modal, reusable controls, icons, and toasts.
- [`js/logic.js`](./js/logic.js) contains read-only derived calculations such as queue ordering, KPI values, variant selection, checklist scores, streaks, and group statistics.
- [`css/app.css`](./css/app.css) contains all application styling; there is no CSS build step.

### Current limitations relevant to production

- `localStorage` is browser- and device-specific, has no server-side recovery, and is vulnerable to loss through browser/profile/device failure.
- There is no authentication or authorization; anyone with the browser profile can access all local workspaces.
- Local mutations are not audited with actor identity, version, or conflict metadata.
- Delete operations exist for prospects, groups, workspaces, KPIs, checklist items, automations, and reset; production must add recoverable deletion and authorization.
- The current single JSON document will become difficult to synchronize safely as users and devices increase.
- No automated test suite or build configuration was found.

## 3. Product requirements

### Must preserve

1. An operator can work a prioritized follow-up queue.
2. The operator can manage prospects through customizable pipeline stages.
3. The operator can record sends and replies without the system sending Instagram messages.
4. Message variants, cadence, and history remain editable and explainable.
5. Workspaces isolate their prospects, stages, templates, KPIs, checklists, automations, and activity.
6. Existing local JSON and CSV exports remain importable.
7. The product remains usable on desktop, mobile web, and installed PWA.

### Production requirements

1. A user can sign in and recover access securely.
2. A tenant/workspace member can only access authorized workspaces and records.
3. Multiple devices see the same workspace state with predictable conflict behavior.
4. Every important mutation has an audit trail with actor and timestamp.
5. Backups are encrypted, restorable, tested, and retained according to policy.
6. Imports are idempotent, previewable, validated, and never silently destructive.
7. Operational failures are observable and recoverable.
8. The initial monthly infrastructure cost remains below $30, excluding optional paid AI usage, domain registration, and third-party messaging costs.

### Explicit non-goals for the first production release

- Automated Instagram login, scraping, or message delivery.
- Bulk unsolicited messaging.
- A complex marketing automation platform.
- Native iOS code before the PWA workflow is validated.
- Cross-tenant reporting unless explicitly authorized.

## 4. User roles

These roles are proposed; the current app has no roles.

| Role | Scope | Capabilities |
|---|---|---|
| Owner | Organization | Billing, organization settings, all workspaces, membership, retention, restore approval, deletion approval |
| Admin | Organization/workspace | Manage members, workspace configuration, imports, templates, automations, backups; no billing unless granted |
| Manager | Assigned workspaces | Manage prospects, stages, assignments, templates, reports, and team activity |
| Operator | Assigned workspaces | Work Today/Pipeline, send manually, record replies, notes, snooze, and update assigned records |
| Viewer | Assigned workspaces | Read-only access to permitted records, dashboards, and reports |

Proposed authorization rule: deny by default. Owner has organization-wide access. Admin has organization-wide administration and workspace access according to explicit policy. Manager, Operator, and Viewer require explicit workspace membership. Role permissions should be capability-based in code, not inferred from UI visibility.

## 5. Workspace and tenant model

### Proposed terminology

- **Organization/tenant:** a customer boundary for users, billing, policies, and workspaces.
- **Workspace:** an independent outreach pipeline inside an organization. This maps to the current local `workspace` object.
- **Membership:** a user’s role in an organization and optional role override in a workspace.
- **Prospect:** a contact/business record owned by one workspace.

### Isolation rules

- Every business table carries `organization_id`; workspace-owned tables also carry `workspace_id`.
- `organization_id` is derived from the authenticated membership, never accepted as a trusted client-only field.
- Postgres Row Level Security must enforce organization and workspace membership on every table.
- No workspace switch in the client may bypass a server-side membership check.
- Cross-organization queries are prohibited by default.

### Recommended ownership structure

```text
organization
  ├── organization_membership ── user
  ├── workspace
  │     ├── workspace_membership
  │     ├── prospect
  │     ├── pipeline_stage
  │     ├── message_template / message_variant
  │     ├── automation_rule
  │     ├── activity_event
  │     └── KPI / checklist configuration
  └── backup_manifest
```

## 6. Contact and pipeline lifecycle

### Lifecycle states

The current implementation uses a numeric message stage plus a user-named pipeline group. Production should make these concepts explicit:

1. `new` — imported or created, no first message recorded.
2. `contacted` — at least one manual send recorded.
3. `follow_up_due` — next follow-up date is today or overdue.
4. `replied` — any reply recorded, with positive/negative/neutral classification.
5. `qualified` — operator-defined stage such as Interested.
6. `won` — a stage whose semantic type is Won/Client/Paid.
7. `lost` — disqualified, not ideal, or explicitly closed.
8. `archived` — hidden from active work queues but retained.

These are proposed canonical semantics. Existing custom stage names remain display labels and are mapped using a stage type field, rather than regex-only reporting.

### Event rules

- Create/import emits `prospect.created`.
- Manual send emits `message.sent` and schedules the next follow-up.
- Reply emits `prospect.replied` and may invoke enabled automation rules.
- Stage change emits `prospect.stage_changed`.
- Note, snooze, archive, restore, assignment, import, and export emit explicit events.
- Automation actions must be idempotent and record the rule ID that caused them.
- Hard deletion is not part of normal workflow; archive first, then restricted deletion after a retention period.

## 7. Proposed database schema

The schema below is the target relational model. It is intentionally normalized at the tenant/configuration boundaries while retaining JSON columns for flexible custom fields and provider metadata.

### Identity and tenancy

```text
user_profiles
  id uuid primary key references auth.users
  display_name text
  avatar_url text null
  timezone text not null default 'UTC'
  created_at timestamptz not null
  updated_at timestamptz not null

organizations
  id uuid primary key
  name text not null
  created_at timestamptz not null
  deleted_at timestamptz null

organization_memberships
  organization_id uuid not null references organizations
  user_id uuid not null references auth.users
  role text not null check (role in ('owner','admin','manager','operator','viewer'))
  status text not null default 'active'
  created_at timestamptz not null
  primary key (organization_id, user_id)

workspaces
  id uuid primary key
  organization_id uuid not null references organizations
  name text not null
  palette text null
  settings jsonb not null default '{}'
  created_at timestamptz not null
  archived_at timestamptz null

workspace_memberships
  workspace_id uuid not null references workspaces
  user_id uuid not null references auth.users
  role text null
  created_at timestamptz not null
  primary key (workspace_id, user_id)
```

### Contacts and pipeline

```text
prospects
  id uuid primary key
  organization_id uuid not null references organizations
  workspace_id uuid not null references workspaces
  name text not null
  handle text null
  handle_normalized text null
  email text null
  phone text null
  website text null
  location text null
  prospect_type_id uuid null references prospect_types
  lead_source_id uuid null references lead_sources
  stage_id uuid null references pipeline_stages
  message_stage integer not null default 0
  reply_status text not null default 'none'
  follow_up_at timestamptz null
  last_interaction_at timestamptz null
  property_notes text null
  notes text null
  custom jsonb not null default '{}'
  archived_at timestamptz null
  created_by uuid null references auth.users
  created_at timestamptz not null
  updated_at timestamptz not null
  version integer not null default 1
  unique (workspace_id, handle_normalized)

prospect_tags
  prospect_id uuid not null references prospects
  tag text not null
  created_at timestamptz not null
  primary key (prospect_id, tag)

pipeline_stages
  id uuid primary key
  workspace_id uuid not null references workspaces
  name text not null
  semantic_type text not null default 'open'
  position integer not null
  color text null
  archived_at timestamptz null

prospect_types
  id uuid primary key
  organization_id uuid not null references organizations
  name text not null
  archived_at timestamptz null

lead_sources
  id uuid primary key
  organization_id uuid not null references organizations
  name text not null
  archived_at timestamptz null
```

### Messaging and activity

```text
message_sequences
  id uuid primary key
  workspace_id uuid not null references workspaces
  name text not null
  active boolean not null default true

message_stages
  id uuid primary key
  sequence_id uuid not null references message_sequences
  label text not null
  position integer not null
  delay_days integer not null default 0

message_variants
  id uuid primary key
  message_stage_id uuid not null references message_stages
  body text not null
  position integer not null
  archived_at timestamptz null

activity_events
  id uuid primary key
  organization_id uuid not null references organizations
  workspace_id uuid not null references workspaces
  prospect_id uuid null references prospects
  actor_user_id uuid null references auth.users
  event_type text not null
  payload jsonb not null default '{}'
  idempotency_key text null
  occurred_at timestamptz not null

follow_up_tasks
  id uuid primary key
  organization_id uuid not null references organizations
  workspace_id uuid not null references workspaces
  prospect_id uuid not null references prospects
  assigned_to uuid null references auth.users
  task_type text not null default 'follow_up'
  due_at timestamptz not null
  status text not null default 'open'
  source_message_stage_id uuid null references message_stages
  completed_at timestamptz null
  completed_by uuid null references auth.users
  created_at timestamptz not null
  updated_at timestamptz not null

sequence_enrollments
  id uuid primary key
  workspace_id uuid not null references workspaces
  prospect_id uuid not null references prospects
  sequence_id uuid not null references message_sequences
  current_stage_id uuid null references message_stages
  status text not null default 'active'
  enrolled_at timestamptz not null
  exited_at timestamptz null

conversations
  id uuid primary key
  organization_id uuid not null references organizations
  workspace_id uuid not null references workspaces
  prospect_id uuid not null references prospects
  channel text not null default 'instagram_manual'
  status text not null default 'open'
  last_message_at timestamptz null
  created_at timestamptz not null
  updated_at timestamptz not null

messages
  id uuid primary key
  conversation_id uuid not null references conversations
  direction text not null check (direction in ('outbound','inbound'))
  body text not null
  provider_message_id text null
  sent_by uuid null references auth.users
  occurred_at timestamptz not null

outbox_events
  id uuid primary key
  organization_id uuid not null references organizations
  workspace_id uuid null references workspaces
  aggregate_type text not null
  aggregate_id uuid not null
  event_type text not null
  payload jsonb not null default '{}'
  idempotency_key text not null unique
  status text not null default 'pending'
  attempts integer not null default 0
  available_at timestamptz not null
  processed_at timestamptz null
  last_error text null
  created_at timestamptz not null

automation_rules
  id uuid primary key
  workspace_id uuid not null references workspaces
  name text not null
  enabled boolean not null default true
  trigger jsonb not null
  action jsonb not null
  created_by uuid null references auth.users
  created_at timestamptz not null
  updated_at timestamptz not null
```

### Configuration, audit, and backups

```text
kpi_definitions / kpi_entries
checklist_items / checklist_entries
custom_field_definitions

imports
  id uuid primary key
  organization_id uuid not null references organizations
  workspace_id uuid not null references workspaces
  status text not null default 'pending'
  source_filename text not null
  source_checksum text not null
  created_by uuid not null references auth.users
  created_at timestamptz not null
  completed_at timestamptz null
  summary jsonb not null default '{}'

import_rows
  id uuid primary key
  import_id uuid not null references imports
  source_row_number integer not null
  raw_payload jsonb not null
  normalized_payload jsonb null
  status text not null default 'pending'
  error_message text null
  created_record_id uuid null

notifications
  id uuid primary key
  organization_id uuid not null references organizations
  workspace_id uuid null references workspaces
  user_id uuid not null references auth.users
  notification_type text not null
  payload jsonb not null default '{}'
  read_at timestamptz null
  created_at timestamptz not null

audit_log
  id, organization_id, workspace_id, actor_user_id,
  action, entity_type, entity_id, before_json, after_json,
  request_id, created_at

backup_manifests
  id, organization_id, created_by, storage_key,
  schema_version, byte_size, sha256, created_at, expires_at,
  restore_status, encryption_key_reference

backup_events
  id uuid primary key
  organization_id uuid not null references organizations
  backup_manifest_id uuid null references backup_manifests
  event_type text not null
  status text not null default 'pending'
  payload jsonb not null default '{}'
  created_at timestamptz not null

agent_runs
  id uuid primary key
  organization_id uuid not null references organizations
  workspace_id uuid null references workspaces
  requested_by uuid null references auth.users
  purpose text not null
  status text not null default 'queued'
  input jsonb not null default '{}'
  output jsonb null
  error_message text null
  created_at timestamptz not null
  completed_at timestamptz null

agent_tools
  id uuid primary key
  agent_run_id uuid not null references agent_runs
  tool_name text not null
  input jsonb not null default '{}'
  output jsonb null
  status text not null default 'requested'
  created_at timestamptz not null

ai_prompt_versions
  id uuid primary key
  organization_id uuid null references organizations
  name text not null
  version integer not null
  template text not null
  active boolean not null default false
  created_at timestamptz not null
```

All tables should have `created_at` and `updated_at` where mutable. Foreign keys must include tenant consistency checks, either through composite keys or database triggers/functions, so a workspace from one organization cannot reference a prospect from another.

## 8. API boundaries

The Phase 1 backend boundary is intentionally one concrete choice:

```text
Next.js frontend
  ├── Supabase Auth
  ├── Supabase client → Postgres through RLS for normal CRUD
  └── Supabase Edge Functions → privileged workflows and transactions
                                └── PostgreSQL / Storage / approved AI providers
```

Do not build a separate NestJS/Fastify server in Phase 1. If the product later needs a dedicated API, introduce it behind the same repository/domain interfaces rather than coupling views to Supabase calls.

### Client modules

- `AuthRepository`: session, sign-in, sign-out, password reset, invite acceptance.
- `WorkspaceRepository`: list accessible workspaces, switch context, manage membership.
- `ProspectRepository`: list/filter/search, create, update, archive, restore, import preview, import commit.
- `PipelineRepository`: stages, ordering, semantic types.
- `MessagingRepository`: sequences, stages, variants, cadence.
- `ActivityRepository`: append events, fetch timeline, KPI aggregation.
- `AutomationRepository`: rules, validation, execution records.
- `BackupRepository`: export request, manifest, download, restore request.

These repositories may use the Supabase client for ordinary reads and writes. They must call Edge Functions for privileged operations and must not expose service-role credentials.

### Phase 1 deployment boundary

- The frontend is a static-exported Next.js application deployed to Cloudflare Pages.
- Normal authenticated data access uses the Supabase client with PostgreSQL RLS.
- Privileged operations use Supabase Edge Functions.
- Phase 1 does not use Next.js server actions, SSR, or server-only secrets.
- Re-evaluate Cloudflare Workers or another host only if SSR or server-side rendering becomes necessary.

### Rate limiting

Apply limits at the Edge Function/auth/provider boundary using per-user, per-organization, and per-IP dimensions where appropriate. At minimum, rate-limit authentication-related requests, imports, backup/restore functions, AI functions, admin functions, and every public or unauthenticated endpoint. Failed authentication and malformed requests must consume limits without exposing whether an account or tenant exists.

### Edge Function modules

- `import-prospects`: parse, normalize, validate, deduplicate, and commit imports.
- `backup-export`: create encrypted logical exports and manifests.
- `backup-restore`: validate and restore into a new or explicitly selected target.
- `admin-operations`: membership, tenant administration, and restricted destructive actions.
- `ai-workflow`: redact, call an approved provider, record `agent_runs`/`agent_tools`, and return a human-reviewable result.
- `transaction-command`: perform complex multi-table commands that must be atomic.

### CRUD and command style

Normal CRUD uses typed Supabase-generated access guarded by RLS. Command-like or privileged operations use typed Edge Function requests. The browser should send:

- authenticated session token;
- workspace context;
- mutation payload;
- idempotency key for create/import/send/retry operations;
- expected record version for optimistic concurrency.

The backend should return canonical records, validation errors, authorization errors, and conflict responses. Bulk imports are asynchronous through `imports` and `import_rows`, with an import job and result summary.

### Boundary rules

- Views call domain actions/repositories, never raw SQL or storage SDKs.
- Domain actions validate required fields, normalize handles, enforce workspace membership, and append audit/activity/outbox rows in one transaction.
- Derived analytics should be server-backed once data is shared.
- Clipboard copy and manual Instagram sending remain client-only capabilities.

## 9. Authentication and authorization

### Proposed authentication

- Use managed email/password or magic-link authentication initially.
- Add MFA before exposing sensitive organization administration or restore operations.
- Store only provider user IDs in application tables; never store passwords.
- Sessions use short-lived access tokens and refresh tokens managed by the auth provider.
- Invite links are single-use and expire.

### Authorization

- Enforce authorization twice: UI capability checks for usability and database RLS/server checks for security.
- Owner has organization-wide access, including every workspace.
- Admin has organization-wide administration; workspace access is granted according to the organization policy and must be explicit in RLS checks.
- Manager, Operator, and Viewer require an active explicit workspace membership for workspace data.
- RLS policies must reject invalid or cross-organization workspace IDs; a client-supplied workspace ID is never sufficient authorization.
- Every mutation checks role capability, ownership scope, record version, and tenant identity.
- Audit log rows are append-only to application roles; only a restricted service role may perform retention operations.
- Do not put service-role keys, database keys, or backup encryption keys in the browser.

### Privacy and operational security

- Minimize collection of personal data; define which fields are necessary for outreach.
- Encrypt in transit and at rest through the managed platform.
- Redact contact details and message bodies from normal application logs.
- Provide export, correction, archive, and deletion workflows appropriate to the organization’s privacy obligations.
- Treat Instagram handles, phone numbers, emails, notes, and interaction history as customer data.

## 10. Backup and restore strategy

### Existing local safety

The current JSON export is the migration source of truth. Before any cloud migration, the operator must download the full JSON backup and preserve it unchanged. CSV is a convenience export and is not sufficient to restore templates, automation rules, activity, KPIs, or settings.

### Production backups

1. Supabase managed database backups provide seven days of baseline retention.
2. A scheduled Edge Function creates encrypted daily logical exports to R2, retained for 90 days.
3. Weekly R2 snapshots are retained permanently or under a separately approved long-term policy.
4. Backup files are stored separately from the primary database, with object lock/versioning where available.
5. Run a restore drill monthly in a non-production project.
6. Record checksum, schema version, source database timestamp, creator/job ID, and restore result in `backup_manifests` and `backup_events`.
7. Restores are owner/admin-approved, never silent, and default to a new organization or staging environment to prevent accidental overwrite.

Phase 1 implements only a minimal encrypted export and restore smoke test. Phase 6 adds scheduled backup automation, R2 retention, incremental `backup_events`, checksums, alerts, and monthly restore drills.

### User-facing restore

- Preview the backup schema, tenant identity, counts, duplicates, and conflicts.
- Default to additive restore with a selectable conflict policy: skip, update, or create duplicate.
- Never delete records as a side effect of restore unless a future, separately approved replacement mode explicitly says so.
- Keep the original uploaded backup and an audit record of the restore operation.

## 11. Reliability strategy

### Data correctness

- Use transactions for prospect mutations plus activity/audit events.
- Use optimistic concurrency with a `version` column and return `409 Conflict` on stale updates.
- Use idempotency keys for import jobs, send recording, and retryable mutations.
- Preserve append-only activity events; derive dashboards from events or maintained projections.
- Add schema constraints for tenant IDs, valid statuses, stage ownership, and unique normalized handles.

### Availability and offline behavior

- Phase 1 is explicitly online-first: retain a local read cache for faster loads, but do not support offline writes.
- When disconnected or when a session is expired, show a clear read-only/offline state and do not claim that mutations are durable.
- Add offline mutations later using the same outbox model, after conflict resolution, authentication expiry, duplicate sync, and recovery behavior are designed and tested.

### Transactional outbox

Every business mutation that has downstream work must commit these rows atomically:

```text
business transaction
  ├── update prospect / task / configuration
  ├── insert activity event
  ├── insert audit log row
  └── insert outbox event

after commit, an Edge Function worker processes outbox_events:
  ├── automations
  ├── notifications
  ├── analytics projections
  ├── backup events
  └── approved AI workflows
```

The worker uses status, attempts, `available_at`, and idempotency keys. A failed worker retry must not duplicate the business mutation. This prevents the failure mode where a prospect update succeeds but its automation event is lost.

### Optimistic concurrency behavior

1. The client reads a prospect with `version = 4`.
2. The client sends an update with `expected_version = 4`.
3. The database updates the row only when `version = 4`, then increments it to `5`.
4. If the current version is already `5`, the update affects zero rows and the API returns `409 Conflict` with the current record.
5. The client presents the conflict and lets the operator reload, discard, or reapply the edit. Silent last-write-wins is not allowed for production mutations.

The PWA service worker should cache static assets only; do not cache authenticated API responses broadly.

### Observability

- Add structured client error reporting without contact/message content.
- Track API latency, error rate, sync conflicts, import failures, backup job status, and restore drills.
- Define initial targets: 99.5% monthly availability, API p95 under 500 ms for normal reads, and zero unacknowledged backup failures.
- Add health checks for auth, database, storage, and scheduled jobs.

## 12. AI workflow boundaries

AI is explicitly deferred from the first production release. The schema reserves `agent_runs`, `agent_tools`, and `ai_prompt_versions` so a later workflow can be added without changing the core prospect model, but no Phase 1 path depends on AI.

### Allowed first use cases

- Drafting or rewriting message variants using operator-provided instructions.
- Summarizing a prospect’s existing activity for the operator.
- Suggesting tags, prospect type, lead source, or next action for human approval.
- Detecting duplicate or malformed imports before commit.

### Prohibited without explicit approval

- Sending messages automatically.
- Logging into Instagram or scraping profiles.
- Making irreversible stage, archive, deletion, or restore decisions without confirmation.
- Training a model on customer data by default.
- Sending contact details or private notes to an AI provider without an explicit data-processing decision.

### Technical boundary

AI calls must go through a server-side, auditable AI module with redaction, request limits, provider configuration, and a per-organization opt-in. Prompts and outputs should be retained only when required for the user-visible feature. The browser must never hold an AI provider secret.

## 13. iOS roadmap

Native iOS is deferred from the first production release.

### Stage 0: PWA hardening

- Validate installability, online-first behavior, viewport behavior, clipboard fallback, notification permission, and safe-area layout on current iOS versions.

### Stage 1: Mobile web parity

- Prioritize Today, prospect drawer, quick send/copy, reply logging, and snooze.
- Add native share-sheet support for copied message text where available.

### Stage 2: Optional wrapper

- If App Store distribution is commercially important, package the web client with a thin native shell only after PWA usage proves the need.
- Keep business logic and API contracts in the web application; native code should provide notifications, share sheet, secure storage, and background refresh only.

### Stage 3: Native features, if justified

- Background notification scheduling, contact/share integrations, and better clipboard/share workflows.
- No native Instagram automation; retain the manual-send boundary.

## 14. Hosting and cost plan under $30/month

### Recommended initial production budget

| Item | Initial choice | Expected monthly cost |
|---|---|---:|
| Static frontend | Cloudflare Pages or equivalent static hosting | $0 |
| Auth + Postgres + RLS + daily managed backups | Supabase Pro, one project | $25 |
| Backup object storage | Cloudflare R2, small volume | Usually cents; budget $1 |
| Monitoring | Provider logs plus free-tier error monitoring | $0 initially |
| Domain | Optional; paid annually and excluded from monthly cap | Variable |
| **Total** |  | **Target $25–26/month** |

Supabase currently lists a Free plan and a Pro plan from $25/month; its Pro plan includes daily backups with seven-day retention. Cloudflare R2 currently lists a $0.015/GB-month standard storage rate and no egress charge, subject to request/storage free tiers and current terms. Verify prices before procurement because vendor pricing changes. Sources: [Supabase pricing](https://supabase.com/pricing), [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/).

### Cost controls

- Start with one production project, one staging project only if the free tier permits it, and one organization.
- Set provider spend caps and alerts.
- Keep media/assets out of the database.
- Do not add paid AI, transactional email, SMS, or analytics until the workflow demonstrates demand.
- Reassess at 10 organizations, 50 users, or 100,000 monthly active users—whichever comes first.

### Alternative ultra-low-cost pilot

Remain local-first for a controlled pilot and use manual JSON backups. This costs $0 in infrastructure but does not satisfy production requirements for identity, shared access, durable recovery, or multi-device synchronization.

## 15. Recommended Phase 1 release scope

### Build

- Authentication.
- Organizations and workspaces.
- Workspace memberships and RLS.
- Prospects.
- Pipeline stages.
- Activities and audit logs.
- Basic follow-up tasks.
- JSON import through the Edge Function import workflow.
- Minimal encrypted export and restore smoke test; production backup automation is Phase 6.
- Online-first local read cache.

### Defer

- AI workflows.
- Native iOS.
- Advanced analytics.
- Offline writes.
- Complex automations.
- External messaging integrations.

### Frontend migration strategy

- Use a parallel rebuild from the current Preact application to Next.js.
- Keep the current Preact application working as the read-only reference and fallback.
- Build the new Next.js application in a separate application directory.
- Migrate and reconcile data before switching production writes.
- Do not attempt a route-by-route conversion between Preact and Next.js.
- Do not delete the old application until the new system passes migration, security, and restore tests.

## 16. Migration plan

### Preconditions

- Freeze the source application version.
- Export and checksum a complete JSON backup from Settings.
- Capture a second CSV export for human inspection only.
- Record source state version, workspace IDs, prospect counts, stage names, message template counts, and activity counts.
- Resolve duplicate handles and malformed dates before import where possible.

### Migration steps

1. Create the organization and owner account.
2. Create one destination workspace per local workspace.
3. Import global prospect types and lead sources.
4. Import pipeline stages, preserving IDs through a mapping table and adding semantic stage types manually where ambiguous.
5. Import prospects with normalized handles and a source-record ID stored in migration metadata.
6. Import tags/groups, custom values, notes, history, templates, cadence, KPIs, checklist definitions, and automation rules.
   Existing automation rules are stored as disabled during migration. They are not executed during the first import and may only be enabled after Phase 4 is implemented and tested.
7. Create an `imports` row with source filename/checksum and one `import_rows` row per source record.
8. Convert local activity/history into append-only activity events with `actor_user_id = null` and `source = local_migration`.
9. Run validation: counts, unique handles, orphan references, date validity, stage mapping, template coverage, and sample record comparison.
10. Present an import report and require owner confirmation.
11. Commit approved rows through the import Edge Function, writing business records, activity, audit, and outbox rows transactionally.
12. Enable cloud writes only after validation; retain local mode as read-only fallback for the migration window.

### Compatibility strategy

- Keep `migrateToLatest()` for local backups indefinitely.
- Add a versioned import adapter rather than teaching the API to accept arbitrary historical shapes.
- Never overwrite the source JSON.
- Use additive imports by default; updates require explicit matching rules and a preview.
- Maintain a rollback path by deleting only the newly created migration batch, not by deleting pre-existing customer data.

## 17. Risks and unresolved decisions

| Risk / decision | Why it matters | Proposed next decision |
|---|---|---|
| Tenant meaning | It is unclear whether Barbon and SA are one business or separate customers | Confirm organization boundary before schema implementation |
| Workspace membership | Current app assumes one local operator | Decide who needs access to which workspace |
| Stage semantics | Current analytics uses names/regex to infer won clients | Add explicit `semantic_type` and migrate labels |
| Handle uniqueness | A handle may be reused across workspaces or change over time | Enforce uniqueness per workspace and retain historical identifiers |
| Conflict policy | Two devices may edit the same prospect | Use version checks and `409 Conflict`; no silent last-write-wins |
| Offline writes | Local-first behavior is a core strength but sync is complex | Phase 1 is online-first with a read cache; design an offline outbox later |
| Compliance | Notes and contact details may be personal data | Confirm retention, deletion, export, and processor requirements |
| Backup ownership | Managed backups alone retain only seven days | Use 90-day encrypted daily R2 exports, long-term weekly snapshots, and monthly restore tests |
| AI provider | Message and prospect data may leave the platform | Defer AI; later require an opt-in provider, redaction policy, and retention |
| Email/notifications | Browser notifications do not guarantee reliable mobile delivery | Decide whether transactional email/push is needed |
| Native iOS | PWA may be sufficient | Measure PWA usage before funding a wrapper/native app |
| Automated tests | None currently exist | Add migration, lifecycle, import, RLS, concurrency, and bundle-secret tests before cutover |
| Vendor lock-in | Supabase accelerates delivery but couples auth/data APIs | Keep repository interfaces and Edge Function contracts portable |

## 18. Phase 1 acceptance tests and Phase 0 exit criteria

Development should not begin until the following are confirmed:

- Organization/tenant boundary and workspace ownership.
- Required roles and workspace membership rules.
- Canonical prospect lifecycle and pipeline stage semantics.
- Database schema and tenant/RLS strategy.
- Backup retention, restore authority, and migration acceptance report.
- Online-first scope for the first production release; no offline writes.
- Budget owner and approved hosting provider.

Before Phase 1 is considered complete, automated or repeatable integration tests must prove:

- User A cannot access User B’s workspace.
- Owner can access all organization workspaces.
- Viewer cannot modify prospects.
- Operator cannot manage members.
- Invalid workspace IDs are rejected.
- Expired sessions are rejected.
- Migrations run successfully on a clean database.
- Audit events are created for protected mutations.
- Business changes and outbox events commit atomically.
- Stale `expected_version` updates return `409 Conflict`.
- Import manifests and import rows are recorded with validation errors.
- Secrets are absent from frontend bundles.
- Backup export and restore are encrypted, authorized, and verifiably restorable.

Once those decisions are approved, the next phase should be a thin vertical slice: Next.js authentication, organization/workspace membership, prospect read/write through Supabase CRUD and RLS, basic follow-up tasks, Edge Function JSON import, audit/outbox writes, and encrypted backup export. No AI, offline writes, complex automations, external messaging integration, or iOS-native work should begin before that slice is validated.
