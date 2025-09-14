# Oceanheart.ai Passport - Subdomain Integration Guide

**For subdomain repositories integrating with the Oceanheart authentication system**

---

## Overview

This guide provides everything you need to integrate your subdomain application with the centralized Oceanheart authentication system. Whether you're building `labs.oceanheart.ai`, `clinic.oceanheart.ai`, `passport.oceanheart.ai`, or any other subdomain, this guide will get you connected.

## Architecture Summary

- **Central Auth**: `www.oceanheart.ai` handles all authentication
- **Session Sharing**: JWT tokens in `.oceanheart.ai` domain cookies
- **Local Verification**: Your app verifies tokens without API calls
- **Redirect Flow**: Unauthenticated users redirect to central login

## Environment Configuration

### Development Environment

**Your subdomain (.env.local):**
```bash
# Auth System Configuration
AUTH_URL=http://oceanheart.lvh.me:3000
JWT_SECRET=your-dev-jwt-secret-min-32-chars
COOKIE_DOMAIN=.lvh.me
NODE_ENV=development

# Your App Configuration  
SUBDOMAIN_NAME=passport  # labs, clinic, etc.
PORT=3001  # or your chosen port
```

**Development URLs:**
- Central Auth: `http://oceanheart.lvh.me:3000`
- Your App: `http://passport.lvh.me:3001`
- Auth Endpoints: `http://oceanheart.lvh.me:3000/api/auth/*`

### Production Environment

**Your subdomain (.env.production):**
```bash
# Auth System Configuration
AUTH_URL=https://www.oceanheart.ai
JWT_SECRET=your-prod-jwt-secret-min-32-chars
COOKIE_DOMAIN=.oceanheart.ai
NODE_ENV=production

# Your App Configuration
SUBDOMAIN_NAME=passport
```

**Production URLs:**
- Central Auth: `https://www.oceanheart.ai`
- Your App: `https://passport.oceanheart.ai`
- Auth Endpoints: `https://www.oceanheart.ai/api/auth/*`

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
        // No token - redirect to auth
        returnUrl = encodeURIComponent(request.fullUrl)
        authUrl = `${AUTH_URL}/signin?returnTo=https://${SUBDOMAIN_NAME}.${DOMAIN}${request.path}`
        return response.redirect(authUrl)
    }
    
    // Verify token locally
    result = verifyJWT(token, JWT_SECRET)
    
    if (!result.valid) {
        // Invalid token - redirect to auth
        returnUrl = encodeURIComponent(request.fullUrl)
        authUrl = `${AUTH_URL}/signin?returnTo=https://${SUBDOMAIN_NAME}.${DOMAIN}${request.path}`
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
        authUrl: isDev ? 'http://oceanheart.lvh.me:3000' : 'https://www.oceanheart.ai',
        domain: isDev ? '.lvh.me' : '.oceanheart.ai',
        protocol: isDev ? 'http' : 'https',
        jwtSecret: process.env.JWT_SECRET,
        subdomainName: process.env.SUBDOMAIN_NAME
    }
}

