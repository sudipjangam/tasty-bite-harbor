
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SmartInsightItem, { SmartInsightProps } from "./SmartInsightItem";

const SmartInsights = () => {
  const insights: SmartInsightProps[] = [
    {
      title: "Revenue Opportunity",
      description: "Monday lunch hours (12-2 PM) are underperforming by 40% compared to other weekdays. Consider a lunch special promotion.",
      type: "opportunity" as const,
      impact: 40
    },
    {
      title: "Inventory Alert",
      description: "Seafood costs increased by 15% this month. Consider menu price adjustments or alternative suppliers.",
      type: "alert" as const,
      impact: 15
    },
    {
      title: "Seasonal Opportunity",
      description: "Festival season approaching. Prepare for 30% increase in weekend traffic based on previous year's data.",
      type: "seasonal" as const,
      impact: 30
    },
    {
      title: "Staff Optimization",
      description: "Tuesday evenings are overstaffed by 20%. Consider adjusting staff schedules to match customer traffic patterns.",
      type: "opportunity" as const,
      impact: 20
    },
    {
      title: "Menu Performance",
      description: "Dessert sales drop 35% on weekdays. Consider weekday dessert specials or combo deals to boost sales.",
      type: "alert" as const,
      impact: 35
    }
  ];

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Smart Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.slice(0, 3).map((insight, index) => (
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
