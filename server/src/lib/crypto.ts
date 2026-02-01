import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ENCRYPTED_PREFIX = 'enc:';

function getKey(): Buffer {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    throw new Error(
      'ENCRYPTION_KEY must be set and at least 32 characters (or 32-byte hex/base64). Manage via Doppler.'
    );
  }
  const raw = Buffer.from(ENCRYPTION_KEY, 'utf8');
  if (raw.length >= KEY_LENGTH) {
    return raw.subarray(0, KEY_LENGTH);
  }
  return scryptSync(ENCRYPTION_KEY, 'markdown-notes-salt', KEY_LENGTH, SCRYPT_OPTIONS);
}

/**
 * Encrypts a string with AES-256-GCM. Output format: "enc:" + base64(iv || authTag || ciphertext).
 * Empty string is encrypted (not left as-is) for consistent handling.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return ENCRYPTED_PREFIX + combined.toString('base64');
}

/**
 * Decrypts a string produced by encrypt(). If the value does not start with "enc:",
 * returns it as-is (legacy plaintext) for backward compatibility during migration.
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    return ciphertext;
  }
  const key = getKey();
  const combined = Buffer.from(ciphertext.slice(ENCRYPTED_PREFIX.length), 'base64');
  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted payload');
  }
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

/** Call at startup to ensure ENCRYPTION_KEY is set; throws if missing or too short. */
export function requireEncryptionKey(): void {
  getKey();
}

/**
 * Decrypts only legacy server-encrypted ("enc:") values. If ENCRYPTION_KEY is not set
 * or value does not start with "enc:", returns value unchanged (for E2EE or plaintext).
 */
export function decryptLegacyIfPossible(value: string): string {
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value;
  try {
    return decrypt(value);
  } catch {
    return value;
  }
}
