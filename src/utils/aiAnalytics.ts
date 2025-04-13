import { supabase } from "@/integrations/supabase/client";

// Types for AI analysis results
export type SalesForecast = {
  date: string;
  predicted_revenue: number;
  confidence: number;
  factors: string[];
};

export type InventoryRecommendation = {
  item_id: string;
  name: string;
  current_stock: number;
  recommended_order: number;
  days_until_stockout: number;
  reason: string;
};

/**
 * Fetch AI-generated sales forecasts for the restaurant
 * @param restaurantId The restaurant ID
 * @param days Number of days to forecast
 * @returns Array of sales forecasts
 */
export const fetchSalesForecasts = async (
  restaurantId: string | null,
  days: number = 7
): Promise<SalesForecast[]> => {
  if (!restaurantId) {
    console.warn("No restaurant ID provided for sales forecasts");
    return [];
  }

  try {
    // First try to get predictions from the AI assistant
    const { data, error } = await supabase.functions.invoke("chat-with-gemini", {
      body: {
        messages: [
          {
            role: "user",
            content: `Based on the restaurant's sales data, generate a sales forecast for the next ${days} days. Include predicted revenue, confidence level, and factors affecting the prediction.`,
          },
        ],
        restaurantId,
        analysisType: "sales_forecast",
        days,
      },
    });

    if (error) {
      console.error("Error getting AI sales forecast:", error);
      // Fall back to historical data approach
      return generateFallbackSalesForecast(restaurantId, days);
    }

    if (data?.predictions?.sales_forecast) {
      return data.predictions.sales_forecast;
    }

    // If response doesn't contain predictions, fall back to our algorithm
    return generateFallbackSalesForecast(restaurantId, days);
  } catch (error) {
    console.error("Error in fetchSalesForecasts:", error);
    return generateFallbackSalesForecast(restaurantId, days);
  }
};

/**
 * Generate inventory order recommendations based on current stock,
 * sales velocity, and predicted demand
 * @param restaurantId The restaurant ID
 * @returns Array of inventory recommendations
 */
export const fetchInventoryRecommendations = async (
  restaurantId: string | null
): Promise<InventoryRecommendation[]> => {
  if (!restaurantId) {
    console.warn("No restaurant ID provided for inventory recommendations");
    return [];
  }

  try {
    // Try to get intelligent recommendations from AI
    const { data, error } = await supabase.functions.invoke("chat-with-gemini", {
      body: {
        messages: [
          {
            role: "user",
            content: "Analyze our inventory levels and sales data to provide ordering recommendations. Identify items at risk of stockout and suggest order quantities.",
          },
        ],
        restaurantId,
        analysisType: "inventory_recommendations",
      },
    });

    if (error) {
      console.error("Error getting AI inventory recommendations:", error);
      // Fall back to rule-based approach
      return generateFallbackInventoryRecommendations(restaurantId);
    }

    if (data?.predictions?.inventory_recommendations) {
      return data.predictions.inventory_recommendations;
    }

    // If response doesn't contain recommendations, fall back to our algorithm
    return generateFallbackInventoryRecommendations(restaurantId);
  } catch (error) {
    console.error("Error in fetchInventoryRecommendations:", error);
    return generateFallbackInventoryRecommendations(restaurantId);
  }
};

/**
 * Generate fallback sales forecast based on historical data
 * when AI predictions are not available
 */
