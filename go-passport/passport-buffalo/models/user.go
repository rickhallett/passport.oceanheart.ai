package models

import (
	"strings"
	"time"

	"github.com/gobuffalo/pop/v6"
	"github.com/gobuffalo/validate/v3"
	"github.com/gobuffalo/validate/v3/validators"
	"github.com/gofrs/uuid"
	"github.com/pkg/errors"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID           uuid.UUID    `json:"id" db:"id"`
	EmailAddress string       `json:"email" db:"email_address"`
	PasswordHash string       `json:"-" db:"password_hash"`
	Password     string       `json:"-" db:"-"`
	Role         string       `json:"role" db:"role"`
	CreatedAt    time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at" db:"updated_at"`
	
	Sessions []Session `json:"-" has_many:"sessions"`
}

// String returns the email address
func (u User) String() string {
	return u.EmailAddress
}

// Create validates and creates a new User
func (u *User) Create(tx *pop.Connection) (*validate.Errors, error) {
	u.EmailAddress = strings.ToLower(strings.TrimSpace(u.EmailAddress))
	return tx.ValidateAndCreate(u)
}

// BeforeCreate hashes the password
func (u *User) BeforeCreate(tx *pop.Connection) error {
	if u.Password == "" {
		return errors.New("password required")
	}
	
	hash, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	
	u.PasswordHash = string(hash)
	u.Password = ""
	
	if u.Role == "" {
		u.Role = "user"
	}
	
	return nil
}

// Authorize checks user credentials
func (u *User) Authorize(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
	return err == nil
}

// IsAdmin checks if user has admin role
func (u *User) IsAdmin() bool {
	return u.Role == "admin"
}

// ValidateCreate validates User creation
func (u *User) ValidateCreate(tx *pop.Connection) (*validate.Errors, error) {
	return validate.Validate(
		&validators.EmailIsPresent{Field: u.EmailAddress, Name: "EmailAddress"},
		&validators.StringIsPresent{Field: u.Password, Name: "Password"},
		&validators.StringLengthInRange{Field: u.Password, Name: "Password", Min: 8, Max: 72},
		&validators.EmailLike{Field: u.EmailAddress, Name: "EmailAddress"},
		&validators.FuncValidator{
			Fn: func() bool {
				exists, err := tx.Where("email_address = ?", u.EmailAddress).Exists(&User{})
				return err != nil || !exists
			},
			Field:   "EmailAddress",
			Message: "Email address already in use",
		},
	), nil
}

// Users is the default collection
type Users []User