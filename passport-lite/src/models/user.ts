import { DatabaseService } from "../config/database";
import type { User, CreateUserInput, UpdateUserInput, UserWithoutPassword } from "../types/models";

export class UserModel {
  private db: DatabaseService;

  constructor(database: DatabaseService) {
    this.db = database;
  }

  async findById(id: number): Promise<User | null> {
    const stmt = this.db.prepare("SELECT * FROM users WHERE id = ?");
    return stmt.get(id) as User | null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const stmt = this.db.prepare("SELECT * FROM users WHERE email = ?");
    return stmt.get(email.toLowerCase()) as User | null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const hashedPassword = await Bun.password.hash(input.password);
    const email = input.email.toLowerCase();
    const role = input.role || 'user';
    
    const stmt = this.db.prepare(`
      INSERT INTO users (email, password, role)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(email, hashedPassword, role);
    
    return this.findById(result.lastInsertRowid as number) as Promise<User>;
  }

  async update(id: number, input: UpdateUserInput): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (input.email !== undefined) {
      updates.push("email = ?");
      values.push(input.email.toLowerCase());
    }

    if (input.password !== undefined) {
      updates.push("password = ?");
      const hashedPassword = await Bun.password.hash(input.password);
      values.push(hashedPassword);
    }

    if (input.role !== undefined) {
      updates.push("role = ?");
      values.push(input.role);
    }

    if (updates.length === 0) return user;

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE users 
      SET ${updates.join(", ")}
      WHERE id = ?
    `);
    
    stmt.run(...values);
    
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const stmt = this.db.prepare("DELETE FROM users WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return Bun.password.verify(password, user.password);
  }

  async list(limit: number = 100, offset: number = 0): Promise<User[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM users 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset) as User[];
  }

  async count(): Promise<number> {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM users");
    const result = stmt.get() as { count: number };
    return result.count;
  }

  sanitizeUser(user: User): UserWithoutPassword {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}