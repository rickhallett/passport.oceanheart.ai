import { Elysia, t } from 'elysia';
import { AuthService } from '../../services/auth';
import { authMiddleware, requireAuth } from '../../middleware/auth';
import { apiRateLimiter, signInRateLimiter } from '../../middleware/rateLimit';

export const apiAuthController = new Elysia({ prefix: '/api/auth' })
  .use(authMiddleware)
  .use(apiRateLimiter)
  
  // POST /api/auth/signin - Sign in and get JWT
  .post(
    '/signin',
    async ({ body, request, set }) => {
      try {
        const result = await AuthService.signIn(
          body.email,
          body.password,
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          request.headers.get('user-agent') || undefined
        );
        
        return {
          success: true,
          token: result.token,
          user: {
            id: result.user.id,
            email: result.user.email_address,
            role: result.user.role,
          },
        };
      } catch (error: any) {
        set.status = 401;
        return {
          success: false,
          error: 'Invalid credentials',
          message: error.message,
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 1 }),
      }),
      beforeHandle: [signInRateLimiter],
    }
  )
  
  // POST /api/auth/signup - Create account and get JWT
  .post(
    '/signup',
    async ({ body, set }) => {
      try {
        const result = await AuthService.signUp(
          body.email,
          body.password
        );
        
        return {
          success: true,
          token: result.token,
          user: {
            id: result.user.id,
            email: result.user.email_address,
            role: result.user.role,
          },
        };
      } catch (error: any) {
        set.status = 422;
        return {
          success: false,
          error: 'Registration failed',
          message: error.message,
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
      }),
    }
  )
  
  // POST /api/auth/verify - Verify JWT token
  .post(
    '/verify',
    async ({ body, set }) => {
      const user = await AuthService.getUserFromToken(body.token);
      
      if (!user) {
        set.status = 401;
        return {
          success: false,
          valid: false,
          error: 'Invalid or expired token',
        };
      }
      
      return {
        success: true,
        valid: true,
        user: {
          id: user.id,
          email: user.email_address,
          role: user.role,
        },
      };
    },
    {
      body: t.Object({
        token: t.String(),
      }),
    }
  )
  
  // POST /api/auth/refresh - Refresh JWT token (requires valid token)
  .use(requireAuth)
  .post(
    '/refresh',
    async ({ auth }) => {
      const { generateJwt } = await import('../../utils/jwt');
      const newToken = await generateJwt(auth!.user);
      
      return {
        success: true,
        token: newToken,
        user: {
          id: auth!.user.id,
          email: auth!.user.email_address,
          role: auth!.user.role,
        },
      };
    }
  )
  
  // DELETE /api/auth/signout - Sign out (invalidate session)
  .delete(
    '/signout',
    async ({ auth }) => {
      if (auth?.session) {
        await AuthService.signOut(auth.session.id);
      }
      
      return {
        success: true,
        message: 'Signed out successfully',
      };
    }
  )
  
  // GET /api/auth/user - Get current user
  .get(
    '/user',
    async ({ auth, set }) => {
      if (!auth?.isAuthenticated) {
        set.status = 401;
        return {
          success: false,
          error: 'Not authenticated',
        };
      }
      
      return {
        success: true,
        user: {
          id: auth.user.id,
          email: auth.user.email_address,
          role: auth.user.role,
          created_at: auth.user.created_at,
        },
      };
    }
  )
  
  // GET /api/auth/sessions - Get user's active sessions
  .get(
    '/sessions',
    async ({ auth, set }) => {
      if (!auth?.isAuthenticated) {
        set.status = 401;
        return {
          success: false,
          error: 'Not authenticated',
        };
      }
      
      const sessions = await AuthService.getUserSessions(auth.user.id);
      
      return {
        success: true,
        sessions: sessions.map(s => ({
          id: s.id,
          ip_address: s.ip_address,
          user_agent: s.user_agent,
          created_at: s.created_at,
        })),
      };
    }
  )
  
  // DELETE /api/auth/sessions/:id - Revoke a specific session
  .delete(
    '/sessions/:id',
    async ({ params, auth, set }) => {
      if (!auth?.isAuthenticated) {
        set.status = 401;
        return {
          success: false,
          error: 'Not authenticated',
        };
      }
      
      // Verify session belongs to user
      const sessions = await AuthService.getUserSessions(auth.user.id);
      const session = sessions.find(s => s.id === params.id);
      
      if (!session) {
        set.status = 404;
        return {
          success: false,
          error: 'Session not found',
        };
      }
      
      const deleted = await AuthService.signOut(params.id);
      
      return {
        success: deleted,
        message: deleted ? 'Session revoked' : 'Failed to revoke session',
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  
  // DELETE /api/auth/sessions - Revoke all sessions
  .delete(
    '/sessions',
    async ({ auth }) => {
      const count = await AuthService.signOutAll(auth!.user.id);
      
      return {
        success: true,
        message: `Revoked ${count} session(s)`,
        count,
      };
    }
  );