// Types for extracted bill data from AI
import { normalizeUnit } from "@/constants/units";
export interface ExtractedVendor {
  name: string | null;
  address: string | null;
  mobile: string | null;
  email?: string | null;
}

export interface ExtractedInvoice {
  number: string | null;
  date: string | null;
}

export interface ExtractedItem {
  item_name: string;
  brand: string | null;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  // Package-aware fields for proper unit conversion
  package_size: number | null;
  package_unit: string | null;
  actual_quantity: number | null;
  actual_unit: string | null;
}

export interface ExtractedBillData {
  vendor: ExtractedVendor;
  invoice: ExtractedInvoice;
  items: ExtractedItem[];
  grand_total: number | null;
}

// Legacy type for backward compatibility
export interface LegacyExtractedBillItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

export interface LegacyExtractedBillData {
  supplier_name: string;
  invoice_date: string;
  total_amount: number;
  items: LegacyExtractedBillItem[];
}

/**
 * Simple Levenshtein distance for string similarity
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// --- Size/brand token stripping for improved matching ---

// Common size/weight/volume tokens to strip from product names before matching
const SIZE_TOKENS = /\b(\d+(\.\d+)?)\s*(ml|l|ltr|litre|liters?|g|gm|gms|gram|grams?|kg|kgs?|pcs?|pieces?|boxes?|packs?|pkts?|bottles?|cans?|nos?)\b/gi;
const BRAND_TOKENS_COMMON = /\b(aashirvaad|amul|tata|nestle|britannia|mother\s*dairy|patanjali|fortune|saffola|sundrop|dabur|haldiram|mdh|everest|catch|tops|kissan|maggi)\b/gi;

/**
 * Strip size, quantity, and brand tokens from an item name for matching.
 * e.g., "Aashirvaad Cow Ghee 500 Ml" → "cow ghee"
 */
