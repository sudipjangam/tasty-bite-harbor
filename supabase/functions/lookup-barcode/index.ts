import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "https://esm.sh/@google/genai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function mapCategory(raw: string): string {
  const l = raw.toLowerCase();
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { barcode, image } = await req.json();

    if (!barcode && !image) {
      return new Response(
        JSON.stringify({ error: 'Barcode or image is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const cleanBarcode = barcode ? String(barcode).trim() : "";

    // 1. If standard EAN/UPC barcode, try Open Food Facts first (fast, free)
    if (cleanBarcode && /^\d{8,14}$/.test(cleanBarcode)) {
      try {
        const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`, {
          headers: { 'User-Agent': 'TastyBiteHarbor/1.0 (inventory-system)' }
        });
        if (offRes.ok) {
          const offData = await offRes.json();
          if (offData.status === 1 && offData.product) {
            const p = offData.product;
            const name = p.product_name || p.product_name_en || (p.brands ? `${p.brands} Product` : null);
            if (name) {
              let qty = 1;
              let unit = "pcs";
              if (p.product_quantity) {
                qty = parseFloat(p.product_quantity) || 1;
              }
              if (p.product_quantity_unit) {
                const u = String(p.product_quantity_unit).toLowerCase();
                if (['kg', 'g', 'l', 'ml', 'pcs', 'pack', 'bottle', 'box'].includes(u)) {
                  unit = u;
                }
              }

              return new Response(
                JSON.stringify({
                  source: "openfoodfacts",
                  name,
                  category: mapCategory(p.categories || p.categories_tags?.join(" ") || ""),
                  quantity: qty,
                  unit,
                  cost_per_unit: null,
                  brand: p.brands || null,
                  barcode: cleanBarcode
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
              );
            }
          }
        }
      } catch (offErr) {
        console.warn("OpenFoodFacts lookup failed, falling back to Gemini:", offErr);
      }
    }

    // 2. Use Gemini AI for SKUs (e.g. 1279IN), non-standard barcodes, or when image is provided
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const genAI = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert product identification and restaurant inventory AI.
Identify the commercial product, grocery item, ingredient, food product, nutritional supplement, or beverage associated with this barcode or SKU code: "${cleanBarcode}".
Note: Many products in India use manufacturer SKU codes (for example: Herbalife SKU 1279 / 1279IN is "Herbalife Dinoshake Chocolicious / Chocolate Flavor 200g", MRP ~₹290).

Return ONLY a valid JSON object (no markdown, no backticks, no extra text):
{
  "name": "Full product name (e.g. Herbalife Dinoshake Chocolate 200g, Amul Butter 500g, Tata Salt 1kg, etc.)",
  "category": "One of: Vegetables, Fruits, Groceries, Meat & Seafood, Dairy, Beverages, Spices, Bakery, Other",
  "quantity": numeric quantity number (e.g. 200 for 200g, 500 for 500g, 1 for 1kg or 1L or 1 bottle),
  "unit": "One of: kg, g, l, ml, pcs, box, pack, bottle, can",
  "cost_per_unit": numeric estimated price or MRP in INR if known, or null,
  "brand": "Brand name or manufacturer or null"
}`;

    const contents: any[] = [];
    if (image) {
      const base64Data = image.includes(',') ? image.split(',')[1] : image;
      let mimeType = "image/jpeg";
      if (image.startsWith("data:")) {
        const m = image.match(/^data:([^;]+);/);
        if (m) mimeType = m[1];
      }
      contents.push({
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ]
      });
    } else {
      contents.push({
        role: "user",
        parts: [{ text: prompt }]
      });
    }

    let response;
    try {
      response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
      });
    } catch {
      response = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
      });
    }

    const text = response.text || "";
    const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);

    return new Response(
      JSON.stringify({
        source: "gemini",
        name: parsed.name || "Scanned Product",
        category: parsed.category || "Other",
        quantity: typeof parsed.quantity === 'number' ? parsed.quantity : 1,
        unit: parsed.unit || "pcs",
        cost_per_unit: typeof parsed.cost_per_unit === 'number' ? parsed.cost_per_unit : null,
        brand: parsed.brand || null,
        barcode: cleanBarcode
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    console.error("Barcode lookup failed:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to lookup barcode" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
