# Passport Bun Authentication Service — Technical Specification

## 1. Objectives & Scope

Reimplement the Oceanheart Passport authentication server using Bun (JavaScript runtime) with minimal third-party dependencies while achieving functional parity with the Rails application:

- Browser-based sign-in/up/out and session management with secure cookies.
- RESTful API issuing HS256 JWTs for SSO across Oceanheart subdomains.
- Session persistence including admin visibility and management tools.
- Rate limiting for authentication endpoints.
- Deployment on Render (or Bun-compatible hosting) using PostgreSQL.

## 2. Technology Stack

- **Runtime**: Bun 1.1+
- **Language**: TypeScript (preferred) or JavaScript with type-checking via `bunx tsc`.
- **HTTP server**: Built-in Bun server (`Bun.serve`) plus minimal router abstraction.
- **Database**: PostgreSQL via `pg` client (or Bun’s built-in `bun:sqlite` adapter not suitable; use `pg` or `postgres` library).
- **Templating**: Server-side rendered HTML using `bun:htmx` or lightweight templating (e.g., template literals, or `eta` as optional dependency).
- **Password hashing**: Node `crypto` module with `scrypt` or `argon2` (if minimal, use `crypto.scrypt` with proper parameters).
- **JWT**: Implement using standard library (`crypto`, `TextEncoder`, `Buffer`) to avoid dependencies, or use `jose` if allowed.
- **Rate limiting**: In-memory token buckets using `Map` + intervals.

## 3. High-Level Architecture

```
+-----------------------+
| Bun HTTP Server       |
| - Router Middleware   |
+-----------------------+
          |
          v
+------------------------+
| Controllers (HTML/API) |
+------------------------+
          |
          v
+--------------------------+
| Services / Use Cases     |
| - AuthService            |
| - SessionService         |
| - UserService            |
| - AdminService           |
+--------------------------+
          |
          v
+-------------------------+
| Repositories            |
| - UserRepository        |
| - SessionRepository     |
| -> PostgreSQL           |
+-------------------------+
          |
          v
+-------------------------+
| PostgreSQL Database     |
+-------------------------+
          ^
          |
+-------------------------+
| In-memory Cache         |
| - Rate limiter state    |
| - CSRF tokens (optional)|
+-------------------------+
```

## 4. Data Model

### Tables (SQL)

- `users`: columns `id SERIAL`, `email_address`, `password_digest`, `role`, timestamps.
- `sessions`: columns `id UUID`, `user_id`, `ip_address`, `user_agent`, timestamps.
- Optional `password_resets`.

Migrations managed via SQL files executed by a simple Bun script or third-party tool (e.g., `drizzle-kit` if allowed).

## 5. HTTP Routing & Middleware

### 5.1 Routing

Implement a tiny router that maps method/path to handlers, e.g.,

```
router.get('/', homeController.index)
router.get('/sign_in', sessionsController.new)
router.post('/sign_in', sessionsController.create)
router.delete('/sign_out', sessionsController.destroy)
router.get('/sign_up', registrationsController.new)
router.post('/sign_up', registrationsController.create)

router.post('/api/auth/signin', apiAuthController.signIn)
router.post('/api/auth/verify', apiAuthController.verify)
router.post('/api/auth/refresh', apiAuthController.refresh)
router.delete('/api/auth/signout', apiAuthController.signOut)
router.get('/api/auth/user', apiAuthController.user)

router.get('/admin/users', adminController.list)
router.post('/admin/users/:id/toggle_role', adminController.toggleRole)
```

### 5.2 Middleware Components

- **Logging**: log request method, path, request ID.
- **Body parsing**: parse JSON/form bodies using `new Response(request).json()` or manual parsing.
- **CSRF protection**: for HTML forms, issue anti-CSRF token stored in signed cookie and hidden field.
- **Session extraction**: parse `session_id` cookie, load session to `request.context`.
- **JWT extraction**: read `oh_session` cookie or `Authorization` header for API requests.
- **Rate limiting**: implement per-IP bucket for `/sign_in` (HTML & API) and `/api/auth/signin`.

## 6. Services

### 6.1 AuthService

- `authenticate(email, password)` returns user if password matches (using `crypto.scrypt` derived key comparison).
- `generateJWT(user)` produces HS256 JWT with claims `userId`, `email`, `exp`, `iat`, `iss`.
- `verifyJWT(token)` loops verifying signature and expiry.

### 6.2 SessionService

- `createSession(userId, ip, userAgent)` inserts row, returns session ID.
- `destroySession(sessionId)` deletes session record.
- `getSession(sessionId)` returns session data.

### 6.3 UserService

- `createUser(email, password)` with validation.
- `getUserByEmail`, `getUserById`, `listUsers`, `toggleRole`.

### 6.4 AdminService

- `listSessionsByUser`, `revokeSession`.
- Potential streaming updates via SSE (optional, minimal version skip).

## 7. Security Considerations

### 7.1 Password Hashing

- Use `crypto.scrypt` (with `N=16384`, `r=8`, `p=1`, 32-byte key) and store salt+derived key as base64 string.
- Store as `salt:hash` format.

### 7.2 JWT Implementation

Manual encoding (example TypeScript snippet):

