import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import OrderList from "@/components/Orders/OrderList";
import AddOrderForm from "@/components/Orders/AddOrderForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@/types/orders";

const Orders = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      console.log("Fetching orders...");
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", profile.restaurant_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      console.log("Fetched orders:", data);
      return data as Order[];
    },
  });

  const handleOrderAdded = () => {
    setShowAddForm(false);
    refetch();
    toast({
      title: "Success",
      description: "Order has been added successfully",
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Orders</h1>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Order
        </Button>
      </div>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <AddOrderForm
            onSuccess={handleOrderAdded}
            onCancel={() => setShowAddForm(false)}
          />
        </DialogContent>
      </Dialog>

      <OrderList orders={orders || []} onOrdersChange={refetch} />
    </div>
  );
};

export default Orders;