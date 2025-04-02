
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Printer, FileDown, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import BillPrint from './BillPrint';

interface PrintBillButtonProps {
  restaurantName: string;
  restaurantAddress: string;
  customerName: string;
  customerPhone: string;
  roomName: string;
  checkInDate: string;
  checkOutDate: string;
  daysStayed: number;
  roomPrice: number;
  roomCharges: number;
  foodOrders: any[];
  additionalCharges: { name: string; amount: number; }[];
  serviceCharge: number;
  discount: number;
  grandTotal: number;
  paymentMethod: string;
  billId: string;
}

const PrintBillButton: React.FC<PrintBillButtonProps> = (props) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Format today's date for the bill
  const billDate = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date());

  const handlePrint = () => {
    setIsPrinting(true);
    
    // Small delay to ensure dialog is fully rendered
    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      
      if (printWindow && printRef.current) {
        printWindow.document.write('<html><head><title>Print Bill</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 5px; }
          th { text-align: left; }
          .border-b { border-bottom: 1px solid #e5e5e5; }
          .border-t { border-top: 1px solid #e5e5e5; }
          .border { border: 1px solid #e5e5e5; }
          .border-2 { border: 2px solid #999; }
          .rounded { border-radius: 0.375rem; }
          .bg-yellow-50 { background-color: #fefce8; }
          .bg-gray-50 { background-color: #f9fafb; }
          .font-bold { font-weight: bold; }
          .font-medium { font-weight: 500; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .text-green-600 { color: #059669; }
          .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
          .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
          .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
          .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
          .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
          .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
          .text-xs { font-size: 0.75rem; line-height: 1rem; }
          .mb-1 { margin-bottom: 0.25rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mb-4 { margin-bottom: 1rem; }
          .mb-6 { margin-bottom: 1.5rem; }
          .ml-4 { margin-left: 1rem; }
          .mt-4 { margin-top: 1rem; }
          .mt-6 { margin-top: 1.5rem; }
          .p-2 { padding: 0.5rem; }
          .p-4 { padding: 1rem; }
          .p-8 { padding: 2rem; }
          .pb-1 { padding-bottom: 0.25rem; }
          .pb-4 { padding-bottom: 1rem; }
          .pt-4 { padding-top: 1rem; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .gap-4 { gap: 1rem; }
          .list-disc { list-style-type: disc; }
          .list-inside { list-style-position: inside; }
          .align-top { vertical-align: top; }
        `);
        printWindow.document.write('</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printRef.current.outerHTML);
        printWindow.document.write('</body></html>');
        
        // Wait for content to load then print
        printWindow.document.close();
        printWindow.focus();
        
        // Print the window
        setTimeout(() => {
          printWindow.print();
          setIsPrinting(false);
          setShowPreview(false);
        }, 500);
      } else {
        setIsPrinting(false);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not open print window. Please try again.'
        });
      }
    }, 300);
  };

  const handleSavePDF = async () => {
    if (!printRef.current) return;
    
    setIsPrinting(true);
    
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgWidth = pdfWidth;
      const imgHeight = pdfWidth * ratio;
      
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, '', 'FAST');
      heightLeft -= pdfHeight;
      
      // Add new pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, '', 'FAST');
        heightLeft -= pdfHeight;
      }
      
      // Save PDF
      pdf.save(`Bill_${props.customerName}_${props.billId}.pdf`);
      
      toast({
        title: 'Success',
        description: 'PDF has been saved successfully'
      });
      
      setShowPreview(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.'
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full flex items-center justify-center gap-2"
        onClick={() => setShowPreview(true)}
      >
        <Printer className="h-4 w-4" />
        Print Bill
      </Button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Bill Preview</h2>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleSavePDF}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                Save as PDF
              </Button>
              <Button 
                onClick={handlePrint}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4 mr-2" />
                )}
                Print
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto border rounded-md p-2">
            <BillPrint
              ref={printRef}
              {...props}
              billDate={billDate}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PrintBillButton;
