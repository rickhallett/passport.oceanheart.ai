# Oceanheart.ai Passport - Subdomain Integration Guide

**For subdomain repositories integrating with the Oceanheart authentication system**

---

## Overview

This guide provides everything you need to integrate your subdomain application with the centralized Oceanheart Passport authentication system. Whether you're building `labs.oceanheart.ai`, `watson.oceanheart.ai`, `notebook.oceanheart.ai`, or any other subdomain, this guide will get you connected.

## Architecture Summary

- **Central Auth**: `passport.oceanheart.ai` handles all authentication
- **Session Sharing**: JWT tokens in `.oceanheart.ai` domain cookies (cookie name: `oh_session`)
- **Local Verification**: Your app verifies tokens locally using HS256 algorithm
- **Redirect Flow**: Unauthenticated users redirect to passport for login with returnTo parameter

## Environment Configuration

### Development Environment

**Your subdomain (.env.local):**
```bash
# Auth System Configuration
AUTH_URL=http://passport.lvh.me:8004
JWT_SECRET=your-dev-jwt-secret-min-32-chars
COOKIE_DOMAIN=.lvh.me
NODE_ENV=development

# Your App Configuration  
SUBDOMAIN_NAME=watson  # watson, notebook, labs, etc.
PORT=3001  # Use ports as per monorepo allocation
```

**Development URLs:**
- Central Auth: `http://passport.lvh.me:8004`
- Your App: `http://watson.lvh.me:3001` (example)
- Auth Endpoints: `http://passport.lvh.me:8004/api/auth/*`

### Production Environment

**Your subdomain (.env.production):**
```bash
# Auth System Configuration
AUTH_URL=https://passport.oceanheart.ai
JWT_SECRET=your-prod-jwt-secret-min-32-chars
COOKIE_DOMAIN=.oceanheart.ai
NODE_ENV=production

# Your App Configuration
SUBDOMAIN_NAME=watson  # Your actual subdomain
```

**Production URLs:**
- Central Auth: `https://passport.oceanheart.ai`
- Your App: `https://watson.oceanheart.ai` (example)
- Auth Endpoints: `https://passport.oceanheart.ai/api/auth/*`

## Core Integration Code

### 1. JWT Verification Function

**Language Agnostic Pseudocode:**
```javascript
function verifyJWT(token, secret) {
    try {
        // Verify JWT signature and expiration
        payload = jwt.verify(token, secret, algorithm='HS256')
        
        // Extract user information
        return {
            valid: true,
            userId: payload.userId,
            email: payload.email,
            exp: payload.exp
        }
    } catch (error) {
        return { valid: false, error: error.message }
    }
}
```

### 2. Authentication Middleware

**Generic Implementation:**
```javascript
function requireAuth(request, response, next) {
    // Get JWT from cookie
    token = request.cookies['oh_session']
    
    if (!token) {
        // No token - redirect to passport
        returnUrl = encodeURIComponent(request.fullUrl)
        authUrl = `${AUTH_URL}/sign_in?returnTo=https://${SUBDOMAIN_NAME}.${DOMAIN}${request.path}`
        return response.redirect(authUrl)
    }
    
    // Verify token locally
    result = verifyJWT(token, JWT_SECRET)
    
    if (!result.valid) {
        // Invalid token - redirect to passport
        returnUrl = encodeURIComponent(request.fullUrl)
        authUrl = `${AUTH_URL}/sign_in?returnTo=https://${SUBDOMAIN_NAME}.${DOMAIN}${request.path}`
        return response.redirect(authUrl)
    }
    
    // Token valid - attach user to request
    request.user = {
        id: result.userId,
        email: result.email
    }
    
    next()
}
```

### 3. Environment Detection

```javascript
function getAuthConfig() {
    const isDev = process.env.NODE_ENV === 'development'
    
    return {
        authUrl: isDev ? 'http://passport.lvh.me:8004' : 'https://passport.oceanheart.ai',
        domain: isDev ? '.lvh.me' : '.oceanheart.ai',
        protocol: isDev ? 'http' : 'https',
        jwtSecret: process.env.JWT_SECRET,
        subdomainName: process.env.SUBDOMAIN_NAME,
        cookieName: 'oh_session'
    }
}

