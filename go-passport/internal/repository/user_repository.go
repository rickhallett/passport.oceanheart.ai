package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/oceanheart/go-passport/internal/config"
	"github.com/oceanheart/go-passport/internal/models"
)

var (
	ErrUserNotFound     = errors.New("user not found")
	ErrUserAlreadyExists = errors.New("user already exists")
)

type UserRepository struct {
	db *config.Database
}

func NewUserRepository(db *config.Database) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (email_address, password_digest, role, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`
	
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now
	
	if user.Role == "" {
		user.Role = models.RoleUser
	}
	
	err := r.db.QueryRowContext(
		ctx,
		query,
		strings.ToLower(user.EmailAddress),
		user.PasswordDigest,
		user.Role,
		user.CreatedAt,
		user.UpdatedAt,
	).Scan(&user.ID)
	
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			return ErrUserAlreadyExists
		}
		return fmt.Errorf("failed to create user: %w", err)
	}
	
	return nil
}

func (r *UserRepository) FindByID(ctx context.Context, id int64) (*models.User, error) {
	query := `
		SELECT id, email_address, password_digest, role, created_at, updated_at
		FROM users
		WHERE id = $1`
	
	user := &models.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.EmailAddress,
		&user.PasswordDigest,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to find user by ID: %w", err)
	}
	
	return user, nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, email_address, password_digest, role, created_at, updated_at
		FROM users
		WHERE LOWER(email_address) = LOWER($1)`
	
	user := &models.User{}
	err := r.db.QueryRowContext(ctx, query, strings.ToLower(email)).Scan(
		&user.ID,
		&user.EmailAddress,
		&user.PasswordDigest,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to find user by email: %w", err)
	}
	
	return user, nil
}

func (r *UserRepository) Update(ctx context.Context, user *models.User) error {
	query := `
		UPDATE users
		SET email_address = $1, password_digest = $2, role = $3, updated_at = $4
		WHERE id = $5`
	
	user.UpdatedAt = time.Now()
	
	result, err := r.db.ExecContext(
		ctx,
		query,
		strings.ToLower(user.EmailAddress),
		user.PasswordDigest,
		user.Role,
		user.UpdatedAt,
		user.ID,
	)
	
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			return ErrUserAlreadyExists
		}
		return fmt.Errorf("failed to update user: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return ErrUserNotFound
	}
	
	return nil
}

func (r *UserRepository) UpdateRole(ctx context.Context, id int64, role models.UserRole) error {
	query := `
		UPDATE users
		SET role = $1, updated_at = $2
		WHERE id = $3`
	
	result, err := r.db.ExecContext(ctx, query, role, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to update user role: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return ErrUserNotFound
	}
	
	return nil
}

func (r *UserRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM users WHERE id = $1`
	
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return ErrUserNotFound
	}
	
	return nil
}

func (r *UserRepository) List(ctx context.Context, offset, limit int) ([]*models.User, error) {
	query := `
		SELECT id, email_address, password_digest, role, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`
	
	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()
	
	var users []*models.User
	for rows.Next() {
		user := &models.User{}
		if err := user.Scan(rows); err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}
	
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}
	
	return users, nil
}

func (r *UserRepository) Count(ctx context.Context) (int64, error) {
	query := `SELECT COUNT(*) FROM users`
	
	var count int64
	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count users: %w", err)
	}
	
	return count, nil
}

func (r *UserRepository) Search(ctx context.Context, searchTerm string, offset, limit int) ([]*models.User, error) {
	query := `
		SELECT id, email_address, password_digest, role, created_at, updated_at
		FROM users
		WHERE LOWER(email_address) LIKE LOWER($1)
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`
	
	searchPattern := "%" + searchTerm + "%"
	rows, err := r.db.QueryContext(ctx, query, searchPattern, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to search users: %w", err)
	}
	defer rows.Close()
	
	var users []*models.User
	for rows.Next() {
		user := &models.User{}
		if err := user.Scan(rows); err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}
	
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}
	
	return users, nil
}