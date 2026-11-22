-- Barbon CRM Phase 1 foundation.
-- Apply with Supabase migrations. This migration is additive and does not
-- touch the existing localStorage or seed data.

create extension if not exists pgcrypto;

create schema if not exists app;

create type public.org_role as enum ('owner', 'admin', 'manager', 'operator', 'viewer');
create type public.membership_status as enum ('active', 'invited', 'suspended');
create type public.audit_action as enum ('create', 'update', 'delete', 'restore', 'export', 'role_change');
create type public.outbox_status as enum ('pending', 'processing', 'completed', 'failed');

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.workspace_memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  workspace_id uuid references public.workspaces(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action public.audit_action not null,
  entity_type text not null,
  entity_id uuid,
  before_json jsonb,
  after_json jsonb,
  request_id uuid,
  created_at timestamptz not null default now()
);

create table public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  status public.outbox_status not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index organization_memberships_user_idx on public.organization_memberships(user_id, status);
create index workspace_memberships_user_idx on public.workspace_memberships(user_id, status);
create index workspaces_organization_idx on public.workspaces(organization_id) where archived_at is null;
create index audit_log_organization_created_idx on public.audit_log(organization_id, created_at desc);
create index outbox_pending_idx on public.outbox_events(status, available_at) where status in ('pending', 'failed');

-- Keep updated_at consistent without trusting clients to supply it.
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, app
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_profiles_touch_updated_at before update on public.user_profiles
for each row execute function app.touch_updated_at();
create trigger organizations_touch_updated_at before update on public.organizations
for each row execute function app.touch_updated_at();
create trigger organization_memberships_touch_updated_at before update on public.organization_memberships
for each row execute function app.touch_updated_at();
create trigger workspaces_touch_updated_at before update on public.workspaces
for each row execute function app.touch_updated_at();
create trigger workspace_memberships_touch_updated_at before update on public.workspace_memberships
for each row execute function app.touch_updated_at();

-- Foundation mutations always produce an audit record and a durable outbox
-- event in the same database transaction. Downstream workers may retry the
-- outbox event, but they cannot lose the fact that the mutation occurred.
create or replace function app.audit_and_enqueue_foundation_change()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
declare
  event_id uuid := gen_random_uuid();
  organization_id_value uuid;
  workspace_id_value uuid;
  entity_id_value uuid;
  before_value jsonb;
  after_value jsonb;
  action_value public.audit_action;
begin
  before_value := case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  after_value := case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  action_value := case TG_OP when 'INSERT' then 'create'::public.audit_action when 'UPDATE' then 'update'::public.audit_action else 'delete'::public.audit_action end;

  if TG_TABLE_NAME = 'organizations' then
    organization_id_value := coalesce(new.id, old.id);
    entity_id_value := organization_id_value;
  elsif TG_TABLE_NAME = 'organization_memberships' then
    organization_id_value := coalesce(new.organization_id, old.organization_id);
    entity_id_value := coalesce(new.user_id, old.user_id);
  elsif TG_TABLE_NAME = 'workspaces' then
    organization_id_value := coalesce(new.organization_id, old.organization_id);
    workspace_id_value := coalesce(new.id, old.id);
    entity_id_value := workspace_id_value;
  elsif TG_TABLE_NAME = 'workspace_memberships' then
    workspace_id_value := coalesce(new.workspace_id, old.workspace_id);
    select organization_id into organization_id_value from public.workspaces where id = workspace_id_value;
    entity_id_value := coalesce(new.user_id, old.user_id);
  else
    raise exception 'Unsupported foundation audit table: %', TG_TABLE_NAME;
  end if;

  insert into public.audit_log (id, organization_id, workspace_id, actor_user_id, action, entity_type, entity_id, before_json, after_json)
  values (event_id, organization_id_value, workspace_id_value, auth.uid(), action_value, TG_TABLE_NAME, entity_id_value, before_value, after_value);

  insert into public.outbox_events (organization_id, workspace_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key)
  values (organization_id_value, workspace_id_value, TG_TABLE_NAME, entity_id_value, 'foundation.' || lower(TG_OP), jsonb_build_object('audit_id', event_id, 'entity_id', entity_id_value), 'foundation:' || event_id);

  return coalesce(new, old);
end;
$$;

