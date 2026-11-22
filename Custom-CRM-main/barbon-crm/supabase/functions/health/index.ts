const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };

Deno.serve(() => new Response(JSON.stringify({ ok: true, service: 'barbon-crm-edge', timestamp: new Date().toISOString() }), { headers }));
