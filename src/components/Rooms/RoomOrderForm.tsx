
import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { v4 as uuidv4 } from 'uuid';
import MenuItemsList from './OrderForm/MenuItemsList';
import MenuFilter from './OrderForm/MenuFilter';
import OrderSummary from './OrderForm/OrderSummary';
import { OrderItem } from "@/integrations/supabase/client";
import { ShoppingCart } from 'lucide-react';

interface RoomOrderFormProps {
  roomId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  restaurantId: string;
  customerName: string;
}

const RoomOrderForm: React.FC<RoomOrderFormProps> = ({
  roomId,
  open,
  onClose,
  onSuccess,
  restaurantId,
  customerName
}) => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { toast } = useToast();

  // Use React Query to fetch and cache menu items - prevents flickering
  const { data: menuItems = [], isLoading, error } = useQuery({
    queryKey: ['menu-items', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleAddToOrder = useCallback((menuItem: any) => {
    const existingItemIndex = orderItems.findIndex(item => item.menuItemId === menuItem.id);

    if (existingItemIndex !== -1) {
      // Item already exists, increase quantity
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += 1;
      setOrderItems(updatedItems);
    } else {
      // Add new item
      setOrderItems([
        ...orderItems,
        {
          id: uuidv4(), // Generate unique ID for each order item
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1
        }
      ]);
    }

    toast({
      title: "Item Added",
      description: `${menuItem.name} added to order`,
    });
  }, [orderItems, toast]);

  const handleUpdateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setOrderItems(prev => prev.filter(item => item.id !== itemId));
      return;
    }

    setOrderItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setOrderItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const calculateTotal = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [orderItems]);

  const handleSubmitOrder = useCallback(async () => {
    if (orderItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Order",
        description: "Please add items to your order.",
      });
      return;
    }

    try {
      const orderItemsJson = orderItems.map(item => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      const { error } = await supabase.from('room_food_orders').insert({
        room_id: roomId,
        restaurant_id: restaurantId,
        customer_name: customerName,
        items: orderItemsJson,
        total: calculateTotal,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: "Order Placed",
        description: "Your order has been successfully placed.",
      });
      
      setOrderItems([]); // Clear order items
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating order:', err);
      toast({
        variant: "destructive",
        title: "Order Failed",
        description: "Failed to place your order. Please try again.",
      });
    }
  }, [orderItems, roomId, restaurantId, customerName, calculateTotal, toast, onSuccess, onClose]);

  // Memoize filtered menu items to prevent unnecessary recalculations
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesSearch = searchQuery === "" || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, categoryFilter, searchQuery]);

  // Memoize categories
  const categories = useMemo(() => {
    return ["all", ...new Set(menuItems.map(item => item.category))];
  }, [menuItems]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Place Food Order for Room
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
          {/* Menu Items Section */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <MenuFilter 
              categories={categories}
              selectedCategory={categoryFilter}
              onCategoryChange={setCategoryFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            <MenuItemsList 
              menuItems={filteredMenuItems}
              isLoading={isLoading}
              error={error ? String(error) : null}
              onAddToOrder={handleAddToOrder}
            />
          </div>

          {/* Order Summary Section - Fixed Sidebar */}
          <div className="lg:w-96 border-l bg-muted/30 flex flex-col">
            <div className="p-4 border-b bg-background/50 backdrop-blur">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Order Summary
                {orderItems.length > 0 && (
                  <span className="ml-auto text-sm bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'}
                  </span>
                )}
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <OrderSummary 
                orderItems={orderItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
              />
            </div>

            {/* Footer with Total and Actions */}
            <div className="border-t p-4 space-y-3 bg-background/80 backdrop-blur">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span className="text-primary">₹{calculateTotal.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitOrder} 
                  disabled={orderItems.length === 0}
                  className="flex-1"
                >
                  Place Order
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoomOrderForm;
