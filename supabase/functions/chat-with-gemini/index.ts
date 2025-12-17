import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "https://esm.sh/@google/genai";
import { 
  checkRateLimit, 
  createRateLimitResponse, 
  RATE_LIMITS,
  getRequestIdentifier 
} from "../_shared/rate-limit.ts";

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

  // Rate limiting check
  const authHeader = req.headers.get('authorization');
  const identifier = getRequestIdentifier(req, authHeader);
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.AI_CHAT);
  
  if (!rateLimitResult.allowed) {
    console.log(`Rate limit exceeded for ${identifier}`);
    return createRateLimitResponse(rateLimitResult, corsHeaders);
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!apiKey) {
      console.error("GEMINI_API_KEY environment variable is not set");
      return new Response(
        JSON.stringify({ error: 'Gemini API key is not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // SECURITY FIX: Extract user's token from Authorization header
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      console.error("No authorization token provided");
      return new Response(
        JSON.stringify({ error: 'Unauthorized - valid authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    let restaurantData = null;
    let verifiedRestaurantId: string | null = null;
    
    // SECURITY FIX: Create Supabase client with user's token (NOT service_role key)
    // This ensures RLS policies automatically enforce access control
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } }
        });

        // Validate the user's token and get user info
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error("Invalid or expired token:", userError?.message);
          return new Response(
            JSON.stringify({ error: 'Invalid or expired authentication token' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
          );
        }

        // Get user's restaurant_id from their profile (RLS ensures they only see their own)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('restaurant_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile?.restaurant_id) {
          console.error("User profile not found or no restaurant assigned:", profileError?.message);
          return new Response(
            JSON.stringify({ error: 'User profile not found or no restaurant assigned' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
          );
        }

        // Use verified restaurant_id from profile - IGNORE any restaurantId from request body
        verifiedRestaurantId = profile.restaurant_id;
        console.log(`Verified user ${user.id} belongs to restaurant: ${verifiedRestaurantId}`);
        
        console.log(`Fetching data for verified restaurant ID: ${verifiedRestaurantId}`);
        
        const [
          { data: revenueStats },
          { data: customerInsights },
          { data: recentOrders },
          { data: qsrOrders },
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
            .eq("restaurant_id", verifiedRestaurantId)
            .order("date", { ascending: false })
            .limit(400),
          supabase.from("customer_insights").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("total_spent", { ascending: false })
            .limit(50),
          supabase.from("orders").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase.from("orders").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .eq("source", "qsr")
            .order("created_at", { ascending: false })
            .limit(100),
          supabase.from("menu_items").select("*")
            .eq("restaurant_id", verifiedRestaurantId),
          supabase.from("inventory_items").select("*")
            .eq("restaurant_id", verifiedRestaurantId),
            
          supabase.from("rooms").select("*")
            .eq("restaurant_id", verifiedRestaurantId),
          supabase.from("reservations").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("start_time", { ascending: false })
            .limit(30),
            
          supabase.from("staff").select("*")
            .eq("restaurant_id", verifiedRestaurantId),
          supabase.from("restaurant_tables").select("*")
            .eq("restaurant_id", verifiedRestaurantId),
            
          supabase.from("suppliers").select("*")
            .eq("restaurant_id", verifiedRestaurantId),
          supabase.from("supplier_orders").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("order_date", { ascending: false })
            .limit(20),
          supabase.from("supplier_order_items").select("*")
            .limit(50),
            
          supabase.from("room_food_orders").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("created_at", { ascending: false })
            .limit(30),
          supabase.from("room_billings").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("checkout_date", { ascending: false })
            .limit(30),
            
          supabase.from("promotion_campaigns").select("*")
            .eq("restaurant_id", verifiedRestaurantId),
          supabase.from("sent_promotions").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("sent_date", { ascending: false })
            .limit(30),
            
          supabase.from("staff_leaves").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("start_date", { ascending: false })
            .limit(20),
          supabase.from("notification_preferences").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .single(),
          supabase.from("subscription_plans").select("*"),
            
          supabase.from("restaurants").select("*")
            .eq("id", verifiedRestaurantId)
            .single(),
          supabase.from("restaurant_subscriptions").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
        ]);
        
        restaurantData = {
          revenueStats: revenueStats || [],
          customerInsights: customerInsights || [],
          recentOrders: recentOrders || [],
          qsrOrders: qsrOrders || [],
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
        
        console.log(`Successfully fetched restaurant data from all tables. Found ${revenueStats?.length || 0} revenue records, ${recentOrders?.length || 0} orders, ${qsrOrders?.length || 0} QSR orders, ${inventoryItems?.length || 0} inventory items, ${rooms?.length || 0} rooms, ${staff?.length || 0} staff members, etc.`);
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
      systemPrompt += " You have direct access to the restaurant's database records, including comprehensive QSR POS data. Analyze this specific data carefully and provide precise insights. Format your responses in a visually appealing way with proper spacing, bullet points, and sections where appropriate. Be sure to use actual numbers and metrics from the data provided. The context may show samples, but you can rely on the precomputed KEY METRICS SUMMARY (MTD, QTD, YTD, last 60/90 days) for full-period insights. For QSR analysis, you can examine order patterns, popular items, peak hours, average order values, order status distribution (paid/held), and revenue trends specific to QSR operations.";
      
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
      // Compute key metrics on the full available history to enable MTD/QTD/YTD queries
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
        const revStats = (restaurantData.revenueStats || []);
        const sumRange = (start: Date) => {
          const filtered = revStats.filter((r: any) => {
            const dt = new Date(r.date);
            return dt >= start && dt <= now;
          });
          const totalRevenue = filtered.reduce((acc: number, r: any) => acc + (Number(r.total_revenue) || 0), 0);
          const orderCount = filtered.reduce((acc: number, r: any) => acc + (Number(r.order_count) || 0), 0);
          const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
          return { days: filtered.length, totalRevenue, orderCount, averageOrderValue };
        };
        const metricsSummary = {
          MTD: sumRange(startOfMonth),
          QTD: sumRange(startOfQuarter),
          YTD: sumRange(startOfYear),
          last_60_days: sumRange(daysAgo(60)),
          last_90_days: sumRange(daysAgo(90)),
        } as const;

        const metricsSummaryText = JSON.stringify(metricsSummary, null, 2);

        // Calculate QSR-specific metrics
        const qsrStats = restaurantData.qsrOrders || [];
        const qsrPaidOrders = qsrStats.filter((o: any) => o.status === 'paid');
        const qsrHeldOrders = qsrStats.filter((o: any) => o.status === 'held');
        const qsrTotalRevenue = qsrPaidOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
        const qsrAvgOrderValue = qsrPaidOrders.length > 0 ? qsrTotalRevenue / qsrPaidOrders.length : 0;
        
        const qsrMetrics = {
          totalOrders: qsrStats.length,
          paidOrders: qsrPaidOrders.length,
          heldOrders: qsrHeldOrders.length,
          totalRevenue: qsrTotalRevenue,
          averageOrderValue: qsrAvgOrderValue
        };

        restaurantDataContext = `Here is the restaurant's actual database records to inform your answers. When giving sales overviews or inventory analysis, ALWAYS use this specific data.

KEY METRICS SUMMARY (computed on full available history):
${metricsSummaryText}

QSR POS METRICS (from ${qsrStats.length} QSR orders):
${JSON.stringify(qsrMetrics, null, 2)}
  
INVENTORY ITEMS (${restaurantData.inventoryItems?.length || 0} items):
${JSON.stringify(restaurantData.inventoryItems.slice(0, 10), null, 2)}

REVENUE STATS (latest 10 shown; total available: ${revStats.length} days):
${JSON.stringify(revStats.slice(0, 10), null, 2)}

RECENT QSR ORDERS (last 20):
${JSON.stringify(qsrStats.slice(0, 20), null, 2)}

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

ALWAYS base your answers on this specific data. When asked for MTD, QTD, or YTD, use the KEY METRICS SUMMARY above. When asked for a sales overview, calculate totals, trends, and metrics from the full REVENUE STATS history. Your answers should NEVER be generic - they should directly reflect the numbers and patterns in this data.`;
      } catch (e) {
        console.error('Error computing metrics summary:', e);
      }
    }

    if (messages.some(msg => 
        msg.content.toLowerCase().includes('predict') || 
        msg.content.toLowerCase().includes('forecast') ||
        msg.content.toLowerCase().includes('future sales')
    )) {
      systemPrompt += " When asked for predictions, forecasts, or future insights, use statistical methods on the historical data to provide informed predictions. Consider trends, seasonality, and day-of-week patterns.";
    }

    const ai = new GoogleGenAI({ apiKey });

    // Construct contents for SDK
    const contents = messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    const systemInstructionContent = systemPrompt + (restaurantDataContext ? "\n\n" + restaurantDataContext : "");

    console.log("Sending request to Gemini API via SDK");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: {
          parts: [{ text: systemInstructionContent }]
        }
      }
    });

    console.log("Received successful Gemini API SDK response");
    
    // access response text safely
    const generatedText = response.text;

    const formattedResponse = {
      choices: [
        {
          message: {
            role: "assistant",
            content: generatedText
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
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during chat request'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorStack,
        choices: [
          {
            message: {
              role: "assistant",
              content: `Error: ${errorMessage}`
            }
          }
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});

interface RevenueDataItem {
  date: string;
  total_revenue: number;
  order_count: number;
}

async function handleSalesForecast(apiKey: string, restaurantData: Record<string, unknown> & { revenueStats: RevenueDataItem[] }, days: number, corsHeaders: Record<string, string>) {
  console.log(`Generating sales forecast for ${days} days`);
  
  try {
    const revenueData = restaurantData.revenueStats.slice(0, 30).map((item: RevenueDataItem) => ({
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

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      config: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40
      }
    });

    console.log("Received successful Gemini API forecast response");
    
    // access response text safely
    const textContent = response.text || '';
    const jsonContent = textContent.replace(/```json|```/g, '').trim();
    const forecastData = JSON.parse(jsonContent);
    
    return new Response(
      JSON.stringify(forecastData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating sales forecast:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during forecast generation'
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        predictions: { sales_forecast: [] }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
}

interface InventoryDataItem {
  id: string;
  name: string;
  quantity: number;
  reorder_level: number;
  unit: string;
  category: string;
}

async function handleInventoryRecommendations(apiKey: string, restaurantData: Record<string, unknown> & { inventoryItems: InventoryDataItem[], recentOrders: unknown[] }, corsHeaders: Record<string, string>) {
  console.log("Generating inventory recommendations");
  
  try {
    const inventoryData = restaurantData.inventoryItems.map((item: InventoryDataItem) => ({
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

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      config: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40
      }
    });

    console.log("Received successful Gemini API inventory recommendations response");
    
    const textContent = response.text || '';
    const jsonContent = textContent.replace(/```json|```/g, '').trim();
    const recommendationsData = JSON.parse(jsonContent);
    
    return new Response(
      JSON.stringify(recommendationsData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating inventory recommendations:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during inventory analysis'
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        predictions: { inventory_recommendations: [] }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
}
