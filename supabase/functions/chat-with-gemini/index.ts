import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    console.log("chat-with-gemini function called");
    const requestData = await req.json();
    const { messages, restaurantId, analysisType, days } = requestData;

    if (!messages || !Array.isArray(messages)) {
      console.error("Invalid messages format");
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apiKey) {
      console.error("GEMINI_API_KEY environment variable is not set");
      return new Response(
        JSON.stringify({ error: 'Gemini API key is not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    let restaurantData = null;
    
    if (restaurantId && supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        console.log(`Fetching data for restaurant ID: ${restaurantId}`);
        
        const [
          { data: revenueStats },
          { data: customerInsights },
          { data: recentOrders },
          { data: menuItems },
          { data: inventoryItems },
          { data: rooms },
          { data: reservations },
          { data: staff },
          { data: restaurantTables },
          { data: suppliers },
          { data: supplierOrders },
          { data: supplierOrderItems },
          { data: roomFoodOrders },
          { data: roomBillings },
          { data: promotionCampaigns },
          { data: sentPromotions },
          { data: staffLeaves },
          { data: notificationPreferences },
          { data: subscriptionPlans },
          { data: restaurantDetails },
          { data: restaurantSubscriptions }
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
            .eq("restaurant_id", restaurantId),
            
          supabase.from("rooms").select("*")
            .eq("restaurant_id", restaurantId),
          supabase.from("reservations").select("*")
            .eq("restaurant_id", restaurantId)
            .order("start_time", { ascending: false })
            .limit(30),
            
          supabase.from("staff").select("*")
            .eq("restaurant_id", restaurantId),
          supabase.from("restaurant_tables").select("*")
            .eq("restaurant_id", restaurantId),
            
          supabase.from("suppliers").select("*")
            .eq("restaurant_id", restaurantId),
          supabase.from("supplier_orders").select("*")
            .eq("restaurant_id", restaurantId)
            .order("order_date", { ascending: false })
            .limit(20),
          supabase.from("supplier_order_items").select("*")
            .limit(50),
            
          supabase.from("room_food_orders").select("*")
            .eq("restaurant_id", restaurantId)
            .order("created_at", { ascending: false })
            .limit(30),
          supabase.from("room_billings").select("*")
            .eq("restaurant_id", restaurantId)
            .order("checkout_date", { ascending: false })
            .limit(30),
            
          supabase.from("promotion_campaigns").select("*")
            .eq("restaurant_id", restaurantId),
          supabase.from("sent_promotions").select("*")
            .eq("restaurant_id", restaurantId)
            .order("sent_date", { ascending: false })
            .limit(30),
            
          supabase.from("staff_leaves").select("*")
            .eq("restaurant_id", restaurantId)
            .order("start_date", { ascending: false })
            .limit(20),
          supabase.from("notification_preferences").select("*")
            .eq("restaurant_id", restaurantId)
            .single(),
          supabase.from("subscription_plans").select("*"),
            
          supabase.from("restaurants").select("*")
            .eq("id", restaurantId)
            .single(),
          supabase.from("restaurant_subscriptions").select("*")
            .eq("restaurant_id", restaurantId)
        ]);
        
        restaurantData = {
          revenueStats: revenueStats || [],
          customerInsights: customerInsights || [],
          recentOrders: recentOrders || [],
          menuItems: menuItems || [],
          inventoryItems: inventoryItems || [],
          
          rooms: rooms || [],
          reservations: reservations || [],
          
          staff: staff || [],
          restaurantTables: restaurantTables || [],
          
          suppliers: suppliers || [],
          supplierOrders: supplierOrders || [],
          supplierOrderItems: supplierOrderItems || [],
          
          roomFoodOrders: roomFoodOrders || [],
          roomBillings: roomBillings || [],
          
          promotionCampaigns: promotionCampaigns || [],
          sentPromotions: sentPromotions || [],
          
          staffLeaves: staffLeaves || [],
          notificationPreferences: notificationPreferences || {},
          subscriptionPlans: subscriptionPlans || [],
          
          restaurantDetails: restaurantDetails || {},
          restaurantSubscriptions: restaurantSubscriptions || []
        };
        
        console.log(`Successfully fetched restaurant data from all tables. Found ${revenueStats?.length || 0} revenue records, ${recentOrders?.length || 0} orders, ${inventoryItems?.length || 0} inventory items, ${rooms?.length || 0} rooms, ${staff?.length || 0} staff members, etc.`);
      } catch (error) {
        console.error("Error fetching restaurant data:", error);
      }
    }

    if (analysisType && restaurantData) {
      console.log(`Processing ${analysisType} request`);
      
      if (analysisType === 'sales_forecast') {
        return await handleSalesForecast(apiKey, restaurantData, days || 7, corsHeaders);
      }
      
      if (analysisType === 'inventory_recommendations') {
        return await handleInventoryRecommendations(apiKey, restaurantData, corsHeaders);
      }
    }

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

    let restaurantDataContext = "";
    if (restaurantData) {
      restaurantDataContext = `Here is the restaurant's actual database records to inform your answers. When giving sales overviews or inventory analysis, ALWAYS use this specific data:
        
INVENTORY ITEMS (${restaurantData.inventoryItems?.length || 0} items):
${JSON.stringify(restaurantData.inventoryItems.slice(0, 10), null, 2)}

REVENUE STATS (last 10 days):
${JSON.stringify(restaurantData.revenueStats.slice(0, 10), null, 2)}

RECENT ORDERS (last 10):
${JSON.stringify(restaurantData.recentOrders.slice(0, 10), null, 2)}

CUSTOMER INSIGHTS (top 10 by spending):
${JSON.stringify(restaurantData.customerInsights.slice(0, 10), null, 2)}

MENU ITEMS (first 10):
${JSON.stringify(restaurantData.menuItems.slice(0, 10), null, 2)}

ROOMS (first 10):
${JSON.stringify(restaurantData.rooms?.slice(0, 10), null, 2)}

RESERVATIONS (last 10):
${JSON.stringify(restaurantData.reservations?.slice(0, 10), null, 2)}

STAFF MEMBERS (first 10):
${JSON.stringify(restaurantData.staff?.slice(0, 10), null, 2)}

RESTAURANT TABLES (first 10):
${JSON.stringify(restaurantData.restaurantTables?.slice(0, 10), null, 2)}

SUPPLIER INFORMATION (first 5):
${JSON.stringify(restaurantData.suppliers?.slice(0, 5), null, 2)}

RECENT SUPPLIER ORDERS (last 5):
${JSON.stringify(restaurantData.supplierOrders?.slice(0, 5), null, 2)}

ROOM FOOD ORDERS (last 5):
${JSON.stringify(restaurantData.roomFoodOrders?.slice(0, 5), null, 2)}

RECENT ROOM BILLINGS (last 5):
${JSON.stringify(restaurantData.roomBillings?.slice(0, 5), null, 2)}

PROMOTION CAMPAIGNS (first 5):
${JSON.stringify(restaurantData.promotionCampaigns?.slice(0, 5), null, 2)}

RECENT SENT PROMOTIONS (last 5):
${JSON.stringify(restaurantData.sentPromotions?.slice(0, 5), null, 2)}

STAFF LEAVES (last 5):
${JSON.stringify(restaurantData.staffLeaves?.slice(0, 5), null, 2)}

NOTIFICATION PREFERENCES:
${JSON.stringify(restaurantData.notificationPreferences, null, 2)}

RESTAURANT DETAILS:
${JSON.stringify(restaurantData.restaurantDetails, null, 2)}

RESTAURANT SUBSCRIPTION:
${JSON.stringify(restaurantData.restaurantSubscriptions?.slice(0, 1), null, 2)}

ALWAYS base your answers on this specific data. When asked for a sales overview, calculate totals, trends, and metrics from the REVENUE STATS and ORDERS data. When asked about inventory, analyze the actual INVENTORY ITEMS data. Your answers should NEVER be generic - they should directly reflect the numbers and patterns in this data.`;
    }

    if (messages.some(msg => 
        msg.content.toLowerCase().includes('predict') || 
        msg.content.toLowerCase().includes('forecast') ||
        msg.content.toLowerCase().includes('future sales')
    )) {
      systemPrompt += " When asked for predictions, forecasts, or future insights, use statistical methods on the historical data to provide informed predictions. Consider trends, seasonality, and day-of-week patterns.";
    }

    const payload = {
      contents: [],
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt + (restaurantDataContext ? "\n\n" + restaurantDataContext : "") }]
      }
    };

    for (const message of messages) {
      payload.contents.push({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }]
      });
    }

    console.log("Sending request to Gemini API with proper format");

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: Status ${response.status}`, errorText);
      throw new Error(`Gemini API returned error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Received successful Gemini API response");
    
    const formattedResponse = {
      choices: [
        {
          message: {
            role: "assistant",
            content: data.candidates[0].content.parts[0].text
          }
        }
      ]
    };

    return new Response(
      JSON.stringify(formattedResponse),
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

async function handleSalesForecast(apiKey, restaurantData, days, corsHeaders) {
  console.log(`Generating sales forecast for ${days} days`);
  
  try {
    const revenueData = restaurantData.revenueStats.slice(0, 30).map(item => ({
      date: item.date,
      revenue: item.total_revenue,
      orders: item.order_count
    }));
    
    const prompt = `
You are a data analyst for a restaurant. Based on the following historical daily revenue data, generate a sales forecast for the next ${days} days.

Historical revenue data (from most recent to oldest):
${JSON.stringify(revenueData, null, 2)}

Please provide your response in the following JSON format:
{
  "predictions": {
    "sales_forecast": [
      {
        "date": "YYYY-MM-DD",
        "predicted_revenue": number,
        "confidence": number,
        "factors": ["factor1", "factor2", ...]
      },
      ...
    ]
  }
}

The response must be properly formatted JSON ONLY, with no additional text or explanations. Use date format YYYY-MM-DD.
Base your forecast on trends, patterns, seasonality, and day-of-week effects visible in the historical data.
For each prediction, include a confidence level (0-100) and the key factors that influenced the prediction.
`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error for sales forecast: Status ${response.status}`, errorText);
      throw new Error(`Gemini API returned error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Received successful Gemini API forecast response");
    
    try {
      const textContent = data.candidates[0].content.parts[0].text;
      const jsonContent = textContent.replace(/```json|```/g, '').trim();
      const forecastData = JSON.parse(jsonContent);
      
      return new Response(
        JSON.stringify(forecastData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (jsonError) {
      console.error("Error parsing forecast JSON:", jsonError);
      console.log("Raw response:", data.candidates[0].content.parts[0].text);
      throw new Error("Could not parse forecast data from API response");
    }
  } catch (error) {
    console.error('Error generating sales forecast:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred during forecast generation',
        predictions: { sales_forecast: [] }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
}

async function handleInventoryRecommendations(apiKey, restaurantData, corsHeaders) {
  console.log("Generating inventory recommendations");
  
  try {
    const inventoryData = restaurantData.inventoryItems.map(item => ({
      id: item.id,
      name: item.name,
      current_quantity: item.quantity,
      reorder_level: item.reorder_level,
      unit: item.unit,
      category: item.category
    }));
    
    const recentOrders = restaurantData.recentOrders.slice(0, 30);
    
    const prompt = `
You are an inventory management expert for a restaurant. Based on the following inventory data and recent orders, provide recommendations for inventory restocking.

Current inventory:
${JSON.stringify(inventoryData, null, 2)}

Recent orders (last 30):
${JSON.stringify(recentOrders.slice(0, 5), null, 2)}
(${recentOrders.length} orders total)

Please provide your response in the following JSON format:
{
  "predictions": {
    "inventory_recommendations": [
      {
        "item_id": "uuid",
        "name": "item name",
        "current_stock": number,
        "recommended_order": number,
        "days_until_stockout": number,
        "reason": "explanation"
      },
      ...
    ]
  }
}

The response must be properly formatted JSON ONLY, with no additional text or explanations.
Focus on items that are below or close to their reorder levels.
Calculate a reasonable "days_until_stockout" estimate based on recent consumption patterns.
Provide a clear "reason" for each recommendation.
Sort the recommendations by urgency (items closest to stockout first).
Only include items that need attention - don't include items with sufficient stock.
`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error for inventory recommendations: Status ${response.status}`, errorText);
      throw new Error(`Gemini API returned error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Received successful Gemini API inventory recommendations response");
    
    try {
      const textContent = data.candidates[0].content.parts[0].text;
      const jsonContent = textContent.replace(/```json|```/g, '').trim();
      const recommendationsData = JSON.parse(jsonContent);
      
      return new Response(
        JSON.stringify(recommendationsData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (jsonError) {
      console.error("Error parsing inventory recommendations JSON:", jsonError);
      console.log("Raw response:", data.candidates[0].content.parts[0].text);
      throw new Error("Could not parse inventory recommendations from API response");
    }
  } catch (error) {
    console.error('Error generating inventory recommendations:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred during inventory analysis',
        predictions: { inventory_recommendations: [] }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
}
