# Spring Passport Authentication Service - PRD

## Executive Summary

Rebuild the existing Oceanheart Passport Rails authentication server using Spring Boot framework to achieve functional parity with improved performance and Java ecosystem benefits.

## Goals

- **Primary**: Create a Spring Boot authentication service with 100% feature parity to Rails Passport
- **Secondary**: Improve performance and resource utilization
- **Tertiary**: Establish Java-based authentication reference implementation

## Requirements

### Core Authentication Features

**Must Have:**
- HS256 JWT generation and validation with exact payload compatibility
- Browser-based authentication flows (sign-up, sign-in, sign-out)
- Secure cookie management (`session_id`, `oh_session`)
- RESTful API endpoints for SSO across Oceanheart subdomains
- Admin interface for user/session management
- Rate limiting (10 attempts per 3 minutes)
- CSRF protection for HTML forms
- PostgreSQL persistence with JPA/Hibernate

**Should Have:**
- Real-time session updates via SSE/WebSocket
- Flyway database migrations
- Docker containerization for Render deployment
- Health check endpoint (`/up`)

**Could Have:**
- Redis integration for distributed rate limiting (future)
- Enhanced monitoring/metrics

### API Endpoints (Exact Compatibility Required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signin` | Authenticate, returns JWT + sets cookies |
| POST | `/api/auth/verify` | Validate JWT from cookie/header |
| POST | `/api/auth/refresh` | Issue new JWT based on session |
| DELETE | `/api/auth/signout` | Revoke session |
| GET | `/api/auth/user` | Return current user |

### HTML Routes

- `GET /sign_in` - Sign in form with CSRF token
- `POST /sign_in` - Handle form submission
- `GET /sign_up` - Registration form  
- `POST /sign_up` - Create user and login
- `DELETE /sign_out` - Sign out handler
- `GET /` - Home page with auth status
- `GET /admin/*` - Admin interface (requires ADMIN role)

### Data Model

**User Entity:**
- `id` (UUID/bigint)
- `emailAddress` (unique, lowercase)
- `passwordHash` (BCrypt strength 12)
- `role` (USER/ADMIN enum)
- `createdAt`, `updatedAt`

**Session Entity:**
- `id` (UUID)
- `user` (ManyToOne relationship)
- `ipAddress`
- `userAgent`
- `createdAt`, `updatedAt`

### Security Requirements

**JWT Configuration:**
- Algorithm: HS256
- Claims: `userId`, `email`, `exp`, `iat`, `iss` (camelCase format)
- Secret: Environment variable `SECRET_KEY_BASE`
- Expiry: 1 week

**Cookie Configuration:**
- `session_id`: HttpOnly, Secure, SameSite=Lax
- `oh_session`: Contains JWT, same security flags
- Domain: `.oceanheart.ai` (production) / `.lvh.me` (development)

**Rate Limiting:**
- Sign-in endpoint: 10 attempts per 3 minutes per IP
- In-memory implementation with ConcurrentHashMap
- 429 status code on limit exceeded

### Technical Stack

- **Java**: 21 LTS
- **Framework**: Spring Boot 3.x
- **Database**: PostgreSQL 16
- **ORM**: JPA/Hibernate
- **Templating**: Thymeleaf
- **Security**: Spring Security
- **Build**: Gradle
- **Deployment**: Docker + Render

### Compatibility Requirements

**Critical for SSO:**
- JWT payload must match Rails format exactly
- Cookie names and domains must be identical
- API response formats must match Rails JSON structure
- HTTP status codes must align with Rails implementation
- CORS headers must allow credentials and expose Authorization header

### Non-Functional Requirements

**Performance:**
- Startup time < 30 seconds
- Memory usage < 512MB under normal load
- Response time < 200ms for auth endpoints

**Availability:**
- Health check endpoint for monitoring
- Graceful shutdown handling
- Database connection pooling

**Security:**
- All passwords hashed with BCrypt
- CSRF protection on HTML forms
- Secure cookie flags in production
- Input validation and sanitization

## Success Criteria

**Phase 1: Core API + JWT**
- All API endpoints functional
- JWT generation/validation working
- Database entities and repositories created
- Unit tests for critical components

**Phase 2: HTML Flows + Sessions**
- Thymeleaf templates rendering
- Form submissions working
- Session cookie management
- CSRF protection enabled

**Phase 3: Admin + Rate Limiting**
- Admin dashboard functional
- Rate limiting implemented
- SSE for session updates (optional)

**Phase 4: Production Ready**
- Docker containerization
- Flyway migrations
- Health checks
- Deployed to Render

## Out of Scope

- Password reset functionality (Phase 1)
- Multi-factor authentication
- OAuth/SAML integration
- Advanced analytics/reporting
- Mobile app specific features

## Risks & Mitigations

**High Risk:**
- JWT compatibility issues → Extensive testing with Rails tokens
- Session management differences → Mirror Rails behavior exactly
- CSRF token mismatch → Follow Spring Security defaults with Rails alignment

**Medium Risk:**
- Rate limiter scaling → Document Redis migration path
- Database migration conflicts → Use Flyway versioning
- Docker build issues → Multi-stage build with caching

## Dependencies

**External:**
- Render platform for deployment
- PostgreSQL database
- Existing Rails Passport for compatibility testing

**Internal:**
- Rails Passport source code for reference
- Existing JWT secret keys
- Domain configuration (.oceanheart.ai)

## Timeline

**No specific dates - organize by logical phases:**

1. **Setup Phase**: Project structure, dependencies, basic Spring Boot app
2. **Core Phase**: Entities, JWT service, API endpoints  
3. **Web Phase**: HTML controllers, Thymeleaf templates, CSRF
4. **Admin Phase**: Admin interface, rate limiting, session management
5. **Deploy Phase**: Docker, migrations, production deployment

## Acceptance Criteria

- [ ] All API endpoints return identical responses to Rails version
- [ ] JWT tokens are interchangeable between Rails and Spring versions
- [ ] Cookie-based authentication works across all Oceanheart subdomains
- [ ] Admin interface shows real-time session data
- [ ] Rate limiting prevents brute force attacks
- [ ] Docker container runs successfully on Render
- [ ] Health check endpoint responds correctly
- [ ] Database migrations execute without errors
- [ ] All unit and integration tests pass
- [ ] Security audit shows no critical vulnerabilities