
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
    const requestData = await req.json();
    const { messages, restaurantId } = requestData;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get API key and base URL from environment variables
    const apiKey = Deno.env.get('API_KEY');
    const baseUrl = Deno.env.get('BASE_URL') || 'https://api.sree.shop/v1';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apiKey) {
      console.error("API_KEY environment variable is not set");
      return new Response(
        JSON.stringify({ error: 'API key is not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

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

    // Create the payload for the API request
    const payload = {
      model: "gpt-4o", // Explicitly set to gpt-4o
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...messages
      ]
    };

    // Add context data if available
    if (restaurantData) {
      // Add a hidden context message with the restaurant data
      payload.messages.splice(1, 0, {
        role: "system",
        content: `Here is the restaurant's actual database records to inform your answers. When giving sales overviews or inventory analysis, ALWAYS use this specific data:
        
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

ALWAYS base your answers on this specific data. When asked for a sales overview, calculate totals, trends, and metrics from the REVENUE STATS and ORDERS data. When asked about inventory, analyze the actual INVENTORY ITEMS data. Your answers should NEVER be generic - they should directly reflect the numbers and patterns in this data.`
      });
    }

    console.log("Sending API request with restaurant data included in context");

    // Make the API request to your custom server
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error: Status ${response.status}`, errorText);
      throw new Error(`API returned error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Received successful API response');

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in chat function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred during chat request',
        details: error.stack,
        choices: [
          {
            message: {
              role: "assistant",
              content: "I'm sorry, I encountered an error processing your request. Please try again or contact support if the issue persists."
            }
          }
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
