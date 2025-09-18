# Go Passport Authentication Service — Technical Specification

## 1. Objectives & Scope

Build a Go-based authentication service that is functionally equivalent to the existing Rails Passport application. The system must:

- Provide user sign-up, sign-in, sign-out, password reset, and session management.
- Issue HS256 JSON Web Tokens (JWTs) for API clients and maintain secure cookies for browser flows.
- Support Single Sign-On (SSO) across Oceanheart subdomains, matching the cookie behavior of the Rails app.
- Expose RESTful API endpoints and server-rendered HTML views for authentication flows.
- Include an admin interface for managing users and sessions.
- Maintain rate limiting on sensitive endpoints (sign-in) with per-IP throttling.
- Be deployable on Render using Postgres as the primary datastore, without relying on external services beyond standard Go libraries (minimal dependencies are acceptable where absolutely required, e.g., password hashing or HTML templating).

## 2. High-Level Architecture

```
+--------------------+
| HTTP Router        |
| (net/http + mux)   |
+--------------------+
          |
          v
+------------------------+
| Handlers (REST & HTML) |
+------------------------+
          |
          v
+--------------------------+
| Service Layer            |
| - AuthService            |
| - UserService            |
| - SessionService         |
| - AdminService           |
+--------------------------+
          |
          v
+-------------------------+
| Data Access Layer       |
| - Repositories          |
| - database/sql + pgx    |
+-------------------------+
          |
          v
+-------------------------+
| Postgres Database       |
+-------------------------+
          ^
          |
+-------------------------+
| Cache (in-memory)       |
| - Rate limiter buckets  |
| - Session cache (optional)
+-------------------------+
```

Key principles:
- Separation of concerns: HTTP handlers stay thin; business logic resides in services.
- Dependency injection via interfaces to allow unit testing with mocks.
- Config-driven behavior (environment variables) to match Rails configuration (domains, secrets, etc.).

## 3. Technology Choices

- **Language**: Go 1.23+
- **Web framework**: `net/http` with a lightweight router (`github.com/go-chi/chi/v5` or custom mux). If dependencies must be minimal, standard `http.ServeMux` plus middleware helpers.
- **Database**: PostgreSQL accessed via `database/sql` and `lib/pq` or `pgx` stdlib compatibility layer.
- **Templates**: `html/template` for server-rendered pages (sign-in/up, admin).
- **Password hashing**: `golang.org/x/crypto/bcrypt` (only non-stdlib dependency besides router/pg driver if allowed).
- **JWT**: Build using `crypto/hmac` and `encoding/base64` to avoid external libs, or use `github.com/golang-jwt/jwt/v5` if permitted.
- **Configuration**: Environment variables with fallback (e.g., `SECRET_KEY_BASE`, `COOKIE_DOMAIN`).
- **Rate limiting**: Custom token bucket per IP using `time` and `sync` packages; no external cache.

## 4. Data Model

Database schema mirrors Rails models:

### Tables

1. `users`
   - `id SERIAL PRIMARY KEY`
   - `email_address CITEXT UNIQUE NOT NULL`
   - `password_digest TEXT NOT NULL`
   - `role TEXT CHECK (role IN ('user', 'admin')) DEFAULT 'user'`
   - `created_at TIMESTAMP WITH TIME ZONE NOT NULL`
   - `updated_at TIMESTAMP WITH TIME ZONE NOT NULL`

2. `sessions`
   - `id UUID PRIMARY KEY`
   - `user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`
   - `ip_address INET`
   - `user_agent TEXT`
   - `created_at TIMESTAMP WITH TIME ZONE NOT NULL`
   - `updated_at TIMESTAMP WITH TIME ZONE NOT NULL`

Optional tables (if matching Rails feature set):
- `solid_queue_*` equivalents not required; Go service can use goroutines for background tasks.
- `password_resets` for password recovery (token, expiry).

Migrations will be managed via SQL files run during deploy (e.g., simple Go migration runner reading `db/migrations` directory).

## 5. Core Components

### 5.1 HTTP Server & Middleware

- Custom middleware stack implementing:
  - Request logging with correlation IDs.
  - Secure headers (HSTS, Content-Security-Policy similar to Rails). Use `net/http` wrappers.
  - CSRF protection for HTML forms (synchronizer token stored in secure cookie).
  - Authentication extraction (reads session cookies/JWT and populates request context).
  - Rate limiting (per IP/per endpoint bucket maps).

### 5.2 Routing

Example routes:

