package com.oceanheart.passport.service;

import com.oceanheart.passport.domain.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class JwtService {

    private static final Logger logger = LoggerFactory.getLogger(JwtService.class);

    private final SecretKey secretKey;
    private final String issuer;
    private final long expirationSeconds;

    public JwtService(
            @Value("${passport.jwt.secret}") String secret,
            @Value("${passport.jwt.issuer}") String issuer,
            @Value("${passport.jwt.expiration}") long expirationSeconds) {
        
        // Create secret key for HS256 - must be at least 256 bits (32 bytes)
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            // Pad the key if it's too short
            byte[] paddedKey = new byte[32];
            System.arraycopy(keyBytes, 0, paddedKey, 0, Math.min(keyBytes.length, 32));
            this.secretKey = Keys.hmacShaKeyFor(paddedKey);
        } else {
            this.secretKey = Keys.hmacShaKeyFor(keyBytes);
        }
        
        this.issuer = issuer;
        this.expirationSeconds = expirationSeconds;
        
        logger.info("JwtService initialized with issuer: {} and expiration: {} seconds", issuer, expirationSeconds);
    }

    /**
     * Generate JWT token for user with Rails-compatible payload structure
     */
    public String generateToken(User user) {
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime expiration = now.plusSeconds(expirationSeconds);
            
            Date issuedAt = Date.from(now.atZone(ZoneId.systemDefault()).toInstant());
            Date expiresAt = Date.from(expiration.atZone(ZoneId.systemDefault()).toInstant());

            // Create claims map with exact Rails payload structure (camelCase)
            Map<String, Object> claims = new HashMap<>();
            claims.put("userId", user.getUserId());
            claims.put("email", user.getEmail());
            
            String token = Jwts.builder()
                    .setClaims(claims)
                    .setIssuer(issuer)
                    .setIssuedAt(issuedAt)
                    .setExpiration(expiresAt)
                    .signWith(secretKey, SignatureAlgorithm.HS256)
                    .compact();

            logger.debug("Generated JWT token for user: {} with expiration: {}", user.getEmailAddress(), expiration);
            return token;

        } catch (Exception e) {
            logger.error("Error generating JWT token for user: {}", user.getEmailAddress(), e);
            throw new RuntimeException("Failed to generate JWT token", e);
        }
    }

    /**
     * Validate JWT token and extract user claims
     */
    public Optional<UserClaims> validateToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            logger.debug("Token is null or empty");
            return Optional.empty();
        }

        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(secretKey)
                    .requireIssuer(issuer)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            // Extract claims with exact Rails payload structure
            String userId = claims.get("userId", String.class);
            String email = claims.get("email", String.class);
            Date expiration = claims.getExpiration();
            Date issuedAt = claims.getIssuedAt();

            if (userId == null || email == null) {
                logger.warn("Token missing required claims: userId={}, email={}", userId, email);
                return Optional.empty();
            }

            // Check if token is expired
            if (expiration != null && expiration.before(new Date())) {
                logger.debug("Token is expired: {}", expiration);
                return Optional.empty();
            }

            UserClaims userClaims = new UserClaims(userId, email, expiration, issuedAt);
            logger.debug("Successfully validated token for user: {}", email);
            return Optional.of(userClaims);

        } catch (ExpiredJwtException e) {
            logger.debug("Token is expired: {}", e.getMessage());
            return Optional.empty();
        } catch (UnsupportedJwtException e) {
            logger.warn("Unsupported JWT token: {}", e.getMessage());
            return Optional.empty();
        } catch (MalformedJwtException e) {
            logger.warn("Malformed JWT token: {}", e.getMessage());
            return Optional.empty();
        } catch (SecurityException | IllegalArgumentException e) {
            logger.warn("JWT token validation failed: {}", e.getMessage());
            return Optional.empty();
        } catch (Exception e) {
            logger.error("Unexpected error validating JWT token", e);
            return Optional.empty();
        }
    }

    /**
     * Extract token from Authorization header (Bearer token)
     */
    public Optional<String> extractTokenFromHeader(String authorizationHeader) {
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            return Optional.of(authorizationHeader.substring(7));
        }
        return Optional.empty();
    }

    /**
     * Check if token is valid without extracting claims
     */
    public boolean isTokenValid(String token) {
        return validateToken(token).isPresent();
    }

    /**
     * Get token expiration time
     */
    public Optional<Date> getTokenExpiration(String token) {
        return validateToken(token).map(UserClaims::expiration);
    }

    /**
     * Get token issued time
     */
    public Optional<Date> getTokenIssuedAt(String token) {
        return validateToken(token).map(UserClaims::issuedAt);
    }

    /**
     * Generate token with custom expiration
     */
    public String generateTokenWithExpiration(User user, long customExpirationSeconds) {
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime expiration = now.plusSeconds(customExpirationSeconds);
            
            Date issuedAt = Date.from(now.atZone(ZoneId.systemDefault()).toInstant());
            Date expiresAt = Date.from(expiration.atZone(ZoneId.systemDefault()).toInstant());

            Map<String, Object> claims = new HashMap<>();
            claims.put("userId", user.getUserId());
            claims.put("email", user.getEmail());
            
            String token = Jwts.builder()
                    .setClaims(claims)
                    .setIssuer(issuer)
                    .setIssuedAt(issuedAt)
                    .setExpiration(expiresAt)
                    .signWith(secretKey, SignatureAlgorithm.HS256)
                    .compact();

            logger.debug("Generated JWT token for user: {} with custom expiration: {} seconds", 
                user.getEmailAddress(), customExpirationSeconds);
            return token;

        } catch (Exception e) {
            logger.error("Error generating JWT token with custom expiration for user: {}", user.getEmailAddress(), e);
            throw new RuntimeException("Failed to generate JWT token", e);
        }
    }

    /**
     * User claims record matching Rails JWT payload structure
     */
    public record UserClaims(
            String userId,
            String email,
            Date expiration,
            Date issuedAt
    ) {}
}