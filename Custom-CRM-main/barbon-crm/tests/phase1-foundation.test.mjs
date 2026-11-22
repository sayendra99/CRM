import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/0001_phase1_foundation.sql'), 'utf8');
const roadmap = fs.readFileSync(path.join(root, 'Rebuild_ROADMAP.md'), 'utf8');
const webPackage = JSON.parse(fs.readFileSync(path.join(root, 'web/package.json'), 'utf8'));

test('foundation migration contains tenant and security primitives', () => {
  for (const name of ['user_profiles', 'organizations', 'organization_memberships', 'workspaces', 'workspace_memberships', 'audit_log', 'outbox_events']) {
    assert.match(migration, new RegExp(`create table public\\.${name}\\b`));
  }
  for (const policy of ['user_profiles_select_self', 'organizations_select_member', 'workspace_memberships_manage_admin', 'audit_log_select_authorized']) {
    assert.match(migration, new RegExp(`create policy ${policy}\\b`));
  }
  assert.match(migration, /enable row level security/);
  assert.match(migration, /audit_and_enqueue_foundation_change/);
  assert.match(migration, /insert into public\.audit_log[\s\S]*insert into public\.outbox_events/);
});

test('frontend boundary is static export and has no service-role client secret', () => {
  const nextConfig = fs.readFileSync(path.join(root, 'web/next.config.mjs'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'web/lib/supabase.ts'), 'utf8');
  assert.match(nextConfig, /output:\s*'export'/);
  assert.doesNotMatch(client, /SERVICE_ROLE|service_role/i);
  assert.ok(webPackage.dependencies.next);
  assert.ok(webPackage.dependencies['@supabase/supabase-js']);
});

test('roadmap records the Phase 1 security acceptance contract', () => {
  for (const requirement of [
    'Owner can access all organization workspaces.',
    'Invalid workspace IDs are rejected.',
    'Expired sessions are rejected.',
    'Business changes and outbox events commit atomically.',
    'Stale updates return HTTP 409 Conflict.',
    'No secrets appear in frontend bundles.',
  ]) assert.match(roadmap, new RegExp(requirement.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')));
});
