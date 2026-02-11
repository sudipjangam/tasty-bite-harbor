/**
 * Paytm Checksum Generator for Deno (Supabase Edge Functions)
 * 
 * Implements Paytm's checksum algorithm:
 * 1. Serialize body params to query string (sorted alphabetically)
 * 2. Generate SHA256 hash
 * 3. Encrypt with AES-128-CBC using Merchant Key
 * 4. Base64 encode the result
 * 
 * Port of: https://github.com/nicksarma24/paytmchecksum
 */

// Helper: Convert string to Uint8Array
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Helper: Convert Uint8Array to hex string
function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: Convert hex string to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return arr;
}

// Generate random IV (16 bytes)
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

// PKCS5 padding
function addPKCS5Padding(data: Uint8Array, blockSize: number = 16): Uint8Array {
  const paddingLen = blockSize - (data.length % blockSize);
  const padded = new Uint8Array(data.length + paddingLen);
  padded.set(data);
  padded.fill(paddingLen, data.length);
  return padded;
}

// Remove PKCS5 padding
function removePKCS5Padding(data: Uint8Array): Uint8Array {
  const paddingLen = data[data.length - 1];
  return data.slice(0, data.length - paddingLen);
}

/**
 * Generate SHA256 hash of data
 */
async function sha256(data: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', stringToUint8Array(data));
  return uint8ArrayToHex(new Uint8Array(hashBuffer));
}

/**
 * AES-128-CBC Encrypt
 */
async function aes128CBCEncrypt(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    data
  );
  return new Uint8Array(encrypted);
}

/**
 * AES-128-CBC Decrypt
 */
async function aes128CBCDecrypt(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    data
  );
  return new Uint8Array(decrypted);
}

/**
 * Generate Paytm Checksum from request body
 * 
 * @param body - The body portion of the Paytm request (key-value pairs)
 * @param merchantKey - 16-character merchant key from Paytm Dashboard
 * @returns Base64 encoded checksum string
 */
export async function generatePaytmChecksum(
  body: Record<string, unknown>,
  merchantKey: string
): Promise<string> {
  // Step 1: Serialize body to pipe-separated sorted string
  const keys = Object.keys(body).sort();
  const values = keys.map(k => {
    const val = body[k];
    return val !== null && val !== undefined ? String(val) : '';
  });
  const bodyString = values.join('|');

  // Step 2: SHA256 hash
  const hash = await sha256(bodyString);

  // Step 3: Generate random IV (4 bytes hex = 8 chars, used as salt)
  const salt = uint8ArrayToHex(crypto.getRandomValues(new Uint8Array(4)));

  // Step 4: Combine hash + salt with pipe separator
  const hashWithSalt = hash + '|' + salt;

  // Step 5: Prepare key (first 16 bytes of merchantKey)
  const keyBytes = stringToUint8Array(merchantKey.substring(0, 16));

  // Step 6: Generate IV from key
  const iv = stringToUint8Array('\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f');

  // Step 7: AES-128-CBC encrypt
  const paddedData = addPKCS5Padding(stringToUint8Array(hashWithSalt));
  const encrypted = await aes128CBCEncrypt(paddedData, keyBytes, iv);

  // Step 8: Base64 encode
  const base64 = btoa(String.fromCharCode(...encrypted));

  return base64;
}

/**
 * Verify Paytm Checksum from response/webhook
 * 
 * @param body - The body portion of the Paytm response (key-value pairs)
 * @param checksum - The checksum received from Paytm
 * @param merchantKey - 16-character merchant key from Paytm Dashboard
 * @returns true if checksum is valid
 */
export async function verifyPaytmChecksum(
  body: Record<string, unknown>,
  checksum: string,
  merchantKey: string
): Promise<boolean> {
  try {
    // Step 1: Prepare key
    const keyBytes = stringToUint8Array(merchantKey.substring(0, 16));
    const iv = stringToUint8Array('\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f');

    // Step 2: Base64 decode the checksum
    const encryptedBytes = Uint8Array.from(atob(checksum), c => c.charCodeAt(0));

    // Step 3: AES-128-CBC decrypt
    const decrypted = await aes128CBCDecrypt(encryptedBytes, keyBytes, iv);
    const decryptedPadRemoved = removePKCS5Padding(decrypted);
    const decryptedString = new TextDecoder().decode(decryptedPadRemoved);

    // Step 4: Split hash and salt
    const parts = decryptedString.split('|');
    if (parts.length < 2) return false;
    const receivedHash = parts[0];

    // Step 5: Compute hash from body
    const keys = Object.keys(body).sort();
    const values = keys.map(k => {
      const val = body[k];
      return val !== null && val !== undefined ? String(val) : '';
    });
    const bodyString = values.join('|');
    const computedHash = await sha256(bodyString);

    // Step 6: Compare hashes
    return receivedHash === computedHash;
  } catch (error) {
    console.error('Checksum verification failed:', error);
    return false;
  }
}

/**
 * Generate a unique Paytm Order ID
 * Format: TB_<TABLE>_<TIMESTAMP>_<RANDOM>
 */
export function generatePaytmOrderId(tableNumber?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const tablePrefix = tableNumber ? `T${tableNumber}_` : '';
  return `TB_${tablePrefix}${timestamp}_${random}`;
}
