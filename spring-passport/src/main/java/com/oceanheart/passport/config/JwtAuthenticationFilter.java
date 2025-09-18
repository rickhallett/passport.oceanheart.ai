package com.oceanheart.passport.config;

import com.oceanheart.passport.service.AuthService;
import com.oceanheart.passport.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    
    private final AuthService authService;

    public JwtAuthenticationFilter(AuthService authService) {
        this.authService = authService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                  FilterChain filterChain) throws ServletException, IOException {
        
        try {
            // Skip authentication for public endpoints
            String path = request.getRequestURI();
            if (isPublicEndpoint(path)) {
                filterChain.doFilter(request, response);
                return;
            }

            // Try to authenticate from JWT token (cookie or header)
            String token = extractToken(request);
            if (token != null) {
                Optional<User> userOpt = authService.validateTokenAndGetUser(token);
                if (userOpt.isPresent()) {
                    setAuthentication(userOpt.get(), request);
                    filterChain.doFilter(request, response);
                    return;
                }
            }

            // Try to authenticate from session cookie
            String sessionId = extractSessionId(request);
            if (sessionId != null) {
                try {
                    UUID sessionUuid = UUID.fromString(sessionId);
                    Optional<User> userOpt = authService.validateSessionAndGetUser(sessionUuid);
                    if (userOpt.isPresent()) {
                        setAuthentication(userOpt.get(), request);
                        filterChain.doFilter(request, response);
                        return;
                    }
                } catch (IllegalArgumentException e) {
                    logger.debug("Invalid session ID format: {}", sessionId);
                }
            }

            // No valid authentication found
            filterChain.doFilter(request, response);

        } catch (Exception e) {
            logger.error("Cannot set user authentication: {}", e.getMessage());
            filterChain.doFilter(request, response);
        }
    }

    private boolean isPublicEndpoint(String path) {
        return path.equals("/") ||
               path.equals("/sign-in") ||
               path.equals("/sign-up") ||
               path.equals("/auth-status") ||
               path.startsWith("/css/") ||
               path.startsWith("/js/") ||
               path.startsWith("/images/") ||
               path.equals("/favicon.ico") ||
               path.startsWith("/icon.") ||
               path.equals("/actuator/health") ||
               path.startsWith("/api/auth/");
    }

    private String extractToken(HttpServletRequest request) {
        // Try Authorization header first
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }

        // Try auth_token cookie
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("auth_token".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }

        return null;
    }

    private String extractSessionId(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("session_id".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    private void setAuthentication(User user, HttpServletRequest request) {
        UsernamePasswordAuthenticationToken authentication = 
            new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        
        logger.debug("Set authentication for user: {}", user.getEmailAddress());
    }
}