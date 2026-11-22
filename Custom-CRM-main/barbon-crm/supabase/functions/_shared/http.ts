export const jsonHeaders = {
  'content-type': 'application/json',
  'cache-control': 'no-store',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

export function requireMethod(request: Request, method: string): Response | null {
  return request.method === method ? null : json({ error: 'method_not_allowed' }, 405);
}

export function requireSecret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required function secret: ${name}`);
  return value;
}
