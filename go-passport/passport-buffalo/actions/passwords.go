package actions

import (
	"net/http"
	"time"

	"github.com/gobuffalo/buffalo"
	"github.com/gobuffalo/pop/v6"
	"github.com/gofrs/uuid"
	"passport-buffalo/models"
)

// PasswordsNew renders the password reset request page
func PasswordsNew(c buffalo.Context) error {
	return c.Render(http.StatusOK, r.HTML("passwords/new.plush.html"))
}

// PasswordsCreate handles password reset requests
func PasswordsCreate(c buffalo.Context) error {
	tx := c.Value("tx").(*pop.Connection)
	
	email := c.Param("email_address")
	
	// Find user
	user := &models.User{}
	err := tx.Where("email_address = ?", email).First(user)
	
	// Always show success message (don't leak user existence)
	c.Flash().Add("success", "If an account exists with this email, you will receive password reset instructions.")
	
	if err == nil {
		// Generate reset token
		token, err := models.GenerateToken()
		if err != nil {
			return err
		}
		
		// Create password reset token
		resetToken := &models.PasswordResetToken{
			ID:        uuid.Must(uuid.NewV4()),
			UserID:    user.ID,
			Token:     token,
			ExpiresAt: time.Now().Add(1 * time.Hour),
		}
		
		if err := tx.Create(resetToken); err != nil {
			return err
		}
		
		// TODO: Send password reset email
		// mailers.SendPasswordResetEmail(user, token)
	}
	
	return c.Redirect(http.StatusSeeOther, "/sign_in")
}

// PasswordsEdit renders the password reset form
func PasswordsEdit(c buffalo.Context) error {
	tx := c.Value("tx").(*pop.Connection)
	
	token := c.Param("token")
	
	// Find valid token
	resetToken := &models.PasswordResetToken{}
	err := tx.Where("token = ? AND expires_at > ?", token, time.Now()).First(resetToken)
	
	if err != nil {
		c.Flash().Add("danger", "Invalid or expired reset token")
		return c.Redirect(http.StatusSeeOther, "/sign_in")
	}
	
	c.Set("token", token)
	return c.Render(http.StatusOK, r.HTML("passwords/edit.plush.html"))
}

// PasswordsUpdate handles password reset
func PasswordsUpdate(c buffalo.Context) error {
	tx := c.Value("tx").(*pop.Connection)
	
	token := c.Param("token")
	newPassword := c.Param("password")
	passwordConfirmation := c.Param("password_confirmation")
	
	// Validate passwords match
	if newPassword != passwordConfirmation {
		c.Flash().Add("danger", "Passwords do not match")
		return c.Redirect(http.StatusSeeOther, "/passwords/"+token+"/edit")
	}
	
	// Find valid token
	resetToken := &models.PasswordResetToken{}
	err := tx.Where("token = ? AND expires_at > ?", token, time.Now()).First(resetToken)
	
	if err != nil {
		c.Flash().Add("danger", "Invalid or expired reset token")
		return c.Redirect(http.StatusSeeOther, "/sign_in")
	}
	
	// Find user
	user := &models.User{}
	if err := tx.Find(user, resetToken.UserID); err != nil {
		return err
	}
	
	// Update password
	user.Password = newPassword
	if err := user.BeforeCreate(tx); err != nil {
		return err
	}
	
	if err := tx.Update(user); err != nil {
		return err
	}
	
	// Delete used token
	if err := tx.Destroy(resetToken); err != nil {
		return err
	}
	
	c.Flash().Add("success", "Your password has been updated. Please sign in.")
	return c.Redirect(http.StatusSeeOther, "/sign_in")
}