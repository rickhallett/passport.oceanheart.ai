# Passport Hono Authentication Service — Technical Specification

## 1. Objectives & Scope

Recreate the Oceanheart Passport authentication platform using the Bun runtime with the Hono web framework while maintaining full feature parity with the Rails implementation:

- Browser and API authentication flows (sign-up/in/out, session persistence, JWT issuance).
- Secure cookies for SSO across `.oceanheart.ai` subdomains.
- Admin tooling for user/session management.
- Rate limiting, CSRF protection, password reset support.
- Deployable on Render (or Bun-compatible hosting) backed by PostgreSQL.

## 2. Technology Stack

- **Runtime**: Bun 1.1+
- **Framework**: Hono (Lightweight web framework with Middleware support)
- **Language**: TypeScript
- **Database**: PostgreSQL via `postgres` client (`postgres.js`) or `pg`
- **Templating**: ESM-compatible engine (e.g., `eta`) or JSX via `hono/jsx`; minimal dependencies
- **Authentication**: Custom layer (no built-in auth in Hono) using JWT + session cookies
- **Password hashing**: `crypto.scrypt` (stdlib) or `argon2` (optional dependency)
- **Rate limiting**: In-memory middleware (token bucket implemented with standard library)

## 3. High-Level Architecture

```
+---------------------------------------------+
| Bun Runtime + Hono Application              |
|                                             |
|  +-------------+    +--------------------+  |
|  | Router      | -> | Middleware Stack   |  |
|  +-------------+    +--------------------+  |
|         |                      |            |
|         v                      v            |
|   +----------------+    +-------------+     |
|   | Controllers    | -> | Service Layer|    |
|   +----------------+    +-------------+     |
|         |                      |            |
|         v                      v            |
|   +------------------+   +---------------+  |
|   | Repository Layer |   | View Renderer |  |
|   +------------------+   +---------------+  |
|         |                             |     |
|         v                             v     |
|   +------------------+        +-------------+|
|   | PostgreSQL       |        | Static Assets|
|   +------------------+        +-------------+|
+---------------------------------------------+
```

## 4. Routing & Middleware

### 4.1 Router Setup

Use Hono’s route groups and named middleware:

```
const app = new Hono();

app.use('*', requestLogger());
app.use('/api/*', jsonParser(), authExtractor());
app.use(['/sign_in', '/sign_up', '/sign_out'], csrfProtection());
app.use(['/sign_in', '/api/auth/signin'], rateLimiter({ limit: 10, windowMs: 3 * 60 * 1000 }));

app.get('/', homeController.index);
app.get('/sign_in', sessionsController.new);
app.post('/sign_in', sessionsController.create);
app.delete('/sign_out', sessionsController.destroy);
app.get('/sign_up', registrationsController.new);
app.post('/sign_up', registrationsController.create);

app.post('/api/auth/signin', apiAuthController.signIn);
app.post('/api/auth/verify', apiAuthController.verify);
app.post('/api/auth/refresh', apiAuthController.refresh);
app.delete('/api/auth/signout', apiAuthController.signOut);
app.get('/api/auth/user', apiAuthController.currentUser);

app.get('/admin/users', adminController.list);
app.post('/admin/users/:id/toggle_role', adminController.toggleRole);
```

### 4.2 Middleware Responsibilities

- **Request Logger**: attaches correlation ID, logs method/path/latency.
- **JSON / Form Parser**: convert bodies to objects (Bun provides `request.json()` / `formData()`; wrap in middleware).
- **CSRF Protection**: generate token stored in signed cookie; verify hidden form field.
- **Auth Extractor**: decode `session_id` cookie and `oh_session` JWT, attach `request.locals.user`.
- **Rate Limiter**: In-memory map storing per-IP tokens; respond with 429 when exhausted.
- **Error Handler**: catch exceptions, return proper JSON or HTML responses.

## 5. Service Layer

### 5.1 AuthService

