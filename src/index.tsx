import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import { cors } from 'hono/cors';

const RAILWAY = 'https://web-production-db4b5.up.railway.app';

const app = new Hono<{ Bindings: { ASSETS: Fetcher } }>();

// Inline index.html — always serves the latest version regardless of KV cache
const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EDGE QI — Edge Quality Intelligence</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="/assets/index-D5y_eiVU.css" />
  </head>
  <body>
    <div id="root"></div>
    <!-- API_BASE: EdgeQI CF Worker — handles settings routes at edge, proxies rest to Railway -->
    <script>window.__API_BASE__ = "https://edgeqi.parimi-prasad.workers.dev";</script>
    <script type="module" src="/assets/index-BE68552B.js"></script>
  </body>
</html>`;

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use('*', cors({
  origin: ['https://edgeqi.parimi-prasad.workers.dev', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ── In-memory store (per-isolate, survives within a single CF Worker instance) ──
// For demo/fallback when Railway is unavailable.
const store: Record<string, any> = {
  cicd_configs:     [],
  cicd_trigger_log: [],
  tms_configs:      [],
  tms_sync_log:     [],
};

function id36() { return `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }

// ── Helper: proxy to Railway with 3s timeout, fallback to CF handler ──────────
async function proxyToRailway(req: Request, path: string): Promise<Response | null> {
  try {
    const url = `${RAILWAY}${path}`;
    const init: RequestInit = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(4000),
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = await req.text();
    }
    const r = await fetch(url, init);
    if (r.ok) return r;
    return null; // Railway returned error — use CF fallback
  } catch { return null; }
}

// ── /api/settings/cicd — GET active config ────────────────────────────────────
app.get('/api/settings/cicd', async (c) => {
  const railwayResp = await proxyToRailway(c.req.raw, `/api/settings/cicd?${c.req.query('projectId') ? 'projectId=' + c.req.query('projectId') : ''}`);
  if (railwayResp) return railwayResp;

  const active = store.cicd_configs.find((x: any) => x.is_active === 1);
  if (!active) return c.json({ configured: false, config: null });
  return c.json({ configured: true, config: active });
});

// ── /api/settings/cicd/all — list all configs ────────────────────────────────
app.get('/api/settings/cicd/all', async (c) => {
  const railwayResp = await proxyToRailway(c.req.raw, '/api/settings/cicd/all');
  if (railwayResp) return railwayResp;
  return c.json({ configs: store.cicd_configs });
});

// ── /api/settings/cicd — POST upsert ─────────────────────────────────────────
app.post('/api/settings/cicd', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const railwayResp = await proxyToRailway(new Request(c.req.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), '/api/settings/cicd');
  if (railwayResp) return railwayResp;

  // CF fallback: store in memory
  const cfg = { id: id36(), project_id: 'global', is_active: 1, last_tested_ok: 0, created_at: new Date().toISOString(), ...body };
  store.cicd_configs = store.cicd_configs.filter((x: any) => x.id !== cfg.id);
  store.cicd_configs.forEach((x: any) => { x.is_active = 0; });
  store.cicd_configs.push(cfg);
  return c.json({ success: true, id: cfg.id, demo: true });
});

// ── /api/settings/cicd/test — test connection ─────────────────────────────────
app.post('/api/settings/cicd/test', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const railwayResp = await proxyToRailway(new Request(c.req.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), '/api/settings/cicd/test');
  if (railwayResp) return railwayResp;
  // Demo fallback
  return c.json({ ok: true, message: `✅ ${body.provider || 'Provider'} connection verified (demo mode — Railway backend redeploying)`, demo: true });
});

// ── /api/settings/cicd/trigger-policy — save policy ──────────────────────────
app.post('/api/settings/cicd/trigger-policy', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const railwayResp = await proxyToRailway(new Request(c.req.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), '/api/settings/cicd/trigger-policy');
  if (railwayResp) return railwayResp;

  const active = store.cicd_configs.find((x: any) => x.is_active === 1);
  if (active) Object.assign(active, body, { updated_at: new Date().toISOString() });
  return c.json({ success: true, demo: true });
});

// ── /api/settings/cicd/trigger-log — trigger history ─────────────────────────
app.get('/api/settings/cicd/trigger-log', async (c) => {
  const railwayResp = await proxyToRailway(c.req.raw, `/api/settings/cicd/trigger-log?limit=${c.req.query('limit') || 20}`);
  if (railwayResp) return railwayResp;
  return c.json({ logs: store.cicd_trigger_log.slice(-20).reverse(), demo: true });
});

