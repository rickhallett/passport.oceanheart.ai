# Passport Lite (Bun + Feathers) — Technical Specification

## 1. Objectives & Scope

Deliver an authentication service functionally equivalent to the Rails-based Passport app using the Bun runtime and Feathers.js framework. Key goals:

- Support browser-based and API authentication flows (sign-up/in/out, JWT issuance, session cookies).
- Provide admin tooling for user/session management.
- Maintain SSO compatibility via JWT cookies on `.oceanheart.ai`.
- Implement rate limiting, CSRF protection, and secure password storage.
- Deploy on Render (or Bun-compatible hosting) using PostgreSQL.

## 2. Technology Stack

- **Runtime**: Bun 1.1+
- **Framework**: Feathers 5 (a.k.a. DOVE) with Express transport
- **Language**: TypeScript (preferred) or ESM JavaScript
- **Database**: PostgreSQL via `@feathersjs/postgres` adapter (built on `knex`/`pg`)
- **Authentication**: Feathers authentication service with JWT + local strategy
- **Templating**: Lightweight SSR via Express `res.render` or custom middleware (e.g., `eta`)
- **Password hashing**: Feathers default (`bcryptjs`) or Node `crypto.scrypt`
- **Rate limiting**: Custom middleware (in-memory bucket) or `express-rate-limit`

## 3. Architecture Overview

```
+------------------------------------------------+
| Bun Runtime + Feathers Application             |
|                                                |
|  +--------------------+    +----------------+  |
|  | Express HTTP Layer | -> | Feathers Hooks |  |
|  +--------------------+    +----------------+  |
|                 |                    |         |
|                 v                    v         |
|        +----------------+   +----------------+ |
|        | Feathers Services|   | Custom Controllers |
|        +----------------+   +----------------+ |
|                 |                    |         |
|                 v                    v         |
|       +-------------------+ +----------------+ |
|       | Postgres Adapter  | | View Renderer | |
|       +-------------------+ +----------------+ |
+------------------------------------------------+
```

Feathers services handle data operations and authentication. Express routes (within Feathers) serve HTML pages.

## 4. Core Services & Data Model

### 4.1 Data Model

Use Feathers “services” mapped to Postgres tables:

- `users` table
  - `id SERIAL PRIMARY KEY`
  - `email_address CITEXT UNIQUE`
  - `password` (hashed)
  - `role` (`user`, `admin`)
  - timestamps

- `sessions` table
  - `id UUID`
  - `user_id`
  - `ip_address`, `user_agent`
  - timestamps

Optional: `password_resets` table for reset flows.

### 4.2 Feathers Services

- `users` service (CRUD with hooks for password hashing, email normalization).
- `sessions` service (custom to track sessions, used outside Feathers auth).
- `authentication` service (built-in) configured for JWT + local strategy.

## 5. Authentication Flow

### 5.1 Feathers Authentication Configuration

- Strategies: `local` (email/password) and `jwt`.
- Local strategy uses custom fields `email_address` and `password`.
- JWT secret from `SECRET_KEY_BASE` env.
- Token payload includes `userId`, `email`, `iss`, `exp`, `iat`.

### 5.2 Web Session Flow

1. User submits `/sign_in` form (Express route).
2. Route calls `authentication.create({ strategy: 'local', email_address, password })`.
3. Response includes access token (JWT) and user object.
4. Handler stores session in `sessions` table, sets cookies:
   - `session_id` (signed, HttpOnly)
   - `oh_session` (JWT, HttpOnly, Secure, SameSite=Lax, Domain `.oceanheart.ai`)
5. Respond with redirect or Turbo-like partial (Feathers can serve SSE or do full page redirect).

### 5.3 API Flow

- `/api/auth/signin`: POST -> call Feathers auth service; return JSON with token and set cookies.
- `/api/auth/verify`: Use `authentication.verifyAccessToken` (Feathers helper) to validate; return user info.
- `/api/auth/refresh`: Re-authenticate via session cookie (lookup session -> create new JWT).
- `/api/auth/user`: Return authenticated user from `context.params.user`.

### 5.4 Sign-out

- Remove session row, clear cookies; optionally blacklist JWT (not required since short-lived).

## 6. Express Routes & Views

- Use Feathers Express integration to register additional routes for HTML pages:

```
app.get('/', homeController.index)
app.get('/sign_in', sessionsController.new)
app.post('/sign_in', sessionsController.create)
app.delete('/sign_out', sessionsController.destroy)
app.get('/sign_up', registrationsController.new)
app.post('/sign_up', registrationsController.create)
app.get('/admin', adminController.dashboard)
```

- Views rendered via template engine (e.g., `eta`, `pug`, or manual string templates).
- Include CSRF tokens in forms.

## 7. Middleware & Hooks

### 7.1 Express Middleware

- Request logging (custom or `morgan`-like).
- Body parsing (Feathers includes `express.json`, `express.urlencoded`).
- Cookie parsing + signing (use `cookie-signature`).
- CSRF protection: custom middleware storing token in signed cookie and verifying hidden input (`crypto.randomBytes`).
- Rate limiter for POST `/sign_in` and `/api/auth/signin`.

### 7.2 Feathers Hooks

- `users.before.create`: normalize email, hash password.
- `authentication.after.create`: attach user data, record session.
- `authentication.before.create`: rate limiting via hook (optional).
- `sessions.before` hooks: ensure only admins access session list; ensure user owns session before deletion.

## 8. JWT & Cookie Handling

