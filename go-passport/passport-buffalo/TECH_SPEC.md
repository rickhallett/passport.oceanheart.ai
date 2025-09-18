# Buffalo Authentication System - Technical Specification

## Executive Summary

This specification outlines the implementation of a functionally equivalent authentication system to the Rails Passport application using the Buffalo Go framework. The system will provide centralized authentication services with JWT support, session management, and cross-domain authentication capabilities for the Oceanheart.ai ecosystem.

## System Architecture

### Core Components

1. **Buffalo Framework**: Modern Go web framework with Rails-like conventions
2. **Database**: PostgreSQL for user and session storage
3. **JWT Library**: golang-jwt/jwt for token generation and validation
4. **Session Management**: Gorilla sessions with database backend
5. **Password Hashing**: bcrypt for secure password storage
6. **CORS Support**: Built-in Buffalo middleware for cross-domain requests
7. **Template Engine**: Plush templates with glass morphism UI

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_address VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email_address);
CREATE INDEX idx_users_role ON users(role);
```

### Sessions Table
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### Password Reset Tokens Table
```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
```

## Project Structure

```
passport-buffalo/
├── actions/
│   ├── app.go                    # Main application setup
│   ├── auth.go                   # Authentication middleware
│   ├── home.go                   # Home controller
│   ├── sessions.go               # Sessions controller
│   ├── registrations.go          # Registration controller
│   ├── passwords.go              # Password reset controller
│   ├── api/
│   │   └── auth.go               # API authentication endpoints
│   └── admin/
│       └── users.go              # Admin user management
├── models/
│   ├── models.go                 # Database connection
│   ├── user.go                   # User model
│   ├── session.go                # Session model
│   └── password_reset_token.go   # Password reset token model
├── templates/
│   ├── application.plush.html    # Layout template
│   ├── sessions/
│   │   ├── new.plush.html        # Sign in page
│   │   ├── _success.plush.html   # Success partial
│   │   └── _error.plush.html     # Error partial
│   ├── registrations/
│   │   └── new.plush.html        # Sign up page
│   ├── passwords/
│   │   ├── new.plush.html        # Request reset page
│   │   └── edit.plush.html       # Reset password page
│   └── admin/
│       └── users/
│           └── index.plush.html   # User management
├── middleware/
│   ├── jwt.go                    # JWT middleware
│   ├── admin.go                  # Admin authorization
│   └── rate_limit.go             # Rate limiting
├── mailers/
│   └── passwords.go              # Password reset emails
├── assets/
│   ├── css/
│   │   └── application.scss      # Glass morphism styles
│   └── js/
│       └── application.js        # Stimulus controllers
├── config/
│   └── database.yml              # Database configuration
├── migrations/                   # Database migrations
├── grifts/                       # Task runner scripts
└── tests/                        # Test files
```

## Core Features Implementation

### 1. User Model (`models/user.go`)

```go
package models

import (
    "database/sql"
    "time"
    
    "github.com/gobuffalo/nulls"
    "github.com/gobuffalo/pop/v6"
    "github.com/gobuffalo/validate/v3"
    "github.com/gofrs/uuid"
    "github.com/pkg/errors"
    "golang.org/x/crypto/bcrypt"
)

