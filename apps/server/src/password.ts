// apps/server/src/password.ts
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { log } from './utils.js';

// Promisified scrypt with options support
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

// === Password Configuration ===
const PASSWORD_CONFIG = {
  saltLength: 32,
  keyLength: 64,
  minLength: 4,
  maxLength: 64,
  scryptOptions: {
    N: 16384,  // CPU/Memory Cost
    r: 8,      // Block Size
    p: 1,      // Parallelization
  },
} as const;

// === Brute-Force Protection ===
const BRUTE_FORCE_CONFIG = {
  maxAttempts: 5,
  blockDurationMs: 15 * 60 * 1000, // 15 Minuten
} as const;

// Track failed password attempts: Map<"ip:roomCode", { count, blockedUntil }>
const passwordAttempts = new Map<string, { count: number; blockedUntil: number }>();

/**
 * Hashes a password using scrypt
 */
export async function hashPassword(password: string): Promise<string> {
  // Validate length
  if (password.length < PASSWORD_CONFIG.minLength || password.length > PASSWORD_CONFIG.maxLength) {
    throw new Error(`Password must be between ${PASSWORD_CONFIG.minLength} and ${PASSWORD_CONFIG.maxLength} characters`);
  }

  // Generate salt
  const salt = randomBytes(PASSWORD_CONFIG.saltLength);

  // Hash with scrypt
  const hash = await scryptAsync(
    password,
    salt,
    PASSWORD_CONFIG.keyLength,
    PASSWORD_CONFIG.scryptOptions
  );

  // Format: salt:hash (both as hex)
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * Verifies a password against a stored hash using timing-safe comparison
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = storedHash.split(':');

    if (!saltHex || !hashHex) {
      return false;
    }

    const salt = Buffer.from(saltHex, 'hex');
    const storedHashBuffer = Buffer.from(hashHex, 'hex');

    // Hash the input password
    const inputHash = await scryptAsync(
      password,
      salt,
      PASSWORD_CONFIG.keyLength,
      PASSWORD_CONFIG.scryptOptions
    );

    // Timing-safe comparison (prevents timing attacks)
    return timingSafeEqual(storedHashBuffer, inputHash);
  } catch (error) {
    log('Password', `Verify error: ${error}`);
    return false;
  }
}

/**
 * Checks if an IP is blocked from password attempts for a room
 */
export function isPasswordBlocked(ip: string, roomCode: string): boolean {
  const key = `${ip}:${roomCode}`;
  const record = passwordAttempts.get(key);

  if (!record) return false;

  const now = Date.now();
  if (now < record.blockedUntil) {
    return true;
  }

  // Block expired, remove record
  passwordAttempts.delete(key);
  return false;
}

/**
 * Gets remaining block time in milliseconds
 */
export function getPasswordBlockRemaining(ip: string, roomCode: string): number {
  const key = `${ip}:${roomCode}`;
  const record = passwordAttempts.get(key);

  if (!record) return 0;

  const remaining = record.blockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Records a failed password attempt
 */
export function recordFailedPasswordAttempt(ip: string, roomCode: string): void {
  const key = `${ip}:${roomCode}`;
  const now = Date.now();

  const record = passwordAttempts.get(key) || { count: 0, blockedUntil: 0 };
  record.count++;

  // Block after max attempts
  if (record.count >= BRUTE_FORCE_CONFIG.maxAttempts) {
    record.blockedUntil = now + BRUTE_FORCE_CONFIG.blockDurationMs;
    log('Password', `Blocked ${ip} for room ${roomCode} (${BRUTE_FORCE_CONFIG.maxAttempts} failed attempts)`);
  }

  passwordAttempts.set(key, record);
}

/**
 * Clears password attempt record on successful login
 */
export function clearPasswordAttempts(ip: string, roomCode: string): void {
  const key = `${ip}:${roomCode}`;
  passwordAttempts.delete(key);
}

/**
 * Validates password format (without hashing)
 */
export function validatePasswordFormat(password: string): { valid: boolean; error?: string } {
  if (typeof password !== 'string') {
    return { valid: false, error: 'Password must be a string' };
  }

  if (password.length < PASSWORD_CONFIG.minLength) {
    return { valid: false, error: `Password must be at least ${PASSWORD_CONFIG.minLength} characters` };
  }

  if (password.length > PASSWORD_CONFIG.maxLength) {
    return { valid: false, error: `Password must be at most ${PASSWORD_CONFIG.maxLength} characters` };
  }

  return { valid: true };
}

/**
 * Cleanup old password attempt records (run periodically)
 */
export function cleanupPasswordAttempts(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, record] of passwordAttempts) {
    if (now > record.blockedUntil && record.count > 0) {
      passwordAttempts.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    log('Password', `Cleaned up ${cleaned} expired attempt records`);
  }
}

// Cleanup interval (every 5 minutes)
setInterval(cleanupPasswordAttempts, 5 * 60 * 1000);
