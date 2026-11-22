const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };

Deno.serve(async () => {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter((name) => !Deno.env.get(name));
  const ready = missing.length === 0;
  return new Response(JSON.stringify({ ready, checks: { environment: ready }, missing }), {
    status: ready ? 200 : 503,
    headers,
  });
});