type User struct {
    ID           uuid.UUID    `json:"id" db:"id"`
    EmailAddress string       `json:"email" db:"email_address"`
    PasswordHash string       `json:"-" db:"password_hash"`
    Password     string       `json:"-" db:"-"`
    Role         string       `json:"role" db:"role"`
    CreatedAt    time.Time    `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time    `json:"updated_at" db:"updated_at"`
    
    Sessions []Session `json:"-" has_many:"sessions"`
}

// String returns the email address
func (u User) String() string {
    return u.EmailAddress
}

// Create validates and creates a new User
func (u *User) Create(tx *pop.Connection) (*validate.Errors, error) {
    u.EmailAddress = strings.ToLower(strings.TrimSpace(u.EmailAddress))
    return tx.ValidateAndCreate(u)
}

// BeforeCreate hashes the password
func (u *User) BeforeCreate(tx *pop.Connection) error {
    if u.Password == "" {
        return errors.New("password required")
    }
    
    hash, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
    if err != nil {
        return err
    }
    
    u.PasswordHash = string(hash)
    u.Password = ""
    
    if u.Role == "" {
        u.Role = "user"
    }
    
    return nil
}

// Authorize checks user credentials
func (u *User) Authorize(password string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
    return err == nil
}

// IsAdmin checks if user has admin role
func (u *User) IsAdmin() bool {
    return u.Role == "admin"
}

// ValidateCreate validates User creation
func (u *User) ValidateCreate(tx *pop.Connection) (*validate.Errors, error) {
    return validate.Validate(
        &validators.EmailIsPresent{Field: u.EmailAddress, Name: "EmailAddress"},
        &validators.StringIsPresent{Field: u.Password, Name: "Password"},
        &validators.StringLengthInRange{Field: u.Password, Name: "Password", Min: 8, Max: 72},
        &validators.EmailLike{Field: u.EmailAddress, Name: "EmailAddress"},
        &validators.FuncValidator{
            Fn: func() bool {
                var count int
                tx.Where("email_address = ?", u.EmailAddress).Model(&User{}).Count(&count)
                return count == 0
            },
            Field:   "EmailAddress",
            Message: "Email address already in use",
        },
    ), nil
}
```

### 2. JWT Service (`actions/jwt.go`)

```go
package actions

import (
    "fmt"
    "net/http"
    "strings"
    "time"
    
    "github.com/gobuffalo/buffalo"
    "github.com/gobuffalo/envy"
    "github.com/golang-jwt/jwt/v5"
    "passport-buffalo/models"
)

var jwtSecret = []byte(envy.Get("SECRET_KEY_BASE", ""))

type JWTClaims struct {
    UserID uuid.UUID `json:"userId"`
    Email  string    `json:"email"`
    Role   string    `json:"role"`
    jwt.RegisteredClaims
}

// GenerateJWT creates a new JWT token for the user
func GenerateJWT(user *models.User) (string, error) {
    claims := JWTClaims{
        UserID: user.ID,
        Email:  user.EmailAddress,
        Role:   user.Role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            Issuer:    "passport.oceanheart.ai",
        },
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(jwtSecret)
}

// ValidateJWT validates and parses a JWT token
func ValidateJWT(tokenString string) (*models.User, error) {
    token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        return jwtSecret, nil
    })
    
    if err != nil {
        return nil, err
    }
    
    if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
        tx := models.DB
        user := &models.User{}
        if err := tx.Find(user, claims.UserID); err != nil {
            return nil, err
        }
        return user, nil
    }
    
    return nil, fmt.Errorf("invalid token")
}

// SetJWTCookie sets the JWT in an HTTP-only cookie
func SetJWTCookie(c buffalo.Context, user *models.User) (string, error) {
    token, err := GenerateJWT(user)
    if err != nil {
        return "", err
    }
    
    c.Cookies().Set("auth_token", token, 7*24*time.Hour)
    c.Cookies().SetWithOptions("auth_token", token, http.Cookie{
        HttpOnly: true,
        Secure:   envy.Get("GO_ENV", "development") == "production",
        SameSite: http.SameSiteLaxMode,
        Path:     "/",
        MaxAge:   7 * 24 * 60 * 60, // 7 days in seconds
    })
    
    return token, nil
}

// ExtractJWTToken extracts JWT from cookie or Authorization header
func ExtractJWTToken(c buffalo.Context) string {
    // Check Authorization header first
    authHeader := c.Request().Header.Get("Authorization")
    if authHeader != "" {
        parts := strings.Split(authHeader, " ")
        if len(parts) == 2 && parts[0] == "Bearer" {
            return parts[1]
        }
    }
    
    // Check cookie
    if cookie, err := c.Cookies().Get("auth_token"); err == nil {
        return cookie
    }
    
    return ""
}
```

### 3. Authentication Middleware (`middleware/auth.go`)

```go
package middleware

import (
    "net/http"
    
    "github.com/gobuffalo/buffalo"
    "passport-buffalo/actions"
    "passport-buffalo/models"
)

// RequireAuth middleware ensures user is authenticated
func RequireAuth(next buffalo.Handler) buffalo.Handler {
    return func(c buffalo.Context) error {
        // Check for session cookie
        sessionID, err := c.Cookies().Get("session_id")
        if err == nil {
            tx := c.Value("tx").(*pop.Connection)
            session := &models.Session{}
            if err := tx.Find(session, sessionID); err == nil {
                if session.ExpiresAt.After(time.Now()) {
                    user := &models.User{}
                    if err := tx.Find(user, session.UserID); err == nil {
                        c.Set("current_user", user)
                        c.Set("current_session", session)
                        return next(c)
                    }
                }
            }
        }
        
        c.Flash().Add("danger", "You must be signed in to access this page")
        return c.Redirect(http.StatusSeeOther, "/sign_in")
    }
}

// RequireJWT middleware validates JWT tokens for API endpoints
func RequireJWT(next buffalo.Handler) buffalo.Handler {
    return func(c buffalo.Context) error {
        token := actions.ExtractJWTToken(c)
        if token == "" {
            return c.Error(http.StatusUnauthorized, fmt.Errorf("missing authentication token"))
        }
        
        user, err := actions.ValidateJWT(token)
        if err != nil {
            return c.Error(http.StatusUnauthorized, fmt.Errorf("invalid or expired token"))
        }
        
        c.Set("current_user", user)
        return next(c)
    }
}

// RequireAdmin ensures user has admin role
func RequireAdmin(next buffalo.Handler) buffalo.Handler {
    return func(c buffalo.Context) error {
        user, ok := c.Value("current_user").(*models.User)
        if !ok || !user.IsAdmin() {
            return c.Error(http.StatusForbidden, fmt.Errorf("admin access required"))
        }
        return next(c)
    }
}
```

### 4. Session Controller (`actions/sessions.go`)

```go
package actions

import (
    "net/http"
    "net/url"
    "regexp"
    "strings"
    
    "github.com/gobuffalo/buffalo"
    "github.com/gobuffalo/buffalo/render"
    "github.com/gobuffalo/envy"
    "passport-buffalo/models"
)

// SessionsNew renders the sign in page
func SessionsNew(c buffalo.Context) error {
    c.Set("returnTo", sanitizeReturnURL(c.Param("returnTo")))
    return c.Render(http.StatusOK, r.HTML("sessions/new.plush.html"))
}

// SessionsCreate handles sign in
func SessionsCreate(c buffalo.Context) error {
    tx := c.Value("tx").(*pop.Connection)
    
    email := strings.ToLower(strings.TrimSpace(c.Param("email_address")))
    password := c.Param("password")
    
    // Find user
    user := &models.User{}
    err := tx.Where("email_address = ?", email).First(user)
    if err != nil {
        c.Flash().Add("danger", "Invalid email or password")
        return c.Redirect(http.StatusSeeOther, "/sign_in")
    }
    
    // Verify password
    if !user.Authorize(password) {
        c.Flash().Add("danger", "Invalid email or password")
        return c.Redirect(http.StatusSeeOther, "/sign_in")
    }
    
    // Create session
    session := &models.Session{
        UserID:    user.ID,
        UserAgent: c.Request().Header.Get("User-Agent"),
        IPAddress: c.Request().RemoteAddr,
    }
    
    if err := tx.Create(session); err != nil {
        return err
    }
    
    // Set session cookie
    c.Cookies().SetWithOptions("session_id", session.ID.String(), http.Cookie{
        HttpOnly: true,
        Secure:   envy.Get("GO_ENV", "development") == "production",
        SameSite: http.SameSiteLaxMode,
        Path:     "/",
        MaxAge:   30 * 24 * 60 * 60, // 30 days
    })
    
    // Set JWT cookie for cross-domain auth
    SetJWTCookie(c, user)
    
    // Handle Turbo Stream responses
    if c.Request().Header.Get("Accept") == "text/vnd.turbo-stream.html" {
        return c.Render(http.StatusOK, r.String(`
            <turbo-stream action="replace" target="authentication">
                <template>
                    <div class="success-message">Welcome back!</div>
                </template>
            </turbo-stream>
            <turbo-stream action="replace" target="auth_status">
                <template>
                    <span>Signed in as %s</span>
                </template>
            </turbo-stream>
        `, user.EmailAddress))
    }
    
    // Redirect to return URL or default
    returnTo := c.Param("returnTo")
    if returnTo == "" {
        returnTo = c.Session().Get("return_to")
        c.Session().Delete("return_to")
    }
    
    if returnTo == "" {
        if user.IsAdmin() {
            returnTo = "/admin"
        } else {
            returnTo = "/"
        }
    }
    
    return c.Redirect(http.StatusSeeOther, sanitizeReturnURL(returnTo))
}

// SessionsDestroy handles sign out
func SessionsDestroy(c buffalo.Context) error {
    tx := c.Value("tx").(*pop.Connection)
    
    // Delete session from database
    if session, ok := c.Value("current_session").(*models.Session); ok {
        tx.Destroy(session)
    }
    
    // Clear cookies
    c.Cookies().Delete("session_id")
    c.Cookies().Delete("auth_token")
    
    c.Flash().Add("info", "You have been signed out")
    return c.Redirect(http.StatusSeeOther, "/")
}

// sanitizeReturnURL validates and sanitizes redirect URLs
func sanitizeReturnURL(returnURL string) string {
    if returnURL == "" {
        return ""
    }
    
    parsedURL, err := url.Parse(returnURL)
    if err != nil {
        return ""
    }
    
    // Check allowed hosts
    allowedHosts := getAllowedHosts()
    if !isAllowedHost(parsedURL.Host, allowedHosts) {
        return ""
    }
    
    return returnURL
}

func getAllowedHosts() []interface{} {
    if envy.Get("GO_ENV", "development") == "production" {
        return []interface{}{
            "oceanheart.ai",
            "www.oceanheart.ai",
            regexp.MustCompile(`^[a-z0-9-]+\.oceanheart\.ai$`),
        }
    }
    
    return []interface{}{
        "lvh.me",
        regexp.MustCompile(`^[a-z0-9-]+\.lvh\.me$`),
        "localhost",
    }
}

func isAllowedHost(host string, allowed []interface{}) bool {
    for _, a := range allowed {
        switch v := a.(type) {
        case string:
            if host == v {
                return true
            }
        case *regexp.Regexp:
            if v.MatchString(host) {
                return true
            }
        }
    }
    return false
}
```

### 5. API Authentication Controller (`actions/api/auth.go`)

```go
package api

import (
    "net/http"
    
    "github.com/gobuffalo/buffalo"
    "passport-buffalo/actions"
    "passport-buffalo/models"
)

// AuthVerify verifies JWT token validity
func AuthVerify(c buffalo.Context) error {
    token := c.Param("token")
    if token == "" {
        token = actions.ExtractJWTToken(c)
    }
    
    if token == "" {
        return c.Render(http.StatusUnauthorized, r.JSON(map[string]interface{}{
            "valid":   false,
            "error":   "Unauthorized",
            "message": "Missing token",
        }))
    }
    
    user, err := actions.ValidateJWT(token)
    if err != nil {
        return c.Render(http.StatusUnauthorized, r.JSON(map[string]interface{}{
            "valid":   false,
            "error":   "Unauthorized",
            "message": "Invalid or expired token",
        }))
    }
    
    return c.Render(http.StatusOK, r.JSON(map[string]interface{}{
        "valid": true,
        "user": map[string]interface{}{
            "userId": user.ID,
            "email":  user.EmailAddress,
            "role":   user.Role,
        },
    }))
}

// AuthRefresh refreshes JWT token
func AuthRefresh(c buffalo.Context) error {
    token := c.Param("token")
    if token == "" {
        token = actions.ExtractJWTToken(c)
    }
    
    user, err := actions.ValidateJWT(token)
    if err != nil {
        return c.Render(http.StatusUnauthorized, r.JSON(map[string]interface{}{
            "success": false,
            "error":   "Invalid or expired token",
        }))
    }
    
    newToken, err := actions.SetJWTCookie(c, user)
    if err != nil {
        return err
    }
    
    return c.Render(http.StatusOK, r.JSON(map[string]interface{}{
        "success": true,
        "token":   newToken,
        "user": map[string]interface{}{
            "userId": user.ID,
            "email":  user.EmailAddress,
            "role":   user.Role,
        },
    }))
}

// AuthSignIn handles API sign in
func AuthSignIn(c buffalo.Context) error {
    tx := c.Value("tx").(*pop.Connection)
    
    email := c.Param("email")
    password := c.Param("password")
    
    user := &models.User{}
    err := tx.Where("email_address = ?", email).First(user)
    if err != nil || !user.Authorize(password) {
        return c.Render(http.StatusUnauthorized, r.JSON(map[string]interface{}{
            "success": false,
            "error":   "Invalid email or password",
        }))
    }
    
    token, err := actions.SetJWTCookie(c, user)
    if err != nil {
        return err
    }
    
    return c.Render(http.StatusOK, r.JSON(map[string]interface{}{
        "success": true,
        "token":   token,
        "user": map[string]interface{}{
            "userId": user.ID,
            "email":  user.EmailAddress,
            "role":   user.Role,
        },
    }))
}

// AuthSignOut handles API sign out
func AuthSignOut(c buffalo.Context) error {
    c.Cookies().Delete("auth_token")
    
    return c.Render(http.StatusOK, r.JSON(map[string]interface{}{
        "success": true,
        "message": "Successfully signed out",
    }))
}

// AuthUser returns current user info
func AuthUser(c buffalo.Context) error {
    user := c.Value("current_user").(*models.User)
    
    return c.Render(http.StatusOK, r.JSON(map[string]interface{}{
        "user": map[string]interface{}{
            "userId": user.ID,
            "email":  user.EmailAddress,
            "role":   user.Role,
        },
    }))
}
```

### 6. Rate Limiting Middleware (`middleware/rate_limit.go`)

```go
package middleware

import (
    "net/http"
    "sync"
    "time"
    
    "github.com/gobuffalo/buffalo"
)

type RateLimiter struct {
    requests map[string][]time.Time
    mu       sync.RWMutex
    limit    int
    window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
    rl := &RateLimiter{
        requests: make(map[string][]time.Time),
        limit:    limit,
        window:   window,
    }
    
    // Clean up old entries periodically
    go rl.cleanup()
    
    return rl
}

func (rl *RateLimiter) Allow(key string) bool {
    rl.mu.Lock()
    defer rl.mu.Unlock()
    
    now := time.Now()
    windowStart := now.Add(-rl.window)
    
    // Get existing requests for this key
    requests := rl.requests[key]
    
    // Filter out old requests
    validRequests := []time.Time{}
    for _, req := range requests {
        if req.After(windowStart) {
            validRequests = append(validRequests, req)
        }
    }
    
    // Check if limit exceeded
    if len(validRequests) >= rl.limit {
        rl.requests[key] = validRequests
        return false
    }
    
    // Add current request
    validRequests = append(validRequests, now)
    rl.requests[key] = validRequests
    
    return true
}

func (rl *RateLimiter) cleanup() {
    ticker := time.NewTicker(1 * time.Minute)
    for range ticker.C {
        rl.mu.Lock()
        now := time.Now()
        for key, requests := range rl.requests {
            validRequests := []time.Time{}
            for _, req := range requests {
                if req.After(now.Add(-rl.window)) {
                    validRequests = append(validRequests, req)
                }
            }
            if len(validRequests) == 0 {
                delete(rl.requests, key)
            } else {
                rl.requests[key] = validRequests
            }
        }
        rl.mu.Unlock()
    }
}

// RateLimit middleware factory
func RateLimit(limit int, window time.Duration) buffalo.MiddlewareFunc {
    limiter := NewRateLimiter(limit, window)
    
    return func(next buffalo.Handler) buffalo.Handler {
        return func(c buffalo.Context) error {
            // Use IP address as rate limit key
            key := c.Request().RemoteAddr
            
            if !limiter.Allow(key) {
                c.Flash().Add("danger", "Too many requests. Please try again later.")
                return c.Redirect(http.StatusTooManyRequests, "/sign_in")
            }
            
            return next(c)
        }
    }
}
```

### 7. Application Routes (`actions/app.go`)

```go
package actions

import (
    "github.com/gobuffalo/buffalo"
    "github.com/gobuffalo/buffalo-pop/v3/pop/popmw"
    "github.com/gobuffalo/envy"
    csrf "github.com/gobuffalo/mw-csrf"
    forcessl "github.com/gobuffalo/mw-forcessl"
    i18n "github.com/gobuffalo/mw-i18n/v2"
    paramlogger "github.com/gobuffalo/mw-paramlogger"
    "github.com/gobuffalo/x/sessions"
    "github.com/rs/cors"
    
    "passport-buffalo/middleware"
    "passport-buffalo/models"
)

var app *buffalo.App
var ENV = envy.Get("GO_ENV", "development")

func App() *buffalo.App {
    if app == nil {
        app = buffalo.New(buffalo.Options{
            Env:          ENV,
            SessionStore: sessions.NewCookieStore([]byte(envy.Get("SESSION_SECRET", ""))),
            SessionName:  "_passport_session",
        })
        
        // Middleware stack
        app.Use(forceSSL())
        app.Use(paramlogger.ParameterLogger)
        app.Use(csrf.New)
        app.Use(popmw.Transaction(models.DB))
        app.Use(translations())
        app.Use(setCurrentUser)
        
        // CORS for API endpoints
        app.Use(cors.New(cors.Options{
            AllowedOrigins: getAllowedOrigins(),
            AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
            AllowedHeaders: []string{"Authorization", "Content-Type"},
            AllowCredentials: true,
        }).Handler)
        
        // Public routes
        app.GET("/", HomeHandler)
        app.GET("/sign_in", SessionsNew)
        app.POST("/sign_in", middleware.RateLimit(10, 3*time.Minute)(SessionsCreate))
        app.DELETE("/sign_out", SessionsDestroy)
        app.GET("/sign_up", RegistrationsNew)
        app.POST("/sign_up", RegistrationsCreate)
        
        // Password reset routes
        app.GET("/passwords/new", PasswordsNew)
        app.POST("/passwords", PasswordsCreate)
        app.GET("/passwords/{token}/edit", PasswordsEdit)
        app.PUT("/passwords/{token}", PasswordsUpdate)
        
        // API routes (no CSRF)
        api := app.Group("/api")
        api.Middleware.Remove(csrf.New)
        api.POST("/auth/verify", AuthVerify)
        api.POST("/auth/refresh", AuthRefresh)
        api.POST("/auth/signin", AuthSignIn)
        api.DELETE("/auth/signout", middleware.RequireJWT(AuthSignOut))
        api.GET("/auth/user", middleware.RequireJWT(AuthUser))
        
        // Admin routes
        admin := app.Group("/admin")
        admin.Use(middleware.RequireAuth)
        admin.Use(middleware.RequireAdmin)
        admin.GET("/", AdminUsersIndex)
        admin.GET("/users", AdminUsersIndex)
        admin.GET("/users/{user_id}", AdminUsersShow)
        admin.DELETE("/users/{user_id}", AdminUsersDestroy)
        admin.POST("/users/{user_id}/toggle_role", AdminUsersToggleRole)
        
        // Serve static files
        app.ServeFiles("/", http.FS(publicFS))
    }
    
    return app
}

func setCurrentUser(next buffalo.Handler) buffalo.Handler {
    return func(c buffalo.Context) error {
        if uid := c.Session().Get("user_id"); uid != nil {
            u := &models.User{}
            tx := c.Value("tx").(*pop.Connection)
            tx.Find(u, uid)
            c.Set("current_user", u)
        }
        return next(c)
    }
}

func getAllowedOrigins() []string {
    if ENV == "production" {
        return []string{
            "https://oceanheart.ai",
            "https://www.oceanheart.ai",
            "https://watson.oceanheart.ai",
            "https://notebook.oceanheart.ai",
            "https://preflight.oceanheart.ai",
            "https://my.oceanheart.ai",
            "https://labs.oceanheart.ai",
        }
    }
    
    return []string{
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://lvh.me:3000",
        "http://*.lvh.me:3000",
    }
}
```

## Security Considerations

### 1. Password Security
- Bcrypt with default cost factor (10)
- Password length requirements (8-72 characters)
- Secure password reset tokens with expiration

### 2. Session Management
- HTTP-only, secure cookies
- Session expiration (30 days)
- IP address and user agent tracking
- Ability to invalidate all sessions

### 3. JWT Security
- HS256 signing algorithm
- 7-day expiration
- Secure storage in HTTP-only cookies
- Token refresh mechanism

### 4. CORS Configuration
- Whitelist of allowed origins
- Credentials support for cross-domain auth
- Proper preflight handling

### 5. Rate Limiting
- Sign-in attempts: 10 per 3 minutes
- Password reset: 5 per hour
- API endpoints: 100 per minute

### 6. CSRF Protection
- Double-submit cookie pattern
- Token validation on state-changing operations
- Exemption for API endpoints (JWT protected)

## Deployment Options and Considerations

### Deployment Platforms

#### 1. Traditional VPS (DigitalOcean, Linode, AWS EC2)

**Pros:**
- Full control over environment
- Cost-effective for long-running services
- Easy to implement custom monitoring
- Direct access to system resources

**Cons:**
- Requires manual scaling
- More operational overhead
- Need to manage security updates

**Setup:**
```bash
# Build for Linux
GOOS=linux GOARCH=amd64 buffalo build --static -o bin/passport

# Transfer to server
scp bin/passport user@server:/opt/passport-buffalo/

# Set up systemd service (see configuration below)
sudo systemctl enable passport
sudo systemctl start passport
```

#### 2. Container-Based (Docker/Kubernetes)

**Dockerfile:**
```dockerfile
# Multi-stage build for smaller image
FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git nodejs npm
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build assets and binary
RUN npm install && npm run build
RUN buffalo build --static -o /bin/app

# Final stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates

WORKDIR /root/
COPY --from=builder /bin/app .
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/public ./public

ENV GO_ENV=production
EXPOSE 3000

CMD ["./app"]
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://user:pass@postgres:5432/passport
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
      SESSION_SECRET: ${SESSION_SECRET}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: passport
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

**Kubernetes Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: passport-buffalo
spec:
  replicas: 3
  selector:
    matchLabels:
      app: passport-buffalo
  template:
    metadata:
      labels:
        app: passport-buffalo
    spec:
      containers:
      - name: app
        image: passport-buffalo:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: passport-secrets
              key: database-url
        - name: SECRET_KEY_BASE
          valueFrom:
            secretKeyRef:
              name: passport-secrets
              key: secret-key-base
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: passport-buffalo
spec:
  selector:
    app: passport-buffalo
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

#### 3. Platform-as-a-Service (Heroku, Fly.io, Railway)

**Fly.io Configuration (`fly.toml`):**
```toml
app = "passport-buffalo"
primary_region = "iad"

[build]
  builder = "paketobuildpacks/builder:base"
  buildpacks = ["gcr.io/paketo-buildpacks/go"]

[env]
  GO_ENV = "production"
  PORT = "8080"

[experimental]
  auto_rollback = true

[[services]]
  http_checks = []
  internal_port = 8080
  protocol = "tcp"
  script_checks = []

  [services.concurrency]
    hard_limit = 25
    soft_limit = 20
    type = "connections"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    grace_period = "1s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"
```

**Heroku Deployment:**
```bash
# Create app
heroku create passport-buffalo

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set GO_ENV=production
heroku config:set SECRET_KEY_BASE=$(openssl rand -hex 32)
heroku config:set SESSION_SECRET=$(openssl rand -hex 32)

# Deploy
git push heroku main

# Run migrations
heroku run buffalo pop migrate
```

#### 4. Serverless/Edge Functions (Vercel, Netlify, Cloudflare Workers)

**Note:** Buffalo is not ideal for serverless, but can be adapted:

```go
// serverless/handler.go
package handler

import (
    "net/http"
    "passport-buffalo/actions"
)

var app = actions.App()

func Handler(w http.ResponseWriter, r *http.Request) {
    app.ServeHTTP(w, r)
}
```

### Database Deployment Options

#### 1. Managed PostgreSQL Services

**Recommended for production:**
- **Neon**: Serverless Postgres with branching
  ```bash
  DATABASE_URL=postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/passport
  ```
- **Supabase**: PostgreSQL with built-in auth
- **AWS RDS**: Enterprise-grade with Multi-AZ
- **DigitalOcean Managed Databases**: Simple and cost-effective
- **Google Cloud SQL**: Auto-scaling and high availability

#### 2. Database Pooling

**PgBouncer Configuration:**
```ini
[databases]
passport = host=localhost port=5432 dbname=passport

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 100
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 50
```

### Load Balancing and High Availability

#### 1. HAProxy Configuration
```
global
    maxconn 4096
    log stdout local0

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog

frontend web
    bind *:443 ssl crt /etc/haproxy/certs/passport.pem
    redirect scheme https if !{ ssl_fc }
    
    # Rate limiting
    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src
    http-request deny if { sc_http_req_rate(0) gt 20 }
    
    default_backend passport_servers

backend passport_servers
    balance roundrobin
    option httpchk GET /health
    
    server app1 10.0.1.10:3000 check
    server app2 10.0.1.11:3000 check
    server app3 10.0.1.12:3000 check
```

#### 2. Blue-Green Deployment Script
```bash
#!/bin/bash
# blue-green-deploy.sh

BLUE_PORT=3000
GREEN_PORT=3001
CURRENT=$(curl -s http://localhost/health | jq -r '.deployment')

if [ "$CURRENT" == "blue" ]; then
    NEW_COLOR="green"
    NEW_PORT=$GREEN_PORT
    OLD_PORT=$BLUE_PORT
else
    NEW_COLOR="blue"
    NEW_PORT=$BLUE_PORT
    OLD_PORT=$GREEN_PORT
fi

echo "Deploying to $NEW_COLOR environment..."

# Deploy new version
systemctl stop passport-$NEW_COLOR
cp /tmp/passport-new /opt/passport-buffalo-$NEW_COLOR/bin/passport
systemctl start passport-$NEW_COLOR

# Health check
for i in {1..30}; do
    if curl -f http://localhost:$NEW_PORT/health; then
        echo "Health check passed"
        break
    fi
    sleep 2
done

# Switch traffic
nginx -s reload -c /etc/nginx/sites-available/passport-$NEW_COLOR.conf

# Stop old version after 5 minutes
sleep 300
systemctl stop passport-$CURRENT
```

### Secrets Management

#### 1. HashiCorp Vault Integration
```go
// config/vault.go
package config

import (
    vault "github.com/hashicorp/vault/api"
)

func LoadSecretsFromVault() error {
    config := vault.DefaultConfig()
    client, err := vault.NewClient(config)
    if err != nil {
        return err
    }
    
    client.SetToken(os.Getenv("VAULT_TOKEN"))
    
    secret, err := client.Logical().Read("secret/data/passport")
    if err != nil {
        return err
    }
    
    data := secret.Data["data"].(map[string]interface{})
    os.Setenv("SECRET_KEY_BASE", data["secret_key_base"].(string))
    os.Setenv("DATABASE_URL", data["database_url"].(string))
    
    return nil
}
```

#### 2. AWS Secrets Manager
```go
// config/aws_secrets.go
package config

import (
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/secretsmanager"
)

func LoadSecretsFromAWS() error {
    sess := session.Must(session.NewSession())
    svc := secretsmanager.New(sess)
    
    input := &secretsmanager.GetSecretValueInput{
        SecretId: aws.String("passport-buffalo-secrets"),
    }
    
    result, err := svc.GetSecretValue(input)
    if err != nil {
        return err
    }
    
    var secrets map[string]string
    json.Unmarshal([]byte(*result.SecretString), &secrets)
    
    for key, value := range secrets {
        os.Setenv(key, value)
    }
    
    return nil
}
```

### Monitoring and Observability

#### 1. Prometheus Metrics
```go
// middleware/metrics.go
package middleware

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    httpDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
        Name: "http_request_duration_seconds",
        Help: "Duration of HTTP requests.",
    }, []string{"path", "method", "status"})
    
    loginAttempts = promauto.NewCounterVec(prometheus.CounterOpts{
        Name: "login_attempts_total",
        Help: "Total number of login attempts",
    }, []string{"status"})
    
    activeSessions = promauto.NewGauge(prometheus.GaugeOpts{
        Name: "active_sessions",
        Help: "Number of active sessions",
    })
)
```

#### 2. Application Performance Monitoring (APM)

**New Relic Integration:**
```go
// main.go
import "github.com/newrelic/go-agent/v3/newrelic"

