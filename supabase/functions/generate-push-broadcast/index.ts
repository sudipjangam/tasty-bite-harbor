import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "https://esm.sh/@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { prompt, tone = "urgent", language = "English", audienceType = "all" } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured in Supabase secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an elite mobile push notification copywriter for "SwadeshiPOS", an Indian restaurant billing and POS software.
You write high-converting, attention-grabbing Android mobile push notifications sent to restaurant owners, chefs, and managers.

CONSTRAINTS (CRITICAL):
1. title: MAXIMUM 50 CHARACTERS. Must be punchy, catchy, and include 1-2 relevant emojis (e.g. ⚠️, ⏰, 🥳, 🎁, 🚀, 💰, 🔥).
2. body: MAXIMUM 140 CHARACTERS. Must be persuasive, direct, with high urgency or benefit.
3. You MAY use dynamic placeholders:
   - "{restaurant_name}" for partner outlet name
   - "{days_left}" for days remaining on subscription plan
4. action_url: Recommend the best deep-link:
   - "/subscription" for plans, pricing, renewals, cashback, payment offers
   - "/orders" for live order analytics, sales reports, peak hour alerts
   - "/menu" for dishes, prices, menu updates
   - "/settings" for system maintenance, backup, general announcements
5. Tone requested: ${tone} (urgent, promotional, friendly, or professional).
6. Target audience: ${audienceType} (expiring, expired, all partners, new feature).
7. Language requested: ${language}.
   - If "Hinglish": write in natural conversational Hindi using English/Latin script (e.g. "Sirf 3 din bache hain! ⏰ Plan renew karein aur ₹500 cashback payein 🥳").
   - If "Hindi": write in proper Hindi.
   - If "Marathi": write in proper Marathi.
   - If "English": write in crisp, professional Indian-market English.

Return ONLY a valid JSON object without markdown or code fences:
{
  "title": "Short title with emoji (<= 50 chars)",
  "body": "Persuasive body text (<= 140 chars)",
  "action_url": "/subscription",
  "summary": "Brief 1-sentence explanation of why this copy drives clicks"
}`;

    const ai = new GoogleGenAI({ apiKey });

    let text = "";
    const modelsToTry = ["gemini-3.5-flash-lite", "gemini-3.5-flash"];
    let lastErr: any = null;

    for (const model of modelsToTry) {
      try {
        console.log(`[AI Push] Attempting model: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [{ text: `Generate push notification for: ${prompt}` }],
            },
          ],
          config: {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            temperature: 0.7,
          },
        });
        text = response.text || "";
        if (text) {
          console.log(`[AI Push] Success with model: ${model}`);
          break;
        }
      } catch (err: any) {
        console.warn(`[AI Push] Model ${model} failed:`, err.message);
        lastErr = err;
      }
    }

    if (!text) {
      throw lastErr || new Error("All Gemini models failed to return content");
    }

    // Bulletproof JSON parsing with regex fallback
    let parsed: any;
    try {
      let jsonStr = text;
      const firstBrace = text.indexOf("{");
      const lastBrace = text.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = text.substring(firstBrace, lastBrace + 1);
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      const titleMatch = text.match(/"title"\s*:\s*"([^"]+)"/);
      const bodyMatch = text.match(/"body"\s*:\s*"([^"]+)"/);
      const actionMatch = text.match(/"action_url"\s*:\s*"([^"]+)"/);
      const summaryMatch = text.match(/"summary"\s*:\s*"([^"]+)"/);
      if (titleMatch && bodyMatch) {
        parsed = {
          title: titleMatch[1],
          body: bodyMatch[1],
          action_url: actionMatch ? actionMatch[1] : "/subscription",
          summary: summaryMatch ? summaryMatch[1] : "AI generated push notification",
        };
      } else {
        return new Response(
          JSON.stringify({ error: "AI returned non-parseable output", raw: text }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Strict length limits
    if (parsed.title && parsed.title.length > 50) {
      parsed.title = parsed.title.substring(0, 50);
    }
    if (parsed.body && parsed.body.length > 140) {
      parsed.body = parsed.body.substring(0, 140);
    }
    if (!parsed.action_url) {
      parsed.action_url = "/subscription";
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate push notification" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
