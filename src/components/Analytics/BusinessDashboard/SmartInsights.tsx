
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SmartInsightItem, { SmartInsightProps } from "./SmartInsightItem";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const SmartInsights = () => {
  const [aiInsights, setAiInsights] = useState<SmartInsightProps[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch restaurant data
  const { data: restaurantData, isLoading } = useQuery({
    queryKey: ["smart-insights-data"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      if (!userProfile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const restaurantId = userProfile.restaurant_id;

      // Fetch relevant restaurant data for AI analysis
      const [
        { data: revenueStats },
        { data: inventoryItems },
        { data: staffData },
        { data: orderData }
      ] = await Promise.all([
        supabase
          .from("daily_revenue_stats")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .order("date", { ascending: false })
          .limit(30),
        supabase
          .from("inventory_items")
          .select("*")
          .eq("restaurant_id", restaurantId),
        supabase
          .from("staff")
          .select("*")
          .eq("restaurant_id", restaurantId),
        supabase
          .from("orders")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .order("created_at", { ascending: false })
          .limit(50)
      ]);

      return {
        revenueStats: revenueStats || [],
        inventoryItems: inventoryItems || [],
        staff: staffData || [],
        orders: orderData || []
      };
    }
  });

  // Generate insights using AI
  const generateAiInsights = async () => {
    if (!restaurantData) return;
    
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('chat-with-api', {
        body: { 
          messages: [
            { 
              role: "user", 
              content: `Analyze this restaurant data and generate 3-5 specific business insights with actionable recommendations. 
              For each insight, specify if it's an "opportunity", "alert", or "seasonal" trend, and estimate the potential impact percentage.
              Format each insight as a JSON object with title, description, type (opportunity, alert, or seasonal), and impact (percentage number).
              Only return the JSON array without any additional text or explanation.
              
              Revenue Data: ${JSON.stringify(restaurantData.revenueStats)}
              Inventory Items: ${JSON.stringify(restaurantData.inventoryItems)}
              Staff Data: ${JSON.stringify(restaurantData.staff)}
              Recent Orders: ${JSON.stringify(restaurantData.orders)}`
            }
          ],
          restaurantId: (await supabase.auth.getUser()).data.user?.id
        },
      });

      if (error) throw error;
      
      if (data && data.choices && data.choices[0]?.message?.content) {
        // Extract JSON from the response
        const content = data.choices[0].message.content;
        let jsonStart = content.indexOf('[');
        let jsonEnd = content.lastIndexOf(']') + 1;
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          try {
            const jsonContent = content.substring(jsonStart, jsonEnd);
            const parsedInsights = JSON.parse(jsonContent);
            
            // Validate and transform insights to match SmartInsightProps
            const formattedInsights = parsedInsights.map(insight => ({
              title: insight.title || "Insight",
              description: insight.description || "No description available",
              type: ["opportunity", "alert", "seasonal"].includes(insight.type) 
                ? insight.type as "opportunity" | "alert" | "seasonal"
                : "opportunity",
              impact: typeof insight.impact === 'number' ? insight.impact : undefined
            }));
            
            setAiInsights(formattedInsights);
          } catch (e) {
            console.error("Failed to parse AI response as JSON:", e);
            // Fallback to static insights if parsing fails
            setAiInsights(getStaticInsights());
          }
        } else {
          console.error("Could not find valid JSON in AI response");
          setAiInsights(getStaticInsights());
        }
      } else {
        console.error("Invalid response format from AI");
        setAiInsights(getStaticInsights());
      }
    } catch (error) {
      console.error("Error generating AI insights:", error);
      setAiInsights(getStaticInsights());
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate insights on component mount or when data changes
  useEffect(() => {
    if (restaurantData && !isGenerating && aiInsights.length === 0) {
      generateAiInsights();
    }
  }, [restaurantData]);

  // Fallback static insights for when AI fails or no data is available
  const getStaticInsights = (): SmartInsightProps[] => [
    {
      title: "Revenue Opportunity",
      description: "Weekday lunch hours are underperforming compared to other periods. Consider introducing a lunch special promotion.",
      type: "opportunity",
      impact: 25
    },
    {
      title: "Inventory Alert",
      description: "Several key ingredients are below reorder levels. Schedule a stock review and place orders.",
      type: "alert",
      impact: 15
    },
    {
      title: "Seasonal Trend",
      description: "Customer traffic is showing typical seasonal patterns. Prepare special promotions for upcoming holidays.",
      type: "seasonal",
      impact: 30
    }
  ];

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Smart Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayInsights = aiInsights.length > 0 ? aiInsights : getStaticInsights();

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">Smart Insights</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={generateAiInsights} 
          disabled={isGenerating}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh insights</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayInsights.map((insight, index) => (
            <SmartInsightItem 
              key={index}
              title={insight.title}
              description={insight.description}
              type={insight.type}
              impact={insight.impact}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartInsights;
