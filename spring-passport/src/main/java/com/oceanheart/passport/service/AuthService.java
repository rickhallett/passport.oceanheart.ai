package com.oceanheart.passport.service;

import com.oceanheart.passport.domain.Session;
import com.oceanheart.passport.domain.User;
import com.oceanheart.passport.repository.SessionRepository;
import com.oceanheart.passport.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);
    
    // BCrypt strength 12 to match Rails default
    private static final int BCRYPT_STRENGTH = 12;
    
    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, 
                      SessionRepository sessionRepository,
                      JwtService jwtService) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = new BCryptPasswordEncoder(BCRYPT_STRENGTH);
    }

    /**
     * Authenticate user with email and password
     */
    public AuthenticationResult authenticate(String email, String password, String ipAddress, String userAgent) {
        try {
            if (email == null || password == null) {
                logger.debug("Authentication failed: email or password is null");
                return AuthenticationResult.failure("Invalid credentials");
            }

            Optional<User> userOpt = userRepository.findByEmailAddress(email.toLowerCase().trim());
            if (userOpt.isEmpty()) {
                logger.debug("Authentication failed: user not found for email: {}", email);
                return AuthenticationResult.failure("Invalid credentials");
            }

            User user = userOpt.get();
            if (!passwordEncoder.matches(password, user.getPasswordHash())) {
                logger.debug("Authentication failed: invalid password for user: {}", email);
                return AuthenticationResult.failure("Invalid credentials");
            }

            // Create session
            Session session = createSession(user, ipAddress, userAgent);
            
            // Generate JWT
            String jwtToken = jwtService.generateToken(user);
            
            logger.info("User authenticated successfully: {}", email);
            return AuthenticationResult.success(user, session, jwtToken);

        } catch (Exception e) {
            logger.error("Error during authentication for email: {}", email, e);
            return AuthenticationResult.failure("Authentication failed");
        }
    }

    /**
     * Register new user
     */
    public RegistrationResult register(String email, String password, String ipAddress, String userAgent) {
        try {
            if (email == null || password == null) {
                return RegistrationResult.failure("Email and password are required");
            }

            String normalizedEmail = email.toLowerCase().trim();
            
            // Check if user already exists
            if (userRepository.existsByEmailAddress(normalizedEmail)) {
                logger.debug("Registration failed: email already exists: {}", normalizedEmail);
                return RegistrationResult.failure("Email address is already registered");
            }

            // Validate password strength (basic validation)
            if (password.length() < 8) {
                return RegistrationResult.failure("Password must be at least 8 characters long");
            }

            // Hash password
            String passwordHash = passwordEncoder.encode(password);
            
            // Create user
            User user = new User(normalizedEmail, passwordHash, User.Role.USER);
            user = userRepository.save(user);
            
            // Create session
            Session session = createSession(user, ipAddress, userAgent);
            
            // Generate JWT
            String jwtToken = jwtService.generateToken(user);
            
            logger.info("User registered successfully: {}", normalizedEmail);
            return RegistrationResult.success(user, session, jwtToken);

        } catch (Exception e) {
            logger.error("Error during registration for email: {}", email, e);
            return RegistrationResult.failure("Registration failed");
        }
    }

    /**
     * Create new session for user
     */
    public Session createSession(User user, String ipAddress, String userAgent) {
        Session session = new Session(user, ipAddress, userAgent);
        return sessionRepository.save(session);
    }

    /**
     * Validate JWT token and get user
     */
    public Optional<User> validateTokenAndGetUser(String token) {
        try {
            Optional<JwtService.UserClaims> claimsOpt = jwtService.validateToken(token);
            if (claimsOpt.isEmpty()) {
                return Optional.empty();
            }

            JwtService.UserClaims claims = claimsOpt.get();
            UUID userId = UUID.fromString(claims.userId());
            
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                logger.debug("Token valid but user not found: {}", userId);
                return Optional.empty();
            }

            return userOpt;

        } catch (Exception e) {
            logger.debug("Error validating token: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Validate session ID and get user
     */
    public Optional<User> validateSessionAndGetUser(UUID sessionId) {
        try {
            Optional<Session> sessionOpt = sessionRepository.findById(sessionId);
            if (sessionOpt.isEmpty()) {
                return Optional.empty();
            }

            Session session = sessionOpt.get();
            if (session.isExpired()) {
                // Clean up expired session
                sessionRepository.delete(session);
                return Optional.empty();
            }

            // Update session last accessed time
            sessionRepository.updateLastAccessed(sessionId, LocalDateTime.now());
            
            return Optional.of(session.getUser());

        } catch (Exception e) {
            logger.debug("Error validating session: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Sign out user by deleting session
     */
    public void signOut(UUID sessionId) {
        try {
            Optional<Session> sessionOpt = sessionRepository.findById(sessionId);
            if (sessionOpt.isPresent()) {
                sessionRepository.delete(sessionOpt.get());
                logger.debug("Session deleted: {}", sessionId);
            }
        } catch (Exception e) {
            logger.error("Error signing out session: {}", sessionId, e);
        }
    }

    /**
     * Sign out all sessions for user
     */
    public void signOutAllSessions(User user) {
        try {
            sessionRepository.deleteByUser(user);
            logger.info("All sessions deleted for user: {}", user.getEmailAddress());
        } catch (Exception e) {
            logger.error("Error signing out all sessions for user: {}", user.getEmailAddress(), e);
        }
    }

    /**
     * Get active sessions for user
     */
    public List<Session> getActiveSessionsForUser(User user) {
        LocalDateTime oneWeekAgo = LocalDateTime.now().minusWeeks(1);
        return sessionRepository.findActiveSessionsByUser(user, oneWeekAgo);
    }

    /**
     * Clean up expired sessions
     */
    public void cleanupExpiredSessions() {
        try {
            LocalDateTime oneWeekAgo = LocalDateTime.now().minusWeeks(1);
            sessionRepository.deleteExpiredSessions(oneWeekAgo);
            logger.info("Expired sessions cleaned up");
        } catch (Exception e) {
            logger.error("Error cleaning up expired sessions", e);
        }
    }

    /**
     * Refresh JWT token for valid session
     */
    public Optional<String> refreshToken(UUID sessionId) {
        try {
            Optional<User> userOpt = validateSessionAndGetUser(sessionId);
            if (userOpt.isEmpty()) {
                return Optional.empty();
            }

            String newToken = jwtService.generateToken(userOpt.get());
            logger.debug("Token refreshed for session: {}", sessionId);
            return Optional.of(newToken);

        } catch (Exception e) {
            logger.error("Error refreshing token for session: {}", sessionId, e);
            return Optional.empty();
        }
    }

    /**
     * Change user password
     */
    public boolean changePassword(User user, String currentPassword, String newPassword) {
        try {
            if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
                return false;
            }

            if (newPassword.length() < 8) {
                return false;
            }

            String newPasswordHash = passwordEncoder.encode(newPassword);
            user.setPasswordHash(newPasswordHash);
            userRepository.save(user);
            
            logger.info("Password changed for user: {}", user.getEmailAddress());
            return true;

        } catch (Exception e) {
            logger.error("Error changing password for user: {}", user.getEmailAddress(), e);
            return false;
        }
    }

    /**
     * Check if user exists by email
     */
    public boolean userExists(String email) {
        return userRepository.findByEmailAddress(email).isPresent();
    }

    /**
     * Find user by email
     */
    public User findUserByEmail(String email) {
        return userRepository.findByEmailAddress(email).orElse(null);
    }

    /**
     * Create new user
     */
    public User createUser(String firstName, String lastName, String email, String password) {
        if (userExists(email)) {
            throw new IllegalArgumentException("User with email " + email + " already exists");
        }

        User user = new User();
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEmailAddress(email);
        user.setPasswordDigest(passwordEncoder.encode(password));
        user.setRole("USER");
        user.setConfirmed(true); // Auto-confirm for now
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }

    /**
     * Authenticate user and return result with token and session
     */
    public java.util.Map<String, Object> authenticateUser(String email, String password, String ipAddress, String userAgent) {
        AuthenticationResult result = authenticate(email, password, ipAddress, userAgent);
        
        if (!result.success()) {
            throw new IllegalArgumentException(result.message());
        }
        
        return java.util.Map.of(
            "user", result.user(),
            "token", result.jwtToken(),
            "sessionId", result.session().getId().toString()
        );
    }

    /**
     * Destroy session
     */
    public void destroySession(String sessionId) {
        try {
            UUID uuid = UUID.fromString(sessionId);
            signOut(uuid);
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid session ID format: {}", sessionId);
        }
    }

    /**
     * Authentication result record
     */
    public record AuthenticationResult(
            boolean success,
            String message,
            User user,
            Session session,
            String jwtToken
    ) {
        public static AuthenticationResult success(User user, Session session, String jwtToken) {
            return new AuthenticationResult(true, "Authentication successful", user, session, jwtToken);
        }

        public static AuthenticationResult failure(String message) {
            return new AuthenticationResult(false, message, null, null, null);
        }
    }

    /**
     * Registration result record
     */
    public record RegistrationResult(
            boolean success,
            String message,
            User user,
            Session session,
            String jwtToken
    ) {
        public static RegistrationResult success(User user, Session session, String jwtToken) {
            return new RegistrationResult(true, "Registration successful", user, session, jwtToken);
        }

        public static RegistrationResult failure(String message) {
            return new RegistrationResult(false, message, null, null, null);
        }
    }
}