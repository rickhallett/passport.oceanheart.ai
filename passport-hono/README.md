# Passport Hono - Authentication Service

A lightweight authentication platform built with Bun and Hono, featuring glass morphism UI and JWT-based SSO for the Oceanheart ecosystem.

## Features

- **JWT Authentication** with HS256 signing
- **Session Management** with PostgreSQL storage
- **Cross-domain SSO** for `.oceanheart.ai` subdomains
- **Glass Morphism UI** with dark theme
- **Rate Limiting** for security
- **CSRF Protection** for web forms
- **Admin Dashboard** for user management
- **TypeScript** throughout

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) 1.1+
- PostgreSQL database

### Installation

1. Clone and navigate to the directory:
```bash
cd passport-hono
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations:
```bash
bun run migrate
```

5. Start the development server:
```bash
bun run dev
```

The application will be available at `http://localhost:3000`.

## Environment Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `SECRET_KEY_BASE` | JWT signing secret | Required |
| `COOKIE_DOMAIN` | Cookie domain for SSO | `.lvh.me` (dev) |
| `ENV` | Environment mode | `development` |

## API Endpoints

### Authentication API

- `POST /api/auth/signin` - Sign in with credentials
- `POST /api/auth/verify` - Verify JWT token
- `POST /api/auth/refresh` - Refresh JWT token
- `DELETE /api/auth/signout` - Sign out
- `GET /api/auth/user` - Get current user info

### Web Routes

- `GET /` - Dashboard (requires auth)
- `GET /sign_in` - Sign in form
- `POST /sign_in` - Process sign in
- `GET /sign_up` - Sign up form
- `POST /sign_up` - Process registration
- `DELETE /sign_out` - Sign out

### Admin Routes

- `GET /admin/users` - User management (admin only)
- `POST /admin/users/:id/toggle_role` - Toggle user role

## Security Features

- **Password Hashing**: `scrypt` with N=16384, r=8, p=1
- **JWT Signing**: HS256 with configurable secret
- **CSRF Protection**: Signed tokens for state-changing requests
- **Rate Limiting**: Configurable limits for authentication endpoints
- **Secure Cookies**: HttpOnly, Secure, SameSite=Lax

## Development

### Scripts

- `bun run dev` - Start development server with hot reload
- `bun run start` - Start production server
- `bun run migrate` - Run database migrations
- `bun run test` - Run tests
- `bun run typecheck` - Type checking

### Database Schema

The application uses PostgreSQL with the following tables:

- `users` - User accounts with email and role
- `sessions` - Active user sessions
- `password_resets` - Password reset tokens (future)

## Deployment

### Environment Variables

Set the following in production:

```bash
ENV=production
DATABASE_URL=postgres://user:pass@host:5432/db
SECRET_KEY_BASE=your-64-char-secret
COOKIE_DOMAIN=.oceanheart.ai
```

### Health Check

The application provides a health check endpoint at `/up` that verifies database connectivity.

## SSO Integration

This service provides authentication for other Oceanheart applications:

- **Watson** (watson.oceanheart.ai)
- **Notebook** (notebook.oceanheart.ai)
- **Preflight** (preflight.oceanheart.ai)
- **Labs** (labs.oceanheart.ai)

JWT tokens are set as `oh_session` cookies with the appropriate domain for cross-subdomain access.

## Architecture

The application follows a layered architecture:

```
Routes → Middleware → Controllers → Services → Repositories → Database
```

- **Middleware**: Authentication, CSRF, rate limiting, logging
- **Controllers**: Web and API request handling
- **Services**: Business logic and orchestration
- **Repositories**: Data access layer
- **Database**: PostgreSQL with typed queries

## License

MIT