```
GET    /                 -> HomeHandler (shows auth status)
GET    /sign_in          -> Sessions.New
POST   /sign_in          -> Sessions.Create
DELETE /sign_out         -> Sessions.Destroy
GET    /sign_up          -> Registrations.New
POST   /sign_up          -> Registrations.Create
POST   /password/reset   -> Passwords.Create
PATCH  /password/reset   -> Passwords.Update

API namespace (/api/auth):
POST   /signin           -> API.SignIn (returns JSON + sets cookie)
POST   /verify           -> API.Verify (JWT validation)
POST   /refresh          -> API.Refresh (issue new JWT/cookie)
DELETE /signout          -> API.SignOut
GET    /user             -> API.CurrentUser

Admin namespace (/admin):
GET    /users            -> Admin.ListUsers
GET    /users/{id}       -> Admin.ShowUser
POST   /users/{id}/role  -> Admin.ToggleRole
```

Router groups apply middleware stacks for HTML vs API requests (CSRF vs JSON, etc.).

### 5.3 Services

- **AuthService**
  - `Authenticate(email, password) (*User, error)`
  - `StartSession(userID, ip, ua) (Session, error)`
  - `TerminateSession(sessionID string) error`
  - `GenerateJWT(user User) (string, error)` using HS256 with secret key.

- **UserService**
  - `CreateUser(params)` with validation, password hashing.
  - `GetByEmail`, `GetByID`, `ListUsers`, `ToggleRole`.

- **SessionService**
  - `GetByID`, `FindByCookie`, `Destroy`.
  - Maintains session log for admin view.

- **PasswordResetService** (optional): token generation, email dispatch stub.

### 5.4 Repositories

Use `database/sql` with context-aware methods:

```
type UserRepository interface {
    FindByEmail(ctx context.Context, email string) (*User, error)
    FindByID(ctx context.Context, id int64) (*User, error)
    Create(ctx context.Context, user *User) error
    UpdateRole(ctx context.Context, id int64, role string) error
}
```

Session repository handles UUID IDs. Use `github.com/google/uuid` or implement custom generator via `crypto/rand`.

### 5.5 Session & Cookie Handling

- Set `session_id` cookie (signed/encrypted) for HTML flows:
  - Use HMAC (SHA256) signing to avoid extra dependencies.
  - Cookie attributes: `Secure`, `HttpOnly`, `SameSite=Lax`, `Domain=.oceanheart.ai`.
- Set `oh_session` cookie with JWT token for cross-domain API clients.
- Provide `clearCookie` helper to delete cookies by setting past expiry.

### 5.6 JWT Implementation

- Claims:
  - `userId`, `email`, `exp`, `iat`, `iss`
- Use HMAC SHA256 with secret from `SECRET_KEY_BASE`.
- Implement encode/decode manually using `encoding/json`, `encoding/base64`, `crypto/hmac`, `crypto/sha256` to meet “minimal dependencies”. Include helper functions to parse and validate signature/expiry.

### 5.7 Rate Limiting

- Implement in-memory token bucket per IP + endpoint key (e.g., `sign_in:{clientIP}`).
- Data structure: `map[string]*bucket`, guarded by `sync.Mutex`.
- Refill tokens every interval using `time.Since(lastRefill)` logic.
- Return HTTP 429 when limit exceeded.
- Persist if necessary (future improvement) via Redis (not in initial scope).

### 5.8 CSRF Protection

- For HTML forms: generate random token stored in secure cookie (`csrf_token`) and hidden form field. Validate on POST.
- For API requests: rely on JWT + `SameSite` cookies; disable CSRF enforcement for API paths.

### 5.9 Templates & UI

- Use Go `html/template` with layout partials to reproduce essential Rails views:
  - `layouts/main.tmpl`
  - `sessions/new.tmpl`
  - `registrations/new.tmpl`
  - `shared/auth_status.tmpl`
  - Admin table views.
- Reuse existing Tailwind assets by serving compiled CSS from `public/assets` directory.

### 5.10 Admin Interface

- Authentication requirement: only `role == 'admin'` allowed.
- Provide summary pages:
  - List users with filters, ability to toggle roles.
  - List active sessions per user.
- Implement server-side pagination via query params.

## 6. Operational Concerns

### 6.1 Configuration

Environment variables (with defaults where possible):

- `PORT` (default 10000 for Render)
- `DATABASE_URL`
- `SECRET_KEY_BASE`
- `COOKIE_DOMAIN` (`.oceanheart.ai`)
- `JWT_ISSUER` (`passport.oceanheart.ai`)
- `RATE_LIMIT_SIGNIN` (e.g., `10` attempts per 3 minutes)
- `CSRF_SECRET` (used for cookie signing if separate from SECRET_KEY_BASE)

