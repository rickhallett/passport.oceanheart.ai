import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Scrypt parameters
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const SCRYPT_N = 16384; // CPU/memory cost parameter
const SCRYPT_R = 8;     // Block size parameter
const SCRYPT_P = 1;     // Parallelization parameter

/**
 * Hash a password using scrypt
 * @param password Plain text password
 * @returns Hashed password in format: salt:hash (base64 encoded)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = (await scryptAsync(
    password,
    salt,
    KEY_LENGTH,
    { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }
  )) as Buffer;
  
  return `${salt.toString('base64')}:${hash.toString('base64')}`;
}

/**
 * Verify a password against a hash
 * @param password Plain text password to verify
 * @param hashedPassword Hashed password from database
 * @returns True if password matches
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    const [saltBase64, hashBase64] = hashedPassword.split(':');
    
    if (!saltBase64 || !hashBase64) {
      return false;
    }
    
    const salt = Buffer.from(saltBase64, 'base64');
    const storedHash = Buffer.from(hashBase64, 'base64');
    
    const hash = (await scryptAsync(
      password,
      salt,
      KEY_LENGTH,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }
    )) as Buffer;
    
    // Constant-time comparison to prevent timing attacks
    return hash.length === storedHash.length &&
           hash.every((byte, i) => byte === storedHash[i]);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Generate a secure random token
 * @param length Token length in bytes (default: 32)
 * @returns Base64 encoded token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('base64url');
}