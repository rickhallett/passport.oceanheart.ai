import { Elysia, Context } from 'elysia';
import { config } from '../config';

interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  keyGenerator?: (context: Context) => string;
  skipSuccessfulRequests?: boolean;
  message?: string;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * In-memory store for rate limiting
 * In production, consider using Redis for distributed rate limiting
 */
class RateLimitStore {
  private buckets: Map<string, TokenBucket> = new Map();
  private cleanupInterval: Timer;

  constructor() {
    // Clean up old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  get(key: string, windowMs: number, maxTokens: number): TokenBucket {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: maxTokens,
        lastRefill: now,
      };
      this.buckets.set(key, bucket);
    } else {
      // Refill tokens based on time elapsed
      const timeElapsed = now - bucket.lastRefill;
      const tokensToAdd = Math.floor(timeElapsed / windowMs) * maxTokens;
      
      if (tokensToAdd > 0) {
        bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
      }
    }

    return bucket;
  }

  consume(key: string, windowMs: number, maxTokens: number): boolean {
    const bucket = this.get(key, windowMs, maxTokens);
    
    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }
    
    return false;
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    const staleTime = 3600000; // 1 hour
    
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > staleTime) {
        this.buckets.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.buckets.clear();
  }
}

// Global store instance
const rateLimitStore = new RateLimitStore();

/**
 * Create a rate limiting middleware
 */
export function createRateLimiter(options: RateLimitConfig) {
  const {
    windowMs,
    maxAttempts,
    keyGenerator = (ctx) => ctx.request.headers.get('x-forwarded-for') || 
                           ctx.request.headers.get('x-real-ip') || 
                           'unknown',
    skipSuccessfulRequests = false,
    message = 'Too many requests, please try again later',
  } = options;

  return new Elysia({ name: 'rate-limiter' })
    .onBeforeHandle(({ request, set, ...context }: Context) => {
      const key = keyGenerator({ request, set, ...context } as Context);
      const rateLimitKey = `${request.method}:${request.url}:${key}`;
      
      const allowed = rateLimitStore.consume(rateLimitKey, windowMs, maxAttempts);
      
      if (!allowed) {
        set.status = 429;
        set.headers = {
          ...set.headers,
          'Retry-After': String(Math.ceil(windowMs / 1000)),
          'X-RateLimit-Limit': String(maxAttempts),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(new Date(Date.now() + windowMs).getTime()),
        };
        
        return {
          error: 'Too Many Requests',
          message,
          retryAfter: Math.ceil(windowMs / 1000),
        };
      }
      
      // Add rate limit headers
      const bucket = rateLimitStore.get(rateLimitKey, windowMs, maxAttempts);
      set.headers = {
        ...set.headers,
        'X-RateLimit-Limit': String(maxAttempts),
        'X-RateLimit-Remaining': String(bucket.tokens),
        'X-RateLimit-Reset': String(new Date(Date.now() + windowMs).getTime()),
      };
    })
    .onAfterHandle(({ request, set, ...context }: Context & { response: any }) => {
      // If configured, don't count successful requests
      if (skipSuccessfulRequests && set.status && set.status < 400) {
        const key = keyGenerator({ request, set, ...context } as Context);
        const rateLimitKey = `${request.method}:${request.url}:${key}`;
        
        // Refund the token for successful request
        const bucket = rateLimitStore.get(rateLimitKey, windowMs, maxAttempts);
        bucket.tokens = Math.min(maxAttempts, bucket.tokens + 1);
      }
    });
}

/**
 * Sign-in specific rate limiter
 */
export const signInRateLimiter = createRateLimiter({
  windowMs: config.rateLimitSigninWindowMs,
  maxAttempts: config.rateLimitSigninAttempts,
  keyGenerator: (ctx) => {
    // Rate limit by IP + email combination
    const ip = ctx.request.headers.get('x-forwarded-for') || 
               ctx.request.headers.get('x-real-ip') || 
               'unknown';
    const body = (ctx as any).body;
    const email = body?.email || 'unknown';
    return `signin:${ip}:${email}`;
  },
  skipSuccessfulRequests: true,
  message: 'Too many sign-in attempts. Please try again later.',
});

/**
 * General API rate limiter
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxAttempts: 60, // 60 requests per minute
  message: 'API rate limit exceeded. Please slow down your requests.',
});

/**
 * Strict rate limiter for sensitive operations
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 900000, // 15 minutes
  maxAttempts: 5, // 5 attempts per 15 minutes
  message: 'Too many attempts for this operation. Please try again later.',
});

// Cleanup on process exit
process.on('beforeExit', () => {
  rateLimitStore.destroy();
});