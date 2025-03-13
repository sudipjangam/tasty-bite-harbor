
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight
} from "lucide-react";

interface SmartInsightProps {
  title: string;
  description: string;
  type: "opportunity" | "alert" | "seasonal";
  impact?: number;
}

const SmartInsight: React.FC<SmartInsightProps> = ({ 
  title, 
  description, 
  type, 
  impact 
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case "opportunity":
        return {
          bg: "bg-yellow-50 dark:bg-yellow-900/20",
          border: "border-yellow-200 dark:border-yellow-800",
          titleColor: "text-yellow-800 dark:text-yellow-300",
          textColor: "text-yellow-600 dark:text-yellow-400"
        };
      case "alert":
        return {
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-200 dark:border-blue-800",
          titleColor: "text-blue-800 dark:text-blue-300",
          textColor: "text-blue-600 dark:text-blue-400"
        };
      case "seasonal":
        return {
          bg: "bg-green-50 dark:bg-green-900/20",
          border: "border-green-200 dark:border-green-800",
          titleColor: "text-green-800 dark:text-green-300",
          textColor: "text-green-600 dark:text-green-400"
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className={`p-3 ${styles.bg} rounded-lg border ${styles.border}`}>
      <p className={`text-sm font-medium ${styles.titleColor}`}>{title}</p>
      <p className={`text-xs ${styles.textColor} mt-1`}>
        {description}
      </p>
    </div>
  );
};

const SmartInsights = () => {
  const insights = [
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
            <SmartInsight 
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