```ts
const header = { alg: 'HS256', typ: 'JWT' };
const payload = { userId: user.id, email: user.email, exp, iat, iss };
const secret = Bun.env.SECRET_KEY_BASE!;
const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const data = `${encode(header)}.${encode(payload)}`;
const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
return `${data}.${signature}`;
```

### 7.3 Cookies

- `session_id`: signed cookie referencing DB session.
- `oh_session`: JWT cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, `Domain=.oceanheart.ai`).
- Provide `clearCookie` helper.

### 7.4 CSRF

- Issue `csrf_token` cookie with signed random value; require matching hidden field in forms.
- For API endpoints, disable CSRF but require JWT or same-site cookie.

### 7.5 Rate Limiting

- Implement token bucket per IP (key `signin:${ip}`) using `Map` storing `tokens` and `lastRefill`.
- Refill tokens based on elapsed time.

## 8. Templates & Frontend

- Serve static assets (Tailwind build) from `public/` directory using Bun’s file serving.
- Use `html/template` equivalent via template literals or simple templating library.
- Shared layout with partial for auth status.

## 9. Database Layer

- Use `pg` client with connection pooling (Bun supports Node APIs).
- Repositories use parameterized queries to prevent SQL injection.
- Example repository method (TypeScript):

```ts
const user = await db.query(`SELECT * FROM users WHERE email_address = $1`, [email]);
```

## 10. Configuration & Environment

Environment variables:
- `PORT` (default 3000)
- `DATABASE_URL`
- `SECRET_KEY_BASE`
- `COOKIE_DOMAIN`
- `JWT_ISSUER`
- `RATE_LIMIT_SIGNIN_ATTEMPTS`
- `RATE_LIMIT_SIGNIN_WINDOW`

Load via `Bun.env`. Provide `config.ts` module exporting typed values.

## 11. Deployment

### 11.1 Process

- Build step: `bun install && bun build` (if bundling TypeScript).
- Run: `bun run src/server.ts` (or compiled output).
- Provide Dockerfile (alpine base, install Bun, copy code, run `bun install` and `bun run`).
- Render start command: `bun run start`.
- Health check endpoint `/up` returning 200 and optionally verifying DB connection.

### 11.2 Deployment Options

- **Render Web Service**: Container build with Bun image; set `DATABASE_URL` and secrets in dashboard.
- **Bun Deploy / Fly.io**: Use Bun’s deploy service or Fly; similar container approach; persistent Postgres required.
- **Serverless (Cloudflare Workers)**: Not ideal due to reliance on Postgres; would need `pg` adapter and whitelisted IPs.
- **Standalone VM**: Install Bun, configure systemd service running `bun run start`.

### 11.3 Deployment Considerations

- **Connections**: Postgres pool size must align with Render tier; use environment variable to configure.
- **Migrations**: Provide `bun run migrate` script; run before server start.
- **Scaling**: In-memory rate limiter assumes single instance; for multiple instances, use Redis or edge rate limiting.
- **Logging**: Send structured logs to STDOUT (JSON). Add log rotation on VM deployments.
- **TLS**: Typically offloaded to platform; if self-hosting, run behind Caddy/Nginx.

## 12. Testing Strategy

- **Unit tests**: Use Bun’s built-in test runner for services and utilities.
- **Integration tests**: Spin up in-memory server via `Bun.serve` + supertest-like helper (or direct fetch) hitting endpoints; use test DB.
- **Security tests**: Validate JWT tampering, CSRF token enforcement, cookie flags.
- **End-to-end**: Reuse shell scripts pointing to Bun server (`BASE_URL` override).

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bun library ecosystem less mature | Potential missing packages | Keep dependencies minimal, write custom middleware |
| In-memory rate limiting not distributed | Multi-instance scaling issues | Introduce Redis or edge rate limiting before scaling |
| JWT implementation errors | Security vulnerabilities | Add comprehensive tests, consider using `jose` library |
| CSRF handling complexity in Bun | Potential mismatches vs Rails flows | Document form token process, test thoroughly |
| Password hashing using scrypt | Potential misconfiguration | Follow OWASP guidelines for scrypt parameters |

## 14. Roadmap

1. **Milestone 1**: Core API, JWT issuance, session management, basic HTML forms.
2. **Milestone 2**: Admin interface, rate limiting, CSRF protection.
3. **Milestone 3**: Password reset flows, improved session broadcast (SSE/WebSocket optional).
4. **Milestone 4**: Observability, deployment scripts, load testing.

## 15. Directory Structure (Proposed)

```
passport-bun/
  src/
    server.ts
    router.ts
    middleware/
    controllers/
    services/
    repositories/
    templates/
    utils/
  public/
    assets/
  db/
    migrations/
  scripts/
    migrate.ts
  tests/
  bunfig.toml
  package.json
```

## 16. Dependencies (Minimal)

- `pg` (Postgres driver) — required for database access.
- `bun-types` or TypeScript types for Bun/Node if writing in TS.
- Optional: `jose` for JWT handling (otherwise use manual implementation).
- Optional: `eta` or similar templating library; otherwise rely on template literals.
- Optional: `drizzle-kit` or custom migration runner if manual SQL migrations become cumbersome.

Everything else is built using Bun’s standard library modules (`crypto`, `URLPattern`, `Bun.file`) or hand-written utilities.
