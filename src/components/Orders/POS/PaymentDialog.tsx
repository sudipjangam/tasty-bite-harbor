
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Printer, DollarSign, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { OrderItem } from "@/types/orders";

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderItems: OrderItem[];
  onSuccess: () => void;
}

const PaymentDialog = ({ isOpen, onClose, orderItems, onSuccess }: PaymentDialogProps) => {
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.10; // 10% tax
  const total = subtotal + tax;

  const handlePrintBill = async () => {
    try {
      const element = document.getElementById('payment-summary');
      if (!element) return;

      const canvas = await html2canvas(element);
      const pdf = new jsPDF();
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`bill-${Date.now()}.pdf`);

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

        const orderTotal = total;
        
        if (existingCustomers) {
          // Update existing customer
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
            description_param: `Placed order for ₹${orderTotal.toFixed(2)}`
          });
        } else if (customerPhone) {
          // Only create a new customer if phone is provided
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
              description_param: `Placed first order for ₹${orderTotal.toFixed(2)}`
            });
          }
        }
      }
    } catch (error) {
      console.error("Error saving customer data:", error);
    }
    
    handlePrintBill();
    toast({
      title: "Payment Successful",
      description: `Order for ${customerName} has been completed`,
    });
    onSuccess();
  };

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
          <Card id="payment-summary" className="p-4 bg-gray-50 dark:bg-gray-800">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Order Summary</h3>
            <div className="space-y-2">
              {orderItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{item.quantity}x {item.name}</span>
                  <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              
              <div className="border-t pt-3 mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Tax (10%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span className="text-purple-600">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Payment Method */}
          <div>
            <Label className="text-sm font-medium">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
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
};

export default PaymentDialog;
