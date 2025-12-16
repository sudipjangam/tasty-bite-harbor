import React, { useState, useEffect } from 'react';
import { differenceInDays, format } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  MapPin, 
  CreditCard, 
  Receipt, 
  Clock,
  Bed,
  DollarSign,
  CheckCircle
} from "lucide-react";

import RoomDetailsCard from './RoomDetailsCard';
import RoomChargesTable from './RoomChargesTable';
import FoodOrdersList from './FoodOrdersList';
import AdditionalChargesSection from './AdditionalChargesSection';
import DiscountSection from './DiscountSection';
import PaymentMethodSelector from './PaymentMethodSelector';
import CheckoutSuccessDialog from './CheckoutSuccessDialog';
import PrintBillButton from './PrintBillButton';
import QRPaymentDialog from './QRPaymentDialog';
import ServiceChargeSection from './ServiceChargeSection';
import PromoCodeSection from './PromoCodeSection';

interface RoomCheckoutPageProps {
  roomId: string;
  reservationId: string;
  onComplete: () => Promise<void>;
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

interface RoomDetails {
  id: string;
  name: string;
  capacity: number;
  status: string;
  price: number;
  restaurant_id: string;
}

interface ReservationDetails {
  id: string;
  customer_name: string;
  customer_phone?: string;
  start_time: string;
  end_time: string;
}

const RoomCheckoutPage: React.FC<RoomCheckoutPageProps> = ({ 
  roomId, 
  reservationId, 
  onComplete 
}) => {
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [additionalCharges, setAdditionalCharges] = useState<{name: string; amount: number}[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false);
  const [serviceChargePercent, setServiceChargePercent] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [billingId, setBillingId] = useState<string | null>(null);
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>([]);
  const [posOrders, setPosOrders] = useState<{ id: string; total: number }[]>([]);
  const [restaurantPhone, setRestaurantPhone] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [restaurantAddress, setRestaurantAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showQRPayment, setShowQRPayment] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [promotionCode, setPromotionCode] = useState('');
  const [appliedPromotion, setAppliedPromotion] = useState<any>(null);
  const [promotionDiscountAmount, setPromotionDiscountAmount] = useState(0);
  const [activePromotions, setActivePromotions] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCheckoutData = async () => {
      try {
        setLoading(true);
        
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();
        
        if (roomError) throw roomError;
        setRoom(roomData);
        
        const { data: reservationData, error: reservationError } = await supabase
          .from('reservations')
          .select('*')
          .eq('id', reservationId)
          .single();
        
        if (reservationError) throw reservationError;
        setReservation(reservationData);
        
        const { data: ordersData, error: ordersError } = await supabase
          .from('room_food_orders')
          .select('*')
          .eq('room_id', roomId)
          .eq('status', 'delivered');
        
        if (ordersError) throw ordersError;
        setFoodOrders(ordersData || []);

        // Fetch POS orders charged to this reservation (Pending - Room Charge)
        const { data: posData, error: posError } = await supabase
          .from('orders')
          .select('id, total, payment_status, reservation_id')
          .eq('reservation_id', reservationId)
          .eq('payment_status', 'Pending - Room Charge');
        if (posError) {
          console.error('Error fetching POS orders:', posError);
        } else {
          setPosOrders((posData || []).map((o: any) => ({ id: o.id, total: Number(o.total) || 0 })));
        }
        
        if (roomData?.restaurant_id) {
          const { data: restaurantData, error: restaurantError } = await supabase
            .from('restaurants')
            .select('name, phone, address')
            .eq('id', roomData.restaurant_id)
            .single();
          
          if (!restaurantError && restaurantData) {
            setRestaurantPhone(restaurantData.phone || null);
            setRestaurantName(restaurantData.name || 'Your Hotel');
            setRestaurantAddress(restaurantData.address || 'Hotel Address');
          }
        }

        // Generate invoice number
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        setInvoiceNumber(`TEMP-${timestamp}${randomNum}`);
        
        // Fetch active promotions
        if (roomData?.restaurant_id) {
          const today = new Date().toISOString().split('T')[0];
          const { data: promotionsData, error: promotionsError } = await supabase
            .from('promotion_campaigns')
            .select('*')
            .eq('restaurant_id', roomData.restaurant_id)
            .eq('is_active', true)
            .not('promotion_code', 'is', null)
            .lte('start_date', today)
            .gte('end_date', today);
          
          if (!promotionsError && promotionsData) {
            setActivePromotions(promotionsData);
          }
        }
        
        
      } catch (error) {
        console.error('Error fetching checkout data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load checkout data'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutData();
  }, [roomId, reservationId, toast]);
  
  if (loading || !room || !reservation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 flex justify-center items-center">
        <div className="animate-pulse bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
          <div className="text-xl font-semibold text-gray-600">Loading checkout data...</div>
        </div>
      </div>
    );
  }
  
  const startDate = new Date(reservation.start_time);
  const endDate = new Date(reservation.end_time);
  const daysStayed = Math.max(differenceInDays(endDate, startDate), 1);
  
  const roomTotal = room.price * daysStayed;
  
  const foodOrdersTotal = foodOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const posOrdersTotal = posOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  
  const additionalChargesTotal = additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);
  
