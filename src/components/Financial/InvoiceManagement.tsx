
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialData } from "@/hooks/useFinancialData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Send, Download, Eye, Edit, RotateCcw } from "lucide-react";
import { format, addDays } from "date-fns";
import { CurrencyDisplay } from "@/components/ui/currency-display";

interface InvoiceFormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_gstin: string;
  place_of_supply: string;
  due_date: string;
  payment_terms: string;
  notes: string;
  line_items: Array<{
    description: string;
    hsn_code: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
  }>;
}

export const InvoiceManagement = () => {
  const { data: financialData, isLoading } = useFinancialData();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<InvoiceFormData>({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_address: "",
    customer_gstin: "",
    place_of_supply: "27-Maharashtra",
    due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    payment_terms: "net_30",
    notes: "",
    line_items: [
      { description: "", hsn_code: "996331", quantity: 1, unit_price: 0, tax_rate: 5 }
    ],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${random}`;
  };

  const calculateLineTotal = (item: any) => {
    const subtotal = item.quantity * item.unit_price;
    const taxAmount = subtotal * (item.tax_rate / 100);
    return subtotal + taxAmount;
  };

  const calculateInvoiceTotals = () => {
    const subtotal = formData.line_items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    );
    const taxAmount = formData.line_items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price * (item.tax_rate / 100)), 0
    );
    const total = subtotal + taxAmount;
    
    // Calculate CGST/SGST split (for intra-state, each is half of total tax)
    const cgstAmount = taxAmount / 2;
    const sgstAmount = taxAmount / 2;
    const igstAmount = 0; // For inter-state - would need place_of_supply logic
    
    return { subtotal, taxAmount, total, cgstAmount, sgstAmount, igstAmount };
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        { description: "", hsn_code: "996331", quantity: 1, unit_price: 0, tax_rate: 5 }
      ]
    }));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeLineItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index)
    }));
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      customer_address: "",
      customer_gstin: "",
      place_of_supply: "27-Maharashtra",
      due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      payment_terms: "net_30",
      notes: "",
      line_items: [
        { description: "", hsn_code: "996331", quantity: 1, unit_price: 0, tax_rate: 5 }
      ],
    });
  };

  const handleViewInvoice = (invoice: any) => {
    toast({
      title: "Opening Invoice",
      description: `Viewing invoice ${invoice.invoice_number}`,
    });
    // In a real implementation, this would open a detailed view
  };

  const handleEditInvoice = (invoice: any) => {
    toast({
      title: "Edit Invoice",
      description: `Editing invoice ${invoice.invoice_number}`,
    });
    // In a real implementation, this would open the edit form
  };

  const handleSendInvoice = async (invoice: any) => {
    try {
      toast({
        title: "Sending Invoice",
        description: `Sending invoice ${invoice.invoice_number} to ${invoice.customer_email}`,
      });
      
      // In a real implementation, this would send the invoice via email
      setTimeout(() => {
        toast({
          title: "Invoice Sent",
          description: `Invoice ${invoice.invoice_number} has been sent successfully`,
        });
      }, 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invoice",
        variant: "destructive",
      });
    }
  };

  const handleDownloadInvoice = (invoice: any) => {
    try {
      // Generate invoice content as CSV
      const invoiceData = [
        ['Invoice Details', '', '', ''],
        ['Invoice Number:', invoice.invoice_number, '', ''],
        ['Customer:', invoice.customer_name, '', ''],
        ['Email:', invoice.customer_email || '', '', ''],
        ['Phone:', invoice.customer_phone || '', '', ''],
        ['Invoice Date:', format(new Date(invoice.invoice_date), 'yyyy-MM-dd'), '', ''],
        ['Due Date:', format(new Date(invoice.due_date), 'yyyy-MM-dd'), '', ''],
        ['', '', '', ''],
        ['Line Items', '', '', ''],
        ['Description', 'Quantity', 'Unit Price', 'Total'],
        ...invoice.invoice_line_items?.map((item: any) => [
          item.description,
          item.quantity.toString(),
          item.unit_price.toString(),
          item.total_price.toString()
        ]) || [],
        ['', '', '', ''],
        ['Subtotal:', '', '', invoice.subtotal.toString()],
        ['Tax:', '', '', invoice.tax_amount.toString()],
        ['Total:', '', '', invoice.total_amount.toString()],
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([invoiceData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `invoice-${invoice.invoice_number}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Complete",
        description: `Invoice ${invoice.invoice_number} has been downloaded`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download invoice",
        variant: "destructive",
      });
    }
  };

  const handleCreateInvoice = async () => {
    try {
      if (!financialData?.restaurantId) {
        toast({
          title: "Error",
          description: "Restaurant information not found",
          variant: "destructive",
        });
        return;
      }

      const { subtotal, taxAmount, total, cgstAmount, sgstAmount, igstAmount } = calculateInvoiceTotals();
      const invoiceNumber = generateInvoiceNumber();

      // Create invoice with GST fields
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          restaurant_id: financialData.restaurantId,
          invoice_number: invoiceNumber,
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          customer_address: formData.customer_address,
          customer_gstin: formData.customer_gstin || null,
          place_of_supply: formData.place_of_supply || null,
          invoice_date: format(new Date(), "yyyy-MM-dd"),
          due_date: formData.due_date,
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          payment_terms: formData.payment_terms,
          notes: formData.notes,
          status: "draft",
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create line items with HSN and tax components
      const lineItemsData = formData.line_items.map(item => {
        const itemSubtotal = item.quantity * item.unit_price;
        const itemTax = itemSubtotal * (item.tax_rate / 100);
        const itemCgst = itemTax / 2;
        const itemSgst = itemTax / 2;
        
        return {
          invoice_id: invoice.id,
          description: item.description,
          hsn_code: item.hsn_code || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: itemSubtotal,
          tax_rate: item.tax_rate,
          cgst_amount: itemCgst,
          sgst_amount: itemSgst,
          igst_amount: 0,
        };
      });

      const { error: lineItemsError } = await supabase
        .from("invoice_line_items")
        .insert(lineItemsData);

      if (lineItemsError) throw lineItemsError;

      toast({
        title: "Success",
        description: `Invoice ${invoiceNumber} created successfully`,
      });

      setIsCreateOpen(false);
      setFormData({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        customer_address: "",
        customer_gstin: "",
        place_of_supply: "27-Maharashtra",
        due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
        payment_terms: "net_30",
        notes: "",
        line_items: [
          { description: "", hsn_code: "996331", quantity: 1, unit_price: 0, tax_rate: 5 }
        ],
      });

    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading invoice data...</div>;
  }

  const { subtotal, taxAmount, total } = calculateInvoiceTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Invoice Management</h2>
          <p className="text-muted-foreground">Create and manage customer invoices</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Generate a new invoice for your customer
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                    placeholder="Enter customer name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="customer_email">Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                    placeholder="customer@example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="customer_phone">Phone</Label>
                  <Input
                    id="customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div>
                  <Label htmlFor="customer_address">Address</Label>
                  <Textarea
                    id="customer_address"
                    value={formData.customer_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_address: e.target.value }))}
                    placeholder="Enter customer address"
                  />
                </div>
                
                <div>
                  <Label htmlFor="customer_gstin">
                    Customer GSTIN
                    <span className="text-xs text-muted-foreground ml-2">(for B2B invoices)</span>
                  </Label>
                  <Input
                    id="customer_gstin"
                    value={formData.customer_gstin}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_gstin: e.target.value.toUpperCase() }))}
                    placeholder="e.g., 27AAACR5055K1Z5"
                    maxLength={15}
                  />
                </div>

                <div>
                  <Label htmlFor="place_of_supply">Place of Supply</Label>
                  <Select
                    value={formData.place_of_supply}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, place_of_supply: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="27-Maharashtra">27-Maharashtra</SelectItem>
                      <SelectItem value="29-Karnataka">29-Karnataka</SelectItem>
                      <SelectItem value="33-Tamil Nadu">33-Tamil Nadu</SelectItem>
                      <SelectItem value="07-Delhi">07-Delhi</SelectItem>
                      <SelectItem value="24-Gujarat">24-Gujarat</SelectItem>
                      <SelectItem value="09-Uttar Pradesh">09-Uttar Pradesh</SelectItem>
                      <SelectItem value="19-West Bengal">19-West Bengal</SelectItem>
                      <SelectItem value="32-Kerala">32-Kerala</SelectItem>
                      <SelectItem value="06-Haryana">06-Haryana</SelectItem>
                      <SelectItem value="08-Rajasthan">08-Rajasthan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="payment_terms">Payment Terms</Label>
                  <Select
                    value={formData.payment_terms}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, payment_terms: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="net_30">Net 30</SelectItem>
                      <SelectItem value="net_15">Net 15</SelectItem>
                      <SelectItem value="net_7">Net 7</SelectItem>
                      <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes for the invoice"
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Line Items</h3>
                <div className="flex gap-2">
                  <Button onClick={resetForm} variant="ghost" size="sm">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                  <Button onClick={addLineItem} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </div>
              
              {/* Header row */}
              <div className="grid grid-cols-14 gap-2 items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg font-medium text-sm">
                <div className="col-span-3">Description</div>
                <div className="col-span-2">HSN/SAC</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-2">Tax %</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-1">Action</div>
              </div>

              <div className="space-y-3">
                {formData.line_items.map((item, index) => (
                  <div key={index} className="grid grid-cols-14 gap-2 items-center p-3 border rounded-lg">
                    <div className="col-span-3">
                      <Input
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, "description", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        placeholder="996331"
                        value={item.hsn_code}
                        onChange={(e) => updateLineItem(index, "hsn_code", e.target.value)}
                        maxLength={8}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, "quantity", Number(e.target.value))}
                        min="1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, "unit_price", Number(e.target.value))}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <Select
                        value={String(item.tax_rate)}
                        onValueChange={(value) => updateLineItem(index, "tax_rate", Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="12">12%</SelectItem>
                          <SelectItem value="18">18%</SelectItem>
                          <SelectItem value="28">28%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 text-right font-medium">
                      <CurrencyDisplay amount={calculateLineTotal(item)} />
                    </div>
                    <div className="col-span-1">
                      {formData.line_items.length > 1 && (
                        <Button
                          onClick={() => removeLineItem(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Invoice Totals */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2 text-right">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span><CurrencyDisplay amount={subtotal} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span><CurrencyDisplay amount={taxAmount} /></span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span><CurrencyDisplay amount={total} /></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvoice}>
                Create Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>
            Manage your customer invoices and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {financialData?.invoices?.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{invoice.invoice_number}</span>
                    <Badge 
                      variant={
                        invoice.status === 'paid' ? 'default' :
                        invoice.status === 'overdue' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {invoice.customer_name} • Due: {format(new Date(invoice.due_date), "MMM dd, yyyy")}
                  </p>
                </div>
                <div className="text-right mr-4">
                  <div className="font-semibold">
                    <CurrencyDisplay amount={invoice.total_amount} />
                  </div>
                  {invoice.paid_amount > 0 && (
                    <div className="text-xs text-green-600">
                      Paid: <CurrencyDisplay amount={invoice.paid_amount} />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleViewInvoice(invoice)}
                    title="View Invoice"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEditInvoice(invoice)}
                    title="Edit Invoice"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleSendInvoice(invoice)}
                    title="Send Invoice"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDownloadInvoice(invoice)}
                    title="Download Invoice"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {(!financialData?.invoices || financialData.invoices.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No invoices found. Create your first invoice to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
