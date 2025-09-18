package config

import (
	"context"
	"database/sql"
	"fmt"
	"io/ioutil"
	"path/filepath"
	"sort"
	"strings"
)

type Migrator struct {
	db *Database
}

func NewMigrator(db *Database) *Migrator {
	return &Migrator{db: db}
}

func (m *Migrator) Run(ctx context.Context, migrationsDir string) error {
	// Create migrations table if not exists
	if err := m.createMigrationsTable(ctx); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// Get list of migration files
	files, err := ioutil.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	// Sort migration files by name
	var migrationFiles []string
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".sql") {
			migrationFiles = append(migrationFiles, file.Name())
		}
	}
	sort.Strings(migrationFiles)

	// Run each migration
	for _, file := range migrationFiles {
		if err := m.runMigration(ctx, filepath.Join(migrationsDir, file)); err != nil {
			return fmt.Errorf("failed to run migration %s: %w", file, err)
		}
	}

	return nil
}

func (m *Migrator) createMigrationsTable(ctx context.Context) error {
	query := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`
	
	_, err := m.db.ExecContext(ctx, query)
	return err
}

func (m *Migrator) runMigration(ctx context.Context, filePath string) error {
	// Extract version from filename
	version := filepath.Base(filePath)
	
	// Check if migration has already been applied
	var count int
	err := m.db.QueryRowContext(ctx, 
		"SELECT COUNT(*) FROM schema_migrations WHERE version = $1", 
		version,
	).Scan(&count)
	
	if err != nil {
		return fmt.Errorf("failed to check migration status: %w", err)
	}
	
	if count > 0 {
		// Migration already applied
		return nil
	}
	
	// Read migration file
	content, err := ioutil.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read migration file: %w", err)
	}
	
	// Execute migration in a transaction
	return m.db.WithTransaction(ctx, func(tx *sql.Tx) error {
		// Execute migration SQL
		if _, err := tx.ExecContext(ctx, string(content)); err != nil {
			return fmt.Errorf("failed to execute migration: %w", err)
		}
		
		// Record migration as applied
		if _, err := tx.ExecContext(ctx,
			"INSERT INTO schema_migrations (version) VALUES ($1)",
			version,
		); err != nil {
			return fmt.Errorf("failed to record migration: %w", err)
		}
		
		fmt.Printf("Applied migration: %s\n", version)
		return nil
	})
}