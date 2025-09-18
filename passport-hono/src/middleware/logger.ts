import { MiddlewareHandler } from 'hono';
import { randomUUID } from 'crypto';

export const requestLogger = (): MiddlewareHandler => {
  return async (c, next) => {
    const start = Date.now();
    const requestId = randomUUID();
    
    // Attach request ID to context
    c.set('requestId', requestId);
    
    // Log request
    console.log(JSON.stringify({
      type: 'request',
      requestId,
      method: c.req.method,
      path: c.req.path,
      ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
      userAgent: c.req.header('user-agent'),
      timestamp: new Date().toISOString()
    }));
    
    await next();
    
    // Log response
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      type: 'response',
      requestId,
      status: c.res.status,
      duration,
      timestamp: new Date().toISOString()
    }));
  };
};