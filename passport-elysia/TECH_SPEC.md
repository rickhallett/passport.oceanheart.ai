# Passport Elysia Authentication Service — Technical Specification

## 1. Objectives & Scope

Rebuild the Oceanheart Passport authentication system using the Bun runtime with the Elysia framework, achieving parity with the existing Rails functionality:

- HTML and API-based authentication flows (sign-up/in/out, session persistence, JWT issuance).
- Secure cookie handling for SSO across `.oceanheart.ai`.
- Admin interface for user/session management.
- Rate limiting, CSRF protection, password reset support.
- Deployment on Render (or Bun-compatible hosting) with PostgreSQL backend.

## 2. Technology Stack

- **Runtime**: Bun 1.1+
- **Language**: TypeScript (strict mode)
- **Framework**: Elysia (Bun-native HTTP framework with schema validation via `@elysiajs/eden` optional)
- **Database**: PostgreSQL via `postgres` (postgres.js) or Drizzle ORM
- **Authentication**: Custom implementation (JWT + session cookies), optionally leveraging `@elysiajs/jwt` plugin
- **Templating**: Elysia HTML plugin (e.g., `@elysiajs/html`) or simple JSX/templating solution
- **Password hashing**: `crypto.scrypt` standard lib or dedicated packages (`argon2`, optional)
- **Rate limiting**: In-memory token bucket middleware or `elysia-rate-limit` (community plugin)

## 3. High-Level Architecture

```
+----------------------------------------------+
| Bun Runtime + Elysia Application             |
|                                              |
|  +---------------+   +--------------------+  |
|  | Router        |-->| Middleware Stack   |  |
|  +---------------+   +--------------------+  |
|           |                    |             |
|           v                    v             |
|     +--------------+   +-----------------+   |
|     | Controllers  |-->| Service Layer   |   |
|     +--------------+   +-----------------+   |
|               |                 |             |
|               v                 v             |
|        +----------------+   +-------------+   |
|        | Repositories   |   | Templates   |   |
|        +----------------+   +-------------+   |
|               |                 |             |
|               v                 v             |
|        +-------------------------------+      |
|        | PostgreSQL (managed by Render)|      |
|        +-------------------------------+      |
+----------------------------------------------+
```

## 4. Routing & Middleware

### 4.1 Route Definitions

Using Elysia chaining style:

```ts
const app = new Elysia()
  .use(logger())
  .use(cookie())
  .use(csrfMiddleware)
  .use(rateLimiter([...]))

app.group('/', (app) => app
  .get('/', homeController.index)
  .get('/sign_in', sessionsController.new)
  .post('/sign_in', sessionsController.create)
  .delete('/sign_out', sessionsController.destroy)
  .get('/sign_up', registrationsController.new)
  .post('/sign_up', registrationsController.create)
)

app.group('/api/auth', (app) => app
  .post('/signin', apiAuthController.signIn)
  .post('/verify', apiAuthController.verify)
  .post('/refresh', apiAuthController.refresh)
  .delete('/signout', apiAuthController.signOut)
  .get('/user', apiAuthController.currentUser)
)

app.group('/admin', (app) => app
  .get('/users', adminController.list)
  .post('/users/:id/toggle_role', adminController.toggleRole)
)
```

### 4.2 Middleware Responsibilities

- **Logger**: Request logging with correlation IDs.
- **Body Parsing**: Elysia handles JSON/form parsing natively; ensure form data parsed for HTML flows.
- **Cookie**: Manage signed `session_id`, `oh_session`, `csrf_token` using `cookie` plugin.
- **CSRF Middleware**: Issue token, validate on mutating HTML routes; skip for API JWT requests.
- **Auth Context**: Middleware reads cookies/JWT and attaches `ctx.auth` for downstream handlers.
- **Rate Limiting**: Implement per-IP token bucket using `Map` storing tokens and timestamps.
- **Error Handling**: Global error handler returning JSON for API, HTML for web routes.

## 5. Service Layer

### 5.1 AuthService
- `authenticate(email, password)` -> user or null (uses hashed password verification).
- `startSession(userId, ip, userAgent)` -> create DB session record, return session ID.
- `endSession(sessionId)` -> delete from DB.
- `generateJwt(user)`/`verifyJwt(token)` using HS256; either manual or via `@elysiajs/jwt` plugin.

### 5.2 UserService
- `createUser(data)` with validation and password hashing.
- `findByEmail`, `findById`, `listUsers`, `toggleRole`.
- Input validation via `zod` or Elysia native schema definitions.

### 5.3 SessionService
- `findById`, `findByUser`, `delete`.
- Provide admin-friendly list of active sessions.

### 5.4 PasswordResetService (Phase 3)
- Manage tokens with expiry; send email (stubbed). Logging integration for manual distribution.

## 6. Data Model

Tables mirror Rails schema:

- `users`
  - `id SERIAL PRIMARY KEY`
  - `email_address CITEXT UNIQUE`
  - `password_digest TEXT`
  - `role TEXT` (`user`/`admin`)
  - `created_at`, `updated_at`

- `sessions`
  - `id UUID PRIMARY KEY`
  - `user_id`
  - `ip_address`, `user_agent`
  - `created_at`, `updated_at`

- Optional `password_resets`: `id`, `user_id`, `token_digest`, `expires_at`.

Migrations stored in `db/migrations` executed via simple Bun script or `drizzle-kit`/`knex` CLI.

## 7. Security Implementation

### 7.1 Password Hashing

- Use `crypto.scrypt` with secure parameters; derive a 32-byte key with random 16-byte salt.
- Store as `salt:hash` base64 string.

