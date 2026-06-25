/**
 * QR Token HMAC signing utilities
 *
 * Signs and verifies QR token data using HMAC-SHA256 to prevent forgery.
 * The QR_SIGNING_SECRET must be set as a Supabase Edge Function secret.
 *
 * Setup: supabase secrets set QR_SIGNING_SECRET=$(openssl rand -hex 32)
 */

/**
 * Sign QR data payload, returning a hex HMAC-SHA256 signature.
 * Input: the stable JSON payload (without 'sig' field).
 */
export async function signQRPayload(payload: string): Promise<string> {
  const secret = Deno.env.get('QR_SIGNING_SECRET');
  if (!secret) throw new Error('QR_SIGNING_SECRET is not set');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify a QR HMAC signature.
 * Returns true if valid, false if tampered or expired.
 */
export async function verifyQRSignature(payload: string, sigHex: string): Promise<boolean> {
  const secret = Deno.env.get('QR_SIGNING_SECRET');
  if (!secret) {
    console.warn('QR_SIGNING_SECRET not set — skipping signature verification');
    return false;
  }

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const sigBytes = new Uint8Array(
      (sigHex.match(/.{2}/g) || []).map((h) => parseInt(h, 16)),
    );

    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(payload),
    );
  } catch {
    return false;
  }
}

/**
 * Build the canonical payload string for signing.
 * Only stable fields (no 'sig') in deterministic order.
 */
export function buildSignablePayload(data: {
  restaurantId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  token: string;
  timestamp: number;
}): string {
  return JSON.stringify({
    restaurantId: data.restaurantId,
    entityType: data.entityType,
    entityId: data.entityId,
    entityName: data.entityName,
    token: data.token,
    timestamp: data.timestamp,
  });
}