function buildAuthRedirect(currentPath) {
    const config = getAuthConfig()
    const returnTo = `${config.protocol}://${config.subdomainName}${config.domain}${currentPath}`
    return `${config.authUrl}/sign_in?returnTo=${encodeURIComponent(returnTo)}`
}
```

## Platform-Specific Examples

### Node.js/Express Example

**Package Requirements:**
```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.0",
    "cookie-parser": "^1.4.6"
  }
}
```

**Implementation:**
```javascript
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')

app.use(cookieParser())

const requireAuth = (req, res, next) => {
    const token = req.cookies.oh_session
    const config = getAuthConfig()
    
    if (!token) {
        const returnTo = `${config.protocol}://${config.subdomainName}${config.domain}${req.originalUrl}`
        return res.redirect(`${config.authUrl}/sign_in?returnTo=${encodeURIComponent(returnTo)}`)
    }
    
    try {
        const payload = jwt.verify(token, config.jwtSecret)
        req.user = { id: payload.userId, email: payload.email }
        next()
    } catch (error) {
        const returnTo = `${config.protocol}://${config.subdomainName}${config.domain}${req.originalUrl}`
        res.redirect(`${config.authUrl}/sign_in?returnTo=${encodeURIComponent(returnTo)}`)
    }
}

// Protected route
app.get('/dashboard', requireAuth, (req, res) => {
    res.json({ message: `Welcome ${req.user.email}!` })
})
```

### Python/Django Example

**Requirements:**
```
PyJWT==2.8.0
```

**settings.py:**
```python
import os

# Auth configuration
AUTH_URL = os.getenv('AUTH_URL', 'https://passport.oceanheart.ai')
JWT_SECRET = os.getenv('JWT_SECRET')
SUBDOMAIN_NAME = os.getenv('SUBDOMAIN_NAME', 'watson')
COOKIE_DOMAIN = os.getenv('COOKIE_DOMAIN', '.oceanheart.ai')
```

**middleware.py:**
```python
import jwt
from django.shortcuts import redirect
from django.conf import settings
from django.http import HttpResponseRedirect

class AuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip auth for public paths
        if request.path.startswith('/public/'):
            return self.get_response(request)
            
        token = request.COOKIES.get('oh_session')
        
        if not token:
            return self.redirect_to_auth(request)
        
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
            request.user_id = payload['userId']
            request.user_email = payload['email']
        except jwt.InvalidTokenError:
            return self.redirect_to_auth(request)
            
        return self.get_response(request)
    
    def redirect_to_auth(self, request):
        protocol = 'https' if settings.COOKIE_DOMAIN == '.oceanheart.ai' else 'http'
        return_to = f"{protocol}://{settings.SUBDOMAIN_NAME}{settings.COOKIE_DOMAIN}{request.get_full_path()}"
        auth_url = f"{settings.AUTH_URL}/sign_in?returnTo={return_to}"
        return HttpResponseRedirect(auth_url)
```

### Python/FastAPI Example

**Requirements:**
```
PyJWT==2.8.0
python-multipart==0.0.6
```

**main.py:**
```python
from fastapi import FastAPI, Cookie, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
import jwt
import os

app = FastAPI()

# Configuration
AUTH_URL = os.getenv('AUTH_URL', 'https://passport.oceanheart.ai')
JWT_SECRET = os.getenv('JWT_SECRET')
SUBDOMAIN_NAME = os.getenv('SUBDOMAIN_NAME', 'watson')
COOKIE_DOMAIN = os.getenv('COOKIE_DOMAIN', '.oceanheart.ai')

