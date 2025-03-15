
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingBag, Calendar, Clock, Check } from "lucide-react";
import OrderList from "@/components/Orders/OrderList";
import AddOrderForm from "@/components/Orders/AddOrderForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@/types/orders";
import { Card } from "@/components/ui/card";

const Orders = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
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
    setEditingOrder(null);
    refetch();
    toast({
      title: "Success",
      description: "Order has been added successfully",
    });
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setShowAddForm(true);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const orderStats = {
    total: orders?.length || 0,
    pending: orders?.filter(order => order.status === "pending").length || 0,
    completed: orders?.filter(order => order.status === "completed").length || 0,
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Orders Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your restaurant orders
          </p>
        </div>
        <Button onClick={() => {
          setEditingOrder(null);
          setShowAddForm(true);
        }} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-white to-gray-50 border-none shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-full">
              <ShoppingBag className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Total Orders</h3>
              <p className="text-2xl font-bold text-purple-600">{orderStats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-white to-gray-50 border-none shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Pending</h3>
              <p className="text-2xl font-bold text-yellow-600">{orderStats.pending}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-white to-gray-50 border-none shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Completed</h3>
              <p className="text-2xl font-bold text-green-600">{orderStats.completed}</p>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <AddOrderForm
            onSuccess={handleOrderAdded}
            onCancel={() => {
              setShowAddForm(false);
              setEditingOrder(null);
            }}
            editingOrder={editingOrder}
          />
        </DialogContent>
      </Dialog>

      <OrderList 
        orders={orders || []} 
        onOrdersChange={refetch}
        onEditOrder={handleEditOrder} 
      />
    </div>
  );
};

export default Orders;
