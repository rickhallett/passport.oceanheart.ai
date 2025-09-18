import { sessionRepository } from '../repositories/sessions';
import type { Session } from '../repositories/sessions';

export interface SessionWithUserInfo extends Session {
  userEmail?: string;
}

export class SessionService {
  async findById(id: string): Promise<Session | null> {
    return sessionRepository.findById(id);
  }
  
  async findByUser(userId: string): Promise<Session[]> {
    return sessionRepository.findByUser(userId);
  }
  
  async delete(id: string): Promise<boolean> {
    return sessionRepository.delete(id);
  }
  
  async deleteAllForUser(userId: string): Promise<number> {
    return sessionRepository.deleteAllForUser(userId);
  }
  
  async cleanupExpiredSessions(): Promise<number> {
    // Clean up sessions older than 1 week
    return sessionRepository.cleanupExpired(24 * 7);
  }
  
  async getActiveSessions(userId: string): Promise<SessionWithUserInfo[]> {
    const sessions = await sessionRepository.findByUser(userId);
    
    // Format sessions with additional info
    return sessions.map(session => ({
      ...session,
      // Additional info could be added here
    }));
  }
  
  async getSessionStats(): Promise<{
    totalSessions: number;
    uniqueUsers: number;
  }> {
    // This would need a custom query in production
    // For now, return placeholder values
    return {
      totalSessions: 0,
      uniqueUsers: 0
    };
  }
  
  async isValidSession(sessionId: string): Promise<boolean> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) return false;
    
    // Check if session is not expired (1 week)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return session.created_at > weekAgo;
  }
}

export const sessionService = new SessionService();