  const subtotalBeforeDiscount = roomTotal + foodOrdersTotal + posOrdersTotal + additionalChargesTotal;
  
  // Calculate manual discount
  const manualDiscount = discountPercent > 0 
    ? (subtotalBeforeDiscount * discountPercent / 100)
    : discountAmount;
  
  // Calculate promotion discount if applied
  const calculatedPromotionDiscount = appliedPromotion 
    ? (appliedPromotion.discount_percentage 
      ? (subtotalBeforeDiscount * appliedPromotion.discount_percentage / 100)
      : appliedPromotion.discount_amount || 0)
    : 0;
  
  // Total discount combines both manual and promotion
  const totalDiscount = manualDiscount + calculatedPromotionDiscount;
  
  // Calculate effective discount percentage for display
  const effectiveDiscountPercentage = discountPercent > 0 
    ? discountPercent 
    : (appliedPromotion?.discount_percentage 
      ? appliedPromotion.discount_percentage 
      : (totalDiscount > 0 && subtotalBeforeDiscount > 0 
        ? Math.round((totalDiscount / subtotalBeforeDiscount) * 100 * 100) / 100 
        : 0));
  
  const serviceCharge = serviceChargeEnabled
    ? ((subtotalBeforeDiscount - totalDiscount) * serviceChargePercent / 100)
    : 0;
  
  const grandTotal = subtotalBeforeDiscount - totalDiscount + serviceCharge;

