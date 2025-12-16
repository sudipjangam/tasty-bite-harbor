import React, { useState } from "react";
import { ReportData } from "@/hooks/useReportsData";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { Download, FileSpreadsheet, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { useRestaurantId } from "@/hooks/useRestaurantId";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];
const ROWS_PER_PAGE = 10;

// Columns to hide (internal IDs not useful for users)
const HIDDEN_COLUMNS = ['id', 'restaurant_id', 'created_by', 'updated_at', 'created_at'];

interface ReportViewerProps {
  reports: ReportData[];
  dateRange?: DateRange;
}

// Helper to filter and format columns
const getDisplayColumns = (data: Record<string, unknown>[]) => {
  if (data.length === 0) return [];
  return Object.keys(data[0]).filter(key => 
    !HIDDEN_COLUMNS.includes(key.toLowerCase()) && 
    !key.toLowerCase().endsWith('_id')
  );
};

// Helper to format column names
const formatColumnName = (key: string) => {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/Id$/i, 'ID');
};

// Helper to format cell values
const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    // Format items array nicely
    return value.map(item => {
      if (typeof item === 'string') {
        try {
          const parsed = JSON.parse(item);
          return parsed.name ? `${parsed.quantity || 1}x ${parsed.name}` : item;
        } catch {
          return item;
        }
      }
      return item?.name ? `${item.quantity || 1}x ${item.name}` : JSON.stringify(item);
    }).join(', ');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value).substring(0, 100);
    } catch {
      return '-';
    }
  }
  return String(value).substring(0, 100);
};

