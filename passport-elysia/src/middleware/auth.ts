import { Elysia, Context } from 'elysia';
import { AuthService } from '../services/auth';
import { extractTokenFromHeader } from '../utils/jwt';
import type { User } from '../repositories/users';
import type { Session } from '../repositories/sessions';

export interface AuthContext {
  auth?: {
    user: User;
    session?: Session;
    isAuthenticated: boolean;
    isAdmin: boolean;
  };
}

/**
 * Authentication middleware that checks for session cookie or JWT token
 */
export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .derive(async ({ request, cookie }): Promise<AuthContext> => {
    let user: User | null = null;
    let session: Session | null = null;
    
    // Check for session cookie first (web auth)
    const sessionId = cookie?.session_id?.value;
    if (sessionId) {
      const sessionData = await AuthService.validateSession(sessionId);
      if (sessionData) {
        user = sessionData.user;
        session = sessionData.session;
      }
    }
    
    // Check for JWT token in cookie or header (API auth)
    if (!user) {
      // Check cookie first
      const jwtFromCookie = cookie?.oh_session?.value;
      if (jwtFromCookie) {
        user = await AuthService.getUserFromToken(jwtFromCookie);
      }
      
      // Check Authorization header
      if (!user) {
        const authHeader = request.headers.get('authorization');
        const token = extractTokenFromHeader(authHeader || undefined);
        if (token) {
          user = await AuthService.getUserFromToken(token);
        }
      }
    }
    
    // Return auth context
    if (user) {
      return {
        auth: {
          user,
          session: session || undefined,
          isAuthenticated: true,
          isAdmin: user.role === 'admin',
        },
      };
    }
    
    return {
      auth: undefined,
    };
  });

/**
 * Guard middleware that requires authentication
 */
export const requireAuth = new Elysia({ name: 'require-auth' })
  .use(authMiddleware)
  .onBeforeHandle(({ auth, set }: Context & AuthContext) => {
    if (!auth?.isAuthenticated) {
      set.status = 401;
      return {
        error: 'Unauthorized',
        message: 'Authentication required',
      };
    }
  });

/**
 * Guard middleware that requires admin role
 */
export const requireAdmin = new Elysia({ name: 'require-admin' })
  .use(authMiddleware)
  .onBeforeHandle(({ auth, set }: Context & AuthContext) => {
    if (!auth?.isAuthenticated) {
      set.status = 401;
      return {
        error: 'Unauthorized',
        message: 'Authentication required',
      };
    }
    
    if (!auth.isAdmin) {
      set.status = 403;
      return {
        error: 'Forbidden',
        message: 'Admin access required',
      };
    }
  });

/**
 * Helper to get current user from context
 */
export function getCurrentUser(context: Context & AuthContext): User | null {
  return context.auth?.user || null;
}

/**
 * Helper to check if user is authenticated
 */
export function isAuthenticated(context: Context & AuthContext): boolean {
  return context.auth?.isAuthenticated || false;
}

/**
 * Helper to check if user is admin
 */
export function isAdmin(context: Context & AuthContext): boolean {
  return context.auth?.isAdmin || false;
}