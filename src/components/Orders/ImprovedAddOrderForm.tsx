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
  User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Order } from "@/types/orders";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { formatOrderItemString } from "@/lib/order-utils";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();

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
  const parseEditingOrderItems = () => {
    if (!editingOrder) return [];

    return editingOrder.items.map((itemString) => {
      const quantityMatch = itemString.match(/^(\d+)x /);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

      let remainingString = itemString.replace(/^\d+x /, "");

      let unitPrice = 0;
      const priceMatch = remainingString.match(/@(\d+(?:\.\d+)?)$/);
      if (priceMatch) {
        unitPrice = parseFloat(priceMatch[1]) || 0;
        remainingString = remainingString.replace(/\s*@\d+(?:\.\d+)?$/, "");
      }
      remainingString = remainingString.replace(/\s*@(undefined|null)$/i, "");

      let notes = "";
      const notesMatch = remainingString.match(/\((.*?)\)$/);
      if (notesMatch) {
        const rawNotes = notesMatch[1].trim();
        if (rawNotes && rawNotes !== "[]") {
          notes = rawNotes;
        }
        remainingString = remainingString.replace(/\s*\(.*?\)$/, "");
      }

      const itemName = remainingString.trim();

      const menuItem = menuItems?.find(
        (item) =>
          item.name === itemName ||
          item.name.toLowerCase() === itemName.toLowerCase() ||
          item.name.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(item.name.toLowerCase()),
      );

      const finalPrice = unitPrice > 0 ? unitPrice : menuItem?.price || 0;

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
    }
  }, [editingOrder, menuItems]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "orderItems",
  });

  const watchedItems = form.watch("orderItems");
  const subtotal = watchedItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0,
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
          return formatOrderItemString(item.quantity, item.itemName, item.unitPrice, item.notes);
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

      const kitchenItems = values.orderItems.map((item) => ({
        name: item.itemName,
        quantity: item.quantity,
        price: item.unitPrice,
        notes: item.notes ? [item.notes] : [],
      }));

      if (editingOrder) {
        const { error: orderError } = await supabase
          .from("orders")
          .update(orderData)
          .eq("id", editingOrder.id);

        if (orderError) throw orderError;

        const { data: linkedKitchenOrder } = await supabase
          .from("kitchen_orders")
          .select("id")
          .eq("order_id", editingOrder.id)
          .single();

        if (linkedKitchenOrder) {
          const { error: kitchenError } = await supabase
            .from("kitchen_orders")
            .update({
              items: kitchenItems,
              source: orderData.customer_name,
            })
            .eq("id", linkedKitchenOrder.id);

          if (kitchenError) {
            console.error("Failed to update kitchen order:", kitchenError);
            toast({
              title: "Warning",
              description: "Order updated but kitchen sync failed.",
              variant: "destructive",
            });
          }
        }

        toast({
          title: "Success",
          description: "Order updated successfully",
        });
      } else {
        const { data: newOrder, error: orderError } = await supabase
          .from("orders")
          .insert([orderData])
          .select()
          .single();

        if (orderError) throw orderError;

        if (newOrder) {
          const { error: kitchenError } = await supabase
            .from("kitchen_orders")
            .insert({
              restaurant_id: profile.restaurant_id,
              source: orderData.customer_name,
              status: "new",
              items: kitchenItems,
              order_id: newOrder.id,
              order_type: orderData.order_type,
              customer_name: values.customerName,
            });

          if (kitchenError) {
            console.error("Failed to create kitchen order:", kitchenError);
            toast({
              title: "Warning",
              description: "Order created but sent to kitchen failed.",
              variant: "destructive",
            });
          }
        }

        toast({
          title: "Success",
          description: "Order created successfully",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
      queryClient.invalidateQueries({
        queryKey: ["quickserve-todays-revenue"],
      });

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
    new Set(menuItems?.map((item) => item.category) || []),
  );
  const watchedOrderType = form.watch("orderType");

  // Short order ID for display
  const shortOrderId = editingOrder
    ? editingOrder.id.length > 8
      ? `#${editingOrder.id.substring(0, 8).toUpperCase()}`
      : `#${editingOrder.id.toUpperCase()}`
    : null;

  return (
    <div
      className="max-w-[540px] w-full mx-auto overflow-hidden flex flex-col max-h-[88vh]"
      style={{
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(40px)",
        border: "1px solid rgba(255,255,255,0.92)",
        borderRadius: 24,
        boxShadow: "0 32px 80px rgba(29,78,216,0.22), 0 8px 24px rgba(0,0,0,0.1)",
      }}
    >
      {/* ═══ Modal Header Band ═══ */}
      <div className="flex-shrink-0 overflow-hidden" style={{ borderRadius: "24px 24px 0 0" }}>
        <div
          className="px-6 pt-5 pb-5 flex items-start justify-between relative"
          style={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #f97316 100%)",
          }}
        >
          {/* Decorative orbs */}
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/[0.06] pointer-events-none" />
          <div className="absolute left-0 bottom-0 w-20 h-20 rounded-full bg-white/[0.04] pointer-events-none translate-y-1/2 -translate-x-1/4" />

          <div className="relative z-10">
            <h2 className="text-lg font-extrabold text-white tracking-tight">
              {editingOrder ? `Edit Order ${shortOrderId}` : "New Order"}
            </h2>
            <p className="text-xs text-white/65 font-medium mt-0.5">
              {editingOrder
                ? `${editingOrder.customer_name} · Ordered ${new Date(editingOrder.created_at).toLocaleDateString()}`
                : "Create a new order"}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onCancel}
            className="relative z-10 w-[30px] h-[30px] rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white text-sm font-semibold hover:bg-white/35 transition-all flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ═══ Modal Body ═══ */}
      <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: "thin" }}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="order-form" className="space-y-5">

            {/* ── Order Type Toggle ── */}
            <div
              className="flex gap-1 p-1 rounded-xl"
              style={{ background: "rgba(29,78,216,0.07)" }}
            >
              <button
                type="button"
                onClick={() => form.setValue("orderType", "dineIn")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[9px] text-xs font-bold transition-all ${
                  watchedOrderType === "dineIn"
                    ? "bg-white text-blue-600 shadow-lg border border-blue-100"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                Dine In
              </button>
              <button
                type="button"
                onClick={() => form.setValue("orderType", "takeAway")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[9px] text-xs font-bold transition-all ${
                  watchedOrderType === "takeAway"
                    ? "bg-white text-blue-600 shadow-lg border border-blue-100"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Take Away
              </button>
            </div>

            {/* ── Customer / Table Fields ── */}
            {watchedOrderType === "dineIn" ? (
              <FormField
                control={form.control}
                name="tableNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Table
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger
                          className="h-10 rounded-[10px] border-blue-100 bg-white/85 text-sm font-medium focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        >
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
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Customer Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Walk-in Customer"
                          className="h-10 rounded-[10px] border-blue-100 bg-white/85 text-sm font-medium placeholder:text-slate-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
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
                      <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter phone number…"
                          className="h-10 rounded-[10px] border-blue-100 bg-white/85 text-sm font-medium placeholder:text-slate-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* ── Items Section ── */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Items ({fields.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    append({
                      category: "",
                      itemName: "",
                      quantity: 1,
                      notes: "",
                      unitPrice: 0,
                    })
                  }
                  className="flex items-center gap-1 text-[11px] font-bold text-white px-3 py-1 rounded-[7px] transition-all hover:-translate-y-px"
                  style={{
                    background: "linear-gradient(135deg, #f97316 0%, #1d4ed8 100%)",
                    boxShadow: "0 3px 10px rgba(249,115,22,0.35)",
                  }}
                >
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                {fields.length === 0 && (
                  <div className="text-center py-8 text-slate-300">
                    <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No items yet</p>
                  </div>
                )}

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all hover:bg-white hover:border-blue-200 hover:shadow-md"
                    style={{
                      background: "rgba(255,255,255,0.78)",
                      border: "1.5px solid rgba(29,78,216,0.09)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    {/* Number badge */}
                    <div
                      className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg, #f97316 0%, #1d4ed8 100%)",
                        boxShadow: "0 2px 8px rgba(249,115,22,0.35)",
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Item name / select */}
                    <div className="flex-1 min-w-0">
                      <FormField
                        control={form.control}
                        name={`orderItems.${index}.itemName`}
                        render={({ field: itemField }) => (
                          <FormItem className="space-y-0">
                            {itemField.value && itemField.value.trim() !== "" ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-bold text-slate-800 truncate">
                                  {itemField.value}
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <FormField
                                  control={form.control}
                                  name={`orderItems.${index}.category`}
                                  render={({ field: catField }) => (
                                    <Select
                                      onValueChange={catField.onChange}
                                      value={catField.value}
                                    >
                                      <SelectTrigger className="h-7 text-[10px] rounded-lg border-slate-200">
                                        <SelectValue placeholder="Category..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {categories.map((category) => (
                                          <SelectItem key={category} value={category || "other"} className="text-xs">
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
                                      (item) => item.name === value,
                                    );
                                    if (menuItem) {
                                      form.setValue(`orderItems.${index}.unitPrice`, menuItem.price);
                                      form.setValue(`orderItems.${index}.category`, menuItem.category);
                                    }
                                    itemField.onChange(value);
                                  }}
                                  value={itemField.value}
                                >
                                  <SelectTrigger className="h-7 text-[10px] rounded-lg border-slate-200">
                                    <SelectValue placeholder="Select item..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {menuItems
                                      ?.filter(
                                        (item) =>
                                          !form.watch(`orderItems.${index}.category`) ||
                                          item.category === form.watch(`orderItems.${index}.category`),
                                      )
                                      .map((item) => (
                                        <SelectItem key={item.id} value={item.name || item.id} className="text-xs">
                                          {item.name} - {currencySymbol}{item.price}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Price label */}
                    <span className="font-mono text-[11px] font-semibold text-slate-400 flex-shrink-0">
                      {currencySymbol}{form.watch(`orderItems.${index}.unitPrice`) || 0} each
                    </span>

                    {/* Quantity control */}
                    <div
                      className="flex items-center rounded-[9px] overflow-hidden flex-shrink-0"
                      style={{
                        border: "1.5px solid rgba(29,78,216,0.18)",
                        background: "rgba(255,255,255,0.92)",
                      }}
                    >
                      <FormField
                        control={form.control}
                        name={`orderItems.${index}.quantity`}
                        render={({ field: qtyField }) => (
                          <>
                            <button
                              type="button"
                              onClick={() => qtyField.onChange(Math.max(1, (qtyField.value || 1) - 1))}
                              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-600 font-bold text-sm transition-all"
                            >
                              −
                            </button>
                            <span className="px-2 font-mono text-[13px] font-bold text-slate-800 min-w-[30px] text-center leading-7">
                              {qtyField.value}
                            </span>
                            <button
                              type="button"
                              onClick={() => qtyField.onChange((qtyField.value || 1) + 1)}
                              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-600 font-bold text-sm transition-all"
                            >
                              +
                            </button>
                          </>
                        )}
                      />
                    </div>

                    {/* Subtotal */}
                    <span className="font-mono text-xs font-bold text-blue-600 min-w-[45px] text-right flex-shrink-0">
                      {currencySymbol}
                      {((form.watch(`orderItems.${index}.quantity`) || 0) *
                        (form.watch(`orderItems.${index}.unitPrice`) || 0)).toFixed(0)}
                    </span>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-all flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(29,78,216,0.18), transparent)" }} />

            {/* ── Discount Section ── */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                Discount
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Discount Type
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 rounded-[10px] border-blue-100 bg-white/85 text-xs font-medium">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="amount">Amount ({currencySymbol})</SelectItem>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discountValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
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
                          className="h-10 rounded-[10px] border-blue-100 bg-white/85 text-sm font-medium focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ── Summary Box ── */}
            <div
              className="p-4 rounded-[14px]"
              style={{
                background: "linear-gradient(135deg, rgba(29,78,216,0.06), rgba(249,115,22,0.06))",
                border: "1.5px solid rgba(29,78,216,0.13)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div className="flex justify-between text-[13px] text-slate-500 mb-2 font-medium">
                <span>Subtotal</span>
                <span className="font-mono">{currencySymbol}{subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-[13px] mb-2 font-medium">
                <span className="text-slate-500">Discount</span>
                <span className="font-mono text-red-500">−{currencySymbol}{discountAmount.toFixed(0)}</span>
              </div>
              <div
                className="flex justify-between text-base font-extrabold text-slate-800 pt-2.5 mt-1"
                style={{ borderTop: "1.5px solid rgba(29,78,216,0.13)" }}
              >
                <span>Total payable</span>
                <span
                  className="text-lg font-mono"
                  style={{
                    background: "linear-gradient(135deg, #f97316 0%, #1d4ed8 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {currencySymbol}{orderTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* ── Attendant ── */}
            <FormField
              control={form.control}
              name="attendant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <User className="w-3 h-3" /> Attendant
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10 rounded-[10px] border-blue-100 bg-white/85 text-sm font-medium">
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
          </form>
        </Form>
      </div>

      {/* ═══ Modal Footer ═══ */}
      <div
        className="flex gap-2.5 px-6 py-4 flex-shrink-0"
        style={{
          borderTop: "1px solid rgba(29,78,216,0.09)",
          background: "rgba(255,255,255,0.65)",
          backdropFilter: "blur(20px)",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 flex items-center justify-center py-2.5 rounded-[10px] text-[13px] font-bold text-slate-500 bg-white/92 border-[1.5px] border-blue-100 transition-all hover:bg-white disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="order-form"
          disabled={loading || orderTotal === 0}
          className="flex-[1.5] flex items-center justify-center py-2.5 rounded-[10px] text-[13px] font-bold text-white transition-all hover:-translate-y-px disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #f97316 100%)",
            boxShadow: "0 6px 20px rgba(29,78,216,0.35)",
          }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </span>
          ) : editingOrder ? (
            "Save changes"
          ) : (
            "Create Order"
          )}
        </button>
      </div>
    </div>
  );
};

export default ImprovedAddOrderForm;
