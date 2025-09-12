# Phase 1: Rails 8 Foundation + Basic Authentication

## Objective
Create a working Rails 8 application with native authentication that can be tested locally with basic login/logout functionality.

## Deliverables
- Rails 8 app generated with PostgreSQL
- Native authentication system working
- Basic user registration and login
- Local development environment configured
- Render.com deployment configured

## Manual Test Checkpoint
✅ User can register account  
✅ User can login/logout  
✅ Sessions persist correctly  
✅ App deployed to Render.com  

## Technical Requirements

### 1. Rails App Generation
```bash
rails new oceanheart_auth --database=postgresql --css=tailwind
cd oceanheart_auth
rails generate authentication
```

### 2. Database Setup
- PostgreSQL locally with `oceanheart_auth_development`
- Render PostgreSQL for production
- Rails 8 auth generator provides:
  - `users` table (email, password_digest, created_at, updated_at)
  - `sessions` table (user_id, token, expires_at)

### 3. Key Dependencies
```ruby
# Gemfile additions
gem 'jwt', '~> 2.7'  # For Phase 3 preparation
gem 'redis', '~> 5.0'  # For Phase 2 preparation
```

### 4. Environment Configuration
```bash
# .env.development
DATABASE_URL=postgresql://localhost/oceanheart_auth_development
COOKIE_DOMAIN=.lvh.me
AUTH_URL=http://www.lvh.me:3000

# .env.production (Render auto-provides DATABASE_URL)
COOKIE_DOMAIN=.oceanheart.ai
AUTH_URL=https://your-app-name.onrender.com
```

### 5. Basic Views & Controllers
- Extend generated authentication views with basic styling
- Add root route with authentication status
- Test user registration/login flow

### 6. Render Deployment
```yaml
# render.yaml
services:
  - type: web
    name: oceanheart-auth
    env: ruby
    buildCommand: bundle install && rails db:migrate
    startCommand: rails server -h 0.0.0.0
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: oceanheart-db
          property: connectionString

databases:
  - name: oceanheart-db
    databaseName: oceanheart_auth_production
```

## Success Criteria
- [ ] Rails 8 app generates successfully
- [ ] Local PostgreSQL connection works
- [ ] User can register new account
- [ ] User can login with email/password
- [ ] User can logout and session clears
- [ ] App deploys to Render.com successfully
- [ ] Production login/logout works

## Time Estimate: 4-6 hours