package models_test

import (
	"testing"

	"github.com/stretchr/testify/require"
	"passport-buffalo/models"
)

func TestUser_String(t *testing.T) {
	r := require.New(t)
	u := models.User{EmailAddress: "test@example.com"}
	r.Equal("test@example.com", u.String())
}

func TestUser_Authorize(t *testing.T) {
	r := require.New(t)
	u := models.User{}
	
	// Set password which will be hashed
	u.Password = "password123"
	err := u.BeforeCreate(nil)
	r.NoError(err)
	
	// Test correct password
	r.True(u.Authorize("password123"))
	
	// Test incorrect password
	r.False(u.Authorize("wrongpassword"))
}

func TestUser_IsAdmin(t *testing.T) {
	r := require.New(t)
	
	// Test regular user
	u1 := models.User{Role: "user"}
	r.False(u1.IsAdmin())
	
	// Test admin user
	u2 := models.User{Role: "admin"}
	r.True(u2.IsAdmin())
}