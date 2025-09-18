import { createHmac } from 'crypto';
import { config } from '../config';

interface JWTHeader {
  alg: string;
  typ: string;
}

interface JWTPayload {
  userId: string;
  email: string;
  exp: number;
  iat: number;
  iss: string;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  str += '='.repeat((4 - str.length % 4) % 4);
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(str, 'base64').toString('utf-8');
}

export function generateJWT(user: { id: string; email: string }): string {
  const header: JWTHeader = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    exp: now + (7 * 24 * 60 * 60), // 1 week
    iat: now,
    iss: config.jwtIssuer
  };
  
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', config.secretKeyBase)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [headerEncoded, payloadEncoded, signature] = parts;
    
    const expectedSignature = createHmac('sha256', config.secretKeyBase)
      .update(`${headerEncoded}.${payloadEncoded}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(base64UrlDecode(payloadEncoded));
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    // Support both old and new payload formats
    if (!payload.userId && payload.user_id) {
      payload.userId = payload.user_id;
    }
    
    return payload;
  } catch {
    return null;
  }
}

export function refreshJWT(token: string): string | null {
  const payload = verifyJWT(token);
  if (!payload) return null;
  
  return generateJWT({
    id: payload.userId,
    email: payload.email
  });
}