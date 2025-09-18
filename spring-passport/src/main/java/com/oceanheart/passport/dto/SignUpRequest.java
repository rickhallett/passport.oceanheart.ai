package com.oceanheart.passport.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Data Transfer Object for sign-up requests
 */
public class SignUpRequest {
    
    @NotBlank(message = "First name is required")
    @Size(max = 50, message = "First name must be less than 50 characters")
    private String firstName;
    
    @NotBlank(message = "Last name is required")
    @Size(max = 50, message = "Last name must be less than 50 characters")
    private String lastName;
    
    @NotBlank(message = "Email address is required")
    @Email(message = "Please enter a valid email address")
    private String emailAddress;
    
    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
    private String password;
    
    @NotBlank(message = "Password confirmation is required")
    @Size(min = 8, max = 72, message = "Password confirmation must be between 8 and 72 characters")
    private String passwordConfirmation;
    
    private String returnTo;
    
    // Default constructor
    public SignUpRequest() {}
    
    // Constructor with parameters
    public SignUpRequest(String firstName, String lastName, String emailAddress, String password, String passwordConfirmation) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.emailAddress = emailAddress;
        this.password = password;
        this.passwordConfirmation = passwordConfirmation;
    }
    
    // Getters and setters
    public String getFirstName() {
        return firstName;
    }
    
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }
    
    public String getLastName() {
        return lastName;
    }
    
    public void setLastName(String lastName) {
        this.lastName = lastName;
    }
    
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
    
    public String getPasswordConfirmation() {
        return passwordConfirmation;
    }
    
    public void setPasswordConfirmation(String passwordConfirmation) {
        this.passwordConfirmation = passwordConfirmation;
    }
    
    public String getReturnTo() {
        return returnTo;
    }
    
    public void setReturnTo(String returnTo) {
        this.returnTo = returnTo;
    }
    
    @Override
    public String toString() {
        return "SignUpRequest{" +
                "firstName='" + firstName + '\'' +
                ", lastName='" + lastName + '\'' +
                ", emailAddress='" + emailAddress + '\'' +
                ", password='[PROTECTED]'" +
                ", passwordConfirmation='[PROTECTED]'" +
                ", returnTo='" + returnTo + '\'' +
                '}';
    }
}