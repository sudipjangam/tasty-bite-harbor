/**
 * Centralized unit measurement definitions.
 * ALL tools (Inventory, Recipes, Orders, Menu, Bill parsing) must import from here
 * to ensure consistency across the application.
 */

// ─── Canonical unit values ───────────────────────────────────────────────
// These are the ONLY valid unit strings stored in the database.
// Always use these exact strings – never ad-hoc literals.

export const UNITS = {
  // Mass / Weight
  KG: "kg",
  G: "g",

  // Volume
  L: "l",
  ML: "ml",

  // Count / Discrete
  PIECE: "piece",
  DOZEN: "dozen",
  BOX: "box",
  PACK: "pack",

  // Cooking measures (recipe-only)
  CUP: "cup",
  TBSP: "tbsp",
  TSP: "tsp",
} as const;

export type UnitValue = (typeof UNITS)[keyof typeof UNITS];

// ─── Human-readable labels ──────────────────────────────────────────────

export interface UnitOption {
  value: UnitValue;
  label: string;
}

/** ALL available units with labels – superset used by Inventory */
export const ALL_UNIT_OPTIONS: UnitOption[] = [
  { value: UNITS.KG, label: "kg" },
  { value: UNITS.G, label: "g" },
  { value: UNITS.L, label: "l" },
  { value: UNITS.ML, label: "ml" },
  { value: UNITS.PIECE, label: "piece" },
  { value: UNITS.DOZEN, label: "dozen" },
  { value: UNITS.BOX, label: "box" },
  { value: UNITS.PACK, label: "pack" },
];

/** Units for inventory forms (all storage units, no cooking measures) */
export const INVENTORY_UNITS: UnitOption[] = ALL_UNIT_OPTIONS;

/** Flat array of inventory unit values — for quick select dropdowns */
export const INVENTORY_UNIT_VALUES: UnitValue[] = INVENTORY_UNITS.map((u) => u.value);

/** Units for recipe ingredient rows (includes cooking measures) */
export const RECIPE_UNITS: UnitOption[] = [
  { value: UNITS.KG, label: "kg" },
  { value: UNITS.G, label: "g" },
  { value: UNITS.L, label: "l" },
  { value: UNITS.ML, label: "ml" },
  { value: UNITS.PIECE, label: "piece" },
  { value: UNITS.DOZEN, label: "dozen" },
  { value: UNITS.BOX, label: "box" },
  { value: UNITS.PACK, label: "pack" },
  { value: UNITS.CUP, label: "cup" },
  { value: UNITS.TBSP, label: "tbsp" },
  { value: UNITS.TSP, label: "tsp" },
];

/** Units for custom extras / order items */
export const ORDER_UNITS: UnitOption[] = [
  { value: UNITS.PIECE, label: "Piece" },
  { value: UNITS.KG, label: "Kg" },
  { value: UNITS.G, label: "Grams" },
  { value: UNITS.L, label: "Litre" },
  { value: UNITS.ML, label: "ml" },
  { value: UNITS.DOZEN, label: "Dozen" },
  { value: UNITS.BOX, label: "Box" },
  { value: UNITS.PACK, label: "Pack" },
];

// ─── Unit grouping for pricing-type UIs ─────────────────────────────────

export const UNIT_GROUPS_BY_PRICING: Record<string, UnitValue[]> = {
  weight: [UNITS.KG, UNITS.G],
  volume: [UNITS.L, UNITS.ML],
  unit: [UNITS.PIECE],
};

// ─── Unit conversion factors (to base: kg for mass, l for volume) ───────

export const UNIT_CONVERSIONS: Record<string, { base: string; factor: number }> = {
  [UNITS.KG]: { base: "kg", factor: 1 },
  [UNITS.G]: { base: "kg", factor: 0.001 },
  [UNITS.L]: { base: "l", factor: 1 },
  [UNITS.ML]: { base: "l", factor: 0.001 },
  [UNITS.PIECE]: { base: "piece", factor: 1 },
  [UNITS.DOZEN]: { base: "piece", factor: 12 },
  [UNITS.BOX]: { base: "box", factor: 1 },
  [UNITS.PACK]: { base: "pack", factor: 1 },
  [UNITS.CUP]: { base: "l", factor: 0.24 },
  [UNITS.TBSP]: { base: "l", factor: 0.015 },
  [UNITS.TSP]: { base: "l", factor: 0.005 },
};

// ─── Normalizer ─────────────────────────────────────────────────────────
// Converts messy user / OCR / AI strings into canonical unit values.

const UNIT_ALIASES: Record<string, UnitValue> = {
  // mass
  kg: UNITS.KG,
  kgs: UNITS.KG,
  kilogram: UNITS.KG,
  kilograms: UNITS.KG,
  g: UNITS.G,
  gm: UNITS.G,
  gms: UNITS.G,
  gram: UNITS.G,
  grams: UNITS.G,

  // volume
  l: UNITS.L,
  ltr: UNITS.L,
  litre: UNITS.L,
  litres: UNITS.L,
  liter: UNITS.L,
  liters: UNITS.L,
  ml: UNITS.ML,

  // count
  piece: UNITS.PIECE,
  pieces: UNITS.PIECE,
  pc: UNITS.PIECE,
  pcs: UNITS.PIECE,
  nos: UNITS.PIECE,
  no: UNITS.PIECE,
  unit: UNITS.PIECE,
  units: UNITS.PIECE,
  plate: UNITS.PIECE,

  dozen: UNITS.DOZEN,

  box: UNITS.BOX,
  boxes: UNITS.BOX,

  pack: UNITS.PACK,
  packs: UNITS.PACK,
  pkt: UNITS.PACK,
  pkts: UNITS.PACK,

  // cooking
  cup: UNITS.CUP,
  tbsp: UNITS.TBSP,
  tsp: UNITS.TSP,

  // uppercase variants (for legacy data)
  L: UNITS.L,
};

/**
 * Normalize any free-form unit string to a canonical UnitValue.
 * Returns the input lowercased if no alias is found.
 */
export function normalizeUnit(raw: string): UnitValue {
  const trimmed = raw.trim();
  // Try exact match first (handles case-sensitive "L")
  if (trimmed in UNIT_ALIASES) return UNIT_ALIASES[trimmed];
  // Then case-insensitive
  const lower = trimmed.toLowerCase();
  return UNIT_ALIASES[lower] ?? (lower as UnitValue);
}
