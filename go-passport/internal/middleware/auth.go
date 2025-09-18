package middleware

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"github.com/oceanheart/go-passport/internal/auth"
	"github.com/oceanheart/go-passport/internal/models"
	"github.com/oceanheart/go-passport/internal/service"
)

type contextKey string

const (
	UserContextKey    contextKey = "user"
	SessionContextKey contextKey = "session"
	ClaimsContextKey  contextKey = "claims"
)

type AuthMiddleware struct {
	authService *service.AuthService
	jwtService  *auth.JWTService
}

func NewAuthMiddleware(authService *service.AuthService, jwtService *auth.JWTService) *AuthMiddleware {
	return &AuthMiddleware{
		authService: authService,
		jwtService:  jwtService,
	}
}

func (m *AuthMiddleware) RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, _, err := m.extractAuth(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if user == nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}

func (m *AuthMiddleware) RequireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, _, err := m.extractAuth(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if user == nil || !user.IsAdmin() {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		next(w, r)
	}
}

func (m *AuthMiddleware) ExtractAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, claims, _ := m.extractAuth(r)
		
		if user != nil {
			ctx := context.WithValue(r.Context(), UserContextKey, user)
			r = r.WithContext(ctx)
		}

		if claims != nil {
			ctx := context.WithValue(r.Context(), ClaimsContextKey, claims)
			r = r.WithContext(ctx)
		}

		next(w, r)
	}
}

func (m *AuthMiddleware) extractAuth(r *http.Request) (*models.User, *auth.Claims, error) {
	// Try JWT from Authorization header first
	if token := extractBearerToken(r); token != "" {
		claims, err := m.jwtService.ValidateToken(token)
		if err == nil {
			user, err := m.authService.GetUserFromToken(r.Context(), token)
			if err == nil {
				return user, claims, nil
			}
		}
	}

	// Try JWT from oh_session cookie
	if cookie, err := r.Cookie("oh_session"); err == nil && cookie.Value != "" {
		claims, err := m.jwtService.ValidateToken(cookie.Value)
		if err == nil {
			user, err := m.authService.GetUserFromToken(r.Context(), cookie.Value)
			if err == nil {
				return user, claims, nil
			}
		}
	}

	// Try legacy jwt_token cookie
	if cookie, err := r.Cookie("jwt_token"); err == nil && cookie.Value != "" {
		claims, err := m.jwtService.ValidateToken(cookie.Value)
		if err == nil {
			user, err := m.authService.GetUserFromToken(r.Context(), cookie.Value)
			if err == nil {
				return user, claims, nil
			}
		}
	}

	// Try session_id cookie
	if cookie, err := r.Cookie("session_id"); err == nil && cookie.Value != "" {
		sessionID, err := strconv.ParseInt(cookie.Value, 10, 64)
		if err == nil {
			user, err := m.authService.GetUserFromSession(r.Context(), sessionID)
			if err == nil {
				return user, nil, nil
			}
		}
	}

	return nil, nil, nil
}

func extractBearerToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return ""
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return ""
	}

	return parts[1]
}

func GetUser(ctx context.Context) *models.User {
	if user, ok := ctx.Value(UserContextKey).(*models.User); ok {
		return user
	}
	return nil
}

func GetClaims(ctx context.Context) *auth.Claims {
	if claims, ok := ctx.Value(ClaimsContextKey).(*auth.Claims); ok {
		return claims
	}
	return nil
}

func GetSession(ctx context.Context) *models.Session {
	if session, ok := ctx.Value(SessionContextKey).(*models.Session); ok {
		return session
	}
	return nil
}