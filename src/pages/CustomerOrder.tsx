import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  const { itemCount, clearCart, items, total } = useCart();

  // Fetch menu and restaurant data
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "customer-menu-api",
          {
            body: { restaurantId: orderData.restaurantId },
          },
        );

        if (error) throw error;

        setMenuItems(data.menuItems || []);
        setRestaurantName(data.restaurantName || "Restaurant");
        setServiceChargePercent(data.serviceChargePercent || 0);
        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching menu:", err);
        setError("Failed to load menu. Please try again.");
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
      const { items, total } = useCart();

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

      // For now, mark as success (payment integration will come next)
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
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
                <div className="max-w-2xl mx-auto">
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-6 shadow-lg"
                    onClick={() => setIsCartOpen(true)}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    View Cart ({itemCount} {itemCount === 1 ? "item" : "items"})
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
