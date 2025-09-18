import { MiddlewareHandler } from 'hono';

interface RateLimitOptions {
  limit: number;
  windowMs: number;
  keyGenerator?: (c: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

export const rateLimiter = (options: RateLimitOptions): MiddlewareHandler => {
  const {
    limit,
    windowMs,
    keyGenerator = (c) => {
      const ip = c.req.header('x-forwarded-for') || 
                 c.req.header('x-real-ip') || 
                 'unknown';
      return `${ip}:${c.req.path}`;
    },
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;
  
  // Clean up old buckets every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.lastRefill > windowMs * 2) {
        buckets.delete(key);
      }
    }
  }, 60000);
  
  return async (c, next) => {
    const key = keyGenerator(c);
    const now = Date.now();
    
    let bucket = buckets.get(key);
    
    if (!bucket) {
      bucket = {
        tokens: limit,
        lastRefill: now
      };
      buckets.set(key, bucket);
    } else {
      // Refill tokens based on time elapsed
      const timePassed = now - bucket.lastRefill;
      const tokensToAdd = Math.floor(timePassed / windowMs * limit);
      
      if (tokensToAdd > 0) {
        bucket.tokens = Math.min(limit, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
      }
    }
    
    // Check if request should be allowed
    if (bucket.tokens <= 0) {
      const retryAfter = Math.ceil(windowMs / 1000);
      c.header('X-RateLimit-Limit', limit.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
      c.header('Retry-After', retryAfter.toString());
      
      if (c.req.header('Accept')?.includes('application/json')) {
        return c.json({
          error: 'Too many requests',
          retryAfter
        }, 429);
      }
      
      return c.text('Too many requests. Please try again later.', 429);
    }
    
    // Consume a token
    bucket.tokens--;
    
    // Add rate limit headers
    c.header('X-RateLimit-Limit', limit.toString());
    c.header('X-RateLimit-Remaining', bucket.tokens.toString());
    c.header('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
    
    await next();
    
    // Optionally refund token based on response
    if ((skipSuccessfulRequests && c.res.status < 400) ||
        (skipFailedRequests && c.res.status >= 400)) {
      bucket.tokens = Math.min(limit, bucket.tokens + 1);
    }
  };
};