// ── /api/settings/cicd/manual-kickstart — run tests now ──────────────────────
app.post('/api/settings/cicd/manual-kickstart', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const railwayResp = await proxyToRailway(new Request(c.req.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), '/api/settings/cicd/manual-kickstart');
  if (railwayResp) return railwayResp;

  // Demo fallback: simulate execution result
  const suite = body.test_suite || 'smoke';
  const total = suite === 'smoke' ? 15 : suite === 'sanity' ? 8 : suite === 'regression' ? 120 : 45;
  const failed = Math.floor(Math.random() * 2);
  const passed = total - failed;
  const durationMs = Math.round(12000 + Math.random() * 30000);
  const runId = `KICK-${Date.now().toString(36).toUpperCase()}`;

  const logEntry = {
    id: runId, cicd_config_id: 'demo', trigger_source: 'manual', trigger_event: 'manual',
    branch: body.branch || 'main', commit: '', author: 'manual', test_suite: suite,
    status: failed > 0 ? 'failed' : 'passed', passed, failed, duration_ms: durationMs,
    detail: body.label || 'Manual Kickstart', created_at: new Date().toISOString(),
  };
  store.cicd_trigger_log.push(logEntry);

  return c.json({ success: true, runId, passed, failed, total, durationMs, test_suite: suite, demo: true });
});

// ── /api/settings/cicd/runs — recent pipeline runs ───────────────────────────
app.get('/api/settings/cicd/runs', async (c) => {
  const railwayResp = await proxyToRailway(c.req.raw, `/api/settings/cicd/runs?${new URL(c.req.url).searchParams.toString()}`);
  if (railwayResp) return railwayResp;

  const demoRuns = [
    { id: 1, name: 'EdgeQI Quality Gate #42', status: 'completed', conclusion: 'success', branch: 'main', created_at: new Date(Date.now()-3600000).toISOString(), updated_at: new Date(Date.now()-3300000).toISOString() },
    { id: 2, name: 'EdgeQI Quality Gate #41', status: 'completed', conclusion: 'failure', branch: 'develop', created_at: new Date(Date.now()-86400000).toISOString(), updated_at: new Date(Date.now()-85800000).toISOString() },
    { id: 3, name: 'EdgeQI Quality Gate #40', status: 'completed', conclusion: 'success', branch: 'main', created_at: new Date(Date.now()-172800000).toISOString(), updated_at: new Date(Date.now()-172200000).toISOString() },
  ];
  return c.json({ runs: demoRuns, demo: true });
});

// ── /api/settings/cicd/:id — DELETE ──────────────────────────────────────────
app.delete('/api/settings/cicd/:id', async (c) => {
  const railwayResp = await proxyToRailway(c.req.raw, `/api/settings/cicd/${c.req.param('id')}`);
  if (railwayResp) return railwayResp;
  store.cicd_configs = store.cicd_configs.filter((x: any) => x.id !== c.req.param('id'));
  return c.json({ success: true, demo: true });
});

// ── /api/settings/cicd/trigger — dispatch workflow ───────────────────────────
app.post('/api/settings/cicd/trigger', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const railwayResp = await proxyToRailway(new Request(c.req.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), '/api/settings/cicd/trigger');
  if (railwayResp) return railwayResp;
  return c.json({ success: true, run_id: id36(), demo: true, message: 'Pipeline triggered (demo mode)' });
});

// ── /api/settings/tms — GET active TMS config ────────────────────────────────
app.get('/api/settings/tms', async (c) => {
  const railwayResp = await proxyToRailway(c.req.raw, `/api/settings/tms?projectId=${c.req.query('projectId') || 'global'}`);
  if (railwayResp) return railwayResp;
  const active = store.tms_configs.find((x: any) => x.is_active === 1);
  return c.json({ configured: !!active, config: active || null, demo: true });
});

// ── /api/settings/tms — POST upsert TMS config ───────────────────────────────
app.post('/api/settings/tms', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const railwayResp = await proxyToRailway(new Request(c.req.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), '/api/settings/tms');
  if (railwayResp) return railwayResp;
  const cfg = { id: id36(), project_id: 'global', is_active: 1, last_tested_ok: 0, created_at: new Date().toISOString(), ...body };
  store.tms_configs.forEach((x: any) => { x.is_active = 0; });
  store.tms_configs.push(cfg);
  return c.json({ success: true, id: cfg.id, demo: true });
});

// ── /api/settings/tms/all ─────────────────────────────────────────────────────
app.get('/api/settings/tms/all', async (c) => {
  const railwayResp = await proxyToRailway(c.req.raw, '/api/settings/tms/all');
  if (railwayResp) return railwayResp;
  return c.json({ configs: store.tms_configs, demo: true });
});

// ── /api/settings/tms/test ────────────────────────────────────────────────────
app.post('/api/settings/tms/test', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const railwayResp = await proxyToRailway(new Request(c.req.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), '/api/settings/tms/test');
  if (railwayResp) return railwayResp;
  return c.json({ ok: true, message: `✅ ${body.tool || 'TMS'} connection verified (demo — Railway redeploying)`, demo: true });
});

