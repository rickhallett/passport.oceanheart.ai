package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	// Server configuration
	Port        string
	Environment string

	// Database configuration
	DatabaseURL string

	// Security configuration
	SecretKeyBase string
	CSRFSecret    string
	
	// Cookie configuration
	CookieDomain string
	CookieSecure bool
	
	// JWT configuration
	JWTIssuer string
	
	// Rate limiting configuration
	RateLimitSignIn        int
	RateLimitSignInWindow  time.Duration
	
	// Admin configuration
	AdminEmails []string
	
	// Feature flags
	RunMigrations bool
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:        getEnv("PORT", "10000"),
		Environment: getEnv("ENVIRONMENT", "development"),
		
		DatabaseURL: getEnv("DATABASE_URL", ""),
		
		SecretKeyBase: getEnv("SECRET_KEY_BASE", ""),
		CSRFSecret:    getEnv("CSRF_SECRET", ""),
		
		CookieDomain: getEnv("COOKIE_DOMAIN", ".lvh.me"),
		
		JWTIssuer: getEnv("JWT_ISSUER", "passport.oceanheart.ai"),
		
		RateLimitSignIn:       getEnvAsInt("RATE_LIMIT_SIGNIN", 10),
		RateLimitSignInWindow: getEnvAsDuration("RATE_LIMIT_SIGNIN_WINDOW", 3*time.Minute),
		
		RunMigrations: getEnvAsBool("RUN_MIGRATIONS", false),
	}

	// Set cookie secure based on environment
	cfg.CookieSecure = cfg.Environment == "production"
	
	// Override cookie domain for production
	if cfg.Environment == "production" {
		cfg.CookieDomain = ".oceanheart.ai"
	}
	
	// Use CSRF secret from SECRET_KEY_BASE if not set
	if cfg.CSRFSecret == "" {
		cfg.CSRFSecret = cfg.SecretKeyBase
	}
	
	// Validate required configuration
	if cfg.SecretKeyBase == "" {
		return nil, fmt.Errorf("SECRET_KEY_BASE is required")
	}
	
	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	
	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	strValue := os.Getenv(key)
	if strValue == "" {
		return defaultValue
	}
	
	value, err := strconv.Atoi(strValue)
	if err != nil {
		return defaultValue
	}
	
	return value
}

func getEnvAsBool(key string, defaultValue bool) bool {
	strValue := os.Getenv(key)
	if strValue == "" {
		return defaultValue
	}
	
	value, err := strconv.ParseBool(strValue)
	if err != nil {
		return defaultValue
	}
	
	return value
}

func getEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
	strValue := os.Getenv(key)
	if strValue == "" {
		return defaultValue
	}
	
	value, err := time.ParseDuration(strValue)
	if err != nil {
		return defaultValue
	}
	
	return value
}

func (c *Config) IsDevelopment() bool {
	return c.Environment == "development"
}

func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

func (c *Config) IsTest() bool {
	return c.Environment == "test"
}