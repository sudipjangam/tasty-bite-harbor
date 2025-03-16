
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase, ReservationWithSpecialOccasion } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from 'lucide-react';

interface SpecialOccasionsProps {
  restaurantId: string;
}

const SpecialOccasions: React.FC<SpecialOccasionsProps> = ({ restaurantId }) => {
  const [specialOccasions, setSpecialOccasions] = useState<ReservationWithSpecialOccasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchSpecialOccasions();
  }, [restaurantId]);

  const fetchSpecialOccasions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .not('special_occasion', 'is', null)
        .eq('marketing_consent', true)
        .order('special_occasion_date', { ascending: true });

      if (error) throw error;
      
      setSpecialOccasions(data as ReservationWithSpecialOccasion[]);
    } catch (error) {
      console.error("Error fetching special occasions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load special occasions data."
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOccasions = specialOccasions.filter(occ => {
    if (filter === "all") return true;
    return occ.special_occasion === filter;
  });

  const handleCreatePromotion = async (reservation: ReservationWithSpecialOccasion) => {
    try {
      if (!reservation.special_occasion || !reservation.marketing_consent) return;
      
      const occasionDate = reservation.special_occasion_date ? new Date(reservation.special_occasion_date) : null;
      
      if (occasionDate) {
        const nextYearDate = new Date(occasionDate);
        nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
        
        const promotionStartDate = new Date(nextYearDate);
        promotionStartDate.setDate(promotionStartDate.getDate() - 30);
        
        const promotionEndDate = new Date(nextYearDate);
        promotionEndDate.setDate(promotionEndDate.getDate() + 7);
        
        const { data, error } = await supabase
          .from('promotion_campaigns')
          .insert({
            restaurant_id: restaurantId,
            name: `${reservation.special_occasion.charAt(0).toUpperCase() + reservation.special_occasion.slice(1)} Special for ${reservation.customer_name}`,
            description: `Special offer for ${reservation.customer_name}'s ${reservation.special_occasion}`,
            start_date: promotionStartDate.toISOString(),
            end_date: promotionEndDate.toISOString(),
            discount_percentage: 10,
            promotion_code: `${reservation.special_occasion.toUpperCase()}_${Math.floor(Math.random() * 10000)}`,
          })
          .select();
        
        if (error) throw error;
        
        toast({
          title: "Promotion Created",
          description: "Special occasion promotion has been created successfully."
        });
      }
    } catch (error) {
      console.error("Error creating promotion:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create promotion. Please try again."
      });
    }
  };

  const getOccasionColor = (occasion: string) => {
    switch (occasion) {
      case "birthday":
        return "text-pink-600";
      case "anniversary":
        return "text-purple-600";
      case "wedding":
        return "text-red-600";
      case "engagement":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Special Occasions</CardTitle>
        <CardDescription>
          Manage special occasions and create promotional campaigns
        </CardDescription>
        <div className="flex justify-end">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Occasions</SelectItem>
              <SelectItem value="birthday">Birthdays</SelectItem>
              <SelectItem value="anniversary">Anniversaries</SelectItem>
              <SelectItem value="wedding">Weddings</SelectItem>
              <SelectItem value="engagement">Engagements</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-4">Loading special occasions...</p>
        ) : filteredOccasions.length === 0 ? (
          <p className="text-center py-4">No special occasions found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Occasion</TableHead>
                <TableHead>Occasion Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOccasions.map((occasion) => (
                <TableRow key={occasion.id}>
                  <TableCell className="font-medium">{occasion.customer_name}</TableCell>
                  <TableCell>
                    {occasion.customer_phone} 
                    {occasion.customer_email && <div className="text-xs text-gray-500">{occasion.customer_email}</div>}
                  </TableCell>
                  <TableCell className={getOccasionColor(occasion.special_occasion || '')}>
                    {occasion.special_occasion?.charAt(0).toUpperCase() + occasion.special_occasion?.slice(1)}
                  </TableCell>
                  <TableCell>
                    {occasion.special_occasion_date && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(occasion.special_occasion_date), "MMM d, yyyy")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      onClick={() => handleCreatePromotion(occasion)}
                    >
                      Create Promotion
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default SpecialOccasions;
