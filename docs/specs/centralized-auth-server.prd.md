# Centralized Authentication Server PRD

**Date:** January 2025  
**Feature:** Centralized Authentication Server for Oceanheart Subdomain Applications

---

## Executive Summary

This PRD documents the requirements for transforming the passport.oceanheart.ai Rails application into a centralized authentication server that will handle authentication for all Oceanheart subdomain applications. The system will provide JWT-based authentication with cookie sharing across subdomains, enabling single sign-on (SSO) capabilities while allowing subdomain applications to verify tokens locally without API calls.

## Problem Statement

### Current Issues
1. **Fragmented Authentication**: Each subdomain application currently needs its own authentication implementation
2. **User Experience**: Users need separate accounts for different Oceanheart services
3. **Security Inconsistency**: Different authentication implementations across services create security vulnerabilities
4. **Development Overhead**: Each new subdomain requires reimplementing authentication logic
5. **Session Management**: No centralized session management or SSO capabilities

### Requirements for Multi-App Support
1. The current implementation uses `jwt_token` as cookie name, but the integration guide expects `oh_session`
2. JWT payload structure needs standardization (currently uses `user_id`, guide expects `userId`)
3. Missing CORS configuration for API endpoints
4. No redirect flow handling for external applications
5. Missing environment configuration for domain-based cookie sharing

## Requirements

### Functional Requirements

#### User Requirements
1. **Single Sign-On (SSO)**
   - Users authenticate once and access all subdomain applications
   - Seamless navigation between subdomains without re-authentication
   - Automatic redirect to central auth when not authenticated

2. **Session Management**
   - Persistent sessions across browser restarts (1 week expiry)
   - Secure logout from all applications simultaneously
   - Token refresh without re-authentication

3. **User Experience**
   - Clean redirect flow with return URL preservation
   - Clear error messages for authentication failures
   - Mobile-responsive authentication interface

#### Technical Requirements

1. **JWT Token Standards**
   - Consistent token structure across all environments
   - HS256 algorithm for token signing
   - Standard claims: userId, email, exp, iat
   - Minimum 32-character secret key

2. **Cookie Configuration**
   - Cookie name: `oh_session` (standardized)
   - Domain: `.oceanheart.ai` (production) / `.lvh.me` (development)
   - HttpOnly and Secure flags in production
   - SameSite: Lax for CSRF protection

3. **API Endpoints**
   - POST `/api/auth/verify` - Verify token validity
   - POST `/api/auth/refresh` - Refresh expired tokens
   - GET `/api/auth/user` - Get current user information
   - POST `/api/auth/signin` - Authenticate user
   - DELETE `/api/auth/signout` - Logout user

4. **CORS Configuration**
   - Whitelist all oceanheart.ai subdomains
   - Support preflight requests
   - Allow credentials in cross-origin requests

5. **Redirect Flow**
   - Accept `returnTo` parameter in signin/signup URLs
   - Validate returnTo URLs against whitelist
   - Preserve query parameters through auth flow

### Design Requirements

1. **Terminal-themed UI** (already implemented)
   - Clean, minimal interface with white background
   - Consistent styling across all auth pages
   - Mobile-first responsive design

2. **Security Headers**
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Strict-Transport-Security (production)

## Implementation Phases

### Phase 1: Core Authentication API
- Standardize JWT token structure
- Implement cookie domain configuration
- Update cookie name from `jwt_token` to `oh_session`
- Add environment-based configuration

### Phase 2: API Endpoints Enhancement
- Implement POST `/api/auth/verify` endpoint
- Enhance `/api/auth/refresh` with proper error handling
- Add `/api/auth/signin` and `/api/auth/signout` endpoints
- Standardize API response format

### Phase 3: CORS and Security
- Configure CORS for subdomain access
- Implement returnTo URL validation
- Add rate limiting for auth endpoints
- Security headers configuration

### Phase 4: Redirect Flow
- Implement returnTo parameter handling
- Add URL whitelist validation
- Preserve query parameters through auth flow
- Handle deep linking for authenticated users

### Phase 5: Session Management
- Implement token refresh logic
- Add session invalidation on logout
- Configure token expiry handling
- Add "Remember Me" functionality

## Implementation Notes

### 1. JWT Token Structure Update

Current structure:
```ruby
{ 
  user_id: id,           # Should be userId
  email: email_address, 
  exp: 1.week.from_now.to_i,
  iat: Time.current.to_i
}
```

Required structure:
```ruby
{ 
  userId: id,            # Camel case for consistency
  email: email_address, 
  exp: 1.week.from_now.to_i,
  iat: Time.current.to_i,
  iss: 'passport.oceanheart.ai'  # Issuer claim
}
```

### 2. Cookie Configuration

