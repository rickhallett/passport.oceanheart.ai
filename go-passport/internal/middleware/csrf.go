package middleware

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"time"
)

type CSRFMiddleware struct {
	secret []byte
}

func NewCSRFMiddleware(secret string) *CSRFMiddleware {
	return &CSRFMiddleware{
		secret: []byte(secret),
	}
}

func (m *CSRFMiddleware) Protect(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Skip CSRF for API endpoints (they use JWT)
		if isAPIRequest(r) {
			next(w, r)
			return
		}

		switch r.Method {
		case "GET", "HEAD", "OPTIONS", "TRACE":
			// Safe methods don't require CSRF token
			token := m.generateToken()
			setCSRFCookie(w, token)
			next(w, r)
			return
		}

		// Verify CSRF token for state-changing methods
		cookieToken, err := getCSRFCookie(r)
		if err != nil {
			http.Error(w, "Missing CSRF cookie", http.StatusForbidden)
			return
		}

		formToken := r.FormValue("csrf_token")
		if formToken == "" {
			formToken = r.Header.Get("X-CSRF-Token")
		}

		if !m.validateToken(cookieToken, formToken) {
			http.Error(w, "Invalid CSRF token", http.StatusForbidden)
			return
		}

		next(w, r)
	}
}

func (m *CSRFMiddleware) generateToken() string {
	// Generate random bytes
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}

	// Create HMAC
	h := hmac.New(sha256.New, m.secret)
	h.Write(b)
	signature := h.Sum(nil)

	// Combine random bytes and signature
	token := append(b, signature...)
	
	// Encode as base64
	return base64.URLEncoding.EncodeToString(token)
}

func (m *CSRFMiddleware) validateToken(cookieToken, formToken string) bool {
	if cookieToken == "" || formToken == "" {
		return false
	}

	// Tokens must match exactly
	if cookieToken != formToken {
		return false
	}

	// Decode token
	tokenBytes, err := base64.URLEncoding.DecodeString(cookieToken)
	if err != nil {
		return false
	}

	// Token must be at least 64 bytes (32 random + 32 signature)
	if len(tokenBytes) < 64 {
		return false
	}

	// Split into random bytes and signature
	randomBytes := tokenBytes[:32]
	signature := tokenBytes[32:64]

	// Verify HMAC
	h := hmac.New(sha256.New, m.secret)
	h.Write(randomBytes)
	expectedSignature := h.Sum(nil)

	return hmac.Equal(signature, expectedSignature)
}

func setCSRFCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "csrf_token",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   isSecure(),
		SameSite: http.SameSiteLaxMode,
		MaxAge:   86400, // 24 hours
	})
}

func getCSRFCookie(r *http.Request) (string, error) {
	cookie, err := r.Cookie("csrf_token")
	if err != nil {
		return "", err
	}
	return cookie.Value, nil
}

func isAPIRequest(r *http.Request) bool {
	// Check if request is to API endpoints
	path := r.URL.Path
	return len(path) >= 5 && path[:5] == "/api/"
}

func isSecure() bool {
	// TODO: Get from config
	return false
}

func GetCSRFToken(r *http.Request) string {
	token, _ := getCSRFCookie(r)
	return token
}