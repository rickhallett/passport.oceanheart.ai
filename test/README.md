# Authentication Test Suite

This directory contains shell scripts to test the centralized authentication server functionality.

## Test Scripts

### 1. `create-test-user.sh`
Creates a test user in the database for testing purposes.

```bash
# Create default test user (test@example.com / password123)
./test/create-test-user.sh

# Create custom test user
./test/create-test-user.sh "custom@example.com" "custompass"
```

### 2. `auth-test.sh`
Comprehensive test suite for all authentication endpoints.

**Features:**
- Tests all API endpoints (signin, verify, refresh, user, signout)
- Validates token generation and verification
- Checks cookie handling
- Tests invalid credentials
- Verifies CORS headers
- Tests returnTo parameter handling

**Usage:**
```bash
# Run with defaults (localhost:5555)
./test/auth-test.sh

# Run with custom server URL
./test/auth-test.sh --url http://localhost:3000

# Run with custom credentials
./test/auth-test.sh --email test@example.com --password password123

# Verbose output
./test/auth-test.sh --verbose

# Show help
./test/auth-test.sh --help
```

**Options:**
- `--url URL` - Base URL of the auth server (default: http://localhost:5555)
- `--email EMAIL` - Test user email (default: test@example.com)
- `--password PASS` - Test user password (default: password123)
- `--verbose, -v` - Show detailed response output
- `--help, -h` - Show help message

### 3. `cross-domain-test.sh`
Tests cross-domain authentication scenarios for subdomain applications.

**Features:**
- Simulates subdomain apps accessing the auth server
- Tests token verification from different origins
- Validates redirect flow with returnTo parameter
- Checks cookie domain configuration
- Tests CORS preflight requests
- Validates JWT token structure
- Tests multi-domain session management

**Usage:**
```bash
# Run with defaults (using lvh.me for local testing)
./test/cross-domain-test.sh

# Run with custom auth server
AUTH_SERVER=http://passport.lvh.me:5555 ./test/cross-domain-test.sh

# Run with custom domains
APP_DOMAIN=app.oceanheart.ai ./test/cross-domain-test.sh

# Show help
./test/cross-domain-test.sh --help
```

**Environment Variables:**
- `AUTH_SERVER` - Auth server URL (default: http://passport.lvh.me:5555)
- `APP_DOMAIN` - Simulated app domain (default: app.lvh.me)
- `TEST_EMAIL` - Test user email (default: test@example.com)
- `TEST_PASSWORD` - Test user password (default: password123)

## Quick Start

1. **Start the Rails server:**
   ```bash
   bin/rails server -p 5555
   ```

2. **Create a test user:**
   ```bash
   chmod +x test/create-test-user.sh
   ./test/create-test-user.sh
   ```

3. **Run the authentication tests:**
   ```bash
   chmod +x test/auth-test.sh
   ./test/auth-test.sh
   ```

4. **Run cross-domain tests:**
   ```bash
   chmod +x test/cross-domain-test.sh
   ./test/cross-domain-test.sh
   ```

## Testing with lvh.me

For local cross-domain testing, use `lvh.me` which resolves to 127.0.0.1:

```bash
# Start server accessible via lvh.me
bin/rails server -b 0.0.0.0 -p 5555

# Access the auth server at:
# http://passport.lvh.me:5555

# Subdomains automatically work:
# http://app.lvh.me:5555
# http://api.lvh.me:5555
```

## Expected Test Results

### Successful Test Output
```
✅ Server is running
✅ Signin successful
✅ Token received
✅ oh_session cookie set
✅ Token verification successful
✅ Token refresh successful
✅ User endpoint successful
✅ Signout successful
✅ Invalid signin properly rejected
✅ Invalid token properly rejected
✅ ReturnTo parameter preserved
```

### Common Issues

1. **Server not running:**
   - Error: "Server is not responding"
   - Solution: Start the server with `bin/rails server -p 5555`

2. **Test user doesn't exist:**
   - Error: "Signin failed"
   - Solution: Run `./test/create-test-user.sh`

3. **CORS headers missing:**
   - Warning: "CORS headers not found"
   - Note: This is normal in development mode

4. **Cookie domain issues:**
   - In development, cookies are typically scoped to the current domain
   - Use lvh.me for testing cross-domain scenarios locally

## CI/CD Integration

These scripts can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Setup test user
  run: ./test/create-test-user.sh
  
- name: Run auth tests
  run: ./test/auth-test.sh --url http://localhost:3000
  
- name: Run cross-domain tests
  run: ./test/cross-domain-test.sh
```

## Security Notes

- Never commit real credentials to version control
- Use environment variables for sensitive data in production
- These scripts are for testing only - do not use in production
- Always use HTTPS in production for secure cookie transmission