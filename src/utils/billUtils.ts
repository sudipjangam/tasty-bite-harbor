// Types for extracted bill data from AI
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
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
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
 * Find the best match for an inventory item name
 */
export function findBestInventoryMatch(
  itemName: string,
  inventoryItems: { id: string; name: string; unit: string }[]
): { id: string; name: string; unit: string } | null {
  if (!itemName || inventoryItems.length === 0) return null;

  const normalizedItem = itemName.toLowerCase().trim();

  for (const inv of inventoryItems) {
    const normalizedInv = inv.name.toLowerCase().trim();
    
    // Direct or containment match
    if (normalizedInv === normalizedItem) return inv;
    if (normalizedInv.includes(normalizedItem) || normalizedItem.includes(normalizedInv)) {
      return inv;
    }
  }

  // Fuzzy match
  let bestMatch = null;
  let bestDistance = Infinity;

  for (const inv of inventoryItems) {
    const normalizedInv = inv.name.toLowerCase().trim();
    const distance = levenshteinDistance(normalizedItem, normalizedInv);
    const maxLength = Math.max(normalizedItem.length, normalizedInv.length);
    const tolerance = Math.floor(maxLength * 0.5);

    if (distance < bestDistance && distance <= tolerance) {
      bestDistance = distance;
      bestMatch = inv;
    }
  }

  return bestMatch;
}