Configuration loader reads env vars at startup, fails fast when required secrets missing.

### 6.2 Startup Sequence

1. Load configuration.
2. Initialize logger.
3. Connect to Postgres using connection pool.
4. Run migrations (optional flag `RUN_MIGRATIONS=true`).
5. Instantiate repositories, services, middleware.
6. Build router and start HTTP server with graceful shutdown (context cancellation on SIGTERM).

### 6.3 Deployment

- Provide Dockerfile based on `golang:1.23-alpine` for build stage and `distroless` or `alpine` for run stage.
- Health endpoint `/up` returns 200.
- Observability:
  - Structured logs (JSON) using `log/slog`.
  - Basic metrics endpoint (optional) using `expvar`.

### 6.4 Deployment Options

- **Render Web Service (default)**: Build container via Dockerfile; mount persistent Postgres via `DATABASE_URL`; rely on Render environment variables for secrets.
- **Kubernetes**: Package as container image, deploy using Deployment + Service; configure ConfigMaps/Secrets for configuration; use Horizontal Pod Autoscaler if rate limiter replaced with distributed store.
- **Standalone VM/EC2**: Compile static binary (`CGO_ENABLED=0`), run under systemd with EnvFile for configuration; use Nginx for TLS termination.
- **Serverless (Cloud Run/Fly.io)**: Possible due to statelessness; ensure minimum concurrency set to 1 if relying on in-memory rate limiting.

### 6.5 Deployment Considerations

- **Stateful components**: Sessions stored in Postgres; ensure migrations run before starting new revision.
- **Secrets management**: `SECRET_KEY_BASE`, `CSRF_SECRET`, and database credentials must be injected via secret manager or Render dashboard; never baked into image.
- **Scaling**: In-memory rate limiter and cache assume single instance; for horizontal scaling, introduce Redis or swap to per-request rate limiting using reverse proxy (e.g., Cloudflare) before duplicating instances.
- **Health checks**: `/up` should include DB connectivity verification if deployed behind load balancer; consider readiness probe separate from liveness.
- **Logging**: Configure structured logs to STDOUT for Render; add log rotation if running on VM.
- **TLS**: Offload to Render/ingress; if running standalone, use Caddy or Nginx with Let’s Encrypt.

## 7. Testing Strategy

- **Unit tests**: Service layer with mocks for repositories.
- **Integration tests**: Use `net/http/httptest` to hit handlers with in-memory DB (sqlite with go-sqlite3) or Postgres test container.
- **End-to-end**: Reuse shell scripts (similar to `test/auth-test.sh`) calling the Go service.
- **Security tests**: Ensure JWT signature validation, cookie flags, CSRF token checks.

## 8. Risks & Mitigations

- **Missing Solid Cable equivalent**: Real-time UI updates via Turbo Streams will be limited; consider SSE or WebSocket using `nhooyr.io/websocket` if necessary in future.
- **In-memory rate limiter**: Not distributed-safe. Mitigate by keeping single instance or later introducing Redis.
- **Manual JWT implementation errors**: Extensive unit tests covering encode/decode, signature tampering, expiry.
- **Password reset email**: Requires SMTP integration; initial version can log tokens and rely on dashboard operations.

## 9. Roadmap & Phases

1. **Phase 1 – Core Auth API**
   - Users table, sign-up/in, JWT issuance, sessions table, API endpoints.
   - Basic HTML forms (sign-in/up).

2. **Phase 2 – Admin & Session Management**
   - Admin views, session termination, role toggling.
   - Rate limiting, CSRF.

3. **Phase 3 – Parity Features**
   - Password reset flows, remember-me tokens, integration with other Oceanheart apps.
   - WebSocket-based live updates if required.

4. **Phase 4 – Hardening**
   - QA, performance testing, load tests.
   - Observability improvements, structured logging, metrics.

## 10. Appendix

### 10.1 Directory Structure (Proposed)

```
go-passport/
  cmd/
    server/
      main.go
  internal/
    config/
    http/
      middleware/
      handlers/
    service/
    repository/
    auth/
      jwt.go
      password.go
    rate limiter/
  web/
    templates/
    assets/
  db/
    migrations/
  scripts/
    migrate.sh
    run.sh
  Makefile
```

### 10.2 Minimal Dependencies List

- `github.com/go-chi/chi/v5` (routing) — optional; can be replaced with stdlib.
- `github.com/jackc/pgx/v5/stdlib` (Postgres driver)
- `golang.org/x/crypto/bcrypt` (password hashing)
- Optional: `github.com/google/uuid` for UUID generation (otherwise implement custom using `crypto/rand`).

Everything else relies on the Go standard library.
