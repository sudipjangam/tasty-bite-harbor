
import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import Watermark from "@/components/Layout/Watermark";

type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  reorder_level: number | null;
  cost_per_unit: number | null;
  restaurant_id: string;
  category: string;
};

interface ReportExportProps {
  items: InventoryItem[];
  title?: string;
}

const ReportExport: React.FC<ReportExportProps> = ({ items, title = "Inventory Report" }) => {
  const { toast } = useToast();

  const exportToExcel = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(
        items.map(item => ({
          "Item Name": item.name,
          "Category": item.category,
          "Quantity": item.quantity,
          "Unit": item.unit,
          "Reorder Level": item.reorder_level || "N/A",
          "Cost Per Unit": item.cost_per_unit ? `₹${item.cost_per_unit}` : "N/A",
          "Total Value": item.cost_per_unit ? `₹${(item.quantity * item.cost_per_unit).toFixed(2)}` : "N/A",
          "Status": item.reorder_level && item.quantity <= item.reorder_level ? "Low Stock" : "In Stock"
        }))
      );
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
      
      // Generate filename with date
      const fileName = `${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Excel Export Successful",
        description: `Report saved as ${fileName}`,
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Export Failed",
        description: "Could not export to Excel. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const exportToPDF = () => {
    try {
      // Create a new PDF document
      const doc = new jsPDF();
      
      // Set up document properties
      doc.setProperties({
        title: title,
        author: 'Restaurant Management System',
        creator: 'Swadeshi Solutions',
        subject: 'Inventory Report',
      });
      
      // Add header with logo (simulated with text for now)
      doc.setFillColor(0, 179, 167); // Teal color for header
      doc.rect(0, 0, 210, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("BUSINESS REPORT", 14, 14);
      
      // Add title
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.text(title, 14, 30);
      
      // Add date
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 14, 38);
      
      // Add summary section
      doc.setFillColor(240, 240, 240);
      doc.rect(14, 44, 182, 25, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("Summary", 18, 52);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      // Calculate summary statistics
      const totalItems = items.length;
      const totalValue = items.reduce((sum, item) => 
        sum + (item.cost_per_unit ? item.quantity * item.cost_per_unit : 0), 0);
      const lowStockItems = items.filter(item => 
        item.reorder_level && item.quantity <= item.reorder_level).length;
      
      doc.text(`Total Items: ${totalItems}`, 18, 60);
      doc.text(`Total Value: ₹${totalValue.toFixed(2)}`, 70, 60);
      doc.text(`Low Stock Items: ${lowStockItems}`, 140, 60);
      
      // Add categories breakdown
      const categories = {};
      items.forEach(item => {
        if (!categories[item.category]) {
          categories[item.category] = 0;
        }
        categories[item.category]++;
      });
      
      // Prepare data for table
      const tableColumn = [
        "Item Name", 
        "Category", 
        "Quantity", 
        "Unit", 
        "Reorder Level", 
        "Cost Per Unit", 
        "Total Value", 
        "Status"
      ];
      
      const tableRows = items.map(item => [
        item.name,
        item.category,
        item.quantity.toString(),
        item.unit,
        item.reorder_level ? item.reorder_level.toString() : "N/A",
        item.cost_per_unit ? `₹${item.cost_per_unit}` : "N/A",
        item.cost_per_unit ? `₹${(item.quantity * item.cost_per_unit).toFixed(2)}` : "N/A",
        item.reorder_level && item.quantity <= item.reorder_level ? "Low Stock" : "In Stock"
      ]);
      
      // Use autoTable directly
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 75,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1 },
        headStyles: { fillColor: [0, 179, 167], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        didParseCell: (data) => {
          // Check if the cell is in the "Status" column and has "Low Stock" value
          if (data.section === 'body' && data.column.index === 7 && data.cell.raw === "Low Stock") {
            data.cell.styles.textColor = [220, 53, 69]; // Red color for low stock
          }
        }
      });
      
      // Add watermark
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Powered by Swadeshi Solutions", 170, 285, { align: 'right' });
        doc.setFontSize(10);
        doc.text(`${i} / ${pageCount}`, 100, 285, { align: 'center' });
      }
      
      // Generate filename with date
      const fileName = `${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      
      doc.save(fileName);
      
      toast({
        title: "PDF Export Successful",
        description: `Report saved as ${fileName}`,
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Export Failed",
        description: "Could not export to PDF. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 border-green-500 text-green-700 hover:bg-green-50"
        onClick={exportToExcel}
      >
        <FileSpreadsheet className="h-4 w-4" />
        <span className="hidden sm:inline">Export to Excel</span>
        <span className="inline sm:hidden">Excel</span>
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 border-red-500 text-red-700 hover:bg-red-50"
        onClick={exportToPDF}
      >
        <FileText className="h-4 w-4" />
        <span className="hidden sm:inline">Export to PDF</span>
        <span className="inline sm:hidden">PDF</span>
      </Button>
    </div>
  );
};

export default ReportExport;
