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

## Deployment

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