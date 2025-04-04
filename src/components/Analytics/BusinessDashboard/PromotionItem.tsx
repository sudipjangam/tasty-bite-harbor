
import React from "react";
import { 
  Calendar, 
  Users, 
  Tag, 
  Check, 
  Edit, 
  Star, 
  Clock 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type PromotionStatus = "active" | "scheduled" | "draft" | "completed" | "suggested";

export interface PromotionItemProps {
  name: string;
  timePeriod: string;
  potentialIncrease: string;
  status: PromotionStatus;
  description?: string;
}

const PromotionItem: React.FC<PromotionItemProps> = ({
  name,
  timePeriod,
  potentialIncrease,
  status,
  description
}) => {
  const getStatusBadge = (status: PromotionStatus) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-800/30">Active</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-800/30">Scheduled</Badge>;
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Draft</Badge>;
      case "completed":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-800/30">Completed</Badge>;
      case "suggested":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-800/30">Suggested</Badge>;
    }
  };

  return (
    <div className="border rounded-lg p-3 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{name}</h4>
            {getStatusBadge(status)}
          </div>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className="flex gap-2">
          {status === "suggested" && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 px-2 border-green-500 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20"
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Implement
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
        <div className="flex items-center">
          <Calendar className="h-3.5 w-3.5 text-gray-500 mr-1" />
          <span>{timePeriod}</span>
        </div>
        <div className="flex items-center">
          <Tag className="h-3.5 w-3.5 text-gray-500 mr-1" />
          <span>Potential: {potentialIncrease}</span>
        </div>
      </div>
    </div>
  );
};

export default PromotionItem;
