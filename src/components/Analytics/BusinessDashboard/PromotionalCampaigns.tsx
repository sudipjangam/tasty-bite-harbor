
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, TrendingUp, Calendar, Users } from "lucide-react";

interface Promotion {
  id: number;
  name: string;
  timePeriod: string;
  potentialIncrease: string;
  status: "active" | "suggested" | "paused";
}

interface PromotionalCampaignsProps {
  promotions: Promotion[];
}

const PromotionalCampaigns: React.FC<PromotionalCampaignsProps> = ({ promotions }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "suggested":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "paused":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Users className="h-3 w-3" />;
      case "suggested":
        return <TrendingUp className="h-3 w-3" />;
      case "paused":
        return <Calendar className="h-3 w-3" />;
      default:
        return <Calendar className="h-3 w-3" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-purple-600" />
          Promotional Campaigns
        </CardTitle>
        <CardDescription>
          Marketing opportunities to boost revenue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {promotions.map((promotion) => (
          <div key={promotion.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-gray-900">{promotion.name}</h4>
                <p className="text-sm text-gray-500">{promotion.timePeriod}</p>
              </div>
              <Badge 
                variant="outline" 
                className={`${getStatusColor(promotion.status)} flex items-center gap-1`}
              >
                {getStatusIcon(promotion.status)}
                {promotion.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600 font-medium">
                +{promotion.potentialIncrease} potential increase
              </span>
              <Button 
                size="sm" 
                variant={promotion.status === "active" ? "outline" : "default"}
                className="text-xs"
              >
                {promotion.status === "active" ? "View Details" : "Activate"}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PromotionalCampaigns;