func main() {
    app, err := newrelic.NewApplication(
        newrelic.ConfigAppName("Passport Buffalo"),
        newrelic.ConfigLicense(os.Getenv("NEW_RELIC_LICENSE_KEY")),
        newrelic.ConfigAppLogForwardingEnabled(true),
    )
    if err != nil {
        log.Fatal(err)
    }
    
    // Wrap Buffalo app
    buffalo.Use(nrgorilla.Middleware(app))
}
```

### Zero-Downtime Deployment Strategy

#### 1. Rolling Update Process
```bash
#!/bin/bash
# rolling-update.sh

INSTANCES=3
APP_NAME="passport-buffalo"

for i in $(seq 1 $INSTANCES); do
    echo "Updating instance $i..."
    
    # Remove from load balancer
    consul deregister ${APP_NAME}-${i}
    
    # Stop service
    systemctl stop ${APP_NAME}-${i}
    
    # Update binary
    cp /tmp/new-binary /opt/${APP_NAME}-${i}/bin/passport
    
    # Start service
    systemctl start ${APP_NAME}-${i}
    
    # Health check
    until curl -f http://localhost:300${i}/health; do
        sleep 1
    done
    
    # Re-add to load balancer
    consul register ${APP_NAME}-${i}
    
    # Wait before next instance
    sleep 30
