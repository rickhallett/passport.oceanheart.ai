# Oceanheart Passport

A centralized authentication server providing Single Sign-On (SSO) capabilities for the Oceanheart ecosystem of applications.

## Overview

Oceanheart Passport serves as the centralized authentication hub for all Oceanheart subdomain applications. It provides JWT-based authentication with cross-domain cookie sharing, enabling seamless Single Sign-On experiences across multiple applications.

## Features

- **JWT-based Authentication**: Secure token-based authentication using HS256 algorithm
- **Cross-Domain SSO**: Cookie sharing across `.oceanheart.ai` (production) and `.lvh.me` (development) domains
- **API-First Design**: RESTful API endpoints for authentication operations
- **Admin Interface**: Role-based access control with admin dashboard
- **Secure Redirects**: Validated return URLs for safe cross-application navigation
- **Terminal UI**: Retro terminal-style interface for authentication flows
- **Backward Compatibility**: Supports migration from legacy authentication systems

## Quick Start

### Development Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/rickhallett/passport.oceanheart.ai.git
   cd passport.oceanheart.ai
   bundle install
   ```

2. **Database Setup**
   ```bash
   bin/rails db:create db:migrate db:seed
   ```

3. **Start the Server**
   ```bash
   bin/rails server -p 5555
   ```

4. **Create Test User**
   ```bash
   ./test/create-test-user.sh
   ```

### Testing Authentication

Run the comprehensive test suite:

```bash
# Quick test of all endpoints
./test/quick-auth-test.sh

# Full test suite with detailed output
./test/auth-test.sh --verbose

# Cross-domain functionality test
./test/cross-domain-test.sh
```

## API Endpoints

### Authentication Endpoints

All API endpoints are available under `/api/auth/`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signin` | Sign in with email and password |
| POST | `/api/auth/verify` | Verify JWT token validity |
| POST | `/api/auth/refresh` | Refresh JWT token |
| GET | `/api/auth/user` | Get current user information |
| DELETE | `/api/auth/signout` | Sign out and clear session |

### Web Authentication

| Route | Description |
|-------|-------------|
| GET | `/sign_in` | Sign-in page (supports `?returnTo=` parameter) |
| GET | `/sign_up` | User registration page |
| POST | `/sign_in` | Process sign-in (supports Turbo Stream) |
| DELETE | `/sign_out` | Sign out and redirect |

## Integration Guide

### For Client Applications

1. **Redirect to Passport for Authentication**
   ```javascript
   // Redirect users to passport with return URL
   window.location.href = 'https://passport.oceanheart.ai/sign_in?returnTo=' + 
     encodeURIComponent(window.location.href);
   ```

2. **Check Authentication Status**
   ```javascript
   // Verify if user is authenticated
   fetch('https://passport.oceanheart.ai/api/auth/verify', {
     method: 'POST',
     credentials: 'include' // Include cookies
   })
   .then(response => response.json())
   .then(data => {
     if (data.valid) {
       // User is authenticated
       console.log('User:', data.user);
     }
   });
   ```

3. **Get Current User**
   ```javascript
   // Get current user information
   fetch('https://passport.oceanheart.ai/api/auth/user', {
     credentials: 'include'
   })
   .then(response => response.json())
   .then(user => {
     if (user.userId) {
       // Handle authenticated user
     }
   });
   ```

### Environment Configuration

#### Production
- **Domain**: `.oceanheart.ai`
- **Port**: Standard HTTPS (443)
- **Cookie**: `oh_session` with `secure: true`

#### Development
- **Domain**: `.lvh.me` (points to localhost)
- **Port**: 5555
- **Cookie**: `oh_session` with `secure: false`

Set environment variables:
```bash
# Production
export COOKIE_DOMAIN=".oceanheart.ai"

# Development (default)
export COOKIE_DOMAIN=".lvh.me"
```

## Architecture

### JWT Token Structure

```json
{
  "userId": 123,
  "email": "user@example.com",
  "exp": 1640995200,
  "iat": 1640908800,
  "iss": "passport.oceanheart.ai"
}
```

### Cookie Configuration