  const handleApplyPromotion = async () => {
    if (!promotionCode.trim()) {
      toast({
        title: "Enter Promotion Code",
        description: "Please enter a promotion code to apply.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Call backend validation function
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: {
          code: promotionCode.trim(),
          orderSubtotal: subtotalBeforeDiscount,
          restaurantId: room.restaurant_id
        }
      });

      if (error) throw error;

      if (data.valid && data.promotion) {
        setAppliedPromotion(data.promotion);
        setPromotionDiscountAmount(data.promotion.calculated_discount || 0);
        toast({
          title: "Promotion Applied!",
          description: `${data.promotion.name} - ${data.promotion.discount_percentage ? `${data.promotion.discount_percentage}% off` : `₹${data.promotion.discount_amount} off`}`,
        });
      } else {
        toast({
          title: "Invalid Code",
          description: data.error || "The promotion code you entered is not valid or has expired.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error validating promo code:', error);
      toast({
        title: "Validation Error",
        description: "Failed to validate promotion code. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRemovePromotion = () => {
    setAppliedPromotion(null);
    setPromotionCode('');
    setPromotionDiscountAmount(0);
    toast({
      title: "Promotion Removed",
      description: "The promotion code has been removed from this checkout."
    });
  };

  const handleCheckout = async () => {
    setIsSubmitting(true);
    
    try {
      const formattedAdditionalCharges = additionalCharges.map(charge => ({
        name: charge.name,
        amount: charge.amount
      }));
      
      const foodOrderIds = foodOrders.map(order => order.id);
      
      const { data: billingData, error: billingError } = await supabase
        .from('room_billings')
        .insert([{
          room_id: room.id,
          reservation_id: reservationId,
          customer_name: reservation.customer_name,
          room_charges: roomTotal,
          service_charge: serviceCharge,
          additional_charges: formattedAdditionalCharges,
          discount_amount: totalDiscount,
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
      
      // Log promotion usage if promotion was applied
      if (appliedPromotion && billingData) {
        try {
          await supabase.functions.invoke('log-promotion-usage', {
            body: {
              orderId: billingData.id,
              promotionId: appliedPromotion.id,
              restaurantId: room.restaurant_id,
              customerName: reservation.customer_name,
              customerPhone: reservation.customer_phone || null,
              orderTotal: grandTotal,
              discountAmount: calculatedPromotionDiscount
            }
          });
        } catch (promoError) {
          console.error('Error logging promotion usage:', promoError);
          // Don't fail the checkout if logging fails
        }
      }
      
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'available' })
        .eq('id', room.id);
      
      if (roomError) throw roomError;
      
      setBillingId(billingData?.id || null);
      
      toast({
        title: 'Checkout Successful',
        description: `${reservation.customer_name} has been checked out successfully.`
      });
      
      setShowSuccessDialog(true);
      
      onComplete();
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

  const handleCancel = () => {
    navigate('/rooms');
  };

  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false);
    navigate('/rooms');
  };

  const handleQRPayment = () => {
    setShowQRPayment(true);
  };

  const handleQRPaymentComplete = () => {
    setShowQRPayment(false);
    setPaymentMethod('qr');
    handleCheckout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 p-6 transition-colors duration-300">
      {/* Modern Header */}
      <div className="mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-3xl shadow-2xl p-8 transition-colors duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl">
              <Receipt className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Room Checkout
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg mt-2 flex items-center gap-2 transition-colors duration-300">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Complete guest checkout and billing
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-400 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/20 dark:hover:to-purple-900/20 text-gray-700 dark:text-gray-200 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold px-6 py-3 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Rooms
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Guest & Room Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest Information Card */}
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-gray-100 transition-colors duration-300">
                <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl">
                  <User className="h-5 w-5 text-white" />
                </div>
                Guest Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl transition-colors duration-300">
                    <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Guest Name</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{reservation.customer_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl transition-colors duration-300">
                    <Bed className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Room</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{room.name}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl transition-colors duration-300">
                    <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Check-in</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{format(new Date(reservation.start_time), 'PPP')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl transition-colors duration-300">
                    <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Days Stayed</p>
                      <Badge variant="secondary" className="font-semibold">{daysStayed} day{daysStayed > 1 ? 's' : ''}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Room Charges */}
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl transition-colors duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-gray-100 transition-colors duration-300">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                Room Charges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RoomChargesTable roomPrice={room.price} daysStayed={daysStayed} posTotal={posOrdersTotal} />
            </CardContent>
          </Card>
          
          {/* Food Orders */}
          {foodOrders.length > 0 && (
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl transition-colors duration-300">
              <CardContent className="pt-6">
                <FoodOrdersList foodOrders={foodOrders} />
              </CardContent>
            </Card>
          )}
          
          {/* Additional Charges */}
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl transition-colors duration-300">
            <CardContent className="pt-6">
              <AdditionalChargesSection 
                charges={additionalCharges} 
                onChargesChange={setAdditionalCharges} 
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Payment & Summary */}
        <div className="space-y-6">
          {/* Promo Code Section */}
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl transition-colors duration-300">
            <CardContent className="pt-6">
              <PromoCodeSection 
                promotionCode={promotionCode}
                onPromotionCodeChange={setPromotionCode}
                appliedPromotion={appliedPromotion}
                onApplyPromotion={handleApplyPromotion}
                onRemovePromotion={handleRemovePromotion}
                promotionDiscountAmount={calculatedPromotionDiscount}
                activePromotions={activePromotions}
              />
            </CardContent>
          </Card>

          {/* Discount Section */}
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl transition-colors duration-300">
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
          
          {/* Service Charge Section */}
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl transition-colors duration-300">
            <CardContent className="pt-6">
              <ServiceChargeSection 
                subtotal={roomTotal + foodOrdersTotal + additionalChargesTotal}
                serviceChargeEnabled={serviceChargeEnabled}
                serviceChargePercent={serviceChargePercent}
                onServiceChargeEnabledChange={setServiceChargeEnabled}
                onServiceChargePercentChange={setServiceChargePercent}
              />
            </CardContent>
          </Card>
          
          {/* Payment Method */}
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl transition-colors duration-300">
            <CardContent className="pt-6">
              <PaymentMethodSelector 
                selectedMethod={paymentMethod} 
                onMethodChange={setPaymentMethod}
                onQRPayment={handleQRPayment}
              />
            </CardContent>
          </Card>
          
          {/* Bill Summary */}
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-indigo-200/50 dark:border-indigo-700/50 rounded-2xl shadow-xl transition-colors duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-gray-100 transition-colors duration-300">
                <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                  <Receipt className="h-5 w-5 text-white" />
                </div>
                Bill Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl transition-colors duration-300">
                  <span className="text-gray-700 dark:text-gray-300">Room Charges:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-100">₹{roomTotal.toFixed(2)}</span>
                </div>
                
                {foodOrdersTotal > 0 && (
                  <div className="flex justify-between items-center p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl transition-colors duration-300">
                    <span className="text-gray-700 dark:text-gray-300">Food Orders:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">₹{foodOrdersTotal.toFixed(2)}</span>
                  </div>
                )}
                
                {additionalChargesTotal > 0 && (
                  <div className="flex justify-between items-center p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl transition-colors duration-300">
                    <span className="text-gray-700 dark:text-gray-300">Additional Charges:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">₹{additionalChargesTotal.toFixed(2)}</span>
                  </div>
                )}
                
                {serviceChargeEnabled && (
                  <div className="flex justify-between items-center p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl transition-colors duration-300">
                    <span className="text-gray-700 dark:text-gray-300">Service Charge ({serviceChargePercent}%):</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">₹{serviceCharge.toFixed(2)}</span>
                  </div>
                )}
                
                {totalDiscount > 0 && (
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700 transition-colors duration-300">
                    <span className="text-green-700 dark:text-green-300">Discount:</span>
                    <span className="font-semibold text-green-700 dark:text-green-300">-₹{totalDiscount.toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white">
                <span className="text-lg font-bold">Total Amount:</span>
                <span className="text-2xl font-bold">₹{grandTotal.toFixed(2)}</span>
              </div>
              
              <div className="grid grid-cols-1 gap-3 mt-6">
                <Button 
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300" 
                  size="lg"
                  disabled={isSubmitting}
                  onClick={handleCheckout}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  {isSubmitting ? 'Processing...' : 'Complete Checkout'}
                </Button>
                
                <PrintBillButton
                  restaurantName={restaurantName}
                  restaurantAddress={restaurantAddress}
                  customerName={reservation.customer_name}
                  customerPhone={reservation.customer_phone || ''}
                  roomName={room.name}
                  checkInDate={format(new Date(reservation.start_time), 'PPP')}
                  checkOutDate={format(new Date(reservation.end_time), 'PPP')}
                  daysStayed={daysStayed}
                  roomPrice={room.price}
                  roomCharges={roomTotal}
                  foodOrders={foodOrders}
                  additionalCharges={additionalCharges}
                  serviceCharge={serviceCharge}
                  discount={totalDiscount}
                  discountPercentage={totalDiscount > 0 ? effectiveDiscountPercentage : undefined}
                  grandTotal={grandTotal}
                  paymentMethod={paymentMethod}
                  billId={billingId || 'TEMP-' + new Date().getTime()}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
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

      {/* QR Payment Dialog */}
      <QRPaymentDialog
        open={showQRPayment}
        onClose={() => setShowQRPayment(false)}
        onPaymentComplete={handleQRPaymentComplete}
        amount={grandTotal}
        customerName={reservation.customer_name}
        roomName={room.name}
        invoiceNumber={invoiceNumber}
        restaurantName={restaurantName}
        restaurantPhone={restaurantPhone || ''}
        restaurantId={room.restaurant_id}
      />
    </div>
  );
};

export default RoomCheckoutPage;
