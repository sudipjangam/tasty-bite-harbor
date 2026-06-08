import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "https://esm.sh/@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { prompt, language, restaurantName } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "prompt is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const languageName = language || "English";
    const restName = restaurantName || "the restaurant";

    const systemPrompt = `You are a WhatsApp Business Template expert for restaurants. Generate Meta-compliant WhatsApp message templates.

RULES:
- Body max 1024 characters
- Use {{variable_name}} format for variables (NOT {{1}}, {{2}})
- Available variables ONLY: customer_name, restaurant_name, amount, discount_code, order_date, contact_number
- Use emojis tastefully for visual appeal (2-4 per message, use attractive ones)
- Use bold (*text*) for emphasis on key points
- Keep messages professional yet warm, engaging, and premium feeling
- Do NOT use URL shorteners or raw URLs
- Footer is always "billed by Swadeshi Solutions" — do NOT include it in the body
- Determine category: MARKETING for promotional/offers/discounts, UTILITY for transactional/order updates/receipts/confirmations
- The restaurant is called "${restName}"

LANGUAGE: Write the template body in ${languageName}${languageName !== "English" ? `. Use proper ${languageName} script/unicode, NOT transliteration or romanized text.` : "."}

Return ONLY a valid JSON object (no markdown fences, no explanation) with this exact structure:
{
  "display_name": "Template Name in English",
  "category": "MARKETING" or "UTILITY",
  "header_text": "Short header with emoji (max 60 chars)",
  "body": "The full message body with {{variable_name}} placeholders",
  "variables": [
    {"name": "variable_name", "sample": "realistic sample value"}
  ],
  "category_reason": "One line reason why this category was chosen"
}`;

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Create a WhatsApp template for a restaurant: ${prompt}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      },
    });

    const text = response.text || "";

    // Try to parse JSON from response
    let parsed;
    try {
      // Strip markdown fences if present
      let jsonStr = text;
      const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) jsonStr = fenceMatch[1];
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      // Return raw text if JSON parse fails
      return new Response(
        JSON.stringify({ error: "AI returned invalid JSON", raw: text }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 422,
        }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
