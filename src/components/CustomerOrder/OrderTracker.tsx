import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, ChefHat, ShoppingBag, Clock } from "lucide-react";

interface OrderTrackerProps {
  orderId: string;
}

export const OrderTracker = ({ orderId }: OrderTrackerProps) => {
  const [status, setStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial order status via edge function (bypasses RLS for anonymous users)
    const fetchInitialStatus = async () => {
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          "get-order-status",
          { body: { orderId } }
        );

        if (fnError) throw fnError;
        if (fnData?.order) {
          setStatus(fnData.order.status);
        }
      } catch (err) {
        console.error("Error fetching order status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialStatus();

    // Subscribe to real-time status updates for this order
    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload: any) => {
          console.log("Order status updated in real-time:", payload.new.status);
          setStatus(payload.new.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        <span className="ml-2 text-sm text-gray-500">Connecting to kitchen...</span>
      </div>
    );
  }

  // Map database status to step index
  // Database status: 'completed' | 'pending' | 'preparing' | 'ready' | 'cancelled' | 'held'
  const getStepIndex = (currentStatus: string): number => {
    switch (currentStatus) {
      case "pending":
        return 0;
      case "preparing":
        return 1;
      case "ready":
        return 2;
      case "completed":
        return 3;
      case "cancelled":
        return -1;
      default:
        return 0;
    }
  };

  const currentStep = getStepIndex(status);

  const steps = [
    { label: "Received", desc: "Order sent to kitchen", icon: Clock },
    { label: "Preparing", desc: "Chef is preparing your meal", icon: ChefHat },
    { label: "Ready", desc: "Your food is ready!", icon: ShoppingBag },
    { label: "Served", desc: "Served & enjoyed", icon: CheckCircle2 },
  ];

  if (status === "cancelled") {
    return (
      <Card className="border-red-200 bg-red-50/50 backdrop-blur-sm shadow-md rounded-2xl p-6">
        <CardContent className="flex flex-col items-center justify-center text-center space-y-2 py-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xl">
            ✕
          </div>
          <h4 className="font-bold text-red-900 text-lg">Order Cancelled</h4>
          <p className="text-sm text-red-700">
            This order has been cancelled by the restaurant staff. Please contact the counter for details.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-orange-100/50 bg-white/70 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h4 className="font-bold text-gray-800">Live Kitchen Tracker</h4>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-orange-600" />
            Live Updates
          </div>
        </div>

        {/* Timeline */}
        <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            const isCompleted = idx <= currentStep;
            const isCurrent = idx === currentStep;

            return (
              <div key={idx} className="relative flex gap-4 transition-all duration-300">
                {/* Node Bullet */}
                <div
                  className={`absolute -left-[33px] w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted
                      ? "bg-gradient-to-br from-orange-500 to-blue-600 border-transparent text-white shadow-md shadow-orange-200"
                      : "bg-white border-gray-200 text-gray-400"
                  } ${isCurrent ? "scale-110 ring-4 ring-orange-100" : ""}`}
                >
                  {isCompleted && idx < currentStep ? (
                    <span className="text-xs font-bold">✓</span>
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1">
                  <h5
                    className={`font-bold text-sm transition-colors duration-300 ${
                      isCompleted ? "text-orange-900" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </h5>
                  <p
                    className={`text-xs transition-colors duration-300 ${
                      isCompleted ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
