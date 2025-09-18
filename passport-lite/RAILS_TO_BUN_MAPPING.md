# Rails to Bun Implementation Mapping

## Component Translation Guide

### 1. Core Architecture

| Rails Component | Bun Equivalent | Notes |
|----------------|----------------|-------|
| Rails Application | Bun.serve() | Native HTTP server with built-in routing |
| ActionController | Request handlers | Pure functions handling Request/Response |
| ActiveRecord | bun:sqlite + Repository pattern | Direct SQLite access with prepared statements |
| ActionView (ERB) | TSX Server Components | Server-side rendering with TypeScript |
| Rails Router | URL pattern matching | Native URL parsing with pattern matching |
| Rails Middleware | Middleware functions | Composable async functions |
| Rails Credentials | Bun.env | Automatic .env loading |
| Webpacker | Built-in transpiler | Zero-config TypeScript/JSX support |

### 2. Authentication Components

| Rails Implementation | Bun Implementation | Key Differences |
|---------------------|-------------------|-----------------|
| `has_secure_password` | `Bun.password.hash()` | Argon2id vs BCrypt |
| `User.authenticate_by()` | `AuthService.authenticateUser()` | Manual implementation |
| `JWT.encode()` (ruby-jwt) | Native crypto.subtle | Web Crypto API |
| `JWT.decode()` | Custom HMAC verification | Built-in crypto |
| Session cookies | Native Set-Cookie headers | Direct header manipulation |
| CSRF tokens | Custom crypto.randomBytes | Manual implementation |

### 3. Database Layer

#### Rails Models
```ruby
class User < ApplicationRecord
  has_secure_password
  has_many :sessions, dependent: :destroy
  normalizes :email_address, with: ->(e) { e.strip.downcase }
  enum :role, { user: "user", admin: "admin" }
end
```

#### Bun Equivalent
```typescript
export class UserRepository {
  private db: Database;
  
  async create(data: CreateUserDTO): Promise<User> {
    const email = data.email.trim().toLowerCase();
    const password = await Bun.password.hash(data.password);
    
    const stmt = this.db.prepare(`
      INSERT INTO users (email_address, password, role) 
      VALUES (?, ?, ?)
      RETURNING *
    `);
    
    return stmt.get(email, password, data.role || 'user') as User;
  }
  
  async findByEmail(email: string): Promise<User | null> {
    const stmt = this.db.prepare(
      "SELECT * FROM users WHERE email_address = ? COLLATE NOCASE"
    );
    return stmt.get(email.trim().toLowerCase()) as User | null;
  }
}
```

### 4. Controller Actions

#### Rails Controller
```ruby
class SessionsController < ApplicationController
  def create
    if user = User.authenticate_by(email_address: params[:email_address], password: params[:password])
      login user
      redirect_to root_path
    else
      redirect_to new_session_path(email_hint: params[:email_address]), alert: "Invalid credentials"
    end
  end
end
```

#### Bun Handler
```typescript
export async function handleSignIn(req: Request): Promise<Response> {
  const formData = await req.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  const user = await authService.authenticateUser(email, password);
  
  if (user) {
    const token = await jwtService.sign({ userId: user.id, email: user.email_address });
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': createAuthCookie(token)
      }
    });
  }
  
  return new Response(signInPage({ error: 'Invalid credentials', emailHint: email }), {
    status: 401,
    headers: { 'Content-Type': 'text/html' }
  });
}
```

### 5. Routing

#### Rails Routes
```ruby
Rails.application.routes.draw do
  root "home#index"
  
  get "sign_in", to: "sessions#new"
  post "sign_in", to: "sessions#create"
  delete "sign_out", to: "sessions#destroy"
  
  namespace :api do
    post "auth/verify", to: "auth#verify"
    post "auth/signin", to: "auth#signin"
  end
  
  namespace :admin do
    resources :users, only: [:index, :show, :destroy]
  end
end
```

#### Bun Router
```typescript
export class Router {
  private routes: Map<string, Map<string, Handler>> = new Map();
  
  constructor() {
    // Web routes
    this.get('/', homeHandler);
    this.get('/sign_in', signInPageHandler);
    this.post('/sign_in', signInHandler);
    this.delete('/sign_out', signOutHandler);
    
    // API routes
    this.post('/api/auth/verify', apiVerifyHandler);
    this.post('/api/auth/signin', apiSignInHandler);
    
    // Admin routes
    this.get('/admin/users', adminUsersHandler);
    this.get('/admin/users/:id', adminUserShowHandler);
    this.delete('/admin/users/:id', adminUserDeleteHandler);
  }
  
  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname;
    
    // Find matching route
    const handler = this.findHandler(method, path);
    if (handler) {
      return handler(req);
    }
    
    return new Response('Not Found', { status: 404 });
  }
}
```

### 6. Views/Templates

#### Rails ERB
```erb
<div class="terminal-window">
  <div class="terminal-header">
    <div class="terminal-title">oceanheart-passport --auth</div>
  </div>
  <div class="terminal-content">
    <%= form_with url: sign_in_path do |form| %>
      <%= form.email_field :email_address, placeholder: "Email" %>
      <%= form.password_field :password, placeholder: "Password" %>
      <%= form.submit "Sign In" %>
    <% end %>
  </div>
</div>
```

