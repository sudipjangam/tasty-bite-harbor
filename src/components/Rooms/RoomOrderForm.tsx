
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import MenuItemsList from './OrderForm/MenuItemsList';
import MenuFilter from './OrderForm/MenuFilter';
import OrderSummary from './OrderForm/OrderSummary';
import { OrderItem } from "@/integrations/supabase/client";

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
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchMenuItems = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .eq('is_available', true);

        if (error) throw error;
        setMenuItems(data || []);
      } catch (err) {
        console.error('Error fetching menu items:', err);
        setError('Failed to load menu items');
      } finally {
        setIsLoading(false);
      }
    };

    if (open && restaurantId) {
      fetchMenuItems();
    }
  }, [open, restaurantId]);

  const handleAddToOrder = (menuItem: any) => {
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
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    setOrderItems(orderItems.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const handleRemoveItem = (itemId: string) => {
    setOrderItems(orderItems.filter(item => item.id !== itemId));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmitOrder = async () => {
    if (orderItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Order",
        description: "Please add items to your order.",
      });
      return;
    }

    try {
      // Convert order items to JSON compatible format
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
        items: orderItemsJson, // This will be stored as a JSON array
        total: calculateTotal(),
        status: 'pending',
      });

      if (error) {
        console.error('Error creating order:', error);
        throw error;
      }

      toast({
        title: "Order Placed",
        description: "Your order has been successfully placed.",
      });
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
  };

  // Filter menu items based on category and search query
  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesSearch = searchQuery === "" || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // Get unique categories for the filter
  const categories = ["all", ...new Set(menuItems.map(item => item.category))];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Place Food Order for Room</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
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
              error={error}
              onAddToOrder={handleAddToOrder}
            />
          </div>

          <div className="bg-secondary/10 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Order Summary</h3>
            <OrderSummary 
              orderItems={orderItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
            />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmitOrder}>Place Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoomOrderForm;
