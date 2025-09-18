# Passport.oceanheart.ai Developer Guide

A comprehensive developer guide for the Passport.oceanheart.ai Rails 8 authentication platform featuring glass morphism UI and JWT-based cross-domain authentication.

## Table of Contents

1. [Application Overview](#application-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Architecture Overview](#architecture-overview)
5. [Database Configuration](#database-configuration)
6. [Environment Configuration](#environment-configuration)
7. [Authentication System](#authentication-system)
8. [Glass Morphism UI](#glass-morphism-ui)
9. [Tailwind CSS Build Process](#tailwind-css-build-process)
10. [API Documentation](#api-documentation)
11. [Testing](#testing)
12. [Development Workflow](#development-workflow)
13. [Production Deployment](#production-deployment)
14. [Troubleshooting](#troubleshooting)

## Application Overview

Passport.oceanheart.ai is a modern Rails 8 authentication platform that serves as the centralized authentication service for the Oceanheart.ai ecosystem. It features:

- **Rails 8**: Latest Rails with Solid Cache, Solid Queue, and Solid Cable
- **Glass Morphism UI**: Modern translucent design with backdrop blur effects
- **JWT Authentication**: RS256-based JWT tokens for cross-domain authentication
- **PostgreSQL**: Primary database with Rails 8 multi-database support
- **Redis**: Caching and background job processing
- **Tailwind CSS**: Utility-first CSS framework with custom glass morphism components
- **Hotwire**: Turbo and Stimulus for reactive UI updates

### Key Features

- User registration and authentication
- JWT token generation and validation
- Cross-domain authentication cookies
- Admin interface for user management
- Glass morphism terminal-inspired UI
- Mobile-responsive design
- API endpoints for cross-domain authentication
- Password reset functionality
- Role-based access control

## Prerequisites

### System Requirements

- **Ruby**: 3.3+ (specified in .ruby-version)
- **Rails**: 8.0.2+ 
- **PostgreSQL**: 14+
- **Redis**: 6+
- **Node.js/Bun**: Bun 1.1+ (for asset compilation)
- **Git**: For version control

### Platform-Specific Installation

#### macOS (using Homebrew)

```bash
# Install Ruby using rbenv (recommended)
brew install rbenv ruby-build
rbenv install 3.3.0
rbenv global 3.3.0

# Add to your shell profile
echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(rbenv init -)"' >> ~/.zshrc

# Install PostgreSQL and Redis
brew install postgresql@14 redis

# Install Bun for asset compilation
curl -fsSL https://bun.sh/install | bash

# Start services
brew services start postgresql@14
brew services start redis
```

#### Ubuntu/Debian

```bash
# Install Ruby
sudo apt update
sudo apt install ruby-full build-essential

# Install PostgreSQL and Redis
sudo apt install postgresql-14 postgresql-contrib redis-server

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Start services
sudo systemctl start postgresql
sudo systemctl start redis-server
```

### Development Domains Setup

Add to `/etc/hosts` for local development:

```bash
127.0.0.1 passport.lvh.me
127.0.0.1 app.lvh.me
```

The `.lvh.me` domain automatically resolves to 127.0.0.1 and supports subdomains, making it perfect for testing cross-domain authentication.

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/passport.oceanheart.ai.git
cd passport.oceanheart.ai

# Install Ruby dependencies
bundle install

# Install JavaScript dependencies
bun install
```

### 2. Database Setup

```bash
# Create PostgreSQL user and databases
sudo -u postgres psql
CREATE USER passport WITH PASSWORD 'secure_password';
ALTER USER passport CREATEDB;
CREATE DATABASE oceanheart_auth_development OWNER passport;
CREATE DATABASE oceanheart_auth_test OWNER passport;
\q

# Run Rails database setup
bin/rails db:create db:migrate db:seed
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.development

# Edit environment variables
nano .env.development
```

Configure the following essential variables in `.env.development`:

```bash
RAILS_ENV=development
SECRET_KEY_BASE=generate_with_rails_secret
DB_USER=passport
DB_PASSWORD=secure_password
DB_NAME=oceanheart_auth_development
DB_HOST=localhost
DB_PORT=5432
REDIS_URL=redis://localhost:6379/0
COOKIE_DOMAIN=.lvh.me
JWT_SECRET=your_jwt_secret_here
JWT_ISSUER=passport.oceanheart.ai
ALLOWED_ORIGINS=http://lvh.me:8004,http://app.lvh.me:3000
```

Generate secret keys:

```bash
# Generate Rails secret key base
bin/rails secret

# Generate JWT secret
openssl rand -hex 32
```

### 4. Start Development Server

```bash
# Build Tailwind CSS
bun run build:css:dev

# Start the Rails server
bin/rails server -p 8004

# Or use the development process manager
bin/rails dev
```

### 5. Verify Setup

- **Web Interface**: http://passport.lvh.me:8004
- **Health Check**: http://passport.lvh.me:8004/up
- **Admin Interface**: http://passport.lvh.me:8004/admin (requires admin user)

### 6. Create Test User

```bash
# Run the test user creation script
./test/create-test-user.sh

# Or create manually in Rails console
bin/rails console
User.create!(email_address: 'test@example.com', password: 'password123', password_confirmation: 'password123')
```

## Architecture Overview

### Application Structure

```
passport.oceanheart.ai/
├── app/
│   ├── controllers/           # Controllers for web and API
│   │   ├── api/              # API controllers for cross-domain auth
│   │   ├── admin/            # Admin interface controllers
│   │   └── concerns/         # Shared controller modules
│   ├── models/               # ActiveRecord models
│   ├── views/                # ERB templates with glass morphism UI
│   ├── javascript/           # Stimulus controllers
│   └── assets/
│       └── stylesheets/      # Tailwind CSS with custom components
├── config/
│   ├── database.yml          # Multi-database configuration
│   ├── routes.rb             # Application routes
│   └── environments/         # Environment-specific settings
├── db/
│   ├── migrate/              # Database migrations
│   └── seeds.rb              # Seed data
├── test/                     # Test suite and scripts
└── tailwind.config.js        # Tailwind configuration
```

### Technology Stack

- **Backend**: Rails 8.0.2 with Hotwire (Turbo + Stimulus)
- **Database**: PostgreSQL with Solid Cache/Queue/Cable
- **Authentication**: BCrypt for passwords, JWT for tokens
- **Frontend**: ERB templates with Tailwind CSS
- **Asset Pipeline**: Propshaft with Dartsass Rails
- **JavaScript**: Importmap Rails with Stimulus
- **Caching**: Redis with Solid Cache
- **Background Jobs**: Solid Queue
- **WebSockets**: Solid Cable

### Domain Architecture

The application supports cross-domain authentication across the Oceanheart.ai ecosystem:

- **Development**: `*.lvh.me` (automatically resolves to localhost)
- **Production**: `*.oceanheart.ai`
- **Cookie Domain**: Configured via `COOKIE_DOMAIN` environment variable
- **CORS**: Configured for specific allowed origins

## Database Configuration

### Multi-Database Setup

Rails 8 supports multiple databases for different concerns:

```yaml
# config/database.yml
production:
  primary: &primary_production
    adapter: postgresql
    url: <%= ENV['DATABASE_URL'] %>
  cache:
    <<: *primary_production
    database: oceanheart_auth_production_cache
    migrations_paths: db/cache_migrate
  queue:
    <<: *primary_production
    database: oceanheart_auth_production_queue
    migrations_paths: db/queue_migrate
  cable:
    <<: *primary_production
    database: oceanheart_auth_production_cable
    migrations_paths: db/cable_migrate
```

### Database Schema

#### Users Table

```ruby
create_table :users do |t|
  t.string :email_address, null: false
  t.string :password_digest, null: false
  t.string :role, default: "user"
  t.timestamps
end

add_index :users, :email_address, unique: true
add_index :users, :role
```

#### Sessions Table

```ruby
create_table :sessions do |t|
  t.references :user, null: false, foreign_key: true
  t.string :ip_address
  t.string :user_agent
  t.timestamps
end
```

### Database Operations

```bash
# Create databases
bin/rails db:create

# Run migrations for all databases
bin/rails db:migrate

# Run migrations for specific database
bin/rails db:migrate:cache
bin/rails db:migrate:queue
bin/rails db:migrate:cable

# Seed database
bin/rails db:seed

# Reset database (development only)
bin/rails db:drop db:create db:migrate db:seed

# Check database status
bin/rails db:version
```

## Environment Configuration

### Environment Files

The application uses dotenv-rails for environment variable management:

- `.env.example` - Template with all available variables
- `.env.development` - Development environment (not committed)
- `.env.production.example` - Production template
- `.env.production` - Production environment (not committed)

### Key Environment Variables

#### Rails Configuration

```bash
RAILS_ENV=development
RAILS_MASTER_KEY=your_master_key_here
SECRET_KEY_BASE=generated_secret_key_base
```

#### Database Configuration

```bash
DB_USER=passport
DB_PASSWORD=secure_password
DB_NAME=oceanheart_auth_development
DB_HOST=localhost
DB_PORT=5432
```

#### Redis Configuration

```bash
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=redis_password_here
```

#### Authentication Configuration

```bash
COOKIE_DOMAIN=.lvh.me              # .oceanheart.ai for production
JWT_SECRET=your_jwt_secret_here
JWT_ISSUER=passport.oceanheart.ai
ALLOWED_ORIGINS=http://lvh.me:8004,http://app.lvh.me:3000
```

#### Application Configuration

```bash
APP_HOST=lvh.me
APP_PORT=8004
ENABLE_REGISTRATION=true
ENABLE_PASSWORD_RESET=true
REQUIRE_EMAIL_CONFIRMATION=false
```

### Rails Credentials

Sensitive data is stored in Rails encrypted credentials:

```bash
# Edit credentials
EDITOR=nano bin/rails credentials:edit

# View credentials
bin/rails credentials:show
```

## Authentication System

### JWT Implementation

The application uses JWT (JSON Web Tokens) with HS256 algorithm for cross-domain authentication.

#### Token Generation

```ruby
# app/models/user.rb
def generate_jwt
  JWT.encode(
    {
      userId: id,
      email: email_address,
      exp: 1.week.from_now.to_i,
      iat: Time.current.to_i,
      iss: "passport.oceanheart.ai"
    },
    Rails.application.credentials.secret_key_base,
    "HS256"
  )
end
```

#### Token Validation

```ruby
# app/models/user.rb
def self.decode_jwt(token)
  begin
    payload = JWT.decode(
      token,
      Rails.application.credentials.secret_key_base,
      true,
      algorithm: "HS256"
    )[0]
    user_id = payload["userId"] || payload["user_id"]
    find(user_id)
  rescue JWT::DecodeError, JWT::ExpiredSignature, ActiveRecord::RecordNotFound
    nil
  end
end
```

### Authentication Flow

1. **User Registration/Login**: User provides credentials
2. **JWT Generation**: Server generates signed JWT token
3. **Cookie Setting**: JWT stored in secure, HttpOnly cookie
4. **Cross-Domain Access**: Cookie accessible across all subdomains
5. **Token Validation**: Other applications validate token via API

### Cookie Configuration

```ruby
# app/controllers/concerns/jwt_authentication.rb
def set_jwt_cookie(user)
  token = user.generate_jwt
  cookies[:oh_session] = {
    value: token,
    expires: 1.week.from_now,
    httponly: true,
    secure: Rails.env.production?,
    same_site: :lax,
    domain: cookie_domain_from_env
  }
  token
end
```

### API Endpoints

#### Authentication Verification

```ruby
# POST /api/auth/verify
# Headers: Authorization: Bearer <token>
# Or Cookie: oh_session=<token>

{
  "valid": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  }
}
```

#### Sign In

```ruby
# POST /api/auth/signin
# Body: { "email": "user@example.com", "password": "password" }

{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  }
}
```

### Role-Based Access Control

```ruby
# app/models/user.rb
enum :role, { user: "user", admin: "admin" }

def admin?
  role == "admin"
end

# app/controllers/concerns/admin_authorization.rb
def require_admin
  redirect_to root_path unless current_user&.admin?
end
```

## Glass Morphism UI

### Design System

The application features a custom glass morphism design system built with Tailwind CSS, creating modern translucent interfaces with backdrop blur effects.

### Core CSS Classes

#### Glass Effects

```css
/* Base glass morphism utility */
.glass {
  backdrop-blur: 48px;           /* backdrop-blur-xl */
  background-color: rgb(255 255 255 / 0.05);  /* bg-white/5 */
  border: 1px solid rgb(255 255 255 / 0.1);   /* border-white/10 */
}

.glass-strong {
  backdrop-blur: 64px;           /* backdrop-blur-2xl */
  background-color: rgb(255 255 255 / 0.1);   /* bg-white/10 */
  border: 1px solid rgb(255 255 255 / 0.2);   /* border-white/20 */
}
```

#### Component Classes

```css
/* Glass morphism components */
.card-glass {
  @apply glass rounded-xl shadow-2xl backdrop-blur-xl;
}

.form-glass {
  @apply glass p-8 rounded-xl shadow-2xl backdrop-blur-xl;
}

.nav-glass {
  @apply glass fixed top-0 left-0 right-0 z-50 border-b border-white/10;
}

.btn-glass {
  @apply btn glass text-white hover:bg-white/10 hover:shadow-2xl hover:scale-105;
}

.input-glass {
  @apply input glass border-white/20 focus-visible:border-white/40 focus-visible:shadow-lg;
}
```

### Background Effects

```css
/* Multi-layer gradient background */
body {
  background-image: 
    radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 40% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%),
    linear-gradient(180deg, hsl(var(--background)) 0%, rgba(0,0,0,0.8) 100%);
  background-attachment: fixed;
}
```

### Terminal-Inspired Components

The UI incorporates terminal aesthetics with glass morphism:

```erb
<!-- app/views/home/index.html.erb -->
<div class="terminal-window">
  <div class="terminal-header">
    <div class="terminal-controls">
      <div class="terminal-control close"></div>
      <div class="terminal-control minimize"></div>
      <div class="terminal-control maximize"></div>
    </div>
    <div class="terminal-title">oceanheart-passport --auth</div>
  </div>
  
  <div class="terminal-content">
    <div class="terminal-prompt">oceanheart-passport --auth</div>
    <!-- Content -->
  </div>
</div>
```

### Animation System

```css
/* Custom animations */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.6s ease-out forwards;
}

/* Staggered animations */
.stagger-children > * {
  opacity: 0;
  animation: fade-in-up 0.6s ease-out forwards;
}

.stagger-children > *:nth-child(1) { animation-delay: 0.1s; }
.stagger-children > *:nth-child(2) { animation-delay: 0.2s; }
.stagger-children > *:nth-child(3) { animation-delay: 0.3s; }
```

## Tailwind CSS Build Process

### Configuration

The Tailwind configuration is highly customized for the glass morphism design system:

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ["class"],
  content: [
    './app/views/**/*.html.erb',
    './app/helpers/**/*.rb',
    './app/javascript/**/*.js',
    './app/assets/stylesheets/**/*.css'
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        }
        // ... extensive color system
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      }
    }
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ]
}
```

### Build Commands

```bash
# Development build (watch mode)
bun run build:css

# Development build (single)
bun run build:css:dev

# Production build
RAILS_ENV=production bun run build:css
```

### Asset Pipeline Integration

```ruby
# config/application.rb
config.assets.css_compressor = nil  # Let Tailwind handle optimization

# Propshaft configuration
# app/assets/config/manifest.js
//= link_tree ../images
//= link_directory ../stylesheets .css
//= link_directory ../builds .css
```

### File Structure

```
app/assets/stylesheets/
├── application.tailwind.css    # Main Tailwind file with custom components
├── application.scss           # Rails asset pipeline entry
├── tailwind.css              # Generated Tailwind output
└── terminal.css              # Terminal-specific styling
```

## API Documentation

### Base URL

- **Development**: `http://passport.lvh.me:8004/api`
- **Production**: `https://passport.oceanheart.ai/api`

### Authentication

All API endpoints support multiple authentication methods:

1. **Bearer Token**: `Authorization: Bearer <jwt_token>`
2. **Cookie**: `oh_session=<jwt_token>` (set automatically by web interface)

### Endpoints

#### POST /api/auth/signin

Authenticate user and return JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

#### POST /api/auth/verify

Verify JWT token validity.

**Request:**
```bash
curl -H "Authorization: Bearer <token>" \
     http://passport.lvh.me:8004/api/auth/verify
```

**Response (Valid):**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  }
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "error": "Invalid or expired token"
}
```

#### GET /api/auth/user

Get current authenticated user information.

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user",
    "created_at": "2024-09-12T11:39:29.000Z"
  }
}
```

#### POST /api/auth/refresh

Refresh JWT token (extend expiration).

**Response:**
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "expires_at": "2024-09-26T11:39:29.000Z"
}
```

#### DELETE /api/auth/signout

Sign out user and invalidate token.

**Response:**
```json
{
  "success": true,
  "message": "Successfully signed out"
}
```

### CORS Configuration

```ruby
# config/initializers/cors.rb (if using rack-cors)
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch('ALLOWED_ORIGINS', '').split(',')
    resource '/api/*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true
  end
end
```

## Testing

### Test Suite Structure

```
test/
├── controllers/              # Controller tests
│   ├── api/
│   ├── admin/
│   └── application_controller_test.rb
├── models/                   # Model tests
├── integration/              # Integration tests
├── system/                   # System/browser tests
├── fixtures/                 # Test data
├── helpers/                  # Helper tests
├── mailers/                  # Mailer tests
├── auth-test.sh             # Authentication flow test script
├── cross-domain-test.sh     # Cross-domain authentication test
├── create-test-user.sh      # Test user creation script
└── quick-auth-test.sh       # Quick authentication verification
```

### Running Tests

```bash
# Run all tests
bin/rails test

# Run specific test files
bin/rails test test/models/user_test.rb
bin/rails test test/controllers/api/auth_controller_test.rb

# Run system tests
bin/rails test:system

# Run with coverage
COVERAGE=true bin/rails test
```

### Authentication Flow Testing

#### Quick Authentication Test

```bash
# Run quick authentication verification
./test/quick-auth-test.sh

# Sample output:
# Testing Passport Authentication Flow
# ✓ Server is responding
# ✓ Can create user account
# ✓ Can sign in with credentials
# ✓ JWT token is valid
# ✓ Can access protected endpoints
# ✓ Can sign out successfully
# All tests passed!
```

#### Cross-Domain Testing

```bash
# Test cross-domain authentication
./test/cross-domain-test.sh

# This script tests:
# - JWT token sharing across domains
# - Cookie domain configuration
# - CORS settings
# - API authentication from different origins
```

#### Create Test Users

```bash
# Create test user for manual testing
./test/create-test-user.sh

# Creates user: test@example.com / password123
# Creates admin: admin@example.com / admin123
```

### Test Configuration

```ruby
# test/test_helper.rb
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml
    fixtures :all

    # Add custom test helpers
    include AuthenticationTestHelper
  end
end
```

### Test Data

```yaml
# test/fixtures/users.yml
admin:
  email_address: admin@example.com
  password_digest: <%= BCrypt::Password.create('admin123') %>
  role: admin

user:
  email_address: user@example.com
  password_digest: <%= BCrypt::Password.create('password123') %>
  role: user
```

### Custom Test Helpers

```ruby
# test/support/authentication_test_helper.rb
module AuthenticationTestHelper
  def sign_in_as(user)
    post sign_in_path, params: {
      email_address: user.email_address,
      password: 'password123'
    }
  end

  def jwt_token_for(user)
    user.generate_jwt
  end

  def auth_headers_for(user)
    { 'Authorization' => "Bearer #{jwt_token_for(user)}" }
  end
end
```

## Development Workflow

### Daily Development Process

1. **Start Services**
   ```bash
   # Start PostgreSQL and Redis (if not running)
   brew services start postgresql@14
   brew services start redis
   
   # Start Rails development server
   bin/rails server -p 8004
   
   # In another terminal, watch Tailwind CSS
   bun run build:css
   ```

2. **Development Tools**
   ```bash
   # Rails console for debugging
   bin/rails console
   
   # Database console
   bin/rails dbconsole
   
   # Check routes
   bin/rails routes
   
   # Check credentials
   bin/rails credentials:show
   ```

3. **Code Quality**
   ```bash
   # Run RuboCop for code style
   bundle exec rubocop
   
   # Run Brakeman for security analysis
   bundle exec brakeman
   
   # Run tests
   bin/rails test
   ```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-authentication-feature

# Make changes and commit
git add .
git commit -m "feat: implement new authentication feature"

# Run tests before pushing
bin/rails test
./test/auth-test.sh

# Push and create pull request
git push origin feature/new-authentication-feature
```

### Database Migrations

```bash
# Generate migration
bin/rails generate migration AddNewFieldToUsers new_field:string

# Run migration
bin/rails db:migrate

# Rollback if needed
bin/rails db:rollback

# Check migration status
bin/rails db:migrate:status
```

### Asset Development

```bash
# Watch Tailwind CSS changes
bun run build:css

# Build for specific environment
RAILS_ENV=production bun run build:css

# Clear asset cache
bin/rails tmp:clear
```

### Debugging Tools

#### Rails Console Debugging

```ruby
# Start console
bin/rails console

# Test JWT generation
user = User.first
token = user.generate_jwt
puts token

# Test JWT validation
decoded_user = User.decode_jwt(token)
puts decoded_user.email_address

# Test cookie domain logic
helper.cookie_domain_from_env
```

#### Log Analysis

```bash
# View Rails logs
tail -f log/development.log

# Filter for authentication events
grep "JWT\|Authentication\|Sign" log/development.log

# View Redis operations
redis-cli monitor
```

### Performance Monitoring

```bash
# Check database performance
bin/rails db:migrate:status
bin/rails runner "puts ActiveRecord::Base.connection.execute('SELECT * FROM pg_stat_activity').to_a"

# Monitor Redis usage
redis-cli info memory
redis-cli info stats
```

## Production Deployment

### Environment Setup

#### Production Environment Variables

```bash
# .env.production
RAILS_ENV=production
RAILS_MASTER_KEY=your_production_master_key
SECRET_KEY_BASE=generate_new_secret_for_production

# Database (use DATABASE_URL for Render/Heroku)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis
REDIS_URL=redis://user:pass@host:6379/0

# Domain configuration
COOKIE_DOMAIN=.oceanheart.ai
APP_HOST=oceanheart.ai
ALLOWED_ORIGINS=https://oceanheart.ai,https://app.oceanheart.ai

# Security
FORCE_SSL=true
JWT_SECRET=production_jwt_secret
```

#### Asset Compilation

```bash
# Precompile assets for production
RAILS_ENV=production bin/rails assets:precompile

# Build Tailwind CSS for production
RAILS_ENV=production bun run build:css
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM ruby:3.3-alpine

# Install dependencies
RUN apk add --no-cache \
  build-base \
  postgresql-dev \
  nodejs \
  curl

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy Gemfile and install gems
COPY Gemfile Gemfile.lock ./
RUN bundle install --production

# Copy package files and install JS dependencies
COPY package.json bun.lockb ./
RUN bun install

# Copy application code
COPY . .

# Build assets
RUN RAILS_ENV=production bun run build:css
RUN RAILS_ENV=production bin/rails assets:precompile

# Expose port
EXPOSE 3000

# Start application
CMD ["bin/rails", "server", "-b", "0.0.0.0"]
```

#### Docker Compose

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/passport_production
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=passport_production
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Platform-Specific Deployment

#### Render.com

```yaml
# render.yaml
services:
  - type: web
    name: passport-oceanheart
    env: ruby
    plan: starter
    buildCommand: |
      bundle install
      bun install
      RAILS_ENV=production bun run build:css
      RAILS_ENV=production bin/rails assets:precompile
      RAILS_ENV=production bin/rails db:migrate
    startCommand: bin/rails server
    envVars:
      - key: RAILS_ENV
        value: production
      - key: COOKIE_DOMAIN
        value: .oceanheart.ai
      - key: ALLOWED_ORIGINS
        value: https://oceanheart.ai,https://app.oceanheart.ai

databases:
  - name: passport-db
    plan: starter
```

#### Heroku

```bash
# Add buildpacks
heroku buildpacks:add heroku/ruby
heroku buildpacks:add https://github.com/oven-sh/heroku-buildpack-bun.git

# Set environment variables
heroku config:set RAILS_ENV=production
heroku config:set COOKIE_DOMAIN=.oceanheart.ai
heroku config:set ALLOWED_ORIGINS=https://oceanheart.ai,https://app.oceanheart.ai

# Deploy
git push heroku main

# Run migrations
heroku run bin/rails db:migrate
```

### Health Checks and Monitoring

#### Application Health Check

```ruby
# config/routes.rb
get "up" => "rails/health#show", as: :rails_health_check

# Custom health check
class HealthController < ApplicationController
  def show
    checks = {
      database: database_check,
      redis: redis_check,
      jwt: jwt_check
    }
    
    if checks.values.all?
      render json: { status: "healthy", checks: checks }
    else
      render json: { status: "unhealthy", checks: checks }, status: 503
    end
  end

  private

  def database_check
    User.connection.execute("SELECT 1")
    true
  rescue
    false
  end

  def redis_check
    Rails.cache.fetch("health_check") { "ok" }
    true
  rescue
    false
  end

  def jwt_check
    test_user = User.new(id: 1, email_address: "test@example.com")
    token = test_user.generate_jwt
    User.decode_jwt(token).present?
  rescue
    false
  end
end
```

#### Monitoring Setup

```ruby
# Gemfile (add for production monitoring)
gem 'newrelic_rpm'
gem 'sentry-ruby'
gem 'sentry-rails'

# config/initializers/sentry.rb
Sentry.init do |config|
  config.dsn = ENV['SENTRY_DSN']
  config.breadcrumbs_logger = [:active_support_logger, :http_logger]
  config.environment = Rails.env
end
```

## Troubleshooting

### Common Issues

#### Database Connection Issues

**Problem**: Cannot connect to PostgreSQL

```bash
# Check PostgreSQL status
pg_isready -h localhost -p 5432

# Check if PostgreSQL is running
ps aux | grep postgres

# Start PostgreSQL
brew services start postgresql@14  # macOS
sudo systemctl start postgresql    # Linux

# Check database exists
psql -h localhost -U postgres -l | grep oceanheart

# Create database if missing
createdb oceanheart_auth_development -O passport
```

#### Redis Connection Issues

**Problem**: Cannot connect to Redis

```bash
# Check Redis status
redis-cli ping

# Start Redis
brew services start redis  # macOS
sudo systemctl start redis # Linux

# Check Redis configuration
redis-cli config get "*"

# Test Redis from Rails console
bin/rails console
Rails.cache.write("test", "value")
Rails.cache.read("test")
```

#### JWT Token Issues

**Problem**: JWT tokens not working across domains

```bash
# Check cookie domain configuration
bin/rails console
helper.cookie_domain_from_env

# Verify JWT secret is set
Rails.application.credentials.secret_key_base

# Test JWT generation/validation
user = User.first
token = user.generate_jwt
User.decode_jwt(token)

# Check environment variables
echo $COOKIE_DOMAIN
echo $JWT_SECRET
```

#### Asset Compilation Issues

**Problem**: Tailwind CSS not building

```bash
# Check Bun installation
bun --version

# Reinstall dependencies
rm -rf node_modules
bun install

# Build CSS manually
bun run build:css:dev

# Check Tailwind config
bunx tailwindcss --help

# Clear Rails asset cache
bin/rails tmp:clear
rm -rf tmp/cache/assets
```

#### CORS Issues

**Problem**: Cross-domain requests failing

```bash
# Check CORS configuration
bin/rails console
puts ENV['ALLOWED_ORIGINS']

# Test CORS with curl
curl -H "Origin: http://app.lvh.me:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Authorization" \
     -X OPTIONS \
     http://passport.lvh.me:8004/api/auth/verify

# Check browser developer tools for CORS errors
# Look for "Access-Control-Allow-Origin" errors
```

### Development Issues

#### Port Already in Use

```bash
# Find process using port 8004
lsof -i :8004

# Kill process
kill -9 <PID>

# Or use different port
bin/rails server -p 8005
```

#### SSL Issues in Development

```bash
# If using HTTPS in development
bin/rails server -b ssl://localhost:8004

# For production-like SSL testing
bin/rails server -b ssl://passport.lvh.me:8004 \
  --ssl-key=path/to/key \
  --ssl-cert=path/to/cert
```

#### Session/Cookie Issues

```bash
# Clear browser cookies for .lvh.me domain
# In browser: Developer Tools > Application > Storage > Cookies

# Check cookie settings in Rails console
bin/rails console
app.cookies[:oh_session]

# Test cookie domain logic
helper.cookie_domain_from_env
```

### Performance Issues

#### Slow Database Queries

```bash
# Enable query logging
# config/environments/development.rb
config.log_level = :debug

# Check slow queries in PostgreSQL
sudo -u postgres psql
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

# Analyze specific query
EXPLAIN ANALYZE SELECT * FROM users WHERE email_address = 'test@example.com';
```

#### Memory Issues

```bash
# Check memory usage
ps aux | grep rails

# Profile memory usage
# Add to Gemfile for development
gem 'memory_profiler'

# In Rails console
require 'memory_profiler'
report = MemoryProfiler.report do
  User.all.to_a
end
report.pretty_print
```

### Deployment Issues

#### Asset Precompilation Failures

```bash
# Clear asset cache
rm -rf public/assets
rm -rf tmp/cache/assets

# Precompile with debugging
RAILS_ENV=production bin/rails assets:precompile --trace

# Check asset configuration
bin/rails console
Rails.application.config.assets.paths
```

#### Environment Variable Issues

```bash
# Check all environment variables
printenv | grep -E "(RAILS|DB|REDIS|JWT|COOKIE)"

# Verify Rails credentials
RAILS_ENV=production bin/rails credentials:show

# Test environment loading
RAILS_ENV=production bin/rails console
Rails.env.production?
```

### Testing Issues

#### Test Database Issues

```bash
# Reset test database
RAILS_ENV=test bin/rails db:drop db:create db:migrate

# Check test database configuration
bin/rails runner -e test "puts ActiveRecord::Base.connection.current_database"

# Run specific test with debugging
bin/rails test test/models/user_test.rb --verbose
```

### Getting Help

#### Useful Commands for Debugging

```bash
# Check Rails configuration
bin/rails about

# Check database schema
bin/rails db:schema:dump

# Check routes
bin/rails routes | grep auth

# Check middleware stack
bin/rails middleware

# Check Rails version and gems
bundle list

# Check JavaScript dependencies
bun list
```

#### Log Files

```bash
# Rails logs
tail -f log/development.log
tail -f log/test.log
tail -f log/production.log

# PostgreSQL logs (varies by system)
tail -f /usr/local/var/log/postgres.log  # macOS Homebrew
tail -f /var/log/postgresql/postgresql-14-main.log  # Ubuntu

# Redis logs
redis-cli --latency
redis-cli info
```

#### Community Resources

- **Rails Guides**: https://guides.rubyonrails.org/
- **Rails API Documentation**: https://api.rubyonrails.org/
- **Tailwind CSS Documentation**: https://tailwindcss.com/docs
- **JWT.io**: https://jwt.io/ (for JWT debugging)
- **Stack Overflow**: Tag your questions with `ruby-on-rails`, `jwt`, `tailwindcss`

This comprehensive guide covers all aspects of developing with the Passport.oceanheart.ai Rails 8 authentication platform. For additional help or questions, refer to the test scripts in the `test/` directory or examine the existing code examples throughout the application.