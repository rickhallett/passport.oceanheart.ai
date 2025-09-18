package auth

import (
	"errors"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidPassword = errors.New("invalid password")
	ErrPasswordTooShort = errors.New("password must be at least 6 characters")
)

type PasswordService struct {
	cost int
}

func NewPasswordService() *PasswordService {
	return &PasswordService{
		cost: bcrypt.DefaultCost,
	}
}

func (s *PasswordService) HashPassword(password string) (string, error) {
	if len(password) < 6 {
		return "", ErrPasswordTooShort
	}
	
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), s.cost)
	if err != nil {
		return "", err
	}
	
	return string(bytes), nil
}

func (s *PasswordService) ComparePassword(hashedPassword, password string) error {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	if err != nil {
		if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
			return ErrInvalidPassword
		}
		return err
	}
	
	return nil
}

func (s *PasswordService) ValidatePasswordStrength(password string) error {
	if len(password) < 6 {
		return ErrPasswordTooShort
	}
	
	// Add more validation rules if needed
	// - At least one uppercase letter
	// - At least one number
	// - At least one special character
	// For now, matching Rails simple validation
	
	return nil
}