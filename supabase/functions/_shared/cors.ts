// Shared CORS configuration for Supabase Edge Functions
// Supports regex-based origin matching to auto-allow Netlify/Cloudflare preview deploys

const ALLOWED_ORIGIN_PATTERNS = [
  // Production
  /^https:\/\/swadeshisolutions\.co\.in$/,
  // Cloudflare Pages — main + preview deploys (auto-allowed)
  /^https:\/\/[a-z0-9-]+\.swadeshisolutions\.pages\.dev$/,
  /^https:\/\/swadeshisolutions\.pages\.dev$/,
  // Netlify — branch deploys and deploy previews (auto-allowed)
  /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.netlify\.app$/,
  /^https:\/\/[a-z0-9-]+\.netlify\.app$/,
  // Local dev
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

/**
 * Get CORS headers for a request, matching origin against allowed patterns.
 * Unknown origins receive the production URL (strict) not their own origin.
 *
 * NOTE: For webhook-only endpoints (WhatsApp, Paytm), use WEBHOOK_CORS_HEADERS
 * instead — those receive server-to-server calls that don't need origin checks.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const isAllowed = ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://swadeshisolutions.co.in',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Vary': 'Origin', // Important: tells CDNs this response varies by origin
  };
}

/**
 * Wildcard CORS for webhook endpoints that receive server-to-server callbacks
 * (e.g., WhatsApp webhook, Paytm webhook). These come from external servers,
 * not from browsers, so origin checking doesn't apply.
 */
export const WEBHOOK_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