- **Name**: `oh_session`
- **Domain**: Environment-dependent (`.oceanheart.ai` or `.lvh.me`)
- **HttpOnly**: `true` (prevents XSS)
- **SameSite**: `lax` (allows cross-site navigation)
- **Secure**: `true` in production
- **Expires**: 1 week

### Authentication Flow

1. **Initial Request**: User visits application requiring authentication
2. **Redirect to Passport**: Application redirects to `/sign_in?returnTo=<url>`
3. **Authentication**: User signs in via terminal interface
4. **Cookie Set**: JWT token stored in cross-domain cookie
5. **Redirect Back**: User redirected to original application
6. **Token Verification**: Application verifies token via API

## User Management

### Admin Users

Admin users have access to:
- Admin dashboard at `/admin`
- User management interface
- Role assignment capabilities

### Regular Users

- Automatic redirect back to originating application
- No direct dashboard access
- Profile management (coming soon)

## Security Features

- **Secure JWT**: HS256 algorithm with application secret
- **Domain Validation**: Strict allowed host checking for redirects
- **XSS Protection**: Proper output escaping and HttpOnly cookies
- **Rate Limiting**: Login attempt rate limiting
- **CORS Support**: Configurable cross-origin request handling

## Development

### Running Tests

```bash
# Start server first
bin/rails server -p 5555

# Run all authentication tests
./test/auth-test.sh

# Test specific functionality
./test/quick-auth-test.sh     # Basic endpoint tests
./test/cross-domain-test.sh   # Cross-domain cookie tests
```

### Database

The application uses standard Rails authentication with:
- Users table with email/password
- Sessions table for session management
- Admin role support

### Key Files

- **Authentication Logic**: `app/controllers/concerns/jwt_authentication.rb`
- **User Model**: `app/models/user.rb`
- **API Controller**: `app/controllers/api/auth_controller.rb`
- **Web Controller**: `app/controllers/sessions_controller.rb`
- **Admin Interface**: `app/controllers/admin/`

## Docker Deployment

### Quick Start with Docker

#### Development with Docker Compose

1. **Clone the repository**
   ```bash
   git clone https://github.com/rickhallett/passport.oceanheart.ai.git
   cd passport.oceanheart.ai
   ```

2. **Start the development environment**
   ```bash
   docker-compose up -d
   ```

3. **Check service health**
   ```bash
   docker-compose ps
   docker-compose logs -f web
   ```

4. **Create test user**
   ```bash
   docker-compose exec web ./test/create-test-user.sh
   ```

5. **Access the application**
   - Web UI: http://passport.lvh.me:5555
   - API: http://passport.lvh.me:5555/api/auth

#### Production Deployment

1. **Prepare environment file**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with your production values:
   # DB_PASSWORD=secure_database_password
   # REDIS_PASSWORD=secure_redis_password
   # RAILS_MASTER_KEY=your_rails_master_key
   # SECRET_KEY_BASE=your_secret_key_base
   ```

2. **Build production image**
   ```bash
   docker-compose -f docker-compose.production.yml build
   ```

3. **Deploy with Docker Compose**
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

4. **Initialize database**
   ```bash
   docker-compose -f docker-compose.production.yml exec web rails db:create db:migrate db:seed
   ```

5. **Setup SSL with Let's Encrypt**
   ```bash
   # Initial certificate generation
   docker-compose -f docker-compose.production.yml run --rm certbot certonly \
     --webroot -w /var/www/certbot \
     -d passport.oceanheart.ai \
     --email admin@oceanheart.ai \
     --agree-tos \
     --no-eff-email
   ```

### Docker Architecture

#### Multi-Stage Build
The Dockerfile uses multi-stage builds for optimized images:
- **Base**: Minimal Ruby image with runtime dependencies
- **Build**: Compilation tools for native gems
- **Development**: Full development environment with all gems
- **Production**: Optimized production image with minimal footprint

#### Service Stack

##### Development Environment
- **PostgreSQL 16**: Database with persistent volume
- **Redis 7**: Session store and cache
- **Rails App**: Development server with hot reload
- **Volumes**: Code syncing, gem caching, node modules

##### Production Environment
- **PostgreSQL 16**: High-availability database
- **Redis 7**: Secured with password authentication
- **Rails App**: Production-optimized Puma server
- **Nginx**: Reverse proxy with SSL termination
- **Certbot**: Automatic SSL certificate renewal

### Container Configuration

#### Health Checks
All services include health checks for orchestration:

```yaml
# PostgreSQL
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U passport"]
  interval: 30s
  timeout: 10s
  retries: 5

