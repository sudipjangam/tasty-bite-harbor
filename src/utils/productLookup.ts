import { supabase } from "@/integrations/supabase/client";

export interface ProductLookupResult {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  cost_per_unit: number | null;
  brand?: string | null;
  barcode: string;
  source?: "gemini" | "openfoodfacts";
}

function mapCategory(raw: string): string {
  const l = (raw || "").toLowerCase();
  if (l.includes("beverage") || l.includes("drink") || l.includes("juice") || l.includes("tea") || l.includes("coffee") || l.includes("shake") || l.includes("protein")) return "Beverages";
  if (l.includes("dairy") || l.includes("milk") || l.includes("cheese") || l.includes("butter") || l.includes("paneer") || l.includes("yogurt") || l.includes("curd")) return "Dairy";
  if (l.includes("spice") || l.includes("masala") || l.includes("pepper") || l.includes("chili") || l.includes("salt") || l.includes("seasoning")) return "Spices";
  if (l.includes("meat") || l.includes("chicken") || l.includes("fish") || l.includes("seafood") || l.includes("mutton") || l.includes("pork") || l.includes("egg")) return "Meat & Seafood";
  if (l.includes("fruit")) return "Fruits";
  if (l.includes("vegetable") || l.includes("onion") || l.includes("potato") || l.includes("tomato") || l.includes("produce")) return "Vegetables";
  if (l.includes("bread") || l.includes("bakery") || l.includes("cake") || l.includes("biscuit") || l.includes("cookie")) return "Bakery";
  if (l.includes("oil") || l.includes("rice") || l.includes("flour") || l.includes("atta") || l.includes("cereal") || l.includes("pulse") || l.includes("dal") || l.includes("grain") || l.includes("sugar")) return "Groceries";
  return "Groceries";
}

function normalizeUnit(raw: string): string {
  const u = (raw || "").toLowerCase().trim();
  if (u === "kg" || u === "kgs" || u === "kilogram" || u === "kilograms") return "kg";
  if (u === "g" || u === "gm" || u === "gms" || u === "gram" || u === "grams") return "g";
  if (u === "l" || u === "ltr" || u === "liter" || u === "litre" || u === "litres" || u === "liters") return "l";
  if (u === "ml" || u === "milli" || u === "milliliter" || u === "millilitre") return "ml";
  if (u === "pack" || u === "pkt" || u === "packet" || u === "packets" || u === "packs") return "pack";
  if (u === "box" || u === "boxes") return "box";
  if (u === "dozen" || u === "dozens") return "dozen";
  if (u === "pcs" || u === "pc" || u === "piece" || u === "pieces" || u === "unit" || u === "units" || u === "bottle" || u === "can") return "piece";
  return "piece";
}

/**
 * Identify product details from barcode or SKU using Gemini AI and Open Food Facts
 */
export async function lookupProductDetails(barcode: string): Promise<ProductLookupResult | null> {
  const clean = (barcode || "").trim();
  if (!clean) return null;

  // 1. Try Supabase Edge Function (Gemini AI + Open Food Facts)
  try {
    const { data, error } = await supabase.functions.invoke("lookup-barcode", {
      body: { barcode: clean },
    });

    if (!error && data && data.name) {
      let finalCategory = data.category || "Other";
      if (!finalCategory || finalCategory === "Other") {
        finalCategory = mapCategory(`${data.name} ${data.brand || ""}`);
      }

      return {
        name: data.name,
        category: finalCategory,
        quantity: typeof data.quantity === "number" ? data.quantity : 1,
        unit: normalizeUnit(data.unit || "piece"),
        cost_per_unit: typeof data.cost_per_unit === "number" ? data.cost_per_unit : null,
        brand: data.brand || null,
        barcode: clean,
        source: data.source || "gemini",
      };
    }
  } catch (edgeErr) {
    console.warn("lookup-barcode Edge Function failed, trying direct client lookup:", edgeErr);
  }

  // 2. Direct client fallback via Open Food Facts (for standard 8-14 digit barcodes)
  if (/^\d{8,14}$/.test(clean)) {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${clean}.json`, {
        headers: { "User-Agent": "TastyBiteHarbor/1.0" },
      });
      if (res.ok) {
        const off = await res.json();
        if (off.status === 1 && off.product) {
          const p = off.product;
          const name = p.product_name || p.product_name_en || (p.brands ? `${p.brands} Product` : null);
          if (name) {
            let qty = 1;
            let rawUnit = "piece";
            if (p.product_quantity) {
              const parsed = parseFloat(p.product_quantity);
              if (!isNaN(parsed) && parsed > 0) qty = parsed;
            }
            if (p.product_quantity_unit) {
              rawUnit = String(p.product_quantity_unit);
            }
            return {
              name,
              category: mapCategory(p.categories || p.categories_tags?.join(" ") || ""),
              quantity: qty,
              unit: normalizeUnit(rawUnit),
              cost_per_unit: null,
              brand: p.brands || null,
              barcode: clean,
              source: "openfoodfacts",
            };
          }
        }
      }
    } catch (offErr) {
      console.warn("Direct OpenFoodFacts client lookup error:", offErr);
    }
  }

  return null;
}
