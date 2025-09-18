package handlers

import (
	"encoding/json"
	"html/template"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/oceanheart/go-passport/internal/config"
	"github.com/oceanheart/go-passport/internal/middleware"
	"github.com/oceanheart/go-passport/internal/models"
	"github.com/oceanheart/go-passport/internal/service"
)

type AdminHandler struct {
	userService    *service.UserService
	sessionService *service.SessionService
	config         *config.Config
	templates      *template.Template
}

func NewAdminHandler(
	userService *service.UserService,
	sessionService *service.SessionService,
	config *config.Config,
	templates *template.Template,
) *AdminHandler {
	return &AdminHandler{
		userService:    userService,
		sessionService: sessionService,
		config:         config,
		templates:      templates,
	}
}

func (h *AdminHandler) Dashboard(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())
	
	// Get user statistics
	users, totalUsers, err := h.userService.ListUsers(r.Context(), 1, 10)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	data := map[string]interface{}{
		"Title":      "Admin Dashboard - Passport",
		"CSRFToken":  middleware.GetCSRFToken(r),
		"User":       user,
		"TotalUsers": totalUsers,
		"RecentUsers": users,
	}

	if err := h.templates.ExecuteTemplate(w, "admin/dashboard.html", data); err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}

func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	pageStr := r.URL.Query().Get("page")
	page := 1
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	searchQuery := r.URL.Query().Get("search")
	perPage := 20

	var users []*models.User
	var totalUsers int64
	var err error

	if searchQuery != "" {
		users, err = h.userService.SearchUsers(r.Context(), searchQuery, page, perPage)
		if err != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}
		totalUsers = int64(len(users)) // Approximation for search results
	} else {
		users, totalUsers, err = h.userService.ListUsers(r.Context(), page, perPage)
		if err != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}
	}

	totalPages := (totalUsers + int64(perPage) - 1) / int64(perPage)

	data := map[string]interface{}{
		"Title":       "Users - Admin",
		"CSRFToken":   middleware.GetCSRFToken(r),
		"User":        middleware.GetUser(r.Context()),
		"Users":       users,
		"CurrentPage": page,
		"TotalPages":  int(totalPages),
		"TotalUsers":  totalUsers,
		"SearchQuery": searchQuery,
		"HasNext":     page < int(totalPages),
		"HasPrev":     page > 1,
		"NextPage":    page + 1,
		"PrevPage":    page - 1,
	}

	if err := h.templates.ExecuteTemplate(w, "admin/users.html", data); err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}

func (h *AdminHandler) ShowUser(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	user, err := h.userService.GetUserByID(r.Context(), userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Get user sessions
	sessions, err := h.sessionService.GetUserSessions(r.Context(), userID)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	data := map[string]interface{}{
		"Title":      "User Details - Admin",
		"CSRFToken":  middleware.GetCSRFToken(r),
		"User":       middleware.GetUser(r.Context()),
		"ViewUser":   user,
		"Sessions":   sessions,
	}

	if err := h.templates.ExecuteTemplate(w, "admin/user_detail.html", data); err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}

func (h *AdminHandler) ToggleUserRole(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Toggle user role
	updatedUser, err := h.userService.ToggleUserRole(r.Context(), userID)
	if err != nil {
		http.Error(w, "Failed to toggle user role", http.StatusInternalServerError)
		return
	}

	// Return JSON response for AJAX requests
	if r.Header.Get("Accept") == "application/json" {
		w.Header().Set("Content-Type", "application/json")
		response := map[string]interface{}{
			"success": true,
			"user":    updatedUser.ToResponse(),
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Redirect for regular form submissions
	http.Redirect(w, r, "/admin/users/"+userIDStr, http.StatusSeeOther)
}

func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Prevent deletion of current user
	currentUser := middleware.GetUser(r.Context())
	if currentUser.ID == userID {
		http.Error(w, "Cannot delete your own account", http.StatusForbidden)
		return
	}

	// Delete user
	if err := h.userService.DeleteUser(r.Context(), userID); err != nil {
		http.Error(w, "Failed to delete user", http.StatusInternalServerError)
		return
	}

	// Return JSON response for AJAX requests
	if r.Header.Get("Accept") == "application/json" {
		w.Header().Set("Content-Type", "application/json")
		response := map[string]interface{}{
			"success": true,
			"message": "User deleted successfully",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Redirect for regular form submissions
	http.Redirect(w, r, "/admin/users", http.StatusSeeOther)
}

func (h *AdminHandler) TerminateSession(w http.ResponseWriter, r *http.Request) {
	sessionIDStr := chi.URLParam(r, "sessionId")
	sessionID, err := strconv.ParseInt(sessionIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	// Delete session
	if err := h.sessionService.DeleteSession(r.Context(), sessionID); err != nil {
		http.Error(w, "Failed to terminate session", http.StatusInternalServerError)
		return
	}

	// Return JSON response for AJAX requests
	if r.Header.Get("Accept") == "application/json" {
		w.Header().Set("Content-Type", "application/json")
		response := map[string]interface{}{
			"success": true,
			"message": "Session terminated successfully",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Redirect for regular form submissions
	userIDStr := r.URL.Query().Get("user_id")
	if userIDStr != "" {
		http.Redirect(w, r, "/admin/users/"+userIDStr, http.StatusSeeOther)
	} else {
		http.Redirect(w, r, "/admin/users", http.StatusSeeOther)
	}
}