# Passport Buffalo - Authentication System

A production-ready authentication system built with Buffalo (Go) providing centralized authentication services with JWT support, session management, and cross-domain authentication capabilities for the Oceanheart.ai ecosystem.

## Features

- ✅ User registration and login
- ✅ JWT token generation and validation (HS256)
- ✅ Session-based authentication
- ✅ Password reset functionality
- ✅ Admin user management
- ✅ Cross-domain authentication API
- ✅ Rate limiting on authentication endpoints
- ✅ CORS configuration for ecosystem apps
- ✅ Glass morphism UI design
- ✅ Turbo Stream support

## Quick Start

### Prerequisites

- Go 1.21+
- PostgreSQL 15+
- Node.js 18+ (for assets)

### Installation

1. Clone the repository:
```bash
cd go-passport/passport-buffalo
```

2. Copy environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Install dependencies:
```bash
go mod download
npm install
```

4. Set up the database:
```bash
createdb passport_buffalo_development
buffalo pop migrate
```

5. Run the application:
```bash
go run main.go
```

The application will be available at http://localhost:3000

## Docker Deployment

### Using Docker Compose

```bash
# Build and run all services
docker-compose up -d

# Run migrations
docker-compose exec app buffalo pop migrate

# View logs
docker-compose logs -f app
```

### Building Docker Image

```bash
# Build the image
docker build -t passport-buffalo .

# Run the container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgres://user:pass@host:5432/passport" \
  -e SECRET_KEY_BASE="your-secret-key" \
  -e SESSION_SECRET="your-session-secret" \
  passport-buffalo
```

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sign_in` | Sign in page |
| POST | `/sign_in` | Process sign in |
| DELETE | `/sign_out` | Sign out |
| GET | `/sign_up` | Sign up page |
| POST | `/sign_up` | Process registration |
| GET | `/passwords/new` | Password reset request |
| POST | `/passwords` | Send reset email |
| GET | `/passwords/{token}/edit` | Reset password form |
| PUT | `/passwords/{token}` | Update password |

### API Endpoints (JSON)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/verify` | Verify JWT token | No |
| POST | `/api/auth/refresh` | Refresh JWT token | No |
| POST | `/api/auth/signin` | Sign in via API | No |
| DELETE | `/api/auth/signout` | Sign out via API | Yes (JWT) |
| GET | `/api/auth/user` | Get current user | Yes (JWT) |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin` | Admin dashboard |
| GET | `/admin/users` | List all users |
| GET | `/admin/users/{id}` | View user details |
| DELETE | `/admin/users/{id}` | Delete user |
| POST | `/admin/users/{id}/toggle_role` | Toggle user role |

## Environment Variables

```bash
# Environment
GO_ENV=development|production
PORT=3000

# Database
DATABASE_URL=postgres://user:pass@host:5432/dbname

# Security (generate with: openssl rand -hex 32)
SECRET_KEY_BASE=64-character-hex-string
SESSION_SECRET=64-character-hex-string

# Email (for password resets)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-api-key
SMTP_FROM=noreply@oceanheart.ai

# SSL (production only)
SSL_HOST=passport.oceanheart.ai
```

## JWT Token Usage

### Obtaining a Token

```javascript
// Via API
const response = await fetch('https://passport.oceanheart.ai/api/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { token } = await response.json();
```

### Using the Token

```javascript
// In Authorization header
fetch('https://passport.oceanheart.ai/api/auth/user', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Verify token
const response = await fetch('https://passport.oceanheart.ai/api/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});
```

## Database Migrations

```bash
# Run all migrations
buffalo pop migrate

# Create a new migration
buffalo pop generate fizz create_new_table

# Rollback last migration
buffalo pop migrate down

# Reset database
buffalo pop reset
```

## Testing

```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run specific test
go test -run TestUserCreate ./models
```

## Production Deployment

### Systemd Service

Create `/etc/systemd/system/passport-buffalo.service`:

```ini
[Unit]
Description=Passport Buffalo Authentication Service
After=network.target postgresql.service

[Service]
Type=simple
User=passport
WorkingDirectory=/opt/passport-buffalo
ExecStart=/opt/passport-buffalo/bin/passport
Restart=always
RestartSec=10
Environment="GO_ENV=production"
Environment="PORT=3000"

[Install]
WantedBy=multi-user.target
```

### Nginx Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name passport.oceanheart.ai;
    
    ssl_certificate /etc/letsencrypt/live/passport.oceanheart.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/passport.oceanheart.ai/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Security Features

- **Password Security**: Bcrypt with cost factor 10
- **Session Management**: HTTP-only secure cookies, 30-day expiration
- **JWT**: HS256 signing, 7-day expiration
- **Rate Limiting**: 10 sign-in attempts per 3 minutes
- **CORS**: Whitelisted origins for ecosystem apps
- **CSRF Protection**: Double-submit cookie pattern

## CORS Configuration

Allowed origins in production:
- https://oceanheart.ai
- https://www.oceanheart.ai
- https://watson.oceanheart.ai
- https://notebook.oceanheart.ai
- https://preflight.oceanheart.ai
- https://my.oceanheart.ai
- https://labs.oceanheart.ai

## License

MIT