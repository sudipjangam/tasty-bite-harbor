import React, { useState, useEffect } from 'react';
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
import { ArrowLeft, Receipt, CreditCard, Wallet, QrCode, Check, Printer, Trash2, Plus, X, Search } from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import type { OrderItem } from "@/types/orders";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type PaymentStep = 'confirm' | 'method' | 'qr' | 'success' | 'edit';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderItems: OrderItem[];
  onSuccess: () => void;
  tableNumber?: string;
  onEditOrder?: () => void;
  orderId?: string; // Kitchen order ID to update status
}

const PaymentDialog = ({ 
  isOpen, 
  onClose, 
  orderItems, 
  onSuccess,
  tableNumber = '',
  onEditOrder,
  orderId 
}: PaymentDialogProps) => {
  const [currentStep, setCurrentStep] = useState<PaymentStep>('confirm');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [sendBillToEmail, setSendBillToEmail] = useState(false);
  const [sendBillToMobile, setSendBillToMobile] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [newItemsBuffer, setNewItemsBuffer] = useState<OrderItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [promotionCode, setPromotionCode] = useState('');
  const [appliedPromotion, setAppliedPromotion] = useState<any>(null);
  const [manualDiscountPercent, setManualDiscountPercent] = useState<number>(0);
  const [detectedReservation, setDetectedReservation] = useState<{
    reservation_id: string;
    room_id: string;
    roomName: string;
    customerName: string;
  } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch restaurant info
  const { data: restaurantInfo } = useQuery({
    queryKey: ['restaurant-info'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('restaurant_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.restaurant_id) return null;
      
      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', profile.restaurant_id)
        .single();
      
      return data;
    }
  });

  // Fetch menu items for edit mode
  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu-items-for-edit'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('restaurant_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.restaurant_id) return [];
      
      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .eq('is_available', true)
        .order('name');
      
      return data || [];
    },
    enabled: isOpen
  });

  // Fetch payment settings
  const { data: paymentSettings } = useQuery({
    queryKey: ['payment-settings', restaurantInfo?.restaurantId || restaurantInfo?.id],
    queryFn: async () => {
      const restaurantIdToUse = restaurantInfo?.restaurantId || restaurantInfo?.id;
      if (!restaurantIdToUse) return null;
      
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('restaurant_id', restaurantIdToUse)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching payment settings:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!(restaurantInfo?.restaurantId || restaurantInfo?.id)
  });

  // Fetch active promotions
  const { data: activePromotions = [] } = useQuery({
    queryKey: ['active-promotions', restaurantInfo?.restaurantId || restaurantInfo?.id],
    queryFn: async () => {
      const restaurantIdToUse = restaurantInfo?.restaurantId || restaurantInfo?.id;
      if (!restaurantIdToUse) return [];
      
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('promotion_campaigns')
        .select('*')
        .eq('restaurant_id', restaurantIdToUse)
        .eq('is_active', true)
        .not('promotion_code', 'is', null)
        .lte('start_date', today)
        .gte('end_date', today);
      
      if (error) {
        console.error('Error fetching promotions:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!(restaurantInfo?.restaurantId || restaurantInfo?.id)
  });

  // Calculate totals with promotion discount and manual discount
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate promotion discount amount if promotion is applied
  const promotionDiscountAmount = appliedPromotion 
    ? appliedPromotion.discount_percentage 
      ? (subtotal * appliedPromotion.discount_percentage / 100)
      : appliedPromotion.discount_amount || 0
    : 0;
  
  // Calculate manual discount amount
  const manualDiscountAmount = manualDiscountPercent > 0 
    ? (subtotal * manualDiscountPercent / 100)
    : 0;
  
  // Total discount is sum of both
  const totalDiscountAmount = promotionDiscountAmount + manualDiscountAmount;
  
  const totalAfterDiscount = subtotal - totalDiscountAmount;
  const total = totalAfterDiscount;

  // Generate QR code when UPI method is selected
  useEffect(() => {
    if (paymentSettings?.upi_id) {
      const upiUrl = `upi://pay?pa=${paymentSettings.upi_id}&pn=${encodeURIComponent(restaurantInfo?.name || 'Restaurant')}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${tableNumber || 'POS'}`)}`;
      
      QRCode.toDataURL(upiUrl, { width: 300, margin: 2 })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('QR generation error:', err));
    }
  }, [currentStep, paymentSettings, total, restaurantInfo, tableNumber]);

  // Fetch existing customer details and discount if orderId exists
  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (orderId && isOpen) {
        try {
          const { data: kitchenOrder } = await supabase
            .from('kitchen_orders')
            .select('order_id, customer_name, customer_phone')
            .eq('id', orderId)
            .single();

          if (kitchenOrder?.order_id) {
            // Try fetching from orders with both naming conventions AND discount fields
            const { data: order } = await supabase
              .from('orders')
              .select('Customer_Name, Customer_MobileNumber, customer_name, customer_phone, discount_percentage, discount_amount')
              .eq('id', kitchenOrder.order_id)
              .maybeSingle();

            if (order) {
              const name = (order as any).Customer_Name || (order as any).customer_name;
              const phone = (order as any).Customer_MobileNumber || (order as any).customer_phone;
              if (name) setCustomerName(name);
              if (phone) {
                setCustomerMobile(String(phone));
                setSendBillToEmail(true);
              }
              
              // Load existing discount percentage if available
              const discountPercent = parseFloat((order as any).discount_percentage) || 0;
              if (discountPercent > 0) {
                setManualDiscountPercent(discountPercent);
              }
            }
          } else {
            // Fall back to details stored on the kitchen order
            if (kitchenOrder?.customer_name) setCustomerName(kitchenOrder.customer_name);
            if ((kitchenOrder as any)?.customer_phone) {
              setCustomerMobile(String((kitchenOrder as any).customer_phone));
              setSendBillToEmail(true);
            } else {
              setSendBillToEmail(false);
            }
          }
        } catch (error) {
          console.error('Error fetching customer details:', error);
        }
      }
    };

    fetchCustomerDetails();
  }, [orderId, isOpen]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('confirm');
      setCustomerName('');
      setCustomerMobile('');
      setSendBillToEmail(false);
      setQrCodeUrl('');
      setMenuSearchQuery('');
      setNewItemsBuffer([]);
      setIsSaving(false);
      setDetectedReservation(null);
    }
  }, [isOpen]);

  const handleEditOrder = () => {
    setCurrentStep('edit');
    setNewItemsBuffer([]);
    setMenuSearchQuery('');
  };

  const handleDeleteOrder = async () => {
    if (!window.confirm('Are you sure you want to delete this order permanently? This action cannot be undone.')) {
      return;
    }

    try {
      if (orderId) {
        // First, get the order_id from kitchen_orders to delete related order
        const { data: kitchenOrder } = await supabase
          .from('kitchen_orders')
          .select('order_id')
          .eq('id', orderId)
          .single();

        // Delete from kitchen_orders table
        const { error: kitchenError } = await supabase
          .from('kitchen_orders')
          .delete()
          .eq('id', orderId);

        if (kitchenError) throw kitchenError;

        // Delete corresponding order from orders table if it exists
        if (kitchenOrder?.order_id) {
          const { error: orderError } = await supabase
            .from('orders')
            .delete()
            .eq('id', kitchenOrder.order_id);

          if (orderError) console.error('Error deleting from orders table:', orderError);
        }

        // Invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-orders'] });
      }

      toast({
        title: "Order Deleted Successfully",
        description: "The order has been permanently deleted."
      });
      
      onClose();
      onSuccess(); // Refresh the order list
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the order. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddMenuItem = (item: any) => {
    // Check if item already exists in buffer
    const existingIndex = newItemsBuffer.findIndex(bufferItem => bufferItem.name === item.name);
    
    if (existingIndex >= 0) {
      // Increase quantity if item exists
      setNewItemsBuffer(prev => 
        prev.map((bufferItem, idx) => 
          idx === existingIndex 
            ? { ...bufferItem, quantity: bufferItem.quantity + 1 }
            : bufferItem
        )
      );
      toast({
        title: "Quantity Increased",
        description: `${item.name} quantity increased to ${newItemsBuffer[existingIndex].quantity + 1}.`
      });
    } else {
      // Add new item
      const newItem: OrderItem = {
        id: `new-${Date.now()}-${Math.random()}`,
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        modifiers: []
      };
      setNewItemsBuffer(prev => [...prev, newItem]);
      toast({
        title: "Item Added",
        description: `${item.name} added to new items list.`
      });
    }
  };

  const handleRemoveNewItem = (itemId: string) => {
    setNewItemsBuffer(prev => prev.filter(item => item.id !== itemId));
  };

  const handleRemoveExistingItem = async (itemIndex: number) => {
    if (!orderId) return;

    try {
      // Get current order
      const { data: currentOrder, error: fetchError } = await supabase
        .from('kitchen_orders')
        .select('items')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      // Remove the item at the specified index
      const updatedItems = [...(currentOrder?.items || [])];
      updatedItems.splice(itemIndex, 1);

      // Update the order
      const { error: updateError } = await supabase
        .from('kitchen_orders')
        .update({ 
          items: updatedItems,
          status: 'new'
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      toast({
        title: "Item Removed",
        description: "Item has been removed from the order."
      });

      // Refresh the order data
      onSuccess();
    } catch (error) {
      console.error('Error removing item:', error);
      toast({
        title: "Failed to Remove Item",
        description: "There was an error removing the item.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateNewItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveNewItem(itemId);
      return;
    }
    setNewItemsBuffer(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleSaveNewItems = async () => {
    if (newItemsBuffer.length === 0) {
      toast({
        title: "No Items to Add",
        description: "Please add at least one item from the menu.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (!orderId) {
        toast({
          title: "Error",
          description: "Order ID not found. Cannot add items.",
          variant: "destructive"
        });
        return;
      }

      // Get restaurant ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('restaurant_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.restaurant_id) throw new Error('Restaurant not found');

      // Get current order to update items
      const { data: currentOrder, error: fetchError } = await supabase
        .from('kitchen_orders')
        .select('items')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      // Normalize old items to ensure they are objects
      const normalizedOldItems = (currentOrder?.items || []).map(item => {
        if (typeof item === 'string') {
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
      const formattedNewItems = newItemsBuffer.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      // Combine old items with new items as objects
      const combinedItems = [...normalizedOldItems, ...formattedNewItems];

      // Update the order with new items
      const { error: updateError } = await supabase
        .from('kitchen_orders')
        .update({ 
          items: combinedItems,
          status: 'new'
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      toast({
        title: "Items Added Successfully",
        description: `${newItemsBuffer.length} new item(s) have been sent to the kitchen.`
      });

      // Update the local orderItems and go back to confirm step
      setCurrentStep('confirm');
      setNewItemsBuffer([]);
      onSuccess(); // Refresh the order list
    } catch (error) {
      console.error('Error adding items to order:', error);
      toast({
        title: "Failed to Add Items",
        description: "There was an error adding items to the order.",
        variant: "destructive"
      });
    }
  };

  // Filter menu items based on search
  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(menuSearchQuery.toLowerCase()))
  );

  const saveCustomerDetails = async (): Promise<boolean> => {


    // If checkbox not checked, return success
    if (!sendBillToEmail) {

      return true;
    }

    if (!orderId) {
      console.error('❌ No orderId provided');
      toast({
        title: "Error",
        description: "Order ID not found. Cannot save customer details.",
        variant: "destructive"
      });
      return false;
    }

    // Validate inputs
    if (!customerName.trim()) {

      toast({
        title: "Customer Name Required",
        description: "Please enter customer name to send bill.",
        variant: "destructive"
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
          variant: "destructive"
        });
        return false;
      }
    }

    setIsSaving(true);

    try {

      // Try to find the order_id from kitchen_orders
      const { data: kitchenOrder, error: kitchenError } = await supabase
        .from('kitchen_orders')
        .select('order_id')
        .eq('id', orderId)
        .maybeSingle();



      let targetOrderId = null;

      if (kitchenOrder?.order_id) {
        // Found a linked order_id
        targetOrderId = kitchenOrder.order_id;

      } else {
        // Maybe orderId is directly the orders table ID

        const { data: directOrder, error: directError } = await supabase
          .from('orders')
          .select('id')
          .eq('id', orderId)
          .maybeSingle();

        if (directOrder) {
          targetOrderId = orderId;

        } else {
          console.error('❌ No order found with ID:', orderId, { directError });
        }
      }

      if (targetOrderId) {

        const { data: updateData, error: updateError } = await supabase
          .from('orders')
          .update({
            Customer_Name: customerName.trim(),
            Customer_MobileNumber: String(customerMobile).trim()
          })
          .eq('id', targetOrderId)
          .select();

        if (updateError) {
          console.warn('⚠️ Update with PascalCase columns failed, trying snake_case...', updateError);
          // Try again with snake_case column names (older schema)
          const { data: updateData2, error: updateError2 } = await supabase
            .from('orders')
            .update({
              customer_name: customerName.trim(),
              customer_phone: String(customerMobile).trim()
            })
            .eq('id', targetOrderId)
            .select();

          if (updateError2) {
            console.error('❌ Update error (both attempts failed):', updateError2);
            throw updateError2;
          }


          toast({
            title: "Details Saved",
            description: "Customer details saved successfully."
          });
        } else {

          toast({
            title: "Details Saved",
            description: "Customer details saved successfully."
          });
        }
      } else {
        console.warn('⚠️ No linked order found. Saving name on kitchen order and proceeding.');
        // Fallback: store the customer name on the kitchen order so it is visible to staff
        try {
          const { error: koUpdateError } = await supabase
            .from('kitchen_orders')
            .update({ customer_name: customerName.trim(), customer_phone: customerMobile.trim() })
            .eq('id', orderId);

          if (koUpdateError) {
            console.error('⚠️ Failed to save on kitchen_orders:', koUpdateError);
            toast({
              title: "Proceeding without DB save",
              description: "Could not link order yet. We'll still proceed and include details on the bill.",
            });
          } else {
            toast({
              title: "Details Saved (Temporary)",
              description: "Name saved for this order. It will be attached when the order is created.",
            });
          }
        } catch (e) {
          console.error('⚠️ Kitchen order fallback failed:', e);
        }
        setIsSaving(false);
        return true;
      }

      setIsSaving(false);
      return true;
    } catch (error) {
      console.error('❌ Error saving customer details:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save customer details. Please try again.",
        variant: "destructive"
      });
      setIsSaving(false);
      return false;
    }
  };

  // Email bill sending function (using Resend)
  const sendBillViaEmail = async () => {
    console.log('📧 sendBillViaEmail called', { sendBillToEmail, customerEmail });
    if (!sendBillToEmail || !customerEmail) {
      console.log('⚠️ sendBillViaEmail skipped - missing data', { sendBillToEmail, customerEmail });
      return;
    }

    try {
      console.log('📧 restaurantInfo data:', restaurantInfo);
      const restaurantId = restaurantInfo?.restaurantId || restaurantInfo?.id || '';
      
      const { data, error } = await supabase.functions.invoke('send-email-bill', {
        body: {
          orderId: orderId || '',
          email: customerEmail,
          customerName: customerName || 'Valued Customer',
          restaurantName: restaurantInfo?.name || '',
          restaurantId: restaurantId, // Pass ID so edge function can fetch name if needed
          restaurantAddress: restaurantInfo?.address || '',
          restaurantPhone: restaurantInfo?.phone || '',
          total: total,
          items: orderItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })),
          tableNumber: tableNumber || 'POS',
          orderDate: new Date().toLocaleString('en-IN'),
          discount: totalDiscountAmount > 0 ? totalDiscountAmount : undefined,
          promotionName: appliedPromotion?.name || undefined
        }
      });

      console.log('📧 Edge function response:', { data, error });
      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Bill Sent Successfully",
          description: `Bill has been sent to ${customerEmail} via Email.`
        });
      } else {
        toast({
          title: "Failed to Send Bill",
          description: data?.error || "There was an error sending the bill.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending Email bill:', error);
      toast({
        title: "Email Send Failed",
        description: "Failed to send bill via Email. Please try again.",
        variant: "destructive"
      });
    }
  };

  /* FROZEN: WhatsApp sending - Uncomment when Twilio credentials are available
  const sendBillViaWhatsApp = async () => {
    if (!customerMobile) return;

    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-bill', {
        body: {
          phoneNumber: customerMobile,
          restaurantName: restaurantInfo?.name || 'Restaurant',
          customerName: customerName || 'Valued Customer',
          total: total,
          roomName: tableNumber || 'POS',
          checkoutDate: new Date().toLocaleDateString('en-IN'),
          billingId: orderId || 'N/A'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Bill Sent Successfully",
          description: `Bill has been sent to ${customerMobile} via WhatsApp.`
        });
      } else {
        toast({
          title: "Failed to Send Bill",
          description: data?.message || "There was an error sending the bill.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending WhatsApp bill:', error);
      toast({
        title: "WhatsApp Send Failed",
        description: "Failed to send bill via WhatsApp. Please check Twilio settings.",
        variant: "destructive"
      });
    }
  };
  */

  const handlePrintBill = async () => {

    // Save customer details first
    const saved = await saveCustomerDetails();
    if (!saved) {

      return;
    }

    try {
      const doc = new jsPDF({
        format: [58, 297], // 58mm thermal printer width
        unit: 'mm'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 0.5; // Reduced side margins for better readability
      const contentWidth = pageWidth - (margin * 2);
      let yPos = 5; // Increased top margin to prevent cutting
      
      // Restaurant Header - Larger and prominent
      doc.setFontSize(16); // Increased from 14
      doc.setFont('helvetica', 'bold');
      const restaurantName = restaurantInfo?.name||restaurantInfo?.restaurantName || 'Restaurant';
      const nameLines = doc.splitTextToSize(restaurantName, contentWidth);
      doc.text(nameLines, pageWidth / 2, yPos, { align: 'center' });
      yPos += nameLines.length * 5 + 2;
      
      doc.setFontSize(10); // Increased from 9
      doc.setFont('helvetica', 'normal');
      if (restaurantInfo?.address) {
        const addressLines = doc.splitTextToSize(restaurantInfo.address, contentWidth);
        doc.text(addressLines, pageWidth / 2, yPos, { align: 'center' });
        yPos += addressLines.length * 4;
      }
      if (restaurantInfo?.phone) {
        doc.text(`Ph: ${restaurantInfo.phone}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
      }
      if (restaurantInfo?.gstin) {
        doc.text(`GSTIN: ${restaurantInfo.gstin}`, pageWidth / 2, yPos, { align: 'center' });
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
        doc.setFont('helvetica', 'bold');
        doc.text('TAX INVOICE', pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
      }
      
      // Dashed line
      for (let i = margin; i < pageWidth - margin; i += 2) {
        doc.line(i, yPos, i + 1, yPos);
      }
      yPos += 4;
      
      // Bill details - increased font size
      doc.setFontSize(10); // Increased from 9
      doc.setFont('helvetica', 'normal');
      const billNumber = `#${Date.now().toString().slice(-6)}`;
      const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      
      doc.text(`Bill#: ${billNumber}`, margin, yPos);
      yPos += 4;
      
      if (tableNumber) {
        doc.text(`To: ${tableNumber}`, margin, yPos);
      } else if (customerName) {
        doc.text(`To: ${customerName}`, margin, yPos);
      } else {
        doc.text('To: POS Order', margin, yPos);
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
      doc.setFont('helvetica', 'bold');
      doc.text('Particulars', pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
      
      // Column headers - increased font with better spacing
      doc.setFontSize(9.5);
      doc.text('Item', margin, yPos);
      doc.text('Qty', pageWidth - 32, yPos, { align: 'right' });
      doc.text('Rate', pageWidth - 18, yPos, { align: 'right' });
      doc.text('Amt', pageWidth - margin, yPos, { align: 'right' });
      yPos += 1;
      
      // Line under headers
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 3.5;
      
      // Items - increased font with better column spacing
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      orderItems.forEach((item, index) => {
        const itemName = doc.splitTextToSize(item.name, 22);
        doc.text(itemName, margin, yPos);
        doc.text(item.quantity.toString(), pageWidth - 32, yPos, { align: 'right' });
        doc.text(item.price.toFixed(0), pageWidth - 18, yPos, { align: 'right' });
        doc.text((item.price * item.quantity).toFixed(0), pageWidth - margin, yPos, { align: 'right' });
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
      doc.text('Sub Total:', margin, yPos);
      doc.text(subtotal.toFixed(2), pageWidth - margin, yPos, { align: 'right' });
      yPos += 4;
      
      const cgstRate = 0;
      const sgstRate = 0;
      const cgst = 0;
      const sgst = 0;
      
      if (cgst > 0 || sgst > 0) {
        doc.text(`CGST @ ${(cgstRate * 100).toFixed(1)}%:`, margin, yPos);
        doc.text(cgst.toFixed(2), pageWidth - margin, yPos, { align: 'right' });
        yPos += 4;
        
        doc.text(`SGST @ ${(sgstRate * 100).toFixed(1)}%:`, margin, yPos);
        doc.text(sgst.toFixed(2), pageWidth - margin, yPos, { align: 'right' });
        yPos += 4;
      }
      
      // Promotion discount if applied
      if (appliedPromotion && promotionDiscountAmount > 0) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Promo Discount (${appliedPromotion.name}):`, margin, yPos);
        doc.text(`-${promotionDiscountAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
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
        doc.setFont('helvetica', 'normal');
        doc.text(`Discount (${manualDiscountPercent}%):`, margin, yPos);
        doc.text(`-${manualDiscountAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 4;
      }
      
      // Total discount
      if (totalDiscountAmount > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Total Discount:', margin, yPos);
        doc.text(`-${totalDiscountAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 4;
      }
      
      // Dashed line
      for (let i = margin; i < pageWidth - margin; i += 2) {
        doc.line(i, yPos, i + 1, yPos);
      }
      yPos += 4;
      
      // Net Amount - larger font
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14); // Increased from 12
      doc.text('Net Amount:', margin, yPos);
      doc.text(`₹${total.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 6;
      
      // Add QR code if UPI is configured and we're in QR step
      if (qrCodeUrl && paymentSettings?.upi_id) {
        for (let i = margin; i < pageWidth - margin; i += 2) {
          doc.line(i, yPos, i + 1, yPos);
        }
        yPos += 3;
        
        const qrSize = 32; // Slightly larger QR code
        doc.addImage(qrCodeUrl, 'PNG', (pageWidth - qrSize) / 2, yPos, qrSize, qrSize);
        yPos += qrSize + 3;
        
        doc.setFontSize(9); // Increased from 8
        doc.setFont('helvetica', 'normal');
        doc.text('Scan QR to pay', pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
      }
      
      // Dashed line
      for (let i = margin; i < pageWidth - margin; i += 2) {
        doc.line(i, yPos, i + 1, yPos);
      }
      yPos += 4;
      
      // Footer - larger font
      doc.setFontSize(12); // Increased from 10
      doc.setFont('helvetica', 'bold');
      doc.text('Thank You!', pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
      doc.setFontSize(10); // Increased from 8
      doc.setFont('helvetica', 'normal');
      doc.text('Please visit again', pageWidth / 2, yPos, { align: 'center' });
      
      // Save and print
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      
      // Send bill via Email if checkbox is checked
      if (sendBillToEmail && customerEmail) {
        console.log('📧 Sending bill via Email');
        await sendBillViaEmail();
      } else {
        console.log('ℹ️ Skipping Email send', { sendBillToEmail, customerEmail });
      }
      
      toast({
        title: "Bill Generated",
        description: sendBillToEmail 
          ? "Bill has been generated and sent to customer's email."
          : "The bill has been generated and sent to printer."
      });
    } catch (error) {
      console.error('Error generating bill:', error);
      toast({
        title: "Print Error",
        description: "Failed to generate bill. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleApplyPromotion = async (passedCode?: string) => {
    const codeToValidate = (passedCode ?? promotionCode).trim();
    if (!codeToValidate) {
      toast({
        title: "Enter Promotion Code",
        description: "Please enter a promotion code to apply.",
        variant: "destructive"
      });
      return;
    }

    try {
      const restaurantIdToUse = restaurantInfo?.restaurantId || restaurantInfo?.id;
      
      // Call backend validation function with the exact code we want to validate
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: {
          code: codeToValidate,
          orderSubtotal: subtotal,
          restaurantId: restaurantIdToUse
        }
      });

      if (error) throw error;

      if (data.valid && data.promotion) {
        setPromotionCode(codeToValidate);
        setAppliedPromotion(data.promotion);
        toast({
          title: "Promotion Applied!",
          description: `${data.promotion.name} - ${data.promotion.discount_percentage ? `${data.promotion.discount_percentage}% off` : `₹${data.promotion.discount_amount} off`}`,
        });
      } else {
        toast({
          title: "Invalid Code",
          description: data.error || "The promotion code you entered is not valid or has expired.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error validating promo code:', error);
      toast({
        title: "Validation Error",
        description: "Failed to validate promotion code. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRemovePromotion = () => {
    setAppliedPromotion(null);
    setPromotionCode('');
    toast({
      title: "Promotion Removed",
      description: "The promotion code has been removed from this order."
    });
  };

  const checkForActiveReservation = async () => {
    // Sanitize mobile number: extract last 10 digits
    const mobileStr = String(customerMobile || '').replace(/\D/g, '');
    const sanitizedMobile = mobileStr.slice(-10);
    
    // Only check if we have exactly 10 digits after sanitization
    if (!sanitizedMobile || sanitizedMobile.length !== 10) {
      console.log('❌ Invalid mobile number for reservation check:', { original: customerMobile, sanitized: sanitizedMobile });
      setDetectedReservation(null);
      return;
    }

    try {
      console.log('🔍 Checking for active reservation with sanitized mobile:', sanitizedMobile);
      
      const { data, error } = await supabase.functions.invoke('find-active-reservation', {
        body: { mobileNumber: sanitizedMobile }
      });

      if (error) {
        console.error('❌ Error checking reservation:', error);
        return;
      }

      console.log('📊 Reservation check result:', data);

      if (data?.found) {
        console.log('✅ Found active reservation:', data);
        setDetectedReservation({
          reservation_id: data.reservation_id,
          room_id: data.room_id,
          roomName: data.roomName,
          customerName: data.customerName
        });
        
        toast({
          title: "Guest Detected!",
          description: `This customer has an active reservation in ${data.roomName}`,
        });
      } else {
        console.log('ℹ️ No active reservation found for mobile:', sanitizedMobile);
        setDetectedReservation(null);
      }
    } catch (error) {
      console.error('❌ Error checking reservation:', error);
      setDetectedReservation(null);
    }
  };

  const handleMethodSelect = (method: string) => {
    if (method === 'upi') {
      if (!paymentSettings?.upi_id) {
        toast({
          title: "UPI Not Configured",
          description: "Please configure UPI settings in the Payment Settings tab first.",
          variant: "destructive"
        });
        return;
      }
      setCurrentStep('qr');
    } else if (method === 'room') {
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
        description: "Unable to charge to room. No active reservation detected.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update order with reservation_id and payment status
      if (orderId) {
        // First get the order_id from kitchen_orders
        const { data: kitchenOrder } = await supabase
          .from('kitchen_orders')
          .select('order_id')
          .eq('id', orderId)
          .single();

        if (kitchenOrder?.order_id) {
          // Update the order with reservation link, payment status, and discount info
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              reservation_id: detectedReservation.reservation_id,
              payment_status: 'Pending - Room Charge',
              status: 'completed',
              total: total, // Save final amount after discount
              discount_amount: totalDiscountAmount,
              discount_percentage: manualDiscountPercent > 0 ? manualDiscountPercent : (appliedPromotion?.discount_percentage || 0)
            })
            .eq('id', kitchenOrder.order_id);

          if (updateError) throw updateError;
        }

        // Update kitchen order status
        const { error: kitchenError } = await supabase
          .from('kitchen_orders')
          .update({ status: 'completed' })
          .eq('id', orderId);

        if (kitchenError) throw kitchenError;

        // Create room food order entry
        const { error: roomOrderError } = await supabase
          .from('room_food_orders')
          .insert({
            room_id: detectedReservation.room_id,
            order_id: kitchenOrder?.order_id,
            total: total,
            status: 'pending'
          });

        if (roomOrderError) {
          console.error('Error creating room food order:', roomOrderError);
          // Don't fail the whole operation if this fails
        }
      }

      toast({
        title: "Charged to Room",
        description: `Order charged to ${detectedReservation.roomName}. Will be settled at checkout.`,
      });

      setCurrentStep('success');

      // Auto-close after 2 seconds
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error charging to room:', error);
      toast({
        title: "Charge Failed",
        description: "Failed to charge order to room. Please try another payment method.",
        variant: "destructive"
      });
    }
  };

  const handleMarkAsPaid = async (paymentMethod: string = 'upi') => {
    try {
      // Here you would integrate with your payment verification system
      // For now, we'll simulate a successful payment
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const restaurantIdToUse = restaurantInfo?.restaurantId || restaurantInfo?.id;
      
      // Update order status to completed in database if orderId is provided
      if (orderId) {
        // First get the kitchen order to find linked order_id
        const { data: kitchenOrder } = await supabase
          .from('kitchen_orders')
          .select('order_id')
          .eq('id', orderId)
          .single();

        // Update kitchen order status
        const { error } = await supabase
          .from('kitchen_orders')
          .update({ status: 'completed' })
          .eq('id', orderId);
        
        if (error) {
          console.error('Error updating order status:', error);
          toast({
            title: "Warning",
            description: "Payment received but order status update failed.",
            variant: "destructive"
          });
        }

        // Update the linked order with payment status and discount info
        if (kitchenOrder?.order_id) {
          const { error: orderError } = await supabase
            .from('orders')
            .update({
              payment_status: 'paid',
              status: 'completed',
              total: total, // Save final amount after discount
              discount_amount: totalDiscountAmount,
              discount_percentage: manualDiscountPercent > 0 ? manualDiscountPercent : (appliedPromotion?.discount_percentage || 0)
            })
            .eq('id', kitchenOrder.order_id);

          if (orderError) {
            console.error('Error updating order payment status:', orderError);
          }
        }

        // Log promotion usage if promotion was applied
        if (appliedPromotion && restaurantIdToUse) {
          try {
            await supabase.functions.invoke('log-promotion-usage', {
              body: {
                orderId: orderId,
                promotionId: appliedPromotion.id,
                restaurantId: restaurantIdToUse,
                customerName: customerName || 'Walk-in Customer',
                customerPhone: customerMobile || null,
                orderTotal: total,
                discountAmount: promotionDiscountAmount
              }
            });
          } catch (promoError) {
            console.error('Error logging promotion usage:', promoError);
            // Don't fail the payment if logging fails
          }
        }
      }
      
      setCurrentStep('success');
      
      toast({
        title: "Payment Successful",
        description: `Order payment of ₹${total.toFixed(2)} received via ${paymentMethod}.`,
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
        variant: "destructive"
      });
    }
  };

  const renderConfirmStep = () => (
    <div className="space-y-6 p-2">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Confirm Order</h2>
        <p className="text-muted-foreground">
          Review the details for {tableNumber ? `Table ${tableNumber}` : 'POS Order'}
        </p>
      </div>

      <Card className="p-4 bg-muted/50">
        <div className="space-y-3">
          {orderItems.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span>{item.quantity}x {item.name}</span>
              <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          
          <Separator className="my-3" />
          
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          
          {appliedPromotion && promotionDiscountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Promo Discount ({appliedPromotion.name})</span>
              <span>-₹{promotionDiscountAmount.toFixed(2)}</span>
            </div>
          )}
          
          {manualDiscountPercent > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount ({manualDiscountPercent}%)</span>
              <span>-₹{manualDiscountAmount.toFixed(2)}</span>
            </div>
          )}
          
          {totalDiscountAmount > 0 && (
            <div className="flex justify-between text-sm font-semibold text-green-600">
              <span>Total Discount</span>
              <span>-₹{totalDiscountAmount.toFixed(2)}</span>
            </div>
          )}
          
          <Separator className="my-3" />
          
          <div className="flex justify-between text-lg font-bold">
            <span>Total Due</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      {/* Promotion Code Section */}
      <Card className="p-4 bg-background">
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Apply Promotion</h3>
          
          {!appliedPromotion ? (
            <div className="space-y-3">
              <Label htmlFor="promo-select" className="text-xs">Select or Enter Promotion Code</Label>
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
                        <SelectItem key={promo.id} value={promo.promotion_code || ''}>
                          <div className="flex items-center justify-between w-full gap-3 pr-2">
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs">{promo.promotion_code}</span>
                                <span className="text-xs text-muted-foreground truncate">{promo.name}</span>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 text-xs whitespace-nowrap">
                              {promo.discount_percentage ? `${promo.discount_percentage}% off` : `₹${promo.discount_amount} off`}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                      <Separator className="my-1" />
                      <SelectItem value="manual">✏️ Enter code manually...</SelectItem>
                    </>
                  ) : (
                    <SelectItem value="manual">Enter code manually...</SelectItem>
                  )}
                </SelectContent>
              </Select>
              
              {/* Manual entry field - show when "manual" is selected or no promotions */}
              {(promotionCode === "manual" || activePromotions.length === 0) && (
                <div className="flex items-center gap-2">
                  <Input
                    value={promotionCode === "manual" ? "" : promotionCode}
                    onChange={(e) => setPromotionCode(e.target.value.toUpperCase())}
                    placeholder="Enter promotion code"
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
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
                    Discount: ₹{promotionDiscountAmount.toFixed(2)}
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
        <div className="space-y-2">
          <label className="text-sm font-medium">Discount (%)</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="0"
              min="0"
              max="100"
              value={manualDiscountPercent || ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                if (value >= 0 && value <= 100) {
                  setManualDiscountPercent(value);
                }
              }}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">%</span>
            {manualDiscountPercent > 0 && (
              <Button 
                onClick={() => setManualDiscountPercent(0)} 
                variant="outline" 
                size="sm"
              >
                Clear
              </Button>
            )}
          </div>
          {manualDiscountPercent > 0 && (
            <div className="text-sm text-green-600 dark:text-green-400 font-medium">
              ✓ {manualDiscountPercent}% discount applied - Save ₹{manualDiscountAmount.toFixed(2)}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={handleEditOrder} className="w-full">
          <Receipt className="w-4 h-4 mr-2" />
          Edit Order
        </Button>
        <Button 
          variant="outline" 
          onClick={handlePrintBill} 
          className="w-full"
          disabled={isSaving}
        >
          <Printer className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Print Bill"}
        </Button>
      </div>

      <Button 
        variant="destructive" 
        onClick={handleDeleteOrder}
        className="w-full"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Order
      </Button>

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
                  Mobile Number <span className="text-muted-foreground text-xs">(for room detection)</span>
                </label>
                <Input
                  type="tel"
                  placeholder="Enter mobile number"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  onBlur={() => {
                    if (customerMobile && customerMobile.replace(/\D/g, '').length >= 10) {
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
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Email Address <span className="text-muted-foreground text-xs">(for email receipt)</span>
                </label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      <Button 
        onClick={async () => {
          const saved = await saveCustomerDetails();
          if (saved) {
            // Check for active reservation before proceeding to payment
            await checkForActiveReservation();
            setCurrentStep('method');
          }
        }}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        size="lg"
        disabled={isSaving}
      >
        {isSaving ? "Saving Details..." : "Proceed to Payment Methods"}
      </Button>
    </div>
  );

  const renderMethodStep = () => (
    <div className="space-y-6 p-2">
      <Button
        variant="ghost"
        onClick={() => setCurrentStep('confirm')}
        className="mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Order
      </Button>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Select Payment Method</h2>
        <p className="text-lg text-blue-600 dark:text-blue-400 font-semibold">
          Total Amount: ₹{total.toFixed(2)}
        </p>
      </div>

      {/* Show room charge option if guest is detected */}
      {detectedReservation && (
        <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-green-700 dark:text-green-300">In-House Guest Detected</p>
              <p className="text-sm text-green-600 dark:text-green-400">
                {detectedReservation.customerName} - {detectedReservation.roomName}
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleMethodSelect('room')}
            className="w-full h-16 text-lg bg-green-600 hover:bg-green-700 text-white"
          >
            <Receipt className="w-6 h-6 mr-3" />
            Charge to {detectedReservation.roomName}
          </Button>
        </Card>
      )}

      <div className="space-y-3">
        <Button
          variant="outline"
          onClick={() => handleMethodSelect('cash')}
          className="w-full h-16 text-lg justify-start hover:bg-accent"
        >
          <Wallet className="w-6 h-6 mr-3" />
          Cash
        </Button>

        <Button
          variant="outline"
          onClick={() => handleMethodSelect('card')}
          className="w-full h-16 text-lg justify-start hover:bg-accent"
        >
          <CreditCard className="w-6 h-6 mr-3" />
          Card
        </Button>

        <Button
          variant="outline"
          onClick={() => handleMethodSelect('upi')}
          className="w-full h-16 text-lg justify-start border-2 border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950"
        >
          <QrCode className="w-6 h-6 mr-3" />
          UPI / QR Code
        </Button>
      </div>
    </div>
  );

  const renderQRStep = () => (
    <div className="space-y-6 p-2">
      <Button
        variant="ghost"
        onClick={() => setCurrentStep('method')}
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
          <p className="text-4xl font-bold text-blue-600">₹{total.toFixed(2)}</p>
        </div>
      </div>

      <Button 
        onClick={() => handleMarkAsPaid('upi')}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        size="lg"
      >
        Mark as Paid
      </Button>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="space-y-6 text-center py-8 p-2">
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h2>
        <p className="text-muted-foreground">
          The order for {tableNumber ? `Table ${tableNumber}` : 'POS'} is now complete.
        </p>
      </div>

      <Button 
        onClick={onClose}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        size="lg"
      >
        Close
      </Button>
    </div>
  );

  const renderEditStep = () => (
    <div className="space-y-4 p-2">
      <Button
        variant="ghost"
        onClick={() => setCurrentStep('confirm')}
        className="mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Order
      </Button>

      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-foreground mb-1">Edit Order</h2>
        <p className="text-sm text-muted-foreground">
          Add new items to {tableNumber ? `Table ${tableNumber}` : 'this order'}
        </p>
      </div>

      {/* Previously Sent Items */}
      <Card className="p-4 bg-muted/30">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Receipt className="w-4 h-4" />
          Previously Sent Items
        </h3>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {orderItems.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex-1">{item.quantity}x {item.name}</span>
              <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveExistingItem(idx)}
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* New Items to Add */}
      {newItemsBuffer.length > 0 && (
        <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-green-700 dark:text-green-400">
            <Plus className="w-4 h-4" />
            New Items to Add
          </h3>
          <div className="space-y-3 max-h-40 overflow-y-auto">
            {newItemsBuffer.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2">
                <span className="text-sm flex-1">{item.name}</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateNewItemQuantity(item.id, item.quantity - 1)}
                    className="h-7 w-7 p-0"
                  >
                    -
                  </Button>
                  <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateNewItemQuantity(item.id, item.quantity + 1)}
                    className="h-7 w-7 p-0"
                  >
                    +
                  </Button>
                  <span className="text-sm font-medium w-16 text-right">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveNewItem(item.id)}
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Search Menu Items */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={menuSearchQuery}
            onChange={(e) => setMenuSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Menu Items List */}
        <Card className="max-h-64 overflow-y-auto">
          <div className="p-2 space-y-1">
            {filteredMenuItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {menuSearchQuery ? 'No items found matching your search' : 'No menu items available'}
              </p>
            ) : (
              filteredMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddMenuItem(item)}
                  className="w-full flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors text-left"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    {item.category && (
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">₹{item.price.toFixed(2)}</span>
                    <Plus className="w-4 h-4 text-green-600" />
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 space-y-2">
        <Button 
          onClick={handleSaveNewItems}
          disabled={newItemsBuffer.length === 0}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          size="lg"
        >
          <Check className="w-4 h-4 mr-2" />
          Save & Send New Items to Kitchen
        </Button>
        <Button 
          onClick={() => setCurrentStep('confirm')}
          variant="outline"
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <VisuallyHidden>
          <DialogTitle>
            {currentStep === 'confirm' && 'Confirm Order'}
            {currentStep === 'method' && 'Select Payment Method'}
            {currentStep === 'qr' && 'UPI Payment'}
            {currentStep === 'success' && 'Payment Successful'}
            {currentStep === 'edit' && 'Edit Order'}
          </DialogTitle>
        </VisuallyHidden>
        {currentStep === 'confirm' && renderConfirmStep()}
        {currentStep === 'method' && renderMethodStep()}
        {currentStep === 'qr' && renderQRStep()}
        {currentStep === 'success' && renderSuccessStep()}
        {currentStep === 'edit' && renderEditStep()}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
