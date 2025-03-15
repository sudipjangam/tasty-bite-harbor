
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase, PromotionCampaign } from "@/integrations/supabase/client";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTitle 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Send, Tag, Gift, Trash2, Edit, Plus } from 'lucide-react';

interface PromotionsManagerProps {
  restaurantId: string;
}

const PromotionsManager: React.FC<PromotionsManagerProps> = ({ restaurantId }) => {
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<PromotionCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAddPromotion, setOpenAddPromotion] = useState(false);
  const [openEditPromotion, setOpenEditPromotion] = useState(false);
  const [openSendPromotion, setOpenSendPromotion] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [selectedPromotion, setSelectedPromotion] = useState<PromotionCampaign | null>(null);
  const [newPromotion, setNewPromotion] = useState({
    name: "",
    description: "",
    start_date: new Date(),
    end_date: new Date(new Date().setDate(new Date().getDate() + 30)),
    discount_percentage: 10,
    discount_amount: 0,
    promotion_code: "",
  });
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [sendingPromotion, setSendingPromotion] = useState(false);

  useEffect(() => {
    fetchPromotions();
  }, [restaurantId]);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
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
        description: "Failed to load promotions. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPromotion = async () => {
    try {
      // Generate random promotion code if not provided
      const promotionCode = newPromotion.promotion_code || 
        `PROMO_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from('promotion_campaigns')
        .insert({
          restaurant_id: restaurantId,
          name: newPromotion.name,
          description: newPromotion.description,
          start_date: newPromotion.start_date.toISOString(),
          end_date: newPromotion.end_date.toISOString(),
          discount_percentage: newPromotion.discount_percentage,
          discount_amount: newPromotion.discount_amount,
          promotion_code: promotionCode,
        })
        .select();

      if (error) throw error;

      setPromotions([data[0] as PromotionCampaign, ...promotions]);
      setOpenAddPromotion(false);
      setNewPromotion({
        name: "",
        description: "",
        start_date: new Date(),
        end_date: new Date(new Date().setDate(new Date().getDate() + 30)),
        discount_percentage: 10,
        discount_amount: 0,
        promotion_code: "",
      });

      toast({
        title: "Promotion Added",
        description: "New promotion has been added successfully.",
      });
    } catch (error) {
      console.error("Error adding promotion:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add promotion. Please try again.",
      });
    }
  };

  const handleEditPromotion = async () => {
    if (!selectedPromotion) return;
    
    try {
      const { error } = await supabase
        .from('promotion_campaigns')
        .update({
          name: selectedPromotion.name,
          description: selectedPromotion.description,
          start_date: new Date(selectedPromotion.start_date).toISOString(),
          end_date: new Date(selectedPromotion.end_date).toISOString(),
          discount_percentage: selectedPromotion.discount_percentage,
          discount_amount: selectedPromotion.discount_amount,
          promotion_code: selectedPromotion.promotion_code,
        })
        .eq('id', selectedPromotion.id);

      if (error) throw error;

      setPromotions(
        promotions.map((promo) =>
          promo.id === selectedPromotion.id ? { ...promo, ...selectedPromotion } : promo
        )
      );
      setOpenEditPromotion(false);

      toast({
        title: "Promotion Updated",
        description: "Promotion details have been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating promotion:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update promotion. Please try again.",
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

      setPromotions(promotions.filter((promo) => promo.id !== id));

      toast({
        title: "Promotion Deleted",
        description: "Promotion has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting promotion:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete promotion. Please try again.",
      });
    }
  };

  const openEditDialog = (promotion: PromotionCampaign) => {
    setSelectedPromotion({
      ...promotion,
      start_date: promotion.start_date,
      end_date: promotion.end_date,
    });
    setOpenEditPromotion(true);
  };

  const openSendDialog = (promotion: PromotionCampaign) => {
    setSelectedPromotion(promotion);
    setRecipientPhone("");
    setRecipientName("");
    setOpenSendPromotion(true);
  };

  const handleSendPromotion = async () => {
    if (!selectedPromotion || !recipientPhone) return;
    
    setSendingPromotion(true);
    try {
      // First record the sent promotion
      const { data, error } = await supabase
        .from('sent_promotions')
        .insert({
          promotion_id: selectedPromotion.id,
          customer_name: recipientName,
          customer_phone: recipientPhone,
          restaurant_id: restaurantId,
          sent_method: 'whatsapp',
          sent_status: 'sent'
        })
        .select();

      if (error) throw error;
      
      // Create promotion message
      const promotionMessage = generatePromotionMessage(selectedPromotion, recipientName);
      
      // Send the WhatsApp message
      const response = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: recipientPhone.replace(/\D/g, ''),
          message: promotionMessage
        }
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      toast({
        title: "Promotion Sent",
        description: "The promotion has been sent successfully.",
      });
      
      setOpenSendPromotion(false);
    } catch (error) {
      console.error("Error sending promotion:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send promotion. Please try again.",
      });
    } finally {
      setSendingPromotion(false);
    }
  };
  
  const generatePromotionMessage = (promotion: PromotionCampaign, recipientName: string) => {
    let message = `*Special Offer for ${recipientName || "You"}*\n\n`;
    message += `${promotion.name}\n\n`;
    
    if (promotion.description) {
      message += `${promotion.description}\n\n`;
    }
    
    message += `*Offer Details:*\n`;
    if (promotion.discount_percentage > 0) {
      message += `- ${promotion.discount_percentage}% discount\n`;
    }
    if (promotion.discount_amount > 0) {
      message += `- ₹${promotion.discount_amount} off\n`;
    }
    
    message += `\nValid from ${format(parseISO(promotion.start_date), 'dd MMM yyyy')} to ${format(parseISO(promotion.end_date), 'dd MMM yyyy')}\n\n`;
    
    if (promotion.promotion_code) {
      message += `Use Code: *${promotion.promotion_code}*\n\n`;
    }
    
    message += "Book now to avail this special offer!";
    return message;
  };

  const getPromotionStatus = (promotion: PromotionCampaign) => {
    const now = new Date();
    const startDate = parseISO(promotion.start_date);
    const endDate = parseISO(promotion.end_date);
    
    if (isBefore(now, startDate)) {
      return "upcoming";
    } else if (isAfter(now, endDate)) {
      return "expired";
    } else {
      return "active";
    }
  };

  const filteredPromotions = promotions.filter((promotion) => {
    const status = getPromotionStatus(promotion);
    return activeTab === "all" || status === activeTab;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Special Offers & Promotions</h2>
        <Button onClick={() => setOpenAddPromotion(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Promotion
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredPromotions.length === 0 ? (
            <Card>
              <CardContent className="py-10">
                <div className="text-center space-y-3">
                  <Gift className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="text-lg">No {activeTab} promotions found</p>
                  <Button variant="outline" onClick={() => setOpenAddPromotion(true)}>
                    Create Your First Promotion
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPromotions.map((promotion) => (
                <Card key={promotion.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{promotion.name}</span>
                      <Tag className="h-5 w-5 text-primary" />
                    </CardTitle>
                    <CardDescription>
                      {format(parseISO(promotion.start_date), 'dd MMM yyyy')} - {format(parseISO(promotion.end_date), 'dd MMM yyyy')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {promotion.description && (
                        <p className="text-sm">{promotion.description}</p>
                      )}
                      <div className="font-medium">
                        {promotion.discount_percentage > 0 && (
                          <p>{promotion.discount_percentage}% Discount</p>
                        )}
                        {promotion.discount_amount > 0 && (
                          <p>₹{promotion.discount_amount} Off</p>
                        )}
                      </div>
                      {promotion.promotion_code && (
                        <div className="p-2 bg-secondary rounded flex justify-between items-center">
                          <span className="font-mono text-sm">Code: {promotion.promotion_code}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(promotion)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive"
                        onClick={() => handleDeletePromotion(promotion.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => openSendDialog(promotion)}
                      disabled={getPromotionStatus(promotion) === "expired"}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Send
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Promotion Dialog */}
      <Dialog open={openAddPromotion} onOpenChange={setOpenAddPromotion}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Create New Promotion</DialogTitle>
            <DialogDescription>
              Create a special offer for guests to celebrate special occasions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="promo-name">Promotion Name</Label>
              <Input
                id="promo-name"
                value={newPromotion.name}
                onChange={(e) => setNewPromotion({ ...newPromotion, name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="promo-description">Description</Label>
              <Textarea
                id="promo-description"
                value={newPromotion.description}
                onChange={(e) => setNewPromotion({ ...newPromotion, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newPromotion.start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newPromotion.start_date ? format(newPromotion.start_date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newPromotion.start_date}
                      onSelect={(date) => date && setNewPromotion({ ...newPromotion, start_date: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newPromotion.end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newPromotion.end_date ? format(newPromotion.end_date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newPromotion.end_date}
                      onSelect={(date) => date && setNewPromotion({ ...newPromotion, end_date: date })}
                      disabled={(date) => date < newPromotion.start_date}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="discount-percentage">Discount Percentage (%)</Label>
                <Input
                  id="discount-percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={newPromotion.discount_percentage}
                  onChange={(e) => setNewPromotion({ ...newPromotion, discount_percentage: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="discount-amount">Discount Amount (₹)</Label>
                <Input
                  id="discount-amount"
                  type="number"
                  min="0"
                  value={newPromotion.discount_amount}
                  onChange={(e) => setNewPromotion({ ...newPromotion, discount_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="promo-code">Promotion Code (Optional)</Label>
              <Input
                id="promo-code"
                placeholder="e.g., SUMMER2023"
                value={newPromotion.promotion_code}
                onChange={(e) => setNewPromotion({ ...newPromotion, promotion_code: e.target.value.toUpperCase() })}
              />
              <p className="text-xs text-muted-foreground">Leave blank to auto-generate a code</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAddPromotion(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddPromotion}
              disabled={!newPromotion.name || !newPromotion.start_date || !newPromotion.end_date}
            >
              Create Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Promotion Dialog */}
      <Dialog open={openEditPromotion} onOpenChange={setOpenEditPromotion}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Promotion</DialogTitle>
            <DialogDescription>
              Update the details of this promotion.
            </DialogDescription>
          </DialogHeader>
          {selectedPromotion && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-promo-name">Promotion Name</Label>
                <Input
                  id="edit-promo-name"
                  value={selectedPromotion.name}
                  onChange={(e) => setSelectedPromotion({ ...selectedPromotion, name: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-promo-description">Description</Label>
                <Textarea
                  id="edit-promo-description"
                  value={selectedPromotion.description || ''}
                  onChange={(e) => setSelectedPromotion({ ...selectedPromotion, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(new Date(selectedPromotion.start_date), "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={new Date(selectedPromotion.start_date)}
                        onSelect={(date) => date && setSelectedPromotion({ ...selectedPromotion, start_date: date.toISOString() })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(new Date(selectedPromotion.end_date), "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={new Date(selectedPromotion.end_date)}
                        onSelect={(date) => date && setSelectedPromotion({ ...selectedPromotion, end_date: date.toISOString() })}
                        disabled={(date) => date < new Date(selectedPromotion.start_date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-discount-percentage">Discount Percentage (%)</Label>
                  <Input
                    id="edit-discount-percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={selectedPromotion.discount_percentage}
                    onChange={(e) => setSelectedPromotion({ ...selectedPromotion, discount_percentage: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-discount-amount">Discount Amount (₹)</Label>
                  <Input
                    id="edit-discount-amount"
                    type="number"
                    min="0"
                    value={selectedPromotion.discount_amount}
                    onChange={(e) => setSelectedPromotion({ ...selectedPromotion, discount_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-promo-code">Promotion Code</Label>
                <Input
                  id="edit-promo-code"
                  value={selectedPromotion.promotion_code || ''}
                  onChange={(e) => setSelectedPromotion({ ...selectedPromotion, promotion_code: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditPromotion(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditPromotion}
              disabled={!selectedPromotion?.name}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Promotion Dialog */}
      <Dialog open={openSendPromotion} onOpenChange={setOpenSendPromotion}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Promotion</DialogTitle>
            <DialogDescription>
              Send this promotion to a guest via WhatsApp.
            </DialogDescription>
          </DialogHeader>
          {selectedPromotion && (
            <div className="grid gap-4 py-4">
              <div className="p-3 bg-secondary rounded-md">
                <p className="font-medium">{selectedPromotion.name}</p>
                {selectedPromotion.description && (
                  <p className="text-sm mt-1">{selectedPromotion.description}</p>
                )}
                <div className="mt-2 text-sm">
                  <p>
                    {selectedPromotion.discount_percentage > 0 && 
                      `${selectedPromotion.discount_percentage}% Discount`}
                    {selectedPromotion.discount_amount > 0 && 
                      `${selectedPromotion.discount_percentage > 0 ? ' or ' : ''}₹${selectedPromotion.discount_amount} Off`}
                  </p>
                  <p className="mt-1">
                    Valid: {format(parseISO(selectedPromotion.start_date), 'dd MMM yyyy')} - {format(parseISO(selectedPromotion.end_date), 'dd MMM yyyy')}
                  </p>
                  {selectedPromotion.promotion_code && (
                    <p className="mt-1 font-mono">Code: {selectedPromotion.promotion_code}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="recipient-name">Recipient Name</Label>
                <Input
                  id="recipient-name"
                  placeholder="Guest name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="recipient-phone">Recipient Phone Number *</Label>
                <Input
                  id="recipient-phone"
                  placeholder="WhatsApp number"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Include country code (e.g., +91)</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSendPromotion(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendPromotion}
              disabled={!recipientPhone || sendingPromotion}
            >
              <Send className="mr-2 h-4 w-4" />
              {sendingPromotion ? "Sending..." : "Send Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromotionsManager;
