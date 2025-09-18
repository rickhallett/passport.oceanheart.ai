import { config } from "../config/environment";
import { JWT_ISSUER } from "../config/constants";
import type { JWTPayload } from "../types/jwt";

export class JWTService {
  private secret: string;
  
  constructor() {
    this.secret = config.secretKeyBase;
  }
  
  async sign(payload: Omit<JWTPayload, 'exp' | 'iat' | 'iss'>): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    
    const fullPayload: JWTPayload = {
      ...payload,
      exp: now + config.jwtExpiresIn,
      iat: now,
      iss: JWT_ISSUER
    };
    
    const encodedHeader = this.base64url(JSON.stringify(header));
    const encodedPayload = this.base64url(JSON.stringify(fullPayload));
    
    const signature = await this.hmacSha256(
      `${encodedHeader}.${encodedPayload}`,
      this.secret
    );
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }
  
  async verify(token: string): Promise<JWTPayload | null> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const [header, payload, signature] = parts;
      
      // Verify signature
      const expectedSignature = await this.hmacSha256(
        `${header}.${payload}`,
        this.secret
      );
      
      if (!this.constantTimeCompare(signature, expectedSignature)) {
        return null;
      }
      
      // Decode and verify payload
      const decoded = JSON.parse(this.base64urlDecode(payload)) as JWTPayload;
      
      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return null;
      }
      
      // Check issuer
      if (decoded.iss !== JWT_ISSUER) {
        return null;
      }
      
      return decoded;
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }
  
  async refresh(token: string): Promise<string | null> {
    const payload = await this.verify(token);
    if (!payload) return null;
    
    // Don't refresh if token has more than half its lifetime remaining
    const now = Math.floor(Date.now() / 1000);
    const halfLife = config.jwtExpiresIn / 2;
    if (payload.exp - now > halfLife) {
      return token; // Return existing token
    }
    
    // Issue new token with updated expiration
    return this.sign({
      userId: payload.userId,
      email: payload.email
    });
  }
  
  private async hmacSha256(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(data)
    );
    
    return this.base64url(Buffer.from(signature));
  }
  
  private base64url(data: string | Buffer): string {
    const base64 = Buffer.isBuffer(data) 
      ? data.toString('base64')
      : Buffer.from(data).toString('base64');
    
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  private base64urlDecode(data: string): string {
    const base64 = data
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      + '='.repeat((4 - data.length % 4) % 4);
    
    return Buffer.from(base64, 'base64').toString();
  }
  
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }
}