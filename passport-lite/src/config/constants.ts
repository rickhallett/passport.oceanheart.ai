export const APP_NAME = "Passport Lite";
export const APP_VERSION = "1.0.0";
export const JWT_ISSUER = "passport.oceanheart.ai";

export const COOKIE_NAMES = {
  SESSION: "oh_session",
  LEGACY_JWT: "jwt_token",
  SESSION_ID: "session_id",
  CSRF_TOKEN: "_csrf_token"
} as const;

export const ROUTES = {
  // Web routes
  SIGN_IN: "/sign_in",
  SIGN_UP: "/sign_up",
  SIGN_OUT: "/sign_out",
  DASHBOARD: "/dashboard",
  PASSWORD_RESET: "/password/reset",
  PASSWORD_NEW: "/password/new",
  ADMIN_USERS: "/admin/users",
  
  // API routes
  API_SIGN_IN: "/api/auth/signin",
  API_SIGN_UP: "/api/auth/signup",
  API_SIGN_OUT: "/api/auth/signout",
  API_VERIFY: "/api/auth/verify",
  API_REFRESH: "/api/auth/refresh",
  API_USER: "/api/auth/user"
} as const;

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid email or password",
  USER_EXISTS: "User already exists with this email",
  INVALID_TOKEN: "Invalid or expired token",
  UNAUTHORIZED: "Unauthorized",
  RATE_LIMIT: "Too many attempts. Please try again later.",
  SERVER_ERROR: "An unexpected error occurred. Please try again.",
  INVALID_EMAIL: "Please provide a valid email address",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters",
  CSRF_INVALID: "Security validation failed. Please try again."
} as const;

export const SUCCESS_MESSAGES = {
  SIGN_IN: "Successfully signed in",
  SIGN_UP: "Account created successfully",
  SIGN_OUT: "Successfully signed out",
  PASSWORD_RESET: "Password reset instructions sent to your email",
  PASSWORD_UPDATED: "Password updated successfully"
} as const;