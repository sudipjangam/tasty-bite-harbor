import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Utensils, AlertTriangle } from "lucide-react";
import { OrderTracker } from "@/components/CustomerOrder/OrderTracker";

interface OrderDetails {
  id: string;
  status: string;
  total: number;
  restaurant_id: string;
  table_number?: string;
  order_type?: string;
  created_at: string;
  customer_name?: string;
  restaurants: {
    name: string;
    phone: string;
  };
}

const OrderStatusPage = () => {
  const params = useParams();
  const rawOrderId = params["*"] || "";
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        if (!rawOrderId) throw new Error("Order ID is missing");

        // Extract valid UUID if the URL was malformed (e.g. from older whatsapp templates)
        const uuidMatch = rawOrderId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        const cleanOrderId = uuidMatch ? uuidMatch[0] : rawOrderId;

        // Use edge function (service role) to bypass RLS for anonymous customers
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          "get-order-status",
          { body: { orderId: cleanOrderId } }
        );

        if (fnError) {
          throw new Error(`Edge function error: ${fnError.message}`);
        }

        if (!fnData?.success || !fnData?.order) {
          throw new Error(fnData?.error || "Order not found or invalid.");
        }

        const o = fnData.order;
        setOrder({
          id: o.id,
          status: o.status,
          total: o.total,
          restaurant_id: o.restaurant_id || "",
          table_number: o.table_number,
          order_type: o.order_type,
          created_at: o.created_at,
          customer_name: o.customer_name,
          restaurants: {
            name: o.restaurant_name,
            phone: o.restaurant_phone,
          },
        });
      } catch (err: any) {
        console.error("Error fetching order:", err);
        setError("Unable to find your order. Please check the link.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [rawOrderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
          <p className="text-gray-500 font-medium animate-pulse">
            Fetching order details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200 shadow-xl rounded-2xl overflow-hidden">
          <div className="h-2 bg-red-500" />
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
              <p className="text-gray-500">{error}</p>
            </div>
            <Button
              className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Header section */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-md text-purple-600 mb-2">
            <Utensils className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {order.restaurants?.name || "Restaurant"}
          </h1>
          <p className="text-gray-500 font-medium text-sm">
            Order #{order.id.substring(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Live Order Status Tracker */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <OrderTracker orderId={order.id} />
        </div>

        {/* Order Details Summary */}
        <Card className="border border-purple-100/50 bg-white/70 backdrop-blur-md shadow-lg rounded-2xl overflow-hidden mt-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          <CardContent className="p-5">
            <h3 className="font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">
              Order Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-semibold text-gray-900">
                  ₹{order.total?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-gray-700">
                  {new Date(order.created_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              {order.order_type && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium text-gray-700 capitalize">
                    {order.order_type.replace(/_/g, " ")}
                  </span>
                </div>
              )}
              {order.customer_name && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium text-gray-700">
                    {order.customer_name}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Restaurant Card */}
        {order.restaurants?.phone && (
          <div className="text-center mt-8 animate-in fade-in duration-700 delay-200">
            <p className="text-sm text-gray-500 mb-3">Need help with your order?</p>
            <a href={`tel:${order.restaurants.phone}`}>
              <Button variant="outline" className="rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50">
                Call Restaurant
              </Button>
            </a>
          </div>
        )}

      </div>
    </div>
  );
};

export default OrderStatusPage;
