import { Elysia, t } from 'elysia';
import { AuthService } from '../../services/auth';
import { config } from '../../config';
import { csrfMiddleware, getCsrfToken } from '../../middleware/csrf';
import { authMiddleware } from '../../middleware/auth';

export const registrationsController = new Elysia({ prefix: '/registrations' })
  .use(csrfMiddleware)
  .use(authMiddleware)
  
  // GET /sign_up - Show sign up form
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
        <title>Sign Up - Passport</title>
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
              <div class="terminal-title">Create Account</div>
            </div>
            <div class="terminal-body">
              <form action="/registrations" method="POST" class="auth-form">
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
                    minlength="8"
                    class="form-input glass-input"
                    placeholder="At least 8 characters"
                  >
                  <p class="form-hint">Password must be at least 8 characters</p>
                </div>
                
                <div class="form-group">
                  <label for="password_confirmation" class="form-label">Confirm Password</label>
                  <input 
                    type="password" 
                    id="password_confirmation" 
                    name="password_confirmation" 
                    required
                    minlength="8"
                    class="form-input glass-input"
                    placeholder="Repeat your password"
                  >
                </div>
                
                <button type="submit" class="btn btn-primary glass-button">
                  Create Account
                </button>
              </form>
              
              <div class="auth-links">
                <a href="/sign_in" class="link">Already have an account? Sign in</a>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  })
  
  // POST /registrations - Create account
  .post(
    '/',
    async ({ body, set, cookie, request, html }) => {
      try {
        // Validate password confirmation
        if (body.password !== body.password_confirmation) {
          throw new Error('Passwords do not match');
        }
        
        const result = await AuthService.signUp(
          body.email,
          body.password
        );
        
        // Auto sign-in: Create session
        const sessionResult = await AuthService.signIn(
          body.email,
          body.password,
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          request.headers.get('user-agent') || undefined
        );
        
        // Set cookies
        set.cookie = {
          session_id: {
            value: sessionResult.session!.id,
            httpOnly: true,
            secure: config.isProduction,
            sameSite: 'lax',
            domain: config.cookieDomain,
            maxAge: 7 * 24 * 60 * 60, // 1 week
          },
          oh_session: {
            value: sessionResult.token!,
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
        // Show error
        set.status = 422;
        
        return html(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sign Up - Passport</title>
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
                  <div class="terminal-title">Sign Up Error</div>
                </div>
                <div class="terminal-body">
                  <div class="alert alert-error glass-alert">
                    ${error.message || 'Failed to create account'}
                  </div>
                  <a href="/sign_up" class="btn btn-secondary glass-button">Try Again</a>
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
        password_confirmation: t.String(),
        csrf_token: t.String(),
      }),
    }
  );