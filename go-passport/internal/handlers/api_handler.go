package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/oceanheart/go-passport/internal/config"
	"github.com/oceanheart/go-passport/internal/middleware"
	"github.com/oceanheart/go-passport/internal/models"
	"github.com/oceanheart/go-passport/internal/service"
)

type APIHandler struct {
	authService *service.AuthService
	userService *service.UserService
	config      *config.Config
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

type SignInRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type SignInResponse struct {
	User  models.UserResponse `json:"user"`
	Token string              `json:"token"`
}

func NewAPIHandler(
	authService *service.AuthService,
	userService *service.UserService,
	config *config.Config,
) *APIHandler {
	return &APIHandler{
		authService: authService,
		userService: userService,
		config:      config,
	}
}

func (h *APIHandler) SignIn(w http.ResponseWriter, r *http.Request) {
	var req SignInRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get client IP and user agent
	clientIP := getClientIP(r)
	userAgent := r.UserAgent()

	// Authenticate user
	user, session, token, err := h.authService.SignIn(r.Context(), req.Email, req.Password, clientIP, userAgent)
	if err != nil {
		h.writeError(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Set session cookie
	h.setSessionCookie(w, session.ID)
	
	// Set JWT cookie
	h.setJWTCookie(w, token)

	response := SignInResponse{
		User:  user.ToResponse(),
		Token: token,
	}

	h.writeSuccess(w, response)
}

func (h *APIHandler) SignOut(w http.ResponseWriter, r *http.Request) {
	// Get session from cookie
	if cookie, err := r.Cookie("session_id"); err == nil {
		if sessionID, err := strconv.ParseInt(cookie.Value, 10, 64); err == nil {
			// Attempt to delete session (ignore errors)
			h.authService.SignOut(r.Context(), sessionID)
		}
	}

	// Clear cookies
	h.clearSessionCookie(w)
	h.clearJWTCookie(w)

	h.writeSuccess(w, map[string]string{"message": "Signed out successfully"})
}

func (h *APIHandler) Verify(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())
	claims := middleware.GetClaims(r.Context())

	if user == nil || claims == nil {
		h.writeError(w, "Invalid or expired token", http.StatusUnauthorized)
		return
	}

	response := map[string]interface{}{
		"user":  user.ToResponse(),
		"valid": true,
	}

	h.writeSuccess(w, response)
}

func (h *APIHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		h.writeError(w, "Invalid or expired token", http.StatusUnauthorized)
		return
	}

	// Generate new token
	newToken, err := h.authService.RefreshToken(r.Context(), claims)
	if err != nil {
		h.writeError(w, "Failed to refresh token", http.StatusInternalServerError)
		return
	}

	// Set new JWT cookie
	h.setJWTCookie(w, newToken)

	response := map[string]interface{}{
		"token": newToken,
	}

	h.writeSuccess(w, response)
}

func (h *APIHandler) CurrentUser(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())
	if user == nil {
		h.writeError(w, "Not authenticated", http.StatusUnauthorized)
		return
	}

	h.writeSuccess(w, user.ToResponse())
}

func (h *APIHandler) writeSuccess(w http.ResponseWriter, data interface{}) {
	response := APIResponse{
		Success: true,
		Data:    data,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *APIHandler) writeError(w http.ResponseWriter, message string, statusCode int) {
	response := APIResponse{
		Success: false,
		Error:   message,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
}

func (h *APIHandler) setSessionCookie(w http.ResponseWriter, sessionID int64) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    strconv.FormatInt(sessionID, 10),
		Path:     "/",
		Domain:   h.config.CookieDomain,
		HttpOnly: true,
		Secure:   h.config.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   7 * 24 * 60 * 60, // 1 week
	})
}

func (h *APIHandler) setJWTCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "oh_session",
		Value:    token,
		Path:     "/",
		Domain:   h.config.CookieDomain,
		HttpOnly: true,
		Secure:   h.config.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   7 * 24 * 60 * 60, // 1 week
	})
}

func (h *APIHandler) clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		Domain:   h.config.CookieDomain,
		HttpOnly: true,
		Secure:   h.config.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

func (h *APIHandler) clearJWTCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "oh_session",
		Value:    "",
		Path:     "/",
		Domain:   h.config.CookieDomain,
		HttpOnly: true,
		Secure:   h.config.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
	
	// Also clear legacy cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "jwt_token",
		Value:    "",
		Path:     "/",
		Domain:   h.config.CookieDomain,
		HttpOnly: true,
		Secure:   h.config.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}