/**
 * Sanitizes an order item note or modifier string.
 * Returns null if the note is effectively empty.
 */
export const sanitizeNote = (note: any): string | null => {
  if (!note) return null;
  if (Array.isArray(note)) {
    const filtered = note.filter(Boolean).map(String).filter(s => s.trim() !== "" && s !== "[]");
    return filtered.length > 0 ? filtered.join(", ") : null;
  }
  const str = String(note).trim();
  if (str === "" || str === "[]" || str === "undefined" || str === "null") return null;
  return str;
};

/**
 * Formats a single order item into a string for the 'orders' table.
 * Example: "2x Margherita Pizza (Extra Cheese) @12.99"
 */
export const formatOrderItemString = (
  quantity: number,
  name: string,
  price: number,
  notes?: any,
  modifiers?: any[]
): string => {
  const sanitizedNotes = sanitizeNote(notes);
  const sanitizedModifiers = sanitizeNote(modifiers);

  const allNotes = [sanitizedModifiers, sanitizedNotes]
    .filter(Boolean)
    .join(", ");

  const metaSuffix = allNotes ? ` (${allNotes})` : "";
  return `${quantity}x ${name}${metaSuffix} @${price}`;
};

/**
 * Strips artifacts like " ([])" or " ()" from order item strings for display.
 * Also handles nested empty brackets like " (())".
 */
export const sanitizeOrderItemDisplay = (itemStr: string): string => {
  if (!itemStr) return "";
  
  // Remove " ([])", " ()", " (  )", etc.
  let sanitized = itemStr
    .replace(/\s*\(\s*\[\s*\]\s*\)/g, "") // Remove " ([])"
    .replace(/\s*\(\s*\)/g, "")           // Remove " ()"
    .replace(/\s*\[\s*\]/g, "");          // Remove "[]"
    
  return sanitized.trim();
};