function buildAuthRedirect(currentPath) {
    const config = getAuthConfig()
    const returnTo = `${config.protocol}://${config.subdomainName}${config.domain}${currentPath}`
    return `${config.authUrl}/signin?returnTo=${encodeURIComponent(returnTo)}`
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
        return res.redirect(`${config.authUrl}/signin?returnTo=${encodeURIComponent(returnTo)}`)
    }
    
    try {
        const payload = jwt.verify(token, config.jwtSecret)
        req.user = { id: payload.userId, email: payload.email }
        next()
    } catch (error) {
        const returnTo = `${config.protocol}://${config.subdomainName}${config.domain}${req.originalUrl}`
        res.redirect(`${config.authUrl}/signin?returnTo=${encodeURIComponent(returnTo)}`)
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
AUTH_URL = os.getenv('AUTH_URL', 'https://www.oceanheart.ai')
JWT_SECRET = os.getenv('JWT_SECRET')
SUBDOMAIN_NAME = os.getenv('SUBDOMAIN_NAME', 'passport')
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
        auth_url = f"{settings.AUTH_URL}/signin?returnTo={return_to}"
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
AUTH_URL = os.getenv('AUTH_URL', 'https://www.oceanheart.ai')
JWT_SECRET = os.getenv('JWT_SECRET')
SUBDOMAIN_NAME = os.getenv('SUBDOMAIN_NAME', 'passport')
COOKIE_DOMAIN = os.getenv('COOKIE_DOMAIN', '.oceanheart.ai')

async def get_current_user(request: Request, oh_session: str = Cookie(None)):
    if not oh_session:
        protocol = 'https' if COOKIE_DOMAIN == '.oceanheart.ai' else 'http'
        return_to = f"{protocol}://{SUBDOMAIN_NAME}{COOKIE_DOMAIN}{request.url.path}"
        auth_url = f"{AUTH_URL}/signin?returnTo={return_to}"
        raise HTTPException(status_code=307, headers={"Location": auth_url})
    
    try:
        payload = jwt.decode(oh_session, JWT_SECRET, algorithms=['HS256'])
        return {"id": payload['userId'], "email": payload['email']}
    except jwt.InvalidTokenError:
        protocol = 'https' if COOKIE_DOMAIN == '.oceanheart.ai' else 'http'
        return_to = f"{protocol}://{SUBDOMAIN_NAME}{COOKIE_DOMAIN}{request.url.path}"
        auth_url = f"{AUTH_URL}/signin?returnTo={return_to}"
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
    subdomain = ENV['SUBDOMAIN_NAME'] || 'passport'
    
    return_to = "#{protocol}://#{subdomain}#{domain}#{request.fullpath}"
    auth_url = "#{ENV['AUTH_URL']}/signin?returnTo=#{CGI.escape(return_to)}"
    
    redirect_to auth_url
  end
end
```

## Optional: Server-Side Verification

For additional security or user data fetching, you can verify tokens with the central auth system:

### Token Verification Endpoint

**POST** `${AUTH_URL}/api/auth/verify`

```javascript
async function verifyTokenWithServer(token) {
    const response = await fetch(`${AUTH_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    })
    
    return await response.json()
    // Returns: { valid: true, user: { id, email } } or { valid: false }
}
```

### Token Refresh Endpoint

**POST** `${AUTH_URL}/api/auth/refresh`

```javascript
async function refreshToken(token) {
    const response = await fetch(`${AUTH_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    })
    
    const data = await response.json()
    // Returns: { token: "new-jwt" } or { error: "Invalid token" }
    
    if (data.token) {
        // Update cookie with new token
        setCookie('oh_session', data.token, {
            domain: COOKIE_DOMAIN,
            secure: true,
            httpOnly: true
        })
    }
    
    return data
}
```

## Testing Your Integration

### 1. Local Development Setup

1. **Start the main auth system:**
   ```bash
   cd oceanheart-ui
   npm run dev  # Runs on oceanheart.lvh.me:3000
   ```

2. **Start your subdomain app:**
   ```bash
   # Your app should run on passport.lvh.me:3001
   npm start  # or your framework's dev command
   ```

3. **Test the flow:**
   - Visit `http://passport.lvh.me:3001/dashboard`
   - Should redirect to `http://oceanheart.lvh.me:3000/signin?returnTo=...`
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
JWT_SECRET=your-jwt-secret-min-32-characters
SUBDOMAIN_NAME=passport  # or your subdomain name
```

**Development:**
```bash
AUTH_URL=http://oceanheart.lvh.me:3000
COOKIE_DOMAIN=.lvh.me
```

**Production:**
```bash
AUTH_URL=https://www.oceanheart.ai
COOKIE_DOMAIN=.oceanheart.ai
```

## Getting Help

1. **Check JWT payload** - Decode token to verify structure
2. **Verify environment variables** - Ensure all required vars are set
3. **Test cookie sharing** - Check browser DevTools for cookie presence
4. **Review logs** - Check both your app and main auth system logs

---

**This guide should provide everything needed to integrate any subdomain with the Oceanheart authentication system. The examples are framework-agnostic but provide enough detail for implementation in any stack.**