#### Bun TSX
```tsx
export function SignInPage({ error, emailHint }: Props) {
  return (
    <html>
      <head>
        <title>Sign In - Passport</title>
        <link rel="stylesheet" href="/public/styles/terminal.css" />
      </head>
      <body>
        <div class="terminal-window">
          <div class="terminal-header">
            <div class="terminal-title">oceanheart-passport --auth</div>
          </div>
          <div class="terminal-content">
            <form method="POST" action="/sign_in">
              <input type="email" name="email" placeholder="Email" value={emailHint} />
              <input type="password" name="password" placeholder="Password" />
              <button type="submit">Sign In</button>
            </form>
            {error && <div class="error">{error}</div>}
          </div>
        </div>
      </body>
    </html>
  );
}
```

### 7. Middleware

#### Rails Middleware
```ruby
module Authentication
  extend ActiveSupport::Concern
  
  included do
    before_action :authenticate
  end
  
  private
  
  def authenticate
    @current_user = User.decode_jwt(cookies[:oh_session])
    redirect_to new_session_path unless @current_user
  end
end
```

#### Bun Middleware
```typescript
export function requireAuth(handler: Handler): Handler {
  return async (req: Request): Promise<Response> => {
    const user = await verifyJWT(req);
    
    if (!user) {
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/sign_in' }
      });
    }
    
    // Attach user to request context
    (req as any).user = user;
    return handler(req);
  };
}

// Usage
router.get('/admin', requireAuth(adminDashboardHandler));
```

### 8. API Responses

#### Rails API Controller
```ruby
def verify
  user = User.decode_jwt(params[:token])
  if user
    render json: {
      valid: true,
      user: {
        userId: user.id,
        email: user.email_address,
        role: user.role
      }
    }
  else
    render json: { valid: false }, status: :unauthorized
  end
end
```

#### Bun API Handler
```typescript
export async function apiVerifyHandler(req: Request): Promise<Response> {
  const body = await req.json();
  const token = body.token || extractToken(req);
  
  const payload = await jwtService.verify(token);
  if (!payload) {
    return Response.json(
      { valid: false, error: "Invalid or expired token" },
      { status: 401 }
    );
  }
  
  const user = await userRepo.findById(payload.userId);
  if (!user) {
    return Response.json(
      { valid: false, error: "User not found" },
      { status: 401 }
    );
  }
  
  return Response.json({
    valid: true,
    user: {
      userId: user.id,
      email: user.email_address,
      role: user.role
    }
  });
}
```

### 9. Testing

#### Rails Test
```ruby
test "should sign in user with valid credentials" do
  post sign_in_url, params: { 
    email_address: "user@example.com", 
    password: "password" 
  }
  assert_redirected_to root_url
  assert cookies[:oh_session].present?
end
```

#### Bun Test
```typescript
import { test, expect } from "bun:test";

test("should sign in user with valid credentials", async () => {
  const formData = new FormData();
  formData.append("email", "user@example.com");
  formData.append("password", "password");
  
  const response = await fetch("http://localhost:3000/sign_in", {
    method: "POST",
    body: formData
  });
  
  expect(response.status).toBe(302);
  expect(response.headers.get("Location")).toBe("/");
  expect(response.headers.get("Set-Cookie")).toContain("oh_session=");
});
```

### 10. Environment & Configuration

#### Rails Configuration
```ruby
# config/application.rb
module Passport
  class Application < Rails::Application
    config.load_defaults 8.0
    config.time_zone = "UTC"
    config.hosts << ".oceanheart.ai"
  end
end

# Using credentials
Rails.application.credentials.secret_key_base
```

#### Bun Configuration
```typescript
// src/config/environment.ts
export const config = {
  port: parseInt(Bun.env.PORT || "3000"),
  databasePath: Bun.env.DATABASE_PATH || "./passport.db",
  secretKeyBase: Bun.env.SECRET_KEY_BASE!,
  cookieDomain: Bun.env.COOKIE_DOMAIN || ".lvh.me",
  jwtIssuer: Bun.env.JWT_ISSUER || "passport.oceanheart.ai",
  nodeEnv: Bun.env.NODE_ENV || "development",
  
  get isProduction() {
    return this.nodeEnv === "production";
  },
  
  get isDevelopment() {
    return this.nodeEnv === "development";
  }
};
```

## Migration Checklist

- [ ] Set up Bun project structure
- [ ] Create SQLite database schema
- [ ] Implement user model and repository
- [ ] Build JWT service with HS256
- [ ] Create authentication service
- [ ] Implement web routes and handlers
- [ ] Build TSX views with glass morphism UI
- [ ] Add API endpoints for cross-service auth
- [ ] Implement middleware (auth, CSRF, rate limiting)
- [ ] Create admin interface
- [ ] Add password reset functionality
- [ ] Set up cookie management
- [ ] Implement session tracking
- [ ] Write tests
- [ ] Configure deployment
- [ ] Migrate existing user data

## Performance Comparison

| Metric | Rails | Bun | Improvement |
|--------|-------|-----|-------------|
| Startup Time | ~2000ms | ~50ms | 40x faster |
| Memory Usage | ~150MB | ~30MB | 5x less |
| Request Latency | ~15ms | ~2ms | 7.5x faster |
| Throughput | ~5k req/s | ~50k req/s | 10x higher |
| Bundle Size | ~50MB | ~5MB | 10x smaller |
| Dev Server Start | ~3s | ~100ms | 30x faster |

## Key Advantages of Bun Implementation

1. **Native TypeScript**: No transpilation step, runs TypeScript directly
2. **Built-in SQLite**: No need for external database drivers
3. **Native Crypto**: Web Crypto API for JWT operations
4. **Zero Dependencies**: Core functionality without npm packages
5. **Fast Dev Experience**: Hot reload in milliseconds
6. **Smaller Footprint**: Minimal memory and disk usage
7. **Modern APIs**: Uses latest web standards
8. **Simplified Deployment**: Single binary output possible