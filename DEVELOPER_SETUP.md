# Oceanheart.ai Monorepo Developer Setup Guide

This comprehensive guide covers setting up and running the entire Oceanheart.ai ecosystem, which consists of multiple applications built with different technologies.

## Repository Overview

This monorepo contains the following applications:

### Primary Applications (External Repos)
- **watson.oceanheart.ai** - Clinical LLM output review and curation tool (Django + React/Vite)
- **passport.oceanheart.ai** - Authentication platform with glass morphism UI (Rails 8) - **THIS REPO**
- **notebook.oceanheart.ai** - Minimalist blog engine (Go + HTMX)
- **preflight.oceanheart.ai** - AI readiness questionnaire with conversational coaching (FastAPI + SvelteKit)
- **my.oceanheart.ai** - Bun-based application
- **labs.oceanheart.ai** - Bun-based application
- **aceternity-test** - Next.js demo with Aceternity UI components

### Passport Implementations (In This Repo)
- **passport.oceanheart.ai** - Main Rails 8 implementation (production)
- **passport-lite** - Lightweight Bun implementation
- **passport-hono** - Hono/Bun implementation
- **passport-elysia** - Elysia/Bun implementation
- **go-passport** - Go implementation
- **spring-passport** - Spring Boot implementation

## Prerequisites

### System Requirements

#### Required Tools
- **Node.js/Bun**: Bun >=1.1.0 (primary JavaScript runtime)
- **Ruby**: Ruby 3.3+ with Bundler
- **Go**: Go 1.22+ 
- **Python**: Python 3.11+ with UV package manager
- **Java**: OpenJDK 17+ (for Spring implementation)
- **PostgreSQL**: 14+ (or Docker)
- **Redis**: 6+ (or Docker)

#### Platform-Specific Installation

**macOS (using Homebrew):**
```bash
# Install Bun (primary JavaScript runtime)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install other runtimes
brew install ruby go python@3.11 postgresql@14 redis

# Install UV for Python package management
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Java (for Spring implementation)
brew install openjdk@17
```

**Ubuntu/Debian:**
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install other tools
sudo apt update
sudo apt install ruby-full golang-go python3.11 python3.11-venv postgresql-14 redis-server

# Install UV
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Java
sudo apt install openjdk-17-jdk
```

#### Development Domains Setup

Add these entries to `/etc/hosts` for local development:
```bash
127.0.0.1 passport.lvh.me
127.0.0.1 watson.lvh.me
127.0.0.1 notebook.lvh.me
127.0.0.1 preflight.lvh.me
127.0.0.1 my.lvh.me
127.0.0.1 labs.lvh.me
127.0.0.1 aceternity.lvh.me
```

## Repository Setup

### 1. Clone All Repositories

```bash
# Create workspace directory
mkdir ~/oceanheart-workspace
cd ~/oceanheart-workspace

# Clone all repositories
git clone https://github.com/rickhallett/passport.oceanheart.ai.git
git clone https://github.com/rickhallett/watson.oceanheart.ai.git
git clone https://github.com/rickhallett/notebook.oceanheart.ai.git
git clone https://github.com/rickhallett/preflight.oceanheart.ai.git
git clone https://github.com/rickhallett/my.oceanheart.ai.git
git clone https://github.com/rickhallett/labs.oceanheart.ai.git
git clone https://github.com/rickhallett/aceternity-test.git
```

### 2. Setup Database Services

#### Using Docker (Recommended)

```bash
# Start PostgreSQL and Redis
docker run -d --name oceanheart-postgres \
  -e POSTGRES_USER=oceanheart \
  -e POSTGRES_PASSWORD=development \
  -e POSTGRES_DB=oceanheart_development \
  -p 5432:5432 \
  postgres:14

docker run -d --name oceanheart-redis \
  -p 6379:6379 \
  redis:7-alpine
```

#### Native Installation

```bash
# PostgreSQL setup
sudo -u postgres createuser -s oceanheart
sudo -u postgres createdb oceanheart_development -O oceanheart

# Redis setup (usually starts automatically)
redis-server
```

## Application Setup

### Primary Authentication: passport.oceanheart.ai (Rails 8)

```bash
cd passport.oceanheart.ai

# Install Ruby dependencies
bundle install

# Setup environment variables
cp .env.example .env.development
# Edit .env.development with your database credentials

# Database setup
bin/rails db:create db:migrate db:seed

# Install JavaScript dependencies and build assets
bun install
bun run build:css:dev

# Start the development server
bin/rails server -p 8004

