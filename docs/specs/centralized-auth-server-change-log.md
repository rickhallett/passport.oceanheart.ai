# Change Log: Centralized Authentication Server
## Date: January 2025

## Files Modified

### app/models/user.rb
- **Change**: Updated JWT payload to use camelCase `userId` instead of `user_id`
- **Rationale**: Standardize token structure to match integration guide expectations
- **Impact**: Enables compatibility with subdomain applications expecting camelCase
- **Added**: Issuer claim (`iss: 'passport.oceanheart.ai'`) for token validation
- **Commit**: fc74a2c

### app/controllers/concerns/jwt_authentication.rb
- **Change**: Updated cookie name from `jwt_token` to `oh_session`
- **Change**: Added environment-based cookie domain configuration
- **Change**: Support both old and new cookie names during migration
- **Rationale**: Enable cross-subdomain cookie sharing
- **Impact**: Allows SSO across all oceanheart.ai subdomains
- **Commit**: 0424f7e

### config/routes.rb
- **Change**: Changed auth/verify from GET to POST
- **Added**: POST `/api/auth/signin` endpoint
- **Added**: DELETE `/api/auth/signout` endpoint
- **Rationale**: Match integration guide requirements for API consistency
- **Impact**: Standardized API interface for subdomain applications

### app/controllers/api/auth_controller.rb
- **Change**: Updated verify to accept token from request body or headers/cookies
- **Change**: Standardized response format with camelCase userId
- **Added**: signin and signout methods for API authentication
- **Added**: Role information in user responses
- **Rationale**: Provide complete API authentication flow
- **Impact**: Full API-based authentication support for subdomain apps

### app/controllers/sessions_controller.rb
- **Added**: returnTo parameter handling in new and create actions
- **Added**: URL validation for redirect security
- **Added**: Private methods for sanitizing and validating redirect URLs
- **Rationale**: Enable secure redirect flow after authentication
- **Impact**: Supports deep linking from subdomain applications

### app/views/sessions/_new.html.erb
- **Added**: Hidden field to preserve returnTo parameter in form
- **Rationale**: Maintain redirect URL through authentication flow
- **Impact**: Seamless return to originating subdomain after login

### config/initializers/cors.rb
- **Status**: Already configured for subdomain access
- **Supports**: Both oceanheart.ai and lvh.me domains
- **Methods**: All standard HTTP methods with credentials

## Dependencies Added/Removed
- rack-cors gem already present (v2.0)

## Breaking Changes
- Cookie name change from `jwt_token` to `oh_session`
- JWT payload structure change (`user_id` to `userId`)
- API verify endpoint changed from GET to POST