/**
 * offlineCrypto.ts
 * AES-GCM encryption/decryption for IndexedDB offline data.
 *
 * - Generates a per-session CryptoKey from a user-specific seed (user ID).
 * - Encrypts data before writing to IndexedDB.
 * - Decrypts data on read.
 * - The derived key lives only in memory and is never persisted.
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;

// In-memory key cache — one key per user session
let cachedKey: CryptoKey | null = null;
let cachedUserId: string | null = null;

/**
 * Derives a CryptoKey from a user-specific seed.
 * Uses PBKDF2 to stretch the user ID + a static salt into a strong AES key.
 */
async function deriveKey(userId: string): Promise<CryptoKey> {
  if (cachedKey && cachedUserId === userId) {
    return cachedKey;
  }

  const encoder = new TextEncoder();
  // The salt is application-specific and can be static (it is NOT secret).
  const salt = encoder.encode("swadeshi-offline-v1");

  // Import the userId as raw keying material for PBKDF2
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(userId),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );

  cachedKey = key;
  cachedUserId = userId;
  return key;
}

/**
 * Encrypt a JSON-serialisable value.
 * Returns a base-64 string containing `iv:ciphertext`.
 */
export async function encryptData(
  userId: string,
  data: unknown
): Promise<string> {
  const key = await deriveKey(userId);
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(data));

  // A new random IV for every encryption operation
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    plaintext
  );

  // Combine iv + ciphertext into a single base-64 payload
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base-64 string produced by `encryptData`.
 */
export async function decryptData<T = unknown>(
  userId: string,
  encoded: string
): Promise<T> {
  const key = await deriveKey(userId);
  const raw = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));

  const iv = raw.slice(0, 12);
  const ciphertext = raw.slice(12);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintext)) as T;
}

/**
 * Clear the cached key on logout.
 */
export function clearEncryptionKey(): void {
  cachedKey = null;
  cachedUserId = null;
}