# Create test user (in another terminal)
./test/create-test-user.sh
```

**Verification:**
- Web UI: http://passport.lvh.me:8004
- API Test: `./test/quick-auth-test.sh`

### Watson (Django + React/Vite)

```bash
cd watson.oceanheart.ai

# Setup Python environment with UV
uv venv
source .venv/bin/activate
uv pip install -e .

# Frontend setup with Bun
bun install

# Database setup
cd backend
python manage.py migrate
python manage.py createsuperuser
cd ..

# Start backend (terminal 1)
cd backend && python manage.py runserver 8001

# Start frontend (terminal 2)
bun run dev
```

**Verification:**
- Frontend: http://watson.lvh.me:5173
- Backend API: http://localhost:8001/admin

### Notebook (Go + HTMX)

```bash
cd notebook.oceanheart.ai

# Install Go dependencies
go mod download

# Run database migrations
go run cmd/migrate/main.go

# Start development server
go run ./cmd/notebook -port 8002
```

**Verification:**
- Application: http://notebook.lvh.me:8002

### Preflight (FastAPI + SvelteKit)

```bash
cd preflight.oceanheart.ai

# Backend setup with UV
uv venv
source .venv/bin/activate
uv pip install -e .

# Frontend setup
cd preflight-next  # or main SvelteKit app
bun install

# Start backend (terminal 1)
cd apps/backend
python -m uvicorn main:app --reload --port 8003

# Start frontend (terminal 2)
cd preflight-next
bun run dev
```

**Verification:**
- Frontend: http://preflight.lvh.me:3000
- Backend API: http://localhost:8003/docs

### My.oceanheart.ai & Labs.oceanheart.ai (Bun)

```bash
# My.oceanheart.ai
cd my.oceanheart.ai
bun install
bun run --hot index.ts

# Labs.oceanheart.ai  
cd labs.oceanheart.ai
bun install  
bun run --hot index.ts
```

### Aceternity Demo (Next.js)

```bash
cd aceternity-test/aceternity-demo
bun install
bun run dev
```

**Verification:**
- Application: http://aceternity.lvh.me:3000

## Passport Alternative Implementations

### Passport-Lite (Bun)

```bash
cd passport.oceanheart.ai/passport-lite
bun install
bun run migrate
bun run dev
```

### Passport-Hono (Hono + Bun)

```bash
cd passport.oceanheart.ai/passport-hono
bun install
bun run migrate
bun run dev
```

### Passport-Elysia (Elysia + Bun)

```bash
cd passport.oceanheart.ai/passport-elysia
bun install
bun run migrate
bun run dev
```

### Go-Passport

```bash
cd passport.oceanheart.ai/go-passport
go mod download
make migrate
make dev
```

### Spring-Passport

```bash
cd passport.oceanheart.ai/spring-passport
./gradlew build
./gradlew bootRun
```

## Environment Configuration

### Core Environment Variables

Each application requires specific environment variables. Copy the `.env.example` files and configure:

#### Passport (Rails)
```bash
# .env.development
RAILS_ENV=development
COOKIE_DOMAIN=.lvh.me
DB_USER=oceanheart
DB_PASSWORD=development
DB_NAME=passport_development
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your_jwt_secret_here
```

#### Watson (Django)
```bash
# .env
DJANGO_ENVIRONMENT=development
DATABASE_URL=postgresql://oceanheart:development@localhost:5432/watson_development
DEBUG=True
SECRET_KEY=your_django_secret_key
```

#### All Applications
- Database credentials matching your PostgreSQL setup
- Redis connection string
- JWT secrets for authentication
- CORS allowed origins for cross-domain requests

## Running Tests

### Passport (Rails)
```bash
cd passport.oceanheart.ai
bundle exec rails test
./test/auth-test.sh
```

### Watson (Full Stack)
```bash
cd watson.oceanheart.ai
bun run test              # Frontend tests
bun run test:backend      # Django tests
bun run test:all          # All tests
```

### Go Applications
```bash
cd notebook.oceanheart.ai
go test ./...

cd passport.oceanheart.ai/go-passport  
make test
```

### Bun Applications
```bash
# For any Bun-based app
bun test
```

## Production Build

### Passport (Rails)
```bash
bun run build:css
RAILS_ENV=production bundle exec rails assets:precompile
RAILS_ENV=production bundle exec rails server
```

### Watson
```bash
bun run build:prod
cd backend && python manage.py collectstatic
```

### Go Applications
```bash
# Notebook
go build -o bin/notebook ./cmd/notebook

