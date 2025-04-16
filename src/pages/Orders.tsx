
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@/types/orders";
import { Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import MenuCategories from "@/components/Orders/MenuCategories";
import MenuItemsGrid from "@/components/Orders/MenuItemsGrid";
import CurrentOrder from "@/components/Orders/CurrentOrder";
import AddOrderForm from "@/components/Orders/AddOrderForm";
import { v4 as uuidv4 } from 'uuid';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type OrderItem = {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: string[];
};

// Table interface
interface TableData {
  id: string;
  name: string;
  capacity: number;
  status: string;
}

const Orders = () => {
  // UI state
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showPOS, setShowPOS] = useState(true); // Added toggle for POS vs Orders view
  
  // Order state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [orderType, setOrderType] = useState("Dine-In");
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
  
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Fetch available tables
  const { data: tables, isLoading: isLoadingTables } = useQuery({
    queryKey: ["restaurant-tables"],
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
        .from("restaurant_tables")
        .select("*")
        .eq("restaurant_id", profile.restaurant_id);

      if (error) throw error;
      return data as TableData[];
    },
  });

  // Set default category when categories are loaded
  const { data: categories } = useQuery({
    queryKey: ['menu-categories'],
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
        .from('menu_items')
        .select('category')
        .eq('restaurant_id', profile.restaurant_id);

      if (error) throw error;

      const uniqueCategories = Array.from(new Set(data.map(item => item.category)));
      if (uniqueCategories.length > 0 && !selectedCategory) {
        setSelectedCategory(uniqueCategories[0]);
      }
      return uniqueCategories;
    },
  });

  // Set initial table when tables are loaded
  useEffect(() => {
    if (tables && tables.length > 0 && !tableNumber) {
      setTableNumber(tables[0].name);
    }
  }, [tables, tableNumber]);

  const handleAddItem = (item: any) => {
    const existingItem = currentOrderItems.find(
      orderItem => orderItem.menuItemId === item.id
    );

    if (existingItem) {
      setCurrentOrderItems(
        currentOrderItems.map(orderItem =>
          orderItem.menuItemId === item.id
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem
        )
      );
    } else {
      setCurrentOrderItems([
        ...currentOrderItems,
        {
          id: uuidv4(),
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1
        }
      ]);
    }

    toast({
      title: "Item Added",
      description: `${item.name} added to order`,
    });
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCurrentOrderItems(currentOrderItems.filter(item => item.id !== id));
      return;
    }
    
    setCurrentOrderItems(currentOrderItems.map(item =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    ));
  };

  const handleRemoveItem = (id: string) => {
    setCurrentOrderItems(currentOrderItems.filter(item => item.id !== id));
  };

  const handleHoldOrder = () => {
    if (currentOrderItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Order",
        description: "Cannot hold an empty order",
      });
      return;
    }
    
    toast({
      title: "Order Held",
      description: "The order has been put on hold",
    });
  };

  const handleSendToKitchen = () => {
    if (currentOrderItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Order",
        description: "Cannot send an empty order to the kitchen",
      });
      return;
    }
    
    toast({
      title: "Order Sent",
      description: "The order has been sent to the kitchen",
    });
  };

  const handleProceedToPayment = () => {
    if (currentOrderItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Order",
        description: "Cannot proceed to payment with an empty order",
      });
      return;
    }
    
    setShowAddForm(true);
  };

  const handleClearOrder = () => {
    if (currentOrderItems.length > 0) {
      if (window.confirm("Are you sure you want to clear this order?")) {
        setCurrentOrderItems([]);
        toast({
          title: "Order Cleared",
          description: "All items have been cleared from the order",
        });
      }
    }
  };

  const handleOrderAdded = () => {
    setShowAddForm(false);
    setEditingOrder(null);
    setCurrentOrderItems([]);
    toast({
      title: "Success",
      description: "Order has been processed successfully",
    });
  };

  const handleOrderDetailsEdit = () => {
    setShowOrderDetails(true);
  };

  const handleOrderDetailsSave = (type: string, table: string) => {
    setOrderType(type);
    setTableNumber(table);
    setShowOrderDetails(false);
    toast({
      title: "Details Updated",
      description: "Order details have been updated",
    });
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex h-16 items-center justify-between px-4 bg-white dark:bg-gray-800 border-b">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Point of Sale</h1>
          <Button 
            variant="ghost" 
            onClick={() => setShowPOS(!showPOS)} 
            className="flex items-center gap-2"
          >
            {showPOS ? (
              <ToggleRight className="h-5 w-5 text-indigo-600" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-gray-400" />
            )}
            <span className="text-sm font-medium">
              {showPOS ? "POS Mode" : "Orders View"}
            </span>
          </Button>
        </div>

        {showPOS && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Order Type:</span>
              <Select defaultValue={orderType} onValueChange={(value) => setOrderType(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select order type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dine-In">Dine-In</SelectItem>
                  <SelectItem value="Takeaway">Takeaway</SelectItem>
                  <SelectItem value="Delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {orderType === "Dine-In" && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Table:</span>
                <Select value={tableNumber} onValueChange={setTableNumber}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingTables ? (
                      <SelectItem value="loading">Loading...</SelectItem>
                    ) : tables && tables.length > 0 ? (
                      tables.map((table) => (
                        <SelectItem key={table.id} value={table.name}>
                          {table.name} (Seats: {table.capacity})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none">No tables available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button variant="outline" size="sm" onClick={handleOrderDetailsEdit}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit Details
            </Button>
          </div>
        )}
      </div>

      {showPOS ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-4rem)]">
          <div className="col-span-2 overflow-hidden flex flex-col bg-gray-100 dark:bg-gray-800">
            <MenuCategories
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
            <div className="flex-1 overflow-auto">
              <MenuItemsGrid
                selectedCategory={selectedCategory}
                onSelectItem={handleAddItem}
              />
            </div>
          </div>

          <div className="overflow-hidden">
            <CurrentOrder
              items={currentOrderItems}
              tableNumber={tableNumber}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onHoldOrder={handleHoldOrder}
              onSendToKitchen={handleSendToKitchen}
              onProceedToPayment={handleProceedToPayment}
              onClearOrder={handleClearOrder}
            />
          </div>
        </div>
      ) : (
        <div className="p-6">
          {/* Here we would render the original OrderList component */}
          <div className="text-center p-10 border rounded-lg bg-white dark:bg-gray-800">
            <h2 className="text-xl mb-4">Orders History View</h2>
            <p className="text-muted-foreground">
              Switch to POS Mode to create new orders
            </p>
          </div>
        </div>
      )}

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

      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-md">
          <h2 className="text-lg font-semibold mb-4">Edit Order Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Order Type</label>
              <select 
                className="w-full p-2 border rounded-md"
                defaultValue={orderType}
                id="orderType"
              >
                <option value="Dine-In">Dine-In</option>
                <option value="Takeaway">Takeaway</option>
                <option value="Delivery">Delivery</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Table Number</label>
              <select
                className="w-full p-2 border rounded-md"
                defaultValue={tableNumber}
                id="tableNumber"
              >
                {!isLoadingTables && tables && tables.map(table => (
                  <option key={table.id} value={table.name}>
                    {table.name} (Capacity: {table.capacity})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowOrderDetails(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                const type = (document.getElementById('orderType') as HTMLSelectElement).value;
                const table = (document.getElementById('tableNumber') as HTMLSelectElement).value;
                handleOrderDetailsSave(type, table);
              }}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
