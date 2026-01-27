import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, CheckCircle2 } from "lucide-react";
import { CartProvider, useCart } from "@/contexts/CartContext";
import { MenuBrowser } from "@/components/CustomerOrder/MenuBrowser";
import { CartDrawer } from "@/components/CustomerOrder/CartDrawer";
import { CheckoutForm } from "@/components/CustomerOrder/CheckoutForm";
import { supabase } from "@/integrations/supabase/client";

type OrderStep = "menu" | "checkout" | "payment" | "success";

interface OrderData {
  restaurantId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  token: string;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  is_available: boolean;
}

interface CustomerInfo {
  name: string;
  phone: string;
  specialInstructions?: string;
}

const CustomerOrderContent = ({ orderData }: { orderData: OrderData }) => {
  const [currentStep, setCurrentStep] = useState<OrderStep>("menu");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurantName, setRestaurantName] = useState("");
  const [serviceChargePercent, setServiceChargePercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(
    null,
  );

  const { itemCount, clearCart, items, total } = useCart();

  // Auto-redirect timer when order is successful
  useEffect(() => {
    if (currentStep === "success" && orderId) {
      setRedirectCountdown(10); // 10 seconds countdown

      const timer = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            // Redirect to menu
            setCurrentStep("menu");
            setOrderId(null);
            setPaymentData(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentStep, orderId]);

  // Clear cart when switching to a different table/room
  useEffect(() => {
    // Store current entity in localStorage to detect changes
    const currentEntityKey = `${orderData.restaurantId}-${orderData.entityType}-${orderData.entityId}`;
    const storedEntityKey = localStorage.getItem("qr_order_entity");

    if (storedEntityKey && storedEntityKey !== currentEntityKey) {
      // Different table/room - clear the cart
      console.log("Different entity detected, clearing cart");
      clearCart();
    }

    // Update stored entity
    localStorage.setItem("qr_order_entity", currentEntityKey);
  }, [
    orderData.restaurantId,
    orderData.entityType,
    orderData.entityId,
    clearCart,
  ]);

  // Fetch menu and restaurant data
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        // Fetch restaurant details
        const { data: restaurant, error: restaurantError } = await supabase
          .from("restaurants")
          .select("id, name, qr_ordering_enabled, qr_service_charge_percent")
          .eq("id", orderData.restaurantId)
          .single();

        if (restaurantError || !restaurant) {
          throw new Error("Restaurant not found");
        }

        // Check if QR ordering is enabled (warning only, don't block)
        if (!restaurant.qr_ordering_enabled) {
          console.warn("QR ordering is disabled for this restaurant");
        }

        // Fetch menu items
        const { data: menuData, error: menuError } = await supabase
          .from("menu_items")
          .select(
            "id, name, description, price, category, image_url, is_available",
          )
          .eq("restaurant_id", orderData.restaurantId)
          .eq("is_available", true)
          .order("category")
          .order("name");

        if (menuError) {
          throw new Error("Failed to fetch menu items");
        }

        // Transform menu items to match expected format
        const transformedItems: MenuItem[] = (menuData || []).map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description || "",
          price: item.price,
          category: item.category || "Other",
          image: item.image_url || undefined,
          is_available: item.is_available,
        }));

        setMenuItems(transformedItems);
        setRestaurantName(restaurant.name || "Restaurant");
        setServiceChargePercent(restaurant.qr_service_charge_percent || 0);
        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching menu:", err);
        setError(err.message || "Failed to load menu. Please try again.");
        setLoading(false);
      }
    };

    fetchMenuData();
  }, [orderData.restaurantId]);

  const handleCheckout = () => {
    setCurrentStep("checkout");
  };

  const handleSubmitOrder = async (customerInfo: CustomerInfo) => {
    try {
      // Submit order to backend
      const { data, error } = await supabase.functions.invoke(
        "submit-qr-order",
        {
          body: {
            restaurantId: orderData.restaurantId,
            entityType: orderData.entityType,
            entityId: orderData.entityId,
            customerName: customerInfo.name,
            customerPhone: customerInfo.phone,
            specialInstructions: customerInfo.specialInstructions,
            items: items.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: item.price,
              modifiers: item.modifiers,
            })),
            totalAmount: total,
          },
        },
      );

      if (error) throw error;

      setOrderId(data.orderId);

      // Store payment data
      setPaymentData(data.payment);

      // Clear cart and proceed to success/payment screen
      clearCart();
      setCurrentStep("success");
    } catch (err: any) {
      throw new Error(err.message || "Failed to submit order");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading menu...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 font-semibold">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-200">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold text-green-800">Order Placed!</h2>
            <p className="text-gray-600">
              Your order has been successfully placed and sent to the kitchen.
            </p>
            {orderId && (
              <div className="bg-green-100 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  Order ID:{" "}
                  <span className="font-mono font-semibold">{orderId}</span>
                </p>
              </div>
            )}
            <p className="text-sm text-gray-500">
              Your order will be served at{" "}
              {orderData.entityType === "table" ? "Table" : "Room"}{" "}
              <span className="font-semibold">{orderData.entityName}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-2xl mx-auto p-4 pb-24">
        {currentStep === "menu" && (
          <>
            <MenuBrowser
              menuItems={menuItems}
              restaurantName={restaurantName}
            />

            {/* Floating Cart Button */}
            {itemCount > 0 && (
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pointer-events-none z-40">
                <div className="max-w-2xl mx-auto pointer-events-auto">
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white font-bold py-6 shadow-2xl hover:shadow-3xl transition-all duration-300 rounded-2xl relative overflow-hidden group"
                    onClick={() => setIsCartOpen(true)}
                  >
                    {/* Animated background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                    <div className="relative flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <ShoppingCart className="w-6 h-6" />
                          <Badge className="absolute -top-2 -right-2 bg-white text-purple-600 font-bold text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center border-2 border-purple-600">
                            {itemCount}
                          </Badge>
                        </div>
                        <span className="text-lg">View Cart</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">
                          ₹{total.toFixed(2)}
                        </span>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
            )}

            <CartDrawer
              isOpen={isCartOpen}
              onClose={() => setIsCartOpen(false)}
              onCheckout={handleCheckout}
            />
          </>
        )}

        {currentStep === "checkout" && (
          <CheckoutForm
            orderData={orderData}
            onBack={() => setCurrentStep("menu")}
            onSubmit={handleSubmitOrder}
          />
        )}

        {currentStep === "success" && orderId && (
          <div className="space-y-4 pb-8">
            {/* Success Header */}
            <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="pt-6 text-center">
                <div className="inline-flex p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mb-4">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Order Placed!
                </h2>
                <p className="text-gray-600 mb-4">
                  Your order has been successfully placed and sent to the
                  kitchen.
                </p>

                {/* Order Summary */}
                <div className="bg-white rounded-lg p-4 mb-4 border border-green-200 text-left">
                  <h3 className="font-bold text-gray-900 mb-3">
                    Order Summary
                  </h3>
                  <div className="space-y-2 mb-3">
                    {items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="font-medium text-gray-900">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="font-bold text-gray-900">
                      Total Amount
                    </span>
                    <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
                      ₹{total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Entity Location */}
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-gray-600">
                      Your order will be served at
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-gray-700">
                      {orderData.entityType === "table" ? "Table" : "Room"}
                    </span>
                    <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                      {orderData.entityName}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* UPI Payment Section */}
            {paymentData?.upi && (
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    Complete Payment
                  </h3>

                  <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200">
                    <p className="text-sm text-gray-600 mb-2">Pay to:</p>
                    <p className="font-semibold text-gray-900">
                      {paymentData.upi.name}
                    </p>
                    <p className="text-sm text-gray-600 font-mono">
                      {paymentData.upi.id}
                    </p>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Amount:</span>
                        <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                          ₹{paymentData.upi.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* UPI Payment Button */}
                  {paymentData.upi.paymentLink && (
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-6 text-lg shadow-xl"
                      onClick={() =>
                        (window.location.href = paymentData.upi.paymentLink)
                      }
                    >
                      <svg
                        className="w-6 h-6 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      Pay Now with UPI
                    </Button>
                  )}

                  <p className="text-xs text-center text-gray-500 mt-3">
                    Your order will be confirmed once payment is received
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Order Status Info */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold text-gray-900 mb-3">What's Next?</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Complete the payment using the UPI link above</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Your order will be sent to the kitchen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>
                      Food will be served at your{" "}
                      {orderData.entityType === "table" ? "table" : "room"}
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* New Order Button */}
            <Button
              variant="outline"
              className="w-full py-6 text-lg"
              onClick={() => {
                setCurrentStep("menu");
                setOrderId(null);
                setPaymentData(null);
                setRedirectCountdown(null);
              }}
            >
              {redirectCountdown !== null
                ? `Back to Menu (Auto-redirecting in ${redirectCountdown}s)`
                : "Back to Menu"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const CustomerOrder = () => {
  const { encodedData } = useParams<{ encodedData: string }>();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const decodeOrderData = async () => {
      try {
        if (!encodedData) {
          throw new Error("No order data provided");
        }

        // Decode base64 data
        const decodedString = atob(encodedData);
        const data = JSON.parse(decodedString);

        setOrderData(data);
        setLoading(false);
      } catch (err) {
        console.error("Error decoding order data:", err);
        setError("Invalid QR code data");
        setLoading(false);
      }
    };

    decodeOrderData();
  }, [encodedData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 font-semibold">
              {error || "Invalid QR code"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <CartProvider serviceChargePercent={0}>
      <CustomerOrderContent orderData={orderData} />
    </CartProvider>
  );
};

export default CustomerOrder;
