import { userRepository } from '../repositories/users';
import { sessionRepository } from '../repositories/sessions';
import type { User } from '../repositories/users';
import type { Session } from '../repositories/sessions';
import { verifyPassword } from '../utils/hash';
import { generateJWT, verifyJWT, refreshJWT } from '../utils/jwt';

export interface AuthenticateResult {
  user: User;
  session: Session;
  jwt: string;
}

export class AuthService {
  async authenticate(email: string, password: string): Promise<User | null> {
    const user = await userRepository.findByEmail(email);
    if (!user) return null;
    
    const isValid = await verifyPassword(password, user.password_digest);
    if (!isValid) return null;
    
    return user;
  }
  
  async startSession(
    userId: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<AuthenticateResult | null> {
    const user = await userRepository.findById(userId);
    if (!user) return null;
    
    const session = await sessionRepository.create({
      userId,
      ipAddress,
      userAgent
    });
    
    const jwt = generateJWT({
      id: userId,
      email: user.email_address
    });
    
    return { user, session, jwt };
  }
  
  async terminateSession(sessionId: string): Promise<boolean> {
    return sessionRepository.delete(sessionId);
  }
  
  async terminateAllSessions(userId: string): Promise<number> {
    return sessionRepository.deleteAllForUser(userId);
  }
  
  generateJwt(user: User): string {
    return generateJWT({
      id: user.id.toString(),
      email: user.email_address
    });
  }
  
  verifyJwt(token: string): ReturnType<typeof verifyJWT> {
    return verifyJWT(token);
  }
  
  refreshJwt(token: string): string | null {
    return refreshJWT(token);
  }
  
  async validateSession(sessionId: string): Promise<User | null> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) return null;
    
    return userRepository.findById(session.user_id.toString());
  }
  
  async signInWithCredentials(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<AuthenticateResult | null> {
    const user = await this.authenticate(email, password);
    if (!user) return null;
    
    return this.startSession(user.id.toString(), ipAddress, userAgent);
  }
}

export const authService = new AuthService();