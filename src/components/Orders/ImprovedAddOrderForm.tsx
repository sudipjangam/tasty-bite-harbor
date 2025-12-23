import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  X,
  Utensils,
  ShoppingBag,
  Trash2,
  ChefHat,
  Receipt,
  User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Order } from "@/types/orders";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";

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
  discountType: "percentage" | "amount";
  discountValue: number;
}

const ImprovedAddOrderForm = ({
  onSuccess,
  onCancel,
  editingOrder,
}: ImprovedAddOrderFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();
  const { user } = useAuth();

  // Get attendant name from logged-in user
  const attendantName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
    : "";

  // Fetch menu items for dropdown
  const { data: menuItems } = useQuery({
    queryKey: ["menuItems"],
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

  // Fetch tables for dropdown
  const { data: tables } = useQuery({
    queryKey: ["tables"],
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
        .from("rooms")
        .select("*")
        .eq("restaurant_id", profile.restaurant_id)
        .eq("status", "available");

      if (error) throw error;
      return data;
    },
  });

  // Fetch staff for attendant dropdown
  const { data: staffMembers } = useQuery({
    queryKey: ["staff"],
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
        .from("profiles")
        .select("*")
        .eq("restaurant_id", profile.restaurant_id);

      if (error) throw error;
      return data;
    },
  });

  // Parse editing order items if available
  // Format: "2x ItemName @price" or "2x ItemName (notes)" or just "2x ItemName"
  const parseEditingOrderItems = () => {
    if (!editingOrder) return [];

    console.log("Parsing order items:", editingOrder.items);

    return editingOrder.items.map((itemString) => {
      // Extract quantity (e.g., "2x" -> 2)
      const quantityMatch = itemString.match(/^(\d+)x /);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

      let remainingString = itemString.replace(/^\d+x /, "");

      // Extract price if present (e.g., "@250" -> 250), handle @undefined or @null
      let unitPrice = 0;
      const priceMatch = remainingString.match(/@(\d+(?:\.\d+)?)$/);
      if (priceMatch) {
        unitPrice = parseFloat(priceMatch[1]) || 0;
        remainingString = remainingString.replace(/\s*@\d+(?:\.\d+)?$/, "");
      }
      // Also clean up @undefined or @null
      remainingString = remainingString.replace(/\s*@(undefined|null)$/i, "");

      // Extract notes in parentheses (e.g., "(no cheese)" -> "no cheese")
      let notes = "";
      const notesMatch = remainingString.match(/\((.*?)\)$/);
      if (notesMatch) {
        notes = notesMatch[1];
        remainingString = remainingString.replace(/\s*\(.*?\)$/, "");
      }

      const itemName = remainingString.trim();

      // Try to find the menu item to get category and price
      const menuItem = menuItems?.find(
        (item) =>
          item.name === itemName ||
          item.name.toLowerCase() === itemName.toLowerCase() ||
          item.name.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(item.name.toLowerCase())
      );

      // Priority: parsed price > menu item price > 0
      const finalPrice = unitPrice > 0 ? unitPrice : menuItem?.price || 0;

      console.log(
        `Parsed item: "${itemName}" qty=${quantity} price=${finalPrice} (from string: ${unitPrice}, from menu: ${menuItem?.price})`
      );

      return {
        category: menuItem?.category || "",
        itemName: itemName,
        quantity: quantity,
        notes: notes,
        unitPrice: finalPrice,
      };
    });
  };

  const determineOrderTypeAndTable = () => {
    if (!editingOrder)
      return { orderType: "dineIn" as const, tableNumber: undefined };

    if (editingOrder.customer_name.startsWith("Table")) {
      return {
        orderType: "dineIn" as const,
        tableNumber: editingOrder.customer_name.replace("Table ", ""),
      };
    } else {
      return {
        orderType: "takeAway" as const,
        tableNumber: undefined,
      };
    }
  };

  const { orderType, tableNumber } = determineOrderTypeAndTable();

  const form = useForm<OrderFormValues>({
    defaultValues: {
      orderType: orderType,
      tableNumber: tableNumber,
      customerName:
        editingOrder && !editingOrder.customer_name.startsWith("Table")
          ? editingOrder.customer_name
          : "",
      customerPhone: "",
      orderItems:
        editingOrder && menuItems
          ? parseEditingOrderItems()
          : [
              {
                category: "",
                itemName: "",
                quantity: 1,
                notes: "",
                unitPrice: 0,
              },
            ],
      attendant: attendantName,
      specialInstructions: "",
      discountType: editingOrder?.discount_percentage ? "percentage" : "amount",
      discountValue:
        editingOrder?.discount_percentage || editingOrder?.discount_amount || 0,
    },
  });

  // Update form values when editing order is available AND when menuItems load
  useEffect(() => {
    if (editingOrder) {
      const parsedItems = parseEditingOrderItems();
      const { orderType, tableNumber } = determineOrderTypeAndTable();

      // Only reset if items have been parsed successfully (at least some with prices)
      const hasPrices = parsedItems.some((item) => item.unitPrice > 0);

      form.reset({
        orderType,
        tableNumber,
        customerName: !editingOrder.customer_name.startsWith("Table")
          ? editingOrder.customer_name
          : "",
        customerPhone: "",
        orderItems:
          parsedItems.length > 0
            ? parsedItems
            : [
                {
                  category: "",
                  itemName: "",
                  quantity: 1,
                  notes: "",
                  unitPrice: 0,
                },
              ],
        attendant: editingOrder?.attendant || "",
        specialInstructions: "",
        discountType: editingOrder?.discount_percentage
          ? "percentage"
          : "amount",
        discountValue:
          editingOrder?.discount_percentage ||
          editingOrder?.discount_amount ||
          0,
      });

      console.log(
        "Form reset with parsed items:",
        parsedItems,
        "Has prices:",
        hasPrices
      );
    }
  }, [editingOrder, menuItems]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "orderItems",
  });

  const watchedItems = form.watch("orderItems");
  const subtotal = watchedItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0
  );

  const discountType = form.watch("discountType");
  const discountValue = form.watch("discountValue");

  const discountAmount =
    discountType === "percentage"
      ? (subtotal * (discountValue || 0)) / 100
      : discountValue || 0;

  const orderTotal = Math.max(0, subtotal - discountAmount);

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
        customer_name:
          values.orderType === "dineIn"
            ? `Table ${values.tableNumber}`
            : values.customerName || "Take Away",
        items: values.orderItems.map((item) => {
          const notesText = item.notes ? `(${item.notes})` : "";
          return `${item.quantity}x ${item.itemName} ${notesText} @${item.unitPrice}`;
        }),
        total: orderTotal,
        discount_amount: discountAmount || 0,
        discount_percentage:
          values.discountType === "percentage" ? values.discountValue : 0,
        status: editingOrder ? editingOrder.status : "pending",
        source: "manual",
        order_type: values.orderType === "dineIn" ? "dine-in" : "takeaway",
        attendant: values.attendant || attendantName || null,
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
        const { error } = await supabase.from("orders").insert([orderData]);

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

  const categories = Array.from(
    new Set(menuItems?.map((item) => item.category) || [])
  );
  const watchedOrderType = form.watch("orderType");

  return (
    <div className="max-w-2xl mx-auto overflow-hidden rounded-2xl shadow-2xl border-0">
      {/* Gradient Header - Like TimeClockDialog */}
      <div
        className={`relative px-5 pt-8 pb-6 text-center ${
          editingOrder
            ? "bg-gradient-to-br from-amber-500 via-orange-500 to-red-500"
            : "bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500"
        }`}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* Icon */}
        <div className="relative z-10 inline-flex items-center justify-center w-14 h-14 mb-3 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg">
          {editingOrder ? (
            <Receipt className="w-7 h-7 text-white" />
          ) : (
            <ChefHat className="w-7 h-7 text-white" />
          )}
        </div>

        <h2 className="relative z-10 text-xl font-bold text-white">
          {editingOrder ? "Edit Order" : "New Order"}
        </h2>
        <p className="relative z-10 text-white/80 text-sm mt-0.5">
          {editingOrder ? "Update order details" : "Add items to the order"}
        </p>
      </div>

      {/* Form Content */}
      <div className="bg-white dark:bg-gray-900 p-5 space-y-4 max-h-[60vh] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Order Type Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => form.setValue("orderType", "dineIn")}
                className={`flex items-center justify-center gap-2 h-11 rounded-xl font-semibold text-sm transition-all border-2 ${
                  watchedOrderType === "dineIn"
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30"
                    : "bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-emerald-300"
                }`}
              >
                <Utensils className="w-4 h-4" />
                Dine In
              </button>
              <button
                type="button"
                onClick={() => form.setValue("orderType", "takeAway")}
                className={`flex items-center justify-center gap-2 h-11 rounded-xl font-semibold text-sm transition-all border-2 ${
                  watchedOrderType === "takeAway"
                    ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/30"
                    : "bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-amber-300"
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                Take Away
              </button>
            </div>

            {/* Conditional: Table or Customer */}
            {watchedOrderType === "dineIn" ? (
              <FormField
                control={form.control}
                name="tableNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                      Table
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl border-gray-200 dark:border-gray-700">
                          <SelectValue placeholder="Select table..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tables?.map((table) => (
                          <SelectItem
                            key={table.id}
                            value={table.name || String(table.id)}
                          >
                            🪑 Table {table.name} ({table.capacity} seats)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Customer name"
                          className="h-11 rounded-xl border-gray-200 dark:border-gray-700"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Phone
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Phone"
                          className="h-11 rounded-xl border-gray-200 dark:border-gray-700"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Order Items Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Items ({fields.length})
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    append({
                      category: "",
                      itemName: "",
                      quantity: 1,
                      notes: "",
                      unitPrice: 0,
                    })
                  }
                  className="h-7 px-3 text-xs bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 rounded-lg shadow-md"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>

              {/* Items List - Compact */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {fields.length === 0 && (
                  <div className="text-center py-6 text-gray-400 dark:text-gray-500">
                    <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No items yet</p>
                  </div>
                )}

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="relative p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 border border-gray-100 dark:border-gray-700"
                  >
                    {/* Item number badge */}
                    <div className="absolute -top-1 -left-1 w-5 h-5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow">
                      {index + 1}
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-end">
                      {/* Item Name - Show as text if has value, Select if empty */}
                      <div className="col-span-6">
                        <FormField
                          control={form.control}
                          name={`orderItems.${index}.itemName`}
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-[10px] font-semibold text-gray-500 uppercase">
                                Item
                              </FormLabel>
                              {field.value && field.value.trim() !== "" ? (
                                // Show item name as text for existing items
                                <div className="h-9 px-3 flex items-center rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700">
                                  <span className="text-sm font-medium text-violet-700 dark:text-violet-300 truncate">
                                    {field.value}
                                  </span>
                                  <Badge className="ml-auto bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                                    {currencySymbol}
                                    {form.watch(
                                      `orderItems.${index}.unitPrice`
                                    ) || 0}
                                  </Badge>
                                </div>
                              ) : (
                                // Show Select for new items
                                <>
                                  <FormField
                                    control={form.control}
                                    name={`orderItems.${index}.category`}
                                    render={({ categoryField }) => (
                                      <Select
                                        onValueChange={(catValue) => {
                                          form.setValue(
                                            `orderItems.${index}.category`,
                                            catValue
                                          );
                                        }}
                                        value={form.watch(
                                          `orderItems.${index}.category`
                                        )}
                                      >
                                        <SelectTrigger className="h-9 text-xs rounded-lg border-gray-200 dark:border-gray-600 mb-1">
                                          <SelectValue placeholder="Category..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {categories.map((category) => (
                                            <SelectItem
                                              key={category}
                                              value={category || "other"}
                                              className="text-sm"
                                            >
                                              {category}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                  <Select
                                    onValueChange={(value) => {
                                      const menuItem = menuItems?.find(
                                        (item) => item.name === value
                                      );
                                      if (menuItem) {
                                        form.setValue(
                                          `orderItems.${index}.unitPrice`,
                                          menuItem.price
                                        );
                                        form.setValue(
                                          `orderItems.${index}.category`,
                                          menuItem.category
                                        );
                                      }
                                      field.onChange(value);
                                    }}
                                    value={field.value}
                                  >
                                    <SelectTrigger className="h-9 text-xs rounded-lg border-gray-200 dark:border-gray-600">
                                      <SelectValue placeholder="Select item..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {menuItems
                                        ?.filter(
                                          (item) =>
                                            !form.watch(
                                              `orderItems.${index}.category`
                                            ) ||
                                            item.category ===
                                              form.watch(
                                                `orderItems.${index}.category`
                                              )
                                        )
                                        .map((item) => (
                                          <SelectItem
                                            key={item.id}
                                            value={item.name || item.id}
                                            className="text-sm"
                                          >
                                            {item.name} - {currencySymbol}
                                            {item.price}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </>
                              )}
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Quantity */}
                      <div className="col-span-4">
                        <FormField
                          control={form.control}
                          name={`orderItems.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-[10px] font-semibold text-gray-500 uppercase">
                                Qty
                              </FormLabel>
                              <div className="flex h-9">
                                <button
                                  type="button"
                                  onClick={() =>
                                    field.onChange(
                                      Math.max(1, (field.value || 1) - 1)
                                    )
                                  }
                                  className="w-9 bg-gray-100 dark:bg-gray-700 rounded-l-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-bold"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={field.value}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className="w-10 text-center text-sm font-bold border-y border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    field.onChange((field.value || 1) + 1)
                                  }
                                  className="w-9 bg-gray-100 dark:bg-gray-700 rounded-r-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Delete */}
                      <div className="col-span-2 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-[10px] text-gray-400">
                        {form.watch(`orderItems.${index}.quantity`)} ×{" "}
                        {currencySymbol}
                        {form.watch(`orderItems.${index}.unitPrice`) || 0}
                      </span>
                      <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                        {currencySymbol}
                        {(
                          (form.watch(`orderItems.${index}.quantity`) || 0) *
                          (form.watch(`orderItems.${index}.unitPrice`) || 0)
                        ).toFixed(0)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount Section */}
            <div className="flex gap-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
              <FormField
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <FormItem className="w-1/3">
                    <FormLabel className="text-xs font-semibold text-gray-500">
                      Discount Type
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-xs">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="amount">
                          Amount ({currencySymbol})
                        </SelectItem>
                        <SelectItem value="percentage">
                          Percentage (%)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discountValue"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs font-semibold text-gray-500">
                      Discount Value
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                        className="h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Order Total */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 border-2 border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Order Total
                </span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {currencySymbol}
                  {orderTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Attendant */}
            <FormField
              control={form.control}
              name="attendant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <User className="w-3 h-3" /> Attendant
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder="Select attendant..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staffMembers?.map((staff) => {
                        const fullName = `${staff.first_name || ""} ${
                          staff.last_name || ""
                        }`.trim();
                        return (
                          <SelectItem
                            key={staff.id}
                            value={fullName || staff.id}
                          >
                            {staff.first_name} {staff.last_name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 h-12 rounded-xl border-2 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || orderTotal === 0}
                className={`flex-[2] h-12 rounded-xl font-bold text-base shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  editingOrder
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/30"
                    : "bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-violet-500/30"
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </span>
                ) : editingOrder ? (
                  "Update Order"
                ) : (
                  "Create Order"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default ImprovedAddOrderForm;
