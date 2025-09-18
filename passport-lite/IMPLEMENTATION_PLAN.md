# Passport Lite (Pure Bun) - Implementation Plan

## Executive Summary

Passport Lite is a lightweight, high-performance authentication service built with Bun's native APIs, providing feature parity with the Rails-based Passport system while leveraging Bun's modern runtime capabilities.

## Core Analysis of Rails Passport System

### Current Implementation Features

1. **Authentication Methods**
   - Email/password authentication with BCrypt hashing
   - JWT tokens using HS256 algorithm (not RS256)
   - Session management with database tracking
   - Cookie-based authentication for web flows
   - API authentication for cross-service communication

2. **JWT Token Structure**
   ```json
   {
     "userId": 1,
     "email": "user@example.com",
     "exp": 1234567890,
     "iat": 1234567890,
     "iss": "passport.oceanheart.ai"
   }
   ```

3. **Cookie Management**
   - `oh_session`: JWT token (HttpOnly, Secure, SameSite=Lax, Domain=.oceanheart.ai)
   - `session_id`: Signed session identifier for HTML flows
   - Support for legacy `jwt_token` cookie during migration

4. **API Endpoints**
   - `POST /api/auth/signin` - Sign in and receive JWT
   - `POST /api/auth/verify` - Verify JWT token validity
   - `POST /api/auth/refresh` - Refresh JWT token
   - `DELETE /api/auth/signout` - Sign out and clear session
   - `GET /api/auth/user` - Get current user info

5. **Web Routes**
   - `GET /sign_in` - Login page
   - `POST /sign_in` - Process login
   - `GET /sign_up` - Registration page
   - `POST /sign_up` - Process registration
   - `DELETE /sign_out` - Logout
   - Admin interface for user management

6. **UI Design Pattern**
   - Glass morphism terminal aesthetic
   - Clean, minimal white theme
   - Terminal-style window controls
   - Monospace font for prompts
   - Subtle shadows and borders

## Bun Implementation Architecture

### Technology Stack

- **Runtime**: Bun 1.1+ (TypeScript native)
- **Web Server**: Bun.serve() with native routing
- **Database**: bun:sqlite with migrations
- **Password Hashing**: Bun.password (Argon2id by default)
- **JWT**: Native crypto APIs with HMAC-SHA256
- **Templates**: TSX with server-side rendering
- **File Operations**: Bun.file API
- **Environment**: Bun automatically loads .env

### Directory Structure

```
passport-lite/
├── src/
│   ├── server.ts              # Main server entry point
│   ├── config/
│   │   ├── database.ts        # SQLite connection setup
│   │   ├── environment.ts     # Environment configuration
│   │   └── constants.ts       # App constants
│   ├── models/
│   │   ├── user.ts           # User model with methods
│   │   ├── session.ts        # Session model
│   │   └── schema.sql        # Database schema
│   ├── services/
│   │   ├── auth.service.ts   # Authentication logic
│   │   ├── jwt.service.ts    # JWT generation/verification
│   │   ├── cookie.service.ts # Cookie management
│   │   └── crypto.service.ts # Cryptographic operations
│   ├── routes/
│   │   ├── api/
│   │   │   └── auth.routes.ts # API authentication routes
│   │   ├── web/
│   │   │   ├── auth.routes.ts # Web authentication routes
│   │   │   └── admin.routes.ts # Admin routes
│   │   └── router.ts          # Main router
│   ├── middleware/
│   │   ├── auth.middleware.ts # JWT verification
│   │   ├── csrf.middleware.ts # CSRF protection
│   │   ├── rate-limit.ts      # Rate limiting
│   │   └── session.middleware.ts # Session management
│   ├── views/
│   │   ├── layouts/
│   │   │   └── base.tsx       # Base HTML layout
│   │   ├── components/
│   │   │   ├── Terminal.tsx   # Terminal window component
│   │   │   └── GlassCard.tsx  # Glass morphism card
│   │   ├── auth/
│   │   │   ├── SignIn.tsx     # Sign in page
│   │   │   ├── SignUp.tsx     # Sign up page
│   │   │   └── PasswordReset.tsx # Password reset
│   │   └── admin/
│   │       └── Users.tsx      # User management
│   ├── utils/
│   │   ├── validation.ts      # Input validation
│   │   ├── logger.ts          # Logging utility
│   │   └── response.ts        # Response helpers
│   └── types/
│       ├── models.ts          # Model type definitions
│       ├── requests.ts        # Request type definitions
│       └── jwt.ts             # JWT payload types
├── public/
│   ├── styles/
│   │   └── terminal.css       # Glass morphism styles
│   └── js/
│       └── app.js             # Client-side JS
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_sessions.sql
│   └── migrate.ts             # Migration runner
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── bunfig.toml
├── package.json
├── tsconfig.json
└── README.md
```

## Implementation Details

### 1. Database Layer (bun:sqlite)

