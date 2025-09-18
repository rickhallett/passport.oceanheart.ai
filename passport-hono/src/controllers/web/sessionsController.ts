import { Context } from 'hono';
import { authService } from '../../services/auth';
import { setCookie, deleteCookie } from 'hono/cookie';
import { config } from '../../config';

export const sessionsController = {
  async new(c: Context) {
    const user = c.get('user');
    if (user) {
      return c.redirect('/');
    }
    
    const csrfToken = c.get('csrfToken');
    
    // Render sign in page
    return c.html(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Sign In - Passport</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="/assets/application.css" rel="stylesheet">
        </head>
        <body>
          <div class="min-h-screen bg-gradient-to-br from-gray-900 to-black">
            <div class="container mx-auto px-4 py-16">
              <div class="max-w-md mx-auto">
                <div class="glass-panel p-8">
                  <h1 class="text-2xl font-bold text-white mb-6">Sign In</h1>
                  <form method="POST" action="/sign_in">
                    <input type="hidden" name="_csrf" value="${csrfToken || ''}">
                    <div class="mb-4">
                      <label for="email" class="block text-gray-300 mb-2">Email</label>
                      <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        required
                        class="w-full px-4 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                    </div>
                    <div class="mb-6">
                      <label for="password" class="block text-gray-300 mb-2">Password</label>
                      <input 
                        type="password" 
                        id="password" 
                        name="password" 
                        required
                        class="w-full px-4 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                    </div>
                    <button 
                      type="submit"
                      class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Sign In
                    </button>
                  </form>
                  <p class="mt-4 text-center text-gray-400">
                    Don't have an account? 
                    <a href="/sign_up" class="text-blue-400 hover:text-blue-300">Sign up</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>`
    );
  },
  
  async create(c: Context) {
    try {
      const formData = await c.req.parseBody();
      const email = formData.email as string;
      const password = formData.password as string;
      
      if (!email || !password) {
        // Return to sign in with error
        return c.redirect('/sign_in?error=missing_fields');
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
        return c.redirect('/sign_in?error=invalid_credentials');
      }
      
      // Set cookies
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
      
      return c.redirect('/');
    } catch (error) {
      console.error('Sign in error:', error);
      return c.redirect('/sign_in?error=server_error');
    }
  },
  
  async destroy(c: Context) {
    try {
      const sessionId = c.get('sessionId');
      
      if (sessionId) {
        await authService.terminateSession(sessionId);
      }
      
      // Clear all cookies
      deleteCookie(c, 'oh_session', {
        domain: config.cookieDomain,
        path: '/'
      });
      
      deleteCookie(c, 'session_id', {
        domain: config.cookieDomain,
        path: '/'
      });
      
      deleteCookie(c, 'jwt_token', {
        domain: config.cookieDomain,
        path: '/'
      });
      
      deleteCookie(c, 'session_token', {
        domain: config.cookieDomain,
        path: '/'
      });
      
      return c.redirect('/sign_in');
    } catch (error) {
      console.error('Sign out error:', error);
      return c.redirect('/');
    }
  }
};