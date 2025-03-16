
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

export type PromotionStatus = "active" | "scheduled" | "draft" | "completed";

export interface PromotionItemProps {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  discount: string;
  target: string;
  status: PromotionStatus;
  performance?: {
    views: number;
    usage: number;
    revenue: number;
  };
  onActivate: (id: string) => void;
  onEdit: (id: string) => void;
}

const PromotionItem: React.FC<PromotionItemProps> = ({
  id,
  name,
  description,
  startDate,
  endDate,
  discount,
  target,
  status,
  performance,
  onActivate,
  onEdit
}) => {
  const getStatusBadge = (status: PromotionStatus) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Scheduled</Badge>;
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Draft</Badge>;
      case "completed":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Completed</Badge>;
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
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="flex gap-2">
          {status === "draft" || status === "scheduled" ? (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 px-2 border-green-500 text-green-700 hover:bg-green-50"
              onClick={() => onActivate(id)}
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Activate
            </Button>
          ) : null}
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 px-2"
            onClick={() => onEdit(id)}
          >
            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
        <div className="flex items-center">
          <Calendar className="h-3.5 w-3.5 text-gray-500 mr-1" />
          <span>{new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center">
          <Tag className="h-3.5 w-3.5 text-gray-500 mr-1" />
          <span>{discount}</span>
        </div>
        <div className="flex items-center">
          <Users className="h-3.5 w-3.5 text-gray-500 mr-1" />
          <span>{target}</span>
        </div>
      </div>
      
      {performance && (
        <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t text-xs">
          <div className="flex flex-col items-center">
            <div className="flex items-center text-muted-foreground">
              <Star className="h-3.5 w-3.5 mr-1" /> Views
            </div>
            <span className="text-sm font-medium">{performance.views}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center text-muted-foreground">
              <Check className="h-3.5 w-3.5 mr-1" /> Usage
            </div>
            <span className="text-sm font-medium">{performance.usage}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center text-muted-foreground">
              <Clock className="h-3.5 w-3.5 mr-1" /> Revenue
            </div>
            <span className="text-sm font-medium">₹{performance.revenue}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionItem;
