package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gobuffalo/buffalo"
	"github.com/gobuffalo/pop/v6"
	"passport-buffalo/auth"
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
		token := auth.ExtractJWTToken(c)
		if token == "" {
			return c.Error(http.StatusUnauthorized, fmt.Errorf("missing authentication token"))
		}
		
		user, err := auth.ValidateJWT(token)
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

// SetCurrentUser middleware sets the current user in the context
func SetCurrentUser(next buffalo.Handler) buffalo.Handler {
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