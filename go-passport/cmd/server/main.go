package main

import (
	"context"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	
	"github.com/oceanheart/go-passport/internal/auth"
	"github.com/oceanheart/go-passport/internal/config"
	"github.com/oceanheart/go-passport/internal/handlers"
	"github.com/oceanheart/go-passport/internal/middleware"
	"github.com/oceanheart/go-passport/internal/repository"
	"github.com/oceanheart/go-passport/internal/service"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Connect to database
	db, err := config.NewDatabase(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run migrations if enabled
	if cfg.RunMigrations {
		migrator := config.NewMigrator(db)
		if err := migrator.Run(context.Background(), "db/migrations"); err != nil {
			log.Fatalf("Failed to run migrations: %v", err)
		}
	}

	// Initialize services
	passwordService := auth.NewPasswordService()
	jwtService := auth.NewJWTService(cfg.SecretKeyBase, cfg.JWTIssuer)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	sessionRepo := repository.NewSessionRepository(db)

	// Initialize services
	authService := service.NewAuthService(userRepo, sessionRepo, passwordService, jwtService)
	userService := service.NewUserService(userRepo)
	sessionService := service.NewSessionService(sessionRepo, userRepo)

	// Load templates
	templates, err := loadTemplates()
	if err != nil {
		log.Fatalf("Failed to load templates: %v", err)
	}

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, userService, cfg, templates)
	apiHandler := handlers.NewAPIHandler(authService, userService, cfg)
	adminHandler := handlers.NewAdminHandler(userService, sessionService, cfg, templates)

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(authService, jwtService)
	csrfMiddleware := middleware.NewCSRFMiddleware(cfg.CSRFSecret)
	rateLimiter := middleware.NewRateLimiter(cfg.RateLimitSignIn, cfg.RateLimitSignInWindow)

	// Setup router
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimw.RequestID)
	r.Use(middleware.Logging)
	r.Use(middleware.Recovery)
	r.Use(chimw.Compress(5))

	// Health check
	r.Get("/up", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Static files
	r.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.Dir("web/static/"))))

	// HTML routes (with CSRF protection)
	r.Group(func(r chi.Router) {
		r.Use(csrfMiddleware.Protect)
		r.Use(authMiddleware.ExtractAuth)

		// Public routes
		r.Get("/", authHandler.CurrentUser)
		r.Get("/sign_in", authHandler.SignInPage)
		r.Post("/sign_in", rateLimiter.LimitEndpoint("sign_in")(authHandler.SignIn))
		r.Get("/sign_up", authHandler.SignUpPage)
		r.Post("/sign_up", authHandler.SignUp)
		r.Post("/sign_out", authHandler.SignOut)
		r.Delete("/sign_out", authHandler.SignOut)

		// Admin routes
		r.Route("/admin", func(r chi.Router) {
			r.Use(authMiddleware.RequireAdmin)
			r.Get("/", adminHandler.Dashboard)
			r.Get("/users", adminHandler.ListUsers)
			r.Get("/users/{id}", adminHandler.ShowUser)
			r.Post("/users/{id}/toggle_role", adminHandler.ToggleUserRole)
			r.Delete("/users/{id}", adminHandler.DeleteUser)
			r.Delete("/sessions/{sessionId}", adminHandler.TerminateSession)
		})
	})

	// API routes (no CSRF protection)
	r.Route("/api/auth", func(r chi.Router) {
		r.Use(authMiddleware.ExtractAuth)

		// Public API routes
		r.Post("/signin", rateLimiter.LimitEndpoint("api_signin")(apiHandler.SignIn))
		r.Delete("/signout", apiHandler.SignOut)

		// Protected API routes
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware.RequireAuth)
			r.Post("/verify", apiHandler.Verify)
			r.Post("/refresh", apiHandler.Refresh)
			r.Get("/user", apiHandler.CurrentUser)
		})
	})

	// Start server
	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Starting server on port %s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

func loadTemplates() (*template.Template, error) {
	templateDir := "web/templates"
	
	// Find all template files
	var templateFiles []string
	err := filepath.Walk(templateDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && filepath.Ext(path) == ".html" {
			templateFiles = append(templateFiles, path)
		}
		return nil
	})
	
	if err != nil {
		return nil, fmt.Errorf("failed to walk template directory: %w", err)
	}

	if len(templateFiles) == 0 {
		return nil, fmt.Errorf("no template files found in %s", templateDir)
	}

	// Parse all templates
	tmpl, err := template.ParseFiles(templateFiles...)
	if err != nil {
		return nil, fmt.Errorf("failed to parse templates: %w", err)
	}

	return tmpl, nil
}