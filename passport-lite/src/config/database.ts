import { Database } from "bun:sqlite";

export class DatabaseService {
  private db: Database;
  
  constructor() {
    const dbPath = Bun.env.DATABASE_URL || "passport.db";
    this.db = new Database(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec("PRAGMA busy_timeout = 5000");
  }
  
  prepare(query: string) {
    return this.db.prepare(query);
  }
  
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }
  
  close() {
    this.db.close();
  }
  
  get database() {
    return this.db;
  }
}