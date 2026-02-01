/**
 * End-to-end encryption: keys derived from user password in the browser.
 * Server never sees the data encryption key (DEK); developers cannot decrypt.
 */

const PBKDF2_ITERATIONS = 260000;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const E2EE_PREFIX = 'e2ee:';

function b64encode(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function b64decode(str: string): Uint8Array {
  return new Uint8Array(
    atob(str)
      .split('')
      .map((c) => c.charCodeAt(0))
  );
}

async function deriveKEK(password: string, saltBase64: string): Promise<CryptoKey> {
  const salt = b64decode(saltBase64);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function generateSalt(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return b64encode(bytes.buffer);
}

export async function generateDEK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

export async function wrapDEK(dek: CryptoKey, password: string, saltBase64: string): Promise<string> {
  const kek = await deriveKEK(password, saltBase64);
  const raw = await crypto.subtle.exportKey('raw', dek);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: AUTH_TAG_LENGTH * 8 },
    kek,
    raw
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return b64encode(combined.buffer);
}

export async function unwrapDEK(
  encryptedDekBase64: string,
  password: string,
  saltBase64: string
): Promise<CryptoKey> {
  const kek = await deriveKEK(password, saltBase64);
  const combined = b64decode(encryptedDekBase64);
  const iv = combined.subarray(0, IV_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH);
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: AUTH_TAG_LENGTH * 8 },
    kek,
    ciphertext
  );
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptWithDEK(dek: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: AUTH_TAG_LENGTH * 8 },
    dek,
    encoded
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return E2EE_PREFIX + b64encode(combined.buffer);
}

export async function decryptWithDEK(dek: CryptoKey, payload: string): Promise<string> {
  if (!payload.startsWith(E2EE_PREFIX)) return payload;
  const combined = b64decode(payload.slice(E2EE_PREFIX.length));
  const iv = combined.subarray(0, IV_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: AUTH_TAG_LENGTH * 8 },
    dek,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