export function normalizeForMatching(name: string): string {
  return name
    .toLowerCase()
    .replace(SIZE_TOKENS, '')
    .replace(BRAND_TOKENS_COMMON, '')
    .replace(/\bpet\b/gi, '') // "Pet" bottle type
    .replace(/[^a-z\s]/g, '') // Remove remaining non-alpha
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract core product tokens from a name (for token-overlap scoring).
 */
function getProductTokens(name: string): string[] {
  return normalizeForMatching(name)
    .split(/\s+/)
    .filter(t => t.length > 1); // Skip single-char noise
}

/**
 * Find the best match for a supplier name from a list of suppliers
 */
export function findBestSupplierMatch(
  extractedName: string | null,
  suppliers: { id: string; name: string }[]
): { id: string; name: string } | null {
  if (!extractedName || suppliers.length === 0) return null;

  const normalizedExtracted = extractedName.toLowerCase().trim();
  let bestMatch = null;
  let bestDistance = Infinity;

  for (const supplier of suppliers) {
    const normalizedSupplier = supplier.name.toLowerCase().trim();
    
    // Direct match
    if (normalizedSupplier === normalizedExtracted) return supplier;
    if (normalizedSupplier.includes(normalizedExtracted) || normalizedExtracted.includes(normalizedSupplier)) {
       // Favor containment matches strongly
       return supplier;
    }

    const distance = levenshteinDistance(normalizedExtracted, normalizedSupplier);
    const maxLength = Math.max(normalizedExtracted.length, normalizedSupplier.length);
    // Allow variable tolerance based on length
    const tolerance = Math.floor(maxLength * 0.4); 

    if (distance < bestDistance && distance <= tolerance) {
      bestDistance = distance;
      bestMatch = supplier;
    }
  }

  return bestMatch;
}

/**
 * Find the best match for an inventory item name, using token-based scoring
 * with brand/size stripping for improved accuracy.
 * Returns the match along with a confidence score (0-100).
 */
export function findBestInventoryMatch(
  itemName: string,
  inventoryItems: { id: string; name: string; unit: string }[]
): { id: string; name: string; unit: string; confidence: number } | null {
  if (!itemName || inventoryItems.length === 0) return null;

  const normalizedItem = normalizeForMatching(itemName);
  const itemTokens = getProductTokens(itemName);

  let bestMatch: { id: string; name: string; unit: string; confidence: number } | null = null;
  let bestScore = 0;

  for (const inv of inventoryItems) {
    const normalizedInv = normalizeForMatching(inv.name);
    const invTokens = getProductTokens(inv.name);

    let score = 0;

    // 1. Exact normalized match → 100 confidence
    if (normalizedInv === normalizedItem) {
      return { ...inv, confidence: 100 };
    }

    // 2. Containment after normalization (stripped name contains or is contained)
    if (normalizedInv.length > 0 && normalizedItem.length > 0) {
      if (normalizedInv.includes(normalizedItem) || normalizedItem.includes(normalizedInv)) {
        const ratio = Math.min(normalizedInv.length, normalizedItem.length) / 
                      Math.max(normalizedInv.length, normalizedItem.length);
        score = Math.max(score, ratio * 90);
      }
    }

    // 3. Token overlap scoring — how many meaningful product words match?
    if (itemTokens.length > 0 && invTokens.length > 0) {
      const overlap = invTokens.filter(invT =>
        itemTokens.some(itemT => invT.includes(itemT) || itemT.includes(invT))
      );
      const tokenScore = (overlap.length / Math.max(invTokens.length, itemTokens.length)) * 85;
      score = Math.max(score, tokenScore);
    }

    // 4. Fuzzy match on normalized names (tightened to 25% tolerance)
    if (normalizedItem.length > 0 && normalizedInv.length > 0) {
      const distance = levenshteinDistance(normalizedItem, normalizedInv);
      const maxLength = Math.max(normalizedItem.length, normalizedInv.length);
      const tolerance = Math.floor(maxLength * 0.25);
      if (distance <= tolerance) {
        const fuzzyScore = ((tolerance - distance) / tolerance) * 70;
        score = Math.max(score, fuzzyScore);
      }
    }

    if (score > bestScore && score >= 40) {
      bestScore = score;
      bestMatch = { ...inv, confidence: Math.round(score) };
    }
  }

  return bestMatch;
}

/**
 * Normalize the AI-extracted items to ensure actual_quantity/actual_unit are populated.
 * If the AI didn't provide them, try to parse package_size from the item name.
 */
export function normalizeExtractedItem(item: ExtractedItem): ExtractedItem {
  // If AI already provided actual values, use them
  if (item.actual_quantity != null && item.actual_unit != null) {
    return item;
  }

  // If the unit is already a proper measurement (not pcs), use quantity directly
  const unitLower = (item.unit || '').toLowerCase().trim();
  const isPcsUnit = ['pcs', 'pc', 'piece', 'pieces', 'nos', 'no', 'bottle', 'bottles', 'box', 'boxes', 'pack', 'packs', 'pkt', 'pkts', 'can', 'cans'].includes(unitLower);

  if (!isPcsUnit) {
    // Already in proper unit (kg, ml, l, g, etc.)
    return {
      ...item,
      actual_quantity: item.quantity,
      actual_unit: item.unit,
    };
  }

  // Unit is PCS-like: try to extract size from item name
  const sizeMatch = item.item_name.match(/(\d+(?:\.\d+)?)\s*(ml|l|ltr|litre|g|gm|gms|gram|kg|kgs?)\b/i);

  if (sizeMatch && item.package_size == null) {
    const size = parseFloat(sizeMatch[1]);
    const sizeUnit = normalizeUnitString(sizeMatch[2]);

    return {
      ...item,
      package_size: size,
      package_unit: sizeUnit,
      actual_quantity: item.quantity * size,
      actual_unit: sizeUnit,
    };
  }

  // If AI provided package_size/package_unit, calculate
  if (item.package_size != null && item.package_unit != null) {
    return {
      ...item,
      actual_quantity: item.quantity * item.package_size,
      actual_unit: item.package_unit,
    };
  }

  // Fallback: can't determine actual unit, keep as-is
  return {
    ...item,
    actual_quantity: item.quantity,
    actual_unit: item.unit,
  };
}

/**
 * Normalize common unit strings to standard format.
 */
export function normalizeUnitString(unit: string): string {
  return normalizeUnit(unit);
}

/**
 * Calculate rate per actual unit (e.g., ₹295 for 500ml → ₹0.59/ml)
 */
export function calculateRatePerActualUnit(item: ExtractedItem): number {
  if (!item.actual_quantity || item.actual_quantity <= 0) return item.rate;
  return item.amount / item.actual_quantity;
}
