import { sql } from '../db';

export interface User {
  id: string;
  email_address: string;
  password_digest: string;
  role: 'user' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  passwordDigest: string;
  role?: 'user' | 'admin';
}

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const [user] = await sql<User[]>`
      SELECT * FROM users WHERE id = ${id}
    `;
    return user || null;
  }
  
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const [user] = await sql<User[]>`
      SELECT * FROM users WHERE email_address = ${normalizedEmail}
    `;
    return user || null;
  }
  
  async create(input: CreateUserInput): Promise<User> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const [user] = await sql<User[]>`
      INSERT INTO users (email_address, password_digest, role, created_at, updated_at)
      VALUES (${normalizedEmail}, ${input.passwordDigest}, ${input.role || 'user'}, NOW(), NOW())
      RETURNING *
    `;
    return user;
  }
  
  async listUsers(limit = 100, offset = 0): Promise<User[]> {
    return sql<User[]>`
      SELECT * FROM users
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }
  
  async toggleRole(userId: string): Promise<User | null> {
    const user = await this.findById(userId);
    if (!user) return null;
    
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const [updated] = await sql<User[]>`
      UPDATE users
      SET role = ${newRole}, updated_at = NOW()
      WHERE id = ${userId}
      RETURNING *
    `;
    return updated;
  }
  
  async count(): Promise<number> {
    const [result] = await sql<[{ count: string }]>`
      SELECT COUNT(*) FROM users
    `;
    return parseInt(result.count, 10);
  }
}

export const userRepository = new UserRepository();