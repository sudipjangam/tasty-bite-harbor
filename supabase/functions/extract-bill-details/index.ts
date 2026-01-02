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
    console.log("extract-bill-details function called");
    const { image } = await req.json();

    if (!image) {
      console.error("No image data provided");
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
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
    
    // Extract base64 data (remove data URL prefix if present)
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    
    // Detect mime type from data URL or default to jpeg
    let mimeType = "image/jpeg";
    if (image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);/);
      if (match) {
        mimeType = match[1];
      }
    }
    
    console.log(`Processing image with mimeType: ${mimeType}, base64 length: ${base64Data.length}`);
    
    const prompt = `You are an expert OCR and data extraction system. Analyze this restaurant bill/invoice image carefully and extract ALL the following details.

IMPORTANT INSTRUCTIONS:
1. Read the image thoroughly - look for vendor/supplier name, address, and contact details at the header
2. Find the invoice/bill number and date
3. Extract EVERY line item with its quantity, unit, rate/price, and amount
4. Calculate or find the total amount

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "vendor": {
    "name": "supplier/vendor name or null",
    "address": "full address or null",
    "mobile": "phone number or null",
    "email": "email or null"
  },
  "invoice": {
    "number": "invoice number or null",
    "date": "YYYY-MM-DD or null"
  },
  "items": [
    {
      "item_name": "item name/description",
      "quantity": number,
      "unit": "kg/pcs/box/ltr/etc",
      "rate": number,
      "amount": number
    }
  ],
  "grand_total": number or null
}

If you cannot read a value clearly, use null for that field. For items array, include all items you can identify.`;

    console.log("Sending request to Gemini API...");
    
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { 
              inlineData: { 
                mimeType: mimeType, 
                data: base64Data 
              } 
            },
            { text: prompt }
          ]
        }
      ]
    });

    console.log("Received response from Gemini");
    
    // Access the text property (not a function in this SDK version)
    const text = response.text;
    
    if (!text) {
      console.error("Gemini response has no text content:", JSON.stringify(response));
      throw new Error("Gemini returned empty response");
    }
    
    console.log("Raw Gemini response text:", text.substring(0, 500));

    // Clean up markdown code blocks if present
    let jsonStr = text.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    
    console.log("Cleaned JSON string:", jsonStr.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError.message);
      console.error("JSON string was:", jsonStr);
      throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}`);
    }
    
    console.log("Successfully parsed bill data:", JSON.stringify(data));

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing bill:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        details: error.stack || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
