package models

import (
	"database/sql"
	"time"
)

type Session struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SessionCreateParams struct {
	UserID    int64  `json:"user_id" validate:"required"`
	IPAddress string `json:"ip_address"`
	UserAgent string `json:"user_agent"`
}

type SessionResponse struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	CreatedAt time.Time `json:"created_at"`
}

func (s *Session) ToResponse() SessionResponse {
	return SessionResponse{
		ID:        s.ID,
		UserID:    s.UserID,
		IPAddress: s.IPAddress,
		UserAgent: s.UserAgent,
		CreatedAt: s.CreatedAt,
	}
}

func (s *Session) Scan(rows *sql.Rows) error {
	return rows.Scan(
		&s.ID,
		&s.UserID,
		&s.IPAddress,
		&s.UserAgent,
		&s.CreatedAt,
		&s.UpdatedAt,
	)
}

func (s *Session) ScanRow(row *sql.Row) error {
	return row.Scan(
		&s.ID,
		&s.UserID,
		&s.IPAddress,
		&s.UserAgent,
		&s.CreatedAt,
		&s.UpdatedAt,
	)
}