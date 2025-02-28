
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Access environment variables instead of hardcoding
const BASE_URL = Deno.env.get("BASE_URL") || "https://api.sree.shop/v1";
const API_KEY = Deno.env.get("API_KEY") || "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    console.log("Received chat request with messages:", messages);
    console.log("Using BASE_URL:", BASE_URL);

    // Check if API key is available
    if (!API_KEY) {
      console.error("API_KEY is not set");
      throw new Error("API key is not configured");
    }

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant for restaurant owners using a restaurant management dashboard. Provide concise, helpful answers related to restaurant management, menu optimization, inventory, staff scheduling, and analytics. Always be respectful and professional.'
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API response error:", response.status, errorData);
      throw new Error(`API request failed with status ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    console.log("API response successfully received");

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-with-ai function:', error);
    
    // Return a more detailed error message
    return new Response(JSON.stringify({ 
      error: error.message,
      message: "Failed to process your request. Please check the Edge Function logs."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
