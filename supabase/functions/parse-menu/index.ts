import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "https://esm.sh/@google/genai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("parse-menu edge function called");
    
    // Check authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error("No authorization token provided");
      return new Response(
        JSON.stringify({ error: 'Unauthorized - valid authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { text, images } = await req.json();

    if (!text && (!images || !Array.isArray(images) || images.length === 0)) {
      console.error("No text or image data provided");
      return new Response(
        JSON.stringify({ error: 'No text or image data provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("GEMINI_API_KEY environment variable is not set");
      return new Response(
        JSON.stringify({ error: 'Gemini API key is not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log("Initializing GoogleGenAI...");
    const genAI = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are a professional restaurant menu extraction assistant.
Your task is to parse the user's input (which could be unstructured text list or one or more images of a restaurant menu) and extract all menu items.

For each menu item, extract:
1. "name" (string): Clean name of the item. e.g. "Paneer Tikka".
2. "description" (string): Appetizing description of the item. If the menu doesn't provide one, generate a brief, enticing 1-sentence description based on the name.
3. "category" (string): The category of the item (e.g., "Starters", "Soups", "Chinese Rice", "Maggies", "Desserts", "Milkshakes", etc.). Group items logically under clean category names.
4. "price" (number): The base price of the item. If the item has Half and Full sizes or other size variants, set "price" to the cheapest/base price (e.g. Half price).
5. "is_veg" (boolean): True if the item is clearly vegetarian/vegan/green dot, false otherwise. If unclear, classify based on standard ingredients (e.g. paneer, potato, mushroom, cheese, veg, dal, rice, roti are vegetarian; chicken, mutton, egg, fish, pork, meat, prawn are non-vegetarian).
6. "is_special" (boolean): True if marked as chef special, signature, popular, or starred; otherwise false.
7. "variants" (array of objects): If the item has size/portion variants (e.g. Half and Full, or Small/Medium/Large), extract them as objects with:
   - "name" (string): e.g., "Half" or "Full".
   - "price" (number): The price for that size.
   If there are no variants, return an empty array [].

Response format:
You MUST respond with a single valid JSON object of the following format, with NO markdown formatting, NO HTML tags, NO backticks, and NO extra text:
{
  "items": [
    {
      "name": "Veg Hakka Noodles",
      "description": "Stir-fried noodles with crisp vegetables and savory seasonings.",
      "category": "Chinese Noodles",
      "price": 120,
      "is_veg": true,
      "is_special": false,
      "variants": [
        { "name": "Half", "price": 120 },
        { "name": "Full", "price": 200 }
      ]
    }
  ]
}
`;

    const parts: any[] = [];

    if (text) {
      parts.push({ text: `Raw menu text to extract:\n${text}` });
    }

    if (images && Array.isArray(images)) {
      console.log(`Processing ${images.length} images...`);
      for (const img of images) {
        if (typeof img !== 'string') continue;
        const base64Data = img.includes(',') ? img.split(',')[1] : img;
        
        let mimeType = "image/jpeg";
        if (img.startsWith("data:")) {
          const match = img.match(/^data:([^;]+);/);
          if (match) {
            mimeType = match[1];
          }
        }
        
        console.log(`Adding image part with MIME type: ${mimeType}`);
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      }
    }

    const contents = [
      {
        role: "user",
        parts: parts
      }
    ];

    console.log("Calling Gemini 3.5 Flash...");
    const response = await genAI.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        }
      }
    });

    console.log("Received response from Gemini");
    let textContent = response.text || "";
    
    // Clean up potential markdown formatting
    textContent = textContent.trim();
    if (textContent.startsWith("```json")) {
      textContent = textContent.substring(7);
    } else if (textContent.startsWith("```")) {
      textContent = textContent.substring(3);
    }
    if (textContent.endsWith("```")) {
      textContent = textContent.substring(0, textContent.length - 3);
    }
    textContent = textContent.trim();

    console.log("Raw Gemini response (first 200 chars):", textContent.substring(0, 200));

    // Try parsing to validate it is correct JSON
    const parsedData = JSON.parse(textContent);

    return new Response(
      JSON.stringify(parsedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error in parse-menu edge function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
