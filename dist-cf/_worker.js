// Cloudflare Worker — serves static SPA assets
// All requests served from the ASSETS binding (dist-cf/ folder)
// SPA routing: any path that doesn't match a file → /index.html
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Try exact asset match first
    try {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    } catch (_) {}

    // SPA fallback — serve index.html for all routes
    const indexRequest = new Request(new URL('/index.html', request.url).toString(), request);
    try {
      return await env.ASSETS.fetch(indexRequest);
    } catch (e) {
      return new Response('EdgeQI — Not Found', { status: 404 });
    }
  }
};
