package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/oceanheart/go-passport/internal/models"
)

var (
	ErrInvalidToken   = errors.New("invalid token")
	ErrTokenExpired   = errors.New("token expired")
	ErrInvalidClaims  = errors.New("invalid claims")
	ErrMissingUserID  = errors.New("missing user ID in claims")
	ErrMissingEmail   = errors.New("missing email in claims")
)

type JWTService struct {
	secretKey []byte
	issuer    string
}

type Claims struct {
	UserID int64  `json:"userId"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

type LegacyClaims struct {
	UserID int64  `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func NewJWTService(secretKey string, issuer string) *JWTService {
	return &JWTService{
		secretKey: []byte(secretKey),
		issuer:    issuer,
	}
}

func (s *JWTService) GenerateToken(user *models.User) (string, error) {
	now := time.Now()
	expiresAt := now.Add(7 * 24 * time.Hour) // 1 week expiration

	claims := Claims{
		UserID: user.ID,
		Email:  user.EmailAddress,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secretKey)
}

func (s *JWTService) ValidateToken(tokenString string) (*Claims, error) {
	// Try modern claims format first
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.secretKey, nil
	})

	if err == nil && token.Valid {
		if claims, ok := token.Claims.(*Claims); ok {
			if claims.UserID == 0 {
				return nil, ErrMissingUserID
			}
			if claims.Email == "" {
				return nil, ErrMissingEmail
			}
			return claims, nil
		}
		return nil, ErrInvalidClaims
	}

	// Try legacy claims format (for Rails compatibility)
	token, err = jwt.ParseWithClaims(tokenString, &LegacyClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.secretKey, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrInvalidToken
	}

	if !token.Valid {
		return nil, ErrInvalidToken
	}

	legacyClaims, ok := token.Claims.(*LegacyClaims)
	if !ok {
		return nil, ErrInvalidClaims
	}

	if legacyClaims.UserID == 0 {
		return nil, ErrMissingUserID
	}
	if legacyClaims.Email == "" {
		return nil, ErrMissingEmail
	}

	// Convert legacy claims to modern format
	return &Claims{
		UserID:           legacyClaims.UserID,
		Email:            legacyClaims.Email,
		RegisteredClaims: legacyClaims.RegisteredClaims,
	}, nil
}

func (s *JWTService) RefreshToken(claims *Claims) (string, error) {
	now := time.Now()
	expiresAt := now.Add(7 * 24 * time.Hour) // 1 week expiration

	newClaims := Claims{
		UserID: claims.UserID,
		Email:  claims.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, newClaims)
	return token.SignedString(s.secretKey)
}