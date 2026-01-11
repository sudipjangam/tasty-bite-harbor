import React, { useState, useEffect } from "react";
import { differenceInDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
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
  CheckCircle,
  Tag,
} from "lucide-react";

import RoomChargesTable from "./RoomChargesTable";
import FoodOrdersList from "./FoodOrdersList";
import AdditionalChargesSection from "./AdditionalChargesSection";
import DiscountSection from "./DiscountSection";
import PaymentMethodSelector from "./PaymentMethodSelector";
import CheckoutSuccessDialog from "./CheckoutSuccessDialog";
import PrintBillButton from "./PrintBillButton";
import QRPaymentDialog from "./QRPaymentDialog";
import ServiceChargeSection from "./ServiceChargeSection";
import PromoCodeSection from "./PromoCodeSection";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

interface RoomCheckoutPageProps {
  roomId: string;
  reservationId: string;
  onComplete: () => Promise<void>;
  onCancel?: () => void;
  isInSheet?: boolean;
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
  customer_email?: string;
  start_time: string;
  end_time: string;
}

const RoomCheckoutPage: React.FC<RoomCheckoutPageProps> = ({
  roomId,
  reservationId,
  onComplete,
  onCancel,
  isInSheet = false,
}) => {
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [reservation, setReservation] = useState<ReservationDetails | null>(
    null
  );
  const [additionalCharges, setAdditionalCharges] = useState<
    { name: string; amount: number }[]
  >([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false);
  const [serviceChargePercent, setServiceChargePercent] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [billingId, setBillingId] = useState<string | null>(null);
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>([]);
  const [posOrders, setPosOrders] = useState<{ id: string; total: number }[]>(
    []
  );
  const [restaurantPhone, setRestaurantPhone] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [restaurantAddress, setRestaurantAddress] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showQRPayment, setShowQRPayment] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [promotionCode, setPromotionCode] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState<any>(null);
  const [promotionDiscountAmount, setPromotionDiscountAmount] = useState(0);
  const [activePromotions, setActivePromotions] = useState<any[]>([]);
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();
  const navigate = useNavigate();

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
        setRoom(roomData);

        const { data: reservationData, error: reservationError } =
          await supabase
            .from("reservations")
            .select("*")
            .eq("id", reservationId)
            .single();

        if (reservationError) throw reservationError;
        setReservation(reservationData);

        const { data: ordersData, error: ordersError } = await supabase
          .from("room_food_orders")
          .select("*")
          .eq("room_id", roomId)
          .eq("status", "delivered");

        if (ordersError) throw ordersError;
        setFoodOrders(ordersData || []);

        // Fetch POS orders charged to this reservation (Pending - Room Charge) from unified table
        const { data: posData, error: posError } = await supabase
          .from("orders_unified")
          .select("id, total_amount, payment_status, reservation_id")
          .eq("reservation_id", reservationId)
          .eq("payment_status", "Pending - Room Charge");
        if (posError) {
          console.error("Error fetching POS orders:", posError);
        } else {
          setPosOrders(
            (posData || []).map((o: any) => ({
              id: o.id,
              total: Number(o.total_amount) || 0,
            }))
          );
        }

        if (roomData?.restaurant_id) {
          const { data: restaurantData, error: restaurantError } =
            await supabase
              .from("restaurants")
              .select("name, phone, address")
              .eq("id", roomData.restaurant_id)
              .single();

          if (!restaurantError && restaurantData) {
            setRestaurantPhone(restaurantData.phone || null);
            setRestaurantName(restaurantData.name || "Your Hotel");
            setRestaurantAddress(restaurantData.address || "Hotel Address");
          }
        }

        // Generate invoice number
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0");
        setInvoiceNumber(`TEMP-${timestamp}${randomNum}`);

        // Fetch active promotions
        if (roomData?.restaurant_id) {
          const today = new Date().toISOString().split("T")[0];
          const { data: promotionsData, error: promotionsError } =
            await supabase
              .from("promotion_campaigns")
              .select("*")
              .eq("restaurant_id", roomData.restaurant_id)
              .eq("is_active", true)
              .not("promotion_code", "is", null)
              .lte("start_date", today)
              .gte("end_date", today);

          if (!promotionsError && promotionsData) {
            setActivePromotions(promotionsData);
          }
        }
      } catch (error) {
        console.error("Error fetching checkout data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load checkout data",
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
          <div className="text-xl font-semibold text-gray-600">
            Loading checkout data...
          </div>
        </div>
      </div>
    );
  }

  const startDate = new Date(reservation.start_time);
  const endDate = new Date(reservation.end_time);
  const daysStayed = Math.max(differenceInDays(endDate, startDate), 1);

  const roomTotal = room.price * daysStayed;

  const foodOrdersTotal = foodOrders.reduce(
    (sum, order) => sum + (order.total || 0),
    0
  );
  const posOrdersTotal = posOrders.reduce(
    (sum, order) => sum + (order.total || 0),
    0
  );

  const additionalChargesTotal = additionalCharges.reduce(
    (sum, charge) => sum + charge.amount,
    0
  );

  const subtotalBeforeDiscount =
    roomTotal + foodOrdersTotal + posOrdersTotal + additionalChargesTotal;

  // Calculate manual discount
  const manualDiscount =
    discountPercent > 0
      ? (subtotalBeforeDiscount * discountPercent) / 100
      : discountAmount;

  // Calculate promotion discount if applied
  const calculatedPromotionDiscount = appliedPromotion
    ? appliedPromotion.discount_percentage
      ? (subtotalBeforeDiscount * appliedPromotion.discount_percentage) / 100
      : appliedPromotion.discount_amount || 0
    : 0;

  // Total discount combines both manual and promotion
  const totalDiscount = manualDiscount + calculatedPromotionDiscount;

  // Calculate effective discount percentage for display
  const effectiveDiscountPercentage =
    discountPercent > 0
      ? discountPercent
      : appliedPromotion?.discount_percentage
      ? appliedPromotion.discount_percentage
      : totalDiscount > 0 && subtotalBeforeDiscount > 0
      ? Math.round((totalDiscount / subtotalBeforeDiscount) * 100 * 100) / 100
      : 0;

  const serviceCharge = serviceChargeEnabled
    ? ((subtotalBeforeDiscount - totalDiscount) * serviceChargePercent) / 100
    : 0;

  const grandTotal = subtotalBeforeDiscount - totalDiscount + serviceCharge;

  const handleApplyPromotion = async () => {
    if (!promotionCode.trim()) {
      toast({
        title: "Enter Promotion Code",
        description: "Please enter a promotion code to apply.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Call backend validation function
      const { data, error } = await supabase.functions.invoke(
        "validate-promo-code",
        {
          body: {
            code: promotionCode.trim(),
            orderSubtotal: subtotalBeforeDiscount,
            restaurantId: room.restaurant_id,
          },
        }
      );

      if (error) throw error;

      if (data.valid && data.promotion) {
        setAppliedPromotion(data.promotion);
        setPromotionDiscountAmount(data.promotion.calculated_discount || 0);
        toast({
          title: "Promotion Applied!",
          description: `${data.promotion.name} - ${
            data.promotion.discount_percentage
              ? `${data.promotion.discount_percentage}% off`
              : `₹${data.promotion.discount_amount} off`
          }`,
        });
      } else {
        toast({
          title: "Invalid Code",
          description:
            data.error ||
            "The promotion code you entered is not valid or has expired.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error validating promo code:", error);
      toast({
        title: "Validation Error",
        description: "Failed to validate promotion code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemovePromotion = () => {
    setAppliedPromotion(null);
    setPromotionCode("");
    setPromotionDiscountAmount(0);
    toast({
      title: "Promotion Removed",
      description: "The promotion code has been removed from this checkout.",
    });
  };

  const handleCheckout = async () => {
    setIsSubmitting(true);

    try {
      const formattedAdditionalCharges = additionalCharges.map((charge) => ({
        name: charge.name,
        amount: charge.amount,
      }));

      const foodOrderIds = foodOrders.map((order) => order.id);

      const { data: billingData, error: billingError } = await supabase
        .from("room_billings")
        .insert([
          {
            room_id: room.id,
            reservation_id: reservationId,
            customer_name: reservation.customer_name,
            room_charges: roomTotal,
            service_charge: serviceCharge,
            additional_charges: formattedAdditionalCharges,
            discount_amount: totalDiscount,
            total_amount: grandTotal,
            payment_method: paymentMethod,
            payment_status: "completed",
            restaurant_id: room.restaurant_id,
            days_stayed: daysStayed,
            food_orders_total: foodOrdersTotal,
            food_orders_ids: foodOrderIds,
            whatsapp_sent: false,
          },
        ])
        .select()
        .single();

      if (billingError) throw billingError;

      // Log promotion usage if promotion was applied
      if (appliedPromotion && billingData) {
        try {
          await supabase.functions.invoke("log-promotion-usage", {
            body: {
              orderId: billingData.id,
              promotionId: appliedPromotion.id,
              restaurantId: room.restaurant_id,
              customerName: reservation.customer_name,
              customerPhone: reservation.customer_phone || null,
              orderTotal: grandTotal,
              discountAmount: calculatedPromotionDiscount,
            },
          });
        } catch (promoError) {
          console.error("Error logging promotion usage:", promoError);
          // Don't fail the checkout if logging fails
        }
      }

      // Set room status to 'cleaning' instead of 'available'
      const { error: roomError } = await supabase
        .from("rooms")
        .update({ status: "cleaning" })
        .eq("id", room.id);

      if (roomError) throw roomError;

      // Create housekeeping cleaning task for the room
      const now = new Date();
      const scheduledTime = now.toTimeString().slice(0, 8);
      const scheduledDate = now.toISOString().split("T")[0];

      const { error: cleaningError } = await supabase
        .from("room_cleaning_schedules")
        .insert([
          {
            restaurant_id: room.restaurant_id,
            room_id: room.id,
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
            cleaning_type: "post_checkout",
            status: "pending",
            priority: "urgent",
            trigger_source: "checkout",
            reservation_id: reservationId,
            estimated_duration: 45,
            notes: `Post-checkout cleaning for ${reservation.customer_name}. Previous guest stayed ${daysStayed} day(s).`,
            checklist_completed: [],
          },
        ]);

      if (cleaningError) {
        console.error("Error creating cleaning task:", cleaningError);
        // Don't fail checkout if cleaning task creation fails
      }

      setBillingId(billingData?.id || null);

      toast({
        title: "Checkout Successful",
        description: `${reservation.customer_name} has been checked out. Room marked for cleaning.`,
      });

      setShowSuccessDialog(true);

      onComplete();
    } catch (error) {
      console.error("Error during checkout:", error);
      toast({
        variant: "destructive",
        title: "Checkout Failed",
        description: "An error occurred during checkout. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate("/rooms");
    }
  };

  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false);
    if (onCancel) {
      onCancel();
    } else {
      navigate("/rooms");
    }
  };

  const handleQRPayment = () => {
    setShowQRPayment(true);
  };

  const handleQRPaymentComplete = () => {
    setShowQRPayment(false);
    setPaymentMethod("qr");
    handleCheckout();
  };

  // Container styles based on mode - Vibrant Premium Background
  const containerClasses = isInSheet
    ? "transition-colors duration-300"
    : "min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-fuchsia-50 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 p-6 transition-colors duration-300";

  return (
    <div className={containerClasses}>
      {/* Background Decorative Elements */}
      {!isInSheet && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
      )}

      {/* Modern Header - only show when NOT in Sheet */}
      {!isInSheet && (
        <div className="relative mb-8 bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl border border-white/40 dark:border-gray-700/40 rounded-3xl shadow-xl p-8 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl shadow-lg shadow-violet-200 dark:shadow-violet-900/30 transform rotate-3 hover:rotate-6 transition-transform">
                <Receipt className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-extrabold bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent pb-1">
                  Room Checkout
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg mt-1 flex items-center gap-2 font-medium">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  Finalize billing and release room
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-gray-700 dark:text-gray-200 font-semibold px-6 py-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Rooms
            </Button>
          </div>
        </div>
      )}

      <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
        {/* Left Column - Guest & Room Details - 3/5 width */}
        <div className="lg:col-span-3 space-y-6">
          {/* Guest Information Card - Emerald Theme */}
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-b-[6px] border-r-[6px] border-emerald-200 dark:border-emerald-800 shadow-sm hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden group">
            <CardHeader className="pb-4 border-b border-emerald-100 dark:border-emerald-900/50 bg-white/50 dark:bg-emerald-900/20 h-20 justify-center">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-800 dark:text-gray-100 pl-4">
                <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-md shadow-emerald-200 dark:shadow-emerald-900/20 group-hover:scale-105 transition-transform">
                  <User className="h-6 w-6 text-white" />
                </div>
                Guest Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 bg-white/40 dark:bg-transparent backdrop-blur-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Guest Card 1 */}
                <div className="relative group/item">
                  <div className="relative flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-emerald-100 dark:border-emerald-900 shadow-sm transition-transform group-hover/item:-translate-y-1">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                      <User className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Guest Name
                      </p>
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {reservation.customer_name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Guest Card 2 */}
                <div className="relative group/item">
                  <div className="relative flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-emerald-100 dark:border-emerald-900 shadow-sm transition-transform group-hover/item:-translate-y-1">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                      <Bed className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Room
                      </p>
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {room.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Guest Card 3 */}
                <div className="relative group/item">
                  <div className="relative flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-emerald-100 dark:border-emerald-900 shadow-sm transition-transform group-hover/item:-translate-y-1">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                      <Calendar className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Check-in
                      </p>
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {format(new Date(reservation.start_time), "PPP")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Guest Card 4 */}
                <div className="relative group/item">
                  <div className="relative flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-emerald-100 dark:border-emerald-900 shadow-sm transition-transform group-hover/item:-translate-y-1">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                      <Clock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Duration
                      </p>
                      <Badge
                        variant="secondary"
                        className="font-bold text-base px-3 py-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200"
                      >
                        {daysStayed} Night{daysStayed > 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Room Charges - Violet Theme */}
          <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-b-[6px] border-r-[6px] border-violet-200 dark:border-violet-800 shadow-sm hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden group">
            <CardHeader className="pb-4 border-b border-violet-100 dark:border-violet-900/50 bg-white/50 dark:bg-violet-900/20 h-20 justify-center">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-800 dark:text-gray-100 pl-4">
                <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-md shadow-violet-200 dark:shadow-violet-900/20 group-hover:scale-105 transition-transform">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                Room Charges
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 bg-white/40 dark:bg-transparent backdrop-blur-sm">
              <RoomChargesTable
                roomPrice={room.price}
                daysStayed={daysStayed}
                posTotal={posOrdersTotal}
              />
            </CardContent>
          </Card>

          {/* Food Orders (Conditional) - Orange Theme */}
          {foodOrders.length > 0 && (
            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-b-[6px] border-r-[6px] border-orange-200 dark:border-orange-800 shadow-sm hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden group">
              <CardContent className="pt-8 pl-8 pr-6 pb-6">
                <FoodOrdersList foodOrders={foodOrders} />
              </CardContent>
            </Card>
          )}

          {/* Additional Charges - Blue Theme */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b-[6px] border-r-[6px] border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden group">
            <CardContent className="pt-8 pl-8 pr-6 pb-6">
              <AdditionalChargesSection
                charges={additionalCharges}
                onChargesChange={setAdditionalCharges}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Payment & Summary - 2/5 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Promo Code - Pink/Rose Theme */}
          <Card className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 border-b-[6px] border-r-[6px] border-pink-200 dark:border-pink-800 shadow-sm hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden">
            <CardHeader className="pb-2 pt-6 pl-6">
              <h3 className="text-lg font-bold text-pink-700 dark:text-pink-300 flex items-center gap-2">
                <div className="p-1.5 bg-pink-100 rounded-lg">
                  <Tag className="h-4 w-4 text-pink-600" />
                </div>
                Promo Code
              </h3>
            </CardHeader>
            <CardContent className="p-6 pt-2">
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

          {/* Discount - Amber Theme */}
          <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-b-[6px] border-r-[6px] border-amber-200 dark:border-amber-800 shadow-sm hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden">
            <CardHeader className="pb-2 pt-6 pl-6">
              <h3 className="text-lg font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 rounded-lg">
                  <Tag className="h-4 w-4 text-amber-600" />
                </div>
                Discount
              </h3>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <DiscountSection
                subtotal={roomTotal + foodOrdersTotal + additionalChargesTotal}
                discountPercent={discountPercent}
                discountAmount={discountAmount}
                onDiscountPercentChange={setDiscountPercent}
                onDiscountAmountChange={setDiscountAmount}
              />
            </CardContent>
          </Card>

          {/* Service Charge - Slate Theme */}
          <Card className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 border-b-[6px] border-r-[6px] border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <ServiceChargeSection
                subtotal={roomTotal + foodOrdersTotal + additionalChargesTotal}
                serviceChargeEnabled={serviceChargeEnabled}
                serviceChargePercent={serviceChargePercent}
                onServiceChargeEnabledChange={setServiceChargeEnabled}
                onServiceChargePercentChange={setServiceChargePercent}
              />
            </CardContent>
          </Card>

          {/* Payment Method - Indigo Theme */}
          <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-b-[6px] border-r-[6px] border-indigo-200 dark:border-indigo-800 shadow-sm hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <PaymentMethodSelector
                selectedMethod={paymentMethod}
                onMethodChange={setPaymentMethod}
                onQRPayment={handleQRPayment}
              />
            </CardContent>
          </Card>

          {/* Bill Summary - Vibrant Premium */}
          <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none shadow-2xl shadow-indigo-200 dark:shadow-indigo-900/30 rounded-3xl overflow-hidden relative group">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 p-10 opacity-10 transform rotate-12 scale-150 pointer-events-none">
              <Receipt size={200} />
            </div>

            <CardHeader className="relative pb-6 border-b border-indigo-500/30">
              <CardTitle className="flex items-center gap-4 text-2xl font-bold">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
                  <Receipt className="h-6 w-6 text-white" />
                </div>
                Bill Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6 relative">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-indigo-100">
                  <span className="text-lg">Room Charges</span>
                  <span className="font-semibold text-xl text-white">
                    {currencySymbol}
                    {roomTotal.toFixed(2)}
                  </span>
                </div>

                {foodOrdersTotal > 0 && (
                  <div className="flex justify-between items-center text-indigo-100">
                    <span className="text-lg">Food Orders</span>
                    <span className="font-semibold text-xl text-white">
                      {currencySymbol}
                      {foodOrdersTotal.toFixed(2)}
                    </span>
                  </div>
                )}

                {additionalChargesTotal > 0 && (
                  <div className="flex justify-between items-center text-indigo-100">
                    <span className="text-lg">Additional Charges</span>
                    <span className="font-semibold text-xl text-white">
                      {currencySymbol}
                      {additionalChargesTotal.toFixed(2)}
                    </span>
                  </div>
                )}

                {serviceChargeEnabled && (
                  <div className="flex justify-between items-center text-indigo-100">
                    <span className="text-lg">
                      Service Charge ({serviceChargePercent}%)
                    </span>
                    <span className="font-semibold text-xl text-white">
                      {currencySymbol}
                      {serviceCharge.toFixed(2)}
                    </span>
                  </div>
                )}

                {totalDiscount > 0 && (
                  <div className="flex justify-between items-center p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                    <span className="text-emerald-100 font-medium">
                      Discount Applied
                    </span>
                    <span className="font-bold text-xl text-emerald-200">
                      -{currencySymbol}
                      {totalDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="my-6 bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent h-px" />

              <div className="flex justify-between items-end mb-6">
                <span className="text-indigo-200 font-medium text-lg">
                  Total Payable
                </span>
                <span className="text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
                  {currencySymbol}
                  {grandTotal.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Button
                  className="w-full bg-white text-indigo-700 hover:bg-gray-50 font-bold py-6 text-lg rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] transform hover:-translate-y-1 transition-all duration-300"
                  size="lg"
                  disabled={isSubmitting}
                  onClick={handleCheckout}
                >
                  <CreditCard className="w-6 h-6 mr-3" />
                  {isSubmitting ? "Processing..." : "Complete Payment"}
                </Button>

                {/* Print Bill Button Custom Style */}
                <PrintBillButton
                  restaurantName={restaurantName}
                  restaurantAddress={restaurantAddress}
                  customerName={reservation.customer_name}
                  customerPhone={reservation.customer_phone || ""}
                  roomName={room.name}
                  checkInDate={format(new Date(reservation.start_time), "PPP")}
                  checkOutDate={format(new Date(reservation.end_time), "PPP")}
                  daysStayed={daysStayed}
                  roomPrice={room.price}
                  roomCharges={roomTotal}
                  foodOrders={foodOrders}
                  additionalCharges={additionalCharges}
                  serviceCharge={serviceCharge}
                  discount={totalDiscount}
                  discountPercentage={
                    totalDiscount > 0 ? effectiveDiscountPercentage : undefined
                  }
                  grandTotal={grandTotal}
                  paymentMethod={paymentMethod}
                  billId={billingId || "TEMP-" + new Date().getTime()}
                  className="w-full bg-white/10 hover:bg-white/20 text-white border-2 border-white/20 hover:border-white/40 rounded-xl py-6 font-semibold transition-all duration-300 backdrop-blur-sm"
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
          customerPhone={reservation.customer_phone || ""}
          customerEmail={reservation.customer_email || ""}
          roomName={room.name}
          checkoutDate={format(new Date(), "PPP")}
          totalAmount={grandTotal}
          restaurantId={room.restaurant_id}
          restaurantPhone={restaurantPhone || ""}
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
        restaurantPhone={restaurantPhone || ""}
        restaurantId={room.restaurant_id}
      />
    </div>
  );
};

export default RoomCheckoutPage;