const generateFallbackSalesForecast = async (
  restaurantId: string,
  days: number
): Promise<SalesForecast[]> => {
  try {
    // Get historical sales data
    const { data: revenueStats, error } = await supabase
      .from("daily_revenue_stats")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("date", { ascending: false })
      .limit(30);

    if (error || !revenueStats || revenueStats.length === 0) {
      console.error("Error fetching historical data:", error);
      return generateDummySalesForecast(days);
    }

    // Calculate average daily revenue and growth trend
    const totalRevenue = revenueStats.reduce(
      (sum, day) => sum + Number(day.total_revenue),
      0
    );
    const avgDailyRevenue = totalRevenue / revenueStats.length;

    // Calculate growth rate (simple linear trend)
    let growthRate = 0;
    if (revenueStats.length >= 7) {
      const recent7Days = revenueStats.slice(0, 7);
      const older7Days = revenueStats.slice(7, 14);
      
      const recent7Total = recent7Days.reduce(
        (sum, day) => sum + Number(day.total_revenue),
        0
      );
      const older7Total = older7Days.reduce(
        (sum, day) => sum + Number(day.total_revenue),
        0
      );
      
      if (older7Total > 0) {
        growthRate = (recent7Total - older7Total) / older7Total;
      }
    }

    // Generate forecast
    const today = new Date();
    const forecast: SalesForecast[] = [];

    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date();
      forecastDate.setDate(today.getDate() + i);
      
      // Apply day-of-week adjustment (weekends typically have higher sales)
      const dayOfWeek = forecastDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dayAdjustment = isWeekend ? 1.2 : 1.0;
      
      // Calculate predicted revenue with trend and day adjustment
      const predictedRevenue = avgDailyRevenue * 
        (1 + (growthRate * i / 7)) * // Apply trend
        dayAdjustment; // Apply day adjustment
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predicted_revenue: Math.round(predictedRevenue * 100) / 100,
        confidence: 70,
        factors: [
          isWeekend ? "Weekend uplift" : "Weekday pattern",
          growthRate > 0 ? "Positive growth trend" : "Stable sales pattern",
          "Based on 30-day historical average"
        ]
      });
    }

    return forecast;
  } catch (error) {
    console.error("Error generating fallback forecast:", error);
    return generateDummySalesForecast(days);
  }
};

/**
 * Generate fallback inventory recommendations based on current stock levels
 * when AI recommendations are not available
 */
const generateFallbackInventoryRecommendations = async (
  restaurantId: string
): Promise<InventoryRecommendation[]> => {
  try {
    // Get current inventory data
    const { data: inventoryItems, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("restaurant_id", restaurantId);

    if (error || !inventoryItems || inventoryItems.length === 0) {
      console.error("Error fetching inventory data:", error);
      return [];
    }

    // Get recent orders to calculate consumption rate
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(50);

    const recommendations: InventoryRecommendation[] = [];

    // Process each inventory item
    for (const item of inventoryItems) {
      // Simple logic: if below reorder level, recommend bringing back to par level
      if (item.quantity <= item.reorder_level) {
        const parLevel = item.reorder_level * 2; // Simple par level calculation
        const orderAmount = parLevel - item.quantity;
        
        // Estimate days until stockout based on current quantity
        // Using a simple average daily usage estimate
        let daysUntilStockout = 30; // Default
        if (item.quantity <= 0) {
          daysUntilStockout = 0;
        } else if (item.reorder_level && item.quantity < item.reorder_level) {
          // If below reorder level, estimate more precisely
          daysUntilStockout = Math.max(1, Math.round(item.quantity / (item.reorder_level / 7)));
        }
        
        recommendations.push({
          item_id: item.id,
          name: item.name,
          current_stock: item.quantity,
          recommended_order: Math.ceil(orderAmount),
          days_until_stockout: daysUntilStockout,
          reason: item.quantity <= 0 
            ? "Out of stock" 
            : `Below reorder level of ${item.reorder_level}`
        });
      }
    }

    return recommendations;
  } catch (error) {
    console.error("Error generating fallback inventory recommendations:", error);
    return [];
  }
};

/**
 * Generate dummy sales forecast data when no historical data is available
 */
const generateDummySalesForecast = (days: number): SalesForecast[] => {
  const forecast: SalesForecast[] = [];
  const today = new Date();
  const baseRevenue = 1200; // Base revenue amount

  for (let i = 1; i <= days; i++) {
    const forecastDate = new Date();
    forecastDate.setDate(today.getDate() + i);
    
    // Weekend adjustment
    const dayOfWeek = forecastDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayAdjustment = isWeekend ? 1.3 : 1.0;
    
    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      predicted_revenue: Math.round(baseRevenue * dayAdjustment * (0.9 + Math.random() * 0.2)),
      confidence: 50,
      factors: [
        isWeekend ? "Weekend" : "Weekday",
        "Limited historical data",
        "Generic forecast model"
      ]
    });
  }

  return forecast;
};
