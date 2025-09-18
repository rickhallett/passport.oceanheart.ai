# Passport Elysia

A secure authentication service built with [Elysia](https://elysiajs.com/) and [Bun](https://bun.sh/), featuring glass morphism UI design and cross-domain SSO capabilities.

## Features

- 🔐 **Secure Authentication**: bcrypt password hashing, JWT tokens, session management
- 🎨 **Glass Morphism UI**: Terminal-inspired design with backdrop blur effects
- 🌐 **Cross-Domain SSO**: Cookie-based authentication across `*.oceanheart.ai` domains
- 🛡️ **Security Features**: CSRF protection, rate limiting, input validation
- ⚡ **High Performance**: Built with Bun runtime and Elysia framework
- 📱 **Responsive Design**: Mobile-first approach with glass morphism components
- 🔄 **Session Management**: Database-backed sessions with cleanup utilities
- 📊 **Admin Interface**: User management and session monitoring

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/) 1.2+
- **Framework**: [Elysia](https://elysiajs.com/) with TypeScript
- **Database**: PostgreSQL with [postgres.js](https://github.com/porsager/postgres)
- **Authentication**: Custom JWT + Session cookies
- **Validation**: [Zod](https://zod.dev/) schemas
- **Security**: Scrypt password hashing, CSRF tokens, rate limiting

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/docs/installation) 1.1+
- PostgreSQL 12+
- Node.js 18+ (for development tools)

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd passport-elysia
   bun install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database**:
   ```bash
   # Create database
   createdb passport_dev
   
   # Run migrations
   bun run migrate
   ```

4. **Start development server**:
   ```bash
   bun run dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Environment Configuration

Required environment variables:

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/passport_dev

# Security (generate a secure random string)
SECRET_KEY_BASE=your-secret-key-base-at-least-32-characters-long

# Optional
COOKIE_DOMAIN=.oceanheart.ai
JWT_ISSUER=passport.oceanheart.ai
RATE_LIMIT_SIGNIN_ATTEMPTS=10
RATE_LIMIT_SIGNIN_WINDOW_MS=180000
```

## Development Commands

```bash
# Development with hot reload
bun run dev

# Build for production
bun run build

# Run migrations
bun run migrate

# Run tests
bun run test

# Type checking
bun run typecheck

# Clean build artifacts
bun run clean
```

## Docker Development

Start the full stack with Docker Compose:

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Run migrations
docker-compose exec app bun run migrate

# Stop services
docker-compose down
```

## API Endpoints

### Web Authentication

- `GET /` - Home page
- `GET /sign_in` - Sign in form
- `POST /sessions` - Sign in
- `GET /sign_up` - Sign up form
- `POST /registrations` - Sign up
- `POST /sign_out` - Sign out
- `GET /dashboard` - User dashboard (protected)

### API Authentication

- `POST /api/auth/signin` - Sign in and get JWT
- `POST /api/auth/signup` - Create account and get JWT
- `POST /api/auth/verify` - Verify JWT token
- `POST /api/auth/refresh` - Refresh JWT token
- `DELETE /api/auth/signout` - Sign out
- `GET /api/auth/user` - Get current user
- `GET /api/auth/sessions` - Get user sessions
- `DELETE /api/auth/sessions/:id` - Revoke session
- `DELETE /api/auth/sessions` - Revoke all sessions

### Health Check

- `GET /up` - Health check endpoint

---

Built with ❤️ using [Bun](https://bun.sh/) and [Elysia](https://elysiajs.com/)
