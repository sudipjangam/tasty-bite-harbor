import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import RoomDetailsCard from "./CheckoutComponents/RoomDetailsCard";
import RoomChargesTable from "./CheckoutComponents/RoomChargesTable";
import FoodOrdersList from "./CheckoutComponents/FoodOrdersList";
import AdditionalChargesSection from "./CheckoutComponents/AdditionalChargesSection";
import PaymentMethodSelector from "./CheckoutComponents/PaymentMethodSelector";
import DiscountSection from "./CheckoutComponents/DiscountSection";
import CheckoutSuccessDialog from "./CheckoutComponents/CheckoutSuccessDialog";
import { OrderItem } from "@/integrations/supabase/client";

interface RoomCheckoutProps {
  roomId: string;
  reservationId: string;
  onComplete: () => Promise<void>;
}

interface AdditionalCharge {
  id: string;
  name: string;
  amount: number;
}

const RoomCheckout: React.FC<RoomCheckoutProps> = ({ 
  roomId, 
  reservationId,
  onComplete
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [room, setRoom] = useState<any>(null);
  const [reservation, setReservation] = useState<any>(null);
  const [foodOrders, setFoodOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'none'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  
  const [newCharge, setNewCharge] = useState<{ name: string; amount: number }>({ name: '', amount: 0 });
  const [includeServiceCharge, setIncludeServiceCharge] = useState(false);
  const [serviceCharge, setServiceCharge] = useState(0);
  
  useEffect(() => {
    const fetchCheckoutData = async () => {
      try {
        setLoading(true);
        
        const { data: roomData, error: roomError } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", roomId)
          .single();
          
        if (roomError) throw roomError;
        
        const { data: reservationData, error: reservationError } = await supabase
          .from("reservations")
          .select("*")
          .eq("id", reservationId)
          .single();
          
        if (reservationError) throw reservationError;
        
        const { data: foodOrdersData, error: foodOrdersError } = await supabase
          .from("room_food_orders")
          .select("*")
          .eq("room_id", roomId)
          .eq("status", "delivered");
          
        if (foodOrdersError) throw foodOrdersError;
        
        setRoom(roomData);
        setReservation(reservationData);
        setFoodOrders(foodOrdersData || []);
      } catch (error) {
        console.error("Error fetching checkout data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load checkout data. Please try again.",
        });
        navigate("/rooms");
      } finally {
        setLoading(false);
      }
    };
    
    fetchCheckoutData();
  }, [roomId, reservationId, navigate, toast]);
  
  const calculateDuration = () => {
    if (!reservation) return 0;
    
    const startTime = new Date(reservation.start_time);
    const endTime = new Date(reservation.end_time);
    
    const diffTime = Math.abs(endTime.getTime() - startTime.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays === 0 ? 1 : diffDays;
  };
  
  const calculateRoomTotal = () => {
    if (!room || !reservation) return 0;
    return room.price * calculateDuration();
  };
  
  const calculateFoodOrdersTotal = () => {
    return foodOrders.reduce((total, order) => {
      if (typeof order.total === 'number') {
        return total + order.total;
      }
      if (order.items && Array.isArray(order.items)) {
        return total + (order.items as OrderItem[]).reduce((itemTotal, item) => {
          return itemTotal + (item.price * item.quantity);
        }, 0);
      }
      return total;
    }, 0);
  };
  
  const calculateAdditionalChargesTotal = () => {
    let total = additionalCharges.reduce((total, charge) => total + (charge.amount || 0), 0);
    if (includeServiceCharge) {
      total += serviceCharge;
    }
    return total;
  };
  
  const calculateDiscountAmount = () => {
    const subtotal = calculateRoomTotal() + calculateFoodOrdersTotal() + calculateAdditionalChargesTotal();
    
    if (discountType === 'none') return 0;
    if (discountType === 'fixed') return discountValue;
    if (discountType === 'percentage') {
      return (discountValue / 100) * subtotal;
    }
    return 0;
  };
  
  const calculateGrandTotal = () => {
    const subtotal = calculateRoomTotal() + calculateFoodOrdersTotal() + calculateAdditionalChargesTotal();
    const discount = calculateDiscountAmount();
    return subtotal - discount;
  };
  
  const handleAddCharge = () => {
    if (newCharge.name.trim() && newCharge.amount > 0) {
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
    try {
      if (!reservation || !room) {
        throw new Error("Missing reservation or room data");
      }
      
      const allAdditionalCharges = [...additionalCharges];
      if (includeServiceCharge && serviceCharge > 0) {
        allAdditionalCharges.push({
          id: 'service-charge',
          name: 'Service Charge',
          amount: serviceCharge
        });
      }
      
      if (calculateFoodOrdersTotal() > 0) {
        allAdditionalCharges.push({
          id: 'food-orders',
          name: 'Food Orders',
          amount: calculateFoodOrdersTotal()
        });
      }
      
      const { data: billingData, error: billingError } = await supabase
        .from("room_billings")
        .insert({
          room_id: roomId,
          reservation_id: reservationId,
          restaurant_id: room.restaurant_id,
          room_charges: calculateRoomTotal(),
          additional_charges: JSON.stringify(allAdditionalCharges),
          service_charge: includeServiceCharge ? serviceCharge : 0,
          total_amount: calculateGrandTotal(),
          payment_method: paymentMethod,
          payment_status: "paid",
          customer_name: reservation.customer_name,
          days_stayed: calculateDuration()
        })
        .select()
        .single();
        
      if (billingError) throw billingError;
      
      const { error: roomUpdateError } = await supabase
        .from("rooms")
        .update({ status: "cleaning" })
        .eq("id", roomId);
        
      if (roomUpdateError) throw roomUpdateError;
      
      const { error: reservationUpdateError } = await supabase
        .from("reservations")
        .update({ status: "completed" })
        .eq("id", reservationId);
        
      if (reservationUpdateError) throw reservationUpdateError;
      
      if (foodOrders.length > 0) {
        const foodOrderIds = foodOrders.map(order => order.id);
        const { error: foodOrderUpdateError } = await supabase
          .from("room_food_orders")
          .update({ status: "billed" })
          .in("id", foodOrderIds);
          
        if (foodOrderUpdateError) throw foodOrderUpdateError;
      }
      
      setCheckoutComplete(true);
      
    } catch (error) {
      console.error("Error during checkout:", error);
      toast({
        variant: "destructive",
        title: "Checkout Failed",
        description: "There was an error processing the checkout. Please try again.",
      });
    }
  };
  
  const handleSuccessClose = async () => {
    await onComplete();
    navigate("/rooms");
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  const customer = reservation ? {
    name: reservation.customer_name,
    email: reservation.customer_email,
    phone: reservation.customer_phone,
    specialOccasion: reservation.special_occasion,
    specialOccasionDate: reservation.special_occasion_date
  } : {
    name: '',
    email: null,
    phone: null,
    specialOccasion: null,
    specialOccasionDate: null
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate("/rooms")}
          className="text-sm flex items-center text-muted-foreground hover:text-primary transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Rooms
        </button>
        
        <h1 className="text-3xl font-bold">Room Checkout</h1>
        
        <div className="w-20"></div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {room && reservation && (
            <RoomDetailsCard 
              room={room} 
              daysStayed={calculateDuration()}
              customer={{
                name: reservation.customer_name,
                email: reservation.customer_email,
                phone: reservation.customer_phone,
                specialOccasion: reservation.special_occasion,
                specialOccasionDate: reservation.special_occasion_date
              }}
            />
          )}
          
          <RoomChargesTable 
            roomPrice={room?.price || 0}
            daysStayed={calculateDuration()}
          />
          
          {foodOrders.length > 0 && (
            <FoodOrdersList 
              foodOrders={foodOrders} 
              foodOrdersTotal={calculateFoodOrdersTotal()} 
            />
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
          
          <DiscountSection
            discountType={discountType}
            discountValue={discountValue}
            onDiscountTypeChange={setDiscountType}
            onDiscountValueChange={setDiscountValue}
            totalBeforeDiscount={calculateRoomTotal() + calculateFoodOrdersTotal() + calculateAdditionalChargesTotal()}
          />
          
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onMethodChange={setPaymentMethod}
          />
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
            <h2 className="text-xl font-bold mb-4">Payment Summary</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Room Charges:</span>
                <span>₹{calculateRoomTotal().toFixed(2)}</span>
              </div>
              
              {calculateFoodOrdersTotal() > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Food Orders:</span>
                  <span>₹{calculateFoodOrdersTotal().toFixed(2)}</span>
                </div>
              )}
              
              {calculateAdditionalChargesTotal() > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Additional Charges:</span>
                  <span>₹{calculateAdditionalChargesTotal().toFixed(2)}</span>
                </div>
              )}
              
              {calculateDiscountAmount() > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-₹{calculateDiscountAmount().toFixed(2)}</span>
                </div>
              )}
              
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>₹{calculateGrandTotal().toFixed(2)}</span>
              </div>
            </div>
            
            <Button 
              onClick={handleCheckout} 
              className="w-full bg-primary hover:bg-primary/90 text-white"
              size="lg"
            >
              Complete Checkout
            </Button>
            
            <p className="text-xs text-muted-foreground mt-4 text-center">
              By completing checkout, the room status will be changed to "cleaning" and the reservation will be marked as completed.
            </p>
          </div>
        </div>
      </div>
      
      <CheckoutSuccessDialog
        open={checkoutComplete}
        onOpenChange={setCheckoutComplete}
        onDone={handleSuccessClose}
        hasSpecialOccasion={!!reservation?.special_occasion}
        hasMarketingConsent={!!reservation?.marketing_consent}
        specialOccasionType={reservation?.special_occasion || null}
        customerPhone={reservation?.customer_phone || null}
        sendWhatsappBill={false}
        whatsappSending={false}
        onSendWhatsAppBill={() => {}}
      />
    </div>
  );
};

export default RoomCheckout;
