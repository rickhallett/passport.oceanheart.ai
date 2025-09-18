package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/oceanheart/go-passport/internal/models"
	"github.com/oceanheart/go-passport/internal/repository"
)

type SessionService struct {
	sessionRepo *repository.SessionRepository
	userRepo    *repository.UserRepository
}

func NewSessionService(sessionRepo *repository.SessionRepository, userRepo *repository.UserRepository) *SessionService {
	return &SessionService{
		sessionRepo: sessionRepo,
		userRepo:     userRepo,
	}
}

func (s *SessionService) GetSession(ctx context.Context, id int64) (*models.Session, error) {
	session, err := s.sessionRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrSessionNotFound) {
			return nil, ErrSessionNotFound
		}
		return nil, fmt.Errorf("failed to find session: %w", err)
	}

	return session, nil
}

func (s *SessionService) GetUserSessions(ctx context.Context, userID int64) ([]*models.Session, error) {
	sessions, err := s.sessionRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to find user sessions: %w", err)
	}

	return sessions, nil
}

func (s *SessionService) CreateSession(ctx context.Context, userID int64, ipAddress, userAgent string) (*models.Session, error) {
	// Verify user exists
	_, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	session := &models.Session{
		UserID:    userID,
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}

	if err := s.sessionRepo.Create(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	return session, nil
}

func (s *SessionService) UpdateSession(ctx context.Context, sessionID int64, ipAddress, userAgent string) (*models.Session, error) {
	session, err := s.sessionRepo.FindByID(ctx, sessionID)
	if err != nil {
		if errors.Is(err, repository.ErrSessionNotFound) {
			return nil, ErrSessionNotFound
		}
		return nil, fmt.Errorf("failed to find session: %w", err)
	}

	session.IPAddress = ipAddress
	session.UserAgent = userAgent

	if err := s.sessionRepo.Update(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to update session: %w", err)
	}

	return session, nil
}

func (s *SessionService) DeleteSession(ctx context.Context, id int64) error {
	if err := s.sessionRepo.Delete(ctx, id); err != nil {
		if errors.Is(err, repository.ErrSessionNotFound) {
			return ErrSessionNotFound
		}
		return nil, fmt.Errorf("failed to delete session: %w", err)
	}

	return nil
}

func (s *SessionService) DeleteUserSessions(ctx context.Context, userID int64) error {
	if err := s.sessionRepo.DeleteByUserID(ctx, userID); err != nil {
		return fmt.Errorf("failed to delete user sessions: %w", err)
	}

	return nil
}

func (s *SessionService) CleanupExpiredSessions(ctx context.Context) error {
	// Delete sessions older than 30 days
	expiryDuration := 30 * 24 * time.Hour
	
	if err := s.sessionRepo.DeleteExpired(ctx, expiryDuration); err != nil {
		return fmt.Errorf("failed to cleanup expired sessions: %w", err)
	}

	return nil
}

func (s *SessionService) CountUserSessions(ctx context.Context, userID int64) (int64, error) {
	count, err := s.sessionRepo.CountByUserID(ctx, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to count user sessions: %w", err)
	}

	return count, nil
}