import { sql } from '../db';
import { randomUUID } from 'crypto';

export interface Session {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSessionInput {
  userId: string;
  ipAddress: string;
  userAgent: string;
}

export class SessionRepository {
  async findById(id: string): Promise<Session | null> {
    const [session] = await sql<Session[]>`
      SELECT * FROM sessions WHERE id = ${id}
    `;
    return session || null;
  }
  
  async findByUser(userId: string): Promise<Session[]> {
    return sql<Session[]>`
      SELECT * FROM sessions 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
  }
  
  async create(input: CreateSessionInput): Promise<Session> {
    const id = randomUUID();
    const [session] = await sql<Session[]>`
      INSERT INTO sessions (id, user_id, ip_address, user_agent, created_at, updated_at)
      VALUES (${id}, ${input.userId}, ${input.ipAddress}, ${input.userAgent}, NOW(), NOW())
      RETURNING *
    `;
    return session;
  }
  
  async delete(id: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM sessions WHERE id = ${id}
    `;
    return result.count > 0;
  }
  
  async deleteAllForUser(userId: string): Promise<number> {
    const result = await sql`
      DELETE FROM sessions WHERE user_id = ${userId}
    `;
    return result.count;
  }
  
  async countByUser(userId: string): Promise<number> {
    const [result] = await sql<[{ count: string }]>`
      SELECT COUNT(*) FROM sessions WHERE user_id = ${userId}
    `;
    return parseInt(result.count, 10);
  }
  
  async cleanupExpired(expirationHours = 24 * 7): Promise<number> {
    const result = await sql`
      DELETE FROM sessions 
      WHERE created_at < NOW() - INTERVAL '${expirationHours} hours'
    `;
    return result.count;
  }
}

export const sessionRepository = new SessionRepository();