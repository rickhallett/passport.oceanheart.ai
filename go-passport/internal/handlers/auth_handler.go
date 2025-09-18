package handlers

import (
	"fmt"
	"html/template"
	"net/http"
	"strconv"
	"time"

	"github.com/oceanheart/go-passport/internal/config"
	"github.com/oceanheart/go-passport/internal/middleware"
	"github.com/oceanheart/go-passport/internal/models"
	"github.com/oceanheart/go-passport/internal/service"
)

type AuthHandler struct {
	authService *service.AuthService
	userService *service.UserService
	config      *config.Config
	templates   *template.Template
}

func NewAuthHandler(
	authService *service.AuthService,
	userService *service.UserService,
	config *config.Config,
	templates *template.Template,
) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		userService: userService,
		config:      config,
		templates:   templates,
	}
}

func (h *AuthHandler) SignInPage(w http.ResponseWriter, r *http.Request) {
	data := map[string]interface{}{
		"Title":     "Sign In - Passport",
		"CSRFToken": middleware.GetCSRFToken(r),
		"User":      middleware.GetUser(r.Context()),
	}

	if err := h.templates.ExecuteTemplate(w, "signin.html", data); err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}

func (h *AuthHandler) SignIn(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	email := r.FormValue("email")
	password := r.FormValue("password")

	// Get client IP and user agent
	clientIP := getClientIP(r)
	userAgent := r.UserAgent()

	// Authenticate user
	user, session, token, err := h.authService.SignIn(r.Context(), email, password, clientIP, userAgent)
	if err != nil {
		data := map[string]interface{}{
			"Title":     "Sign In - Passport",
			"CSRFToken": middleware.GetCSRFToken(r),
			"Error":     "Invalid email or password",
		}
		
		w.WriteHeader(http.StatusUnauthorized)
		h.templates.ExecuteTemplate(w, "signin.html", data)
		return
	}

	// Set session cookie
	h.setSessionCookie(w, session.ID)
	
	// Set JWT cookie
	h.setJWTCookie(w, token)

	// Check for return_to parameter
	returnTo := r.FormValue("return_to")
	if returnTo == "" {
		returnTo = "/"
	}

	http.Redirect(w, r, returnTo, http.StatusSeeOther)
}

func (h *AuthHandler) SignUpPage(w http.ResponseWriter, r *http.Request) {
	data := map[string]interface{}{
		"Title":     "Sign Up - Passport",
		"CSRFToken": middleware.GetCSRFToken(r),
		"User":      middleware.GetUser(r.Context()),
	}

	if err := h.templates.ExecuteTemplate(w, "signup.html", data); err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}

func (h *AuthHandler) SignUp(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	email := r.FormValue("email")
	password := r.FormValue("password")
	passwordConfirm := r.FormValue("password_confirmation")

	// Validate passwords match
	if password != passwordConfirm {
		data := map[string]interface{}{
			"Title":     "Sign Up - Passport",
			"CSRFToken": middleware.GetCSRFToken(r),
			"Error":     "Passwords do not match",
		}
		
		w.WriteHeader(http.StatusBadRequest)
		h.templates.ExecuteTemplate(w, "signup.html", data)
		return
	}

	// Create user
	params := models.UserCreateParams{
		EmailAddress: email,
		Password:     password,
	}

	user, session, token, err := h.authService.SignUp(r.Context(), params)
	if err != nil {
		data := map[string]interface{}{
			"Title":     "Sign Up - Passport",
			"CSRFToken": middleware.GetCSRFToken(r),
			"Error":     err.Error(),
		}
		
		w.WriteHeader(http.StatusBadRequest)
		h.templates.ExecuteTemplate(w, "signup.html", data)
		return
	}

	// Set session cookie
	h.setSessionCookie(w, session.ID)
	
	// Set JWT cookie
	h.setJWTCookie(w, token)

	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (h *AuthHandler) SignOut(w http.ResponseWriter, r *http.Request) {
	// Get session from cookie
	if cookie, err := r.Cookie("session_id"); err == nil {
		sessionID := cookie.Value
		// Attempt to delete session (ignore errors)
		h.authService.SignOut(r.Context(), sessionID)
	}

	// Clear cookies
	h.clearSessionCookie(w)
	h.clearJWTCookie(w)

	// Check for return_to parameter
	returnTo := r.FormValue("return_to")
	if returnTo == "" {
		returnTo = "/"
	}

	http.Redirect(w, r, returnTo, http.StatusSeeOther)
}

func (h *AuthHandler) CurrentUser(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())
	
	data := map[string]interface{}{
		"Title":     "Dashboard - Passport",
		"CSRFToken": middleware.GetCSRFToken(r),
		"User":      user,
	}

	if err := h.templates.ExecuteTemplate(w, "dashboard.html", data); err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}

func (h *AuthHandler) setSessionCookie(w http.ResponseWriter, sessionID int64) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    fmt.Sprintf("%d", sessionID),
		Path:     "/",
		Domain:   h.config.CookieDomain,
		HttpOnly: true,
		Secure:   h.config.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   7 * 24 * 60 * 60, // 1 week
	})
}

func (h *AuthHandler) setJWTCookie(w http.ResponseWriter, token string) {
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

func (h *AuthHandler) clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		Domain:   h.config.CookieDomain,
		HttpOnly: true,
		Secure:   h.config.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
		Expires:  time.Now().Add(-time.Hour),
	})
}

func (h *AuthHandler) clearJWTCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "oh_session",
		Value:    "",
		Path:     "/",
		Domain:   h.config.CookieDomain,
		HttpOnly: true,
		Secure:   h.config.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
		Expires:  time.Now().Add(-time.Hour),
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
		Expires:  time.Now().Add(-time.Hour),
	})
}

func getClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	return r.RemoteAddr
}