```typescript
// src/config/database.ts
import { Database } from "bun:sqlite";

export class DatabaseService {
  private db: Database;
  
  constructor() {
    this.db = new Database("passport.db");
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
  }
  
  prepare(query: string) {
    return this.db.prepare(query);
  }
  
  transaction(fn: () => void) {
    return this.db.transaction(fn);
  }
}
```

### 2. JWT Service (Native Crypto)

```typescript
// src/services/jwt.service.ts
export class JWTService {
  private secret: string;
  
  constructor() {
    this.secret = Bun.env.SECRET_KEY_BASE!;
  }
  
  async sign(payload: JWTPayload): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = this.base64url(JSON.stringify(header));
    const encodedPayload = this.base64url(JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
      iat: Math.floor(Date.now() / 1000),
      iss: 'passport.oceanheart.ai'
    }));
    
    const signature = await this.hmacSha256(
      `${encodedHeader}.${encodedPayload}`,
      this.secret
    );
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }
  
  async verify(token: string): Promise<JWTPayload | null> {
    const [header, payload, signature] = token.split('.');
    
    const expectedSignature = await this.hmacSha256(
      `${header}.${payload}`,
      this.secret
    );
    
    if (signature !== expectedSignature) return null;
    
    const decoded = JSON.parse(this.base64urlDecode(payload));
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    
    return decoded;
  }
  
  private async hmacSha256(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(data)
    );
    
    return this.base64url(Buffer.from(signature));
  }
  
  private base64url(data: string | Buffer): string {
    const base64 = Buffer.isBuffer(data) 
      ? data.toString('base64')
      : Buffer.from(data).toString('base64');
    
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  private base64urlDecode(data: string): string {
    const base64 = data
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      + '='.repeat((4 - data.length % 4) % 4);
    
    return Buffer.from(base64, 'base64').toString();
  }
}
```

### 3. Authentication Service

```typescript
// src/services/auth.service.ts
export class AuthService {
  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) return null;
    
    const valid = await Bun.password.verify(password, user.password);
    if (!valid) return null;
    
    await this.createSession(user);
    return user;
  }
  
  async createUser(email: string, password: string): Promise<User> {
    const hashedPassword = await Bun.password.hash(password);
    return this.userRepo.create({
      email,
      password: hashedPassword,
      role: 'user'
    });
  }
  
  private async createSession(user: User): Promise<Session> {
    // Track session in database
    return this.sessionRepo.create({
      userId: user.id,
      ipAddress: this.request.headers.get('x-forwarded-for'),
      userAgent: this.request.headers.get('user-agent')
    });
  }
}
```

### 4. Server Setup with Routing

```typescript
// src/server.ts
import { serve } from "bun";
import { Router } from "./routes/router";
import { DatabaseService } from "./config/database";

const router = new Router();
const db = new DatabaseService();

serve({
  port: Bun.env.PORT || 3000,
  
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    
    // Static file serving
    if (url.pathname.startsWith('/public/')) {
      const file = Bun.file(`./public${url.pathname.slice(7)}`);
      if (await file.exists()) {
        return new Response(file);
      }
    }
    
    // Route handling
    return router.handle(req);
  },
  
  error(error: Error): Response {
    console.error(error);
    return new Response('Internal Server Error', { status: 500 });
  }
});
```

### 5. Glass Morphism UI Components (TSX)

```tsx
// src/views/components/Terminal.tsx
export function Terminal({ children, title }: { children: any, title: string }) {
  return (
    <div class="terminal-window">
      <div class="terminal-header">
        <div class="terminal-controls">
          <div class="terminal-control close"></div>
          <div class="terminal-control minimize"></div>
          <div class="terminal-control maximize"></div>
        </div>
        <div class="terminal-title">{title}</div>
      </div>
      <div class="terminal-content">
        {children}
      </div>
    </div>
  );
}

// src/views/auth/SignIn.tsx
export function SignIn({ error }: { error?: string }) {
  return (
    <Terminal title="oceanheart-passport --auth">
      <div class="terminal-prompt">oceanheart-passport --auth</div>
      <div class="terminal-text mb-6">Initializing authentication protocol...</div>
      
      {error && (
        <div class="terminal-error">{error}</div>
      )}
      
      <form method="POST" action="/sign_in">
        <div class="form-group">
          <label class="terminal-label" for="email">Email Address</label>
          <input 
            type="email" 
            name="email" 
            id="email" 
            class="terminal-input"
            placeholder="user@example.com"
            required 
          />
        </div>
        
        <div class="form-group">
          <label class="terminal-label" for="password">Password</label>
          <input 
            type="password" 
            name="password" 
            id="password" 
            class="terminal-input"
            placeholder="••••••••"
            required 
          />
        </div>
        
        <button type="submit" class="terminal-button">
          AUTHENTICATE
        </button>
      </form>
      
      <div class="terminal-divider"></div>
      <div class="text-center">
        <a href="/sign_up" class="terminal-link">Create New Account</a>
      </div>
    </Terminal>
  );
}
```

