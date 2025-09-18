import { test, expect } from 'bun:test';
import { generateJWT, verifyJWT, refreshJWT } from '../../src/utils/jwt';

// Mock config for testing
const originalEnv = Bun.env.SECRET_KEY_BASE;
Bun.env.SECRET_KEY_BASE = 'test-secret-key-for-jwt-testing';

test('JWT generation and verification', () => {
  const user = {
    id: '123',
    email: 'test@example.com'
  };
  
  const token = generateJWT(user);
  expect(typeof token).toBe('string');
  expect(token.split('.')).toHaveLength(3);
  
  const payload = verifyJWT(token);
  expect(payload).not.toBeNull();
  expect(payload!.userId).toBe('123');
  expect(payload!.email).toBe('test@example.com');
  expect(payload!.iss).toBe('passport.oceanheart.ai');
});

test('JWT verification with invalid token', () => {
  const invalidToken = 'invalid.token.here';
  const payload = verifyJWT(invalidToken);
  expect(payload).toBeNull();
});

test('JWT refresh', () => {
  const user = {
    id: '456',
    email: 'refresh@example.com'
  };
  
  const originalToken = generateJWT(user);
  const refreshedToken = refreshJWT(originalToken);
  
  expect(refreshedToken).not.toBeNull();
  expect(typeof refreshedToken).toBe('string');
  
  if (refreshedToken) {
    const payload = verifyJWT(refreshedToken);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe('456');
    expect(payload!.email).toBe('refresh@example.com');
  }
});

test('JWT expiration handling', () => {
  // Create a token with immediate expiration
  const user = { id: '789', email: 'expired@example.com' };
  const token = generateJWT(user);
  
  // Manually create an expired token by modifying the payload
  const [header, payload, signature] = token.split('.');
  const decodedPayload = JSON.parse(atob(payload));
  decodedPayload.exp = Math.floor(Date.now() / 1000) - 1; // 1 second ago
  
  const expiredPayload = btoa(JSON.stringify(decodedPayload));
  const expiredToken = `${header}.${expiredPayload}.${signature}`;
  
  const result = verifyJWT(expiredToken);
  expect(result).toBeNull();
});

// Restore original env
if (originalEnv) {
  Bun.env.SECRET_KEY_BASE = originalEnv;
} else {
  delete Bun.env.SECRET_KEY_BASE;
}