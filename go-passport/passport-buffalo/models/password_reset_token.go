package models

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/gofrs/uuid"
)

type PasswordResetToken struct {
	ID        uuid.UUID `json:"id" db:"id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	Token     string    `json:"token" db:"token"`
	ExpiresAt time.Time `json:"expires_at" db:"expires_at"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	
	User *User `json:"user,omitempty" belongs_to:"user"`
}

// String returns the token
func (p PasswordResetToken) String() string {
	return p.Token
}

// IsExpired checks if the token has expired
func (p PasswordResetToken) IsExpired() bool {
	return time.Now().After(p.ExpiresAt)
}

// GenerateToken creates a secure random token
func GenerateToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// PasswordResetTokens is the default collection
type PasswordResetTokens []PasswordResetToken