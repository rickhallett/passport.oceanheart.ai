# Go Passport Makefile

.PHONY: help build run test clean deps migrate docker-build docker-run dev

# Default target
help:
	@echo "Available commands:"
	@echo "  build       - Build the application"
	@echo "  run         - Run the application"
	@echo "  dev         - Run in development mode with hot reload"
	@echo "  test        - Run tests"
	@echo "  clean       - Clean build artifacts"
	@echo "  deps        - Download dependencies"
	@echo "  migrate     - Run database migrations"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run  - Run Docker container"

# Build the application
build:
	go build -o bin/passport ./cmd/server

# Run the application
run: build
	./bin/passport

# Development mode with environment variables
dev:
	RUN_MIGRATIONS=true \
	SECRET_KEY_BASE=dev-secret-key-change-in-production \
	DATABASE_URL=postgres://user:password@localhost/passport_dev?sslmode=disable \
	COOKIE_DOMAIN=.lvh.me \
	go run ./cmd/server

# Run tests
test:
	go test -v ./...

# Run tests with coverage
test-coverage:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Clean build artifacts
clean:
	rm -rf bin/
	rm -f coverage.out coverage.html

# Download dependencies
deps:
	go mod download
	go mod tidy

# Run database migrations
migrate:
	RUN_MIGRATIONS=true go run ./cmd/server

# Build Docker image
docker-build:
	docker build -t go-passport:latest .

# Run Docker container
docker-run:
	docker run -p 10000:10000 \
		-e DATABASE_URL=postgres://user:password@host.docker.internal/passport_prod?sslmode=disable \
		-e SECRET_KEY_BASE=production-secret-key \
		-e ENVIRONMENT=production \
		go-passport:latest

# Format code
fmt:
	go fmt ./...

# Lint code
lint:
	golangci-lint run

# Security scan
security:
	gosec ./...

# Install development tools
install-tools:
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest