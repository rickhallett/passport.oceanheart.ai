import { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyJWT } from '../utils/jwt';
import { sessionRepository } from '../repositories/sessions';
import { userRepository } from '../repositories/users';
import type { User } from '../repositories/users';

declare module 'hono' {
  interface ContextVariableMap {
    user: User | null;
    sessionId: string | null;
    requestId: string;
  }
}

export const authExtractor = (): MiddlewareHandler => {
  return async (c, next) => {
    let user: User | null = null;
    let sessionId: string | null = null;
    
    // Check session cookie first
    const sessionCookie = getCookie(c, 'session_id');
    if (sessionCookie) {
      const session = await sessionRepository.findById(sessionCookie);
      if (session) {
        user = await userRepository.findById(session.user_id.toString());
        sessionId = session.id;
      }
    }
    
    // Check JWT cookie for SSO
    if (!user) {
      const jwtCookie = getCookie(c, 'oh_session');
      if (jwtCookie) {
        const payload = verifyJWT(jwtCookie);
        if (payload) {
          user = await userRepository.findById(payload.userId);
        }
      }
    }
    
    // Check Authorization header for API calls
    if (!user) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = verifyJWT(token);
        if (payload) {
          user = await userRepository.findById(payload.userId);
        }
      }
    }
    
    c.set('user', user);
    c.set('sessionId', sessionId);
    
    await next();
  };
};

export const requireAuth = (): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get('user');
    
    if (!user) {
      if (c.req.header('Accept')?.includes('application/json')) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      return c.redirect('/sign_in');
    }
    
    await next();
  };
};

export const requireAdmin = (): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get('user');
    
    if (!user || user.role !== 'admin') {
      if (c.req.header('Accept')?.includes('application/json')) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      return c.text('Forbidden', 403);
    }
    
    await next();
  };
};