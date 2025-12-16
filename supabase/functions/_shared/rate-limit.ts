// Rate limiting utility for Supabase Edge Functions
// Uses a simple in-memory store with sliding window approach

interface RateLimitConfig {
  maxRequests: number;      // Maximum requests allowed
  windowMs: number;         // Time window in milliseconds
  keyPrefix?: string;       // Prefix for the key
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;          // Unix timestamp when the limit resets
}

// In-memory store for rate limiting (resets on function cold start)
// For production, use Redis or Supabase table for persistence
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limit check for edge functions
 * 
 * @param identifier - Unique identifier (e.g., user ID, IP, restaurant ID)
 * @param config - Rate limit configuration
 * @returns RateLimitResult with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { maxRequests, windowMs, keyPrefix = 'rl' } = config;
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();
  
  // Get existing rate limit data
  const existing = rateLimitStore.get(key);
  
  // If no existing record or window has passed, reset
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
    };
  }
  
  // Check if limit exceeded
  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }
  
  // Increment count
  existing.count++;
  rateLimitStore.set(key, existing);
  
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Create rate limit response for when limit is exceeded
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
  
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${retryAfter} seconds.`,
      retryAfter,
      resetAt: new Date(result.resetAt).toISOString(),
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetAt.toString(),
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}

/**
 * Add rate limit headers to successful response
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult,
  maxRequests: number
): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', maxRequests.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.resetAt.toString());
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ============================================
// PRESET CONFIGURATIONS
// ============================================

export const RATE_LIMITS = {
  // AI/Chat functions - expensive operations
  AI_CHAT: {
    maxRequests: 30,        // 30 requests
    windowMs: 60 * 1000,    // per minute
    keyPrefix: 'ai',
  },
  
  // WhatsApp sending - prevent spam
  WHATSAPP: {
    maxRequests: 100,       // 100 messages
    windowMs: 60 * 60 * 1000, // per hour
    keyPrefix: 'wa',
  },
  
  // General API endpoints
  STANDARD: {
    maxRequests: 100,       // 100 requests
    windowMs: 60 * 1000,    // per minute
    keyPrefix: 'std',
  },
  
  // Sensitive operations (auth, backups)
  SENSITIVE: {
    maxRequests: 10,        // 10 requests
    windowMs: 60 * 1000,    // per minute
    keyPrefix: 'sec',
  },
  
  // File uploads
  UPLOADS: {
    maxRequests: 20,        // 20 uploads
    windowMs: 60 * 60 * 1000, // per hour
    keyPrefix: 'upl',
  },
} as const;

/**
 * Helper to extract identifier from request
 */
export function getRequestIdentifier(
  req: Request,
  authHeader?: string | null
): string {
  // Try to get user ID from auth header
  if (authHeader) {
    // Extract user ID from JWT (simplified - in production, verify JWT)
    try {
      const parts = authHeader.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.sub) {
          return `user:${payload.sub}`;
        }
      }
    } catch {
      // Fall through to IP-based
    }
  }
  
  // Fall back to IP address
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip')
    || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Cleanup old entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitStore) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}