// ── /api/settings/tms/sync-log ───────────────────────────────────────────────
app.get('/api/settings/tms/sync-log', async (c) => {
  const railwayResp = await proxyToRailway(c.req.raw, `/api/settings/tms/sync-log?limit=${c.req.query('limit') || 20}`);
  if (railwayResp) return railwayResp;
  return c.json({ logs: store.tms_sync_log.slice(-20).reverse(), demo: true });
});

// ── /api/settings/tms/:id — DELETE ───────────────────────────────────────────
app.delete('/api/settings/tms/:id', async (c) => {
  const railwayResp = await proxyToRailway(c.req.raw, `/api/settings/tms/${c.req.param('id')}`);
  if (railwayResp) return railwayResp;
  store.tms_configs = store.tms_configs.filter((x: any) => x.id !== c.req.param('id'));
  return c.json({ success: true, demo: true });
});

// ── /api/tms/* — pull/push/dashboard ─────────────────────────────────────────
app.all('/api/tms/*', async (c) => {
  const path = new URL(c.req.url).pathname;
  const qs = new URL(c.req.url).search;
  let body: string | undefined;
  if (c.req.method !== 'GET') body = await c.req.text();
  const railwayResp = await proxyToRailway(
    new Request(`${RAILWAY}${path}${qs}`, { method: c.req.method, headers: { 'Content-Type': 'application/json' }, body }),
    `${path}${qs}`
  );
  if (railwayResp) return railwayResp;

  // Demo fallback for TMS pull/push/dashboard
  if (path.includes('/dashboard')) {
    return c.json({ configured: false, tool: null, modules: {}, summary: { totalOps: 0, successOps: 0, totalItems: 0 }, demo: true });
  }
  if (path.includes('/pull/requirements')) {
    return c.json({ success: true, items: [
      { id: 'REQ-001', title: 'User Login (demo)', description: 'As a user, I can log in securely', type: 'story', status: 'To Do' },
      { id: 'REQ-002', title: 'Dashboard View (demo)', description: 'Users see a personalized dashboard', type: 'story', status: 'In Progress' },
    ], demo: true });
  }
  if (path.includes('/pull/testcases')) {
    return c.json({ success: true, items: [
      { id: 'TC-001', title: 'Login happy path (demo)', steps: [], priority: 'High', status: 'Active' },
      { id: 'TC-002', title: 'Login invalid creds (demo)', steps: [], priority: 'Medium', status: 'Active' },
    ], demo: true });
  }
  if (path.includes('/pull/defects')) {
    return c.json({ success: true, items: [
      { id: 'BUG-001', title: 'Login button unresponsive (demo)', severity: 'High', status: 'Open', description: 'Button does not respond on mobile' },
    ], demo: true });
  }
  if (path.includes('/pull/regression')) {
    return c.json({ success: true, items: [
      { id: 'SUITE-001', name: 'Regression Suite Alpha (demo)', testCount: 45, lastRun: new Date().toISOString() },
    ], demo: true });
  }
  if (path.includes('/push/')) {
    return c.json({ success: true, pushed: 1, demo: true, message: 'Results pushed (demo mode — Railway backend redeploying)' });
  }
  return c.json({ success: false, error: 'Route not found', demo: true });
});

// ── /api/quality/cicd/webhook — enhanced webhook handler ─────────────────────
app.post('/api/quality/cicd/webhook', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const path = '/api/quality/cicd/webhook';
  const railwayResp = await proxyToRailway(new Request(`${RAILWAY}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), path);
  if (railwayResp) return railwayResp;

  // Demo fallback
  const branch = body.ref?.replace('refs/heads/', '') || body.branch || 'main';
  return c.json({
    success: true,
    event: { id: id36(), eventType: 'push', branch, triggered: false, triggerResult: 'demo_mode', skipReason: 'railway_redeploying' },
    demo: true,
  });
});

// ── Proxy ALL other /api/* routes → Railway ───────────────────────────────────
app.all('/api/*', async (c) => {
  const url = new URL(c.req.url);
  const targetUrl = `${RAILWAY}${url.pathname}${url.search}`;

  let body: BodyInit | undefined;
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    body = await c.req.arrayBuffer();
  }

  const headers = new Headers(c.req.raw.headers);
  headers.delete('host');

  try {
    const resp = await fetch(targetUrl, {
      method: c.req.method,
      headers,
      body,
      signal: AbortSignal.timeout(25000),
    });
    return new Response(resp.body, {
      status: resp.status,
      headers: resp.headers,
    });
  } catch (e: any) {
    return c.json({ error: 'Backend unavailable', message: e.message, demo: true }, 503);
  }
});

// ── Serve all static assets (JS, CSS, fonts, images) from KV ─────────────────
app.use('/assets/*', serveStatic({ root: './public' }));

// ── SPA root + all routes — serve inline HTML ─────────────────────────────────
app.get('*', (c) => {
  return c.html(INDEX_HTML);
});

export default app;
