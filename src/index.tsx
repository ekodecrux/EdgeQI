import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';

const app = new Hono();

// Serve all static assets (JS, CSS, fonts, images)
app.use('/assets/*', serveStatic({ root: './public' }));

// SPA fallback — all routes serve index.html
app.get('*', serveStatic({ path: './public/index.html' }));

export default app;
