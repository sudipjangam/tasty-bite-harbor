
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@/types/orders";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import MenuCategories from "@/components/Orders/MenuCategories";
import MenuItemsGrid from "@/components/Orders/MenuItemsGrid";
import CurrentOrder from "@/components/Orders/CurrentOrder";
import AddOrderForm from "@/components/Orders/AddOrderForm";

const Orders = () => {
  const [selectedCategory, setSelectedCategory] = useState("Appetizers");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Fetch menu items
  const { data: menuItems, isLoading: isLoadingMenu } = useQuery({
    queryKey: ["menu-items"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", profile.restaurant_id);

      if (error) throw error;
      return data;
    },
  });

  // Filter menu items by category
  const filteredItems = menuItems?.filter(item => item.category === selectedCategory) || [];

  // Current order state (simplified for example)
  const [currentOrderItems, setCurrentOrderItems] = useState<any[]>([]);

  const handleOrderAdded = () => {
    setShowAddForm(false);
    setEditingOrder(null);
    toast({
      title: "Success",
      description: "Order has been processed successfully",
    });
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex h-16 items-center justify-between px-4 bg-white dark:bg-gray-800 border-b">
        <h1 className="text-xl font-bold">Point of Sale</h1>
        <div className="flex items-center gap-2">
          <span>Order Type: Dine-In</span>
          <span>Table: 12</span>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-1" />
            Edit Details
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-4rem)]">
        <div className="col-span-2 overflow-hidden flex flex-col bg-gray-100 dark:bg-gray-800">
          <MenuCategories
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
          <div className="flex-1 overflow-auto">
            <MenuItemsGrid
              items={filteredItems}
              onSelectItem={(item) => {
                setCurrentOrderItems([...currentOrderItems, { ...item, quantity: 1 }]);
              }}
              isLoading={isLoadingMenu}
            />
          </div>
        </div>

        <div className="overflow-hidden">
          <CurrentOrder
            items={currentOrderItems}
            tableNumber="12"
            onUpdateQuantity={(id, newQuantity) => {
              setCurrentOrderItems(currentOrderItems.map(item =>
                item.id === id ? { ...item, quantity: newQuantity } : item
              ));
            }}
            onRemoveItem={(id) => {
              setCurrentOrderItems(currentOrderItems.filter(item => item.id !== id));
            }}
            onHoldOrder={() => {
              toast({
                title: "Order Held",
                description: "The order has been put on hold",
              });
            }}
            onSendToKitchen={() => {
              toast({
                title: "Order Sent",
                description: "The order has been sent to the kitchen",
              });
            }}
            onProceedToPayment={() => {
              setShowAddForm(true);
            }}
            onClearOrder={() => {
              setCurrentOrderItems([]);
            }}
          />
        </div>
      </div>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className={`${isMobile ? 'w-[95%] max-w-lg' : 'max-w-4xl'} max-h-[90vh] overflow-y-auto`}>
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
    </div>
  );
};

export default Orders;
