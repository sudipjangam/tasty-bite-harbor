
import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";

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
  const exportToExcel = () => {
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
  };
  
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    // Add date
    doc.setFontSize(11);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 14, 30);
    
    // Prepare data for table
    const tableColumn = ["Item Name", "Category", "Quantity", "Unit", "Reorder Level", "Cost Per Unit", "Total Value", "Status"];
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
    
    // @ts-ignore - jspdf-autotable types are not properly recognized
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1 },
      headStyles: { fillColor: [128, 0, 128], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      rowStyles: row => {
        if (row.raw[7] === "Low Stock") {
          return { textColor: [220, 53, 69] };
        }
        return {};
      }
    });
    
    // Generate filename with date
    const fileName = `${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    
    doc.save(fileName);
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
