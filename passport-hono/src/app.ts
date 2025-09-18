import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { cors } from 'hono/cors';
import { requestLogger } from './middleware/logger';
import { authExtractor, requireAuth, requireAdmin } from './middleware/auth';
import { csrfProtection } from './middleware/csrf';
import { rateLimiter } from './middleware/rateLimit';
import { config } from './config';

// Controllers
import { homeController } from './controllers/web/homeController';
import { sessionsController } from './controllers/web/sessionsController';
import { registrationsController } from './controllers/web/registrationsController';
import { apiAuthController } from './controllers/api/authController';
import { adminUsersController } from './controllers/admin/usersController';

export const app = new Hono();

// Global middleware
app.use('*', requestLogger());

// CORS for API routes
app.use('/api/*', cors({
  origin: (origin) => {
    // Allow requests from Oceanheart subdomains
    if (!origin) return null;
    if (origin.endsWith('.oceanheart.ai') || origin.endsWith('.lvh.me')) {
      return origin;
    }
    return null;
  },
  credentials: true
}));

// Auth extractor for all routes
app.use('*', authExtractor());

// CSRF protection for web forms
app.use('/sign_in', csrfProtection());
app.use('/sign_up', csrfProtection());
app.use('/sign_out', csrfProtection());

// Rate limiting
app.use('/sign_in', rateLimiter({ 
  limit: config.rateLimitSigninAttempts, 
  windowMs: config.rateLimitSigninWindowMs 
}));
app.use('/api/auth/signin', rateLimiter({ 
  limit: config.rateLimitSigninAttempts, 
  windowMs: config.rateLimitSigninWindowMs 
}));

// Static files
app.use('/assets/*', serveStatic({ root: './public' }));

// Health check
app.get('/up', async (c) => {
  const { testConnection } = await import('./db');
  const dbOk = await testConnection();
  
  if (!dbOk) {
    return c.text('Database connection failed', 503);
  }
  
  return c.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Web routes
app.get('/', homeController.index);

// Sessions (sign in/out)
app.get('/sign_in', sessionsController.new);
app.post('/sign_in', sessionsController.create);
app.post('/sign_out', async (c) => {
  // Handle DELETE via POST with _method field
  const formData = await c.req.parseBody();
  if (formData._method === 'DELETE') {
    return sessionsController.destroy(c);
  }
  return c.text('Method not allowed', 405);
});
app.delete('/sign_out', sessionsController.destroy);

// Registrations (sign up)
app.get('/sign_up', registrationsController.new);
app.post('/sign_up', registrationsController.create);

// API routes
app.post('/api/auth/signin', apiAuthController.signIn);
app.post('/api/auth/verify', apiAuthController.verify);
app.post('/api/auth/refresh', apiAuthController.refresh);
app.delete('/api/auth/signout', apiAuthController.signOut);
app.get('/api/auth/user', requireAuth(), apiAuthController.currentUser);

// Admin routes
app.use('/admin/*', csrfProtection());
app.get('/admin/users', requireAuth(), requireAdmin(), adminUsersController.list);
app.post('/admin/users/:id/toggle_role', requireAuth(), requireAdmin(), adminUsersController.toggleRole);

// 404 handler
app.notFound((c) => {
  if (c.req.header('Accept')?.includes('application/json')) {
    return c.json({ error: 'Not found' }, 404);
  }
  return c.text('Page not found', 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  
  if (c.req.header('Accept')?.includes('application/json')) {
    return c.json({ error: 'Internal server error' }, 500);
  }
  
  return c.text('Internal server error', 500);
});

export default app;