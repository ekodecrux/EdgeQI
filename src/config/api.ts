/**
 * Central API base URL — reads from runtime window config first,
 * then falls back to build-time env, then empty string (same-origin).
 *
 * In production (Cloudflare Pages): index.html injects:
 *   <script>window.__API_BASE__ = "https://your-backend.up.railway.app"</script>
 * This lets us swap the backend URL without rebuilding the frontend bundle.
 */
declare const __API_BASE_BUILD__: string;

export const API_BASE: string =
  (typeof window !== 'undefined' && (window as any).__API_BASE__)
  ?? (typeof __API_BASE_BUILD__ !== 'undefined' ? __API_BASE_BUILD__ : '')
  ?? '';

/** Prepend backend base URL to a path. Path must start with '/'. */
export const apiUrl = (path: string): string => `${API_BASE}${path}`;
