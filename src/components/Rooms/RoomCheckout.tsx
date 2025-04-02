
import React, { useState, useEffect } from 'react';
import { differenceInDays, format } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import RoomDetailsCard from './CheckoutComponents/RoomDetailsCard';
import RoomChargesTable from './CheckoutComponents/RoomChargesTable';
import FoodOrdersList from './CheckoutComponents/FoodOrdersList';
import AdditionalChargesSection from './CheckoutComponents/AdditionalChargesSection';
import DiscountSection from './CheckoutComponents/DiscountSection';
import PaymentMethodSelector from './CheckoutComponents/PaymentMethodSelector';
import CheckoutSuccessDialog from './CheckoutComponents/CheckoutSuccessDialog';
import { useNavigate } from 'react-router-dom';

interface RoomCheckoutProps {
  room: {
    id: string;
    name: string;
    capacity: number;
    status: string;
    price: number;
    restaurant_id: string;
  };
  reservation: {
    id: string;
    customer_name: string;
    customer_phone?: string;
    start_time: string;
    end_time: string;
  };
  onClose: () => void;
  onCheckoutComplete: () => void;
}

interface FoodOrder {
  id: string;
  room_id: string;
  customer_name: string;
  items: any;
  total: number;
  status: string;
  created_at: string;
}

