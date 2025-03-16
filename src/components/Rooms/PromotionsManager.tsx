
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase, PromotionCampaign, SentPromotion } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Send, Calendar as CalendarIcon, Percent, DollarSign, Tag, Plus, Trash } from 'lucide-react';
import { cn } from "@/lib/utils";

interface PromotionsManagerProps {
  restaurantId: string;
}

const PromotionsManager: React.FC<PromotionsManagerProps> = ({ restaurantId }) => {
  const [promotions, setPromotions] = useState<PromotionCampaign[]>([]);
  const [sentPromotions, setSentPromotions] = useState<SentPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newPromotion, setNewPromotion] = useState({
    name: '',
    description: '',
    start_date: new Date(),
    end_date: addDays(new Date(), 30),
    discount_percentage: 10,
    discount_amount: 0,
    promotion_code: '',
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchPromotions();
    fetchSentPromotions();
  }, [restaurantId]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promotion_campaigns')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPromotions(data as PromotionCampaign[]);
    } catch (error) {
      console.error("Error fetching promotions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load promotions data."
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSentPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from('sent_promotions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sent_date', { ascending: false });

      if (error) throw error;
      
      setSentPromotions(data as SentPromotion[]);
    } catch (error) {
      console.error("Error fetching sent promotions:", error);
    }
  };

  const handleCreatePromotion = async () => {
    try {
      const { data, error } = await supabase
        .from('promotion_campaigns')
        .insert({
          restaurant_id: restaurantId,
          name: newPromotion.name,
          description: newPromotion.description || null,
          start_date: newPromotion.start_date.toISOString(),
          end_date: newPromotion.end_date.toISOString(),
          discount_percentage: newPromotion.discount_percentage,
          discount_amount: newPromotion.discount_amount,
          promotion_code: newPromotion.promotion_code || null,
        })
        .select();

      if (error) throw error;
      
      setPromotions([data[0] as PromotionCampaign, ...promotions]);
      setOpenCreateDialog(false);
      setNewPromotion({
        name: '',
        description: '',
        start_date: new Date(),
        end_date: addDays(new Date(), 30),
        discount_percentage: 10,
        discount_amount: 0,
        promotion_code: '',
      });
      
      toast({
        title: "Promotion Created",
        description: "New promotion campaign has been created successfully."
      });
    } catch (error) {
      console.error("Error creating promotion:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create promotion. Please try again."
      });
    }
  };

  const handleDeletePromotion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('promotion_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setPromotions(promotions.filter(promo => promo.id !== id));
      
      toast({
        title: "Promotion Deleted",
        description: "Promotion campaign has been deleted successfully."
      });
    } catch (error) {
      console.error("Error deleting promotion:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete promotion. Please try again."
      });
    }
  };

  const sendPromotion = async (promotion: PromotionCampaign, phoneNumber: string, customerName: string) => {
    try {
      // Call the send-whatsapp edge function
      const response = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: phoneNumber.replace(/\D/g, ''),
          message: generatePromotionMessage(promotion, customerName),
        }
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Log the sent promotion
      const { data, error } = await supabase
        .from('sent_promotions')
        .insert({
          restaurant_id: restaurantId,
          customer_name: customerName,
          customer_phone: phoneNumber,
          promotion_id: promotion.id,
          sent_method: 'whatsapp',
          sent_status: 'sent',
        })
        .select();
        
      if (error) throw error;
      
      setSentPromotions([data[0] as SentPromotion, ...sentPromotions]);
      
      toast({
        title: "Promotion Sent",
        description: `Promotion sent to ${customerName} via WhatsApp.`
      });
    } catch (error) {
      console.error("Error sending promotion:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send promotion. Please try again."
      });
    }
  };

  const generatePromotionMessage = (promotion: PromotionCampaign, customerName: string) => {
    let message = `*Special Offer for ${customerName}*\n\n`;
    message += `*${promotion.name}*\n\n`;
    
    if (promotion.description) {
      message += `${promotion.description}\n\n`;
    }
    
    message += `Valid from: ${format(new Date(promotion.start_date), "MMM d, yyyy")}\n`;
    message += `Valid until: ${format(new Date(promotion.end_date), "MMM d, yyyy")}\n\n`;
    
    if (promotion.discount_percentage > 0) {
      message += `Discount: ${promotion.discount_percentage}% off\n`;
    }
    
    if (promotion.discount_amount > 0) {
      message += `Discount: ₹${promotion.discount_amount} off\n`;
    }
    
    if (promotion.promotion_code) {
      message += `\nUse code: *${promotion.promotion_code}*\n`;
    }
    
    message += `\nWe look forward to seeing you again!\n`;
    
    return message;
  };

  const handleSendSpecialOccasionPromotions = async () => {
    try {
      // Fetch reservations with special occasions
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .not('special_occasion', 'is', null)
        .eq('marketing_consent', true);
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast({
          title: "No Special Occasions",
          description: "There are no guests with special occasions to send promotions to."
        });
        return;
      }
      
      // For each reservation with a special occasion, create a promotion and send it
      let successCount = 0;
      for (const reservation of data) {
        if (reservation.special_occasion && reservation.marketing_consent && reservation.customer_phone) {
          const occasionDate = reservation.special_occasion_date ? new Date(reservation.special_occasion_date) : null;
          
          if (occasionDate) {
            const nextYearDate = new Date(occasionDate);
            nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
            
            const promotionStartDate = new Date(nextYearDate);
            promotionStartDate.setDate(promotionStartDate.getDate() - 30);
            
            const promotionEndDate = new Date(nextYearDate);
            promotionEndDate.setDate(promotionEndDate.getDate() + 7);
            
            const { data: promoData, error: promoError } = await supabase
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
            
            if (promoError) continue;
            
            if (promoData && promoData.length > 0) {
              // Send the promotion
              await sendPromotion(promoData[0] as PromotionCampaign, reservation.customer_phone, reservation.customer_name);
              successCount++;
            }
          }
        }
      }
      
      if (successCount > 0) {
        toast({
          title: "Promotions Created and Sent",
          description: `Created and sent ${successCount} special occasion promotions.`
        });
        // Refresh the promotions list
        fetchPromotions();
      } else {
        toast({
          title: "No Promotions Sent",
          description: "No valid special occasions found to create promotions for."
        });
      }
    } catch (error) {
      console.error("Error sending special occasion promotions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send special occasion promotions. Please try again."
      });
    }
  };

  return (
    <Tabs defaultValue="active">
      <div className="flex justify-between items-center mb-4">
        <TabsList>
          <TabsTrigger value="active">Active Promotions</TabsTrigger>
          <TabsTrigger value="sent">Sent Promotions</TabsTrigger>
        </TabsList>
        <div className="space-x-2">
          <Button onClick={handleSendSpecialOccasionPromotions}>
            Send Special Occasion Promotions
          </Button>
          <Button onClick={() => setOpenCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Promotion
          </Button>
        </div>
      </div>
      
      <TabsContent value="active">
        {loading ? (
          <p className="text-center py-4">Loading promotions...</p>
        ) : promotions.length === 0 ? (
          <Card>
            <CardContent className="pt-6 pb-4 text-center">
              <p>No active promotions found. Create your first promotion to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promotions.map((promotion) => (
              <Card key={promotion.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{promotion.name}</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeletePromotion(promotion.id)}
                    >
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <CardDescription>
                    {promotion.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(promotion.start_date), "MMM d, yyyy")} - {format(new Date(promotion.end_date), "MMM d, yyyy")}
                    </span>
                  </div>
                  
                  {promotion.discount_percentage > 0 && (
                    <div className="flex items-center">
                      <Percent className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">{promotion.discount_percentage}% off</span>
                    </div>
                  )}
                  
                  {promotion.discount_amount > 0 && (
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">₹{promotion.discount_amount} off</span>
                    </div>
                  )}
                  
                  {promotion.promotion_code && (
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm font-medium">Code: {promotion.promotion_code}</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Send className="h-4 w-4 mr-2" /> Send Promotion
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Send Promotion</DialogTitle>
                        <DialogDescription>
                          Send this promotion to a customer via WhatsApp.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="customer-name">Customer Name</Label>
                          <Input id="customer-name" placeholder="Enter customer name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="customer-phone">Customer Phone</Label>
                          <Input id="customer-phone" placeholder="Enter customer phone number" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => {
                            const nameInput = document.getElementById('customer-name') as HTMLInputElement;
                            const phoneInput = document.getElementById('customer-phone') as HTMLInputElement;
                            
                            if (nameInput?.value && phoneInput?.value) {
                              sendPromotion(promotion, phoneInput.value, nameInput.value);
                            } else {
                              toast({
                                variant: "destructive",
                                title: "Missing Information",
                                description: "Please enter customer name and phone number."
                              });
                            }
                          }}
                        >
                          Send
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="sent">
        <Card>
          <CardHeader>
            <CardTitle>Sent Promotions</CardTitle>
            <CardDescription>
              History of promotions sent to customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sentPromotions.length === 0 ? (
              <p className="text-center py-4">No sent promotions found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Sent Via</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sentPromotions.map((sent) => (
                    <TableRow key={sent.id}>
                      <TableCell className="font-medium">{sent.customer_name}</TableCell>
                      <TableCell>{sent.customer_phone}</TableCell>
                      <TableCell>{sent.sent_method}</TableCell>
                      <TableCell>
                        <span className={
                          sent.sent_status === 'sent' 
                            ? 'text-green-600' 
                            : 'text-amber-600'
                        }>
                          {sent.sent_status}
                        </span>
                      </TableCell>
                      <TableCell>{format(new Date(sent.sent_date), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Promotion</DialogTitle>
            <DialogDescription>
              Create a new promotional campaign for your customers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="promo-name">Promotion Name</Label>
              <Input 
                id="promo-name" 
                value={newPromotion.name}
                onChange={(e) => setNewPromotion({...newPromotion, name: e.target.value})}
                placeholder="Summer Special"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-desc">Description (Optional)</Label>
              <Input 
                id="promo-desc" 
                value={newPromotion.description}
                onChange={(e) => setNewPromotion({...newPromotion, description: e.target.value})}
                placeholder="Enjoy special summer rates"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newPromotion.start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newPromotion.start_date ? (
                        format(newPromotion.start_date, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newPromotion.start_date}
                      onSelect={(date) => date && setNewPromotion({...newPromotion, start_date: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newPromotion.end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newPromotion.end_date ? (
                        format(newPromotion.end_date, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newPromotion.end_date}
                      onSelect={(date) => date && setNewPromotion({...newPromotion, end_date: date})}
                      initialFocus
                      disabled={(date) => date < newPromotion.start_date}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount-percent">Discount Percentage (%)</Label>
                <Input 
                  id="discount-percent" 
                  type="number"
                  value={newPromotion.discount_percentage}
                  onChange={(e) => setNewPromotion({...newPromotion, discount_percentage: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount-amount">Discount Amount (₹)</Label>
                <Input 
                  id="discount-amount" 
                  type="number"
                  value={newPromotion.discount_amount}
                  onChange={(e) => setNewPromotion({...newPromotion, discount_amount: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-code">Promotion Code (Optional)</Label>
              <Input 
                id="promo-code" 
                value={newPromotion.promotion_code}
                onChange={(e) => setNewPromotion({...newPromotion, promotion_code: e.target.value})}
                placeholder="SUMMER2023"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePromotion} disabled={!newPromotion.name}>
              Create Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};

export default PromotionsManager;
