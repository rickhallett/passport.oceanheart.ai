package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/oceanheart/go-passport/internal/models"
	"github.com/oceanheart/go-passport/internal/repository"
)

type UserService struct {
	userRepo *repository.UserRepository
}

func NewUserService(userRepo *repository.UserRepository) *UserService {
	return &UserService{
		userRepo: userRepo,
	}
}

func (s *UserService) GetUserByID(ctx context.Context, id int64) (*models.User, error) {
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	return user, nil
}

func (s *UserService) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	return user, nil
}

func (s *UserService) ListUsers(ctx context.Context, page, perPage int) ([]*models.User, int64, error) {
	offset := (page - 1) * perPage
	
	users, err := s.userRepo.List(ctx, offset, perPage)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list users: %w", err)
	}

	count, err := s.userRepo.Count(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	return users, count, nil
}

func (s *UserService) SearchUsers(ctx context.Context, query string, page, perPage int) ([]*models.User, error) {
	offset := (page - 1) * perPage
	
	users, err := s.userRepo.Search(ctx, query, offset, perPage)
	if err != nil {
		return nil, fmt.Errorf("failed to search users: %w", err)
	}

	return users, nil
}

func (s *UserService) UpdateUser(ctx context.Context, id int64, params models.UserUpdateParams) (*models.User, error) {
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	// Update fields if provided
	if params.EmailAddress != nil {
		user.EmailAddress = *params.EmailAddress
	}

	if params.Role != nil {
		user.Role = *params.Role
	}

	// Note: Password updates should be handled by AuthService.UpdatePassword

	if err := s.userRepo.Update(ctx, user); err != nil {
		if errors.Is(err, repository.ErrUserAlreadyExists) {
			return nil, errors.New("email already taken")
		}
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return user, nil
}

func (s *UserService) ToggleUserRole(ctx context.Context, id int64) (*models.User, error) {
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	// Toggle role
	newRole := models.RoleUser
	if user.Role == models.RoleUser {
		newRole = models.RoleAdmin
	}

	if err := s.userRepo.UpdateRole(ctx, id, newRole); err != nil {
		return nil, fmt.Errorf("failed to update user role: %w", err)
	}

	user.Role = newRole
	return user, nil
}

func (s *UserService) DeleteUser(ctx context.Context, id int64) error {
	if err := s.userRepo.Delete(ctx, id); err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return ErrUserNotFound
		}
		return fmt.Errorf("failed to delete user: %w", err)
	}

	return nil
}

func (s *UserService) IsAdmin(ctx context.Context, userID int64) (bool, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return false, ErrUserNotFound
		}
		return false, fmt.Errorf("failed to find user: %w", err)
	}

	return user.IsAdmin(), nil
}