const RoomCheckout: React.FC<RoomCheckoutProps> = ({ 
  room, 
  reservation, 
  onClose,
  onCheckoutComplete
}) => {
  const [additionalCharges, setAdditionalCharges] = useState<{name: string; amount: number}[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [billingId, setBillingId] = useState<string | null>(null);
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>([]);
  const [restaurantPhone, setRestaurantPhone] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Calculate days stayed
  const startDate = new Date(reservation.start_time);
  const endDate = new Date(reservation.end_time);
  const daysStayed = differenceInDays(endDate, startDate) || 1; // Minimum 1 day
  
  // Calculate room charges
  const roomTotal = room.price * daysStayed;
  
  // Get food orders for this room
  useEffect(() => {
    const fetchFoodOrders = async () => {
      try {
        const { data: orders, error } = await supabase
          .from('room_food_orders')
          .select('*')
          .eq('room_id', room.id)
          .eq('status', 'completed');
        
        if (error) throw error;
        setFoodOrders(orders || []);
      } catch (error) {
        console.error('Error fetching food orders:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load food orders'
        });
      }
    };

    const fetchRestaurantInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('phone')
          .eq('id', room.restaurant_id)
          .single();
        
        if (error) throw error;
        setRestaurantPhone(data?.phone || null);
      } catch (error) {
        console.error('Error fetching restaurant info:', error);
      }
    };

    fetchFoodOrders();
    fetchRestaurantInfo();
  }, [room.id, room.restaurant_id, toast]);

  // Calculate food orders total
  const foodOrdersTotal = foodOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  
  // Calculate additional charges total
  const additionalChargesTotal = additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);
  
  // Calculate discount
  const calculatedDiscount = discountPercent > 0 
    ? (roomTotal + foodOrdersTotal + additionalChargesTotal) * (discountPercent / 100)
    : discountAmount;
  
  // Calculate service charge (5% of room total)
  const serviceCharge = roomTotal * 0.05;
  
  // Calculate grand total
  const grandTotal = roomTotal + foodOrdersTotal + additionalChargesTotal + serviceCharge - calculatedDiscount;

  const handleCheckout = async () => {
    setIsSubmitting(true);
    
    try {
      // Format the additional charges for storing in JSON
      const formattedAdditionalCharges = additionalCharges.map(charge => ({
        name: charge.name,
        amount: charge.amount
      }));
      
      // Create an array of food order IDs
      const foodOrderIds = foodOrders.map(order => order.id);
      
      // Create a new billing record
      const { data: billingData, error: billingError } = await supabase
        .from('room_billings')
        .insert([{
          room_id: room.id,
          reservation_id: reservation.id,
          customer_name: reservation.customer_name,
          room_charges: roomTotal,
          service_charge: serviceCharge,
          additional_charges: formattedAdditionalCharges,
          total_amount: grandTotal,
          payment_method: paymentMethod,
          payment_status: 'completed',
          restaurant_id: room.restaurant_id,
          days_stayed: daysStayed,
          food_orders_total: foodOrdersTotal,
          food_orders_ids: foodOrderIds,
          whatsapp_sent: false
        }])
        .select()
        .single();
      
      if (billingError) throw billingError;
      
      // Update room status to available
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'available' })
        .eq('id', room.id);
      
      if (roomError) throw roomError;
      
      // Set the created billing ID
      setBillingId(billingData?.id || null);
      
      // Show success message
      toast({
        title: 'Checkout Successful',
        description: `${reservation.customer_name} has been checked out successfully.`
      });
      
      // Show success dialog
      setShowSuccessDialog(true);
      
      // Call the onCheckoutComplete callback
      onCheckoutComplete();
    } catch (error) {
      console.error('Error during checkout:', error);
      toast({
        variant: 'destructive',
        title: 'Checkout Failed',
        description: 'An error occurred during checkout. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false);
    navigate('/rooms');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Room Checkout</h2>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <RoomDetailsCard 
            room={room} 
            customerName={reservation.customer_name} 
            checkInDate={format(new Date(reservation.start_time), 'PPP')}
            checkOutDate={format(new Date(reservation.end_time), 'PPP')}
            daysStayed={daysStayed}
          />
          
          <Card>
            <CardContent className="pt-6">
              <RoomChargesTable roomPrice={room.price} daysStayed={daysStayed} />
            </CardContent>
          </Card>
          
          {foodOrders.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <FoodOrdersList foodOrders={foodOrders} />
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardContent className="pt-6">
              <AdditionalChargesSection 
                charges={additionalCharges} 
                onChargesChange={setAdditionalCharges} 
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <DiscountSection 
                subtotal={roomTotal + foodOrdersTotal + additionalChargesTotal}
                discountPercent={discountPercent}
                discountAmount={discountAmount}
                onDiscountPercentChange={setDiscountPercent}
                onDiscountAmountChange={setDiscountAmount}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <PaymentMethodSelector 
                selectedMethod={paymentMethod} 
                onMethodChange={setPaymentMethod} 
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Room Charges:</span>
                  <span>₹{roomTotal.toFixed(2)}</span>
                </div>
                
                {foodOrdersTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Food Orders:</span>
                    <span>₹{foodOrdersTotal.toFixed(2)}</span>
                  </div>
                )}
                
                {additionalChargesTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Additional Charges:</span>
                    <span>₹{additionalChargesTotal.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span>Service Charge (5%):</span>
                  <span>₹{serviceCharge.toFixed(2)}</span>
                </div>
                
                {calculatedDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span>-₹{calculatedDiscount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t pt-4 flex justify-between font-bold">
                  <span>Total Amount:</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
                
                <Button 
                  className="w-full mt-4" 
                  size="lg"
                  disabled={isSubmitting}
                  onClick={handleCheckout}
                >
                  {isSubmitting ? 'Processing...' : 'Complete Checkout'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Checkout Success Dialog */}
      {showSuccessDialog && billingId && (
        <CheckoutSuccessDialog 
          open={showSuccessDialog} 
          onClose={handleCloseSuccessDialog}
          billingId={billingId}
          customerName={reservation.customer_name}
          customerPhone={reservation.customer_phone || ''}
          roomName={room.name}
          checkoutDate={format(new Date(), 'PPP')}
          totalAmount={grandTotal}
          restaurantId={room.restaurant_id}
          restaurantPhone={restaurantPhone || ''}
        />
      )}
    </div>
  );
};

export default RoomCheckout;
