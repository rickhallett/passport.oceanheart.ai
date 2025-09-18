# Passport Hono - Developer Setup Guide

A lightweight authentication platform built with Bun and Hono, providing JWT-based SSO for the Oceanheart ecosystem. This service serves as a high-performance alternative to the main Rails-based Passport implementation.

## Prerequisites

### System Requirements

- **Bun**: 1.1.0 or higher ([Install Bun](https://bun.sh))
- **PostgreSQL**: 12+ running locally or accessible remotely
- **Node.js**: 18+ (for tooling compatibility, though Bun is the primary runtime)
- **Git**: For cloning and version control

### Verify Prerequisites

```bash
# Check Bun installation
bun --version

# Check PostgreSQL access
psql --version

# Verify you can connect to PostgreSQL
psql -h localhost -U postgres -c "SELECT version();"
```

## Quick Start (15-minute setup)

### 1. Navigate to Project Directory

```bash
cd passport-hono
```

### 2. Install Dependencies

```bash
# Install all dependencies using Bun
bun install
```

Expected output:
```
bun install v1.1.34 (40a6abff)
 + hono@4.6.16
 + postgres@3.4.5
 + @hono/node-server@1.13.8
 + @types/bun@1.1.14
 + bun-types@1.1.34
 + typescript@5.7.2

 6 packages installed
```

### 3. Database Setup

#### Create PostgreSQL Database

```bash
# Connect to PostgreSQL as superuser
psql -h localhost -U postgres

# Create database and user
CREATE DATABASE passport_hono;
CREATE USER passport_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE passport_hono TO passport_user;
\q
```

#### Alternative: Using createdb command

```bash
createdb passport_hono
```

### 4. Environment Configuration

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` with your specific configuration:

```bash
# Server configuration
PORT=3000
ENV=development

# Database - Update with your PostgreSQL connection
DATABASE_URL=postgres://passport_user:your_secure_password@localhost:5432/passport_hono

# Security - Generate a secure secret key
SECRET_KEY_BASE=your-secret-key-base-here-generate-with-openssl-rand-hex-64

# Cookies - For local development
COOKIE_DOMAIN=.lvh.me

# JWT
JWT_ISSUER=passport.oceanheart.ai

# Rate limiting
RATE_LIMIT_SIGNIN_ATTEMPTS=10
RATE_LIMIT_SIGNIN_WINDOW_MS=180000
```

#### Generate Secure Secret Key

```bash
# Generate a 64-character hex secret
openssl rand -hex 64
```

### 5. Run Database Migrations

```bash
# Execute database schema setup
bun run migrate
```

Expected output:
```
Running database migrations...
Migrations completed successfully!
```

This creates the following tables:
- `users` - User accounts with email and role
- `sessions` - Active user sessions with UUID tracking
- `password_resets` - Password reset tokens (for future use)

### 6. Start Development Server

```bash
# Start server with hot reload
bun run dev
```

Expected output:
```
Starting Passport Hono server...
Database connection successful
Server running at http://localhost:3000
Environment: development
Cookie domain: .lvh.me
```

### 7. Verification Steps

#### Test Health Endpoint

```bash
curl http://localhost:3000/up
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-09-18T12:00:00.000Z"
}
```

#### Access Web Interface

Open your browser to:
- Main dashboard: `http://localhost:3000`
- Sign in form: `http://localhost:3000/sign_in`
- Sign up form: `http://localhost:3000/sign_up`

#### Test API Endpoints

```bash
# Test API signin endpoint
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

## Architecture Overview

### How Passport Hono Fits the Ecosystem

Passport Hono serves as a **high-performance alternative** to the main Rails-based Passport service (`passport.oceanheart.ai`). It provides:

1. **SSO Authentication** for all Oceanheart applications:
   - watson.oceanheart.ai (Clinical LLM review tool)
   - notebook.oceanheart.ai (Blog engine)
   - preflight.oceanheart.ai (AI readiness questionnaire)
   - labs.oceanheart.ai (Experimental features)
   - my.oceanheart.ai (User dashboard)

2. **Cross-domain JWT Tokens** via secure cookies with `.oceanheart.ai` domain
3. **API-first Design** for both web and programmatic access
4. **Performance Focus** using Bun's native speed advantages

### Technology Stack

- **Runtime**: Bun (JavaScript/TypeScript runtime optimized for speed)
- **Framework**: Hono (Lightweight web framework, ~1KB bundle)
- **Database**: PostgreSQL with `postgres.js` client
- **Authentication**: Custom JWT implementation with HS256 signing
- **Security**: Built-in CSRF protection, rate limiting, secure cookies
- **TypeScript**: Full type safety throughout the application

### Project Structure

```
passport-hono/
├── src/
│   ├── app.ts                 # Main Hono application setup
│   ├── server.ts              # Bun server entry point
│   ├── config.ts              # Environment configuration
│   ├── controllers/           # Request handlers
│   │   ├── web/              # Browser-facing controllers
│   │   ├── api/              # API endpoints
│   │   └── admin/            # Admin functionality
│   ├── middleware/           # Custom middleware
│   │   ├── auth.ts           # Authentication logic
│   │   ├── csrf.ts           # CSRF protection
│   │   ├── rateLimit.ts      # Rate limiting
│   │   └── logger.ts         # Request logging
│   ├── repositories/         # Data access layer
│   ├── services/             # Business logic
│   ├── utils/                # Utility functions
│   └── db/                   # Database connection
├── db/migrations/            # Database schema (future)
├── scripts/migrate.ts        # Migration runner
├── tests/                    # Test suite
└── public/                   # Static assets
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/signin
Sign in with email and password.

**Request:**
```json
{
  "email": "user@example.com", 
  "password": "user_password"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/auth/verify
Verify JWT token validity.

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### GET /api/auth/user
Get current authenticated user information. Requires valid JWT in Authorization header or oh_session cookie.

#### DELETE /api/auth/signout
Sign out and invalidate session.

### Web Routes

- **GET /**: Dashboard (redirects to sign in if not authenticated)
- **GET /sign_in**: Sign in form
- **POST /sign_in**: Process sign in (with CSRF protection)
- **GET /sign_up**: Registration form  
- **POST /sign_up**: Process registration (with CSRF protection)
- **POST /sign_out**: Sign out (supports _method=DELETE for forms)

### Admin Routes (Requires admin role)

- **GET /admin/users**: User management interface
- **POST /admin/users/:id/toggle_role**: Toggle user between 'user' and 'admin' roles

## Development Workflow

### Available Scripts

```bash
# Development with hot reload
bun run dev

# Production server
bun run start

# Type checking
bun run typecheck

# Run tests
bun run test

# Database migrations
bun run migrate

# Build for production
bun run build
```

### Development Best Practices

1. **Use Bun-native APIs** where possible:
   - `Bun.serve()` for HTTP server
   - `Bun.env` for environment variables
   - `Bun.file()` for file operations

2. **Follow TypeScript patterns**:
   - All source files use `.ts` extension
   - Strict type checking enabled
   - Interface definitions for all data structures

3. **Database queries**:
   - Use tagged template literals with `sql`
   - Leverage PostgreSQL-specific features (CITEXT, UUID)
   - Proper connection pooling and error handling

## Security Features

### Password Security
- **Hashing**: `crypto.scrypt` with N=16384, r=8, p=1
- **Salting**: Automatic salt generation for each password
- **Timing attacks**: Constant-time comparison

### JWT Implementation
- **Algorithm**: HS256 with configurable secret
- **Claims**: Standard JWT claims plus custom user data
- **Expiration**: Configurable token lifetime
- **Secure cookies**: HttpOnly, Secure (in production), SameSite=Lax

### Request Protection
- **CSRF tokens**: Signed tokens for state-changing requests
- **Rate limiting**: Configurable limits per endpoint and time window
- **CORS**: Restricted to Oceanheart subdomains

### Session Management
- **UUID session IDs**: Cryptographically secure session identifiers
- **IP tracking**: Session tied to originating IP address
- **User agent logging**: Track browser/client information
- **Session cleanup**: Automatic cleanup of expired sessions

## Environment Configuration

### Development Environment

```bash
PORT=3000
ENV=development
DATABASE_URL=postgres://user:pass@localhost:5432/passport_hono
SECRET_KEY_BASE=your-64-char-secret
COOKIE_DOMAIN=.lvh.me
JWT_ISSUER=passport.oceanheart.ai
RATE_LIMIT_SIGNIN_ATTEMPTS=10
RATE_LIMIT_SIGNIN_WINDOW_MS=180000
```

### Production Environment

```bash
ENV=production
PORT=3000
DATABASE_URL=postgres://user:pass@prod-host:5432/passport_hono
SECRET_KEY_BASE=your-production-secret-64-chars
COOKIE_DOMAIN=.oceanheart.ai
JWT_ISSUER=passport.oceanheart.ai
RATE_LIMIT_SIGNIN_ATTEMPTS=5
RATE_LIMIT_SIGNIN_WINDOW_MS=300000
```

### Required vs Optional Variables

**Required:**
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY_BASE`: JWT signing secret (64+ characters)

**Optional (with defaults):**
- `PORT`: Server port (default: 3000)
- `ENV`: Environment mode (default: development)
- `COOKIE_DOMAIN`: SSO cookie domain (default: .lvh.me for dev)
- `JWT_ISSUER`: JWT issuer claim (default: passport.oceanheart.ai)
- `RATE_LIMIT_*`: Rate limiting configuration

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Error**: `Failed to connect to database`

**Solutions:**
- Verify PostgreSQL is running: `pg_ctl status`
- Check connection string format: `postgres://user:pass@host:port/database`
- Ensure database exists: `createdb passport_hono`
- Test connection manually: `psql $DATABASE_URL`

#### 2. Migration Failures

**Error**: `Migration failed: relation already exists`

**Solutions:**
- Drop and recreate database for clean start
- Check for partially applied migrations
- Verify database permissions for schema changes

#### 3. JWT/Authentication Issues

**Error**: `Invalid token` or authentication failures

**Solutions:**
- Verify `SECRET_KEY_BASE` is consistent across restarts
- Check token expiration settings
- Ensure cookie domain matches your development setup

#### 4. CORS/Cross-domain Issues

**Error**: Requests blocked by CORS policy

**Solutions:**
- Verify `COOKIE_DOMAIN` setting matches your domain structure
- For local development, use `.lvh.me` subdomains
- Check CORS configuration in `src/app.ts`

#### 5. Rate Limiting Triggering

**Error**: `Too many requests`

**Solutions:**
- Adjust rate limit settings in `.env`
- Clear in-memory rate limit state by restarting server
- Use different IP or wait for window to reset

### Debug Mode

Enable detailed logging:

```bash
# Add to .env for verbose output
DEBUG=1
LOG_LEVEL=debug
```

### Performance Monitoring

Check server performance:

```bash
# Monitor memory usage
bun --print=summary src/server.ts

# Profile startup time
time bun src/server.ts
```

### Health Checks

The application provides comprehensive health monitoring:

```bash
# Basic health check
curl http://localhost:3000/up

# Expected healthy response
{"status":"ok","timestamp":"2024-09-18T12:00:00.000Z"}

# Database connectivity test
curl -f http://localhost:3000/up || echo "Service unhealthy"
```

## Integration with Other Services

### SSO Cookie Integration

Other Oceanheart applications can verify authentication by:

1. **Reading the `oh_session` cookie** from the `.oceanheart.ai` domain
2. **Verifying JWT tokens** using the same `SECRET_KEY_BASE`
3. **Making verification requests** to `/api/auth/verify`

### Example Integration (Node.js)

```javascript
// In another Oceanheart service
const jwt = require('jsonwebtoken');

function verifyOceanheart Token(token) {
  try {
    return jwt.verify(token, process.env.SECRET_KEY_BASE);
  } catch (error) {
    return null;
  }
}
```

## Next Steps

After successful setup:

1. **Create your first admin user** via the `/sign_up` endpoint
2. **Promote to admin** using database query: `UPDATE users SET role = 'admin' WHERE email = 'your@email.com'`
3. **Test SSO integration** with other Oceanheart services
4. **Configure production deployment** using the provided Docker setup
5. **Set up monitoring** and logging for production use

For production deployment, refer to the `Dockerfile` and `render.yaml` configuration files included in the project.