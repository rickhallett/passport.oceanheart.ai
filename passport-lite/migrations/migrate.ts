#!/usr/bin/env bun
import { Database } from "bun:sqlite";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

class MigrationRunner {
  private db: Database;
  
  constructor(databasePath: string) {
    this.db = new Database(databasePath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.initMigrationsTable();
  }
  
  private initMigrationsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  
  async run() {
    const migrationsDir = import.meta.dir;
    const files = await readdir(migrationsDir);
    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    const executed = this.db
      .prepare("SELECT filename FROM migrations")
      .all()
      .map((row: any) => row.filename);
    
    const pending = sqlFiles.filter(f => !executed.includes(f));
    
    if (pending.length === 0) {
      console.log("✓ All migrations are up to date");
      return;
    }
    
    console.log(`Found ${pending.length} pending migration(s)`);
    
    for (const file of pending) {
      console.log(`Running migration: ${file}`);
      
      try {
        const sql = await Bun.file(join(migrationsDir, file)).text();
        
        this.db.transaction(() => {
          // Execute the migration
          this.db.exec(sql);
          
          // Record the migration
          this.db
            .prepare("INSERT INTO migrations (filename) VALUES (?)")
            .run(file);
        })();
        
        console.log(`✓ ${file} executed successfully`);
      } catch (error) {
        console.error(`✗ Failed to run ${file}:`, error);
        process.exit(1);
      }
    }
    
    console.log("✓ All migrations completed successfully");
  }
  
  async rollback(steps: number = 1) {
    const executed = this.db
      .prepare("SELECT filename FROM migrations ORDER BY id DESC LIMIT ?")
      .all(steps)
      .map((row: any) => row.filename);
    
    if (executed.length === 0) {
      console.log("No migrations to rollback");
      return;
    }
    
    console.log(`Rolling back ${executed.length} migration(s)`);
    
    for (const filename of executed) {
      console.log(`Rolling back: ${filename}`);
      
      // Note: This is a simplified rollback. In production, you'd want
      // to have corresponding down migrations
      this.db
        .prepare("DELETE FROM migrations WHERE filename = ?")
        .run(filename);
      
      console.log(`✓ Rolled back ${filename}`);
    }
  }
  
  status() {
    const executed = this.db
      .prepare("SELECT filename, executed_at FROM migrations ORDER BY id")
      .all();
    
    if (executed.length === 0) {
      console.log("No migrations have been executed");
      return;
    }
    
    console.log("Migration Status:");
    console.log("-".repeat(60));
    
    for (const migration of executed) {
      console.log(`✓ ${migration.filename} (${migration.executed_at})`);
    }
  }
  
  close() {
    this.db.close();
  }
}

// CLI handling
async function main() {
  const dbPath = process.env.DATABASE_PATH || "./passport.db";
  const runner = new MigrationRunner(dbPath);
  
  const command = process.argv[2] || "run";
  
  try {
    switch (command) {
      case "run":
        await runner.run();
        break;
      case "rollback":
        const steps = parseInt(process.argv[3] || "1");
        await runner.rollback(steps);
        break;
      case "status":
        runner.status();
        break;
      default:
        console.log("Usage: bun migrate.ts [run|rollback|status] [steps]");
        process.exit(1);
    }
  } finally {
    runner.close();
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

// Export function for programmatic use
export async function runMigrations(dbPath?: string) {
  const databasePath = dbPath || process.env.DATABASE_PATH || "./passport.db";
  const runner = new MigrationRunner(databasePath);
  try {
    await runner.run();
  } finally {
    runner.close();
  }
}

export { MigrationRunner };