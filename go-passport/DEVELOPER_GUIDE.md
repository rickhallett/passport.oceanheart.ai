# Go Passport Authentication Service - Developer Guide

A comprehensive guide for setting up, running, and developing the Go Passport authentication service.

## Table of Contents

1. [Prerequisites and Dependencies](#prerequisites-and-dependencies)
2. [Local Development Setup](#local-development-setup)
3. [Configuration Guide](#configuration-guide)
4. [Running the Application](#running-the-application)
5. [API Documentation](#api-documentation)
6. [Deployment Options](#deployment-options)
7. [Development Workflow](#development-workflow)
8. [Troubleshooting](#troubleshooting)

## Prerequisites and Dependencies

### Required Software

- **Go 1.23+** - The application is built with Go 1.23 and requires this version or newer
- **PostgreSQL 12+** - Database for user and session storage
- **Make** - For running development commands
- **Git** - Version control

### Optional Development Tools

- **Docker** - For containerized deployment and testing
- **golangci-lint** - Code linting (install via `make install-tools`)
- **gosec** - Security scanning (install via `make install-tools`)

### Database Requirements

- PostgreSQL server running locally or accessible remotely
- A database created for the application (e.g., `passport_dev`)
- Proper connection permissions for the Go application

## Local Development Setup

### 1. Clone and Initialize Project

```bash
# Navigate to the go-passport directory
cd /Users/richardhallett/Documents/code/oAI/passport.oceanheart.ai/go-passport

# Download Go dependencies
make deps
```

### 2. Database Setup

#### Option A: Local PostgreSQL

```bash
# Create development database
createdb passport_dev

# Create test database (optional)
createdb passport_test
```

#### Option B: Docker PostgreSQL

```bash
# Start PostgreSQL container
docker run --name passport-postgres \
  -e POSTGRES_DB=passport_dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15-alpine

# Wait for container to be ready
sleep 10
```

### 3. Environment Configuration

Create a `.env` file in the project root:

```bash
# Copy example environment file
cp .env.example .env

# Edit with your specific values
# DATABASE_URL, SECRET_KEY_BASE are required
```

### 4. Initialize Database

The application can automatically run migrations on startup:

```bash
# Run migrations manually
make migrate

# Or set RUN_MIGRATIONS=true in .env for automatic migrations
```

### 5. Start Development Server

```bash
# Start in development mode with hot reload
make dev
```

The application will be available at:
- **Main app**: http://localhost:10000
- **Health check**: http://localhost:10000/up
- **Admin interface**: http://localhost:10000/admin (requires admin user)

## Configuration Guide

### Environment Variables

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@localhost/passport_dev?sslmode=disable` |
| `SECRET_KEY_BASE` | JWT signing key (64+ characters) | `your-secret-key-base-change-in-production` |

#### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `10000` | Server port |
| `ENVIRONMENT` | `development` | Environment mode (`development`, `production`, `test`) |

#### Security Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CSRF_SECRET` | Uses `SECRET_KEY_BASE` | CSRF token signing key |
| `COOKIE_DOMAIN` | `.lvh.me` (dev), `.oceanheart.ai` (prod) | Cookie domain for SSO |

#### JWT Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_ISSUER` | `passport.oceanheart.ai` | JWT issuer claim |

#### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_SIGNIN` | `10` | Sign-in attempts per window |
| `RATE_LIMIT_SIGNIN_WINDOW` | `3m` | Rate limit time window |

#### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `RUN_MIGRATIONS` | `false` | Auto-run migrations on startup |

### Development vs Production Settings

#### Development
- Cookie domain: `.lvh.me` (works with `lvh.me` subdomains)
- Secure cookies: `false`
- Auto-migrations: typically `true`
- Detailed logging

#### Production
- Cookie domain: `.oceanheart.ai`
- Secure cookies: `true`
- Auto-migrations: typically `false` (run manually)
- Structured JSON logging

### Security Considerations

1. **SECRET_KEY_BASE**: Must be at least 64 characters, cryptographically secure
2. **Database**: Use SSL in production (`sslmode=require`)
3. **Cookies**: HTTPOnly, Secure (prod), SameSite=Lax
4. **CSRF**: Enabled for HTML forms, disabled for API endpoints
5. **Rate Limiting**: Configurable per-IP limits on authentication endpoints

## Running the Application

### Available Make Commands

```bash
# Development
make dev          # Run with hot reload and dev environment
make run          # Build and run production binary
make build        # Build binary to bin/passport

# Testing
make test         # Run all tests
make test-coverage # Run tests with coverage report

# Code Quality
make fmt          # Format Go code
make lint         # Run linter (requires golangci-lint)
make security     # Run security scan (requires gosec)

# Database
make migrate      # Run database migrations

# Docker
make docker-build # Build Docker image
make docker-run   # Run Docker container

# Utilities
make clean        # Remove build artifacts
make deps         # Download and tidy dependencies
make help         # Show available commands
```

### Development Mode

The `make dev` command runs the application with:
- Automatic migrations enabled
- Development-specific environment variables
- Hot reload on file changes
- Detailed logging

```bash
make dev
```

### Production Mode

```bash
# Build binary
make build

# Set production environment variables
export ENVIRONMENT=production
export DATABASE_URL="postgres://user:pass@host/db?sslmode=require"
export SECRET_KEY_BASE="production-secret-key"

# Run binary
./bin/passport
```

### Using Docker

```bash
# Build Docker image
make docker-build

# Run with Docker
docker run -p 10000:10000 \
  -e DATABASE_URL="postgres://user:pass@host/db" \
  -e SECRET_KEY_BASE="production-secret-key" \
  -e ENVIRONMENT="production" \
  go-passport:latest
```

## API Documentation

### Authentication Flow

1. **Sign In**: User submits email/password
2. **Validation**: Server validates credentials
3. **JWT Generation**: HS256-signed JWT with 1-week expiration
4. **Cookie Setting**: JWT stored in `oh_session` cookie
5. **Session Creation**: Database session record created

### HTML Routes

#### Public Routes
```http
GET /                    # Dashboard (shows user info if authenticated)
GET /sign_in            # Login form
POST /sign_in           # Process login (rate limited)
GET /sign_up            # Registration form  
POST /sign_up           # Create account
POST /sign_out          # Logout
DELETE /sign_out        # Logout (alternative method)
```

#### Admin Routes (requires admin role)
```http
GET /admin                           # Admin dashboard
GET /admin/users                     # List users (paginated, searchable)
GET /admin/users/{id}               # User details
POST /admin/users/{id}/toggle_role  # Toggle admin/user role
DELETE /admin/users/{id}            # Delete user
DELETE /admin/sessions/{sessionId}  # Terminate session
```

### API Routes

#### Authentication API
```http
POST /api/auth/signin    # API login (returns JWT)
DELETE /api/auth/signout # API logout
POST /api/auth/verify    # Validate JWT token
POST /api/auth/refresh   # Refresh JWT token
GET /api/auth/user       # Get current user
```

### Request/Response Examples

#### Sign In (HTML)
```http
POST /sign_in
Content-Type: application/x-www-form-urlencoded

email=user@example.com&password=secret123&_csrf_token=abc123
```

Response: 302 redirect to `/` with `oh_session` cookie set

#### Sign In (API)
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secret123"
}
```

Response:
```json
{
  "success": true,
  "message": "Signed in successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Get Current User
```http
GET /api/auth/user
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Cookie Behavior

- **oh_session**: Primary JWT cookie for API clients
- **session_id**: Database session ID for HTML flows  
- **jwt_token**: Legacy cookie name (maintained for compatibility)

Cookie attributes:
- `Domain`: `.oceanheart.ai` (production) / `.lvh.me` (development)
- `HttpOnly`: true
- `Secure`: true (production only)
- `SameSite`: Lax
- `Path`: /
- `Max-Age`: 1 week

## Deployment Options

### Docker Deployment

#### Build and Run Locally
```bash
# Build image
make docker-build

# Run container
docker run -d \
  --name go-passport \
  -p 10000:10000 \
  -e DATABASE_URL="postgres://user:pass@host/db" \
  -e SECRET_KEY_BASE="production-secret-key" \
  -e ENVIRONMENT="production" \
  go-passport:latest
```

#### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "10000:10000"
    environment:
      - DATABASE_URL=postgres://postgres:password@db:5432/passport_prod
      - SECRET_KEY_BASE=production-secret-key
      - ENVIRONMENT=production
    depends_on:
      - db
    
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=passport_prod
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Cloud Platform Deployment

#### Render
1. Connect GitHub repository to Render
2. Create new Web Service
3. Set build command: `go build -o main ./cmd/server`
4. Set start command: `./main`
5. Configure environment variables in dashboard
6. Deploy

#### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway init
railway add postgres
railway deploy
```

#### Fly.io
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Initialize and deploy
fly launch
fly deploy
```

### Production Considerations

#### Environment Setup
- Use managed PostgreSQL service (AWS RDS, Google Cloud SQL)
- Store secrets in secret manager (not environment variables)
- Enable SSL/TLS for database connections
- Use reverse proxy (nginx, Cloudflare) for static assets

#### Security
- Generate strong `SECRET_KEY_BASE` (64+ characters)
- Enable database SSL (`sslmode=require`)
- Use HTTPS only in production
- Configure firewall rules
- Enable audit logging

#### Performance
- Use connection pooling for database
- Enable gzip compression (built-in)
- Configure appropriate server timeouts
- Monitor memory usage and optimize
- Use Redis for distributed rate limiting (if scaling)

#### Monitoring
- Set up health check monitoring (`/up` endpoint)
- Configure log aggregation
- Monitor database performance
- Set up alerting for errors

## Development Workflow

### Project Structure

```
go-passport/
├── cmd/server/          # Application entry point
│   └── main.go         # Main server setup and routing
├── internal/           # Private application code
│   ├── auth/          # JWT and password handling
│   ├── config/        # Configuration and database setup
│   ├── handlers/      # HTTP request handlers
│   ├── middleware/    # HTTP middleware (auth, CSRF, rate limiting)
│   ├── models/        # Data models and types
│   ├── repository/    # Database access layer
│   └── service/       # Business logic layer
├── web/               # Frontend assets
│   ├── templates/     # HTML templates
│   └── static/        # CSS, JS, images
├── db/migrations/     # Database migration files
├── scripts/           # Utility scripts
├── Dockerfile         # Container definition
├── Makefile          # Development commands
└── go.mod            # Go module definition
```

### Making Changes

#### 1. Add New Features

**Add new API endpoint:**
1. Define handler in `internal/handlers/`
2. Add route in `cmd/server/main.go`
3. Add middleware if needed
4. Write tests
5. Update documentation

**Add new database model:**
1. Create migration in `db/migrations/`
2. Define model in `internal/models/`
3. Create repository methods in `internal/repository/`
4. Add service layer logic in `internal/service/`
5. Write tests

#### 2. Database Migrations

Create new migration:
```bash
# Create migration file
touch db/migrations/003_add_new_feature.sql

# Write SQL
cat > db/migrations/003_add_new_feature.sql << 'EOF'
-- Add new feature
CREATE TABLE new_feature (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
EOF

# Test migration
make migrate
```

#### 3. Testing Procedures

```bash
# Run all tests
make test

# Run tests with coverage
make test-coverage

# Run specific package tests
go test -v ./internal/auth

# Run tests with race detection
go test -race ./...

# Generate test coverage report
make test-coverage
open coverage.html
```

#### 4. Code Quality

```bash
# Format code
make fmt

# Install linting tools
make install-tools

# Run linter
make lint

# Run security scan
make security
```

### Code Organization Principles

1. **Separation of Concerns**: Clear layers (handlers, services, repositories)
2. **Dependency Injection**: Pass dependencies explicitly
3. **Interface Usage**: Define interfaces for testability
4. **Error Handling**: Consistent error patterns throughout
5. **Configuration**: Centralized config management
6. **Testing**: Unit tests for business logic, integration tests for flows

### Git Workflow

```bash
# Feature development
git checkout -b feature/new-authentication-method
# Make changes
git add .
git commit -m "feat: add OAuth2 authentication support"
git push origin feature/new-authentication-method
# Create pull request

# Hotfix
git checkout -b hotfix/security-patch
# Make changes
git add .
git commit -m "fix: patch authentication vulnerability"
git push origin hotfix/security-patch
# Create pull request, merge to main
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Issues

**Error**: `failed to connect to database`

**Solutions**:
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Verify connection string
psql "postgres://user:pass@localhost/passport_dev?sslmode=disable"

# Check firewall/network connectivity
telnet localhost 5432

# Verify environment variable
echo $DATABASE_URL
```

#### 2. Migration Failures

**Error**: `failed to run migrations`

**Solutions**:
```bash
# Check database permissions
psql -c "\du" "postgres://user:pass@localhost/passport_dev"

# Run migrations manually
make migrate

# Check migration files syntax
psql -f db/migrations/001_create_users.sql "postgres://..."

# Reset migrations (development only)
dropdb passport_dev && createdb passport_dev
make migrate
```

#### 3. JWT Authentication Issues

**Error**: `invalid token` or `token expired`

**Solutions**:
```bash
# Verify SECRET_KEY_BASE is set
echo $SECRET_KEY_BASE

# Check token format
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." | base64 -d

# Test with curl
curl -H "Authorization: Bearer TOKEN" http://localhost:10000/api/auth/user

# Check server logs for details
make dev 2>&1 | grep -i error
```

#### 4. Permission Errors

**Error**: `permission denied` or `access denied`

**Solutions**:
```bash
# Check file permissions
ls -la bin/passport
chmod +x bin/passport

# Check port binding permissions (< 1024 requires sudo)
# Use port > 1024 for development

# Check database user permissions
psql -c "GRANT ALL PRIVILEGES ON DATABASE passport_dev TO username;"
```

#### 5. Rate Limiting Issues

**Error**: `rate limit exceeded`

**Solutions**:
```bash
# Wait for rate limit window to reset
# Default: 10 attempts per 3 minutes

# Adjust rate limits for development
export RATE_LIMIT_SIGNIN=100
export RATE_LIMIT_SIGNIN_WINDOW=1m

# Restart server
make dev
```

#### 6. Template Loading Errors

**Error**: `failed to load templates`

**Solutions**:
```bash
# Check template files exist
ls -la web/templates/

# Verify template syntax
# Templates use Go's html/template package

# Check working directory
pwd  # Should be project root when running
```

#### 7. Docker Issues

**Error**: Docker build or run failures

**Solutions**:
```bash
# Clean Docker cache
docker system prune -a

# Check Dockerfile syntax
docker build --no-cache -t go-passport:test .

# Check container logs
docker logs container-name

# Access container shell
docker exec -it container-name /bin/sh
```

### Debugging Tips

#### 1. Enable Debug Logging

```bash
# Set environment for verbose logging
export LOG_LEVEL=debug
make dev
```

#### 2. Use Go Debugger

```bash
# Install delve
go install github.com/go-delve/delve/cmd/dlv@latest

# Debug server
dlv debug ./cmd/server

# Set breakpoint and run
(dlv) break main.main
(dlv) continue
```

#### 3. Database Debugging

```bash
# Connect to database directly
psql $DATABASE_URL

# Check current sessions
SELECT * FROM sessions WHERE user_id = 1;

# Check user data
SELECT id, email_address, role, created_at FROM users;

# Monitor database queries (if available)
SELECT query FROM pg_stat_activity WHERE datname = 'passport_dev';
```

#### 4. HTTP Request Debugging

```bash
# Test with curl
curl -v -X POST http://localhost:10000/sign_in \
  -d "email=test@example.com&password=secret"

# Check response headers
curl -I http://localhost:10000/up

# Test JSON API
curl -v -X POST http://localhost:10000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret"}'
```

#### 5. Performance Debugging

```bash
# Enable CPU profiling
go run -cpuprofile=cpu.prof ./cmd/server

# Analyze profile
go tool pprof cpu.prof

# Memory profiling
go run -memprofile=mem.prof ./cmd/server
go tool pprof mem.prof
```

### Getting Help

1. **Check Logs**: Always check application logs first
2. **Verify Environment**: Ensure all required environment variables are set
3. **Test Components**: Test database, network, permissions separately
4. **Check Dependencies**: Verify Go version, PostgreSQL version
5. **Review Documentation**: Check this guide and inline code comments

### Development Environment Reset

If you need to completely reset your development environment:

```bash
# Stop any running servers
pkill -f "go run"

# Clean build artifacts
make clean

# Reset database
dropdb passport_dev
createdb passport_dev

# Clean Go cache
go clean -cache

# Re-download dependencies  
rm go.sum
make deps

# Reset and restart
make migrate
make dev
```

This comprehensive guide should enable you to effectively set up, run, and develop the Go Passport authentication service. For additional support, refer to the inline code documentation and comments throughout the codebase.