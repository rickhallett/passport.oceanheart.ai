package models

import (
	"time"

	"github.com/gofrs/uuid"
)

type Session struct {
	ID        uuid.UUID `json:"id" db:"id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	UserAgent string    `json:"user_agent" db:"user_agent"`
	IPAddress string    `json:"ip_address" db:"ip_address"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	ExpiresAt time.Time `json:"expires_at" db:"expires_at"`
	
	User *User `json:"user,omitempty" belongs_to:"user"`
}

// String returns the session ID
func (s Session) String() string {
	return s.ID.String()
}

// IsExpired checks if the session has expired
func (s Session) IsExpired() bool {
	return time.Now().After(s.ExpiresAt)
}

// Sessions is the default collection
type Sessions []Session