create trigger organizations_audit_and_outbox after insert or update or delete on public.organizations
for each row execute function app.audit_and_enqueue_foundation_change();
create trigger organization_memberships_audit_and_outbox after insert or update or delete on public.organization_memberships
for each row execute function app.audit_and_enqueue_foundation_change();
create trigger workspaces_audit_and_outbox after insert or update or delete on public.workspaces
for each row execute function app.audit_and_enqueue_foundation_change();
create trigger workspace_memberships_audit_and_outbox after insert or update or delete on public.workspace_memberships
for each row execute function app.audit_and_enqueue_foundation_change();

-- SECURITY DEFINER helpers avoid recursive RLS policy checks. They return only
-- authorization facts and never expose tenant data.
create or replace function app.org_role_for(target_org uuid, target_user uuid default auth.uid())
returns public.org_role
language sql
stable
security definer
set search_path = public, app
as $$
  select role
  from public.organization_memberships
  where organization_id = target_org
    and user_id = target_user
    and status = 'active'
  limit 1;
$$;

create or replace function app.can_access_org(target_org uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select app.org_role_for(target_org, target_user) is not null;
$$;

create or replace function app.can_admin_org(target_org uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select app.org_role_for(target_org, target_user) in ('owner', 'admin');
$$;

create or replace function app.can_access_workspace(target_workspace uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace
      and (
        app.org_role_for(w.organization_id, target_user) in ('owner', 'admin')
        or exists (
          select 1
          from public.workspace_memberships wm
          where wm.workspace_id = target_workspace
            and wm.user_id = target_user
            and wm.status = 'active'
        )
      )
  );
$$;

create or replace function app.can_manage_workspace(target_workspace uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace
      and (
        app.org_role_for(w.organization_id, target_user) in ('owner', 'admin')
        or exists (
          select 1
          from public.workspace_memberships wm
          where wm.workspace_id = target_workspace
            and wm.user_id = target_user
            and wm.status = 'active'
            and coalesce(wm.role, 'viewer') in ('manager')
        )
      )
  );
$$;

alter table public.user_profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.audit_log enable row level security;
alter table public.outbox_events enable row level security;

create policy user_profiles_select_self on public.user_profiles
for select to authenticated using (id = auth.uid());
create policy user_profiles_insert_self on public.user_profiles
for insert to authenticated with check (id = auth.uid());
create policy user_profiles_update_self on public.user_profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy organizations_select_member on public.organizations
for select to authenticated using (app.can_access_org(id));
create policy organizations_update_admin on public.organizations
for update to authenticated using (app.can_admin_org(id)) with check (app.can_admin_org(id));

create policy organization_memberships_select_member on public.organization_memberships
for select to authenticated using (app.can_access_org(organization_id));
create policy organization_memberships_manage_admin on public.organization_memberships
for all to authenticated using (app.can_admin_org(organization_id)) with check (app.can_admin_org(organization_id));

create policy workspaces_select_authorized on public.workspaces
for select to authenticated using (app.can_access_workspace(id));
create policy workspaces_manage_admin on public.workspaces
for all to authenticated using (app.can_admin_org(organization_id)) with check (app.can_admin_org(organization_id));

create policy workspace_memberships_select_authorized on public.workspace_memberships
for select to authenticated using (app.can_access_workspace(workspace_id));
create policy workspace_memberships_manage_admin on public.workspace_memberships
for all to authenticated using (
  exists (select 1 from public.workspaces w where w.id = workspace_id and app.can_admin_org(w.organization_id))
) with check (
  exists (select 1 from public.workspaces w where w.id = workspace_id and app.can_admin_org(w.organization_id))
);

create policy audit_log_select_authorized on public.audit_log
for select to authenticated using (
  (workspace_id is not null and app.can_access_workspace(workspace_id))
  or (workspace_id is null and app.can_access_org(organization_id))
);

-- Audit and outbox rows are written by trusted Edge Functions in the same
-- transaction as business changes. Direct browser inserts are intentionally
-- denied to prevent forged audit history and orphaned events.
create policy outbox_select_admin on public.outbox_events
for select to authenticated using (
  (workspace_id is not null and app.can_access_workspace(workspace_id))
  or (workspace_id is null and app.can_access_org(organization_id))
);

revoke all on schema app from public;
grant usage on schema app to authenticated;
grant execute on function app.org_role_for(uuid, uuid) to authenticated;
grant execute on function app.can_access_org(uuid, uuid) to authenticated;
grant execute on function app.can_admin_org(uuid, uuid) to authenticated;
grant execute on function app.can_access_workspace(uuid, uuid) to authenticated;
grant execute on function app.can_manage_workspace(uuid, uuid) to authenticated;