- `authenticate(email, password)` -> user or null.
- `startSession(userId, ip, userAgent)` -> create DB record, return session ID.
- `terminateSession(sessionId)` -> delete record.
- `generateJwt(user)`/`verifyJwt(token)` using HS256 (`crypto.createHmac`).

### 5.2 UserService

- `createUser({ email, password })` with validation, password hashing.
- `findByEmail`, `findById`, `listUsers`, `toggleRole`.
- `normalizeEmail` (lowercase + trim).

### 5.3 SessionService

- `findById`, `findByUser`, `delete`, `deleteAllForUser`.
- Provide data for admin UI.

### 5.4 PasswordResetService (Phase 3)

- Generate token, store hashed token with expiry, validate during reset.

## 6. Data Model

Tables align with Rails schema:

- `users`
  - `id SERIAL PRIMARY KEY`
  - `email_address CITEXT UNIQUE`
  - `password_digest TEXT`
  - `role TEXT` (`user`, `admin`)
  - `created_at`, `updated_at`

- `sessions`
  - `id UUID PRIMARY KEY`
  - `user_id` (FK users)
  - `ip_address`, `user_agent`
  - `created_at`, `updated_at`

- `password_resets` (optional)
  - `id SERIAL`
  - `user_id`
  - `token_digest`
  - `expires_at`

Migrations stored under `db/migrations` executed via `bun run migrate` (using simple Bun script or `drizzle-kit`/`knex` CLI).

## 7. Security Details

### 7.1 Password Hashing

Use `crypto.scrypt` with parameters `N=16384`, `r=8`, `p=1`, 32-byte key; store as `salt:hash`. Wrap in utility functions.

### 7.2 JWT

- Header: `{ alg: 'HS256', typ: 'JWT' }`
- Payload: `{ userId, email, exp, iat, iss }`
- Secret: `Bun.env.SECRET_KEY_BASE`
- Expiry: 1 week; refresh via `/api/auth/refresh`

### 7.3 Cookies

- `session_id`: signed (HMAC) cookie; `HttpOnly`, `Secure`, `SameSite=Lax`, domain from env.
- `oh_session`: JWT cookie with same attributes for SSO.
- Provide helper to set/clear cookies.

### 7.4 CSRF

- Issue `csrf_token` cookie (signed). Each HTML form includes `_csrf` hidden field. Middleware validates and rotates token.
- Exempt API routes that rely on JWT.

### 7.5 Rate Limiting

- Token bucket stored in `Map<string, Bucket>` keyed by IP + route. Refilled every interval using `Date.now()` difference.
- Return 429 with standard JSON body for API / HTML flash message for forms.

## 8. View Layer

- Choice of templating:
  - `hono/jsx` to render server-side components.
  - `eta` for string-based templates similar to ERB.
- Pages required: home, sign-in, sign-up, admin dashboard, shared partial for auth status.
- Serve static assets (Tailwind build) from `public/` using `app.use('/assets/*', serveStatic())`.

## 9. Database Layer

- Use `postgres.js` client for lightweight driver with tagged template literals:

```ts
import postgres from 'postgres';
const sql = postgres(Bun.env.DATABASE_URL!, { max: 10 });
const user = await sql`SELECT * FROM users WHERE email_address = ${email}`;
```

- Repositories abstract queries; return domain models.
- Provide transaction helper for multi-step operations (e.g., sign-up).

## 10. Configuration & Environment

`config.ts` module reads environment variables with defaults:

- `PORT` (default 3000)
- `DATABASE_URL`
- `SECRET_KEY_BASE`
- `COOKIE_DOMAIN`
- `JWT_ISSUER`
- `RATE_LIMIT_SIGNIN_ATTEMPTS` (default 10)
- `RATE_LIMIT_SIGNIN_WINDOW_MS` (default 180000)
- `ENV` (`development`/`production`)

Fail fast if required secrets missing (`SECRET_KEY_BASE`, `DATABASE_URL`).

## 11. Deployment

### 11.1 Process

