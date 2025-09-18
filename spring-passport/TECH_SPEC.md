# Spring Passport Authentication Service — Technical Specification

## 1. Goal & Scope

Rebuild the existing Oceanheart Passport Rails authentication server using the Spring (Boot) framework, achieving functional parity:

- Browser-based authentication flows (sign-up, sign-in, sign-out) with secure cookies and Turbo-like UI updates.
- RESTful API endpoints issuing HS256 JWTs for SSO across Oceanheart subdomains.
- Admin interface for user/session management.
- Rate limiting and CSRF protection comparable to the Rails app.
- Deployment on Render with PostgreSQL as the persistent store.

## 2. Technology Stack

- **Java**: 21 LTS
- **Framework**: Spring Boot 3.x (Spring MVC, Spring Data JPA, Spring Security)
- **Database**: PostgreSQL 16 (via `org.postgresql:postgresql` driver)
- **ORM**: Hibernate (JPA implementation)
- **Templating**: Thymeleaf (server-side HTML forms/views)
- **Security**: Spring Security with custom authentication provider and JWT support
- **Rate limiting**: Bucket4j or Resilience4j; if minimizing dependencies, use in-memory implementation with `ConcurrentHashMap`
- **Build/Packaging**: Gradle or Maven; prefer Gradle for convention and quicker builds
- **Deployment**: fat JAR (`spring-boot:run` local; Docker for Render)

## 3. High-Level Architecture

```
+----------------------------------+
| Spring Boot Application          |
|                                  |
|  +--------------------------+    |
|  | Web Layer (Controllers)  |    |
|  +--------------------------+    |
|              |                   |
|  +--------------------------+    |
|  | Service Layer            |    |
|  | - AuthService            |    |
|  | - UserService            |    |
|  | - SessionService         |    |
|  | - AdminService           |    |
|  +--------------------------+    |
|              |                   |
|  +--------------------------+    |
|  | Persistence Layer (JPA)  |    |
|  +--------------------------+    |
|              |                   |
|  +--------------------------+    |
|  | PostgreSQL Database      |    |
|  +--------------------------+    |
+----------------------------------+
```

Supporting components:
- Security configuration (JWT filters, cookie auth, CSRF tokens)
- Rate limiter (filter/interceptor)
- Event publishing for live updates (WebSocket or SSE)

## 4. Data Model

### Entities

1. **User** (`users` table)
   - `id (UUID or bigint)`
   - `emailAddress` (unique, lowercased)
   - `passwordHash`
   - `role` enum (`USER`, `ADMIN`)
   - `createdAt`, `updatedAt`

2. **Session** (`sessions` table)
   - `id UUID`
   - `user` (ManyToOne)
   - `ipAddress`
   - `userAgent`
   - `createdAt`, `updatedAt`

3. **PasswordResetToken** (optional, for parity)
   - `token`
   - `user`
   - `expiresAt`

JPA repositories correspond to each entity, extending `JpaRepository` with custom methods (e.g., find by email).

## 5. Authentication & Authorization Design

### 5.1 Spring Security Configuration

- Stateless JWT-based authentication for API endpoints.
- Session cookie (`session_id`) for browser flows; relies on Spring Security session management (if using server sessions) or custom cookie verifying session IDs in DB.
- Security filter chain(s):
  - **Browser routes**: CSRF enabled, form login disabled, custom login/logout controllers.
  - **API routes**: CSRF disabled, JWT authentication filter runs before `UsernamePasswordAuthenticationFilter`.

### 5.2 Login Flow

1. User posts credentials (`/sign_in`).
2. `AuthService.authenticate` verifies user via `UserDetailsService`/custom service.
3. On success:
   - Create database session record (`Session` entity).
   - Issue JWT via `JwtService`.
   - Set cookies:
     - `session_id` (secure, HttpOnly, `SameSite=Lax`) referencing session record.
     - `oh_session` containing JWT.
4. Redirect to return URL or home.

### 5.3 Sign-Out

- `SessionsController#destroy` deletes session record, clears cookies, and broadcasts event to live views if applicable.

### 5.4 JWT Implementation