### 7.2 JWT Handling

- Header: `{ alg: 'HS256', typ: 'JWT' }`
- Payload: includes `userId`, `email`, `exp`, `iat`, `iss`.
- Use manual implementation or `@elysiajs/jwt` plugin configured with secret from `SECRET_KEY_BASE`.
- Expiration set to 1 week.

### 7.3 Cookies

- `session_id`: signed cookie storing session UUID; `HttpOnly`, `Secure`, `SameSite=Lax`, `Domain` env.
- `oh_session`: JWT cookie for SSO; same attributes.
- `csrf_token`: signed random string for HTML forms.

### 7.4 CSRF

- Issue token for GET HTML routes; validate on POST/DELETE.
- For API endpoints, rely on JWT; ensure `oh_session` cookie is `HttpOnly` and `SameSite=Lax`.

### 7.5 Rate Limiting

- Token bucket per IP+route key; store in `Map` with `tokens` and `lastRefill`.  
- Configurable via env (attempts/window).

## 8. Templates & Assets

- Use `@elysiajs/html` or minimal JSX templating for SSR.
- Layout template includes shared auth status partial.
- Serve static assets from `public/` using Elysia’s static middleware (`app.use(staticPlugin)`).
- Ensure templates replicate existing Rails look/feel (Tailwind build reused).

## 9. Database Access

- Preferred: `postgres` (postgres.js) for lightweight typed queries.
- Example usage:

```ts
import postgres from 'postgres';
const sql = postgres(Bun.env.DATABASE_URL!, { max: 10 });

export const findUserByEmail = async (email: string) => {
  const rows = await sql`SELECT * FROM users WHERE email_address = ${email}`;
  return rows[0] ?? null;
};
```

- Wrap queries in repository modules; use transactions for multi-step operations (e.g., sign-up).

## 10. Configuration & Environment

- `config.ts` reads env variables via `Bun.env` with defaults/guards:
  - `PORT` (default 3000)
  - `DATABASE_URL`
  - `SECRET_KEY_BASE`
  - `COOKIE_DOMAIN`
  - `JWT_ISSUER`
  - `RATE_LIMIT_SIGNIN_ATTEMPTS`
  - `RATE_LIMIT_SIGNIN_WINDOW_MS`
- Validate presence of mandatory secrets on startup; exit with descriptive error if missing.

## 11. Deployment

### 11.1 Process

1. `bun install`
2. Compile TypeScript (if using `tsconfig`): `bunx tsc -p tsconfig.json` or rely on Bun runtime transpilation.
3. Run migrations: `bun run scripts/migrate.ts`.
4. Start server: `bun run src/server.ts`.
5. Health endpoint `/up` returning 200 (+ optional DB check).

### 11.2 Deployment Options

- **Render Web Service**: Dockerfile with Bun base; configure env vars; attach Postgres.
- **Fly.io**: Containerized deployment; use secrets for env; connect to managed Postgres.
- **Bun Deploy**: Feasible if Postgres accessible via public endpoints; watch for connection pooling.
- **VM / Bare Metal**: Install Bun; run via systemd; front with reverse proxy for TLS.
- **Serverless (Cloud Run)**: Container support; ensure rate limiting replaced or externalized for multiple instances.

### 11.3 Deployment Considerations

- **Migrations**: Provide script with advisory lock to prevent concurrent runs; integrate into CI/CD pipeline.
- **Scaling**: In-memory rate limiter single-instance; adopt Redis or edge rate limiting before scaling horizontally.
- **Resource usage**: Bun + Elysia lightweight; tune Postgres pool (max connections < Render limit).
- **Logging**: Implement structured JSON logs; add request IDs for traceability.
- **TLS**: Offloaded to platform; if self-hosting, configure Caddy/Nginx.

## 12. Testing Strategy

- **Unit tests**: Bun test runner for services (auth, JWT, hashing, rate limiting).
- **Integration tests**: Boot Elysia app via `app.handle` with test DB; use `fetch` to hit routes.
- **Security tests**: Validate CSRF enforcement, JWT tampering, rate limiting response.
- **Regression scripts**: Reuse shell scripts (e.g., `test/auth-test.sh`) pointing to Bun server.

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Manual auth implementation | Potential security bugs | Extensive tests, consider `@elysiajs/jwt`, security review |
| Ecosystem maturity | Limited community patterns | Keep dependencies minimal; rely on standard libraries |
| In-memory rate limiting | Not multi-instance safe | Introduce Redis or CDN rate limiting when scaling out |
| Template engine parity | UI mismatch | Reuse existing Tailwind CSS; snapshot tests on HTML |
| Database migrations | Drift vs Rails | Define SQL migrations carefully; consider Drizzle for type safety |

## 14. Roadmap

1. **Milestone 1**: Core routing, user service, local auth, JWT, HTML forms.
2. **Milestone 2**: Sessions table, cookies, API parity, admin list.
3. **Milestone 3**: Rate limiting, CSRF, password reset flows.
4. **Milestone 4**: Observability, deployment automation, load testing.

## 15. Directory Structure

```
passport-elysia/
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
      web/
      api/
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
  package.json
  bunfig.toml
  tsconfig.json
```

## 16. Minimal Dependencies

- `elysia`
- `@elysiajs/html` (or JSX alternative)
- `bun-types`, `typescript`
- `postgres` (postgres.js) or `drizzle-orm` + `drizzle-kit`
- `cookie`, `cookie-signature`
- Optional: `@elysiajs/jwt`, `elysia-rate-limit`, `zod`, `eta`

