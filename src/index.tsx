import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';

const app = new Hono();

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
    <link rel="stylesheet" href="/assets/index-COzJp7u4.css" />
  </head>
  <body>
    <div id="root"></div>
    <!-- API_BASE: Railway backend URL. Primary CF: https://edgeqi.parimi-prasad.workers.dev -->
    <script>window.__API_BASE__ = "https://web-production-db4b5.up.railway.app";</script>
    <script type="module" src="/assets/index-B51zXdpf.js"></script>
  </body>
</html>`;

// Serve all static assets (JS, CSS, fonts, images) from KV
app.use('/assets/*', serveStatic({ root: './public' }));

// SPA root + all routes — serve inline HTML (bypasses stale KV index.html)
app.get('*', (c) => {
  return c.html(INDEX_HTML);
});

export default app;
