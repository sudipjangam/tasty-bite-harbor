
import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, Plus, X, Users, Utensils, Clock, Calculator } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import type { Order } from "@/types/orders";

interface ImprovedAddOrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  editingOrder?: Order | null;
}

interface OrderFormValues {
  orderType: "dineIn" | "takeAway";
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  orderItems: {
    category: string;
    itemName: string;
    quantity: number;
    notes?: string;
    unitPrice: number;
  }[];
  attendant: string;
  specialInstructions?: string;
}

const ImprovedAddOrderForm = ({ onSuccess, onCancel, editingOrder }: ImprovedAddOrderFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch menu items for dropdown
  const { data: menuItems } = useQuery({
    queryKey: ['menuItems'],
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
        .select('*')
        .eq('restaurant_id', profile.restaurant_id);

      if (error) throw error;
      return data;
    },
  });

  // Fetch tables for dropdown
  const { data: tables } = useQuery({
    queryKey: ['tables'],
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
        .from('rooms')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .eq('status', 'available');

      if (error) throw error;
      return data;
    },
  });

  // Fetch staff for attendant dropdown
  const { data: staffMembers } = useQuery({
    queryKey: ['staff'],
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
        .from('staff')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id);

      if (error) throw error;
      return data;
    },
  });

  // Parse editing order items if available
  const parseEditingOrderItems = () => {
    if (!editingOrder || !menuItems) return [];
    
    return editingOrder.items.map(itemString => {
      const quantityMatch = itemString.match(/^(\d+)x /);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
      
      let remainingString = itemString.replace(/^\d+x /, "");
      
      let notes = "";
      const notesMatch = remainingString.match(/\((.*?)\)$/);
      if (notesMatch) {
        notes = notesMatch[1];
        remainingString = remainingString.replace(/\s*\(.*?\)$/, "");
      }
      
      const itemName = remainingString.trim();
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

  const determineOrderTypeAndTable = () => {
    if (!editingOrder) return { orderType: "dineIn" as const, tableNumber: undefined };
    
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
      customerName: editingOrder && !editingOrder.customer_name.startsWith("Table") ? editingOrder.customer_name : "",
      customerPhone: "",
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
      specialInstructions: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "orderItems",
  });

  const watchedItems = form.watch("orderItems");
  const orderTotal = watchedItems.reduce((sum, item) => 
    sum + (item.quantity * item.unitPrice), 0
  );

  const onSubmit = async (values: OrderFormValues) => {
    try {
      setLoading(true);
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const orderData = {
        restaurant_id: profile.restaurant_id,
        customer_name: values.orderType === "dineIn" 
          ? `Table ${values.tableNumber}` 
          : values.customerName || "Take Away",
        items: values.orderItems.map(item => 
          `${item.quantity}x ${item.itemName} ${item.notes ? `(${item.notes})` : ''}`
        ),
        total: orderTotal,
        status: editingOrder ? editingOrder.status : "pending",
      };

      if (editingOrder) {
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
        const { error } = await supabase
          .from("orders")
          .insert([orderData]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Order created successfully",
        });
      }
      
      onSuccess();
    } catch (error) {
      console.error("Error saving order:", error);
      toast({
        title: "Error",
        description: "Failed to save order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(menuItems?.map(item => item.category) || []));

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingOrder ? "Edit Order" : "Create New Order"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {editingOrder ? "Update order details" : "Add items and customer information"}
            </p>
          </div>
          <Button variant="ghost" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-6 max-h-[80vh] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Order Type Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Order Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="orderType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex gap-6"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="dineIn" id="dineIn" />
                            <label htmlFor="dineIn" className="font-medium cursor-pointer">
                              Dine In
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="takeAway" id="takeAway" />
                            <label htmlFor="takeAway" className="font-medium cursor-pointer">
                              Take Away
                            </label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("orderType") === "dineIn" ? (
                  <FormField
                    control={form.control}
                    name="tableNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table Number</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a table" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter customer name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter phone number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Items Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Order Items
                  </CardTitle>
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
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={field.id} className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-12 gap-4 items-start">
                        <div className="col-span-3">
                          <FormField
                            control={form.control}
                            name={`orderItems.${index}.category`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Category</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
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
                        </div>

                        <div className="col-span-3">
                          <FormField
                            control={form.control}
                            name={`orderItems.${index}.itemName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Item</FormLabel>
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
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {menuItems
                                        ?.filter(item => item.category === form.watch(`orderItems.${index}.category`))
                                        .map((item) => (
                                          <SelectItem key={item.id} value={item.name}>
                                            <div className="flex justify-between items-center w-full">
                                              <span>{item.name}</span>
                                              <Badge variant="secondary" className="ml-2">
                                                ₹{item.price}
                                              </Badge>
                                            </div>
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name={`orderItems.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Qty</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    min="1"
                                    className="h-9"
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name={`orderItems.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Price</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" step="0.01" readOnly className="h-9 bg-gray-50" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="col-span-1">
                          <div className="text-xs text-gray-500 mb-1">Total</div>
                          <div className="h-9 px-3 py-2 bg-purple-50 border rounded-md text-sm font-medium">
                            ₹{((form.watch(`orderItems.${index}.quantity`) || 0) * 
                               (form.watch(`orderItems.${index}.unitPrice`) || 0)).toFixed(2)}
                          </div>
                        </div>

                        <div className="col-span-1">
                          <div className="text-xs text-gray-500 mb-1">&nbsp;</div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600"
                            onClick={() => remove(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="col-span-12 mt-2">
                          <FormField
                            control={form.control}
                            name={`orderItems.${index}.notes`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    placeholder="Special instructions (e.g., no onions, extra spicy)" 
                                    className="resize-none h-20"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Order Total */}
                <div className="flex justify-end">
                  <Card className="w-64">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Order Total:</span>
                        <span className="text-2xl font-bold text-purple-600">
                          ₹{orderTotal.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="attendant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attendant</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select attendant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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

                <FormField
                  control={form.control}
                  name="specialInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Instructions</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Any special instructions for the kitchen or service..."
                          className="resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || orderTotal === 0}
                className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingOrder ? "Update Order" : "Create Order"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default ImprovedAddOrderForm;
