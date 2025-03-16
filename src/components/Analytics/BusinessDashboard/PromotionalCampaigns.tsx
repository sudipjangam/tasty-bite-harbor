
import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PromotionItem, { PromotionItemProps, PromotionStatus } from "./PromotionItem";

interface PromotionData extends Omit<PromotionItemProps, 'onActivate' | 'onEdit'> {}

const PromotionalCampaigns = () => {
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<PromotionData[]>([
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
      promo.id === id ? { ...promo, status: "active" as PromotionStatus } : promo
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
            <PromotionItem 
              key={promo.id}
              id={promo.id}
              name={promo.name}
              description={promo.description}
              startDate={promo.startDate}
              endDate={promo.endDate}
              discount={promo.discount}
              target={promo.target}
              status={promo.status}
              performance={promo.performance}
              onActivate={handleActivate}
              onEdit={handleEdit}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PromotionalCampaigns;
