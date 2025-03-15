import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import { supabase, RoomFoodOrder } from "@/integrations/supabase/client";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import { 
  CreditCard, 
  Banknote, 
  QrCode, 
  Plus, 
  Trash2,
  UtensilsCrossed,
  Send
} from 'lucide-react';

interface RoomCheckoutProps {
  roomId: string;
  reservationId: string;
  onComplete: () => void;
}

interface RoomDetails {
  id: string;
  name: string;
  price: number;
  capacity: number;
  restaurant_id: string;
}

interface ReservationDetails {
  id: string;
  customer_name: string;
  start_time: string;
  end_time: string;
  customer_email: string | null;
  customer_phone: string | null;
  special_occasion: string | null;
  special_occasion_date: string | null;
  marketing_consent: boolean;
  notes: string | null;
}

interface AdditionalCharge {
  id: string;
  name: string;
  amount: number;
}

interface FoodOrder {
  id: string;
  items: OrderItem[];
  total: number;
  created_at: string;
  status: string;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const RoomCheckout: React.FC<RoomCheckoutProps> = ({ roomId, reservationId, onComplete }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [newCharge, setNewCharge] = useState({ name: '', amount: 0 });
  const [serviceCharge, setServiceCharge] = useState(0);
  const [includeServiceCharge, setIncludeServiceCharge] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [totalAmount, setTotalAmount] = useState(0);
  const [daysStayed, setDaysStayed] = useState(0);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>([]);
  const [foodOrdersTotal, setFoodOrdersTotal] = useState(0);
  const [sendWhatsappBill, setSendWhatsappBill] = useState(false);
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [billingId, setBillingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError) throw roomError;
        
        if (roomData && typeof roomData.price === 'undefined') {
          roomData.price = 0;
        }
        
        setRoom(roomData as RoomDetails);

        const { data: reservationData, error: reservationError } = await supabase
          .from('reservations')
          .select('*')
          .eq('id', reservationId)
          .single();

        if (reservationError) throw reservationError;
        setReservation(reservationData);

        const startDate = new Date(reservationData.start_time);
        const endDate = new Date(reservationData.end_time);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysStayed(diffDays === 0 ? 1 : diffDays);

        setSendWhatsappBill(reservationData.marketing_consent || false);

        const { data: foodOrdersData, error: foodOrdersError } = await supabase
          .from('room_food_orders')
          .select('*')
          .eq('room_id', roomId)
          .eq('status', 'pending');

        if (foodOrdersError) throw foodOrdersError;
        
        if (foodOrdersData && foodOrdersData.length > 0) {
          setFoodOrders(foodOrdersData as unknown as FoodOrder[]);
          
          const totalFoodOrders = foodOrdersData.reduce((sum, order) => sum + (order.total || 0), 0);
          setFoodOrdersTotal(totalFoodOrders);
          
          if (totalFoodOrders > 0) {
            setAdditionalCharges([{
              id: 'food-orders',
              name: 'Food Orders',
              amount: totalFoodOrders
            }]);
          }
        }
      } catch (error) {
        console.error('Error fetching details:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load room details. Please try again."
        });
      }
    };

    fetchDetails();
  }, [roomId, reservationId, toast]);

  useEffect(() => {
    if (room) {
      const roomTotal = room.price * daysStayed;
      const additionalTotal = additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);
      const serviceChargeAmount = includeServiceCharge ? serviceCharge : 0;
      setTotalAmount(roomTotal + additionalTotal + serviceChargeAmount);
    }
  }, [room, daysStayed, additionalCharges, serviceCharge, includeServiceCharge]);

  const handleAddCharge = () => {
    if (newCharge.name && newCharge.amount > 0) {
      setAdditionalCharges([
        ...additionalCharges,
        { id: Date.now().toString(), ...newCharge }
      ]);
      setNewCharge({ name: '', amount: 0 });
    }
  };

  const handleRemoveCharge = (id: string) => {
    setAdditionalCharges(additionalCharges.filter(charge => charge.id !== id));
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      if (!room || !reservation) {
        throw new Error("Room or reservation details missing");
      }

      const formattedCharges = additionalCharges.map(charge => ({
        id: charge.id,
        name: charge.name,
        amount: Number(charge.amount)
      }));

      const { data, error } = await supabase
        .from('room_billings')
        .insert({
          reservation_id: reservationId,
          room_id: roomId,
          restaurant_id: room.restaurant_id,
          customer_name: reservation.customer_name,
          days_stayed: daysStayed,
          room_charges: room.price * daysStayed,
          service_charge: includeServiceCharge ? Number(serviceCharge) : 0,
          additional_charges: formattedCharges,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          payment_status: 'completed',
          checkout_date: new Date().toISOString(),
          whatsapp_sent: false
        })
        .select()
        .single();

      if (error) {
        console.error('Checkout error:', error);
        throw error;
      }

      setBillingId(data.id);

      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'cleaning' })
        .eq('id', roomId)
        .eq('restaurant_id', room.restaurant_id);

      if (roomError) throw roomError;

      const { error: reservationError } = await supabase
        .from('reservations')
        .update({ status: 'completed' })
        .eq('id', reservationId)
        .eq('restaurant_id', room.restaurant_id);

      if (reservationError) throw reservationError;

      if (foodOrders.length > 0) {
        const { error: foodOrdersError } = await supabase
          .from('room_food_orders')
          .update({ status: 'completed' })
          .in('id', foodOrders.map(order => order.id));

        if (foodOrdersError) throw foodOrdersError;
      }

      if (reservation.special_occasion && reservation.marketing_consent) {
        await createSpecialOccasionPromotion(reservation, room.restaurant_id);
      }

      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        variant: "destructive",
        title: "Checkout Failed",
        description: "There was an error processing your checkout. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const createSpecialOccasionPromotion = async (reservation: ReservationDetails, restaurantId: string) => {
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
        
        const { error } = await supabase
          .from('promotion_campaigns')
          .insert({
            restaurant_id: restaurantId,
            name: `${reservation.special_occasion.charAt(0).toUpperCase() + reservation.special_occasion.slice(1)} Special for ${reservation.customer_name}`,
            description: `Special offer for ${reservation.customer_name}'s ${reservation.special_occasion}`,
            start_date: promotionStartDate.toISOString(),
            end_date: promotionEndDate.toISOString(),
            discount_percentage: 10,
            promotion_code: `${reservation.special_occasion.toUpperCase()}_${Math.floor(Math.random() * 10000)}`,
          });
        
        if (error) {
          console.error("Error creating promotion:", error);
        }
      }
    } catch (error) {
      console.error("Error creating special occasion promotion:", error);
    }
  };

  const sendWhatsAppBill = async () => {
    if (!reservation?.customer_phone || !billingId) return;
    
    setWhatsappSending(true);
    try {
      const billText = generateBillText();
      
      const response = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: reservation.customer_phone.replace(/\D/g, ''),
          message: billText,
          billingId
        }
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      toast({
        title: "Bill Sent",
        description: "The bill has been sent to the guest's WhatsApp."
      });
      
    } catch (error) {
      console.error("Error sending WhatsApp:", error);
      toast({
        variant: "destructive",
        title: "WhatsApp Sending Failed",
        description: "Failed to send the bill via WhatsApp. Please try again."
      });
    } finally {
      setWhatsappSending(false);
    }
  };
  
  const generateBillText = () => {
    if (!room || !reservation) return "";
    
    let billText = `*Bill for ${reservation.customer_name}*\n`;
    billText += `Room: ${room.name}\n`;
    billText += `Check-in: ${new Date(reservation.start_time).toLocaleDateString()}\n`;
    billText += `Check-out: ${new Date(reservation.end_time).toLocaleDateString()}\n`;
    billText += `Days stayed: ${daysStayed}\n\n`;
    
    billText += `Room charges: ₹${room.price * daysStayed}\n`;
    
    if (additionalCharges.length > 0) {
      billText += "\n*Additional Charges:*\n";
      additionalCharges.forEach(charge => {
        billText += `${charge.name}: ₹${charge.amount}\n`;
      });
    }
    
    if (includeServiceCharge) {
      billText += `Service Charge: ₹${serviceCharge}\n`;
    }
    
    billText += `\n*Total Amount: ₹${totalAmount}*\n`;
    billText += `Payment Method: ${paymentMethod}\n\n`;
    billText += "Thank you for staying with us!";
    
    return billText;
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    onComplete();
  };

  if (!room || !reservation) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="pt-6">
          <p className="text-center">Loading checkout details...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Room Checkout</CardTitle>
          <CardDescription>
            Complete the checkout process for {reservation.customer_name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium">Room Details</h3>
                <p className="text-sm text-muted-foreground">Room: {room.name}</p>
                <p className="text-sm text-muted-foreground">Rate: ₹{room.price} per day</p>
                <p className="text-sm text-muted-foreground">Days stayed: {daysStayed}</p>
              </div>
              <div>
                <h3 className="text-lg font-medium">Guest Details</h3>
                <p className="text-sm text-muted-foreground">Name: {reservation.customer_name}</p>
                {reservation.customer_email && (
                  <p className="text-sm text-muted-foreground">Email: {reservation.customer_email}</p>
                )}
                {reservation.customer_phone && (
                  <p className="text-sm text-muted-foreground">Phone: {reservation.customer_phone}</p>
                )}
                {reservation.special_occasion && (
                  <p className="text-sm text-muted-foreground">
                    Special Occasion: {reservation.special_occasion}
                    {reservation.special_occasion_date && 
                      ` (${new Date(reservation.special_occasion_date).toLocaleDateString()})`}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Room Charges</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Room charge ({daysStayed} day{daysStayed !== 1 ? 's' : ''})</TableCell>
                    <TableCell className="text-right">₹{room.price * daysStayed}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {foodOrders.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2 flex items-center">
                  <UtensilsCrossed className="mr-2 h-4 w-4" />
                  Food Orders
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {foodOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {order.items?.map((item, index) => (
                            <div key={index} className="text-sm">
                              {item.name} x{item.quantity} (₹{item.price})
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="text-right">₹{order.total}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={2} className="font-medium text-right">
                        Total Food Orders:
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{foodOrdersTotal}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Additional Charges</h3>
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Service"
                    className="w-32"
                    value={newCharge.name}
                    onChange={(e) => setNewCharge({...newCharge, name: e.target.value})}
                  />
                  <Input 
                    type="number"
                    placeholder="Amount"
                    className="w-24"
                    value={newCharge.amount || ''}
                    onChange={(e) => setNewCharge({...newCharge, amount: parseFloat(e.target.value) || 0})}
                  />
                  <Button size="sm" variant="outline" onClick={handleAddCharge}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {additionalCharges.map((charge) => (
                    <TableRow key={charge.id}>
                      <TableCell>{charge.name}</TableCell>
                      <TableCell className="text-right">₹{charge.amount}</TableCell>
                      <TableCell>
                        {charge.id !== 'food-orders' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveCharge(charge.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="flex items-center gap-2">
                      <Label htmlFor="include-service">Service Charge</Label>
                      <input
                        id="include-service"
                        type="checkbox"
                        checked={includeServiceCharge}
                        onChange={(e) => setIncludeServiceCharge(e.target.checked)}
                        className="mr-2"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={serviceCharge}
                        onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                        className="w-24 ml-auto"
                        disabled={!includeServiceCharge}
                      />
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Payment Method</h3>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  className="flex items-center gap-2"
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote className="h-4 w-4" />
                  Cash
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  className="flex items-center gap-2"
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard className="h-4 w-4" />
                  Card
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'online' ? 'default' : 'outline'}
                  className="flex items-center gap-2"
                  onClick={() => setPaymentMethod('online')}
                >
                  <QrCode className="h-4 w-4" />
                  Online/QR
                </Button>
              </div>
            </div>

            {reservation.customer_phone && (
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="send-whatsapp"
                  checked={sendWhatsappBill}
                  onCheckedChange={(checked) => setSendWhatsappBill(checked === true)}
                />
                <Label htmlFor="send-whatsapp" className="text-sm">
                  Send bill via WhatsApp after checkout
                </Label>
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>₹{totalAmount}</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onComplete}>
            Cancel
          </Button>
          <Button onClick={handleCheckout} disabled={loading}>
            {loading ? "Processing..." : "Complete Checkout"}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checkout Completed</DialogTitle>
            <DialogDescription>
              The room has been checked out successfully and marked for cleaning.
              {reservation.special_occasion && reservation.marketing_consent && (
                <p className="mt-2">
                  A special promotion has been created for the guest's {reservation.special_occasion}.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {reservation.customer_phone && sendWhatsappBill && (
            <div className="py-4">
              <Button 
                onClick={sendWhatsAppBill} 
                disabled={whatsappSending}
                className="w-full"
                variant="secondary"
              >
                <Send className="mr-2 h-4 w-4" />
                {whatsappSending ? "Sending..." : "Send Bill to WhatsApp"}
              </Button>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={handleSuccessClose}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RoomCheckout;
