import { DatabaseService } from "../config/database";
import type { Session, CreateSessionInput } from "../types/models";

export class SessionModel {
  private db: DatabaseService;

  constructor(database: DatabaseService) {
    this.db = database;
  }

  async findById(id: number): Promise<Session | null> {
    const stmt = this.db.prepare("SELECT * FROM sessions WHERE id = ?");
    return stmt.get(id) as Session | null;
  }

  async findByToken(token: string): Promise<Session | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions 
      WHERE token = ? 
      AND expires_at > datetime('now')
    `);
    return stmt.get(token) as Session | null;
  }

  async findByUserId(userId: number): Promise<Session[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `);
    return stmt.all(userId) as Session[];
  }

  async create(input: CreateSessionInput): Promise<Session> {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      input.user_id,
      input.token,
      input.expires_at,
      input.ip_address || null,
      input.user_agent || null
    );
    
    return this.findById(result.lastInsertRowid as number) as Promise<Session>;
  }

  async delete(id: number): Promise<boolean> {
    const stmt = this.db.prepare("DELETE FROM sessions WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async deleteByToken(token: string): Promise<boolean> {
    const stmt = this.db.prepare("DELETE FROM sessions WHERE token = ?");
    const result = stmt.run(token);
    return result.changes > 0;
  }

  async deleteByUserId(userId: number): Promise<number> {
    const stmt = this.db.prepare("DELETE FROM sessions WHERE user_id = ?");
    const result = stmt.run(userId);
    return result.changes;
  }

  async deleteExpired(): Promise<number> {
    const stmt = this.db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')");
    const result = stmt.run();
    return result.changes;
  }

  async isValid(token: string): Promise<boolean> {
    const session = await this.findByToken(token);
    return session !== null;
  }
}