- Use `io.jsonwebtoken:jjwt-api` or keep dependencies minimal by handcrafting with `java.util.Base64`, `javax.crypto.Mac`.
- Claims: `userId`, `email`, `exp`, `iat`, `iss`.
- Keys: `SECRET_KEY_BASE` from environment (Base64 encoded or plain string).
- Provide `JwtService` with methods:
  - `String generateToken(User user)`
  - `Optional<UserClaims> validateToken(String token)`

## 6. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signin` | Authenticate, returns JWT + sets cookies |
| POST | `/api/auth/verify` | Validate JWT from cookie/header |
| POST | `/api/auth/refresh` | Issue new JWT based on session |
| DELETE | `/api/auth/signout` | Revoke session |
| GET | `/api/auth/user` | Return current user |

All responses mimic Rails API (JSON structure, HTTP codes).

## 7. HTML Controllers & Views

- `GET /sign_in`: Thymeleaf template with CSRF token embedded.
- `POST /sign_in`: handles form submission (same path as API variant but with HTML response).
- `GET /sign_up`: Form for new user registration.
- `POST /sign_up`: Creates user, logs in, redirects.
- `DELETE /sign_out`: Triggered via form or link with method override.
- Home page shows authentication status, similar to Rails `HomeController#index`.
- Admin views under `/admin` require `ROLE_ADMIN` authority.

Templates live under `src/main/resources/templates/`, share fragments for layout, nav, and forms.

## 8. Rate Limiting

- Implement `OncePerRequestFilter` or Spring `HandlerInterceptor` that checks a per-IP counter.
- Option A: Use Bucket4j (dependency) with in-memory cache; for minimal dependencies, implement custom token bucket using `ConcurrentHashMap<String, RateLimiter>` with atomic counters.
- Configuration via properties: `auth.rate-limit.sign-in.attempts=10`, `auth.rate-limit.sign-in.window=PT3M`.

## 9. Session Broadcasting & Live Updates

- Rails uses Turbo Streams; replicate with Spring WebSocket (STOMP) or Server-Sent Events.
- Minimal approach: on session changes, issue events through `SseEmitter` to subscribed admin dashboards.
- Alternatively, drop live updates initially; reload page manually.

## 10. Configuration & Environment

Use Spring Boot configuration properties (e.g., `application.yml`):

```
passport:
  cookie-domain: .oceanheart.ai
  jwt:
    issuer: passport.oceanheart.ai
    secret: ${SECRET_KEY_BASE}
  rate-limit:
    sign-in:
      attempts: 10
      window: PT3M
```

Environment variables set via Render (matching Rails setup).

## 11. Deployment

- Dockerfile multi-stage build:
  1. Build stage: `gradle build` producing `passport.jar`.
  2. Run stage: `eclipse-temurin:21-jre`.
- Render service start command: `java -jar passport.jar`.
- Health check: `GET /up` returning 200.

## 11.1 Deployment Options

- **Render Web Service**: Build container image via Dockerfile, leverage Render-managed Postgres and environment variables.
- **Kubernetes**: Package as container, deploy with Deployment + Service; use ConfigMaps for non-secret config and Secrets for sensitive values; optional Ingress for TLS.
- **Heroku / Railway**: Use buildpack or container registry; rely on platform-provided Postgres.
- **On-prem / VM**: Install Java 21 runtime, copy fat JAR, run under systemd with environment file.
- **Serverless (Cloud Run, AWS App Runner)**: Suitable due to stateless request handling; ensure minimum instances >0 to keep rate limiter state warm.

## 11.2 Deployment Considerations

- **Database migrations**: Execute Flyway/Liquibase migrations during boot; ensure only one instance runs migrations at a time (Flyway locks handle this).
- **Secrets**: Inject `SECRET_KEY_BASE`, DB credentials, CSRF secret via secret manager; avoid storing in `application.yml`.
- **Scaling**: In-memory rate limiter and session cache require sticky sessions or a distributed store when scaling horizontally; add Redis or rate limiting at edge before scaling out.
- **Session persistence**: Sessions reside in Postgres; confirm connection pool size supports concurrent admin actions; configure Spring Session if moving to Redis later.
- **TLS termination**: Usually handled by platform (Render, ingress); if self-managing, configure reverse proxy like Nginx or Spring Boot’s HTTPS support.
- **Logging & Monitoring**: Use JSON logging (`logging.pattern.console`) for platform aggregation; expose actuator endpoints `/actuator/health` and `/actuator/metrics` if observability needed.

