
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase, OrderItem } from "@/integrations/supabase/client";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MenuFilter from './MenuFilter';
import MenuItemsList, { MenuItem } from './MenuItemsList';
import OrderSummary from './OrderSummary';

interface RoomOrderFormProps {
  roomId: string;
  customerName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const RoomOrderForm: React.FC<RoomOrderFormProps> = ({ 
  roomId, 
  customerName, 
  onSuccess, 
  onCancel 
}) => {
  const { toast } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurantId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('restaurant_id')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (profile?.restaurant_id) {
          setRestaurantId(profile.restaurant_id);
        }
      } catch (error) {
        console.error('Error fetching restaurant ID:', error);
      }
    };

    fetchRestaurantId();
  }, []);

  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!restaurantId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .eq('is_available', true);

        if (error) throw error;
        setMenuItems(data || []);
      } catch (error) {
        console.error('Error fetching menu items:', error);
        setError("Failed to load menu items");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load menu items."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenuItems();
  }, [restaurantId, toast]);

  // Filter menu items based on category and search query
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (categoryFilter === 'all') return matchesSearch;
    return matchesSearch && item.category === categoryFilter;
  });

  const handleAddItem = (menuItem: MenuItem) => {
    setOrderItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.menuItemId === menuItem.id);
      
      if (existingItemIndex !== -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + 1
        };
        return updatedItems;
      } else {
        return [...prevItems, {
          id: Date.now().toString(),
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1
        }];
      }
    });
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setOrderItems(prevItems => prevItems.filter(item => item.id !== id));
      return;
    }
    
    setOrderItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setOrderItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmitOrder = async () => {
    if (orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the order",
        variant: "destructive"
      });
      return;
    }

    if (!restaurantId) {
      toast({
        title: "Error",
        description: "Restaurant ID not available",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData = {
        room_id: roomId,
        restaurant_id: restaurantId,
        customer_name: customerName,
        items: orderItems,
        total: calculateTotal(),
        status: 'pending'
      };

      console.log("Submitting order data:", orderData);

      const { data, error } = await supabase
        .from('room_food_orders')
        .insert(orderData)
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Food order has been placed successfully"
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['all', ...new Set(menuItems.map(item => item.category))];

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Room Food Order</CardTitle>
        <CardDescription>
          Create a food order for {customerName}'s room
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            onAddToOrder={handleAddItem}
          />
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Order Summary</h3>
            <OrderSummary 
              orderItems={orderItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmitOrder} 
          disabled={orderItems.length === 0 || isSubmitting}
        >
          {isSubmitting ? "Processing..." : "Place Order"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RoomOrderForm;
