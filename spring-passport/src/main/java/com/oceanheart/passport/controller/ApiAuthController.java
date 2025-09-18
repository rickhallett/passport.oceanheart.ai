package com.oceanheart.passport.controller;

import com.oceanheart.passport.domain.Session;
import com.oceanheart.passport.domain.User;
import com.oceanheart.passport.service.AuthService;
import com.oceanheart.passport.service.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "${passport.cors.allowed-origins}", allowCredentials = true)
public class ApiAuthController {

    private static final Logger logger = LoggerFactory.getLogger(ApiAuthController.class);

    private final AuthService authService;
    private final JwtService jwtService;
    private final String cookieDomain;

    public ApiAuthController(AuthService authService, 
                           JwtService jwtService,
                           @Value("${passport.cookie-domain}") String cookieDomain) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.cookieDomain = cookieDomain;
    }

    /**
     * POST /api/auth/signin - Authenticate user and return JWT + set cookies
     */
    @PostMapping("/signin")
    public ResponseEntity<Map<String, Object>> signIn(
            @Valid @RequestBody SignInRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        
        try {
            String ipAddress = getClientIpAddress(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");

            AuthService.AuthenticationResult result = authService.authenticate(
                request.email(), request.password(), ipAddress, userAgent);

            if (!result.success()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse("Invalid email or password"));
            }

            // Set cookies (matching Rails implementation)
            setCookie(httpResponse, "session_id", result.session().getId().toString(), 604800); // 1 week
            setCookie(httpResponse, "oh_session", result.jwtToken(), 604800); // 1 week

            // Return JSON response matching Rails format
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Authentication successful");
            response.put("token", result.jwtToken());
            response.put("user", createUserResponse(result.user()));

            logger.info("API sign-in successful for user: {}", request.email());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error during API sign-in for email: {}", request.email(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Authentication failed"));
        }
    }

    /**
     * POST /api/auth/verify - Validate JWT token
     */
    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verify(
            @RequestBody(required = false) VerifyRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            String token = extractToken(request, httpRequest);
            if (token == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse("No token provided"));
            }

            Optional<User> userOpt = authService.validateTokenAndGetUser(token);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse("Invalid or expired token"));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("valid", true);
            response.put("user", createUserResponse(userOpt.get()));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error during token verification", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(createErrorResponse("Token verification failed"));
        }
    }

    /**
     * POST /api/auth/refresh - Issue new JWT based on session
     */
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refresh(HttpServletRequest httpRequest) {
        try {
            UUID sessionId = extractSessionId(httpRequest);
            if (sessionId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse("No valid session found"));
            }

            Optional<String> newTokenOpt = authService.refreshToken(sessionId);
            if (newTokenOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse("Session expired or invalid"));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("token", newTokenOpt.get());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error during token refresh", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(createErrorResponse("Token refresh failed"));
        }
    }

    /**
     * DELETE /api/auth/signout - Revoke session
     */
    @DeleteMapping("/signout")
    public ResponseEntity<Map<String, Object>> signOut(
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        
        try {
            UUID sessionId = extractSessionId(httpRequest);
            if (sessionId != null) {
                authService.signOut(sessionId);
            }

            // Clear cookies
            clearCookie(httpResponse, "session_id");
            clearCookie(httpResponse, "oh_session");

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Signed out successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error during API sign-out", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Sign out failed"));
        }
    }

    /**
     * GET /api/auth/user - Return current user
     */
    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> getCurrentUser(HttpServletRequest httpRequest) {
        try {
            // Try JWT first, then session
            User user = null;
            
            // Extract from Authorization header
            String authHeader = httpRequest.getHeader("Authorization");
            if (authHeader != null) {
                Optional<String> tokenOpt = jwtService.extractTokenFromHeader(authHeader);
                if (tokenOpt.isPresent()) {
                    Optional<User> userOpt = authService.validateTokenAndGetUser(tokenOpt.get());
                    if (userOpt.isPresent()) {
                        user = userOpt.get();
                    }
                }
            }

            // Fallback to session cookie
            if (user == null) {
                UUID sessionId = extractSessionId(httpRequest);
                if (sessionId != null) {
                    Optional<User> userOpt = authService.validateSessionAndGetUser(sessionId);
                    if (userOpt.isPresent()) {
                        user = userOpt.get();
                    }
                }
            }

            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse("Not authenticated"));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("user", createUserResponse(user));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error getting current user", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(createErrorResponse("Authentication failed"));
        }
    }

    // Utility methods

    private String extractToken(VerifyRequest request, HttpServletRequest httpRequest) {
        // Check request body first
        if (request != null && request.token() != null) {
            return request.token();
        }

        // Check Authorization header
        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader != null) {
            Optional<String> tokenOpt = jwtService.extractTokenFromHeader(authHeader);
            if (tokenOpt.isPresent()) {
                return tokenOpt.get();
            }
        }

        // Check cookie
        Cookie[] cookies = httpRequest.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("oh_session".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }

        return null;
    }

    private UUID extractSessionId(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("session_id".equals(cookie.getName())) {
                    try {
                        return UUID.fromString(cookie.getValue());
                    } catch (IllegalArgumentException e) {
                        logger.debug("Invalid session ID format: {}", cookie.getValue());
                        return null;
                    }
                }
            }
        }
        return null;
    }

    private void setCookie(HttpServletResponse response, String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // Set to true in production
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        if (!cookieDomain.isEmpty() && !".lvh.me".equals(cookieDomain)) {
            cookie.setDomain(cookieDomain);
        }
        response.addCookie(cookie);
    }

    private void clearCookie(HttpServletResponse response, String name) {
        Cookie cookie = new Cookie(name, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // Set to true in production
        cookie.setPath("/");
        cookie.setMaxAge(0);
        if (!cookieDomain.isEmpty() && !".lvh.me".equals(cookieDomain)) {
            cookie.setDomain(cookieDomain);
        }
        response.addCookie(cookie);
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }

    private Map<String, Object> createUserResponse(User user) {
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", user.getId().toString());
        userMap.put("userId", user.getId().toString()); // For JWT compatibility
        userMap.put("email", user.getEmailAddress());
        userMap.put("emailAddress", user.getEmailAddress()); // Rails format
        userMap.put("role", user.getRole().name().toLowerCase());
        userMap.put("isAdmin", user.isAdmin());
        userMap.put("createdAt", user.getCreatedAt().toString());
        userMap.put("updatedAt", user.getUpdatedAt().toString());
        return userMap;
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", message);
        return response;
    }

    // Request DTOs
    public record SignInRequest(
            @NotBlank(message = "Email is required")
            @Email(message = "Email must be valid")
            String email,
            
            @NotBlank(message = "Password is required")
            @Size(min = 1, message = "Password is required")
            String password
    ) {}

    public record VerifyRequest(String token) {}
}