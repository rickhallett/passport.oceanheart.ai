package com.oceanheart.passport.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Data Transfer Object for sign-in requests
 */
public class SignInRequest {
    
    @NotBlank(message = "Email address is required")
    @Email(message = "Please enter a valid email address")
    private String emailAddress;
    
    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
    private String password;
    
    private String returnTo;
    
    // Default constructor
    public SignInRequest() {}
    
    // Constructor with parameters
    public SignInRequest(String emailAddress, String password) {
        this.emailAddress = emailAddress;
        this.password = password;
    }
    
    // Getters and setters
    public String getEmailAddress() {
        return emailAddress;
    }
    
    public void setEmailAddress(String emailAddress) {
        this.emailAddress = emailAddress;
    }
    
    public String getPassword() {
        return password;
    }
    
    public void setPassword(String password) {
        this.password = password;
    }
    
    public String getReturnTo() {
        return returnTo;
    }
    
    public void setReturnTo(String returnTo) {
        this.returnTo = returnTo;
    }
    
    @Override
    public String toString() {
        return "SignInRequest{" +
                "emailAddress='" + emailAddress + '\'' +
                ", password='[PROTECTED]'" +
                ", returnTo='" + returnTo + '\'' +
                '}';
    }
}