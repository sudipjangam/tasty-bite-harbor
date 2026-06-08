import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure user has admin rights (e.g. check platform_config or specific role)
    // For now relying on RLS/App logic, but you might want tighter security for edge functions

    const { data: configData, error: configError } = await supabaseClient
      .from("platform_config")
      .select("value")
      .eq("key", "whatsapp")
      .single();

    if (configError || !configData) {
      throw new Error("Failed to load platform whatsapp config");
    }

    const metaConfig = configData.value.meta_config;
    if (!metaConfig || !metaConfig.business_account_id || !metaConfig.access_token) {
      throw new Error("Meta Cloud API not fully configured. Missing business ID or token.");
    }

    const WABA_ID = metaConfig.business_account_id;
    const META_TOKEN = metaConfig.access_token;
    const API_VERSION = "v19.0";
    const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates`;

    if (req.method === "GET") {
      // List templates
      const response = await fetch(`${BASE_URL}?limit=100`, {
        headers: { Authorization: `Bearer ${META_TOKEN}` },
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      // Create template
      const payload = await req.json();

      // Fix language codes — Meta requires specific format (en → en_US, etc.)
      const LANG_MAP: Record<string, string> = {
        en: "en_US",
        hi: "hi",
        mr: "mr",
        gu: "gu",
        ta: "ta",
        te: "te",
        kn: "kn",
        bn: "bn",
        ml: "ml",
        pa: "pa",
        ur: "ur",
      };
      if (payload.language && LANG_MAP[payload.language]) {
        payload.language = LANG_MAP[payload.language];
      } else if (payload.language && !payload.language.includes("_")) {
        // Fallback: if 2-letter code without mapping, default to en_US
        console.warn(`Unknown language code: ${payload.language}, defaulting to en_US`);
        payload.language = "en_US";
      }

      // Sanitize HEADER components — Meta TEXT headers cannot have emojis, *, newlines
      if (payload.components && Array.isArray(payload.components)) {
        for (const comp of payload.components) {
          if (comp.type === "HEADER" && comp.format === "TEXT" && comp.text) {
            // Strip emojis (Unicode emoji ranges)
            comp.text = comp.text
              .replace(/[\u{1F600}-\u{1F64F}]/gu, "")  // Emoticons
              .replace(/[\u{1F300}-\u{1F5FF}]/gu, "")  // Misc Symbols & Pictographs
              .replace(/[\u{1F680}-\u{1F6FF}]/gu, "")  // Transport & Map
              .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")  // Flags
              .replace(/[\u{2600}-\u{26FF}]/gu, "")     // Misc symbols
              .replace(/[\u{2700}-\u{27BF}]/gu, "")     // Dingbats
              .replace(/[\u{FE00}-\u{FE0F}]/gu, "")     // Variation Selectors
              .replace(/[\u{1F900}-\u{1F9FF}]/gu, "")   // Supplemental Symbols
              .replace(/[\u{1FA00}-\u{1FA6F}]/gu, "")   // Chess Symbols
              .replace(/[\u{1FA70}-\u{1FAFF}]/gu, "")   // Symbols Extended-A
              .replace(/[\u{200D}]/gu, "")               // Zero Width Joiner
              .replace(/\*/g, "")                        // Asterisks (bold formatting)
              .replace(/\n/g, " ")                       // Newlines
              .replace(/\s{2,}/g, " ")                   // Multiple spaces
              .trim();
          }
        }
      }

      console.log("Meta Template Payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${META_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      console.log("Meta Response:", JSON.stringify(data, null, 2));

      // Return with success flag for easier client-side detection
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: response.ok ? 200 : response.status,
      });
    }

    if (req.method === "DELETE") {
      // Delete template
      const { searchParams } = new URL(req.url);
      const name = searchParams.get("name");
      if (!name) throw new Error("Missing template name");

      const response = await fetch(`${BASE_URL}?name=${name}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${META_TOKEN}` },
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Meta Template Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
