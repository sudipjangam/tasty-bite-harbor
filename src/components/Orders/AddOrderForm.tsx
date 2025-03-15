
import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Order } from "@/types/orders";

interface AddOrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  editingOrder?: Order | null;
}

interface OrderFormValues {
  orderType: "dineIn" | "takeAway";
  tableNumber?: string;
  orderItems: {
    category: string;
    itemName: string;
    quantity: number;
    notes?: string;
    unitPrice: number;
  }[];
  attendant: string;
}

const AddOrderForm = ({ onSuccess, onCancel, editingOrder }: AddOrderFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch menu items for dropdown
  const { data: menuItems } = useQuery({
    queryKey: ['menuItems'],
    queryFn: async () => {
      console.log("Fetching menu items...");
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
        .select('*')
        .eq('restaurant_id', profile.restaurant_id);

      if (error) throw error;
      console.log("Fetched menu items:", data);
      return data;
    },
  });

  // Fetch tables for dropdown
  const { data: tables } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      console.log("Fetching tables...");
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .eq('status', 'available');

      if (error) throw error;
      console.log("Fetched tables:", data);
      return data;
    },
  });

  // Fetch staff for attendant dropdown
  const { data: staffMembers } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      console.log("Fetching staff members...");
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id);

      if (error) throw error;
      console.log("Fetched staff members:", data);
      return data;
    },
  });

  // Parse editing order items if available
  const parseEditingOrderItems = () => {
    if (!editingOrder || !menuItems) return [];
    
    // Try to parse order items from the editingOrder
    return editingOrder.items.map(itemString => {
      // Parse the itemString format: "2x Chicken Biryani (extra spicy)"
      const quantityMatch = itemString.match(/^(\d+)x /);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
      
      // Remove the quantity prefix
      let remainingString = itemString.replace(/^\d+x /, "");
      
      // Extract notes if they exist in parentheses
      let notes = "";
      const notesMatch = remainingString.match(/\((.*?)\)$/);
      if (notesMatch) {
        notes = notesMatch[1];
        remainingString = remainingString.replace(/\s*\(.*?\)$/, "");
      }
      
      // The remaining string should be the item name
      const itemName = remainingString.trim();
      
      // Find matching menu item to get category and price
      const menuItem = menuItems.find(item => item.name === itemName);
      
      return {
        category: menuItem?.category || "",
        itemName: itemName,
        quantity: quantity,
        notes: notes,
        unitPrice: menuItem?.price || 0
      };
    });
  };

  // Determine order type and table number from editing order
  const determineOrderTypeAndTable = () => {
    if (!editingOrder) return { orderType: "dineIn" as const, tableNumber: undefined };
    
    // If customer_name starts with "Table", it's a dine-in order
    if (editingOrder.customer_name.startsWith("Table")) {
      return {
        orderType: "dineIn" as const,
        tableNumber: editingOrder.customer_name.replace("Table ", "")
      };
    } else {
      return {
        orderType: "takeAway" as const,
        tableNumber: undefined
      };
    }
  };

  const { orderType, tableNumber } = determineOrderTypeAndTable();
  
  const form = useForm<OrderFormValues>({
    defaultValues: {
      orderType: orderType,
      tableNumber: tableNumber,
      orderItems: editingOrder ? parseEditingOrderItems() : [
        {
          category: "",
          itemName: "",
          quantity: 1,
          notes: "",
          unitPrice: 0,
        },
      ],
      attendant: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "orderItems",
  });

  const onSubmit = async (values: OrderFormValues) => {
    try {
      setLoading(true);
      console.log("Submitting order:", values);
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      // Calculate total
      const total = values.orderItems.reduce((sum, item) => 
        sum + (item.quantity * item.unitPrice), 0
      );

      const orderData = {
        restaurant_id: profile.restaurant_id,
        customer_name: values.orderType === "dineIn" ? `Table ${values.tableNumber}` : "Take Away",
        items: values.orderItems.map(item => `${item.quantity}x ${item.itemName} ${item.notes ? `(${item.notes})` : ''}`),
        total: total,
        status: editingOrder ? editingOrder.status : "pending",
      };

      if (editingOrder) {
        // Update existing order
        const { error } = await supabase
          .from("orders")
          .update(orderData)
          .eq("id", editingOrder.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Order updated successfully",
        });
      } else {
        // Insert new order
        const { error } = await supabase
          .from("orders")
          .insert([orderData]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Order added successfully",
        });
      }
      
      onSuccess();
    } catch (error) {
      console.error("Error adding/updating order:", error);
      toast({
        title: "Error",
        description: "Failed to save order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories from menu items
  const categories = Array.from(new Set(menuItems?.map(item => item.category) || []));

  return (
    <div className="p-6 bg-[#F1F0FB] rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-primary">
        {editingOrder ? "Edit Order" : "New Order"}
      </h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="orderType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold text-primary">Order Type</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value="dineIn" 
                        id="dineIn"
                        className="text-accent border-accent data-[state=checked]:bg-accent"
                      />
                      <label htmlFor="dineIn" className="font-medium">Dine In</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value="takeAway" 
                        id="takeAway"
                        className="text-accent border-accent data-[state=checked]:bg-accent"
                      />
                      <label htmlFor="takeAway" className="font-medium">Take Away</label>
                    </div>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />

          {form.watch("orderType") === "dineIn" && (
            <FormField
              control={form.control}
              name="tableNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold text-primary">Table Number</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select a table" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white">
                      {tables?.map((table) => (
                        <SelectItem key={table.id} value={table.name}>
                          Table {table.name} (Capacity: {table.capacity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-primary">Order Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({
                  category: "",
                  itemName: "",
                  quantity: 1,
                  notes: "",
                  unitPrice: 0,
                })}
                className="bg-white hover:bg-accent hover:text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            {/* Headers */}
            <div className="grid grid-cols-12 gap-4 px-2 py-3 bg-secondary rounded-lg">
              <div className="col-span-2 font-semibold text-sm">Category</div>
              <div className="col-span-2 font-semibold text-sm">Item Name</div>
              <div className="col-span-3 font-semibold text-sm">Notes</div>
              <div className="col-span-1 font-semibold text-sm">Qty</div>
              <div className="col-span-2 font-semibold text-sm">Unit Price</div>
              <div className="col-span-1 font-semibold text-sm">Total</div>
              <div className="col-span-1"></div>
            </div>

            {fields.map((field, index) => (
              <Card key={field.id} className="p-4 bg-white">
                <div className="grid grid-cols-12 gap-4 items-start">
                  <FormField
                    control={form.control}
                    name={`orderItems.${index}.category`}
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`orderItems.${index}.itemName`}
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormControl>
                          <Select
                            onValueChange={(value) => {
                              const menuItem = menuItems?.find(item => item.name === value);
                              if (menuItem) {
                                form.setValue(`orderItems.${index}.unitPrice`, menuItem.price);
                              }
                              field.onChange(value);
                            }}
                            defaultValue={field.value}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Item" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {menuItems
                                ?.filter(item => item.category === form.watch(`orderItems.${index}.category`))
                                .map((item) => (
                                  <SelectItem key={item.id} value={item.name}>
                                    {item.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`orderItems.${index}.notes`}
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormControl>
                          <Textarea {...field} placeholder="Special instructions" className="bg-white" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`orderItems.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="col-span-1">
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            className="bg-white"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`orderItems.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormControl>
                          <Input {...field} type="number" step="0.01" readOnly className="bg-white" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="col-span-1">
                    <Input
                      value={(form.watch(`orderItems.${index}.quantity`) || 0) * 
                             (form.watch(`orderItems.${index}.unitPrice`) || 0)}
                      readOnly
                      className="bg-white"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="col-span-1"
                    onClick={() => remove(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}

            {/* Order total */}
            <div className="flex justify-end mt-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between gap-8">
                  <span className="font-semibold">Order Total:</span>
                  <span className="text-xl font-bold text-purple-600">
                    ₹{fields.reduce((sum, _, index) => 
                      sum + ((form.watch(`orderItems.${index}.quantity`) || 0) * 
                            (form.watch(`orderItems.${index}.unitPrice`) || 0)), 0).toFixed(2)
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          <FormField
            control={form.control}
            name="attendant"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold text-primary">Attendant</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select attendant" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white">
                    {staffMembers?.map((staff) => (
                      <SelectItem key={staff.id} value={staff.first_name}>
                        {staff.first_name} {staff.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="bg-white hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-accent hover:bg-accent/90 text-white"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingOrder ? "Update Order" : "Submit Order"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AddOrderForm;
