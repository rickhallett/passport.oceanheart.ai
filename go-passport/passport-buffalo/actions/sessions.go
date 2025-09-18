package actions

import (
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"github.com/gobuffalo/buffalo"
	"github.com/gobuffalo/envy"
	"github.com/gobuffalo/pop/v6"
	"github.com/gofrs/uuid"
	"passport-buffalo/auth"
	"passport-buffalo/models"
)

// SessionsNew renders the sign in page
func SessionsNew(c buffalo.Context) error {
	c.Set("returnTo", sanitizeReturnURL(c.Param("returnTo")))
	return c.Render(http.StatusOK, r.HTML("sessions/new.plush.html"))
}

// SessionsCreate handles sign in
func SessionsCreate(c buffalo.Context) error {
	tx := c.Value("tx").(*pop.Connection)
	
	email := strings.ToLower(strings.TrimSpace(c.Param("email_address")))
	password := c.Param("password")
	
	// Find user
	user := &models.User{}
	err := tx.Where("email_address = ?", email).First(user)
	if err != nil {
		c.Flash().Add("danger", "Invalid email or password")
		return c.Redirect(http.StatusSeeOther, "/sign_in")
	}
	
	// Verify password
	if !user.Authorize(password) {
		c.Flash().Add("danger", "Invalid email or password")
		return c.Redirect(http.StatusSeeOther, "/sign_in")
	}
	
	// Create session
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
	
	// Set JWT cookie for cross-domain auth
	auth.SetJWTCookie(c, user)
	
	// Handle Turbo Stream responses
	if c.Request().Header.Get("Accept") == "text/vnd.turbo-stream.html" {
		return c.Render(http.StatusOK, r.String(`
			<turbo-stream action="replace" target="authentication">
				<template>
					<div class="success-message">Welcome back!</div>
				</template>
			</turbo-stream>
			<turbo-stream action="replace" target="auth_status">
				<template>
					<span>Signed in as %s</span>
				</template>
			</turbo-stream>
		`, user.EmailAddress))
	}
	
	// Redirect to return URL or default
	returnTo := c.Param("returnTo")
	if returnTo == "" {
		returnToInterface := c.Session().Get("return_to")
		if returnToInterface != nil {
			returnTo = returnToInterface.(string)
		}
		c.Session().Delete("return_to")
	}
	
	if returnTo == "" {
		if user.IsAdmin() {
			returnTo = "/admin"
		} else {
			returnTo = "/"
		}
	}
	
	return c.Redirect(http.StatusSeeOther, sanitizeReturnURL(returnTo))
}

// SessionsDestroy handles sign out
func SessionsDestroy(c buffalo.Context) error {
	tx := c.Value("tx").(*pop.Connection)
	
	// Delete session from database
	if session, ok := c.Value("current_session").(*models.Session); ok {
		tx.Destroy(session)
	}
	
	// Clear cookies
	c.Cookies().Delete("session_id")
	c.Cookies().Delete("auth_token")
	
	c.Flash().Add("info", "You have been signed out")
	return c.Redirect(http.StatusSeeOther, "/")
}

// sanitizeReturnURL validates and sanitizes redirect URLs
func sanitizeReturnURL(returnURL string) string {
	if returnURL == "" {
		return ""
	}
	
	parsedURL, err := url.Parse(returnURL)
	if err != nil {
		return ""
	}
	
	// Check allowed hosts
	allowedHosts := getAllowedHosts()
	if !isAllowedHost(parsedURL.Host, allowedHosts) {
		return ""
	}
	
	return returnURL
}

func getAllowedHosts() []interface{} {
	if envy.Get("GO_ENV", "development") == "production" {
		return []interface{}{
			"oceanheart.ai",
			"www.oceanheart.ai",
			regexp.MustCompile(`^[a-z0-9-]+\.oceanheart\.ai$`),
		}
	}
	
	return []interface{}{
		"lvh.me",
		regexp.MustCompile(`^[a-z0-9-]+\.lvh\.me$`),
		"localhost",
	}
}

func isAllowedHost(host string, allowed []interface{}) bool {
	for _, a := range allowed {
		switch v := a.(type) {
		case string:
			if host == v {
				return true
			}
		case *regexp.Regexp:
			if v.MatchString(host) {
				return true
			}
		}
	}
	return false
}