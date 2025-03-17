
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Search, Plus, Minus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  is_veg?: boolean;
}

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
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        setFilteredItems(data || []);
      } catch (error) {
        console.error('Error fetching menu items:', error);
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

  useEffect(() => {
    const filtered = menuItems.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (categoryFilter === 'all') return matchesSearch;
      if (categoryFilter === 'veg') return matchesSearch && item.is_veg === true;
      if (categoryFilter === 'non-veg') return matchesSearch && item.is_veg === false;
      
      return matchesSearch && item.category === categoryFilter;
    });
    
    setFilteredItems(filtered);
  }, [searchQuery, categoryFilter, menuItems]);

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
      // Get the current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to create an order");
      }

      const orderData = {
        room_id: roomId,
        restaurant_id: restaurantId,
        customer_name: customerName,
        items: orderItems,
        total: calculateTotal(),
        status: 'pending',
        // Add user_id to meet potential RLS requirements
        user_id: user.id
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
        description: "Failed to place order. Please ensure you have the proper permissions.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['all', 'veg', 'non-veg', ...new Set(menuItems.map(item => item.category))];

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
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label>Filter by Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Search Menu Items</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">Loading menu items...</TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">No menu items found</TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.name}
                        {item.is_veg !== undefined && (
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${item.is_veg ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {item.is_veg ? 'Veg' : 'Non-Veg'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleAddItem(item)}
                        >
                          <Plus className="h-4 w-4" />
                          <span className="ml-1 hidden sm:inline">Add</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Order Summary</h3>
            {orderItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No items added to order</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-7 w-7"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-10 text-center">{item.quantity}</span>
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-7 w-7"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-bold">Total:</TableCell>
                    <TableCell className="text-right font-bold">₹{calculateTotal().toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
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
