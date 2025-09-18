import { Elysia, t } from 'elysia';
import { AuthService } from '../../services/auth';
import { config } from '../../config';
import { signInRateLimiter } from '../../middleware/rateLimit';
import { csrfMiddleware, getCsrfToken } from '../../middleware/csrf';
import { authMiddleware } from '../../middleware/auth';

export const sessionsController = new Elysia({ prefix: '/sessions' })
  .use(csrfMiddleware)
  .use(authMiddleware)
  
  // GET /sign_in - Show sign in form
  .get('/new', async ({ html, csrf, auth }) => {
    // Redirect if already authenticated
    if (auth?.isAuthenticated) {
      return Response.redirect('/dashboard', 302);
    }
    
    const csrfToken = getCsrfToken({ csrf } as any);
    
    return html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign In - Passport</title>
        <link href="/assets/styles.css" rel="stylesheet">
      </head>
      <body>
        <div class="terminal-page centered">
          <div class="terminal-window glass">
            <div class="terminal-header">
              <div class="terminal-controls">
                <span class="terminal-control close"></span>
                <span class="terminal-control minimize"></span>
                <span class="terminal-control maximize"></span>
              </div>
              <div class="terminal-title">Sign In</div>
            </div>
            <div class="terminal-body">
              <form action="/sessions" method="POST" class="auth-form">
                <input type="hidden" name="csrf_token" value="${csrfToken}">
                
                <div class="form-group">
                  <label for="email" class="form-label">Email</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    required 
                    autofocus
                    class="form-input glass-input"
                    placeholder="you@example.com"
                  >
                </div>
                
                <div class="form-group">
                  <label for="password" class="form-label">Password</label>
                  <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    required
                    class="form-input glass-input"
                    placeholder="••••••••"
                  >
                </div>
                
                <button type="submit" class="btn btn-primary glass-button">
                  Sign In
                </button>
              </form>
              
              <div class="auth-links">
                <a href="/sign_up" class="link">Don't have an account? Sign up</a>
                <a href="/password/new" class="link">Forgot password?</a>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  })
  
  // POST /sessions - Sign in
  .post(
    '/',
    async ({ body, set, cookie, request }) => {
      try {
        const result = await AuthService.signIn(
          body.email,
          body.password,
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          request.headers.get('user-agent') || undefined
        );
        
        // Set session cookie
        set.cookie = {
          session_id: {
            value: result.session!.id,
            httpOnly: true,
            secure: config.isProduction,
            sameSite: 'lax',
            domain: config.cookieDomain,
            maxAge: 7 * 24 * 60 * 60, // 1 week
          },
          oh_session: {
            value: result.token!,
            httpOnly: true,
            secure: config.isProduction,
            sameSite: 'lax',
            domain: config.cookieDomain,
            maxAge: 7 * 24 * 60 * 60, // 1 week
          },
        };
        
        // Redirect to dashboard
        set.redirect = '/dashboard';
        set.status = 302;
      } catch (error: any) {
        // Redirect back with error
        set.status = 422;
        
        return html(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sign In - Passport</title>
            <link href="/assets/styles.css" rel="stylesheet">
          </head>
          <body>
            <div class="terminal-page centered">
              <div class="terminal-window glass error">
                <div class="terminal-header">
                  <div class="terminal-controls">
                    <span class="terminal-control close"></span>
                    <span class="terminal-control minimize"></span>
                    <span class="terminal-control maximize"></span>
                  </div>
                  <div class="terminal-title">Sign In Error</div>
                </div>
                <div class="terminal-body">
                  <div class="alert alert-error glass-alert">
                    ${error.message || 'Invalid email or password'}
                  </div>
                  <a href="/sign_in" class="btn btn-secondary glass-button">Try Again</a>
                </div>
              </div>
            </div>
          </body>
          </html>
        `);
      }
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
        csrf_token: t.String(),
      }),
      beforeHandle: [signInRateLimiter],
    }
  )
  
  // DELETE /sign_out - Sign out
  .delete('/destroy', async ({ auth, cookie, set }) => {
    if (auth?.session) {
      await AuthService.signOut(auth.session.id);
    }
    
    // Clear cookies
    set.cookie = {
      session_id: {
        value: '',
        maxAge: 0,
      },
      oh_session: {
        value: '',
        maxAge: 0,
      },
    };
    
    // Redirect to home
    set.redirect = '/';
    set.status = 302;
  });