- JWT creation handled by Feathers; ensure configuration sets `expiresIn` (1 week) and `issuer`.
- `oh_session` cookie contains token; set using Express response `res.cookie` with `httpOnly`, `secure`, `sameSite: 'lax'`, `domain` env.
- `session_id` cookie stores signed session UUID; used to find session record for HTML flows.
- Provide helper `setAuthCookies(res, sessionId, jwt)` and `clearAuthCookies(res)`.

## 9. Rate Limiting

- Implement custom rate limiter using `Map` keyed by IP + route; track tokens, last refill.
- Alternatively, integrate `express-rate-limit` (light dependency) if acceptable.
- Hook or middleware rejects with 429 and generic message.

## 10. CSRF Strategy

- Generate random token stored in `csrf_token` cookie (signed).
- Form includes hidden `_csrf` field; middleware verifies match.
- For API routes, skip CSRF but require JWT; ensure `sameSite=Lax` prevents CSRF for cookies.

## 11. Database Access

- Use Feathers Postgres adapter with Knex migrations.
- Define migration files under `db/migrations/` run via `knex migrate:latest` (Bun-compatible using `bunx knex`).
- Example users migration snippet:

```js
exports.up = (knex) => knex.schema.createTable('users', (table) => {
  table.increments('id').primary();
  table.string('email_address').notNullable().unique();
  table.string('password').notNullable();
  table.string('role').notNullable().defaultTo('user');
  table.timestamps(true, true);
});
```

## 12. Configuration & Environment

Environment variables (via `Bun.env`):
- `PORT`
- `DATABASE_URL`
- `SECRET_KEY_BASE`
- `COOKIE_DOMAIN`
- `JWT_AUDIENCE`, `JWT_ISSUER`
- `RATE_LIMIT_SIGNIN_ATTEMPTS`, `RATE_LIMIT_SIGNIN_WINDOW`

Feathers configuration (`config/default.json`) can read from env or use `feathers-configuration` module.

## 13. Deployment

### 13.1 Process

- Install dependencies: `bun install` (Feathers packages, pg, knex, template engine).
- Build TypeScript: `bunx tsc` if using TS.
- Start command: `bun run src/app.ts` or `bun run dist/app.js`.
- Health endpoint `/up` returning 200 and verifying DB connection.

### 13.2 Deployment Options

- **Render Web Service**: Use Dockerfile (Bun base image) or Nixpacks; set env vars; attach Render Postgres.
- **Fly.io**: Container approach; persistent Postgres via Fly or external.
- **Bun Deploy**: Works if Postgres accessible from deploy environment (may require whitelisted IPs).
- **VM / Bare metal**: Install Bun, run via systemd service.

### 13.3 Deployment Considerations

- **Migrations**: Run `knex migrate:latest` before launching; can be executed in start script guarded by leadership lock.
- **Scaling**: Rate limiter is in-memory; pin to single instance or introduce Redis (Feathers supports external services via hooks).
- **Sessions**: Stored in Postgres; ensure index on `user_id` for admin queries.
- **Logging**: Output JSON logs; integrate with Render log drains if needed.
- **TLS**: Offload to platform; if self-managed, run behind reverse proxy (Caddy/Nginx).

## 14. Testing Strategy

- **Unit tests**: Use Bun test runner for services and hooks (`bun test`).
- **Integration tests**: Boot Feathers app in-memory; use `supertest`-like library (Bun fetch) to hit endpoints.
- **Authentication tests**: Validate login success/failure, JWT validity, cookie flags.
- **Rate limit tests**: Simulate repeated requests to ensure 429 responses.
- **Admin flows**: Verify only admins can access admin endpoints and toggle roles.

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Feathers Postgres adapter maturity | Potential bugs | Write integration tests, contribute fixes, fallback to direct Knex queries if needed |
| Rate limiting per-instance only | Scaling issues | Add Redis or Cloudflare edge rate limiting when scaling horizontally |
| CSRF tokens & Feathers combination | Implementation complexity | Thorough testing on HTML forms; reuse Express CSRF patterns |
| JWT compatibility | Token claims mismatch | Mirror Rails payload fields exactly (`userId`, `email`, `iss`) |
| SSR templating | Additional dependency | Use minimal template engine or compile static HTML with dynamic placeholders |

## 16. Roadmap

1. **Milestone 1**: Feathers setup, user service, local auth, JWT issuance, HTML forms.
2. **Milestone 2**: Sessions tracking, cookies, API parity endpoints.
3. **Milestone 3**: Admin interface, rate limiting, CSRF.
4. **Milestone 4**: Password resets, observability, deployment automation.

## 17. Directory Structure (Proposed)

```
passport-lite/
  src/
    app.ts
    server.ts
    services/
      users/users.service.ts
      sessions/sessions.service.ts
      authentication.ts
    hooks/
      authentication.hooks.ts
      users.hooks.ts
    middleware/
      csrf.ts
      rateLimit.ts
      cookies.ts
    controllers/
      web/
      admin/
    templates/
      layout.eta
      sessions/
      registrations/
    utils/
      jwt.ts
      logger.ts
  config/
    default.json
  db/
    migrations/
  public/
    assets/
  tests/
    integration/
    unit/
  package.json
  bunfig.toml
```

## 18. Minimal Dependencies

- `@feathersjs/feathers`
- `@feathersjs/express`
- `@feathersjs/authentication`
- `@feathersjs/authentication-local`
- `@feathersjs/authentication-jwt`
- `@feathersjs/postgres`
- `knex`, `pg`
- `cookie`, `cookie-signature`
- `typescript` (dev), `ts-node` or Bun build pipeline
- Optional: `eta` (templating), `express-rate-limit`