done
```

#### 2. Database Migration Strategy
```go
// migrations/run.go
package main

import (
    "log"
    "passport-buffalo/models"
    
    "github.com/gobuffalo/pop/v6"
)

func RunMigrationsWithLock() error {
    // Acquire distributed lock
    lock, err := acquireLock("migration-lock")
    if err != nil {
        return err
    }
    defer lock.Release()
    
    // Run migrations
    mig, err := pop.NewFileMigrator("./migrations", models.DB)
    if err != nil {
        return err
    }
    
    return mig.Up()
}
```

### CDN and Static Asset Delivery

#### 1. CloudFlare Configuration
```javascript
// cloudflare-worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Cache static assets
  if (url.pathname.startsWith('/assets/')) {
    const cache = caches.default
    let response = await cache.match(request)
    
    if (!response) {
      response = await fetch(request)
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'public, max-age=31536000')
      
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      })
      
      event.waitUntil(cache.put(request, response.clone()))
    }
    
    return response
  }
  
  // Pass through dynamic requests
  return fetch(request)
}
```

### Backup and Disaster Recovery

#### 1. Automated Backup Script
```bash
#!/bin/bash
# backup.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
S3_BUCKET="s3://passport-backups"

# Database backup
pg_dump $DATABASE_URL | gzip > ${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz

# Upload to S3
aws s3 cp ${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz ${S3_BUCKET}/

# Keep only last 30 days locally
find ${BACKUP_DIR} -name "db_*.sql.gz" -mtime +30 -delete

# Keep last 90 days in S3
aws s3 ls ${S3_BUCKET}/ | while read -r line; do
  createDate=$(echo $line | awk '{print $1" "$2}')
  createDate=$(date -d "$createDate" +%s)
  olderThan=$(date -d "90 days ago" +%s)
  if [[ $createDate -lt $olderThan ]]; then
    fileName=$(echo $line | awk '{print $4}')
    aws s3 rm ${S3_BUCKET}/${fileName}
  fi
done
```

#### 2. Disaster Recovery Runbook
```markdown
## Disaster Recovery Procedure

### 1. Database Failure
- Switch to read replica: `UPDATE dns SET target = 'replica.db.host'`
- Promote replica: `pg_ctl promote -D /var/lib/postgresql/data`
- Update connection string in app configuration
- Deploy configuration change

### 2. Application Server Failure
- Traffic automatically redirected by load balancer
- Provision new instance from AMI/snapshot
- Deploy application code
- Add to load balancer pool

### 3. Complete Region Failure
- Activate DR site in secondary region
- Update DNS to point to DR load balancer
- Restore database from latest cross-region backup
- Verify application functionality
```

## Deployment Configuration

### 1. Environment Variables
```bash
GO_ENV=production
PORT=3000
DATABASE_URL=postgres://user:pass@host:5432/passport_production
SECRET_KEY_BASE=<64-character-hex-string>
SESSION_SECRET=<64-character-hex-string>
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
SMTP_FROM=noreply@oceanheart.ai
```

### 2. Database Migrations
```bash
buffalo pop migrate
```

### 3. Asset Compilation
```bash
buffalo build --static -o bin/passport
```

### 4. Systemd Service
```ini
[Unit]
Description=Passport Buffalo Authentication Service
After=network.target postgresql.service

[Service]
Type=simple
User=passport
WorkingDirectory=/opt/passport-buffalo
ExecStart=/opt/passport-buffalo/bin/passport
Restart=always
RestartSec=10
Environment="GO_ENV=production"
Environment="PORT=3000"

[Install]
WantedBy=multi-user.target
```

### 5. Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name passport.oceanheart.ai;
    
    ssl_certificate /etc/letsencrypt/live/passport.oceanheart.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/passport.oceanheart.ai/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Testing Strategy

### 1. Unit Tests
```go
// models/user_test.go
func Test_User_Create(t *testing.T) {
    r := require.New(t)
    u := &models.User{
        EmailAddress: "test@example.com",
        Password:     "password123",
    }
    
    verrs, err := u.Create(models.DB)
    r.NoError(err)
    r.False(verrs.HasAny())
    r.NotZero(u.ID)
    r.NotEqual(u.Password, u.PasswordHash)
}
```

### 2. Integration Tests
```go
// actions/sessions_test.go
func Test_SessionsCreate(t *testing.T) {
    r := require.New(t)
    
    // Create test user
    u := &models.User{
        EmailAddress: "test@example.com",
        Password:     "password123",
    }
    models.DB.Create(u)
    
    // Test successful login
    res := as.HTML("/sign_in").Post(map[string]interface{}{
        "email_address": "test@example.com",
        "password":      "password123",
    })
    
    r.Equal(303, res.Code)
    r.Equal("/", res.Location())
}
```

### 3. API Tests
```go
// actions/api/auth_test.go
func Test_API_AuthVerify(t *testing.T) {
    r := require.New(t)
    
    u := &models.User{
        EmailAddress: "test@example.com",
        Password:     "password123",
    }
    models.DB.Create(u)
    
    token, _ := actions.GenerateJWT(u)
    
    res := as.JSON("/api/auth/verify").Post(map[string]interface{}{
        "token": token,
    })
    
    r.Equal(200, res.Code)
    r.Contains(res.Body.String(), "valid")
}
```

## Migration Path from Rails

### 1. Data Migration
- Export users table from Rails PostgreSQL
- Transform password_digest to password_hash
- Import into Buffalo PostgreSQL database
- Maintain user IDs for session continuity

### 2. Feature Parity Checklist
- [x] User registration with email validation
- [x] Session-based authentication
- [x] JWT token generation and validation
- [x] Password reset functionality
- [x] Admin user management
- [x] Cross-domain authentication API
- [x] Rate limiting on authentication endpoints
- [x] CSRF protection
- [x] Secure cookie handling
- [x] Return URL sanitization
- [x] Turbo Stream responses
- [x] Glass morphism UI styling

### 3. API Compatibility
- Maintain same JWT payload structure
- Support both camelCase and snake_case in API
- Same cookie names for gradual migration
- Compatible CORS configuration

## Performance Optimizations

### 1. Database Indexing
- Email address index for fast lookups
- Session user_id index for relationship queries
- Token expiration index for cleanup

### 2. Connection Pooling
```go
// models/models.go
func init() {
    var err error
    if DB, err = pop.Connect(ENV); err != nil {
        log.Fatal(err)
    }
    
    // Configure connection pool
    DB.DB().SetMaxOpenConns(25)
    DB.DB().SetMaxIdleConns(5)
    DB.DB().SetConnMaxLifetime(5 * time.Minute)
}
```

### 3. Caching Strategy
- Redis for session storage (optional)
- In-memory rate limit tracking
- Template caching in production

### 4. Asset Optimization
- Webpack for JavaScript bundling
- SCSS compilation with compression
- Static asset serving with CDN

## Monitoring and Observability

### 1. Structured Logging
```go
// Use logrus for structured logging
log.WithFields(logrus.Fields{
    "user_id": user.ID,
    "action":  "login",
    "ip":      c.Request().RemoteAddr,
}).Info("User signed in")
```

### 2. Metrics Collection
- Prometheus metrics endpoint
- Login success/failure rates
- API endpoint response times
- Active session count

### 3. Health Checks
```go
app.GET("/health", func(c buffalo.Context) error {
    // Check database connection
    if err := models.DB.DB().Ping(); err != nil {
        return c.Render(503, r.JSON(map[string]string{
            "status": "unhealthy",
            "error":  err.Error(),
        }))
    }
    
    return c.Render(200, r.JSON(map[string]string{
        "status": "healthy",
    }))
})
```

## Conclusion

This Buffalo implementation provides a complete, production-ready authentication system that maintains feature parity with the Rails Passport application while leveraging Go's performance advantages and Buffalo's developer-friendly conventions. The system is designed for scalability, security, and ease of maintenance, making it suitable for the Oceanheart.ai ecosystem's authentication needs.