# Redis
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 30s
  timeout: 10s
  retries: 5

# Rails App
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5555/up || exit 1
```

#### Volume Management

Development volumes:
- `postgres_data`: Database persistence
- `redis_data`: Redis persistence
- `bundle_cache`: Gem cache for faster rebuilds
- `node_modules`: JavaScript dependencies
- `rails_cache`: Application cache

Production volumes:
- `postgres_prod_data`: Database persistence
- `redis_prod_data`: Redis persistence with AOF
- `nginx_cache`: HTTP cache
- SSL certificates via bind mounts

### Docker Commands Reference

#### Development Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stream Render web + database logs (requires render CLI login)
bin/watch_logs

# Override service names or add log filters
RENDER_WEB_SERVICE=my-web RENDER_DATABASE_SERVICE=my-db bin/watch_logs --limit=300

# View local Docker logs for a specific service
docker-compose logs -f [service_name]

# Execute commands in container
docker-compose exec web bash
docker-compose exec web rails console
docker-compose exec web rails db:migrate

# Rebuild after Gemfile changes
docker-compose build web
docker-compose up -d web

# Reset database
docker-compose exec web rails db:reset
```

#### Production Commands

```bash
# Deploy with production compose
docker-compose -f docker-compose.production.yml up -d

# Scale web workers
docker-compose -f docker-compose.production.yml up -d --scale web=3

# Backup database
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U passport passport_production > backup.sql

# View production logs
docker-compose -f docker-compose.production.yml logs -f --tail=100

# Rolling update
docker-compose -f docker-compose.production.yml build web
docker-compose -f docker-compose.production.yml up -d --no-deps web
```

### Monitoring & Logging

#### Log Management
All containers use JSON file logging with rotation:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "50m"
    max-file: "10"
```

#### Health Monitoring
Monitor service health:
```bash
# Check all service health
docker-compose ps

# Detailed health status
docker inspect passport_web --format='{{.State.Health.Status}}'

# Monitor resource usage
docker stats
```

### Security Considerations

#### Production Security
- Non-root user execution (UID 1000)
- Read-only filesystem where possible
- Secret management via environment variables
- Network isolation with custom bridge network
- Redis password authentication
- PostgreSQL secured connections
- SSL/TLS termination at Nginx

#### Environment Variables
Never commit `.env` files. Use secrets management:
```bash
# Docker Swarm secrets
echo "password" | docker secret create db_password -

# Kubernetes secrets
kubectl create secret generic passport-secrets \
  --from-literal=db-password=yourpassword
```

### Troubleshooting

#### Common Issues

1. **Database connection errors**
   ```bash
   # Check PostgreSQL status
   docker-compose logs postgres
   # Verify network connectivity
   docker-compose exec web ping postgres
   ```

2. **Permission errors**
   ```bash
   # Fix ownership in development
   docker-compose exec web chown -R $(id -u):$(id -g) .
   ```

3. **Build failures**
   ```bash
   # Clean rebuild
   docker-compose down -v
   docker-compose build --no-cache
   docker-compose up -d
   ```

4. **SSL certificate issues**
   ```bash
   # Renew certificates manually
   docker-compose -f docker-compose.production.yml run --rm certbot renew
   ```

## Traditional Deployment

### Production Checklist

- [ ] Set `COOKIE_DOMAIN=".oceanheart.ai"`
- [ ] Configure SSL/HTTPS
- [ ] Set secure Rails credentials
- [ ] Configure CORS for allowed origins
- [ ] Set up monitoring and logging
- [ ] Run test suite to verify functionality

### Environment Variables

```bash
# Required
COOKIE_DOMAIN=".oceanheart.ai"  # Production
COOKIE_DOMAIN=".lvh.me"         # Development

# Optional
RAILS_ENV=production
SECRET_KEY_BASE=<your-secret>
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run the test suite
5. Submit a pull request

## License

This project is part of the Oceanheart ecosystem.

## Support

For issues or questions, please open an issue on GitHub or contact the development team.
