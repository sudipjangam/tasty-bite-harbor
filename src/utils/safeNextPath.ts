/**
 * Validates a `?next=` redirect target so it can only point back into this app.
 * Returns the path when it is a same-origin relative path, otherwise null.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  let value = next;
  try {
    value = decodeURIComponent(next);
  } catch {
    return null;
  }
  if (!value.startsWith("/")) return null;
  // Reject protocol-relative ("//evil.com") and backslash variants.
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}