## 12. Testing Strategy

- **Unit Tests**: JUnit 5 + Mockito for service layer, JWT, rate limiter.
- **Integration Tests**: Spring Boot Test with `@SpringBootTest`, `@AutoConfigureMockMvc` hitting endpoints using embedded H2 DB configured to behave like Postgres (or Testcontainers/PostgreSQL if allowed).
- **Security Tests**: Validate CSRF tokens, cookie flags, JWT signature tampering.
- **End-to-End**: Reuse shell scripts for API (adjust base URL).

## 13. Migration & Parity Considerations

- Database schema: Use Flyway or Liquibase to manage migrations (e.g., `V1__create_users.sql`, `V2__create_sessions.sql`).
- Password hashing: Use BCrypt with same cost factor as Rails to facilitate migrating hashed passwords if needed (possible with identical algorithm).
- JWT secret: reuse the same secret key to maintain trust across services.
- Cookie naming and domain must match existing clients’ expectations (`session_id`, `oh_session`).

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Session broadcast parity | Admin dashboards may lack real-time updates | Deliver SSE-based updates in later iteration |
| Rate limiter distribution | In-memory limiter doesnt scale horizontally | Acceptable for single Render instance; plan Redis integration in future |
| Password compatibility | Rails hashed passwords using bcrypt | Ensure Spring uses same bcrypt cost factor (e.g., strength 12) |
| JWT drift | Custom claims mismatched | Mirror payload keys (`userId`, `email`) exactly |
| CSRF integration | Springs defaults differ from Rails | Explicitly configure CSRF tokens and hidden fields in forms |

## 15. Roadmap

1. **Milestone 1: Core API + JWT**
   - Entities, repositories, AuthService, JWT issuance/validation, API endpoints.
2. **Milestone 2: HTML Flows + Sessions**
   - Thymeleaf views, CSRF, session cookies, sign-in/out UI.
3. **Milestone 3: Admin & Rate Limiting**
   - Admin controllers, rate limiting filter, SSE for session updates.
4. **Milestone 4: Hardening & Deployment**
   - Tests, Flyway migrations, Dockerization, Render deploy.

## 16. Appendix

### 16.1 Directory Layout (Gradle project)

```
spring-passport/
  build.gradle
  settings.gradle
  src/
    main/
      java/com/oceanheart/passport/
        PassportApplication.java
        config/
          SecurityConfig.java
          WebConfig.java
          RateLimitConfig.java
        controller/
          HomeController.java
          SessionsController.java
          RegistrationsController.java
          ApiAuthController.java
          Admin/
        service/
          AuthService.java
          UserService.java
          SessionService.java
          JwtService.java
        domain/
          User.java
          Session.java
        repository/
          UserRepository.java
          SessionRepository.java
      resources/
        application.yml
        templates/
          layout.html
          sessions/
          registrations/
          admin/
        static/
          css/
          js/
    test/
      java/... (JUnit tests)
      resources/
```

### 16.2 Minimal Dependencies (Gradle)

```gradle
dependencies {
  implementation 'org.springframework.boot:spring-boot-starter-web'
  implementation 'org.springframework.boot:spring-boot-starter-security'
  implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
  implementation 'org.springframework.boot:spring-boot-starter-thymeleaf'
  implementation 'org.postgresql:postgresql'
  implementation 'io.jsonwebtoken:jjwt-api'
  runtimeOnly 'io.jsonwebtoken:jjwt-impl'
  runtimeOnly 'io.jsonwebtoken:jjwt-jackson'
  // Optional: bucket4j-spring-boot-starter for rate limiting

  testImplementation 'org.springframework.boot:spring-boot-starter-test'
  testImplementation 'org.springframework.security:spring-security-test'
}
```
