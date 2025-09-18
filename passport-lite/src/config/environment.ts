export const config = {
  port: parseInt(Bun.env.PORT || "3001"),
  databaseUrl: Bun.env.DATABASE_URL || "passport.db",
  secretKeyBase: Bun.env.SECRET_KEY_BASE || "development-secret-key-replace-in-production",
  cookieDomain: Bun.env.COOKIE_DOMAIN || "localhost",
  nodeEnv: Bun.env.NODE_ENV || "development",
  rateLimitWindow: parseInt(Bun.env.RATE_LIMIT_WINDOW || "900000"), // 15 minutes
  rateLimitMaxAttempts: parseInt(Bun.env.RATE_LIMIT_MAX_ATTEMPTS || "5"),
  jwtExpiresIn: parseInt(Bun.env.JWT_EXPIRES_IN || "604800"), // 7 days in seconds
  sessionTimeout: parseInt(Bun.env.SESSION_TIMEOUT || "86400"), // 24 hours in seconds
  isDevelopment: Bun.env.NODE_ENV !== "production",
  isProduction: Bun.env.NODE_ENV === "production",
  logLevel: Bun.env.LOG_LEVEL || "info"
};

// Validate required environment variables
if (config.isProduction && config.secretKeyBase === "development-secret-key-replace-in-production") {
  throw new Error("SECRET_KEY_BASE must be set in production");
}