async def get_current_user(request: Request, oh_session: str = Cookie(None)):
    if not oh_session:
        protocol = 'https' if COOKIE_DOMAIN == '.oceanheart.ai' else 'http'
        return_to = f"{protocol}://{SUBDOMAIN_NAME}{COOKIE_DOMAIN}{request.url.path}"
        auth_url = f"{AUTH_URL}/sign_in?returnTo={return_to}"
        raise HTTPException(status_code=307, headers={"Location": auth_url})
    
    try:
        payload = jwt.decode(oh_session, JWT_SECRET, algorithms=['HS256'])
        return {"id": payload['userId'], "email": payload['email']}
    except jwt.InvalidTokenError:
        protocol = 'https' if COOKIE_DOMAIN == '.oceanheart.ai' else 'http'
        return_to = f"{protocol}://{SUBDOMAIN_NAME}{COOKIE_DOMAIN}{request.url.path}"
        auth_url = f"{AUTH_URL}/sign_in?returnTo={return_to}"
        raise HTTPException(status_code=307, headers={"Location": auth_url})

@app.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    return {"message": f"Welcome {user['email']}!"}
```

### Ruby/Rails Example

**Gemfile:**
```ruby
gem 'jwt'
```

**application_controller.rb:**
```ruby
class ApplicationController < ActionController::Base
  before_action :authenticate_user!
  
  private
  
  def authenticate_user!
    token = cookies['oh_session']
    
    unless token
      redirect_to_auth
      return
    end
    
    begin
      payload = JWT.decode(token, Rails.application.credentials.jwt_secret, algorithm: 'HS256')[0]
      @current_user = {
        id: payload['userId'],
        email: payload['email']
      }
    rescue JWT::DecodeError
      redirect_to_auth
    end
  end
  
  def redirect_to_auth
    protocol = Rails.env.production? ? 'https' : 'http'
    domain = Rails.env.production? ? '.oceanheart.ai' : '.lvh.me'
    subdomain = ENV['SUBDOMAIN_NAME'] || 'watson'
    
    return_to = "#{protocol}://#{subdomain}#{domain}#{request.fullpath}"
    auth_url = "#{ENV['AUTH_URL']}/sign_in?returnTo=#{CGI.escape(return_to)}"
    
    redirect_to auth_url
  end
