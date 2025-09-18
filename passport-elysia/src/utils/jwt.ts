import jwt from '@elysiajs/jwt';
import { config } from '../config';

// JWT configuration matching Rails implementation
const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 1 week

export interface JwtPayload {
  userId: number;  // Note: Rails uses userId, not user_id
  email: string;
  role?: string;
  exp: number;
  iat: number;
  iss: string;
}

// Create JWT handler using Elysia JWT plugin
const jwtHandler = jwt({
  name: 'jwt',
  secret: config.secretKeyBase,
  alg: JWT_ALGORITHM,
  exp: `${JWT_EXPIRY_SECONDS}s`,
});

/**
 * Generate a JWT token for a user
 * @param user User object with id, email, and role
 * @returns Signed JWT token string
 */
export async function generateJwt(user: {
  id: number;
  email_address: string;
  role: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const payload: JwtPayload = {
    userId: user.id,  // Match Rails format
    email: user.email_address,
    role: user.role,
    exp: now + JWT_EXPIRY_SECONDS,
    iat: now,
    iss: config.jwtIssuer,
  };
  
  // Use the Elysia JWT handler to sign the token
  const handler = await jwtHandler.decorator();
  return await handler.jwt.sign(payload);
}

/**
 * Verify and decode a JWT token
 * @param token JWT token string
 * @returns Decoded payload or null if invalid
 */
export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const handler = await jwtHandler.decorator();
    const payload = await handler.jwt.verify(token) as JwtPayload;
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    
    // Verify issuer
    if (payload.iss !== config.jwtIssuer) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

/**
 * Extract JWT from authorization header
 * @param authHeader Authorization header value
 * @returns Token string or null
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

// Export the JWT handler for use in Elysia app
export { jwtHandler };