#!/usr/bin/env bun
import { Elysia } from 'elysia';
import { html } from '@elysiajs/html';
import { cookie } from '@elysiajs/cookie';
import { staticPlugin } from '@elysiajs/static';
import { cors } from '@elysiajs/cors';

import { config } from './config';
import { testConnection, closeConnection } from './db';
import { jwtHandler } from './utils/jwt';

// Middleware
import { authMiddleware, requireAuth, requireAdmin } from './middleware/auth';
import { csrfMiddleware } from './middleware/csrf';
import { apiRateLimiter } from './middleware/rateLimit';

// Controllers
import { sessionsController } from './controllers/web/sessions';
import { registrationsController } from './controllers/web/registrations';
import { apiAuthController } from './controllers/api/auth';

// Create main app
const app = new Elysia()
  // Global plugins
  .use(html())
  .use(cookie())
  .use(jwtHandler)
  .use(
    cors({
      origin: (request) => {
        const origin = request.headers.get('origin');
        // Allow all *.oceanheart.ai domains
        if (origin && origin.match(/^https?:\/\/([a-z0-9-]+\.)?oceanheart\.ai$/)) {
          return origin;
        }
        // Allow localhost in development
        if (config.isDevelopment && origin?.includes('localhost')) {
          return origin;
        }
        return false;
      },
      credentials: true,
    })
  )
  
  // Static files
  .use(staticPlugin({
    assets: './public/assets',
    prefix: '/assets',
  }))
  
  // Global middleware
  .use(authMiddleware)
  
  // Health check endpoint
  .get('/up', async () => {
    const dbConnected = await testConnection();
    return {
      status: 'ok',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  })
  
  // Home page
  .get('/', async ({ html, auth }) => {
    return html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Passport - Oceanheart Authentication</title>
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
              <div class="terminal-title">Passport.oceanheart.ai</div>
            </div>
            <div class="terminal-body">
              <h1 class="terminal-heading">Welcome to Passport</h1>
              <p class="terminal-text">Secure authentication for the Oceanheart ecosystem</p>
              
              ${auth?.isAuthenticated 
                ? `
                  <div class="auth-status">
                    <p>Signed in as: <strong>${auth.user.email_address}</strong></p>
                    <div class="button-group">
                      <a href="/dashboard" class="btn btn-primary glass-button">Dashboard</a>
                      <form action="/sign_out" method="POST" style="display: inline;">
                        <input type="hidden" name="_method" value="DELETE">
                        <button type="submit" class="btn btn-secondary glass-button">Sign Out</button>
                      </form>
                    </div>
                  </div>
                `
                : `
                  <div class="button-group">
                    <a href="/sign_in" class="btn btn-primary glass-button">Sign In</a>
                    <a href="/sign_up" class="btn btn-secondary glass-button">Sign Up</a>
                  </div>
                `
              }
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  })
  
  // Dashboard (protected)
  .use(requireAuth)
  .get('/dashboard', async ({ html, auth }) => {
    return html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard - Passport</title>
        <link href="/assets/styles.css" rel="stylesheet">
      </head>
      <body>
        <div class="terminal-page">
          <div class="terminal-window glass">
            <div class="terminal-header">
              <div class="terminal-controls">
                <span class="terminal-control close"></span>
                <span class="terminal-control minimize"></span>
                <span class="terminal-control maximize"></span>
              </div>
              <div class="terminal-title">Dashboard</div>
            </div>
            <div class="terminal-body">
              <h1 class="terminal-heading">User Dashboard</h1>
              
              <div class="info-section glass-card">
                <h2>Account Information</h2>
                <dl>
                  <dt>Email:</dt>
                  <dd>${auth!.user.email_address}</dd>
                  
                  <dt>Role:</dt>
                  <dd>${auth!.user.role}</dd>
                  
                  <dt>Account Created:</dt>
                  <dd>${new Date(auth!.user.created_at).toLocaleDateString()}</dd>
                </dl>
              </div>
              
              ${auth!.isAdmin ? `
                <div class="admin-section glass-card">
                  <h2>Admin Tools</h2>
                  <a href="/admin/users" class="btn btn-warning glass-button">Manage Users</a>
                </div>
              ` : ''}
              
              <div class="actions">
                <form action="/sign_out" method="POST" style="display: inline;">
                  <input type="hidden" name="_method" value="DELETE">
                  <button type="submit" class="btn btn-secondary glass-button">Sign Out</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  })
  
  // Mount route controllers
  .use(sessionsController)
  .use(registrationsController)
  .use(apiAuthController)
  
  // Sign in/up convenience routes
  .get('/sign_in', ({ set }) => {
    set.redirect = '/sessions/new';
    set.status = 302;
  })
  .get('/sign_up', ({ set }) => {
    set.redirect = '/registrations/new';
    set.status = 302;
  })
  
  // Sign out convenience route (convert POST to DELETE)
  .post('/sign_out', async ({ set, cookie, auth }) => {
    if (auth?.session) {
      const { AuthService } = await import('./services/auth');
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
    
    set.redirect = '/';
    set.status = 302;
  })
  
  // 404 handler
  .onError(({ code, error, set }) => {
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        error: 'Not Found',
        message: 'The requested resource was not found',
      };
    }
    
    console.error('Server error:', error);
    set.status = 500;
    return {
      error: 'Internal Server Error',
      message: config.isDevelopment ? error.message : 'An error occurred',
    };
  });

// Start server
async function start() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }
    
    // Start server
    app.listen(config.port);
    
    console.log(`
🚀 Passport Elysia server running!
   
   URL: http://localhost:${config.port}
   Environment: ${config.nodeEnv}
   Database: Connected
   
   Routes:
   - GET  /              Home
   - GET  /sign_in       Sign in form
   - POST /sessions      Sign in
   - GET  /sign_up       Sign up form  
   - POST /registrations Sign up
   - POST /sign_out      Sign out
   - GET  /dashboard     User dashboard
   
   API:
   - POST   /api/auth/signin   Sign in
   - POST   /api/auth/signup   Sign up
   - POST   /api/auth/verify   Verify token
   - POST   /api/auth/refresh  Refresh token
   - DELETE /api/auth/signout  Sign out
   - GET    /api/auth/user     Current user
   
   Health: GET /up
`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await closeConnection();
  process.exit(0);
});

// Start the server
start();