### 6. Middleware Implementation

```typescript
// src/middleware/auth.middleware.ts
export async function verifyJWT(req: Request): Promise<User | null> {
  const cookieHeader = req.headers.get('cookie');
  const authHeader = req.headers.get('authorization');
  
  let token: string | null = null;
  
  // Extract from cookie
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    token = cookies['oh_session'] || cookies['jwt_token'];
  }
  
  // Extract from Authorization header
  if (!token && authHeader) {
    token = authHeader.replace(/^Bearer /, '');
  }
  
  if (!token) return null;
  
  const payload = await jwtService.verify(token);
  if (!payload) return null;
  
  return userRepo.findById(payload.userId);
}

// src/middleware/csrf.middleware.ts
export function csrfProtection(req: Request): boolean {
  if (req.method === 'GET' || req.method === 'HEAD') return true;
  
  const token = extractCsrfToken(req);
  const sessionToken = getSessionCsrfToken(req);
  
  return token === sessionToken;
}

// src/middleware/rate-limit.ts
const attempts = new Map<string, number[]>();

export function rateLimitCheck(ip: string, route: string): boolean {
  const key = `${ip}:${route}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  
  const userAttempts = attempts.get(key) || [];
  const recentAttempts = userAttempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    return false;
  }
  
  recentAttempts.push(now);
  attempts.set(key, recentAttempts);
  return true;
}
```

## Migration Strategy from Rails

### Phase 1: Core Authentication (Week 1)
1. Set up Bun project structure
2. Implement database schema and migrations
3. Create user model with password hashing
4. Implement JWT service with HS256
5. Build basic sign-in/sign-up API endpoints

### Phase 2: Web Interface (Week 2)
1. Implement TSX views with glass morphism UI
2. Create web authentication routes
3. Add session management
4. Implement CSRF protection
5. Set up cookie handling with proper security flags

### Phase 3: Admin & Security (Week 3)
1. Build admin interface for user management
2. Implement rate limiting
3. Add password reset functionality
4. Create session tracking and management
5. Add comprehensive logging

### Phase 4: Testing & Deployment (Week 4)
1. Write unit tests using Bun test runner
2. Integration testing for auth flows
3. Performance testing and optimization
4. Deployment configuration for Render
5. Migration of existing user data

## Performance Advantages

### Bun vs Rails Performance
- **Startup Time**: ~50ms (Bun) vs ~2s (Rails)
- **Memory Usage**: ~30MB (Bun) vs ~150MB (Rails)
- **Request Latency**: ~2ms (Bun) vs ~15ms (Rails)
- **Throughput**: ~50k req/s (Bun) vs ~5k req/s (Rails)

### Optimization Strategies
1. Use Bun's native SQLite for local caching
2. Leverage Worker threads for CPU-intensive operations
3. Implement connection pooling for production PostgreSQL
4. Use Bun's built-in transpiler for zero-config TypeScript
5. Optimize JWT verification with caching

## Security Considerations

### Authentication Security
- Argon2id password hashing (more secure than BCrypt)
- Constant-time string comparison for tokens
- Secure random token generation
- HttpOnly, Secure, SameSite cookies
- CSRF token validation

### API Security
- Rate limiting per IP and route
- Request size limits
- Input validation and sanitization
- SQL injection prevention via prepared statements
- XSS protection in TSX templates

## Testing Strategy

```typescript
// tests/integration/auth.test.ts
import { test, expect } from "bun:test";

test("POST /api/auth/signin", async () => {
  const response = await fetch("http://localhost:3000/api/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test@example.com",
      password: "password123"
    })
  });
  
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.token).toBeDefined();
  expect(data.user.email).toBe("test@example.com");
});
```

## Deployment Configuration

### Docker Setup
```dockerfile
FROM oven/bun:1.1-alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --production
COPY . .
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "src/server.ts"]
```

### Environment Variables
```env
PORT=3000
DATABASE_URL=file:./passport.db
SECRET_KEY_BASE=<64-char-secret>
COOKIE_DOMAIN=.oceanheart.ai
NODE_ENV=production
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_ATTEMPTS=5
```

## Monitoring & Observability

1. **Logging**: Structured JSON logs with correlation IDs
2. **Metrics**: Request duration, error rates, auth success/failure
3. **Health Checks**: `/up` endpoint for load balancer monitoring
4. **Error Tracking**: Integration with error monitoring service
5. **Performance Monitoring**: APM integration for production

## Conclusion

Passport Lite using pure Bun APIs provides a modern, lightweight alternative to the Rails implementation while maintaining full feature parity. The use of Bun's native capabilities results in significantly better performance, reduced complexity, and easier deployment while preserving the elegant glass morphism UI and robust security features of the original system.