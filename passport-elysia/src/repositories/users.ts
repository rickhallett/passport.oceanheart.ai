import { sql } from '../db';

export interface User {
  id: number;
  email_address: string;
  password_digest: string;
  role: 'user' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email_address: string;
  password_digest: string;
  role?: 'user' | 'admin';
}

export const UserRepository = {
  /**
   * Find a user by email address
   */
  async findByEmail(email: string): Promise<User | null> {
    const rows = await sql<User[]>`
      SELECT * FROM users 
      WHERE email_address = ${email.toLowerCase()}
    `;
    return rows[0] || null;
  },

  /**
   * Find a user by ID
   */
  async findById(id: number): Promise<User | null> {
    const rows = await sql<User[]>`
      SELECT * FROM users 
      WHERE id = ${id}
    `;
    return rows[0] || null;
  },

  /**
   * Create a new user
   */
  async create(data: CreateUserData): Promise<User> {
    const rows = await sql<User[]>`
      INSERT INTO users (email_address, password_digest, role)
      VALUES (
        ${data.email_address.toLowerCase()}, 
        ${data.password_digest},
        ${data.role || 'user'}
      )
      RETURNING *
    `;
    return rows[0];
  },

  /**
   * Update user role
   */
  async updateRole(id: number, role: 'user' | 'admin'): Promise<User | null> {
    const rows = await sql<User[]>`
      UPDATE users 
      SET role = ${role}
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0] || null;
  },

  /**
   * Update user password
   */
  async updatePassword(id: number, passwordDigest: string): Promise<User | null> {
    const rows = await sql<User[]>`
      UPDATE users 
      SET password_digest = ${passwordDigest}
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0] || null;
  },

  /**
   * List all users (for admin)
   */
  async listAll(limit: number = 100, offset: number = 0): Promise<User[]> {
    return await sql<User[]>`
      SELECT * FROM users 
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
  },

  /**
   * Count total users
   */
  async count(): Promise<number> {
    const rows = await sql<[{ count: string }]>`
      SELECT COUNT(*) as count FROM users
    `;
    return parseInt(rows[0].count);
  },

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const rows = await sql<[{ exists: boolean }]>`
      SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE email_address = ${email.toLowerCase()}
      ) as exists
    `;
    return rows[0].exists;
  },

  /**
   * Delete user (for testing)
   */
  async delete(id: number): Promise<boolean> {
    const result = await sql`
      DELETE FROM users 
      WHERE id = ${id}
    `;
    return result.count > 0;
  },
};