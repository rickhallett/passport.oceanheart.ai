package com.oceanheart.passport.controller;

import com.oceanheart.passport.service.AuthService;
import com.oceanheart.passport.service.JwtService;
import com.oceanheart.passport.domain.User;
import com.oceanheart.passport.dto.SignUpRequest;
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
public class RegistrationsController {
    
    private static final Logger logger = LoggerFactory.getLogger(RegistrationsController.class);
    
    @Autowired
    private AuthService authService;
    
    @Autowired
    private JwtService jwtService;
    
    @Value("${passport.cookie-domain}")
    private String cookieDomain;
    
    @Value("${server.servlet.session.cookie.secure:false}")
    private boolean secureCookies;

    /**
     * Show sign-up form
     */
    @GetMapping("/sign-up")
    public String showSignUp(
            @RequestParam(value = "returnTo", required = false) String returnTo,
            Model model,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        logger.debug("Showing sign-up form, returnTo: {}", returnTo);
        
        // Redirect if already authenticated
        if (userDetails != null) {
            String redirectUrl = returnTo != null ? returnTo : "/";
            return "redirect:" + redirectUrl;
        }
        
        model.addAttribute("signUpRequest", new SignUpRequest());
        model.addAttribute("returnTo", returnTo);
        model.addAttribute("pageTitle", "Sign Up - Oceanheart Auth");
        
        return "registrations/new";
    }
    
    /**
     * Process sign-up form submission
     */
    @PostMapping("/sign-up")
    public String processSignUp(
            @Valid @ModelAttribute("signUpRequest") SignUpRequest signUpRequest,
            BindingResult bindingResult,
            @RequestParam(value = "returnTo", required = false) String returnTo,
            HttpServletRequest request,
            HttpServletResponse response,
            RedirectAttributes redirectAttributes,
            Model model) {
        
        logger.debug("Processing sign-up for email: {}", signUpRequest.getEmailAddress());
        
        // Check for validation errors
        if (bindingResult.hasErrors()) {
            model.addAttribute("returnTo", returnTo);
            model.addAttribute("pageTitle", "Sign Up - Oceanheart Auth");
            return "registrations/new";
        }
        
        // Check if passwords match
        if (!signUpRequest.getPassword().equals(signUpRequest.getPasswordConfirmation())) {
            model.addAttribute("returnTo", returnTo);
            model.addAttribute("pageTitle", "Sign Up - Oceanheart Auth");
            model.addAttribute("error", "Passwords do not match");
            return "registrations/new";
        }
        
        try {
            // Check if user already exists
            if (authService.userExists(signUpRequest.getEmailAddress())) {
                model.addAttribute("returnTo", returnTo);
                model.addAttribute("pageTitle", "Sign Up - Oceanheart Auth");
                model.addAttribute("error", "An account with this email already exists");
                return "registrations/new";
            }
            
            // Create new user
            User newUser = authService.createUser(
                signUpRequest.getFirstName(),
                signUpRequest.getLastName(),
                signUpRequest.getEmailAddress(),
                signUpRequest.getPassword()
            );
            
            // Authenticate the new user
            Map<String, Object> authResult = authService.authenticateUser(
                signUpRequest.getEmailAddress(),
                signUpRequest.getPassword(),
                request.getRemoteAddr(),
                request.getHeader("User-Agent")
            );
            
            String token = (String) authResult.get("token");
            String sessionId = (String) authResult.get("sessionId");
            
            // Set authentication cookies
            setAuthenticationCookie(response, token);
            setSessionCookie(response, sessionId);
            
            logger.info("New user {} created and signed in", newUser.getEmailAddress());
            
            // Redirect to return URL or home
            String redirectUrl = returnTo != null && !returnTo.isEmpty() ? returnTo : "/";
            redirectAttributes.addFlashAttribute("notice", 
                "Welcome to Oceanheart, " + newUser.getFirstName() + "! Your account has been created.");
            
            return "redirect:" + redirectUrl;
            
        } catch (Exception e) {
            logger.error("Sign-up failed for {}: {}", signUpRequest.getEmailAddress(), e.getMessage(), e);
            
            model.addAttribute("returnTo", returnTo);
            model.addAttribute("pageTitle", "Sign Up - Oceanheart Auth");
            model.addAttribute("error", "Unable to create account. Please try again.");
            
            return "registrations/new";
        }
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
}