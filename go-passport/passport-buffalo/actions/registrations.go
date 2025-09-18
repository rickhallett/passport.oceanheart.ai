package actions

import (
	"net/http"

	"github.com/gobuffalo/buffalo"
	"github.com/gobuffalo/pop/v6"
	"github.com/gofrs/uuid"
	"passport-buffalo/auth"
	"passport-buffalo/models"
)

// RegistrationsNew renders the sign up page
func RegistrationsNew(c buffalo.Context) error {
	c.Set("user", &models.User{})
	return c.Render(http.StatusOK, r.HTML("registrations/new.plush.html"))
}

// RegistrationsCreate handles user registration
func RegistrationsCreate(c buffalo.Context) error {
	tx := c.Value("tx").(*pop.Connection)
	
	user := &models.User{}
	if err := c.Bind(user); err != nil {
		return err
	}
	
	// Validate and create user
	verrs, err := user.Create(tx)
	if err != nil {
		return err
	}
	
	if verrs.HasAny() {
		c.Set("user", user)
		c.Set("errors", verrs)
		return c.Render(http.StatusUnprocessableEntity, r.HTML("registrations/new.plush.html"))
	}
	
	// Create session for the new user
	sessionID := uuid.Must(uuid.NewV4())
	session := &models.Session{
		ID:        sessionID,
		UserID:    user.ID,
		UserAgent: c.Request().Header.Get("User-Agent"),
		IPAddress: c.Request().RemoteAddr,
	}
	
	if err := tx.Create(session); err != nil {
		return err
	}
	
	// Set session cookie
	c.Cookies().Set("session_id", session.ID.String(), 30*24*60*60)
	
	// Set JWT cookie
	auth.SetJWTCookie(c, user)
	
	// Handle Turbo Stream responses
	if c.Request().Header.Get("Accept") == "text/vnd.turbo-stream.html" {
		return c.Render(http.StatusOK, r.String(`
			<turbo-stream action="replace" target="authentication">
				<template>
					<div class="success-message">Welcome! Your account has been created.</div>
				</template>
			</turbo-stream>
		`))
	}
	
	c.Flash().Add("success", "Welcome! Your account has been created.")
	return c.Redirect(http.StatusSeeOther, "/")
}