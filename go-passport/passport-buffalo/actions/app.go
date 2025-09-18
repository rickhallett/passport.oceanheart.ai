package actions

import (
	"net/http"
	"time"

	"github.com/gobuffalo/buffalo"
	"github.com/gobuffalo/buffalo-pop/v3/pop/popmw"
	"github.com/gobuffalo/buffalo/render"
	"github.com/gobuffalo/envy"
	csrf "github.com/gobuffalo/mw-csrf"
	i18n "github.com/gobuffalo/mw-i18n/v2"
	paramlogger "github.com/gobuffalo/mw-paramlogger"

	"passport-buffalo/actions/api"
	"passport-buffalo/middleware"
	"passport-buffalo/models"
)

var app *buffalo.App
var ENV = envy.Get("GO_ENV", "development")
var r *render.Engine

func App() *buffalo.App {
	if app == nil {
		app = buffalo.New(buffalo.Options{
			Env:          ENV,
			// Session store is configured elsewhere
			SessionName:  "_passport_session",
		})
		
		// Setup renderer
		r = render.New(render.Options{
			HTMLLayout:   "application.plush.html",
			// Templates and assets configured separately
			Helpers:      render.Helpers{},
			DefaultContentType: "text/html",
		})
		
		// Middleware stack
		// Force SSL in production
		// if ENV == "production" {
		//     app.Use(forcessl.Middleware())
		// }
		
		app.Use(paramlogger.ParameterLogger)
		app.Use(csrf.New)
		app.Use(popmw.Transaction(models.DB))
		app.Use(translations())
		app.Use(middleware.SetCurrentUser)
		
		// CORS configuration would go here
		// app.Use(cors.Default())
		
		// Public routes
		app.GET("/", HomeHandler)
		app.GET("/sign_in", SessionsNew)
		app.POST("/sign_in", middleware.RateLimit(10, 3*time.Minute)(SessionsCreate))
		app.DELETE("/sign_out", SessionsDestroy)
		app.GET("/sign_up", RegistrationsNew)
		app.POST("/sign_up", RegistrationsCreate)
		
		// Password reset routes
		app.GET("/passwords/new", PasswordsNew)
		app.POST("/passwords", PasswordsCreate)
		app.GET("/passwords/{token}/edit", PasswordsEdit)
		app.PUT("/passwords/{token}", PasswordsUpdate)
		
		// API routes (no CSRF)
		apiGroup := app.Group("/api")
		apiGroup.Middleware.Remove(csrf.New)
		apiGroup.POST("/auth/verify", api.AuthVerify)
		apiGroup.POST("/auth/refresh", api.AuthRefresh)
		apiGroup.POST("/auth/signin", api.AuthSignIn)
		apiGroup.DELETE("/auth/signout", middleware.RequireJWT(api.AuthSignOut))
		apiGroup.GET("/auth/user", middleware.RequireJWT(api.AuthUser))
		
		// Admin routes
		admin := app.Group("/admin")
		admin.Use(middleware.RequireAuth)
		admin.Use(middleware.RequireAdmin)
		admin.GET("/", AdminUsersIndex)
		admin.GET("/users", AdminUsersIndex)
		admin.GET("/users/{user_id}", AdminUsersShow)
		admin.DELETE("/users/{user_id}", AdminUsersDestroy)
		admin.POST("/users/{user_id}/toggle_role", AdminUsersToggleRole)
		
		// Serve static files
		app.ServeFiles("/", http.Dir("public"))
		
		// Health check
		app.GET("/health", func(c buffalo.Context) error {
			// Check database connection by attempting a simple query
			var result int
			err := models.DB.RawQuery("SELECT 1").All(&result)
			if err != nil {
				return c.Render(503, r.JSON(map[string]string{
					"status": "unhealthy",
					"error":  err.Error(),
				}))
			}
			
			return c.Render(200, r.JSON(map[string]string{
				"status": "healthy",
			}))
		})
	}
	
	return app
}

func getAllowedOrigins() []string {
	if ENV == "production" {
		return []string{
			"https://oceanheart.ai",
			"https://www.oceanheart.ai",
			"https://watson.oceanheart.ai",
			"https://notebook.oceanheart.ai",
			"https://preflight.oceanheart.ai",
			"https://my.oceanheart.ai",
			"https://labs.oceanheart.ai",
		}
	}
	
	return []string{
		"http://localhost:3000",
		"http://localhost:3001",
		"http://localhost:5173",
		"http://lvh.me:3000",
		"http://*.lvh.me:3000",
	}
}

func translations() buffalo.MiddlewareFunc {
	var err error
	if T, err = i18n.New(locales, "en-US"); err != nil {
		app.Stop(err)
	}
	return T.Middleware()
}

var T *i18n.Translator