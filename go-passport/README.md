# Go Passport Authentication Service

A Go-based authentication service that provides JWT-based authentication with HS256 signing, session management, and a glass morphism terminal UI theme. This service is functionally equivalent to the Rails Passport application while maintaining compatibility with existing authentication flows.

## Features

- **JWT Authentication**: HS256-signed JWT tokens with 1-week expiration
- **Session Management**: Database-backed sessions with IP and user agent tracking
- **Cross-Domain SSO**: Support for `.oceanheart.ai` domain cookies
- **Admin Interface**: User management and session monitoring
- **Rate Limiting**: Per-IP throttling on sensitive endpoints
- **CSRF Protection**: Synchronized token pattern for HTML forms
- **Glass Morphism UI**: Terminal-themed interface with clean aesthetics
- **Legacy Compatibility**: Supports both modern and legacy JWT claim formats

## Quick Start

### Prerequisites

- Go 1.23+
- PostgreSQL 12+
- Docker (optional)

### Environment Variables

```bash
PORT=10000                                    # Server port
DATABASE_URL=postgres://user:pass@host/db    # PostgreSQL connection string
SECRET_KEY_BASE=your-secret-key               # JWT signing key
COOKIE_DOMAIN=.oceanheart.ai                  # Cookie domain for SSO
ENVIRONMENT=development                       # Environment (development/production)
RUN_MIGRATIONS=true                          # Auto-run migrations on startup
```

### Development Setup

1. **Clone and setup**:
   ```bash
   git clone <repository>
   cd go-passport
   make deps
   ```

2. **Configure database**:
   ```bash
   createdb passport_dev
   export DATABASE_URL="postgres://localhost/passport_dev?sslmode=disable"
   export SECRET_KEY_BASE="dev-secret-key-change-in-production"
   ```

3. **Run development server**:
   ```bash
   make dev
   ```

4. **Visit application**:
   - Main app: http://localhost:10000
   - Health check: http://localhost:10000/up

### Production Deployment

#### Docker

```bash
# Build image
make docker-build

# Run container
docker run -p 10000:10000 \
  -e DATABASE_URL="postgres://user:pass@host/db" \
  -e SECRET_KEY_BASE="production-secret-key" \
  -e ENVIRONMENT="production" \
  go-passport:latest
```

#### Render

1. Connect repository to Render
2. Set environment variables in dashboard
3. Deploy as Web Service

## Architecture

### Project Structure

```
go-passport/
├── cmd/server/          # Application entry point
├── internal/
│   ├── auth/           # JWT and password handling
│   ├── config/         # Configuration and database
│   ├── handlers/       # HTTP request handlers
│   ├── middleware/     # HTTP middleware
│   ├── models/         # Data models
│   ├── repository/     # Database access layer
│   └── service/        # Business logic layer
├── web/
│   ├── templates/      # HTML templates
│   └── static/         # Static assets
├── db/migrations/      # Database migrations
└── scripts/           # Utility scripts
```

### Key Components

- **JWT Service**: HS256 token generation and validation with legacy support
- **Authentication Service**: Sign-up, sign-in, session management
- **User Service**: User CRUD operations and role management
- **Session Service**: Session lifecycle and cleanup
- **Rate Limiter**: Token bucket algorithm with in-memory storage
- **CSRF Middleware**: Synchronizer token pattern for forms

## API Endpoints

### HTML Routes

- `GET /sign_in` - Login form
- `POST /sign_in` - Process login
- `GET /sign_up` - Registration form
- `POST /sign_up` - Create account
- `POST /sign_out` - Logout
- `GET /` - Dashboard

### API Routes

- `POST /api/auth/signin` - API login (returns JWT)
- `DELETE /api/auth/signout` - API logout
- `POST /api/auth/verify` - Validate JWT token
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/user` - Get current user

### Admin Routes

- `GET /admin` - Admin dashboard
- `GET /admin/users` - List users (paginated, searchable)
- `GET /admin/users/{id}` - User details
- `POST /admin/users/{id}/toggle_role` - Toggle admin/user role
- `DELETE /admin/users/{id}` - Delete user
- `DELETE /admin/sessions/{id}` - Terminate session

## Authentication Flow

### JWT Authentication

1. User signs in with email/password
2. Server validates credentials
3. Server generates HS256-signed JWT (1-week expiration)
4. JWT stored in `oh_session` cookie
5. Session record created in database
6. Subsequent requests validated against JWT

### Session Cookies

- `oh_session`: JWT token for API clients
- `session_id`: Database session ID for HTML flows
- `jwt_token`: Legacy cookie name (supported for migration)

### Cookie Attributes

- `Domain`: `.oceanheart.ai` (production) / `.lvh.me` (development)
- `HttpOnly`: true (prevents XSS)
- `Secure`: true (production only)
- `SameSite`: Lax (CSRF protection)

## Security Features

### Rate Limiting

- Sign-in endpoint: 10 attempts per 3 minutes per IP
- Token bucket algorithm with automatic cleanup
- Configurable limits via environment variables

### CSRF Protection

- Synchronizer token pattern for HTML forms
- HMAC-signed tokens with 24-hour expiration
- Disabled for API endpoints (use JWT instead)

### Password Security

- bcrypt hashing with default cost
- Minimum 6-character requirement
- Configurable strength validation

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email_address VARCHAR(255) UNIQUE NOT NULL,
    password_digest TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Sessions Table

```sql
CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Development

### Available Commands

```bash
make build        # Build application
make run          # Run application
make dev          # Development mode with hot reload
make test         # Run tests
make clean        # Clean build artifacts
make deps         # Download dependencies
make migrate      # Run database migrations
make docker-build # Build Docker image
make docker-run   # Run Docker container
```

### Testing

```bash
# Run all tests
make test

# Run tests with coverage
make test-coverage

# View coverage report
open coverage.html
```

### Code Quality

```bash
# Format code
make fmt

# Lint code
make lint

# Security scan
make security
```

## Deployment Considerations

### Environment Configuration

- **Development**: Uses `.lvh.me` domain for local testing
- **Production**: Uses `.oceanheart.ai` domain with secure cookies
- **Secrets**: Store `SECRET_KEY_BASE` in secure secret manager

### Scaling

- **Single Instance**: Uses in-memory rate limiting and caching
- **Multiple Instances**: Consider Redis for distributed rate limiting
- **Database**: Use connection pooling and read replicas for high traffic

### Monitoring

- **Health Check**: `/up` endpoint for load balancer probes
- **Logging**: Structured JSON logs to stdout
- **Metrics**: Basic metrics via expvar (optional)

## Migration from Rails

### JWT Compatibility

- Supports both `userId` and `user_id` claim formats
- Honors existing cookie names (`oh_session`, `jwt_token`)
- Uses same JWT secret key as Rails application
- Maintains 1-week token expiration

### Database Migration

- Schema matches Rails ActiveRecord structure
- Supports existing user and session data
- Automatic migrations on startup (optional)

### Cookie Behavior

- Identical cookie names and domains
- Same security attributes and expiration
- Cross-domain SSO compatibility maintained

## License

[Add license information]

## Contributing

[Add contribution guidelines]