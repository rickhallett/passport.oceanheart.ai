import { DatabaseService } from "../config/database";
import { UserModel } from "../models/user";
import { SessionModel } from "../models/session";
import { JWTService } from "./jwt.service";
import { config } from "../config/environment";
import { ERROR_MESSAGES } from "../config/constants";
import type { User, UserWithoutPassword } from "../types/models";
import type { SignInRequest, SignUpRequest } from "../types/requests";

export class AuthService {
  private userModel: UserModel;
  private sessionModel: SessionModel;
  private jwtService: JWTService;

  constructor(database: DatabaseService) {
    this.userModel = new UserModel(database);
    this.sessionModel = new SessionModel(database);
    this.jwtService = new JWTService();
  }

  async signIn(request: SignInRequest): Promise<{ user: UserWithoutPassword; token: string } | null> {
    const user = await this.userModel.findByEmail(request.email);
    if (!user) {
      return null;
    }

    const isValidPassword = await this.userModel.verifyPassword(user, request.password);
    if (!isValidPassword) {
      return null;
    }

    const token = await this.jwtService.sign({
      userId: user.id,
      email: user.email
    });

    // Create session
    const expiresAt = new Date(Date.now() + config.jwtExpiresIn * 1000).toISOString();
    await this.sessionModel.create({
      user_id: user.id,
      token,
      expires_at: expiresAt
    });

    return {
      user: this.userModel.sanitizeUser(user),
      token
    };
  }

  async signUp(request: SignUpRequest): Promise<{ user: UserWithoutPassword; token: string }> {
    // Check if user already exists
    const existingUser = await this.userModel.findByEmail(request.email);
    if (existingUser) {
      throw new Error(ERROR_MESSAGES.USER_EXISTS);
    }

    // Validate password
    if (request.password.length < 8) {
      throw new Error(ERROR_MESSAGES.PASSWORD_TOO_SHORT);
    }

    // Create user
    const user = await this.userModel.create({
      email: request.email,
      password: request.password
    });

    // Generate token
    const token = await this.jwtService.sign({
      userId: user.id,
      email: user.email
    });

    // Create session
    const expiresAt = new Date(Date.now() + config.jwtExpiresIn * 1000).toISOString();
    await this.sessionModel.create({
      user_id: user.id,
      token,
      expires_at: expiresAt
    });

    return {
      user: this.userModel.sanitizeUser(user),
      token
    };
  }

  async signOut(token: string): Promise<boolean> {
    return this.sessionModel.deleteByToken(token);
  }

  async verifyToken(token: string): Promise<UserWithoutPassword | null> {
    const payload = await this.jwtService.verify(token);
    if (!payload) {
      return null;
    }

    // Verify session exists and is valid
    const session = await this.sessionModel.findByToken(token);
    if (!session) {
      return null;
    }

    const user = await this.userModel.findById(payload.userId);
    if (!user) {
      return null;
    }

    return this.userModel.sanitizeUser(user);
  }

  async refreshToken(token: string): Promise<string | null> {
    const newToken = await this.jwtService.refresh(token);
    if (!newToken || newToken === token) {
      return newToken;
    }

    // Get the old session
    const oldSession = await this.sessionModel.findByToken(token);
    if (!oldSession) {
      return null;
    }

    // Delete old session
    await this.sessionModel.deleteByToken(token);

    // Create new session
    const expiresAt = new Date(Date.now() + config.jwtExpiresIn * 1000).toISOString();
    await this.sessionModel.create({
      user_id: oldSession.user_id,
      token: newToken,
      expires_at: expiresAt,
      ip_address: oldSession.ip_address,
      user_agent: oldSession.user_agent
    });

    return newToken;
  }

  async getCurrentUser(token: string): Promise<UserWithoutPassword | null> {
    return this.verifyToken(token);
  }
}