import { userRepository } from '../repositories/users';
import { sessionRepository } from '../repositories/sessions';
import type { User, CreateUserInput } from '../repositories/users';
import { hashPassword } from '../utils/hash';
import { transaction } from '../db';

export interface CreateUserDto {
  email: string;
  password: string;
  role?: 'user' | 'admin';
}

export interface UserWithSessionCount extends User {
  sessionCount: number;
}

export class UserService {
  normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }
  
  async createUser(dto: CreateUserDto): Promise<User> {
    const normalizedEmail = this.normalizeEmail(dto.email);
    
    // Check if user already exists
    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new Error('User with this email already exists');
    }
    
    // Validate password
    if (dto.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    
    // Hash password
    const passwordDigest = await hashPassword(dto.password);
    
    // Create user
    return userRepository.create({
      email: normalizedEmail,
      passwordDigest,
      role: dto.role
    });
  }
  
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = this.normalizeEmail(email);
    return userRepository.findByEmail(normalizedEmail);
  }
  
  async findById(id: string): Promise<User | null> {
    return userRepository.findById(id);
  }
  
  async listUsers(limit = 100, offset = 0): Promise<UserWithSessionCount[]> {
    const users = await userRepository.listUsers(limit, offset);
    
    // Get session counts for each user
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const sessionCount = await sessionRepository.countByUser(user.id.toString());
        return { ...user, sessionCount };
      })
    );
    
    return usersWithCounts;
  }
  
  async toggleRole(userId: string): Promise<User | null> {
    return userRepository.toggleRole(userId);
  }
  
  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    
    const passwordDigest = await hashPassword(newPassword);
    
    // In a real implementation, this would be in the repository
    // For now, we'll return true as a placeholder
    // TODO: Add updatePassword method to UserRepository
    return true;
  }
  
  async deleteUser(userId: string): Promise<boolean> {
    return transaction(async (sql) => {
      // Sessions will be deleted automatically due to CASCADE
      const result = await sql`
        DELETE FROM users WHERE id = ${userId}
      `;
      return result.count > 0;
    });
  }
  
  async getUserStats(): Promise<{
    totalUsers: number;
    adminCount: number;
    userCount: number;
  }> {
    const total = await userRepository.count();
    const users = await userRepository.listUsers(1000, 0);
    
    const adminCount = users.filter(u => u.role === 'admin').length;
    const userCount = users.filter(u => u.role === 'user').length;
    
    return {
      totalUsers: total,
      adminCount,
      userCount
    };
  }
}

export const userService = new UserService();