# Go-Passport
make build
```

### Bun Applications
```bash
bun run build
```

## Common Development Commands

### Bun Commands (Primary Runtime)
```bash
bun install              # Install dependencies
bun --hot <file>         # Development with hot reload
bun run <script>         # Run package.json scripts
bun test                 # Run tests
bun build                # Build for production
```

### Rails Commands
```bash
bin/rails server         # Start development server
bin/rails console        # Rails console
bin/rails db:migrate     # Run migrations
bin/rails test           # Run tests
```

### Python Commands (UV)
```bash
uv venv                  # Create virtual environment
uv pip install -e .     # Install dependencies
python manage.py runserver  # Django dev server
python -m uvicorn main:app --reload  # FastAPI dev server
```

### Go Commands
```bash
go run ./cmd/app         # Run application
go test ./...            # Run all tests
go build                 # Build binary
```

## Service Dependencies and Port Allocation

| Service | Port | Dependencies | Status Check |
|---------|------|-------------|--------------|
| PostgreSQL | 5432 | - | `psql -h localhost -U oceanheart -d oceanheart_development -c "SELECT 1;"` |
| Redis | 6379 | - | `redis-cli ping` |
| Passport (Rails) | 8004 | PostgreSQL, Redis | http://passport.lvh.me:8004 |
| Watson Backend | 8001 | PostgreSQL | http://localhost:8001/admin |
| Watson Frontend | 5173 | Watson Backend | http://watson.lvh.me:5173 |
| Notebook | 8002 | SQLite | http://notebook.lvh.me:8002 |
| Preflight Backend | 8003 | PostgreSQL | http://localhost:8003/docs |
| Preflight Frontend | 3000 | Preflight Backend | http://preflight.lvh.me:3000 |
| Aceternity | 3000 | - | http://aceternity.lvh.me:3000 |

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Find process using port
lsof -i :8004
# Kill process
kill -9 <PID>
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
pg_isready -h localhost -p 5432

# Reset Rails database
bin/rails db:drop db:create db:migrate db:seed
```

#### Bun Issues
```bash
# Clear Bun cache
rm -rf ~/.bun/cache
bun install --force
```

#### Ruby/Rails Issues
```bash
# Reinstall gems
bundle install --full-index
# Clear Rails cache
bin/rails tmp:clear
```

#### Python/Django Issues
```bash
# Recreate virtual environment
rm -rf .venv
uv venv
source .venv/bin/activate
uv pip install -e .
```

### Authentication Flow Testing

Test the complete authentication flow:

```bash
cd passport.oceanheart.ai

# Start Passport
bin/rails server -p 8004

# Run authentication tests
./test/quick-auth-test.sh
./test/cross-domain-test.sh

# Create test user if needed
./test/create-test-user.sh
```

### Cross-Application Authentication

1. **Sign in to Passport**: http://passport.lvh.me:8004/sign_in
2. **Verify in other apps**: Authentication cookie should work across all `.lvh.me` domains
3. **API verification**: Use `/api/auth/verify` endpoint from any app

## Development Workflow

### Starting the Full Stack

1. **Database Services**: Start PostgreSQL and Redis
2. **Passport**: Start authentication service first
3. **Core Apps**: Start Watson, Notebook, Preflight based on needs
4. **Additional Services**: Start other applications as needed

### Recommended Development Order

1. Passport (authentication foundation)
2. Watson (if working on clinical tools)
3. Notebook (if working on content management)
4. Preflight (if working on onboarding)

### Code Quality Tools

```bash
# Rails
bundle exec rubocop
bundle exec brakeman

# TypeScript/JavaScript
bun run typecheck
bun run lint

# Go
go fmt ./...
go vet ./...

# Python
black .
flake8 .
```

## Architecture Notes

### Authentication Flow
- **Centralized**: All authentication through Passport
- **JWT Tokens**: Cross-domain authentication with secure cookies
- **Domain Strategy**: `.lvh.me` for development, `.oceanheart.ai` for production

### Technology Choices
- **Bun**: Primary JavaScript/TypeScript runtime (faster than Node.js)
- **UV**: Python package manager (faster than pip)
- **Rails 8**: Modern Rails with Solid Cache/Queue
- **Glass Morphism**: UI design pattern across applications

### Development Patterns
- Each application can run independently
- Shared authentication state via Passport
- Consistent technology choices within language ecosystems
- Docker support for simplified setup

This setup provides a complete development environment for the entire Oceanheart.ai ecosystem. Each application can be developed and tested independently while maintaining integration through the centralized authentication system.