
import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import Watermark from "@/components/Layout/Watermark";

interface BusinessReportData {
  expenseData: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  peakHoursData: Array<{
    hour: string;
    customers: number;
  }>;
  promotionalData: Array<{
    id: number;
    name: string;
    timePeriod: string;
    potentialIncrease: string;
    status: string;
  }>;
  insights: Array<{
    type: string;
    title: string;
    message: string;
  }>;
  totalOperationalCost: number;
  staffData: Array<any>;
}

interface BusinessReportExportProps {
  data: BusinessReportData;
  title?: string;
}

const BusinessReportExport: React.FC<BusinessReportExportProps> = ({ 
  data, 
  title = "Business Intelligence Report" 
}) => {
  const { toast } = useToast();

  const exportToExcel = () => {
    try {
      // Create workbook and worksheets
      const workbook = XLSX.utils.book_new();
      
      // Expense data worksheet
      const expenseWorksheet = XLSX.utils.json_to_sheet(
        data.expenseData.map(item => ({
          "Category": item.name,
          "Amount (₹)": item.value,
          "Percentage": `${item.percentage}%`
        }))
      );
      XLSX.utils.book_append_sheet(workbook, expenseWorksheet, "Expenses");
      
      // Peak hours worksheet
      const peakHoursWorksheet = XLSX.utils.json_to_sheet(
        data.peakHoursData.map(item => ({
          "Hour": item.hour,
          "Customer Count": item.customers
        }))
      );
      XLSX.utils.book_append_sheet(workbook, peakHoursWorksheet, "Peak Hours");
      
      // Promotions worksheet
      const promotionsWorksheet = XLSX.utils.json_to_sheet(
        data.promotionalData.map(item => ({
          "Promotion": item.name,
          "Time Period": item.timePeriod,
          "Potential Increase": item.potentialIncrease,
          "Status": item.status
        }))
      );
      XLSX.utils.book_append_sheet(workbook, promotionsWorksheet, "Promotions");
      
      // Insights worksheet
      const insightsWorksheet = XLSX.utils.json_to_sheet(
        data.insights.map(item => ({
          "Category": item.type,
          "Title": item.title,
          "Details": item.message
        }))
      );
      XLSX.utils.book_append_sheet(workbook, insightsWorksheet, "Insights");
      
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
        subject: 'Business Intelligence Report',
      });
      
      // Add header with logo (simulated with text for now)
      doc.setFillColor(0, 179, 167); // Teal color for header
      doc.rect(0, 0, 210, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("BUSINESS INTELLIGENCE REPORT", 14, 14);
      
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
      const totalOperationalCost = data.totalOperationalCost;
      const peakHour = [...data.peakHoursData].sort((a, b) => b.customers - a.customers)[0]?.hour || "N/A";
      const suggestedPromotions = data.promotionalData.filter(p => p.status === "suggested").length;
      
      doc.text(`Total Operational Cost: ₹${totalOperationalCost.toFixed(2)}`, 18, 60);
      doc.text(`Peak Hour: ${peakHour}`, 100, 60);
      doc.text(`Suggested Promotions: ${suggestedPromotions}`, 140, 60);
      
      // Add expenses table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("Expense Breakdown", 14, 80);
      
      autoTable(doc, {
        head: [["Category", "Amount (₹)", "Percentage"]],
        body: data.expenseData.map(item => [
          item.name,
          item.value.toLocaleString(),
          `${item.percentage}%`
        ]),
        startY: 85,
        theme: 'grid',
        headStyles: { fillColor: [0, 179, 167], textColor: 255 }
      });
      
      // Add peak hours table
      const peakHoursY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("Peak Hours Analysis", 14, peakHoursY);
      
      autoTable(doc, {
        head: [["Hour", "Customer Count"]],
        body: data.peakHoursData.map(item => [
          item.hour,
          item.customers.toString()
        ]),
        startY: peakHoursY + 5,
        theme: 'grid',
        headStyles: { fillColor: [0, 179, 167], textColor: 255 }
      });
      
      // Add a new page for more content
      doc.addPage();
      
      // Add promotions table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("Promotional Opportunities", 14, 20);
      
      autoTable(doc, {
        head: [["Promotion", "Time Period", "Potential Increase", "Status"]],
        body: data.promotionalData.map(item => [
          item.name,
          item.timePeriod,
          item.potentialIncrease,
          item.status.charAt(0).toUpperCase() + item.status.slice(1)
        ]),
        startY: 25,
        theme: 'grid',
        headStyles: { fillColor: [0, 179, 167], textColor: 255 }
      });
      
      // Add insights section
      const insightsY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("Smart Insights", 14, insightsY);
      
      const insights = data.insights.map(item => [
        item.type.charAt(0).toUpperCase() + item.type.slice(1),
        item.title,
        item.message
      ]);
      
      autoTable(doc, {
        head: [["Category", "Title", "Details"]],
        body: insights,
        startY: insightsY + 5,
        theme: 'grid',
        headStyles: { fillColor: [0, 179, 167], textColor: 255 }
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
        className="flex items-center gap-2 border-green-500 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/30 dark:text-green-400 dark:border-green-700"
        onClick={exportToExcel}
      >
        <FileSpreadsheet className="h-4 w-4" />
        <span className="hidden sm:inline">Export to Excel</span>
        <span className="inline sm:hidden">Excel</span>
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 border-red-500 text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 dark:text-red-400 dark:border-red-700"
        onClick={exportToPDF}
      >
        <FileText className="h-4 w-4" />
        <span className="hidden sm:inline">Export to PDF</span>
        <span className="inline sm:hidden">PDF</span>
      </Button>
    </div>
  );
};

export default BusinessReportExport;
