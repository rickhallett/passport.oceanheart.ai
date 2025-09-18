import { UserRepository, type User } from '../repositories/users';
import { SessionRepository, type Session } from '../repositories/sessions';
import { hashPassword, verifyPassword } from '../utils/hash';
import { generateJwt } from '../utils/jwt';
import { z } from 'zod';

// Validation schemas
export const SignUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const SignInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export interface AuthResult {
  user: User;
  session?: Session;
  token?: string;
}

export const AuthService = {
  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string): Promise<AuthResult> {
    // Validate input
    const validated = SignUpSchema.parse({ email, password });
    
    // Check if email already exists
    const existingUser = await UserRepository.findByEmail(validated.email);
    if (existingUser) {
      throw new Error('Email address is already registered');
    }
    
    // Hash password
    const passwordDigest = await hashPassword(validated.password);
    
    // Create user
    const user = await UserRepository.create({
      email_address: validated.email,
      password_digest: passwordDigest,
    });
    
    // Generate JWT token
    const token = await generateJwt(user);
    
    return { user, token };
  },

  /**
   * Sign in a user (create session and JWT)
   */
  async signIn(
    email: string, 
    password: string, 
    ip?: string, 
    userAgent?: string
  ): Promise<AuthResult> {
    // Validate input
    const validated = SignInSchema.parse({ email, password });
    
    // Find user
    const user = await UserRepository.findByEmail(validated.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // Verify password
    const passwordValid = await verifyPassword(validated.password, user.password_digest);
    if (!passwordValid) {
      throw new Error('Invalid email or password');
    }
    
    // Create session
    const session = await SessionRepository.create({
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
    });
    
    // Generate JWT token
    const token = await generateJwt(user);
    
    return { user, session, token };
  },

  /**
   * Sign out a user (delete session)
   */
  async signOut(sessionId: string): Promise<boolean> {
    return await SessionRepository.delete(sessionId);
  },

  /**
   * Sign out all sessions for a user
   */
  async signOutAll(userId: number): Promise<number> {
    return await SessionRepository.deleteByUserId(userId);
  },

  /**
   * Validate a session
   */
  async validateSession(sessionId: string): Promise<{ user: User; session: Session } | null> {
    const sessionWithUser = await SessionRepository.findWithUser(sessionId);
    
    if (!sessionWithUser) {
      return null;
    }
    
    const user = await UserRepository.findById(sessionWithUser.user_id);
    if (!user) {
      return null;
    }
    
    return { user, session: sessionWithUser };
  },

  /**
   * Get user from JWT token
   */
  async getUserFromToken(token: string): Promise<User | null> {
    const { verifyJwt } = await import('../utils/jwt');
    const payload = await verifyJwt(token);
    
    if (!payload) {
      return null;
    }
    
    return await UserRepository.findById(payload.userId);
  },

  /**
   * Change user password
   */
  async changePassword(
    userId: number, 
    currentPassword: string, 
    newPassword: string
  ): Promise<boolean> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify current password
    const passwordValid = await verifyPassword(currentPassword, user.password_digest);
    if (!passwordValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Hash new password
    const newPasswordDigest = await hashPassword(newPassword);
    
    // Update password
    const updated = await UserRepository.updatePassword(userId, newPasswordDigest);
    
    // Sign out all sessions for security
    if (updated) {
      await SessionRepository.deleteByUserId(userId);
    }
    
    return updated !== null;
  },

  /**
   * Toggle user role (admin only)
   */
  async toggleUserRole(userId: number): Promise<User | null> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      return null;
    }
    
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    return await UserRepository.updateRole(userId, newRole);
  },

  /**
   * List all users (admin only)
   */
  async listUsers(limit?: number, offset?: number): Promise<User[]> {
    return await UserRepository.listAll(limit, offset);
  },

  /**
   * Get user sessions
   */
  async getUserSessions(userId: number): Promise<Session[]> {
    return await SessionRepository.findByUserId(userId);
  },

  /**
   * Clean up old sessions
   */
  async cleanupOldSessions(days: number = 30): Promise<number> {
    return await SessionRepository.deleteOlderThan(days);
  },
};