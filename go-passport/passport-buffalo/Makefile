.PHONY: help setup run test build clean docker-up docker-down migrate

# Default target
help:
	@echo "Available commands:"
	@echo "  make setup      - Install dependencies and setup database"
	@echo "  make run        - Run the application in development mode"
	@echo "  make test       - Run tests"
	@echo "  make build      - Build the production binary"
	@echo "  make clean      - Clean build artifacts"
	@echo "  make docker-up  - Start Docker services"
	@echo "  make docker-down - Stop Docker services"
	@echo "  make migrate    - Run database migrations"

# Setup development environment
setup:
	@echo "Installing Go dependencies..."
	go mod download
	@echo "Setting up database..."
	createdb passport_buffalo_development || true
	@echo "Running migrations..."
	buffalo pop migrate
	@echo "Setup complete!"

# Run in development mode
run:
	go run main.go

# Run tests
test:
	go test ./...

# Build production binary
build:
	CGO_ENABLED=0 go build -o bin/passport -ldflags="-s -w" .

# Clean build artifacts
clean:
	rm -rf bin/
	rm -rf tmp/

# Docker commands
docker-up:
	docker-compose up -d
	@echo "Waiting for database to be ready..."
	@sleep 5
	docker-compose exec app buffalo pop migrate

docker-down:
	docker-compose down

# Database migrations
migrate:
	buffalo pop migrate

migrate-down:
	buffalo pop migrate down

migrate-reset:
	buffalo pop reset

# Development database commands
db-create:
	createdb passport_buffalo_development

db-drop:
	dropdb passport_buffalo_development

db-reset: db-drop db-create migrate
	@echo "Database reset complete!"

# Generate new migration
migration:
	@read -p "Enter migration name: " name; \
	buffalo pop generate fizz $$name