Update `JwtAuthentication` concern:
```ruby
def set_jwt_cookie(user)
  token = user.generate_jwt
  cookies[:oh_session] = {  # Changed from :jwt_token
    value: token,
    expires: 1.week.from_now,
    httponly: true,
    secure: Rails.env.production?,
    same_site: :lax,
    domain: cookie_domain_from_env
  }
  token
end

private

def cookie_domain_from_env
  ENV.fetch('COOKIE_DOMAIN') do
    Rails.env.production? ? '.oceanheart.ai' : '.lvh.me'
  end
end
```

### 3. CORS Configuration

`config/initializers/cors.rb`:
```ruby
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins do |source, env|
      # Allow all oceanheart.ai subdomains
      source =~ /\Ahttps?:\/\/([a-z0-9-]+\.)?oceanheart\.ai\z/ ||
      source =~ /\Ahttps?:\/\/([a-z0-9-]+\.)?lvh\.me(:\d+)?\z/
    end
    
    resource '/api/auth/*',
      headers: :any,
      methods: [:get, :post, :delete, :options],
      credentials: true
  end
end
```

### 4. Redirect Flow Implementation

`SessionsController` updates:
```ruby
class SessionsController < ApplicationController
  def new
    @return_to = sanitize_return_url(params[:returnTo])
  end
  
  def create
    # ... authentication logic ...
    if authenticated
      redirect_to return_url_or_default
    end
  end
  
  private
  
  def sanitize_return_url(url)
    return root_path if url.blank?
    
    uri = URI.parse(url)
    return root_path unless allowed_redirect_host?(uri.host)
    
    url
  rescue URI::InvalidURIError
    root_path
  end
  
  def allowed_redirect_host?(host)
    return false if host.nil?
    
    allowed_hosts = [
      'oceanheart.ai',
      'www.oceanheart.ai',
      /\A[a-z0-9-]+\.oceanheart\.ai\z/,
      /\A[a-z0-9-]+\.lvh\.me\z/
    ]
    
    allowed_hosts.any? do |allowed|
      allowed.is_a?(Regexp) ? host =~ allowed : host == allowed
    end
  end
end
```

### 5. Environment Variables

Required `.env` configuration:
```bash
# Development
JWT_SECRET=development-secret-min-32-characters-long
COOKIE_DOMAIN=.lvh.me
AUTH_URL=http://passport.lvh.me:3000

# Production
JWT_SECRET=production-secret-min-32-characters-secure
COOKIE_DOMAIN=.oceanheart.ai
AUTH_URL=https://passport.oceanheart.ai
```

## Security Considerations

1. **JWT Secret Management**
   - Store JWT secret in Rails credentials
   - Use different secrets for each environment
   - Rotate secrets periodically

2. **CSRF Protection**
   - SameSite cookie attribute set to Lax
   - CSRF tokens for state-changing operations
   - Origin header validation for API requests

3. **Rate Limiting**
   - Limit login attempts per IP
   - Implement exponential backoff for failed attempts
   - Rate limit API endpoints

4. **URL Validation**
   - Whitelist allowed redirect domains
   - Prevent open redirect vulnerabilities
   - Validate and sanitize all user inputs

## Success Metrics

1. **Authentication Performance**
   - Token generation < 50ms
   - Token verification < 10ms
   - API response time < 200ms p95

2. **Reliability**
   - 99.9% uptime for auth services
   - Zero data breaches
   - Successful SSO rate > 99%

3. **User Experience**
   - Authentication flow completion < 5 seconds
   - Single sign-on success rate > 99%
   - Password reset completion rate > 90%

## Future Enhancements

1. **Phase 6: Advanced Features**
   - Multi-factor authentication (MFA)
   - OAuth2/OpenID Connect support
   - Social login providers
   - Passwordless authentication

2. **Phase 7: Analytics and Monitoring**
   - Authentication analytics dashboard
   - Failed login monitoring
   - Session analytics
   - Security event logging

3. **Phase 8: Enterprise Features**
   - SAML support for enterprise SSO
   - API key management for service accounts
   - Role-based access control (RBAC) enhancement
   - Audit logging

## Migration Path

For existing implementations:
1. Deploy Phase 1 changes (backward compatible)
2. Update subdomain applications to use new cookie name
3. Run dual cookie support for 30 days
4. Deprecate old cookie name
5. Complete migration

## Testing Requirements

1. **Unit Tests**
   - JWT generation and validation
   - Cookie setting and retrieval
   - URL validation and sanitization

2. **Integration Tests**
   - Full authentication flow
   - Cross-domain cookie sharing
   - API endpoint responses

3. **Security Tests**
   - CSRF protection validation
   - XSS prevention
   - Open redirect prevention
   - Rate limiting effectiveness