end
```

## Optional: Server-Side Verification

For additional security or user data fetching, you can verify tokens with the central auth system:

### Available API Endpoints

#### Token Verification
**POST** `${AUTH_URL}/api/auth/verify`

```javascript
async function verifyTokenWithServer() {
    const response = await fetch(`${AUTH_URL}/api/auth/verify`, {
        method: 'POST',
        credentials: 'include',  // Include cookies
        headers: { 'Content-Type': 'application/json' }
    })
    
    return await response.json()
    // Returns: { valid: true, user: { userId, email } } or { valid: false }
}
```

#### Get Current User
**GET** `${AUTH_URL}/api/auth/user`

```javascript
async function getCurrentUser() {
    const response = await fetch(`${AUTH_URL}/api/auth/user`, {
        method: 'GET',
        credentials: 'include'  // Include cookies
    })
    
    return await response.json()
    // Returns: { userId, email } or error
}
```

#### Sign Out
**DELETE** `${AUTH_URL}/api/auth/signout`

```javascript
async function signOut() {
    const response = await fetch(`${AUTH_URL}/api/auth/signout`, {
        method: 'DELETE',
        credentials: 'include'  // Include cookies
    })
    
    return response.ok
    // Clears the oh_session cookie
}
```

#### Token Refresh
**POST** `${AUTH_URL}/api/auth/refresh`

```javascript
async function refreshToken() {
    const response = await fetch(`${AUTH_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',  // Include cookies
        headers: { 'Content-Type': 'application/json' }
    })
    
    const data = await response.json()
    // Returns: { token: "new-jwt" } or { error: "Invalid token" }
    // Cookie is automatically updated by the server
    
    return data
}
```

## Testing Your Integration

### 1. Local Development Setup

1. **Start Passport authentication system:**
   ```bash
   cd passport.oceanheart.ai
   
   # Using Docker Compose (recommended)
   docker-compose up -d
   
   # Or traditional Rails setup
   bundle install
   bin/rails db:create db:migrate db:seed
   bin/rails server -p 8004
   ```

2. **Start your subdomain app:**
   ```bash
   # Example: Watson app on port 3001
   cd watson.oceanheart.ai
   bun run dev  # Runs on watson.lvh.me:3001
   ```

3. **Test the flow:**
   - Visit `http://watson.lvh.me:3001/dashboard`
   - Should redirect to `http://passport.lvh.me:8004/sign_in?returnTo=...`
   - After login, should redirect back to your dashboard

### 2. Cookie Verification

**Browser DevTools > Application > Cookies:**
- Look for `oh_session` cookie
- Domain should be `.lvh.me` (dev) or `.oceanheart.ai` (prod)
- Should be HttpOnly and Secure (in prod)

### 3. JWT Payload Inspection

**Decode your JWT token (for debugging only):**
```javascript
// In browser console (dev only)
const token = document.cookie.split('oh_session=')[1]?.split(';')[0]
if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]))
    console.log('JWT Payload:', payload)
}
```

## Common Issues & Solutions

### Issue: Redirect Loop
**Symptoms:** Endless redirects between your app and auth system  
**Solution:** Check that your JWT_SECRET matches the main auth system

### Issue: Cookie Not Shared
**Symptoms:** Always redirects to login even after authentication  
**Solution:** Verify COOKIE_DOMAIN is set correctly (`.lvh.me` for dev, `.oceanheart.ai` for prod)

### Issue: JWT Verification Fails
**Symptoms:** Token exists but verification throws errors  
**Solution:** Ensure JWT_SECRET is identical across all apps and is at least 32 characters

### Issue: CORS Errors (if using API endpoints)
**Symptoms:** Browser blocks requests to auth endpoints  
**Solution:** Add your subdomain to CORS whitelist in main auth system

## Security Checklist

- [ ] JWT_SECRET is stored securely (environment variables)
- [ ] JWT_SECRET is identical across main auth and your app
- [ ] Cookies are set to HttpOnly and Secure in production
- [ ] HTTPS is enforced in production
- [ ] Token expiration is handled gracefully
- [ ] Sensitive routes are protected with auth middleware
- [ ] returnTo URLs are validated to prevent open redirects

## Environment Variables Summary

**Required for all environments:**
```bash
JWT_SECRET=your-jwt-secret-min-32-characters  # Must match Passport's secret
SUBDOMAIN_NAME=watson  # Your actual subdomain (watson, notebook, labs, etc.)
```

**Development:**
```bash
AUTH_URL=http://passport.lvh.me:8004
COOKIE_DOMAIN=.lvh.me
NODE_ENV=development
```

**Production:**
```bash
AUTH_URL=https://passport.oceanheart.ai
COOKIE_DOMAIN=.oceanheart.ai
NODE_ENV=production
```

**Docker Development (additional):**
```bash
# If using Docker Compose for Passport
PASSPORT_DB_PORT=5002  # PostgreSQL port
PASSPORT_REDIS_PORT=6002  # Redis port
```

## Port Allocation Reference

**Development Ports (per monorepo standards):**
- `3000` - preflight.oceanheart.ai
- `3001` - watson.oceanheart.ai  
- `3003` - sidekick.oceanheart.ai
- `3004` - my.oceanheart.ai
- `3005` - labs.oceanheart.ai
- `3006` - aceternity-test
- `8004` - passport.oceanheart.ai (Authentication)
- `8080` - notebook.oceanheart.ai

**Docker Service Ports (Passport):**
- `5002` - PostgreSQL (mapped from 5432)
- `6002` - Redis (mapped from 6379)

## Getting Help

1. **Check JWT payload** - Decode token to verify structure
2. **Verify environment variables** - Ensure all required vars are set
3. **Test cookie sharing** - Check browser DevTools for `oh_session` cookie
4. **Review logs** - Check both your app and Passport logs
5. **Test endpoints** - Use the test scripts in `passport.oceanheart.ai/test/`

---

**This guide should provide everything needed to integrate any subdomain with the Oceanheart authentication system. The examples are framework-agnostic but provide enough detail for implementation in any stack.**
