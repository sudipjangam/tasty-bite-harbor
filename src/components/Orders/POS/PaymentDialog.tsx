import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Receipt,
  CreditCard,
  Wallet,
  QrCode,
  Check,
  Printer,
  Trash2,
  Plus,
  X,
  Search,
  Loader2,
} from "lucide-react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import type { OrderItem } from "@/types/orders";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { CustomItemDialog, CustomItem } from "./CustomItemDialog";
import { PaymentDialogProps } from "./PaymentDialog/types";

// Removed local PaymentStep type definition as it's not used in the props anymore
// and we can infer or import if needed, but for now we just need PaymentDialogProps

const PaymentDialog = ({
  isOpen,
  onClose,
  orderItems,
  onSuccess,
  tableNumber = "",
  onEditOrder,
  orderId,
  onOrderUpdated,
  itemCompletionStatus: initialItemCompletionStatus,
}: PaymentDialogProps) => {
  const [currentStep, setCurrentStep] = useState<
    "confirm" | "method" | "qr" | "success" | "edit"
  >("confirm");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [sendBillToEmail, setSendBillToEmail] = useState(false);
  const [sendBillToMobile, setSendBillToMobile] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [newItemsBuffer, setNewItemsBuffer] = useState<OrderItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [promotionCode, setPromotionCode] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState<any>(null);
  const [manualDiscountPercent, setManualDiscountPercent] = useState<number>(0);
  const [manualDiscountCash, setManualDiscountCash] = useState<number>(0);
  const [detectedReservation, setDetectedReservation] = useState<{
    reservation_id: string;
    room_id: string;
    roomName: string;
    customerName: string;
  } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemCompletionStatus, setItemCompletionStatus] = useState<boolean[]>(
    initialItemCompletionStatus || []
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { symbol: currencySymbol } = useCurrencyContext();

  // Custom Item State
  const [showCustomItemDialog, setShowCustomItemDialog] = useState(false);

  // Fetch restaurant info
  const { data: restaurantInfo } = useQuery({
    queryKey: ["restaurant-info"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.restaurant_id) return null;

      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", profile.restaurant_id)
        .single();

      return data;
    },
  });

  // Fetch menu items for edit mode
  const { data: menuItems = [] } = useQuery({
    queryKey: ["menu-items-for-edit"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.restaurant_id) return [];

      const { data } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", profile.restaurant_id)
        .eq("is_available", true)
        .order("name");

      return data || [];
    },
    enabled: isOpen,
  });

  // Fetch payment settings
  const { data: paymentSettings } = useQuery({
    queryKey: [
      "payment-settings",
      restaurantInfo?.restaurantId || restaurantInfo?.id,
    ],
    queryFn: async () => {
      const restaurantIdToUse =
        restaurantInfo?.restaurantId || restaurantInfo?.id;
      if (!restaurantIdToUse) return null;

      const { data, error } = await supabase
        .from("payment_settings")
        .select("*")
        .eq("restaurant_id", restaurantIdToUse)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching payment settings:", error);
        return null;
      }

      return data;
    },
    enabled: !!(restaurantInfo?.restaurantId || restaurantInfo?.id),
  });

  // Fetch active promotions
  const { data: activePromotions = [] } = useQuery({
    queryKey: [
      "active-promotions",
      restaurantInfo?.restaurantId || restaurantInfo?.id,
    ],
    queryFn: async () => {
      const restaurantIdToUse =
        restaurantInfo?.restaurantId || restaurantInfo?.id;
      if (!restaurantIdToUse) return [];

      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("promotion_campaigns")
        .select("*")
        .eq("restaurant_id", restaurantIdToUse)
        .eq("is_active", true)
        .not("promotion_code", "is", null)
        .lte("start_date", today)
        .gte("end_date", today);

      if (error) {
        console.error("Error fetching promotions:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!(restaurantInfo?.restaurantId || restaurantInfo?.id),
  });

  // Calculate totals with promotion discount and manual discount
  // Handle weight-based pricing by using calculatedPrice when available
  const subtotal = orderItems.reduce((sum, item) => {
    if (item.calculatedPrice !== undefined) {
      return sum + item.calculatedPrice;
    }
    return sum + item.price * item.quantity;
  }, 0);

  // Calculate promotion discount amount if promotion is applied
  const promotionDiscountAmount = appliedPromotion
    ? appliedPromotion.discount_percentage
      ? (subtotal * appliedPromotion.discount_percentage) / 100
      : appliedPromotion.discount_amount || 0
    : 0;

  // Calculate manual discount amount (percentage + cash)
  const manualDiscountPercentAmount =
    manualDiscountPercent > 0 ? (subtotal * manualDiscountPercent) / 100 : 0;
  const manualDiscountAmount = manualDiscountPercentAmount + manualDiscountCash;

  // Total discount is sum of promotion + manual discounts
  const totalDiscountAmount = promotionDiscountAmount + manualDiscountAmount;

  const totalAfterDiscount = subtotal - totalDiscountAmount;
  const total = totalAfterDiscount;

  // Generate QR code when UPI method is selected
  useEffect(() => {
    if (paymentSettings?.upi_id) {
      const upiUrl = `upi://pay?pa=${
        paymentSettings.upi_id
      }&pn=${encodeURIComponent(
        restaurantInfo?.name || "Restaurant"
      )}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
        `Order ${tableNumber || "POS"}`
      )}`;

      QRCode.toDataURL(upiUrl, { width: 300, margin: 2 })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error("QR generation error:", err));
    }
  }, [currentStep, paymentSettings, total, restaurantInfo, tableNumber]);

  // Fetch existing customer details and discount if orderId exists
  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (orderId && isOpen) {
        try {
          const { data: kitchenOrder } = await supabase
            .from("kitchen_orders")
            .select("order_id, customer_name, customer_phone")
            .eq("id", orderId)
            .single();

          if (kitchenOrder?.order_id) {
            // Try fetching from orders with both naming conventions AND discount fields
            const { data: order } = await supabase
              .from("orders")
              .select(
                "Customer_Name, Customer_MobileNumber, customer_name, customer_phone, discount_percentage, discount_amount"
              )
              .eq("id", kitchenOrder.order_id)
              .maybeSingle();

            if (order) {
              const name =
                (order as any).Customer_Name || (order as any).customer_name;
              const phone =
                (order as any).Customer_MobileNumber ||
                (order as any).customer_phone;
              if (name) setCustomerName(name);
              if (phone) {
                setCustomerMobile(String(phone));
                setSendBillToEmail(true);
              }

              // Load existing discount percentage from DB, or reset to 0 if no discount
              const discountPercent =
                parseFloat((order as any).discount_percentage) || 0;
              setManualDiscountPercent(discountPercent);

              // Reset promotion state since we're loading fresh order data
              if (discountPercent === 0) {
                setAppliedPromotion(null);
                setPromotionCode("");
              }
            } else {
              // No order found - reset discount state
              setManualDiscountPercent(0);
              setAppliedPromotion(null);
              setPromotionCode("");
            }
          } else {
            // Fall back to details stored on the kitchen order
            if (kitchenOrder?.customer_name)
              setCustomerName(kitchenOrder.customer_name);
            if ((kitchenOrder as any)?.customer_phone) {
              setCustomerMobile(String((kitchenOrder as any).customer_phone));
              setSendBillToEmail(true);
            } else {
              setSendBillToEmail(false);
            }
            // No linked order - reset discount state
            setManualDiscountPercent(0);
            setAppliedPromotion(null);
            setPromotionCode("");
          }
        } catch (error) {
          console.error("Error fetching customer details:", error);
          // Reset discount state on error
          setManualDiscountPercent(0);
          setAppliedPromotion(null);
          setPromotionCode("");
        }
      } else if (isOpen && !orderId) {
        // New order (no orderId) - reset discount state
        setManualDiscountPercent(0);
        setAppliedPromotion(null);
        setPromotionCode("");
      }
    };

    fetchCustomerDetails();
  }, [orderId, isOpen]);

  // Fetch item completion status from KDS (synced with kitchen display)
  useEffect(() => {
    const fetchItemCompletionStatus = async () => {
      if (orderId && isOpen) {
        try {
          const { data, error } = await supabase
            .from("kitchen_orders")
            .select("item_completion_status")
            .eq("id", orderId)
            .single();

          if (!error && data?.item_completion_status) {
            setItemCompletionStatus(data.item_completion_status);
          } else {
            setItemCompletionStatus([]);
          }
        } catch (err) {
          console.error("Error fetching item completion status:", err);
          setItemCompletionStatus([]);
        }
      } else {
        setItemCompletionStatus([]);
      }
    };

    fetchItemCompletionStatus();
  }, [orderId, isOpen]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep("confirm");
      setCustomerName("");
      setCustomerMobile("");
      setCustomerEmail("");
      setSendBillToEmail(false);
      setQrCodeUrl("");
      setMenuSearchQuery("");
      setNewItemsBuffer([]);
      setIsSaving(false);
      setDetectedReservation(null);
      // Reset discount state to prevent stale values persisting between orders
      setManualDiscountPercent(0);
      setManualDiscountCash(0);
      setAppliedPromotion(null);
      setPromotionCode("");
      setItemCompletionStatus([]);
    }
  }, [isOpen]);

  const handleEditOrder = () => {
    setCurrentStep("edit");
    setNewItemsBuffer([]);
    setMenuSearchQuery("");
  };

  const handleDeleteOrder = async () => {
    // This is now triggered after confirming from the AlertDialog
    setShowDeleteConfirm(false);

    try {
      if (orderId) {
        // First, get the order_id from kitchen_orders to delete related order
        const { data: kitchenOrder } = await supabase
          .from("kitchen_orders")
          .select("order_id")
          .eq("id", orderId)
          .single();

        // Delete from kitchen_orders table
        const { error: kitchenError } = await supabase
          .from("kitchen_orders")
          .delete()
          .eq("id", orderId);

        if (kitchenError) throw kitchenError;

        // Delete corresponding order from orders table if it exists
        if (kitchenOrder?.order_id) {
          const { error: orderError } = await supabase
            .from("orders")
            .delete()
            .eq("id", kitchenOrder.order_id);

          if (orderError)
            console.error("Error deleting from orders table:", orderError);
        }

        // Invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] });
      }

      toast({
        title: "Order Deleted Successfully",
        description: "The order has been permanently deleted.",
      });

      onClose();
      onSuccess(); // Refresh the order list
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddMenuItem = (item: any) => {
    // Check if item already exists in buffer
    const existingIndex = newItemsBuffer.findIndex(
      (bufferItem) => bufferItem.name === item.name
    );

    if (existingIndex >= 0) {
      // Increase quantity if item exists
      setNewItemsBuffer((prev) =>
        prev.map((bufferItem, idx) =>
          idx === existingIndex
            ? { ...bufferItem, quantity: bufferItem.quantity + 1 }
            : bufferItem
        )
      );
      toast({
        title: "Quantity Increased",
        description: `${item.name} quantity increased to ${
          newItemsBuffer[existingIndex].quantity + 1
        }.`,
      });
    } else {
      // Add new item
      const newItem: OrderItem = {
        id: `new-${Date.now()}-${Math.random()}`,
        menuItemId: item.id, // Will be undefined for custom items if we reuse this logic? No, item.id is from menu.
        name: item.name,
        price: item.price,
        quantity: 1,
        modifiers: [],
      };
      setNewItemsBuffer((prev) => [...prev, newItem]);
      toast({
        title: "Item Added",
        description: `${item.name} added to new items list.`,
      });
    }
  };

  const handleAddCustomItem = (item: CustomItem) => {
    const newItem: OrderItem = {
      id: `custom-${Date.now()}-${Math.random()}`,
      // No menuItemId for custom items
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      modifiers: [],
    };

    setNewItemsBuffer((prev) => [...prev, newItem]);
    toast({
      title: "Custom Item Added",
      description: `${item.quantity}x ${item.name} added to order.`,
    });
  };

  const handleRemoveNewItem = (itemId: string) => {
    setNewItemsBuffer((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleRemoveExistingItem = async (itemIndex: number) => {
    if (!orderId) return;

    try {
      // Get current kitchen order including order_id for syncing
      const { data: currentOrder, error: fetchError } = await supabase
        .from("kitchen_orders")
        .select("items, order_id")
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;

      // Remove the item at the specified index
      const updatedItems = [...(currentOrder?.items || [])];
      updatedItems.splice(itemIndex, 1);

      // Calculate new total from remaining items
      const newTotal = updatedItems.reduce((sum, item: any) => {
        const price = item.price || 0;
        const quantity = item.quantity || 1;
        return sum + price * quantity;
      }, 0);

      // Update the kitchen_orders table
      const { error: updateError } = await supabase
        .from("kitchen_orders")
        .update({
          items: updatedItems,
          status: "new",
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Also update the linked orders table to keep Orders Management in sync
      if (currentOrder?.order_id) {
        // Format items for orders table (string array format: "2x Item Name @price")
        const ordersTableItems = updatedItems.map((item: any) => {
          const itemName = item.name || "Unknown Item";
          const itemQty = item.quantity || 1;
          const itemPrice = item.price || 0;
          return `${itemQty}x ${itemName} @${itemPrice}`;
        });

        const { error: ordersUpdateError } = await supabase
          .from("orders")
          .update({
            items: ordersTableItems,
            total: newTotal,
          })
          .eq("id", currentOrder.order_id);

        if (ordersUpdateError) {
          console.error("Error updating orders table:", ordersUpdateError);
          // Don't fail the whole operation - kitchen order is already updated
        }
      }

      toast({
        title: "Item Removed",
        description: "Item has been removed from the order.",
      });

      // Refresh the order data immediately
      if (onOrderUpdated) {
        onOrderUpdated();
      }
      onSuccess();
    } catch (error) {
      console.error("Error removing item:", error);
      toast({
        title: "Failed to Remove Item",
        description: "There was an error removing the item.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateNewItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveNewItem(itemId);
      return;
    }
    setNewItemsBuffer((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleUpdateExistingItemQuantity = async (
    itemIndex: number,
    newQuantity: number
  ) => {
    if (!orderId) return;

    if (newQuantity < 1) {
      // If quantity drops to 0 or less, confirm removal?
      // For now, let's just trigger the remove flow which is safer
      handleRemoveExistingItem(itemIndex);
      return;
    }

    try {
      // Get current kitchen order
      const { data: currentOrder, error: fetchError } = await supabase
        .from("kitchen_orders")
        .select("items, order_id")
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;

      // Deep copy items
      const updatedItems = [...(currentOrder?.items || [])];

      // Update quantity of specific item
      // Need to handle string format vs object format
      const targetItem = updatedItems[itemIndex];
      if (typeof targetItem === "string") {
        // Parse "1x Name" if needed, but ideally we should normalize first.
        // If it's a string, we might need to parse it to update quantity.
        const match = targetItem.match(/^(\d+)x\s+(.+)$/);
        if (match) {
          const name = match[2];
          updatedItems[itemIndex] = { name, quantity: newQuantity, price: 0 };
        } else {
          // Fallback if parsing fails, assume name only
          updatedItems[itemIndex] = {
            name: targetItem,
            quantity: newQuantity,
            price: 0,
          };
        }
      } else {
        // It's an object
        updatedItems[itemIndex] = { ...targetItem, quantity: newQuantity };
      }

      // Calculate new total
      const newTotal = updatedItems.reduce((sum, item: any) => {
        const price = item.price || 0;
        const quantity = item.quantity || 1;
        return sum + price * quantity;
      }, 0);

      // Update kitchen_orders
      const { error: updateError } = await supabase
        .from("kitchen_orders")
        .update({
          items: updatedItems,
          // CRITICAL: Reset status to 'new' so kitchen sees the change
          status: "new",
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Update linked orders table
      if (currentOrder?.order_id) {
        const ordersTableItems = updatedItems.map((item: any) => {
          const itemName = item.name || "Unknown Item";
          const itemQty = item.quantity || 1;
          const itemPrice = item.price || 0;
          return `${itemQty}x ${itemName} @${itemPrice}`;
        });

        const { error: ordersUpdateError } = await supabase
          .from("orders")
          .update({
            items: ordersTableItems,
            total: newTotal,
          })
          .eq("id", currentOrder.order_id);

        if (ordersUpdateError) {
          console.error("Error updating orders table:", ordersUpdateError);
        }
      }

      toast({
        title: "Order Updated",
        description: `Item quantity updated to ${newQuantity}.`,
      });

      if (onOrderUpdated) {
        onOrderUpdated();
      } else {
        onSuccess();
      }
    } catch (error) {
      console.error("Error updating item quantity:", error);
      toast({
        title: "Update Failed",
        description: "Could not update item quantity.",
        variant: "destructive",
      });
    }
  };

  const handleSaveNewItems = async () => {
    if (newItemsBuffer.length === 0) {
      toast({
        title: "No Items to Add",
        description: "Please add at least one item from the menu.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!orderId) {
        toast({
          title: "Error",
          description: "Order ID not found. Cannot add items.",
          variant: "destructive",
        });
        return;
      }

      // Get restaurant ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.restaurant_id) throw new Error("Restaurant not found");

      // Get current kitchen order to update items and get linked order_id
      const { data: currentOrder, error: fetchError } = await supabase
        .from("kitchen_orders")
        .select("items, order_id")
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;

      // Normalize old items to ensure they are objects
      const normalizedOldItems = (currentOrder?.items || []).map((item) => {
        if (typeof item === "string") {
          // Parse string format "1x Item Name" to object
          const match = item.match(/^(\d+)x\s+(.+)$/);
          if (match) {
            return { name: match[2], quantity: parseInt(match[1]), price: 0 };
          }
          return { name: item, quantity: 1, price: 0 };
        }
        return item;
      });

      // Convert newItemsBuffer to proper format
      const formattedNewItems = newItemsBuffer.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      // Combine old items with new items as objects
      const combinedItems = [...normalizedOldItems, ...formattedNewItems];

      // Calculate new total from combined items
      const newTotal = combinedItems.reduce((sum, item: any) => {
        const price = item.price || 0;
        const quantity = item.quantity || 1;
        return sum + price * quantity;
      }, 0);

      // Update the kitchen_orders table
      const { error: updateError } = await supabase
        .from("kitchen_orders")
        .update({
          items: combinedItems,
          status: "new",
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Also update the linked orders table to keep Orders Management in sync
      if (currentOrder?.order_id) {
        // Format items for orders table (string array format: "2x Item Name @price")
        const ordersTableItems = combinedItems.map((item: any) => {
          const itemName = item.name || "Unknown Item";
          const itemQty = item.quantity || 1;
          const itemPrice = item.price || 0;
          return `${itemQty}x ${itemName} @${itemPrice}`;
        });

        const { error: ordersUpdateError } = await supabase
          .from("orders")
          .update({
            items: ordersTableItems,
            total: newTotal,
          })
          .eq("id", currentOrder.order_id);

        if (ordersUpdateError) {
          console.error("Error updating orders table:", ordersUpdateError);
          // Don't fail the whole operation - kitchen order is already updated
        }
      }

      toast({
        title: "Items Added Successfully",
        description: `${newItemsBuffer.length} new item(s) have been sent to the kitchen.`,
      });

      // Update the local orderItems and go back to confirm step
      setCurrentStep("confirm");
      setNewItemsBuffer([]);

      // Refresh order data to show updated items immediately
      if (onOrderUpdated) {
        onOrderUpdated();
      }
      onSuccess(); // Refresh the order list
    } catch (error) {
      console.error("Error adding items to order:", error);
      toast({
        title: "Failed to Add Items",
        description: "There was an error adding items to the order.",
        variant: "destructive",
      });
    }
  };

  // Filter menu items based on search
  const filteredMenuItems = menuItems.filter(
    (item) =>
      item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
      (item.category &&
        item.category.toLowerCase().includes(menuSearchQuery.toLowerCase()))
  );

  const saveCustomerDetails = async (): Promise<boolean> => {
    // If checkbox not checked, return success
    if (!sendBillToEmail) {
      return true;
    }

    if (!orderId) {
      console.error("❌ No orderId provided");
      toast({
        title: "Error",
        description: "Order ID not found. Cannot save customer details.",
        variant: "destructive",
      });
      return false;
    }

    // Validate inputs
    if (!customerName.trim()) {
      toast({
        title: "Customer Name Required",
        description: "Please enter customer name to send bill.",
        variant: "destructive",
      });
      return false;
    }

    // Email is optional - only validate format if provided
    const emailStr = String(customerEmail).trim();
    if (emailStr) {
      // Validate email format only if email is provided
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return false;
      }
    }

    setIsSaving(true);

    try {
      // Try to find the order_id from kitchen_orders
      const { data: kitchenOrder, error: kitchenError } = await supabase
        .from("kitchen_orders")
        .select("order_id")
        .eq("id", orderId)
        .maybeSingle();

      let targetOrderId = null;

      if (kitchenOrder?.order_id) {
        // Found a linked order_id
        targetOrderId = kitchenOrder.order_id;
      } else {
        // Maybe orderId is directly the orders table ID

        const { data: directOrder, error: directError } = await supabase
          .from("orders")
          .select("id")
          .eq("id", orderId)
          .maybeSingle();

        if (directOrder) {
          targetOrderId = orderId;
        } else {
          console.error("❌ No order found with ID:", orderId, { directError });
        }
      }

      if (targetOrderId) {
        // Use snake_case column names (standardized)
        const { data: updateData, error: updateError } = await supabase
          .from("orders")
          .update({
            customer_name: customerName.trim(),
            customer_phone: String(customerMobile).trim(),
          })
          .eq("id", targetOrderId)
          .select();

        if (updateError) {
          console.error("❌ Update error:", updateError);
          throw updateError;
        }

        toast({
          title: "Details Saved",
          description: "Customer details saved successfully.",
        });
      } else {
        console.warn(
          "⚠️ No linked order found. Saving name on kitchen order and proceeding."
        );
        // Fallback: store the customer name on the kitchen order so it is visible to staff
        try {
          const { error: koUpdateError } = await supabase
            .from("kitchen_orders")
            .update({
              customer_name: customerName.trim(),
              customer_phone: customerMobile.trim(),
            })
            .eq("id", orderId);

          if (koUpdateError) {
            console.error(
              "⚠️ Failed to save on kitchen_orders:",
              koUpdateError
            );
            toast({
              title: "Proceeding without DB save",
              description:
                "Could not link order yet. We'll still proceed and include details on the bill.",
            });
          } else {
            toast({
              title: "Details Saved (Temporary)",
              description:
                "Name saved for this order. It will be attached when the order is created.",
            });
          }
        } catch (e) {
          console.error("⚠️ Kitchen order fallback failed:", e);
        }
        setIsSaving(false);
        return true;
      }

      setIsSaving(false);
      return true;
    } catch (error) {
      console.error("❌ Error saving customer details:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save customer details. Please try again.",
        variant: "destructive",
      });
      setIsSaving(false);
      return false;
    }
  };

  // Email bill sending function (using Resend)
  const sendBillViaEmail = async () => {
    console.log("📧 sendBillViaEmail called", {
      sendBillToEmail,
      customerEmail,
    });
    if (!sendBillToEmail || !customerEmail) {
      console.log("⚠️ sendBillViaEmail skipped - missing data", {
        sendBillToEmail,
        customerEmail,
      });
      return;
    }

    try {
      console.log("📧 restaurantInfo data:", restaurantInfo);
      const restaurantId =
        restaurantInfo?.restaurantId || restaurantInfo?.id || "";

      const { data, error } = await supabase.functions.invoke(
        "send-email-bill",
        {
          body: {
            orderId: orderId || "",
            email: customerEmail,
            customerName: customerName || "Valued Customer",
            restaurantName: restaurantInfo?.name || "",
            restaurantId: restaurantId, // Pass ID so edge function can fetch name if needed
            restaurantAddress: restaurantInfo?.address || "",
            restaurantPhone: restaurantInfo?.phone || "",
            total: total,
            items: orderItems.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
            tableNumber: tableNumber || "POS",
            orderDate: new Date().toLocaleString("en-IN"),
            discount: totalDiscountAmount > 0 ? totalDiscountAmount : undefined,
            promotionName: appliedPromotion?.name || undefined,
            includeEnrollment: true, // Enable loyalty program enrollment invitation
          },
        }
      );

      console.log("📧 Edge function response:", { data, error });
      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Bill Sent Successfully",
          description: `Bill has been sent to ${customerEmail} via Email.`,
        });
      } else {
        toast({
          title: "Failed to Send Bill",
          description: data?.error || "There was an error sending the bill.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending Email bill:", error);
      toast({
        title: "Email Send Failed",
        description: "Failed to send bill via Email. Please try again.",
        variant: "destructive",
      });
    }
  };

  // WhatsApp bill sending function (using WhatsApp Cloud API)
  const sendBillViaWhatsApp = async () => {
    console.log("📱 sendBillViaWhatsApp called", {
      sendBillToMobile,
      customerMobile,
    });
    if (!sendBillToMobile || !customerMobile) {
      console.log("⚠️ sendBillViaWhatsApp skipped - missing data", {
        sendBillToMobile,
        customerMobile,
      });
      return;
    }

    try {
      const restaurantId =
        restaurantInfo?.restaurantId || restaurantInfo?.id || "";

      const { data, error } = await supabase.functions.invoke(
        "send-whatsapp-cloud",
        {
          body: {
            phone: customerMobile,
            orderId: orderId || "",
            customerName: customerName || "Valued Customer",
            restaurantName: restaurantInfo?.name || "Restaurant",
            restaurantId: restaurantId,
            total: total,
            items: orderItems.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
            tableNumber: tableNumber || "POS",
            orderDate: new Date().toLocaleString("en-IN"),
            messageType: "bill",
          },
        }
      );

      console.log("📱 WhatsApp Edge function response:", { data, error });
      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Bill Sent via WhatsApp",
          description: `Bill has been sent to ${customerMobile} via WhatsApp.`,
        });
      } else {
        toast({
          title: "Failed to Send WhatsApp Bill",
          description: data?.error || "There was an error sending the bill.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending WhatsApp bill:", error);
      toast({
        title: "WhatsApp Send Failed",
        description: "Failed to send bill via WhatsApp. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrintBill = async (navigateAfter: boolean = false) => {
    // Save customer details first
    const saved = await saveCustomerDetails();
    if (!saved) {
      return;
    }

    try {
      const doc = new jsPDF({
        format: [58, 297], // 58mm thermal printer width
        unit: "mm",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 0.5; // Reduced side margins for better readability

      // Use Rs. for PDF since Helvetica doesn't support ₹ symbol
      const printSymbol = currencySymbol === "₹" ? "Rs." : currencySymbol;
      const contentWidth = pageWidth - margin * 2;
      let yPos = 5; // Increased top margin to prevent cutting

      // Restaurant Header - Larger and prominent
      doc.setFontSize(16); // Increased from 14
      doc.setFont("helvetica", "bold");
      const restaurantName =
        restaurantInfo?.name || restaurantInfo?.restaurantName || "Restaurant";
      const nameLines = doc.splitTextToSize(restaurantName, contentWidth);
      doc.text(nameLines, pageWidth / 2, yPos, { align: "center" });
      yPos += nameLines.length * 5 + 2;

      doc.setFontSize(10); // Increased from 9
      doc.setFont("helvetica", "normal");
      if (restaurantInfo?.address) {
        const addressLines = doc.splitTextToSize(
          restaurantInfo.address,
          contentWidth
        );
        doc.text(addressLines, pageWidth / 2, yPos, { align: "center" });
        yPos += addressLines.length * 4;
      }
      if (restaurantInfo?.phone) {
        doc.text(`Ph: ${restaurantInfo.phone}`, pageWidth / 2, yPos, {
          align: "center",
        });
        yPos += 4;
      }
      if (restaurantInfo?.gstin) {
        doc.text(`GSTIN: ${restaurantInfo.gstin}`, pageWidth / 2, yPos, {
          align: "center",
        });
        yPos += 4;
      }

      // // Dashed line
      // yPos += 1;
      // for (let i = margin; i < pageWidth - margin; i += 2) {
      //   doc.line(i, yPos, i + 1, yPos);
      // }
      // yPos += 4;

      // Invoice Title - Only show if GSTIN is present
      if (restaurantInfo?.gstin) {
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("TAX INVOICE", pageWidth / 2, yPos, { align: "center" });
        yPos += 4;
      }

      // Dashed line
      for (let i = margin; i < pageWidth - margin; i += 2) {
        doc.line(i, yPos, i + 1, yPos);
      }
      yPos += 4;

      // Bill details - increased font size
      doc.setFontSize(10); // Increased from 9
      doc.setFont("helvetica", "normal");
      const billNumber = `#${Date.now().toString().slice(-6)}`;
      const currentDate = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const currentTime = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      doc.text(`Bill#: ${billNumber}`, margin, yPos);
      yPos += 4;

      if (tableNumber) {
        doc.text(`To: ${tableNumber}`, margin, yPos);
      } else if (customerName) {
        doc.text(`To: ${customerName}`, margin, yPos);
      } else {
        doc.text("To: POS Order", margin, yPos);
      }
      yPos += 4;

      doc.text(`Date: ${currentDate}  Time: ${currentTime}`, margin, yPos);
      yPos += 4;

      // Guest details if available
      if (customerName) {
        doc.text(`Guest: ${customerName}`, margin, yPos);
        yPos += 4;
      }
      if (customerMobile) {
        doc.text(`Phone: ${customerMobile}`, margin, yPos);
        yPos += 4;
      }

      // Dashed line
      for (let i = margin; i < pageWidth - margin; i += 2) {
        doc.line(i, yPos, i + 1, yPos);
      }
      yPos += 4;

      // Items header
      doc.setFontSize(11); // Increased from 10
      doc.setFont("helvetica", "bold");
      doc.text("Particulars", pageWidth / 2, yPos, { align: "center" });
      yPos += 4;

      // Column headers - increased font with better spacing
      doc.setFontSize(9.5);
      doc.text("Item", margin, yPos);
      doc.text("Qty", pageWidth - 32, yPos, { align: "right" });
      doc.text("Rate", pageWidth - 18, yPos, { align: "right" });
      doc.text("Amt", pageWidth - margin, yPos, { align: "right" });
      yPos += 1;

      // Line under headers
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 3.5;

      // Items - increased font with better column spacing
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      orderItems.forEach((item, index) => {
        const itemName = doc.splitTextToSize(item.name, 22);
        doc.text(itemName, margin, yPos);
        doc.text(item.quantity.toString(), pageWidth - 32, yPos, {
          align: "right",
        });
        doc.text(item.price.toFixed(0), pageWidth - 18, yPos, {
          align: "right",
        });
        doc.text(
          (item.price * item.quantity).toFixed(0),
          pageWidth - margin,
          yPos,
          { align: "right" }
        );
        yPos += Math.max(itemName.length * 4, 4);
        // Add space between items for better readability
        if (index < orderItems.length - 1) {
          yPos += 2;
        }
      });

      // Dashed line
      yPos += 1;
      for (let i = margin; i < pageWidth - margin; i += 2) {
        doc.line(i, yPos, i + 1, yPos);
      }
      yPos += 4;

      // Totals - increased font
      doc.setFontSize(10); // Increased from 9
      doc.text("Sub Total:", margin, yPos);
      doc.text(subtotal.toFixed(2), pageWidth - margin, yPos, {
        align: "right",
      });
      yPos += 4;

      const cgstRate = 0;
      const sgstRate = 0;
      const cgst = 0;
      const sgst = 0;

      if (cgst > 0 || sgst > 0) {
        doc.text(`CGST @ ${(cgstRate * 100).toFixed(1)}%:`, margin, yPos);
        doc.text(cgst.toFixed(2), pageWidth - margin, yPos, { align: "right" });
        yPos += 4;

        doc.text(`SGST @ ${(sgstRate * 100).toFixed(1)}%:`, margin, yPos);
        doc.text(sgst.toFixed(2), pageWidth - margin, yPos, { align: "right" });
        yPos += 4;
      }

      // Promotion discount if applied
      if (appliedPromotion && promotionDiscountAmount > 0) {
        doc.setFont("helvetica", "normal");
        doc.text(`Promo Discount (${appliedPromotion.name}):`, margin, yPos);
        doc.text(
          `-${promotionDiscountAmount.toFixed(2)}`,
          pageWidth - margin,
          yPos,
          { align: "right" }
        );
        yPos += 4;
        if (appliedPromotion.promotion_code) {
          doc.setFontSize(9);
          doc.text(`Code: ${appliedPromotion.promotion_code}`, margin, yPos);
          yPos += 3.5;
          doc.setFontSize(10);
        }
      }

      // Manual discount if applied
      if (manualDiscountPercent > 0) {
        doc.setFont("helvetica", "normal");
        doc.text(`Discount (${manualDiscountPercent}%):`, margin, yPos);
        doc.text(
          `-${manualDiscountAmount.toFixed(2)}`,
          pageWidth - margin,
          yPos,
          { align: "right" }
        );
        yPos += 4;
      }

      // Total discount
      if (totalDiscountAmount > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Total Discount:", margin, yPos);
        doc.text(
          `-${totalDiscountAmount.toFixed(2)}`,
          pageWidth - margin,
          yPos,
          { align: "right" }
        );
        yPos += 4;
      }

      // Dashed line
      for (let i = margin; i < pageWidth - margin; i += 2) {
        doc.line(i, yPos, i + 1, yPos);
      }
      yPos += 4;

      // Net Amount - larger font
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14); // Increased from 12
      doc.text("Net Amount:", margin, yPos);
      doc.text(`${printSymbol}${total.toFixed(2)}`, pageWidth - margin, yPos, {
        align: "right",
      });
      yPos += 6;

      // Add QR code if UPI is configured and we're in QR step
      if (qrCodeUrl && paymentSettings?.upi_id) {
        for (let i = margin; i < pageWidth - margin; i += 2) {
          doc.line(i, yPos, i + 1, yPos);
        }
        yPos += 3;

        const qrSize = 32; // Slightly larger QR code
        doc.addImage(
          qrCodeUrl,
          "PNG",
          (pageWidth - qrSize) / 2,
          yPos,
          qrSize,
          qrSize
        );
        yPos += qrSize + 3;

        doc.setFontSize(9); // Increased from 8
        doc.setFont("helvetica", "normal");
        doc.text("Scan QR to pay", pageWidth / 2, yPos, { align: "center" });
        yPos += 4;
      }

      // Dashed line
      for (let i = margin; i < pageWidth - margin; i += 2) {
        doc.line(i, yPos, i + 1, yPos);
      }
      yPos += 4;

      // Footer - larger font
      doc.setFontSize(12); // Increased from 10
      doc.setFont("helvetica", "bold");
      doc.text("Thank You!", pageWidth / 2, yPos, { align: "center" });
      yPos += 4;
      doc.setFontSize(10); // Increased from 8
      doc.setFont("helvetica", "normal");
      doc.text("Please visit again", pageWidth / 2, yPos, { align: "center" });

      // Save and print
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl, "_blank");

      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      // Send bill via Email if checkbox is checked
      if (sendBillToEmail && customerEmail) {
        console.log("📧 Sending bill via Email");
        await sendBillViaEmail();
      } else {
        console.log("ℹ️ Skipping Email send", {
          sendBillToEmail,
          customerEmail,
        });
      }

      // Send bill via WhatsApp if checkbox is checked
      if (sendBillToMobile && customerMobile) {
        console.log("📱 Sending bill via WhatsApp");
        await sendBillViaWhatsApp();
      } else {
        console.log("ℹ️ Skipping WhatsApp send", {
          sendBillToMobile,
          customerMobile,
        });
      }

      // Build toast description based on what was sent
      let toastDescription = "The bill has been generated and sent to printer.";
      if (sendBillToEmail && sendBillToMobile) {
        toastDescription = "Bill sent to customer's email and WhatsApp.";
      } else if (sendBillToEmail) {
        toastDescription =
          "Bill has been generated and sent to customer's email.";
      } else if (sendBillToMobile) {
        toastDescription =
          "Bill has been generated and sent to customer's WhatsApp.";
      }

      toast({
        title: "Bill Generated",
        description: toastDescription,
      });

      if (navigateAfter) {
        setCurrentStep("method");
      }
    } catch (error) {
      console.error("Error generating bill:", error);
      toast({
        title: "Print Error",
        description: "Failed to generate bill. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleApplyPromotion = async (passedCode?: string) => {
    const codeToValidate = (passedCode ?? promotionCode).trim();
    if (!codeToValidate) {
      toast({
        title: "Enter Promotion Code",
        description: "Please enter a promotion code to apply.",
        variant: "destructive",
      });
      return;
    }

    try {
      const restaurantIdToUse =
        restaurantInfo?.restaurantId || restaurantInfo?.id;

      // Call backend validation function with the exact code we want to validate
      const { data, error } = await supabase.functions.invoke(
        "validate-promo-code",
        {
          body: {
            code: codeToValidate,
            orderSubtotal: subtotal,
            restaurantId: restaurantIdToUse,
          },
        }
      );

      if (error) throw error;

      if (data.valid && data.promotion) {
        setPromotionCode(codeToValidate);
        setAppliedPromotion(data.promotion);
        toast({
          title: "Promotion Applied!",
          description: `${data.promotion.name} - ${
            data.promotion.discount_percentage
              ? `${data.promotion.discount_percentage}% off`
              : `${currencySymbol}${data.promotion.discount_amount} off`
          }`,
        });
      } else {
        toast({
          title: "Invalid Code",
          description:
            data.error ||
            "The promotion code you entered is not valid or has expired.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error validating promo code:", error);
      toast({
        title: "Validation Error",
        description: "Failed to validate promotion code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemovePromotion = () => {
    setAppliedPromotion(null);
    setPromotionCode("");
    toast({
      title: "Promotion Removed",
      description: "The promotion code has been removed from this order.",
    });
  };

  const checkForActiveReservation = async () => {
    // Sanitize mobile number: extract last 10 digits
    const mobileStr = String(customerMobile || "").replace(/\D/g, "");
    const sanitizedMobile = mobileStr.slice(-10);

    // Only check if we have exactly 10 digits after sanitization
    if (!sanitizedMobile || sanitizedMobile.length !== 10) {
      console.log("❌ Invalid mobile number for reservation check:", {
        original: customerMobile,
        sanitized: sanitizedMobile,
      });
      setDetectedReservation(null);
      return;
    }

    try {
      console.log(
        "🔍 Checking for active reservation with sanitized mobile:",
        sanitizedMobile
      );

      const { data, error } = await supabase.functions.invoke(
        "find-active-reservation",
        {
          body: { mobileNumber: sanitizedMobile },
        }
      );

      if (error) {
        console.error("❌ Error checking reservation:", error);
        return;
      }

      console.log("📊 Reservation check result:", data);

      if (data?.found) {
        console.log("✅ Found active reservation:", data);
        setDetectedReservation({
          reservation_id: data.reservation_id,
          room_id: data.room_id,
          roomName: data.roomName,
          customerName: data.customerName,
        });

        toast({
          title: "Guest Detected!",
          description: `This customer has an active reservation in ${data.roomName}`,
        });
      } else {
        console.log(
          "ℹ️ No active reservation found for mobile:",
          sanitizedMobile
        );
        setDetectedReservation(null);
      }
    } catch (error) {
      console.error("❌ Error checking reservation:", error);
      setDetectedReservation(null);
    }
  };

  const handleMethodSelect = (method: string) => {
    if (method === "upi") {
      if (!paymentSettings?.upi_id) {
        toast({
          title: "UPI Not Configured",
          description:
            "Please configure UPI settings in the Payment Settings tab first.",
          variant: "destructive",
        });
        return;
      }
      setCurrentStep("qr");
    } else if (method === "room") {
      // Handle charge to room
      handleChargeToRoom();
    } else {
      // For cash/card, mark as paid immediately
      handleMarkAsPaid(method);
    }
  };

  const handleChargeToRoom = async () => {
    if (!detectedReservation) {
      toast({
        title: "No Reservation Found",
        description:
          "Unable to charge to room. No active reservation detected.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update order with reservation_id and payment status
      if (orderId) {
        // First get the order_id from kitchen_orders
        const { data: kitchenOrder } = await supabase
          .from("kitchen_orders")
          .select("order_id")
          .eq("id", orderId)
          .single();

        if (kitchenOrder?.order_id) {
          // Update the order with reservation link, payment status, and discount info
          const { error: updateError } = await supabase
            .from("orders")
            .update({
              reservation_id: detectedReservation.reservation_id,
              payment_status: "Pending - Room Charge",
              status: "completed",
              total: total, // Save final amount after discount
              discount_amount: totalDiscountAmount,
              discount_percentage:
                manualDiscountPercent > 0
                  ? manualDiscountPercent
                  : appliedPromotion?.discount_percentage || 0,
            })
            .eq("id", kitchenOrder.order_id);

          if (updateError) throw updateError;
        }

        // Update kitchen order status
        const { error: kitchenError } = await supabase
          .from("kitchen_orders")
          .update({ status: "completed" })
          .eq("id", orderId);

        if (kitchenError) throw kitchenError;

        // Create room food order entry
        const { error: roomOrderError } = await supabase
          .from("room_food_orders")
          .insert({
            room_id: detectedReservation.room_id,
            order_id: kitchenOrder?.order_id,
            total: total,
            status: "pending",
          });

        if (roomOrderError) {
          console.error("Error creating room food order:", roomOrderError);
          // Don't fail the whole operation if this fails
        }
      }

      toast({
        title: "Charged to Room",
        description: `Order charged to ${detectedReservation.roomName}. Will be settled at checkout.`,
      });

      setCurrentStep("success");

      // Auto-close after 2 seconds
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error charging to room:", error);
      toast({
        title: "Charge Failed",
        description:
          "Failed to charge order to room. Please try another payment method.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsPaid = async (paymentMethod: string = "upi") => {
    setIsProcessingPayment(true);
    try {
      // Here you would integrate with your payment verification system
      // For now, we'll simulate a successful payment

      await new Promise((resolve) => setTimeout(resolve, 500));

      const restaurantIdToUse =
        restaurantInfo?.restaurantId || restaurantInfo?.id;

      // Get current user for staff_id
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Update order status to completed in database if orderId is provided
      if (orderId) {
        // First get the kitchen order to find linked order_id
        const { data: kitchenOrder } = await supabase
          .from("kitchen_orders")
          .select("order_id")
          .eq("id", orderId)
          .single();

        // Update kitchen order status
        const { error } = await supabase
          .from("kitchen_orders")
          .update({ status: "completed" })
          .eq("id", orderId);

        if (error) {
          console.error("Error updating order status:", error);
          toast({
            title: "Warning",
            description: "Payment received but order status update failed.",
            variant: "destructive",
          });
        }

        // Update the linked order with payment status and discount info
        if (kitchenOrder?.order_id) {
          const { error: orderError } = await supabase
            .from("orders")
            .update({
              payment_status: "paid",
              status: "completed",
              total: total, // Save final amount after discount
              discount_amount: totalDiscountAmount,
              discount_percentage:
                manualDiscountPercent > 0
                  ? manualDiscountPercent
                  : appliedPromotion?.discount_percentage || 0,
            })
            .eq("id", kitchenOrder.order_id);

          if (orderError) {
            console.error("Error updating order payment status:", orderError);
          }
        } else {
          // No linked order_id - create a new order record in the orders table
          // This ensures QSR orders appear in Order Management
          try {
            // Format items for the orders table (string array format)
            const formattedItems = orderItems.map((item) => {
              return `${item.quantity}x ${item.name} @${item.price}`;
            });

            const { data: newOrder, error: insertError } = await supabase
              .from("orders")
              .insert({
                restaurant_id: restaurantIdToUse,
                customer_name: tableNumber || "QSR-Order",
                items: formattedItems,
                total: total,
                status: "completed",
                payment_status: "paid",
                source: "qsr",
                order_type: "dine-in",
                discount_amount: totalDiscountAmount,
                discount_percentage:
                  manualDiscountPercent > 0
                    ? manualDiscountPercent
                    : appliedPromotion?.discount_percentage || 0,
              })
              .select()
              .single();

            if (insertError) {
              console.error("Error creating order record:", insertError);
            } else if (newOrder) {
              // Link the new order back to the kitchen_order
              await supabase
                .from("kitchen_orders")
                .update({ order_id: newOrder.id })
                .eq("id", orderId);
            }
          } catch (createOrderError) {
            console.error("Error creating order for QSR:", createOrderError);
            // Don't fail the payment if order creation fails
          }
        }

        // Log promotion usage if promotion was applied
        if (appliedPromotion && restaurantIdToUse) {
          try {
            await supabase.functions.invoke("log-promotion-usage", {
              body: {
                orderId: orderId,
                promotionId: appliedPromotion.id,
                restaurantId: restaurantIdToUse,
                customerName: customerName || "Walk-in Customer",
                customerPhone: customerMobile || null,
                orderTotal: total,
                discountAmount: promotionDiscountAmount,
              },
            });
          } catch (promoError) {
            console.error("Error logging promotion usage:", promoError);
            // Don't fail the payment if logging fails
          }
        }

        // Log transaction to pos_transactions table
        try {
          await supabase.from("pos_transactions").insert({
            restaurant_id: restaurantIdToUse,
            order_id: kitchenOrder?.order_id || null,
            kitchen_order_id: orderId,
            amount: total,
            payment_method: paymentMethod,
            status: "completed",
            customer_name: customerName || null,
            customer_phone: customerMobile || null,
            staff_id: user?.id || null,
            discount_amount: totalDiscountAmount,
            promotion_id: appliedPromotion?.id || null,
          });
        } catch (transactionError) {
          console.error("Error logging transaction:", transactionError);
          // Don't fail the payment if transaction logging fails
        }
      }

      setCurrentStep("success");

      toast({
        title: "Payment Successful",
        description: `Order payment of ₹${total.toFixed(
          2
        )} received via ${paymentMethod}.`,
      });

      // Auto-close after 2 seconds
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "There was an error processing the payment.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleItemToggle = async (index: number) => {
    if (!orderId) return;

    // Create a copy of current status or initialize new array
    const newCompletionStatus = [
      ...(itemCompletionStatus || new Array(orderItems.length).fill(false)),
    ];

    // Ensure array is long enough
    while (newCompletionStatus.length <= index) {
      newCompletionStatus.push(false);
    }

    // Toggle status
    newCompletionStatus[index] = !newCompletionStatus[index];

    try {
      const { error } = await supabase
        .from("kitchen_orders")
        .update({ item_completion_status: newCompletionStatus })
        .eq("id", orderId);

      if (error) throw error;

      // Update local state (like KDS pattern)
      setItemCompletionStatus(newCompletionStatus);
    } catch (error) {
      console.error("Error toggling item status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update item status",
      });
    }
  };

  const renderConfirmStep = () => (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Vibrant Header - Full Width */}
      <div className="text-center py-4 px-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-sm">
          Confirm Order
        </h2>
        <p className="text-white/80 text-sm">
          Review the details for{" "}
          <span className="font-semibold text-white">
            {tableNumber ? `Table ${tableNumber}` : "POS Order"}
          </span>
        </p>
      </div>

      {/* Two-Column Layout */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* LEFT COLUMN - Order Items & Totals */}
        <div className="p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50 border-r border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[60vh]">
          {/* Order Items Card */}
          <Card className="p-0 overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-slate-100 to-gray-50 dark:from-gray-800 dark:to-gray-750 px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse"></div>
                  Order Items
                </span>
                <span className="text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2.5 py-1 rounded-full font-medium">
                  {orderItems.length} item{orderItems.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
              {orderItems.map((item, idx) => {
                const isWeightBased =
                  item.pricingType && item.pricingType !== "fixed";
                const itemTotal =
                  item.calculatedPrice ?? item.price * item.quantity;
                const isCompleted = itemCompletionStatus[idx] === true;

                return (
                  <div
                    key={idx}
                    onClick={() => handleItemToggle(idx)}
                    className={`flex justify-between items-center cursor-pointer transition-all duration-200 p-3 rounded-xl group ${
                      isCompleted
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 border border-green-200 dark:border-green-700"
                        : "hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/20 dark:hover:to-purple-900/20 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Completion indicator */}
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          isCompleted
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                            : "border-2 border-gray-300 dark:border-gray-600 group-hover:border-indigo-400"
                        }`}
                      >
                        {isCompleted && <span className="text-xs">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`font-medium block truncate ${
                            isCompleted
                              ? "line-through text-gray-400 dark:text-gray-500"
                              : "text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {isWeightBased && item.actualQuantity ? (
                            <>
                              {item.actualQuantity} {item.unit} {item.name}
                            </>
                          ) : (
                            <>
                              <span className="text-indigo-600 dark:text-indigo-400">
                                {item.quantity}x
                              </span>{" "}
                              {item.name}
                            </>
                          )}
                        </span>
                        {item.isCustomExtra && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full ml-2">
                            Custom
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isCompleted && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                          Ready
                        </span>
                      )}
                      <span
                        className={`font-bold ${
                          isCompleted
                            ? "line-through text-gray-400 dark:text-gray-500"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {currencySymbol}
                        {itemTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals Section */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-4 mt-4 border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Subtotal</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {currencySymbol}
                  {subtotal.toFixed(2)}
                </span>
              </div>

              {appliedPromotion && promotionDiscountAmount > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Promo Discount ({appliedPromotion.name})
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    -{currencySymbol}
                    {promotionDiscountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {manualDiscountPercent > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Discount ({manualDiscountPercent}%)
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    -{currencySymbol}
                    {manualDiscountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {totalDiscountAmount > 0 && (
                <div className="flex justify-between text-sm font-semibold mb-3">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Total Discount
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    -{currencySymbol}
                    {totalDiscountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-800 dark:text-white">
                    Total Due
                  </span>
                  <span className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {currencySymbol}
                    {total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN - Payment Controls */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh] bg-white dark:bg-gray-900">
          {/* Promotion Code Section */}
          <Card className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-700">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Apply Promotion</h3>

              {!appliedPromotion ? (
                <div className="space-y-3">
                  <Label htmlFor="promo-select" className="text-xs">
                    Select or Enter Promotion Code
                  </Label>
                  <Select
                    value={promotionCode}
                    onValueChange={(value) => {
                      setPromotionCode(value);
                      if (value && value !== "manual") {
                        // Auto-apply when selecting from dropdown using the selected value directly
                        handleApplyPromotion(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a promotion code" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {activePromotions.length > 0 ? (
                        <>
                          {activePromotions.map((promo) => (
                            <SelectItem
                              key={promo.id}
                              value={promo.promotion_code || ""}
                            >
                              <div className="flex items-center justify-between w-full gap-3 pr-2">
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs">
                                      {promo.promotion_code}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {promo.name}
                                    </span>
                                  </div>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 text-xs whitespace-nowrap"
                                >
                                  {promo.discount_percentage
                                    ? `${promo.discount_percentage}% off`
                                    : `₹${promo.discount_amount} off`}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                          <Separator className="my-1" />
                          <SelectItem value="manual">
                            ✏️ Enter code manually...
                          </SelectItem>
                        </>
                      ) : (
                        <SelectItem value="manual">
                          Enter code manually...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  {/* Manual entry field - show when "manual" is selected or no promotions */}
                  {(promotionCode === "manual" ||
                    activePromotions.length === 0) && (
                    <div className="flex items-center gap-2">
                      <Input
                        value={promotionCode === "manual" ? "" : promotionCode}
                        onChange={(e) =>
                          setPromotionCode(e.target.value.toUpperCase())
                        }
                        placeholder="Enter promotion code"
                        className="flex-1"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleApplyPromotion();
                          }
                        }}
                      />
                      <Button onClick={() => handleApplyPromotion()} size="sm">
                        Apply
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="default" className="bg-green-600">
                          {appliedPromotion.code}
                        </Badge>
                        <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                          {appliedPromotion.name}
                        </span>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-400 dark:text-green-400">
                        Discount: {currencySymbol}
                        {promotionDiscountAmount.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      onClick={handleRemovePromotion}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Manual Discount Section */}
          <Card className="p-4 bg-background">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Percentage Discount */}
                <div>
                  <label className="text-sm font-medium">Discount (%)</label>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number"
                      placeholder="0"
                      min="0"
                      max="100"
                      value={manualDiscountPercent || ""}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        if (value >= 0 && value <= 100) {
                          setManualDiscountPercent(value);
                        }
                      }}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                {/* Cash Discount */}
                <div>
                  <label className="text-sm font-medium">Cash Discount</label>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {currencySymbol}
                    </span>
                    <Input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={manualDiscountCash || ""}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        if (value >= 0 && value <= subtotal) {
                          setManualDiscountCash(value);
                        }
                      }}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Clear button and discount summary */}
              {(manualDiscountPercent > 0 || manualDiscountCash > 0) && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                    ✓ Discount applied - Save {currencySymbol}
                    {manualDiscountAmount.toFixed(2)}
                    {manualDiscountPercent > 0 && manualDiscountCash > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({manualDiscountPercent}% + {currencySymbol}
                        {manualDiscountCash})
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      setManualDiscountPercent(0);
                      setManualDiscountCash(0);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleEditOrder}
              className="w-full"
            >
              <Receipt className="w-4 h-4 mr-2" />
              Edit Order
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePrintBill(true)}
              className="w-full"
              disabled={isSaving}
            >
              <Printer className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Print Bill"}
            </Button>
          </div>

          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Order
          </Button>

          {/* Delete Confirmation Dialog */}
          <AlertDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Order</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this order permanently? This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteOrder}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Send Bill via Email Checkbox and Inputs */}
          <Card className="p-4 bg-muted/30 border-2 border-primary/20">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="send-bill-checkbox"
                  checked={sendBillToEmail}
                  onChange={(e) => setSendBillToEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label
                  htmlFor="send-bill-checkbox"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  📧 Send bill to customer
                </label>
              </div>

              {sendBillToEmail && (
                <div className="space-y-3 animate-in slide-in-from-top-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Enter customer name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Mobile Number{" "}
                      <span className="text-muted-foreground text-xs">
                        (for room detection)
                      </span>
                    </label>
                    <Input
                      type="tel"
                      placeholder="Enter mobile number"
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value)}
                      onBlur={() => {
                        if (
                          customerMobile &&
                          customerMobile.replace(/\D/g, "").length >= 10
                        ) {
                          checkForActiveReservation();
                        }
                      }}
                      className="w-full"
                    />
                    {detectedReservation && (
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800 flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm text-green-700 dark:text-green-300">
                          Guest detected in {detectedReservation.roomName}
                        </span>
                      </div>
                    )}
                    {/* WhatsApp Checkbox - show if mobile is entered */}
                    {customerMobile && customerMobile.length >= 10 && (
                      <div className="flex items-center space-x-2 pt-2">
                        <input
                          type="checkbox"
                          id="send-whatsapp-checkbox"
                          checked={sendBillToMobile}
                          onChange={(e) =>
                            setSendBillToMobile(e.target.checked)
                          }
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <label
                          htmlFor="send-whatsapp-checkbox"
                          className="text-sm font-medium leading-none cursor-pointer text-green-700 dark:text-green-400"
                        >
                          📱 Send bill via WhatsApp to {customerMobile}
                        </label>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Email Address{" "}
                      <span className="text-muted-foreground text-xs">
                        (for email receipt)
                      </span>
                    </label>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full"
                    />
                    {/* Email Checkbox - show if valid email is entered */}
                    {customerEmail &&
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) && (
                        <div className="flex items-center space-x-2 pt-2">
                          <input
                            type="checkbox"
                            id="send-email-checkbox"
                            checked={sendBillToEmail}
                            onChange={(e) =>
                              setSendBillToEmail(e.target.checked)
                            }
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label
                            htmlFor="send-email-checkbox"
                            className="text-sm font-medium leading-none cursor-pointer text-blue-700 dark:text-blue-400"
                          >
                            📧 Send bill via Email to {customerEmail}
                          </label>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Sticky Footer - Always visible */}
      <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-white/80 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900/80 pt-4 pb-3 px-4 border-t border-gray-200/50 dark:border-gray-700/50">
        <Button
          onClick={async () => {
            const saved = await saveCustomerDetails();
            if (saved) {
              // Check for active reservation before proceeding to payment
              await checkForActiveReservation();
              setCurrentStep("method");
            }
          }}
          className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-green-300/50 dark:shadow-green-900/30 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] font-semibold"
          size="lg"
          disabled={isSaving}
        >
          {isSaving ? "Saving Details..." : "Proceed to Payment Methods →"}
        </Button>
      </div>
    </div>
  );

  const renderMethodStep = () => (
    <div className="space-y-6 p-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => setCurrentStep("confirm")}
        className="mb-2 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Order
      </Button>

      {/* Vibrant Header */}
      <div className="text-center py-6 px-8 rounded-2xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 shadow-lg shadow-green-200/50 dark:shadow-green-900/30">
        <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-sm">
          Select Payment Method
        </h2>
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
          <span className="text-white/80 text-sm">Total Amount:</span>
          <span className="text-xl font-extrabold text-white">
            {currencySymbol}
            {total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Show room charge option if guest is detected */}
      {detectedReservation && (
        <Card className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border-2 border-emerald-400 dark:border-emerald-600 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-300/50">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-emerald-700 dark:text-emerald-300">
                In-House Guest Detected
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {detectedReservation.customerName} -{" "}
                {detectedReservation.roomName}
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleMethodSelect("room")}
            className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-300/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
          >
            <Receipt className="w-5 h-5 mr-3" />
            Charge to {detectedReservation.roomName}
          </Button>
        </Card>
      )}

      {/* Payment Methods Grid */}
      <div className="space-y-3">
        {/* Cash - Green gradient */}
        <button
          onClick={() => handleMethodSelect("cash")}
          className="w-full h-20 rounded-2xl flex items-center px-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-200 dark:border-green-700 hover:border-green-400 dark:hover:border-green-500 group"
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-300/50 group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div className="ml-4 text-left">
            <span className="text-xl font-bold text-gray-800 dark:text-white">
              Cash
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pay with cash
            </p>
          </div>
        </button>

        {/* Card - Blue/Indigo gradient */}
        <button
          onClick={() => handleMethodSelect("card")}
          className="w-full h-20 rounded-2xl flex items-center px-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 group"
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-300/50 group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
            <CreditCard className="w-7 h-7 text-white" />
          </div>
          <div className="ml-4 text-left">
            <span className="text-xl font-bold text-gray-800 dark:text-white">
              Card
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Credit or Debit card
            </p>
          </div>
        </button>

        {/* UPI - Purple/Violet gradient */}
        <button
          onClick={() => handleMethodSelect("upi")}
          className="w-full h-20 rounded-2xl flex items-center px-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/30 border-2 border-purple-300 dark:border-purple-600 hover:border-purple-400 dark:hover:border-purple-500 group"
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 flex items-center justify-center shadow-lg shadow-purple-300/50 group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
            <QrCode className="w-7 h-7 text-white" />
          </div>
          <div className="ml-4 text-left">
            <span className="text-xl font-bold text-gray-800 dark:text-white">
              UPI / QR Code
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Scan QR to pay instantly
            </p>
          </div>
        </button>
      </div>
    </div>
  );

  const renderQRStep = () => (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-6 p-2 pb-4">
        <Button
          variant="ghost"
          onClick={() => setCurrentStep("method")}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Methods
        </Button>

        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Scan to Pay</h2>
          <p className="text-muted-foreground">
            Ask the customer to scan the QR code using any UPI app
            <br />
            (Google Pay, PhonePe, etc.)
          </p>

          {qrCodeUrl ? (
            <div className="flex justify-center my-6">
              <div className="bg-white p-4 rounded-lg shadow-lg border-4 border-gray-200">
                <img src={qrCodeUrl} alt="UPI QR Code" className="w-64 h-64" />
              </div>
            </div>
          ) : (
            <div className="flex justify-center my-6">
              <div className="bg-muted p-4 rounded-lg w-64 h-64 flex items-center justify-center">
                <p className="text-muted-foreground">Generating QR code...</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Amount to be Paid:</p>
            <p className="text-4xl font-bold text-blue-600">
              {currencySymbol}
              {total.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 bg-background pt-3 pb-2 px-2 border-t shadow-lg">
        <Button
          onClick={() => handleMarkAsPaid("upi")}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          size="lg"
          disabled={isProcessingPayment}
        >
          {isProcessingPayment ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing Payment...
            </>
          ) : (
            "Mark as Paid"
          )}
        </Button>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="space-y-6 text-center py-8 p-4">
      {/* Animated Success Icon */}
      <div className="flex justify-center">
        <div className="relative">
          {/* Pulsing ring animation */}
          <div className="absolute inset-0 w-24 h-24 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-ping opacity-25"></div>
          <div className="relative w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-green-300/50">
            <Check
              className="w-14 h-14 text-white drop-shadow-sm"
              strokeWidth={3}
            />
          </div>
        </div>
      </div>

      {/* Success Message */}
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Payment Successful!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          The order for{" "}
          <span className="font-semibold text-gray-800 dark:text-white">
            {tableNumber ? `Table ${tableNumber}` : "POS"}
          </span>{" "}
          is now complete.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-4">
        <Button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-green-300/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
          size="lg"
        >
          Close
        </Button>

        <Button
          variant="outline"
          onClick={() => handlePrintBill(false)}
          className="w-full border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/20 dark:hover:to-purple-900/20 transition-all duration-300"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Bill
        </Button>
      </div>
    </div>
  );

  const renderEditStep = () => (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Vibrant Header */}
      <div className="text-center py-4 px-6 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep("confirm")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Order
          </Button>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
        <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-sm">
          Edit Order
        </h2>
        <p className="text-white/80 text-sm">
          Add new items to{" "}
          <span className="font-semibold text-white">
            {tableNumber ? `Table ${tableNumber}` : "this order"}
          </span>
        </p>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Previously Sent Items */}
        <Card className="p-0 overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="bg-gradient-to-r from-slate-100 to-gray-50 dark:from-gray-800 dark:to-gray-750 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-500" />
              Previously Sent Items
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full ml-auto">
                {orderItems.length} items
              </span>
            </h3>
          </div>
          <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
            {orderItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="flex-1 font-medium text-sm text-gray-700 dark:text-gray-200 truncate">
                  {item.name}
                </span>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleUpdateExistingItemQuantity(idx, item.quantity - 1)
                      }
                      className="h-8 w-8 p-0 rounded-none hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      -
                    </Button>
                    <span className="text-sm font-bold w-8 text-center text-gray-800 dark:text-white">
                      {item.quantity}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleUpdateExistingItemQuantity(idx, item.quantity + 1)
                      }
                      className="h-8 w-8 p-0 rounded-none hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      +
                    </Button>
                  </div>

                  <span className="font-bold text-sm w-20 text-right text-gray-800 dark:text-white">
                    {currencySymbol}
                    {(item.price * item.quantity).toFixed(2)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveExistingItem(idx)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* New Items to Add */}
        {newItemsBuffer.length > 0 && (
          <Card className="p-0 overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 shadow-lg">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Items to Add
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full ml-auto">
                  {newItemsBuffer.length} new
                </span>
              </h3>
            </div>
            <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
              {newItemsBuffer.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700"
                >
                  <span className="text-sm flex-1 font-medium text-gray-700 dark:text-gray-200">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleUpdateNewItemQuantity(
                            item.id,
                            item.quantity - 1
                          )
                        }
                        className="h-7 w-7 p-0 rounded-none"
                      >
                        -
                      </Button>
                      <span className="text-sm font-bold w-8 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleUpdateNewItemQuantity(
                            item.id,
                            item.quantity + 1
                          )
                        }
                        className="h-7 w-7 p-0 rounded-none"
                      >
                        +
                      </Button>
                    </div>
                    <span className="text-sm font-bold w-16 text-right">
                      {currencySymbol}
                      {(item.price * item.quantity).toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveNewItem(item.id)}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Custom Item Button */}
        <Button
          variant="outline"
          onClick={() => setShowCustomItemDialog(true)}
          className="w-full border-2 border-dashed border-purple-300 dark:border-purple-600 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Item
        </Button>

        {/* Search Menu Items */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search menu items..."
              value={menuSearchQuery}
              onChange={(e) => setMenuSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 focus:border-indigo-400 dark:focus:border-indigo-500 rounded-xl"
            />
          </div>

          {/* Menu Items List */}
          <Card className="max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="p-2 space-y-1">
              {filteredMenuItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  {menuSearchQuery
                    ? "No items found matching your search"
                    : "No menu items available"}
                </p>
              ) : (
                filteredMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAddMenuItem(item)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 rounded-xl transition-all group border border-transparent hover:border-green-200 dark:hover:border-green-700"
                  >
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm text-gray-800 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400">
                        {item.name}
                      </p>
                      {item.category && (
                        <p className="text-xs text-gray-400">{item.category}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-gray-700 dark:text-gray-300">
                        {currencySymbol}
                        {item.price.toFixed(2)}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center group-hover:bg-green-500 group-hover:scale-110 transition-all">
                        <Plus className="w-4 h-4 text-green-600 group-hover:text-white" />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="bg-gradient-to-t from-white via-white to-white/80 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900/80 pt-3 pb-3 px-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <Button
          onClick={handleSaveNewItems}
          disabled={newItemsBuffer.length === 0}
          className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-green-300/50 dark:shadow-green-900/30 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          size="lg"
        >
          <Check className="w-4 h-4 mr-2" />
          Save & Send New Items to Kitchen
        </Button>
        <Button
          onClick={() => setCurrentStep("confirm")}
          variant="outline"
          className="w-full border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <VisuallyHidden>
          <DialogTitle>
            {currentStep === "confirm" && "Confirm Order"}
            {currentStep === "method" && "Select Payment Method"}
            {currentStep === "qr" && "UPI Payment"}
            {currentStep === "success" && "Payment Successful"}
            {currentStep === "edit" && "Edit Order"}
          </DialogTitle>
        </VisuallyHidden>
        {currentStep === "confirm" && renderConfirmStep()}
        {currentStep === "method" && renderMethodStep()}
        {currentStep === "qr" && renderQRStep()}
        {currentStep === "success" && renderSuccessStep()}
        {currentStep === "edit" && renderEditStep()}
      </DialogContent>

      <CustomItemDialog
        isOpen={showCustomItemDialog}
        onClose={() => setShowCustomItemDialog(false)}
        onAddItem={handleAddCustomItem}
      />
    </Dialog>
  );
};

export default PaymentDialog;
