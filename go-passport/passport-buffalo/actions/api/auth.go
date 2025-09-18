package api

import (
	"net/http"
	"strings"

	"github.com/gobuffalo/buffalo"
	"github.com/gobuffalo/buffalo/render"
	"github.com/gobuffalo/pop/v6"
	"passport-buffalo/auth"
	"passport-buffalo/models"
)

var r = render.New(render.Options{})

// AuthVerify verifies JWT token validity
func AuthVerify(c buffalo.Context) error {
	token := c.Param("token")
	if token == "" {
		token = auth.ExtractJWTToken(c)
	}
	
	if token == "" {
		return c.Render(http.StatusUnauthorized, r.JSON(map[string]interface{}{
			"valid":   false,
			"error":   "Unauthorized",
			"message": "Missing token",
		}))
	}
	
	user, err := auth.ValidateJWT(token)
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
		token = auth.ExtractJWTToken(c)
	}
	
	user, err := auth.ValidateJWT(token)
	if err != nil {
		return c.Render(http.StatusUnauthorized, r.JSON(map[string]interface{}{
			"success": false,
			"error":   "Invalid or expired token",
		}))
	}
	
	newToken, err := auth.SetJWTCookie(c, user)
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
	
	email := strings.ToLower(strings.TrimSpace(c.Param("email")))
	password := c.Param("password")
	
	user := &models.User{}
	err := tx.Where("email_address = ?", email).First(user)
	if err != nil || !user.Authorize(password) {
		return c.Render(http.StatusUnauthorized, r.JSON(map[string]interface{}{
			"success": false,
			"error":   "Invalid email or password",
		}))
	}
	
	token, err := auth.SetJWTCookie(c, user)
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