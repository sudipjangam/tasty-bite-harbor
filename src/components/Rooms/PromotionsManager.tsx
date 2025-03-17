import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase, PromotionCampaign, SentPromotion, ReservationWithSpecialOccasion } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Filter, CalendarIcon, Check, Plus, Send, Trash2 } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface PromotionsManagerProps {
  restaurantId: string;
}

const formSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  discountPercentage: z.coerce.number().min(0).max(100),
  discountAmount: z.coerce.number().min(0),
  promotionCode: z.string().optional(),
});

type SpecialOccasion = {
  id: string;
  customer_name: string;
  customer_phone: string;
  occasion: string;
  occasion_date: string;
  reservation_id: string;
};

const PromotionsManager: React.FC<PromotionsManagerProps> = ({ restaurantId }) => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>([]);
  const [sentPromotions, setSentPromotions] = useState<SentPromotion[]>([]);
  const [specialOccasions, setSpecialOccasions] = useState<SpecialOccasion[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<string | null>(null);
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState("campaigns");
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      discountPercentage: 10,
      discountAmount: 0,
      promotionCode: "",
    },
  });

  useEffect(() => {
    fetchCampaigns();
    fetchSentPromotions();
    fetchSpecialOccasions();
  }, [restaurantId]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("promotion_campaigns")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data as PromotionCampaign[]);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load promotion campaigns.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSentPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from("sent_promotions")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("sent_date", { ascending: false });

      if (error) throw error;
      setSentPromotions(data as SentPromotion[]);
    } catch (error) {
      console.error("Error fetching sent promotions:", error);
    }
  };

  const fetchSpecialOccasions = async () => {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select("id, customer_name, customer_phone, special_occasion, special_occasion_date")
        .eq("restaurant_id", restaurantId)
        .not("special_occasion", "is", null)
        .not("special_occasion_date", "is", null)
        .eq("marketing_consent", true);

      if (error) throw error;
      
      const occasions = data.map(res => ({
        id: res.id,
        customer_name: res.customer_name,
        customer_phone: res.customer_phone || "",
        occasion: res.special_occasion || "",
        occasion_date: res.special_occasion_date || "",
        reservation_id: res.id
      }));
      
      setSpecialOccasions(occasions);
    } catch (error) {
      console.error("Error fetching special occasions:", error);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsCreating(true);
      
      const { data, error } = await supabase.from("promotion_campaigns").insert({
        restaurant_id: restaurantId,
        name: values.name,
        description: values.description || null,
        start_date: values.startDate.toISOString(),
        end_date: values.endDate.toISOString(),
        discount_percentage: values.discountPercentage,
        discount_amount: values.discountAmount,
        promotion_code: values.promotionCode || null,
      }).select();

      if (error) throw error;

      toast({
        title: "Promotion Created",
        description: "New promotion campaign has been created successfully."
      });

      form.reset();
      fetchCampaigns();
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating promotion:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create promotion campaign."
      });
      setIsCreating(false);
    }
  };

  const sendPromotions = async () => {
    if (!selectedPromotion || selectedGuests.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a promotion and at least one guest."
      });
      return;
    }

    setIsSending(true);
    
    const promotion = campaigns.find(c => c.id === selectedPromotion);
    if (!promotion) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selected promotion not found."
      });
      setIsSending(false);
      return;
    }

    const guests = specialOccasions.filter(g => selectedGuests.includes(g.id));
    let successCount = 0;
    let errorCount = 0;

    for (const guest of guests) {
      if (!guest.customer_phone) {
        errorCount++;
        continue;
      }

      try {
        const message = `Hello ${guest.customer_name},\n\nWe are excited to offer you a special promotion for your upcoming ${guest.occasion}!\n\n${promotion.name}\n${promotion.description || ""}\nDiscount: ${promotion.discount_percentage}%\nValid from: ${new Date(promotion.start_date).toLocaleDateString()} to ${new Date(promotion.end_date).toLocaleDateString()}\n${promotion.promotion_code ? `Promotion code: ${promotion.promotion_code}` : ""}\n\nWe look forward to celebrating with you!\n\nBest regards,\nYour Restaurant Team`;

        const response = await supabase.functions.invoke("send-whatsapp", {
          body: {
            phone: guest.customer_phone.replace(/\D/g, ""),
            message: message,
            promotionId: promotion.id,
            recipientId: guest.reservation_id,
            recipientType: "reservation"
          }
        });

        if (response.error) {
          throw new Error(response.error);
        }

        successCount++;
      } catch (error) {
        console.error(`Error sending promotion to ${guest.customer_name}:`, error);
        errorCount++;
      }
    }

    setIsSending(false);
    fetchSentPromotions();

    if (successCount > 0) {
      toast({
        title: "Promotions Sent",
        description: `Successfully sent ${successCount} promotion(s).${errorCount > 0 ? ` Failed to send ${errorCount}.` : ""}`
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send promotions. Please try again."
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading promotions...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Promotions Manager</CardTitle>
        <CardDescription>
          Create and manage promotional campaigns for special occasions
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="specialOccasions">Special Occasions</TabsTrigger>
            <TabsTrigger value="sent">Sent Promotions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="campaigns">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Current Campaigns</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" /> New Campaign
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Create New Promotion Campaign</DialogTitle>
                    <DialogDescription>
                      Create a new promotion campaign for your restaurant.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Campaign Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Summer Special" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enjoy a special discount this summer" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Start Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className="pl-3 text-left font-normal"
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>End Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className="pl-3 text-left font-normal"
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="discountPercentage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount Percentage (%)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="discountAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount Amount (₹)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="promotionCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Promotion Code (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="SUMMER2023" {...field} />
                            </FormControl>
                            <FormDescription>
                              A code customers can use to redeem this promotion
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button type="submit" disabled={isCreating}>
                          {isCreating ? "Creating..." : "Create Campaign"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {campaigns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No campaigns found. Create your first promotion campaign.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => {
                    const now = new Date();
                    const startDate = new Date(campaign.start_date);
                    const endDate = new Date(campaign.end_date);
                    let status = "Upcoming";
                    
                    if (now >= startDate && now <= endDate) {
                      status = "Active";
                    } else if (now > endDate) {
                      status = "Expired";
                    }
                    
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">
                          <div>{campaign.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {campaign.description && campaign.description.length > 30
                              ? `${campaign.description.substring(0, 30)}...`
                              : campaign.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {campaign.discount_percentage > 0 && `${campaign.discount_percentage}%`}
                          {campaign.discount_amount > 0 && campaign.discount_percentage > 0 && " / "}
                          {campaign.discount_amount > 0 && `₹${campaign.discount_amount}`}
                        </TableCell>
                        <TableCell>{campaign.promotion_code || "-"}</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            status === "Active" 
                              ? "bg-green-100 text-green-800" 
                              : status === "Upcoming" 
                                ? "bg-blue-100 text-blue-800" 
                                : "bg-gray-100 text-gray-800"
                          }`}>
                            {status}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>
          
          <TabsContent value="specialOccasions">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Special Occasions</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Send className="h-4 w-4 mr-2" /> Send Promotions
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Send Promotions</DialogTitle>
                    <DialogDescription>
                      Send a promotion to guests with upcoming special occasions.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select Promotion</Label>
                      <Select 
                        onValueChange={(value) => setSelectedPromotion(value)}
                        value={selectedPromotion || undefined}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a promotion campaign" />
                        </SelectTrigger>
                        <SelectContent>
                          {campaigns
                            .filter(c => {
                              const now = new Date();
                              const startDate = new Date(c.start_date);
                              const endDate = new Date(c.end_date);
                              return now <= endDate; // Only show active and upcoming campaigns
                            })
                            .map((campaign) => (
                              <SelectItem key={campaign.id} value={campaign.id}>
                                {campaign.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Select Guests</Label>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            if (selectedGuests.length === specialOccasions.length) {
                              setSelectedGuests([]);
                            } else {
                              setSelectedGuests(specialOccasions.map(g => g.id));
                            }
                          }}
                        >
                          {selectedGuests.length === specialOccasions.length ? "Deselect All" : "Select All"}
                        </Button>
                      </div>
                      
                      <div className="border rounded-md max-h-60 overflow-y-auto p-2">
                        {specialOccasions.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground">
                            No guests with special occasions found.
                          </div>
                        ) : (
                          specialOccasions.map((guest) => (
                            <div 
                              key={guest.id} 
                              className="flex items-center space-x-2 py-2 border-b last:border-0"
                            >
                              <Checkbox 
                                id={`guest-${guest.id}`}
                                checked={selectedGuests.includes(guest.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedGuests(prev => [...prev, guest.id]);
                                  } else {
                                    setSelectedGuests(prev => prev.filter(id => id !== guest.id));
                                  }
                                }}
                              />
                              <label 
                                htmlFor={`guest-${guest.id}`}
                                className="text-sm flex-1 cursor-pointer"
                              >
                                <div className="font-medium">{guest.customer_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {guest.occasion} - {new Date(guest.occasion_date).toLocaleDateString()}
                                </div>
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={sendPromotions}
                      disabled={!selectedPromotion || selectedGuests.length === 0 || isSending}
                    >
                      {isSending ? "Sending..." : "Send Promotions"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            {specialOccasions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No special occasions found. Guests can select special occasions when making reservations.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Occasion</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specialOccasions.map((occasion) => (
                    <TableRow key={occasion.id}>
                      <TableCell className="font-medium">{occasion.customer_name}</TableCell>
                      <TableCell className="capitalize">{occasion.occasion}</TableCell>
                      <TableCell>{new Date(occasion.occasion_date).toLocaleDateString()}</TableCell>
                      <TableCell>{occasion.customer_phone || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
          
          <TabsContent value="sent">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Sent Promotions</h3>
              <Button size="sm" variant="outline" onClick={fetchSentPromotions}>
                <Filter className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </div>
            
            {sentPromotions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sent promotions found. Send a promotion to see the history here.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sentPromotions.map((promotion) => (
                    <TableRow key={promotion.id}>
                      <TableCell className="font-medium">{promotion.customer_name}</TableCell>
                      <TableCell>{new Date(promotion.sent_date).toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{promotion.sent_method}</TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          promotion.sent_status === "sent"
                            ? "bg-green-100 text-green-800"
                            : promotion.sent_status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}>
                          {promotion.sent_status}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PromotionsManager;
