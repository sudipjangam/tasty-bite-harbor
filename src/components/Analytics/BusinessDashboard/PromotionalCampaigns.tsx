
import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Users, 
  Tag, 
  Check, 
  Edit, 
  Plus, 
  Star, 
  Clock 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

type PromotionStatus = "active" | "scheduled" | "draft" | "completed";

interface PromotionItem {
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
}

const PromotionalCampaigns = () => {
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<PromotionItem[]>([
    {
      id: "promo1",
      name: "Happy Hour Special",
      description: "20% off on all beverages between 4-7 PM",
      startDate: "2023-06-01",
      endDate: "2023-07-30",
      discount: "20%",
      target: "All customers",
      status: "active",
      performance: {
        views: 432,
        usage: 87,
        revenue: 24560,
      },
    },
    {
      id: "promo2",
      name: "Weekend Family Bundle",
      description: "Family meal package with free dessert",
      startDate: "2023-07-01",
      endDate: "2023-08-30",
      discount: "Free dessert",
      target: "Families",
      status: "scheduled",
    },
    {
      id: "promo3",
      name: "Lunch Express Combo",
      description: "Main course + drink at fixed price",
      startDate: "2023-05-01",
      endDate: "2023-06-15",
      discount: "₹100 off",
      target: "Office workers",
      status: "completed",
      performance: {
        views: 986,
        usage: 342,
        revenue: 51300,
      },
    },
    {
      id: "promo4",
      name: "Student Discount",
      description: "15% off on all menu items with valid ID",
      startDate: "2023-08-15",
      endDate: "2023-10-30",
      discount: "15%",
      target: "Students",
      status: "draft",
    },
  ]);

  const handleActivate = (id: string) => {
    setPromotions(promotions.map(promo => 
      promo.id === id ? { ...promo, status: "active" } : promo
    ));
    
    toast({
      title: "Promotion Activated",
      description: "The promotion is now active and available to customers.",
    });
  };

  const handleEdit = (id: string) => {
    toast({
      title: "Edit Promotion",
      description: "Opening promotion editor...",
    });
    // In a real app, this would open a modal for editing
  };

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
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">Promotional Campaigns</CardTitle>
          <Button size="sm" variant="outline" className="h-8">
            <Plus className="h-4 w-4 mr-1" /> New Campaign
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {promotions.map((promo) => (
            <div 
              key={promo.id} 
              className="border rounded-lg p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{promo.name}</h4>
                    {getStatusBadge(promo.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{promo.description}</p>
                </div>
                <div className="flex gap-2">
                  {promo.status === "draft" || promo.status === "scheduled" ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 px-2 border-green-500 text-green-700 hover:bg-green-50"
                      onClick={() => handleActivate(promo.id)}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Activate
                    </Button>
                  ) : null}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 px-2"
                    onClick={() => handleEdit(promo.id)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div className="flex items-center">
                  <Calendar className="h-3.5 w-3.5 text-gray-500 mr-1" />
                  <span>{new Date(promo.startDate).toLocaleDateString()} - {new Date(promo.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <Tag className="h-3.5 w-3.5 text-gray-500 mr-1" />
                  <span>{promo.discount}</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-3.5 w-3.5 text-gray-500 mr-1" />
                  <span>{promo.target}</span>
                </div>
              </div>
              
              {promo.performance && (
                <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t text-xs">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center text-muted-foreground">
                      <Star className="h-3.5 w-3.5 mr-1" /> Views
                    </div>
                    <span className="text-sm font-medium">{promo.performance.views}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center text-muted-foreground">
                      <Check className="h-3.5 w-3.5 mr-1" /> Usage
                    </div>
                    <span className="text-sm font-medium">{promo.performance.usage}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 mr-1" /> Revenue
                    </div>
                    <span className="text-sm font-medium">₹{promo.performance.revenue}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PromotionalCampaigns;
