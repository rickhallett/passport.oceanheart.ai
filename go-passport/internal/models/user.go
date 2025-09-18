package models

import (
	"database/sql"
	"time"
)

type UserRole string

const (
	RoleUser  UserRole = "user"
	RoleAdmin UserRole = "admin"
)

type User struct {
	ID             int64     `json:"id"`
	EmailAddress   string    `json:"email"`
	PasswordDigest string    `json:"-"`
	Role           UserRole  `json:"role"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type UserCreateParams struct {
	EmailAddress string `json:"email" validate:"required,email"`
	Password     string `json:"password" validate:"required,min=6"`
}

type UserUpdateParams struct {
	EmailAddress *string   `json:"email,omitempty" validate:"omitempty,email"`
	Password     *string   `json:"password,omitempty" validate:"omitempty,min=6"`
	Role         *UserRole `json:"role,omitempty" validate:"omitempty,oneof=user admin"`
}

type UserResponse struct {
	ID           int64     `json:"id"`
	EmailAddress string    `json:"email"`
	Role         UserRole  `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:           u.ID,
		EmailAddress: u.EmailAddress,
		Role:         u.Role,
		CreatedAt:    u.CreatedAt,
	}
}

func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin
}

func (u *User) Scan(rows *sql.Rows) error {
	return rows.Scan(
		&u.ID,
		&u.EmailAddress,
		&u.PasswordDigest,
		&u.Role,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
}

func (u *User) ScanRow(row *sql.Row) error {
	return row.Scan(
		&u.ID,
		&u.EmailAddress,
		&u.PasswordDigest,
		&u.Role,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
}