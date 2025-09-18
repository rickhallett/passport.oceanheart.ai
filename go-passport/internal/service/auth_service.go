package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/oceanheart/go-passport/internal/auth"
	"github.com/oceanheart/go-passport/internal/models"
	"github.com/oceanheart/go-passport/internal/repository"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserNotFound       = errors.New("user not found")
	ErrSessionNotFound    = errors.New("session not found")
)

type AuthService struct {
	userRepo        *repository.UserRepository
	sessionRepo     *repository.SessionRepository
	passwordService *auth.PasswordService
	jwtService      *auth.JWTService
}

func NewAuthService(
	userRepo *repository.UserRepository,
	sessionRepo *repository.SessionRepository,
	passwordService *auth.PasswordService,
	jwtService *auth.JWTService,
) *AuthService {
	return &AuthService{
		userRepo:        userRepo,
		sessionRepo:     sessionRepo,
		passwordService: passwordService,
		jwtService:      jwtService,
	}
}

func (s *AuthService) SignUp(ctx context.Context, params models.UserCreateParams) (*models.User, *models.Session, string, error) {
	// Validate password strength
	if err := s.passwordService.ValidatePasswordStrength(params.Password); err != nil {
		return nil, nil, "", err
	}

	// Hash password
	hashedPassword, err := s.passwordService.HashPassword(params.Password)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := &models.User{
		EmailAddress:   params.EmailAddress,
		PasswordDigest: hashedPassword,
		Role:          models.RoleUser,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		if errors.Is(err, repository.ErrUserAlreadyExists) {
			return nil, nil, "", errors.New("email already taken")
		}
		return nil, nil, "", fmt.Errorf("failed to create user: %w", err)
	}

	// Create session
	session := &models.Session{
		UserID: user.ID,
	}

	if err := s.sessionRepo.Create(ctx, session); err != nil {
		return nil, nil, "", fmt.Errorf("failed to create session: %w", err)
	}

	// Generate JWT token
	token, err := s.jwtService.GenerateToken(user)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to generate token: %w", err)
	}

	return user, session, token, nil
}

func (s *AuthService) SignIn(ctx context.Context, email, password, ipAddress, userAgent string) (*models.User, *models.Session, string, error) {
	// Find user by email
	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, nil, "", ErrInvalidCredentials
		}
		return nil, nil, "", fmt.Errorf("failed to find user: %w", err)
	}

	// Verify password
	if err := s.passwordService.ComparePassword(user.PasswordDigest, password); err != nil {
		return nil, nil, "", ErrInvalidCredentials
	}

	// Create session
	session := &models.Session{
		UserID:    user.ID,
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}

	if err := s.sessionRepo.Create(ctx, session); err != nil {
		return nil, nil, "", fmt.Errorf("failed to create session: %w", err)
	}

	// Generate JWT token
	token, err := s.jwtService.GenerateToken(user)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to generate token: %w", err)
	}

	return user, session, token, nil
}

func (s *AuthService) SignOut(ctx context.Context, sessionID int64) error {
	if err := s.sessionRepo.Delete(ctx, sessionID); err != nil {
		if errors.Is(err, repository.ErrSessionNotFound) {
			return ErrSessionNotFound
		}
		return fmt.Errorf("failed to delete session: %w", err)
	}

	return nil
}

func (s *AuthService) SignOutAllSessions(ctx context.Context, userID int64) error {
	if err := s.sessionRepo.DeleteByUserID(ctx, userID); err != nil {
		return fmt.Errorf("failed to delete all sessions: %w", err)
	}

	return nil
}

func (s *AuthService) ValidateToken(tokenString string) (*auth.Claims, error) {
	claims, err := s.jwtService.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	return claims, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, claims *auth.Claims) (string, error) {
	// Verify user still exists
	_, err := s.userRepo.FindByID(ctx, claims.UserID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return "", ErrUserNotFound
		}
		return "", fmt.Errorf("failed to find user: %w", err)
	}

	// Generate new token
	token, err := s.jwtService.RefreshToken(claims)
	if err != nil {
		return "", fmt.Errorf("failed to refresh token: %w", err)
	}

	return token, nil
}

func (s *AuthService) GetUserFromToken(ctx context.Context, tokenString string) (*models.User, error) {
	// Validate token
	claims, err := s.jwtService.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	// Get user
	user, err := s.userRepo.FindByID(ctx, claims.UserID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	return user, nil
}

func (s *AuthService) GetUserFromSession(ctx context.Context, sessionID int64) (*models.User, error) {
	// Get session
	session, err := s.sessionRepo.FindByID(ctx, sessionID)
	if err != nil {
		if errors.Is(err, repository.ErrSessionNotFound) {
			return nil, ErrSessionNotFound
		}
		return nil, fmt.Errorf("failed to find session: %w", err)
	}

	// Get user
	user, err := s.userRepo.FindByID(ctx, session.UserID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	return user, nil
}

func (s *AuthService) UpdatePassword(ctx context.Context, userID int64, oldPassword, newPassword string) error {
	// Get user
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return ErrUserNotFound
		}
		return fmt.Errorf("failed to find user: %w", err)
	}

	// Verify old password
	if err := s.passwordService.ComparePassword(user.PasswordDigest, oldPassword); err != nil {
		return ErrInvalidCredentials
	}

	// Validate new password
	if err := s.passwordService.ValidatePasswordStrength(newPassword); err != nil {
		return err
	}

	// Hash new password
	hashedPassword, err := s.passwordService.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update user
	user.PasswordDigest = hashedPassword
	if err := s.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	// Invalidate all sessions
	if err := s.sessionRepo.DeleteByUserID(ctx, userID); err != nil {
		return fmt.Errorf("failed to delete sessions: %w", err)
	}

	return nil
}