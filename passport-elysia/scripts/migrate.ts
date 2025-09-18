#!/usr/bin/env bun
import { sql } from '../src/db';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function createMigrationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function getExecutedMigrations(): Promise<Set<string>> {
  const rows = await sql`SELECT version FROM schema_migrations`;
  return new Set(rows.map(row => row.version));
}

async function runMigration(filePath: string, version: string) {
  const migrationSql = await Bun.file(filePath).text();
  
  // Use advisory lock to prevent concurrent migrations
  await sql`SELECT pg_advisory_lock(12345)`;
  
  try {
    // Begin transaction
    await sql.begin(async sql => {
      // Execute migration
      await sql.unsafe(migrationSql);
      
      // Record migration
      await sql`
        INSERT INTO schema_migrations (version)
        VALUES (${version})
      `;
    });
    
    console.log(`✅ Migration ${version} executed successfully`);
  } catch (error) {
    console.error(`❌ Migration ${version} failed:`, error);
    throw error;
  } finally {
    // Release advisory lock
    await sql`SELECT pg_advisory_unlock(12345)`;
  }
}

async function migrate() {
  console.log('🔄 Running database migrations...\n');
  
  try {
    // Create migrations table if not exists
    await createMigrationsTable();
    
    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations();
    
    // Read all migration files
    const migrationsDir = join(import.meta.dir, '../db/migrations');
    const files = await readdir(migrationsDir);
    const migrationFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ensure migrations run in order
    
    let migrationsRun = 0;
    
    for (const file of migrationFiles) {
      const version = file.replace('.sql', '');
      
      if (executedMigrations.has(version)) {
        console.log(`⏭️  Skipping ${version} (already executed)`);
        continue;
      }
      
      const filePath = join(migrationsDir, file);
      await runMigration(filePath, version);
      migrationsRun++;
    }
    
    if (migrationsRun === 0) {
      console.log('✨ All migrations are up to date');
    } else {
      console.log(`\n✨ Successfully ran ${migrationsRun} migration(s)`);
    }
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await sql.end();
    process.exit(1);
  }
}

// Run migrations
migrate();