const ReportViewer: React.FC<ReportViewerProps> = ({ reports, dateRange }) => {
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const { restaurantName } = useRestaurantId();

  const getCurrentPage = (category: string) => currentPages[category] || 1;
  
  const setPage = (category: string, page: number) => {
    setCurrentPages(prev => ({ ...prev, [category]: page }));
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // ===== COVER PAGE =====
      // Header gradient-like effect
      doc.setFillColor(6, 78, 59); // Dark teal
      doc.rect(0, 0, pageWidth, 60, 'F');
      doc.setFillColor(0, 179, 167); // Lighter teal
      doc.rect(0, 55, pageWidth, 5, 'F');
      
      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text("BUSINESS REPORT", pageWidth / 2, 30, { align: 'center' });
      
      // Subtitle - Swadeshi Solutions branding
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text("Powered by Swadeshi Solutions", pageWidth / 2, 45, { align: 'center' });
      
      // Restaurant Info Card
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 70, pageWidth - 28, 40, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 70, pageWidth - 28, 40, 3, 3, 'S');
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(restaurantName || 'Restaurant', 20, 85);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const dateText = dateRange?.from && dateRange?.to 
        ? `Report Period: ${format(dateRange.from, 'MMMM dd, yyyy')} - ${format(dateRange.to, 'MMMM dd, yyyy')}`
        : `Generated: ${format(new Date(), 'MMMM dd, yyyy')}`;
      doc.text(dateText, 20, 95);
      doc.text(`Report Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, 20, 103);
      
      // Report Contents Summary
      doc.setFillColor(0, 179, 167);
      doc.roundedRect(14, 120, pageWidth - 28, 10, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text("REPORT CONTENTS", 20, 127);
      
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      let tocY = 140;
      reports.forEach((report, idx) => {
        doc.text(`${idx + 1}. ${report.title}`, 20, tocY);
        tocY += 7;
      });
      
      // Try to capture charts from the DOM
      const chartElements = document.querySelectorAll('.recharts-responsive-container');
      const chartImages: string[] = [];
      
      if (chartElements.length > 0) {
        const html2canvas = (await import('html2canvas')).default;
        for (const chartEl of Array.from(chartElements).slice(0, reports.length)) {
          try {
            const canvas = await html2canvas(chartEl as HTMLElement, { 
              backgroundColor: '#ffffff',
              scale: 2,
            });
            chartImages.push(canvas.toDataURL('image/png'));
          } catch (e) {
            console.log('Chart capture failed:', e);
          }
        }
      }
      
      // ===== REPORT PAGES =====
      let chartIndex = 0;
      for (const report of reports) {
        doc.addPage();
        let yPos = 20;
        
        // Section Header
        doc.setFillColor(6, 78, 59);
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(report.title, pageWidth / 2, 15, { align: 'center' });
        
        yPos = 35;
        
        // KPI Summary Cards (horizontal layout)
        const summaryEntries = Object.entries(report.summary);
        const cardWidth = (pageWidth - 28 - (summaryEntries.length - 1) * 4) / summaryEntries.length;
        
        summaryEntries.forEach(([key, value], idx) => {
          const xPos = 14 + idx * (cardWidth + 4);
          
          // Card background
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(xPos, yPos, cardWidth, 25, 2, 2, 'F');
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(xPos, yPos, cardWidth, 25, 2, 2, 'S');
          
          // Label
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(key, xPos + 3, yPos + 8);
          
          // Value
          doc.setTextColor(15, 23, 42);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          const valueStr = String(value);
          doc.text(valueStr.length > 15 ? valueStr.substring(0, 15) + '...' : valueStr, xPos + 3, yPos + 18);
        });
        
        yPos += 35;
        
        // Chart Image (if available)
        if (chartImages[chartIndex]) {
          try {
            const imgWidth = pageWidth - 28;
            const imgHeight = 60;
            doc.addImage(chartImages[chartIndex], 'PNG', 14, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 10;
          } catch (e) {
            console.log('Failed to add chart image:', e);
          }
        }
        chartIndex++;
        
        // Data Table
        if (report.tableData.length > 0) {
          const columns = getDisplayColumns(report.tableData as Record<string, unknown>[]).slice(0, 6);
          const rows = report.tableData.slice(0, 30).map(row => 
            columns.map(col => {
              const val = formatCellValue((row as Record<string, unknown>)[col]);
              return val.length > 25 ? val.substring(0, 25) + '...' : val;
            })
          );
          
          autoTable(doc, {
            head: [columns.map(formatColumnName)],
            body: rows,
            startY: yPos,
            theme: 'striped',
            styles: { 
              fontSize: 8, 
              cellPadding: 3,
              lineColor: [226, 232, 240],
            },
            headStyles: { 
              fillColor: [6, 78, 59], 
              textColor: 255,
              fontStyle: 'bold',
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252],
            },
            margin: { left: 14, right: 14 },
          });
          
          // Show row count
          const finalY = (doc as any).lastAutoTable?.finalY || yPos;
          if (report.tableData.length > 30) {
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`Showing 30 of ${report.tableData.length} rows`, 14, finalY + 6);
          }
        }
      }
      
      // ===== FOOTER ON ALL PAGES =====
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Footer line
        doc.setDrawColor(226, 232, 240);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
        
        // Footer text
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Business Report by Swadeshi Solutions`, 14, pageHeight - 8);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
      }
      
      const fileName = `${restaurantName || 'Business'}_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      toast({ title: "PDF exported successfully", description: fileName });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async () => {
    setExporting('excel');
    try {
      const wb = XLSX.utils.book_new();
      
      reports.forEach((report, index) => {
        const displayColumns = getDisplayColumns(report.tableData as Record<string, unknown>[]);
        
        const wsData: unknown[][] = [
          [report.title],
          [],
          ['Summary'],
          ...Object.entries(report.summary).map(([k, v]) => [k, v]),
          [],
          ['Data'],
        ];
        
        if (report.tableData.length > 0) {
          wsData.push(displayColumns.map(formatColumnName));
          report.tableData.forEach(row => {
            wsData.push(displayColumns.map(h => formatCellValue((row as Record<string, unknown>)[h])));
          });
        }
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const sheetName = report.category.substring(0, 31).replace(/[/\\?*[\]]/g, '');
        XLSX.utils.book_append_sheet(wb, ws, sheetName || `Sheet${index + 1}`);
      });
      
      XLSX.writeFile(wb, `Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast({ title: "Excel exported successfully" });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export buttons */}
      <div className="flex justify-end gap-2">
        <StandardizedButton 
          variant="secondary" 
          onClick={handleExportPDF}
          disabled={exporting !== null}
        >
          {exporting === 'pdf' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Export PDF
        </StandardizedButton>
        <StandardizedButton 
          variant="secondary" 
          onClick={handleExportExcel}
          disabled={exporting !== null}
        >
          {exporting === 'excel' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
          Export Excel
        </StandardizedButton>
      </div>

      {/* Reports */}
      {reports.map((report, index) => {
        const displayColumns = getDisplayColumns(report.tableData as Record<string, unknown>[]);
        const currentPage = getCurrentPage(report.category);
        const totalPages = Math.ceil(report.tableData.length / ROWS_PER_PAGE);
        const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
        const endIdx = startIdx + ROWS_PER_PAGE;
        const paginatedData = report.tableData.slice(startIdx, endIdx);

        return (
          <StandardizedCard key={`${report.category}-${index}`} className="p-6">
            <h3 className="text-lg font-semibold mb-4">{report.title}</h3>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(report.summary).map(([key, value]) => (
                <div key={key} className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{key}</p>
                  <p className="text-lg font-semibold">{value}</p>
                </div>
              ))}
            </div>

            {/* Chart */}
            {report.chartData && report.chartData.length > 0 && (
              <div className="mb-6">
                <ResponsiveContainer width="100%" height={250}>
                  {report.chartData.length <= 6 ? (
                    <PieChart>
                      <Pie
                        data={report.chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${typeof value === 'number' ? value.toLocaleString() : value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {report.chartData.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  ) : (
                    <BarChart data={report.chartData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0088FE" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}

            {/* Data Table with Pagination */}
            {report.tableData.length > 0 && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {displayColumns.slice(0, 8).map((key) => (
                          <th key={key} className="text-left p-2 font-medium whitespace-nowrap">
                            {formatColumnName(key)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((row, i) => (
                        <tr key={i} className="border-b hover:bg-muted/30">
                          {displayColumns.slice(0, 8).map((key, j) => (
                            <td key={`${i}-${j}`} className="p-2 max-w-[200px] truncate">
                              {formatCellValue((row as Record<string, unknown>)[key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {startIdx + 1}-{Math.min(endIdx, report.tableData.length)} of {report.tableData.length} rows
                    </p>
                    <div className="flex items-center gap-2">
                      <StandardizedButton
                        variant="secondary"
                        size="sm"
                        onClick={() => setPage(report.category, currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </StandardizedButton>
                      <span className="text-sm px-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      <StandardizedButton
                        variant="secondary"
                        size="sm"
                        onClick={() => setPage(report.category, currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </StandardizedButton>
                    </div>
                  </div>
                )}
              </div>
            )}
          </StandardizedCard>
        );
      })}
    </div>
  );
};

export default ReportViewer;