- Install dependencies: `bun install`
- Compile TypeScript if using `tsconfig` (`bunx tsc --noEmit false` or use `bun build` bundler)
- Run migrations: `bun run scripts/migrate.ts`
- Start command: `bun run src/server.ts`
- Health endpoint `/up` returning 200 (optionally check DB).

### 11.2 Deployment Options

- **Render Web Service**: Container build using Bun base image; configure env vars; attach Render Postgres.
- **Fly.io**: Bun-compatible container; use secrets for env vars; rely on Fly Postgres.
- **Bun Deploy**: Works if Postgres accessible; may require dedicated connection pooling (e.g., Neon/Cloud SQL with public access).
- **VM / Bare metal**: Install Bun via script; run using systemd service.
- **Serverless (Cloud Run)**: Possible with container; ensure cold starts acceptable and rate limiter replaced with distributed solution.

### 11.3 Deployment Considerations

- **Migrations**: Ensure they run before app boot (CI/CD job or startup guard). Use advisory locks to prevent race conditions.
- **Scaling**: In-memory rate limiter isn’t multi-instance safe; plan Redis or edge rate limiting before scaling horizontally.
- **Session data**: Stored in Postgres; add indexes on `user_id` and `created_at`.
- **Secrets management**: Use platform secret storage; never check into repo.
- **Logging**: Structured JSON to STDOUT for platform ingestion. Consider adding request ID to logs.
- **TLS**: Delegated to platform; if self-managing, use Caddy/Nginx in front.

## 12. Testing Strategy

- **Unit tests**: Bun test runner for services, utilities, rate limiter.
- **Integration tests**: Boot Hono app in-memory with `app.request()`; use test DB (dockerized Postgres or sqlite for subset).
- **API tests**: Validate JSON endpoints (signin, verify, refresh, signout, user).
- **HTML tests**: Snapshot templates or use headless fetch to verify CSRF tokens and redirects.
- **Security tests**: Tampered JWT, missing CSRF, repeated signin to ensure rate limit.

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Hono minimalism requires custom auth | Additional effort | Encapsulate common auth logic in middleware; reuse service layer |
| In-memory rate limiting | Not multi-instance safe | Introduce Redis/Upstash when scaling |
| Manual JWT/CSRF implementation errors | Security vulnerabilities | Add comprehensive tests, peer review, consider using `hono/jwt` utilities |
| Template engine choice | Potential dependency bloat | Use built-in `hono/jsx` or simple template literals |
| Connection pooling with Bun | Resource exhaustion | Tune `postgres.js` pool size and handle disconnects gracefully |

## 14. Roadmap

1. **Milestone 1**: Core routing, user service, local authentication, JWT issuance, HTML forms.
2. **Milestone 2**: Session persistence, cookies, API parity endpoints.
3. **Milestone 3**: Admin dashboard, rate limiting, CSRF, password resets.
4. **Milestone 4**: Observability, deployment automation, load testing.

## 15. Proposed Directory Structure

```
passport-hono/
  src/
    server.ts
    app.ts
    config.ts
    middleware/
      logger.ts
      auth.ts
      csrf.ts
      rateLimit.ts
    controllers/
      api/
      web/
      admin/
    services/
      auth.ts
      users.ts
      sessions.ts
      passwords.ts
    repositories/
      users.ts
      sessions.ts
    templates/
      layout.tsx
      sessions/
      registrations/
      admin/
    utils/
      jwt.ts
      hash.ts
  db/
    migrations/
  public/
    assets/
  scripts/
    migrate.ts
  tests/
    unit/
    integration/
  bunfig.toml
  package.json
  tsconfig.json
```

## 16. Minimal Dependencies

- `hono`
- `postgres` (or `pg`)
- `bun-types`, `typescript`
- `cookie`, `cookie-signature`
- Optional: `eta` or `hono/jsx` for templating, `drizzle-kit`/`knex` for migrations
- Optional: `zod` for request validation, `pino` for structured logging

