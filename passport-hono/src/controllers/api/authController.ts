import { Context } from 'hono';
import { authService } from '../../services/auth';
import { userService } from '../../services/users';
import { setCookie, deleteCookie } from 'hono/cookie';
import { config } from '../../config';

export const apiAuthController = {
  async signIn(c: Context) {
    try {
      const { email, password } = await c.req.json();
      
      if (!email || !password) {
        return c.json({ error: 'Email and password are required' }, 400);
      }
      
      const ipAddress = c.req.header('x-forwarded-for') || 
                       c.req.header('x-real-ip') || 
                       'unknown';
      const userAgent = c.req.header('user-agent') || 'unknown';
      
      const result = await authService.signInWithCredentials(
        email,
        password,
        ipAddress,
        userAgent
      );
      
      if (!result) {
        return c.json({ error: 'Invalid credentials' }, 401);
      }
      
      // Set cookies for SSO
      setCookie(c, 'oh_session', result.jwt, {
        httpOnly: true,
        secure: config.secureCookies,
        sameSite: 'Lax',
        domain: config.cookieDomain,
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });
      
      setCookie(c, 'session_id', result.session.id, {
        httpOnly: true,
        secure: config.secureCookies,
        sameSite: 'Lax',
        domain: config.cookieDomain,
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });
      
      return c.json({
        user: {
          id: result.user.id,
          email: result.user.email_address,
          role: result.user.role
        },
        token: result.jwt
      });
    } catch (error) {
      console.error('Sign in error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  },
  
  async verify(c: Context) {
    try {
      const { token } = await c.req.json();
      
      if (!token) {
        return c.json({ error: 'Token is required' }, 400);
      }
      
      const payload = authService.verifyJwt(token);
      
      if (!payload) {
        return c.json({ valid: false }, 200);
      }
      
      const user = await userService.findById(payload.userId);
      
      if (!user) {
        return c.json({ valid: false }, 200);
      }
      
      return c.json({
        valid: true,
        user: {
          id: user.id,
          email: user.email_address,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Verify error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  },
  
  async refresh(c: Context) {
    try {
      const { token } = await c.req.json();
      
      if (!token) {
        return c.json({ error: 'Token is required' }, 400);
      }
      
      const newToken = authService.refreshJwt(token);
      
      if (!newToken) {
        return c.json({ error: 'Invalid or expired token' }, 401);
      }
      
      // Update cookie
      setCookie(c, 'oh_session', newToken, {
        httpOnly: true,
        secure: config.secureCookies,
        sameSite: 'Lax',
        domain: config.cookieDomain,
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });
      
      return c.json({ token: newToken });
    } catch (error) {
      console.error('Refresh error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  },
  
  async signOut(c: Context) {
    try {
      const sessionId = c.get('sessionId');
      
      if (sessionId) {
        await authService.terminateSession(sessionId);
      }
      
      // Clear cookies
      deleteCookie(c, 'oh_session', {
        domain: config.cookieDomain,
        path: '/'
      });
      
      deleteCookie(c, 'session_id', {
        domain: config.cookieDomain,
        path: '/'
      });
      
      // Also try to clear old cookie names for compatibility
      deleteCookie(c, 'jwt_token', {
        domain: config.cookieDomain,
        path: '/'
      });
      
      deleteCookie(c, 'session_token', {
        domain: config.cookieDomain,
        path: '/'
      });
      
      return c.json({ message: 'Signed out successfully' });
    } catch (error) {
      console.error('Sign out error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  },
  
  async currentUser(c: Context) {
    try {
      const user = c.get('user');
      
      if (!user) {
        return c.json({ error: 'Not authenticated' }, 401);
      }
      
      return c.json({
        user: {
          id: user.id,
          email: user.email_address,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Current user error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }
};