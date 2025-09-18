import { sql } from '../db';

export interface Session {
  id: string;  // UUID
  user_id: number;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSessionData {
  user_id: number;
  ip_address?: string;
  user_agent?: string;
}

export const SessionRepository = {
  /**
   * Find a session by ID
   */
  async findById(id: string): Promise<Session | null> {
    const rows = await sql<Session[]>`
      SELECT * FROM sessions 
      WHERE id = ${id}::uuid
    `;
    return rows[0] || null;
  },

  /**
   * Find all sessions for a user
   */
  async findByUserId(userId: number): Promise<Session[]> {
    return await sql<Session[]>`
      SELECT * FROM sessions 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
  },

  /**
   * Create a new session
   */
  async create(data: CreateSessionData): Promise<Session> {
    const rows = await sql<Session[]>`
      INSERT INTO sessions (user_id, ip_address, user_agent)
      VALUES (
        ${data.user_id},
        ${data.ip_address || null}::inet,
        ${data.user_agent || null}
      )
      RETURNING *
    `;
    return rows[0];
  },

  /**
   * Delete a session by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM sessions 
      WHERE id = ${id}::uuid
    `;
    return result.count > 0;
  },

  /**
   * Delete all sessions for a user
   */
  async deleteByUserId(userId: number): Promise<number> {
    const result = await sql`
      DELETE FROM sessions 
      WHERE user_id = ${userId}
    `;
    return result.count;
  },

  /**
   * Delete old sessions (cleanup)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const result = await sql`
      DELETE FROM sessions 
      WHERE created_at < NOW() - INTERVAL '${days} days'
    `;
    return result.count;
  },

  /**
   * Get session with user data (joined)
   */
  async findWithUser(id: string): Promise<(Session & { user: { id: number; email_address: string; role: string } }) | null> {
    const rows = await sql<(Session & { user: { id: number; email_address: string; role: string } })[]>`
      SELECT 
        s.*,
        row_to_json((SELECT u FROM (SELECT id, email_address, role) u)) as user
      FROM sessions s
      JOIN users ON users.id = s.user_id
      WHERE s.id = ${id}::uuid
    `;
    return rows[0] || null;
  },

  /**
   * Count active sessions for a user
   */
  async countByUserId(userId: number): Promise<number> {
    const rows = await sql<[{ count: string }]>`
      SELECT COUNT(*) as count 
      FROM sessions 
      WHERE user_id = ${userId}
    `;
    return parseInt(rows[0].count);
  },

  /**
   * List all sessions with user info (for admin)
   */
  async listAllWithUsers(limit: number = 100, offset: number = 0): Promise<any[]> {
    return await sql`
      SELECT 
        s.*,
        u.email_address,
        u.role
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
  },
};