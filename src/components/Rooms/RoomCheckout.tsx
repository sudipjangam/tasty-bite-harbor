
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase, RoomFoodOrder } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/Rooms/Checkbox";
import { Label } from "@/components/Rooms/Label";

// Import the component sub-parts
import RoomDetailsCard from './CheckoutComponents/RoomDetailsCard';
import RoomChargesTable from './CheckoutComponents/RoomChargesTable';
import FoodOrdersList from './CheckoutComponents/FoodOrdersList';
import AdditionalChargesSection from './CheckoutComponents/AdditionalChargesSection';
import PaymentMethodSelector from './CheckoutComponents/PaymentMethodSelector';
import CheckoutSuccessDialog from './CheckoutComponents/CheckoutSuccessDialog';

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
        
        // Create the promotion for next year's special occasion
        const { data, error } = await supabase
          .from('promotion_campaigns')
          .insert({
            restaurant_id: restaurantId,
            name: `${reservation.special_occasion.charAt(0).toUpperCase() + reservation.special_occasion.slice(1)} Special for ${reservation.customer_name}`,
            description: `Special offer for ${reservation.customer_name}'s ${reservation.special_occasion} next year`,
            start_date: promotionStartDate.toISOString(),
            end_date: promotionEndDate.toISOString(),
            discount_percentage: 10,
            promotion_code: `${reservation.special_occasion.toUpperCase()}_${Math.floor(Math.random() * 10000)}`,
          })
          .select();
        
        if (error) {
          console.error("Error creating promotion:", error);
          return;
        }
        
        // If customer consented to marketing, send them a notification about the future promotion
        if (reservation.customer_phone && reservation.marketing_consent && data && data.length > 0) {
          const promotionId = data[0].id;
          const message = `Hello ${reservation.customer_name},\n\nThank you for staying with us and sharing your ${reservation.special_occasion} details! We've created a special offer for your next ${reservation.special_occasion}.\n\nMark your calendar for next year, and we look forward to celebrating with you again!\n\nBest wishes,\nOur Restaurant Team`;
          
          try {
            await supabase.functions.invoke("send-whatsapp", {
              body: {
                phone: reservation.customer_phone.replace(/\D/g, ''),
                message: message,
                promotionId: promotionId,
                recipientId: reservation.id,
                recipientType: "reservation"
              }
            });
          } catch (sendError) {
            console.error("Error sending promotion notification:", sendError);
          }
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
      
      console.log("Sending WhatsApp bill to:", reservation.customer_phone.replace(/\D/g, ''));
      const response = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: reservation.customer_phone.replace(/\D/g, ''),
          message: billText,
          billingId
        }
      });
      
      console.log("WhatsApp response:", response);
      
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
            <RoomDetailsCard 
              room={room} 
              daysStayed={daysStayed}
              customer={{
                name: reservation.customer_name,
                email: reservation.customer_email,
                phone: reservation.customer_phone,
                specialOccasion: reservation.special_occasion,
                specialOccasionDate: reservation.special_occasion_date
              }}
            />

            <RoomChargesTable roomPrice={room.price} daysStayed={daysStayed} />

            {foodOrders.length > 0 && (
              <FoodOrdersList foodOrders={foodOrders} foodOrdersTotal={foodOrdersTotal} />
            )}

            <AdditionalChargesSection 
              additionalCharges={additionalCharges}
              newCharge={newCharge}
              setNewCharge={setNewCharge}
              handleAddCharge={handleAddCharge}
              handleRemoveCharge={handleRemoveCharge}
              includeServiceCharge={includeServiceCharge}
              setIncludeServiceCharge={setIncludeServiceCharge}
              serviceCharge={serviceCharge}
              setServiceCharge={setServiceCharge}
            />

            <PaymentMethodSelector 
              selectedMethod={paymentMethod}
              onMethodChange={setPaymentMethod}
            />

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

      <CheckoutSuccessDialog 
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        onDone={handleSuccessClose}
        hasSpecialOccasion={!!reservation.special_occasion}
        hasMarketingConsent={!!reservation.marketing_consent}
        specialOccasionType={reservation.special_occasion}
        customerPhone={reservation.customer_phone}
        sendWhatsappBill={sendWhatsappBill}
        whatsappSending={whatsappSending}
        onSendWhatsAppBill={sendWhatsAppBill}
      />
    </>
  );
};

export default RoomCheckout;
