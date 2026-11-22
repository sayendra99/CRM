import { json, requireMethod, requireSecret } from '../_shared/http.ts';

type BackupPayload = { organizationId: string; schemaVersion: number; payload: unknown };

async function encrypt(value: string, secret: string): Promise<string> {
  const keyBytes = new TextEncoder().encode(secret.padEnd(32, '0').slice(0, 32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value));
  const joined = new Uint8Array(iv.length + cipher.byteLength);
  joined.set(iv);
  joined.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...joined));
}

async function decrypt(encoded: string, secret: string): Promise<string> {
  const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  const keyBytes = new TextEncoder().encode(secret.padEnd(32, '0').slice(0, 32));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  return new TextDecoder().decode(plain);
}

Deno.serve(async (request) => {
  const methodError = requireMethod(request, 'POST');
  if (methodError) return methodError;
  try {
    const secret = requireSecret('BACKUP_ENCRYPTION_KEY');
    const payload = await request.json() as BackupPayload;
    if (!payload.organizationId || !Number.isInteger(payload.schemaVersion)) return json({ error: 'invalid_payload' }, 400);
    const source = JSON.stringify(payload);
    const encrypted = await encrypt(source, secret);
    const restored = JSON.parse(await decrypt(encrypted, secret)) as BackupPayload;
    return json({ ok: true, encryptedBytes: encrypted.length, restoredSchemaVersion: restored.schemaVersion, organizationId: restored.organizationId });
  } catch (error) {
    console.error('backup smoke test failed', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'backup_smoke_test_failed' }, 500);
  }
});
