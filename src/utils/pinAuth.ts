/**
 * pinAuth.ts
 *
 * Secure Quick PIN & Remembered User helper for Swadeshi Solutions.
 * Uses Web Crypto API (SHA-256) for local PIN verification.
 * Stores remembered user profile so returning users can log in in 1 second.
 */

const PIN_STORAGE_KEY = "swadeshi_quick_pin_data";
const REMEMBERED_USER_KEY = "swadeshi_remembered_user";
const SALT_KEY = "swadeshi_pin_salt";

export interface RememberedUser {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  avatarUrl?: string;
  restaurantId?: string;
  hasPin: boolean;
  lastLoginAt: number;
}

interface StoredPinData {
  userId: string;
  email: string;
  pinHash: string;
  salt: string;
  createdAt: number;
}

/** Generate or retrieve device-specific salt */
function getDeviceSalt(): string {
  let salt = localStorage.getItem(SALT_KEY);
  if (!salt) {
    salt = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem(SALT_KEY, salt);
  }
  return salt;
}

/** Compute SHA-256 hash using browser/webview crypto */
async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${pin}:swadeshi_pos_pin`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Save a 4-digit Quick PIN for the current user */
export async function saveQuickPin(
  userId: string,
  email: string,
  pin: string,
  userProfile?: {
    firstName?: string;
    lastName?: string;
    role?: string;
    avatarUrl?: string;
    restaurantId?: string;
  }
): Promise<void> {
  const salt = getDeviceSalt();
  const pinHash = await hashPin(pin, salt);

  const pinData: StoredPinData = {
    userId,
    email,
    pinHash,
    salt,
    createdAt: Date.now(),
  };

  localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinData));

  // Also update remembered user
  const remembered: RememberedUser = {
    userId,
    email,
    firstName: userProfile?.firstName,
    lastName: userProfile?.lastName,
    role: userProfile?.role,
    avatarUrl: userProfile?.avatarUrl,
    restaurantId: userProfile?.restaurantId,
    hasPin: true,
    lastLoginAt: Date.now(),
  };

  localStorage.setItem(REMEMBERED_USER_KEY, JSON.stringify(remembered));
}

/** Verify entered PIN against stored hash */
export async function verifyQuickPin(pin: string): Promise<boolean> {
  const raw = localStorage.getItem(PIN_STORAGE_KEY);
  if (!raw) return false;

  try {
    const data: StoredPinData = JSON.parse(raw);
    const candidateHash = await hashPin(pin, data.salt || getDeviceSalt());
    return candidateHash === data.pinHash;
  } catch (err) {
    console.error("[PinAuth] Verification error:", err);
    return false;
  }
}

/** Check if Quick PIN is configured on this device */
export function hasQuickPin(): boolean {
  return !!localStorage.getItem(PIN_STORAGE_KEY);
}

/** Remove Quick PIN from this device */
export function removeQuickPin(): void {
  localStorage.removeItem(PIN_STORAGE_KEY);
  const user = getRememberedUser();
  if (user) {
    user.hasPin = false;
    localStorage.setItem(REMEMBERED_USER_KEY, JSON.stringify(user));
  }
}

/** Retrieve remembered user info */
export function getRememberedUser(): RememberedUser | null {
  const raw = localStorage.getItem(REMEMBERED_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Save or update remembered user profile */
export function setRememberedUser(user: Partial<RememberedUser>): void {
  const current = getRememberedUser() || {
    userId: "",
    email: "",
    hasPin: hasQuickPin(),
    lastLoginAt: Date.now(),
  };

  const updated: RememberedUser = {
    ...current,
    ...user,
    hasPin: hasQuickPin(),
    lastLoginAt: Date.now(),
  };

  localStorage.setItem(REMEMBERED_USER_KEY, JSON.stringify(updated));
}

/** Clear all remembered user credentials (switch account / clean log out) */
export function clearRememberedUser(): void {
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.removeItem(REMEMBERED_USER_KEY);
}
