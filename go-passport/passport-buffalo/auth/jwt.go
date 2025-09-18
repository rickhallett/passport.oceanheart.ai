package auth

import (
	"fmt"
	"strings"
	"time"

	"github.com/gobuffalo/buffalo"
	"github.com/gobuffalo/envy"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gofrs/uuid"
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
	
	c.Cookies().Set("auth_token", token, 7*24*60*60)
	
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