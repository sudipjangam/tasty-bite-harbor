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
          { data: restaurantSubscriptions },
          { data: posTransactions },
          // Financial & Reporting
          { data: expenses },
          { data: expenseCategories },
          { data: invoices },
          { data: paymentsData },
          { data: budgetsData },
          { data: monthlyBudgets },
          { data: operationalCosts },
          // Orders & Kitchen
          { data: ordersUnified },
          { data: kitchenOrders },
          // Inventory & Purchasing
          { data: inventoryTransactions },
          { data: inventoryAlerts },
          { data: purchaseOrders },
          { data: purchaseOrderItems },
          // CRM & Loyalty
          { data: customersData },
          { data: loyaltyPrograms },
          { data: loyaltyTransactions },
          // Staff & HR
          { data: staffTimeClock },
          { data: shiftsData },
          { data: staffLeaveBalances },
          // Hotel
          { data: checkIns },
          { data: guestProfiles },
          // Recipes & Menu
          { data: recipesData },
          { data: recipeIngredients },
          { data: categoriesData },
          // Config
          { data: taxConfigurations },
          { data: paymentMethodsData }
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
            .eq("restaurant_id", verifiedRestaurantId),
          supabase.from("pos_transactions").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("created_at", { ascending: false })
            .limit(50),
          // Financial & Reporting
          supabase.from("expenses").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("expense_date", { ascending: false })
            .limit(50),
          supabase.from("expense_categories").select("*")
            .eq("restaurant_id", verifiedRestaurantId),
          supabase.from("invoices").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase.from("payments").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase.from("budgets").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .limit(5),
          supabase.from("monthly_budgets").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .limit(12),
          supabase.from("operational_costs").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .limit(20),
          // Orders & Kitchen
          supabase.from("orders_unified").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("created_at", { ascending: false })
            .limit(30),
          supabase.from("kitchen_orders").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("created_at", { ascending: false })
            .limit(30),
          // Inventory & Purchasing
          supabase.from("inventory_transactions").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("created_at", { ascending: false })
            .limit(30),
          supabase.from("inventory_alerts").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .limit(20),
          supabase.from("purchase_orders").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase.from("purchase_order_items").select("*")
            .limit(50),
          // CRM & Loyalty
          supabase.from("customers").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("total_spent", { ascending: false })
            .limit(50),
          supabase.from("loyalty_programs").select("*")
            .eq("restaurant_id", verifiedRestaurantId),
          supabase.from("loyalty_transactions").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("created_at", { ascending: false })
            .limit(30),
          // Staff & HR
          supabase.from("staff_time_clock").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("clock_in", { ascending: false })
            .limit(50),
          supabase.from("shifts").select("*")
            .eq("restaurant_id", verifiedRestaurantId),
          supabase.from("staff_leave_balances").select("*")
            .eq("restaurant_id", verifiedRestaurantId),
          // Hotel
          supabase.from("check_ins").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase.from("guest_profiles").select("*")
            .eq("restaurant_id", verifiedRestaurantId)
            .limit(20),
          // Recipes & Menu
          supabase.from("recipes").select("*")
            .eq("restaurant_id", verifiedRestaurantId),
          supabase.from("recipe_ingredients").select("*")
            .limit(50),
          supabase.from("categories").select("*")
            .eq("restaurant_id", verifiedRestaurantId),
          // Config
          supabase.from("tax_configurations").select("*")
            .eq("restaurant_id", verifiedRestaurantId),
          supabase.from("payment_methods").select("*")
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
          restaurantSubscriptions: restaurantSubscriptions || [],
          posTransactions: posTransactions || [],
          // Financial & Reporting
          expenses: expenses || [],
          expenseCategories: expenseCategories || [],
          invoices: invoices || [],
          payments: paymentsData || [],
          budgets: budgetsData || [],
          monthlyBudgets: monthlyBudgets || [],
          operationalCosts: operationalCosts || [],
          // Orders & Kitchen
          ordersUnified: ordersUnified || [],
          kitchenOrders: kitchenOrders || [],
          // Inventory & Purchasing
          inventoryTransactions: inventoryTransactions || [],
          inventoryAlerts: inventoryAlerts || [],
          purchaseOrders: purchaseOrders || [],
          purchaseOrderItems: purchaseOrderItems || [],
          // CRM & Loyalty
          customers: customersData || [],
          loyaltyPrograms: loyaltyPrograms || [],
          loyaltyTransactions: loyaltyTransactions || [],
          // Staff & HR
          staffTimeClock: staffTimeClock || [],
          shifts: shiftsData || [],
          staffLeaveBalances: staffLeaveBalances || [],
          // Hotel
          checkIns: checkIns || [],
          guestProfiles: guestProfiles || [],
          // Recipes & Menu
          recipes: recipesData || [],
          recipeIngredients: recipeIngredients || [],
          categories: categoriesData || [],
          // Config
          taxConfigurations: taxConfigurations || [],
          paymentMethods: paymentMethodsData || []
        };
        
        console.log(`Successfully fetched restaurant data from 49 tables. Revenue: ${revenueStats?.length || 0}, Orders: ${recentOrders?.length || 0}, QSR: ${qsrOrders?.length || 0}, Inventory: ${inventoryItems?.length || 0}, Expenses: ${expenses?.length || 0}, Customers: ${customersData?.length || 0}, Recipes: ${recipesData?.length || 0}, Kitchen: ${kitchenOrders?.length || 0}, POs: ${purchaseOrders?.length || 0}, Staff Clock: ${staffTimeClock?.length || 0}, Check-ins: ${checkIns?.length || 0}`);
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
      systemPrompt += " You have FULL direct access to ALL restaurant database tables (49 tables total) including: sales & revenue, expenses & financial reports, inventory & purchasing, recipes & food costing, customers & CRM, loyalty programs, staff HR & attendance, kitchen orders, POS transactions, hotel check-ins & rooms, budgets, invoices, payments, and more. Analyze this specific data carefully and provide precise insights. Format your responses in a visually appealing way with proper spacing, bullet points, and sections where appropriate. Be sure to use actual numbers and metrics from the data provided. The context includes precomputed KEY METRICS SUMMARY (MTD, QTD, YTD, last 60/90 days) and FINANCIAL SUMMARY for full-period insights. When asked about reports (P&L, expense reports, revenue reports, food cost, staff reports, etc.), use the actual data from the relevant tables. For QSR analysis, examine order patterns, popular items, peak hours, average order values, and revenue trends.";
      
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

        // Pre-compute financial & operational summaries
        const expensesArr = (restaurantData as any).expenses || [];
        const totalExpensesMTD = expensesArr
          .filter((e: any) => new Date(e.expense_date) >= startOfMonth)
          .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
        const totalExpensesYTD = expensesArr
          .filter((e: any) => new Date(e.expense_date) >= startOfYear)
          .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
        const expenseByCat: Record<string, number> = {};
        expensesArr.forEach((e: any) => {
          const cat = e.category || 'Uncategorized';
          expenseByCat[cat] = (expenseByCat[cat] || 0) + (Number(e.amount) || 0);
        });

        const customersArr = (restaurantData as any).customers || [];
        const recipesArr = (restaurantData as any).recipes || [];
        const avgFoodCost = recipesArr.length > 0
          ? recipesArr.reduce((sum: number, r: any) => sum + (Number(r.food_cost_percentage) || 0), 0) / recipesArr.length
          : 0;
        const poArr = (restaurantData as any).purchaseOrders || [];
        const openPOs = poArr.filter((po: any) => po.status === 'pending' || po.status === 'ordered').length;
        const invoicesArr = (restaurantData as any).invoices || [];
        const pendingInvoiceAmount = invoicesArr
          .filter((inv: any) => inv.status === 'pending' || inv.status === 'unpaid')
          .reduce((sum: number, inv: any) => sum + (Number(inv.total_amount) || 0), 0);
        const alertsArr = (restaurantData as any).inventoryAlerts || [];

        const financialSummary = {
          expenses: { mtd: totalExpensesMTD, ytd: totalExpensesYTD, byCategory: expenseByCat, totalRecords: expensesArr.length },
          customers: { total: customersArr.length },
          recipes: { total: recipesArr.length, avgFoodCostPercentage: Math.round(avgFoodCost * 100) / 100 },
          purchaseOrders: { total: poArr.length, open: openPOs },
          invoices: { total: invoicesArr.length, pendingAmount: pendingInvoiceAmount },
          inventoryAlerts: { active: alertsArr.length },
          loyalty: { programs: ((restaurantData as any).loyaltyPrograms || []).length, transactions: ((restaurantData as any).loyaltyTransactions || []).length },
          staffAttendance: { recentClockEntries: ((restaurantData as any).staffTimeClock || []).length },
          hotel: { activeCheckIns: ((restaurantData as any).checkIns || []).length, guestProfiles: ((restaurantData as any).guestProfiles || []).length }
        };

        restaurantDataContext = `Here is the restaurant's COMPLETE database records from 49 tables to inform your answers. When giving sales overviews, expense reports, financial analysis, inventory analysis, or ANY report, ALWAYS use this specific data.

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

POS TRANSACTIONS (last 10):
${JSON.stringify((restaurantData as any).posTransactions?.slice(0, 10), null, 2)}

=== FINANCIAL & REPORTING DATA ===

FINANCIAL SUMMARY (pre-computed):
${JSON.stringify(financialSummary, null, 2)}

EXPENSES (last 10):
${JSON.stringify((restaurantData as any).expenses?.slice(0, 10), null, 2)}

EXPENSE CATEGORIES:
${JSON.stringify((restaurantData as any).expenseCategories, null, 2)}

INVOICES (last 10):
${JSON.stringify((restaurantData as any).invoices?.slice(0, 10), null, 2)}

PAYMENTS (last 10):
${JSON.stringify((restaurantData as any).payments?.slice(0, 10), null, 2)}

BUDGETS:
${JSON.stringify((restaurantData as any).budgets?.slice(0, 5), null, 2)}

MONTHLY BUDGETS (last 6):
${JSON.stringify((restaurantData as any).monthlyBudgets?.slice(0, 6), null, 2)}

OPERATIONAL COSTS (last 10):
${JSON.stringify((restaurantData as any).operationalCosts?.slice(0, 10), null, 2)}

=== ORDERS & KITCHEN ===

UNIFIED ORDERS (last 10):
${JSON.stringify((restaurantData as any).ordersUnified?.slice(0, 10), null, 2)}

KITCHEN ORDERS (last 10):
${JSON.stringify((restaurantData as any).kitchenOrders?.slice(0, 10), null, 2)}

=== INVENTORY & PURCHASING ===

INVENTORY TRANSACTIONS (last 10):
${JSON.stringify((restaurantData as any).inventoryTransactions?.slice(0, 10), null, 2)}

INVENTORY ALERTS (active):
${JSON.stringify((restaurantData as any).inventoryAlerts?.slice(0, 10), null, 2)}

PURCHASE ORDERS (last 10):
${JSON.stringify((restaurantData as any).purchaseOrders?.slice(0, 10), null, 2)}

=== CRM & LOYALTY ===

CUSTOMERS (top 10 by spending):
${JSON.stringify((restaurantData as any).customers?.slice(0, 10), null, 2)}

LOYALTY PROGRAMS:
${JSON.stringify((restaurantData as any).loyaltyPrograms, null, 2)}

LOYALTY TRANSACTIONS (last 10):
${JSON.stringify((restaurantData as any).loyaltyTransactions?.slice(0, 10), null, 2)}

=== STAFF & HR ===

STAFF TIME CLOCK (last 10 entries):
${JSON.stringify((restaurantData as any).staffTimeClock?.slice(0, 10), null, 2)}

SHIFT DEFINITIONS:
${JSON.stringify((restaurantData as any).shifts, null, 2)}

STAFF LEAVE BALANCES:
${JSON.stringify((restaurantData as any).staffLeaveBalances?.slice(0, 10), null, 2)}

=== HOTEL ===

ACTIVE CHECK-INS (last 10):
${JSON.stringify((restaurantData as any).checkIns?.slice(0, 10), null, 2)}

GUEST PROFILES (last 10):
${JSON.stringify((restaurantData as any).guestProfiles?.slice(0, 10), null, 2)}

=== RECIPES & FOOD COSTING ===

RECIPES (with food cost %):
${JSON.stringify((restaurantData as any).recipes?.slice(0, 10), null, 2)}

RECIPE INGREDIENTS (first 10):
${JSON.stringify((restaurantData as any).recipeIngredients?.slice(0, 10), null, 2)}

MENU CATEGORIES:
${JSON.stringify((restaurantData as any).categories, null, 2)}

=== CONFIG ===

TAX CONFIGURATIONS:
${JSON.stringify((restaurantData as any).taxConfigurations, null, 2)}

PAYMENT METHODS:
${JSON.stringify((restaurantData as any).paymentMethods, null, 2)}

ALWAYS base your answers on this specific data. When asked for MTD, QTD, or YTD, use the KEY METRICS SUMMARY and FINANCIAL SUMMARY above. When asked for a sales overview, calculate totals and trends from REVENUE STATS. For expense reports use EXPENSES + FINANCIAL SUMMARY. For food cost analysis use RECIPES data. For staff reports use STAFF TIME CLOCK and LEAVE BALANCES. For P&L reports combine revenue, expenses, and operational costs. For payment analytics use POS TRANSACTIONS. For customer insights use CUSTOMERS + LOYALTY data. For inventory reports use INVENTORY ITEMS + ALERTS + TRANSACTIONS. For purchasing use PURCHASE ORDERS. For hotel reports use CHECK-INS + ROOMS + GUEST PROFILES. Your answers should NEVER be generic - they should directly reflect the numbers and patterns in this data.`;
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

    // Retry logic for Gemini API
    let response;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contents,
          config: {
            systemInstruction: {
              parts: [{ text: systemInstructionContent }]
            }
          }
        });
        break; // Success, exit retry loop
      } catch (e: any) {
        lastError = e;
        console.error(`Gemini API attempt ${attempt + 1} failed:`, e.message || e);
        
        // Check if it's a 503 error (model overloaded)
        if (e.message?.includes('503') || e.message?.includes('overloaded') || e.status === 503) {
          if (attempt < 2) {
            const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        throw e; // Rethrow if not retryable or max retries reached
      }
    }

    if (!response) {
      throw lastError || new Error('Failed to get response from Gemini API');
    }

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
      model: "gemini-3.5-flash",
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
      model: "gemini-3.5-flash",
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
