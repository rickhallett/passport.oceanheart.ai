package com.oceanheart.passport.controller;

import com.oceanheart.passport.service.AuthService;
import com.oceanheart.passport.service.JwtService;
import com.oceanheart.passport.domain.User;
import com.oceanheart.passport.dto.SignInRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Map;

@Controller
@RequestMapping("/")
public class SessionsController {
    
    private static final Logger logger = LoggerFactory.getLogger(SessionsController.class);
    
    @Autowired
    private AuthService authService;
    
    @Autowired
    private JwtService jwtService;
    
    @Value("${passport.cookie-domain}")
    private String cookieDomain;
    
    @Value("${server.servlet.session.cookie.secure:false}")
    private boolean secureCookies;

    /**
     * Show sign-in form
     */
    @GetMapping("/sign-in")
    public String showSignIn(
            @RequestParam(value = "returnTo", required = false) String returnTo,
            Model model,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        logger.debug("Showing sign-in form, returnTo: {}", returnTo);
        
        // Redirect if already authenticated
        if (userDetails != null) {
            String redirectUrl = returnTo != null ? returnTo : "/";
            return "redirect:" + redirectUrl;
        }
        
        model.addAttribute("signInRequest", new SignInRequest());
        model.addAttribute("returnTo", returnTo);
        model.addAttribute("pageTitle", "Sign In - Oceanheart Auth");
        
        return "sessions/new";
    }
    
    /**
     * Process sign-in form submission
     */
    @PostMapping("/sign-in")
    public String processSignIn(
            @Valid @ModelAttribute("signInRequest") SignInRequest signInRequest,
            BindingResult bindingResult,
            @RequestParam(value = "returnTo", required = false) String returnTo,
            HttpServletRequest request,
            HttpServletResponse response,
            RedirectAttributes redirectAttributes,
            Model model) {
        
        logger.debug("Processing sign-in for email: {}", signInRequest.getEmailAddress());
        
        if (bindingResult.hasErrors()) {
            model.addAttribute("returnTo", returnTo);
            model.addAttribute("pageTitle", "Sign In - Oceanheart Auth");
            return "sessions/new";
        }
        
        try {
            // Authenticate user
            Map<String, Object> authResult = authService.authenticateUser(
                signInRequest.getEmailAddress(), 
                signInRequest.getPassword(),
                request.getRemoteAddr(),
                request.getHeader("User-Agent")
            );
            
            User user = (User) authResult.get("user");
            String token = (String) authResult.get("token");
            String sessionId = (String) authResult.get("sessionId");
            
            // Set authentication cookie
            setAuthenticationCookie(response, token);
            
            // Set session cookie
            setSessionCookie(response, sessionId);
            
            logger.info("User {} signed in successfully", user.getEmailAddress());
            
            // Redirect to return URL or home
            String redirectUrl = returnTo != null && !returnTo.isEmpty() ? returnTo : "/";
            redirectAttributes.addFlashAttribute("notice", "Welcome back, " + user.getFirstName() + "!");
            
            return "redirect:" + redirectUrl;
            
        } catch (Exception e) {
            logger.warn("Sign-in failed for {}: {}", signInRequest.getEmailAddress(), e.getMessage());
            
            model.addAttribute("returnTo", returnTo);
            model.addAttribute("pageTitle", "Sign In - Oceanheart Auth");
            model.addAttribute("error", "Invalid email or password");
            
            return "sessions/new";
        }
    }
    
    /**
     * Show home page
     */
    @GetMapping("/")
    public String home(Model model, @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails != null) {
            User user = authService.findUserByEmail(userDetails.getUsername());
            model.addAttribute("user", user);
        }
        
        model.addAttribute("pageTitle", "Oceanheart Auth");
        return "home/index";
    }
    
    /**
     * Sign out user
     */
    @PostMapping("/sign-out")
    public String signOut(
            HttpServletRequest request,
            HttpServletResponse response,
            @AuthenticationPrincipal UserDetails userDetails,
            RedirectAttributes redirectAttributes) {
        
        if (userDetails != null) {
            try {
                // Get session from cookie
                String sessionId = getSessionIdFromCookie(request);
                if (sessionId != null) {
                    authService.destroySession(sessionId);
                }
                
                logger.info("User {} signed out", userDetails.getUsername());
                
            } catch (Exception e) {
                logger.warn("Error during sign-out for {}: {}", userDetails.getUsername(), e.getMessage());
            }
        }
        
        // Clear authentication cookies
        clearAuthenticationCookies(response);
        
        redirectAttributes.addFlashAttribute("notice", "You have been signed out");
        return "redirect:/sign-in";
    }
    
    /**
     * Health check endpoint for authentication status
     */
    @GetMapping("/auth-status")
    @ResponseBody
    public Map<String, Object> authStatus(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails != null) {
            User user = authService.findUserByEmail(userDetails.getUsername());
            return Map.of(
                "authenticated", true,
                "user", Map.of(
                    "id", user.getId(),
                    "email", user.getEmailAddress(),
                    "firstName", user.getFirstName(),
                    "lastName", user.getLastName()
                )
            );
        }
        
        return Map.of("authenticated", false);
    }
    
    // Helper methods
    
    private void setAuthenticationCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie("auth_token", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(secureCookies);
        cookie.setPath("/");
        cookie.setDomain(cookieDomain);
        cookie.setMaxAge(7 * 24 * 60 * 60); // 1 week
        cookie.setAttribute("SameSite", "Lax");
        
        response.addCookie(cookie);
    }
    
    private void setSessionCookie(HttpServletResponse response, String sessionId) {
        Cookie cookie = new Cookie("session_id", sessionId);
        cookie.setHttpOnly(true);
        cookie.setSecure(secureCookies);
        cookie.setPath("/");
        cookie.setDomain(cookieDomain);
        cookie.setMaxAge(7 * 24 * 60 * 60); // 1 week
        cookie.setAttribute("SameSite", "Lax");
        
        response.addCookie(cookie);
    }
    
    private void clearAuthenticationCookies(HttpServletResponse response) {
        // Clear auth token cookie
        Cookie authCookie = new Cookie("auth_token", "");
        authCookie.setHttpOnly(true);
        authCookie.setSecure(secureCookies);
        authCookie.setPath("/");
        authCookie.setDomain(cookieDomain);
        authCookie.setMaxAge(0);
        response.addCookie(authCookie);
        
        // Clear session cookie
        Cookie sessionCookie = new Cookie("session_id", "");
        sessionCookie.setHttpOnly(true);
        sessionCookie.setSecure(secureCookies);
        sessionCookie.setPath("/");
        sessionCookie.setDomain(cookieDomain);
        sessionCookie.setMaxAge(0);
        response.addCookie(sessionCookie);
    }
    
    private String getSessionIdFromCookie(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("session_id".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}