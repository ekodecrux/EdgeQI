// Cloudflare Worker — serves the IQStudio React SPA
// All API calls are proxied to the Railway backend via window.__API_BASE__
// which is injected into index.html at request time.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Serve assets directly from the Workers static asset binding
    try {
      // For API routes that somehow hit here, return a helpful error
      if (path.startsWith('/api/')) {
        return new Response(JSON.stringify({
          error: 'API not available on CDN edge. Configure VITE_API_URL to point to your backend.',
          hint: 'Set window.__API_BASE__ in your deployment environment variables.'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // All other routes → serve index.html (SPA routing)
      const asset = await env.ASSETS.fetch(request);
      if (asset.status === 404 && !path.includes('.')) {
        // SPA fallback: non-asset paths → index.html
        const indexReq = new Request(new URL('/index.html', request.url), request);
        const indexAsset = await env.ASSETS.fetch(indexReq);
        return new Response(indexAsset.body, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache'
          }
        });
      }
      return asset;
    } catch (e) {
      return new Response('Not found', { status: 404 });
    }
  }
};
