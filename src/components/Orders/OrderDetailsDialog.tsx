
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Printer, Edit, DollarSign, Check, Percent, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import AddOrderForm from "./AddOrderForm";
import { Order } from "@/types/orders";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import PaymentMethodSelector from "../Shared/PaymentMethodSelector";

interface OrderItem {
  name: string;
  quantity: number;
  notes?: string[];
  price?: number;
}

interface OrderDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    source: string;
    status: string;
    items: OrderItem[];
    created_at: string;
  } | null;
  onPrintBill?: () => void;
  onEditOrder?: (orderId: string) => void;
}

const OrderDetailsDialog = ({ isOpen, onClose, order, onPrintBill, onEditOrder }: OrderDetailsDialogProps) => {
  const { toast } = useToast();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [promotionCode, setPromotionCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
   const [paymentMethod, setPaymentMethod] = useState('cash');
    const [showQRPayment, setShowQRPayment] = useState(false);
  
  // Fetch promotions
  useQuery({
    queryKey: ["promotions"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();
      
      if (!userProfile?.restaurant_id) {
        throw new Error("No restaurant found");
      }

      const { data, error } = await supabase
        .from("promotion_campaigns")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id);
      
      if (error) throw error;
      setPromotions(data || []);
      return data;
    },
    enabled: isOpen
  });
  
  if (!order) return null;

  // Fetch the order details including discount info from orders table
  const { data: orderDetails } = useQuery({
    queryKey: ['order-details', order.id],
    queryFn: async () => {
      const { data: kitchenOrder } = await supabase
        .from('kitchen_orders')
        .select('order_id')
        .eq('id', order.id)
        .single();

      if (kitchenOrder?.order_id) {
        const { data } = await supabase
          .from('orders')
          .select('discount_amount, discount_percentage')
          .eq('id', kitchenOrder.order_id)
          .single();
        
        return data;
      }
      return null;
    },
    enabled: isOpen
  });

  // Calculate total - use the provided price from the item itself
  const subtotal = order.items.reduce((sum, item) => {
    // Make sure we're using the actual price from the menu item
    const price = item.price || 0;
    return sum + (item.quantity * price);
  }, 0);
  
  // Use saved discount if available, otherwise use manual discount
  const savedDiscountAmount = orderDetails?.discount_amount || 0;
  const savedDiscountPercent = orderDetails?.discount_percentage || 0;
  const effectiveDiscountPercent = savedDiscountAmount > 0 ? savedDiscountPercent : discountPercent;
  const effectiveDiscountAmount = savedDiscountAmount > 0 ? savedDiscountAmount : (subtotal * discountPercent) / 100;
  
  const total = subtotal - effectiveDiscountAmount;
  const tax = total * 0.08; // 8% tax
  const grandTotal = total + tax;
  const handleQRPayment = () => {
    setShowQRPayment(true);
    setPaymentMethod('qr');
  };
  const handlePrintBill = async () => {
    try {
      const element = document.getElementById('bill-content');
      if (!element) return;

      const canvas = await html2canvas(element);
      const pdf = new jsPDF();
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`order-bill-${order.id}.pdf`);

      toast({
        title: "Bill Printed",
        description: "The bill has been generated successfully",
      });
    } catch (error) {
      console.error('Error printing bill:', error);
      toast({
        variant: "destructive",
        title: "Print Failed",
        description: "Failed to print the bill",
      });
    }
  };

  const handleUpdateStatus = async (newStatus: 'completed' | 'pending' | 'preparing' | 'ready' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from("kitchen_orders")
        .update({ status: newStatus })
        .eq("id", order.id);
        
      if (error) throw error;
      
      toast({
        title: "Order Updated",
        description: `Order status updated to ${newStatus}`,
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update order status",
      });
    }
  };

  const handleProceedToPayment = () => {
    setShowPaymentDialog(true);
  };

  const handleOpenEditForm = () => {
    setShowEditForm(true);
  };

  const handlePromotionChange = (value: string) => {
    setSelectedPromotion(value);
    const selected = promotions.find(p => p.id === value);
    if (selected) {
      setDiscountPercent(selected.discount_percentage || 0);
      setPromotionCode(selected.promotion_code || "");
    }
  };

  // Convert the kitchen order to the format expected by AddOrderForm
  const prepareOrderForEdit = (): Order | null => {
    try {
      // Create a synthetic order object matching the Order interface
      return {
        id: order.id,
        customer_name: order.source,
        items: order.items.map(item => `${item.quantity}x ${item.name}`),
        total: subtotal,
        status: order.status as 'completed' | 'pending' | 'preparing' | 'ready' | 'cancelled',
        created_at: order.created_at,
        restaurant_id: "", // Will be filled by the form
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error preparing order for edit:', error);
      return null;
    }
  };

  const handleCompletePayment = async () => {
    if (!customerName.trim()) {
      toast({
        variant: "destructive",
        title: "Customer name required",
        description: "Please enter customer name to complete the payment",
      });
      return;
    }
    
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profile?.restaurant_id) {
        const { data: existingCustomers } = await supabase
          .from("customers")
          .select("id, total_spent, visit_count")
          .eq("restaurant_id", profile.restaurant_id)
          .eq("phone", customerPhone)
          .maybeSingle();

        const orderTotal = grandTotal;
        
        if (existingCustomers) {
          await supabase
            .from("customers")
            .update({
              name: customerName, // Update name in case it changed
              total_spent: existingCustomers.total_spent + orderTotal,
              visit_count: existingCustomers.visit_count + 1,
              last_visit_date: new Date().toISOString(),
              average_order_value: (existingCustomers.total_spent + orderTotal) / (existingCustomers.visit_count + 1)
            })
            .eq("id", existingCustomers.id);
          
          // Add activity for the customer
          await supabase.rpc("add_customer_activity", {
            customer_id_param: existingCustomers.id,
            restaurant_id_param: profile.restaurant_id,
            activity_type_param: "order_placed",
            description_param: `Placed order #${order.id} for ₹${orderTotal.toFixed(2)}`
          });
        } else if (customerPhone) {
          // Only create a new customer record if phone is provided
          const { data: newCustomer } = await supabase
            .from("customers")
            .insert({
              restaurant_id: profile.restaurant_id,
              name: customerName,
              phone: customerPhone,
              total_spent: orderTotal,
              visit_count: 1,
              average_order_value: orderTotal,
              last_visit_date: new Date().toISOString(),
              loyalty_points: 0,
              loyalty_tier: 'None',
              tags: []
            })
            .select()
            .single();
          
          if (newCustomer) {
            // Add activity for the new customer
            await supabase.rpc("add_customer_activity", {
              customer_id_param: newCustomer.id,
              restaurant_id_param: profile.restaurant_id,
              activity_type_param: "order_placed",
              description_param: `Placed first order #${order.id} for ₹${orderTotal.toFixed(2)}`
            });
          }
        }

        // Update order status to completed
        await handleUpdateStatus('completed');
      }

      toast({
        title: "Payment Successful",
        description: `Order for ${customerName} has been completed`,
      });
      
      setShowPaymentDialog(false);
      onClose();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: "There was an error processing the payment",
      });
    }
  };

  if (showEditForm) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {
        setShowEditForm(false);
        onClose();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <AddOrderForm 
            onSuccess={() => {
              setShowEditForm(false);
              onClose();
            }}
            onCancel={() => {
              setShowEditForm(false);
              onClose();
            }}
            editingOrder={prepareOrderForEdit()}
          />
        </DialogContent>
      </Dialog>
    );
  }

  if (showPaymentDialog) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Payment Processing
            </DialogTitle>
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            {/* Customer Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName" className="text-sm font-medium">Customer Name*</Label>
                <Input 
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone" className="text-sm font-medium">Customer Phone</Label>
                <Input 
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            
            {/* Order Summary Card */}
            <Card className="p-4 bg-gray-50 dark:bg-gray-800">
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Order Summary</h3>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">{item.quantity}x {item.name}</span>
                    <span className="font-medium">₹{item.price ? (item.price * item.quantity).toFixed(2) : '0.00'}</span>
                  </div>
                ))}
                
                <div className="border-t pt-3 mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  
                  {effectiveDiscountPercent > 0 && selectedPromotion && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Promo Discount ({promotions.find(p => p.id === selectedPromotion)?.name || 'Applied'})</span>
                      <span>-₹{effectiveDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {effectiveDiscountPercent > 0 && !selectedPromotion && savedDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount ({effectiveDiscountPercent}%)</span>
                      <span>-₹{effectiveDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {effectiveDiscountPercent > 0 && (
                    <div className="flex justify-between text-sm font-medium text-green-600">
                      <span>Total Discount</span>
                      <span>-₹{effectiveDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {/* <div className="flex justify-between text-sm text-gray-500">
                    <span> Service Tax (8%) </span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div> */}
                  
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total Due</span>
                    <span className="text-purple-600">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Promotion and Discount Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Apply Promotion</Label>
                <Select value={selectedPromotion} onValueChange={handlePromotionChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select promotion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_promo">No Promotion</SelectItem>
                    {promotions.map((promo) => (
                      <SelectItem key={promo.id} value={promo.id}>
                        {promo.name} ({promo.discount_percentage}% off)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor="discountPercent" className="text-sm font-medium">Custom Discount (%)</Label>
                  <Input
                    id="discountPercent"
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDiscountPercent(0)}
                >
                  <Percent className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Payment Method</Label>
                <Select defaultValue="cash">
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
                {/* <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onMethodChange={setPaymentMethod}
            onQRPayment={handleQRPayment}
          /> */}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrintBill}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Bill
                </Button>
                <Button 
                  onClick={handleCompletePayment}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Complete Payment
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-blue-600" />
            Order Details
          </DialogTitle>
          <DialogDescription>View and manage order details</DialogDescription>
        </DialogHeader>
        
        <div id="bill-content" className="space-y-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Order Information Card */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Order Information
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Order ID:</dt>
                  <dd className="font-mono">{order.id.slice(0, 8)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Source:</dt>
                  <dd className="capitalize">{order.source}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Status:</dt>
                  <dd className="capitalize">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Created:</dt>
                  <dd>{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</dd>
                </div>
              </dl>
            </Card>

            {/* Items Card */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Items
              </h3>
              <div className="max-h-48 overflow-y-auto">
                <ul className="space-y-2">
                  {order.items.map((item, index) => (
                    <li key={index} className="flex justify-between text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <span className="flex-1">{item.quantity}x {item.name}</span>
                      <span className="font-medium text-purple-600">₹{item.price ? (item.quantity * item.price).toFixed(2) : '0.00'}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-purple-600">₹{subtotal.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-end gap-3 mt-6 pt-4 border-t">
          {order.status === "new" && (
            <Button variant="outline" className="bg-blue-50 text-blue-600 hover:bg-blue-100" onClick={() => handleUpdateStatus("preparing")}>
              <Edit className="w-4 h-4 mr-2" />
              Mark Preparing
            </Button>
          )}
          
          {order.status === "preparing" && (
            <Button variant="outline" className="bg-green-50 text-green-600 hover:bg-green-100" onClick={() => handleUpdateStatus("ready")}>
              <Check className="w-4 h-4 mr-2" />
              Mark Ready
            </Button>
          )}
          
          {order.status === "ready" && (
            <Button 
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleProceedToPayment}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Proceed to Payment
            </Button>
          )}
          
          <Button variant="outline" onClick={handleOpenEditForm}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Order
          </Button>
          
          <Button variant="outline" onClick={handlePrintBill}>
            <Printer className="w-4 h-4 mr-2" />
            Print Bill
          </Button>
          
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsDialog;
