
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    console.log("chat-with-gemini function called");
    const requestData = await req.json();
    const { messages, restaurantId } = requestData;

    if (!messages || !Array.isArray(messages)) {
      console.error("Invalid messages format");
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get Gemini API key from environment variables
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log("Gemini API Key available:", !!geminiApiKey);

    // If Gemini API key is not set, forward to the original chat-with-api function
    if (!geminiApiKey) {
      console.log("GEMINI_API_KEY not found, forwarding to chat-with-api function");
      
      const forwardResponse = await fetch(
        new URL("/functions/v1/chat-with-api", req.url).toString(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || '',
          },
          body: JSON.stringify(requestData)
        }
      );
      
      return forwardResponse;
    }

    // If we have a Gemini API key, proceed with Gemini API
    console.log("Using Gemini API for chat completion");

    let restaurantData = null;
    
    // Create Supabase client with service role key for database access
    if (restaurantId && supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        console.log(`Fetching data for restaurant ID: ${restaurantId}`);
        
        // Fetch restaurant data for context
        const [
          { data: revenueStats },
          { data: customerInsights },
          { data: recentOrders },
          { data: menuItems },
          { data: inventoryItems }
        ] = await Promise.all([
          supabase.from("daily_revenue_stats").select("*")
            .eq("restaurant_id", restaurantId)
            .order("date", { ascending: false })
            .limit(30),
          supabase.from("customer_insights").select("*")
            .eq("restaurant_id", restaurantId)
            .order("total_spent", { ascending: false })
            .limit(50),
          supabase.from("orders").select("*")
            .eq("restaurant_id", restaurantId)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase.from("menu_items").select("*")
            .eq("restaurant_id", restaurantId),
          supabase.from("inventory_items").select("*")
            .eq("restaurant_id", restaurantId)
        ]);
        
        restaurantData = {
          revenueStats: revenueStats || [],
          customerInsights: customerInsights || [],
          recentOrders: recentOrders || [],
          menuItems: menuItems || [],
          inventoryItems: inventoryItems || [],
        };
        
        console.log(`Successfully fetched restaurant data. Found ${revenueStats?.length || 0} revenue records, ${recentOrders?.length || 0} orders, ${inventoryItems?.length || 0} inventory items`);
      } catch (error) {
        console.error("Error fetching restaurant data:", error);
      }
    }

    // Check if any message contains a file URL
    const hasFileForAnalysis = messages.some(msg => 
      typeof msg.content === 'string' && 
      (msg.content.includes('.xlsx') || 
       msg.content.includes('.csv') || 
       msg.content.includes('.pdf') || 
       msg.content.includes('image'))
    );

    let systemPrompt = "You are a restaurant assistant bot that provides SPECIFIC DATA-DRIVEN ANSWERS based on the restaurant's actual database records. You must ALWAYS analyze the provided restaurant data for insights rather than providing generic information. When asked about sales, inventory, customers, etc., respond with precise numbers and specifics from the data you have access to. DO NOT provide generic overviews that could apply to any restaurant.";
    
    if (restaurantData) {
      systemPrompt += " You have direct access to the restaurant's database records. Analyze this specific data carefully and provide precise insights. Format your responses in a visually appealing way with proper spacing, bullet points, and sections where appropriate. Be sure to use actual numbers and metrics from the data provided.";
      
      // Flag for empty data
      const hasNoData = 
        (!restaurantData.inventoryItems || restaurantData.inventoryItems.length === 0) &&
        (!restaurantData.revenueStats || restaurantData.revenueStats.length === 0) &&
        (!restaurantData.recentOrders || restaurantData.recentOrders.length === 0);
      
      if (hasNoData) {
        systemPrompt += " Note: There appears to be no data for this restaurant yet. If the user asks about their specific data, kindly mention that there is no data available yet and suggest they add some inventory items, complete some orders, etc.";
      }
    } else {
      systemPrompt += " WARNING: I don't have access to your restaurant data at the moment. Please ensure your restaurant ID is properly configured in your profile settings.";
    }
    
    if (hasFileForAnalysis) {
      systemPrompt += " When provided with data files like images, CSV, Excel, or PDF files, analyze them and provide insights and recommendations for the restaurant owner. For Excel/CSV files, assume they contain restaurant data like sales, inventory, or customer information and provide relevant analysis.";
    }

    // Prepare user messages for Gemini format
    const userMessages = messages.map(msg => {
      return {
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      };
    });

    // Add system prompt as a "model" message at the beginning
    userMessages.unshift({
      role: "model",
      parts: [{ text: systemPrompt }]
    });

    // If we have restaurant data, add it as context
    if (restaurantData) {
      userMessages.splice(1, 0, {
        role: "model",
        parts: [{ text: `Here is the restaurant's actual database records to inform your answers. When giving sales overviews or inventory analysis, ALWAYS use this specific data:
        
INVENTORY ITEMS (${restaurantData.inventoryItems?.length || 0} items):
${JSON.stringify(restaurantData.inventoryItems, null, 2)}

REVENUE STATS (last 30 days):
${JSON.stringify(restaurantData.revenueStats, null, 2)}

RECENT ORDERS (last 50):
${JSON.stringify(restaurantData.recentOrders, null, 2)}

CUSTOMER INSIGHTS (top 50 by spending):
${JSON.stringify(restaurantData.customerInsights, null, 2)}

MENU ITEMS:
${JSON.stringify(restaurantData.menuItems, null, 2)}

ALWAYS base your answers on this specific data. When asked for a sales overview, calculate totals, trends, and metrics from the REVENUE STATS and ORDERS data. When asked about inventory, analyze the actual INVENTORY ITEMS data. Your answers should NEVER be generic - they should directly reflect the numbers and patterns in this data.` }]
      });
    }

    console.log("Preparing to call Gemini API");
    console.log(`API URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey ? "[API KEY PRESENT]" : "[API KEY MISSING]"}`);

    // Make the API request to Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: userMessages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        }
      })
    });

    console.log("Gemini API response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: Status ${response.status}`, errorText);
      throw new Error(`Gemini API returned error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Received successful Gemini API response:', JSON.stringify(data).substring(0, 100) + "...");

    // Format the response to match our expected format
    const formattedResponse = {
      choices: [
        {
          message: {
            role: "assistant",
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response at this time."
          }
        }
      ]
    };

    return new Response(
      JSON.stringify(formattedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in chat-with-gemini function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred during chat request',
        details: error.stack,
        choices: [
          {
            message: {
              role: "assistant",
              content: "I'm sorry, I encountered an error processing your request with Gemini. Please try again or contact support if the issue persists."
            }
          }
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
