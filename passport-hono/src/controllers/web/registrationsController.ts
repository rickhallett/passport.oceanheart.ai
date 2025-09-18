import { Context } from 'hono';
import { userService } from '../../services/users';
import { authService } from '../../services/auth';
import { setCookie } from 'hono/cookie';
import { config } from '../../config';

export const registrationsController = {
  async new(c: Context) {
    const user = c.get('user');
    if (user) {
      return c.redirect('/');
    }
    
    const csrfToken = c.get('csrfToken');
    
    // Render sign up page
    return c.html(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Sign Up - Passport</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="/assets/application.css" rel="stylesheet">
        </head>
        <body>
          <div class="min-h-screen bg-gradient-to-br from-gray-900 to-black">
            <div class="container mx-auto px-4 py-16">
              <div class="max-w-md mx-auto">
                <div class="glass-panel p-8">
                  <h1 class="text-2xl font-bold text-white mb-6">Create Account</h1>
                  <form method="POST" action="/sign_up">
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
                    <div class="mb-4">
                      <label for="password" class="block text-gray-300 mb-2">Password</label>
                      <input 
                        type="password" 
                        id="password" 
                        name="password" 
                        required
                        minlength="8"
                        class="w-full px-4 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                      <p class="text-sm text-gray-400 mt-1">Must be at least 8 characters</p>
                    </div>
                    <div class="mb-6">
                      <label for="password_confirmation" class="block text-gray-300 mb-2">Confirm Password</label>
                      <input 
                        type="password" 
                        id="password_confirmation" 
                        name="password_confirmation" 
                        required
                        minlength="8"
                        class="w-full px-4 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                    </div>
                    <button 
                      type="submit"
                      class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Sign Up
                    </button>
                  </form>
                  <p class="mt-4 text-center text-gray-400">
                    Already have an account? 
                    <a href="/sign_in" class="text-blue-400 hover:text-blue-300">Sign in</a>
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
      const passwordConfirmation = formData.password_confirmation as string;
      
      if (!email || !password || !passwordConfirmation) {
        return c.redirect('/sign_up?error=missing_fields');
      }
      
      if (password !== passwordConfirmation) {
        return c.redirect('/sign_up?error=password_mismatch');
      }
      
      if (password.length < 8) {
        return c.redirect('/sign_up?error=password_too_short');
      }
      
      // Create user
      const user = await userService.createUser({
        email,
        password
      });
      
      // Auto sign in
      const ipAddress = c.req.header('x-forwarded-for') || 
                       c.req.header('x-real-ip') || 
                       'unknown';
      const userAgent = c.req.header('user-agent') || 'unknown';
      
      const result = await authService.startSession(
        user.id.toString(),
        ipAddress,
        userAgent
      );
      
      if (!result) {
        return c.redirect('/sign_in');
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
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      if (error.message?.includes('already exists')) {
        return c.redirect('/sign_up?error=email_taken');
      }
      
      return c.redirect('/sign_up?error=server_error');
    }
  }
};