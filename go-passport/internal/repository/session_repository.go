package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/oceanheart/go-passport/internal/config"
	"github.com/oceanheart/go-passport/internal/models"
)

var (
	ErrSessionNotFound = errors.New("session not found")
)

type SessionRepository struct {
	db *config.Database
}

func NewSessionRepository(db *config.Database) *SessionRepository {
	return &SessionRepository{db: db}
}

func (r *SessionRepository) Create(ctx context.Context, session *models.Session) error {
	query := `
		INSERT INTO sessions (user_id, ip_address, user_agent, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`
	
	now := time.Now()
	session.CreatedAt = now
	session.UpdatedAt = now
	
	err := r.db.QueryRowContext(
		ctx,
		query,
		session.UserID,
		session.IPAddress,
		session.UserAgent,
		session.CreatedAt,
		session.UpdatedAt,
	).Scan(&session.ID)
	
	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}
	
	return nil
}

func (r *SessionRepository) FindByID(ctx context.Context, id int64) (*models.Session, error) {
	query := `
		SELECT id, user_id, ip_address, user_agent, created_at, updated_at
		FROM sessions
		WHERE id = $1`
	
	session := &models.Session{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&session.ID,
		&session.UserID,
		&session.IPAddress,
		&session.UserAgent,
		&session.CreatedAt,
		&session.UpdatedAt,
	)
	
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSessionNotFound
		}
		return nil, fmt.Errorf("failed to find session by ID: %w", err)
	}
	
	return session, nil
}

func (r *SessionRepository) FindByUserID(ctx context.Context, userID int64) ([]*models.Session, error) {
	query := `
		SELECT id, user_id, ip_address, user_agent, created_at, updated_at
		FROM sessions
		WHERE user_id = $1
		ORDER BY created_at DESC`
	
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to find sessions by user ID: %w", err)
	}
	defer rows.Close()
	
	var sessions []*models.Session
	for rows.Next() {
		session := &models.Session{}
		if err := session.Scan(rows); err != nil {
			return nil, fmt.Errorf("failed to scan session: %w", err)
		}
		sessions = append(sessions, session)
	}
	
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}
	
	return sessions, nil
}

func (r *SessionRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM sessions WHERE id = $1`
	
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return ErrSessionNotFound
	}
	
	return nil
}

func (r *SessionRepository) DeleteByUserID(ctx context.Context, userID int64) error {
	query := `DELETE FROM sessions WHERE user_id = $1`
	
	_, err := r.db.ExecContext(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete sessions by user ID: %w", err)
	}
	
	return nil
}

func (r *SessionRepository) DeleteExpired(ctx context.Context, expiryDuration time.Duration) error {
	query := `DELETE FROM sessions WHERE created_at < $1`
	
	expiryTime := time.Now().Add(-expiryDuration)
	_, err := r.db.ExecContext(ctx, query, expiryTime)
	if err != nil {
		return fmt.Errorf("failed to delete expired sessions: %w", err)
	}
	
	return nil
}

func (r *SessionRepository) Update(ctx context.Context, session *models.Session) error {
	query := `
		UPDATE sessions
		SET ip_address = $1, user_agent = $2, updated_at = $3
		WHERE id = $4`
	
	session.UpdatedAt = time.Now()
	
	result, err := r.db.ExecContext(
		ctx,
		query,
		session.IPAddress,
		session.UserAgent,
		session.UpdatedAt,
		session.ID,
	)
	
	if err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return ErrSessionNotFound
	}
	
	return nil
}

func (r *SessionRepository) CountByUserID(ctx context.Context, userID int64) (int64, error) {
	query := `SELECT COUNT(*) FROM sessions WHERE user_id = $1`
	
	var count int64
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count sessions: %w", err)
	}
	
	return count, nil
}