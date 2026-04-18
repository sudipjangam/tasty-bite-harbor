import React, { useState, useMemo } from "react";
import { ReportData } from "@/hooks/useReportsData";
import { StandardizedButton } from "@/components/ui/standardized-button";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Presentation,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { sanitizeOrderItemDisplay } from "@/lib/order-utils";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { generateEditablePPTX, generateRichExcel } from "@/utils/exportUtils";

const COLORS = [
  "#f97316",
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
];
const ROWS_PER_PAGE = 10;

type SortDirection = "asc" | "desc" | null;
interface SortConfig {
  key: string;
  direction: SortDirection;
}

// Columns to hide (internal IDs not useful for users)
const HIDDEN_COLUMNS = [
  "id",
  "restaurant_id",
  "created_by",
  "updated_at",
  "created_at",
];

interface ReportViewerProps {
  reports: ReportData[];
  dateRange?: DateRange;
}

// Helper to filter and format columns
const getDisplayColumns = (data: Record<string, unknown>[]) => {
  if (data.length === 0) return [];
  return Object.keys(data[0]).filter(
    (key) =>
      !HIDDEN_COLUMNS.includes(key.toLowerCase()) &&
      !key.toLowerCase().endsWith("_id"),
  );
};

// Helper to format column names
const formatColumnName = (key: string) => {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/Id$/i, "ID");
};

// Helper to format cell values
const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number")
    return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    // Format items array nicely
    return value
      .map((item) => {
        if (typeof item === "string") {
          try {
            const parsed = JSON.parse(String(item));
            return `${parsed.quantity || 1}x ${sanitizeOrderItemDisplay(parsed.name)}`;
          } catch {
            return item;
          }
        }
        try {
          return `${item.quantity || 1}x ${sanitizeOrderItemDisplay(item.name)}`;
        } catch (e) {
          return JSON.stringify(item);
        }
      })
      .join(", ");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value).substring(0, 100);
    } catch {
      return "—";
    }
  }
  return String(value).substring(0, 100);
};

const ReportViewer: React.FC<ReportViewerProps> = ({ reports, dateRange }) => {
  const [exporting, setExporting] = useState<"pdf" | "excel" | "pptx" | null>(
    null,
  );
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({});
  const [sortConfigs, setSortConfigs] = useState<Record<string, SortConfig>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { restaurantName } = useRestaurantId();

  const getCurrentPage = (category: string) => currentPages[category] || 1;

  const setPage = (category: string, page: number) => {
    setCurrentPages((prev) => ({ ...prev, [category]: page }));
  };

  const handleSort = (category: string, key: string) => {
    setSortConfigs((prev) => {
      const current = prev[category];
      let newDirection: SortDirection = "asc";
      if (current?.key === key) {
        if (current.direction === "asc") newDirection = "desc";
        else if (current.direction === "desc") newDirection = null;
        else newDirection = "asc";
      }
      return { ...prev, [category]: { key, direction: newDirection } };
    });
    // Reset to page 1 on sort change
    setCurrentPages((prev) => ({ ...prev, [category]: 1 }));
  };

  const getSortedAndFilteredData = (
    data: Record<string, unknown>[],
    category: string,
    columns: string[],
  ) => {
    let filtered = data;
    const search = (searchTerms[category] || "").toLowerCase().trim();
    if (search) {
      filtered = data.filter((row) =>
        columns.some((col) => {
          const val = formatCellValue(row[col]);
          return val.toLowerCase().includes(search);
        }),
      );
    }

    const sortConfig = sortConfigs[category];
    if (sortConfig?.direction && sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        // Parse numbers from formatted strings like "₹24,158.7"
        const parseNum = (v: unknown): number | null => {
          if (typeof v === "number") return v;
          if (typeof v === "string") {
            const cleaned = v.replace(/[₹,\s]/g, "");
            const n = parseFloat(cleaned);
            if (!isNaN(n)) return n;
          }
          return null;
        };

        const aNum = parseNum(aVal);
        const bNum = parseNum(bVal);

        let cmp = 0;
        if (aNum !== null && bNum !== null) {
          cmp = aNum - bNum;
        } else {
          cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""), "en-IN", {
            numeric: true,
            sensitivity: "base",
          });
        }
        return sortConfig.direction === "desc" ? -cmp : cmp;
      });
    }
    return filtered;
  };

  const renderSortIcon = (category: string, key: string) => {
    const config = sortConfigs[category];
    if (config?.key !== key || !config.direction) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    }
    return config.direction === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1 text-orange-400" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 text-orange-400" />
    );
  };

  const handleExportPDF = async () => {
    setExporting("pdf");
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // ===== COVER PAGE =====
      // Header gradient-like effect (Brand Blue and Orange)
      doc.setFillColor(43, 87, 154); // Brand Blue (#2B579A)
      doc.rect(0, 0, pageWidth, 60, "F");
      doc.setFillColor(241, 122, 40); // Brand Orange (#F17A28)
      doc.rect(0, 55, pageWidth, 5, "F");

      // Attempt to load and add the Swadeshi Solutions Logo
      try {
        const logoImg = new Image();
        logoImg.src = "/logo.png";
        // To be safe in case image loading is async, we draw it if it's already cached or loads fast
        doc.addImage(logoImg, "PNG", 14, 15, 30, 30);
      } catch (e) {
        console.error("Could not load logo for PDF", e);
      }

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text("BUSINESS REPORT", pageWidth / 2 + 15, 30, { align: "center" });

      // Subtitle - Swadeshi Solutions branding
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Swadeshi Solutions", pageWidth / 2 + 15, 42, {
        align: "center",
      });

      // Restaurant Info Card
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 70, pageWidth - 28, 40, 3, 3, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 70, pageWidth - 28, 40, 3, 3, "S");

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(restaurantName || "Restaurant", 20, 85);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const dateText =
        dateRange?.from && dateRange?.to
          ? `Report Period: ${format(dateRange.from, "MMMM dd, yyyy")} - ${format(dateRange.to, "MMMM dd, yyyy")}`
          : `Generated: ${format(new Date(), "MMMM dd, yyyy")}`;
      doc.text(dateText, 20, 95);
      doc.text(
        `Report Generated: ${format(new Date(), "MMMM dd, yyyy HH:mm")}`,
        20,
        103,
      );

      // Report Contents Summary
      doc.setFillColor(241, 122, 40); // Brand Orange
      doc.roundedRect(14, 120, pageWidth - 28, 10, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("REPORT CONTENTS", 20, 127);

      doc.setTextColor(51, 65, 85);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      let tocY = 140;
      reports.forEach((report, idx) => {
        doc.text(`${idx + 1}. ${report.title}`, 20, tocY);
        tocY += 7;
      });

      // Try to capture charts from the DOM
      const chartElements = document.querySelectorAll(
        ".recharts-responsive-container",
      );
      const chartImages: string[] = [];

      if (chartElements.length > 0) {
        const html2canvas = (await import("html2canvas")).default;
        for (const chartEl of Array.from(chartElements).slice(
          0,
          reports.length,
        )) {
          try {
            const canvas = await html2canvas(chartEl as HTMLElement, {
              backgroundColor: "#ffffff",
              scale: 2,
            });
            chartImages.push(canvas.toDataURL("image/png"));
          } catch (e) {
            console.log("Chart capture failed:", e);
          }
        }
      }

      // ===== REPORT PAGES =====
      let chartIndex = 0;
      for (const report of reports) {
        doc.addPage();
        let yPos = 20;

        // Section Header
        doc.setFillColor(43, 87, 154); // Brand Blue
        doc.rect(0, 0, pageWidth, 25, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(report.title, pageWidth / 2, 15, { align: "center" });

        yPos = 35;

        // KPI Summary Cards (horizontal layout)
        const summaryEntries = Object.entries(report.summary);
        const cardWidth =
          (pageWidth - 28 - (summaryEntries.length - 1) * 4) /
          summaryEntries.length;

        summaryEntries.forEach(([key, value], idx) => {
          const xPos = 14 + idx * (cardWidth + 4);

          // Card background
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(xPos, yPos, cardWidth, 25, 2, 2, "F");
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(xPos, yPos, cardWidth, 25, 2, 2, "S");

          // Label
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text(key, xPos + 3, yPos + 8);

          // Value
          doc.setTextColor(15, 23, 42);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          const valueStr = String(value);
          doc.text(
            valueStr.length > 15 ? valueStr.substring(0, 15) + "..." : valueStr,
            xPos + 3,
            yPos + 18,
          );
        });

        yPos += 35;

        // Chart Image (if available)
        if (chartImages[chartIndex]) {
          try {
            const imgWidth = pageWidth - 28;
            const imgHeight = 60;
            doc.addImage(
              chartImages[chartIndex],
              "PNG",
              14,
              yPos,
              imgWidth,
              imgHeight,
            );
            yPos += imgHeight + 10;
          } catch (e) {
            console.log("Failed to add chart image:", e);
          }
        }
        chartIndex++;

        // Data Table
        if (report.tableData.length > 0) {
          const columns = getDisplayColumns(
            report.tableData as Record<string, unknown>[],
          ).slice(0, 6);
          const rows = report.tableData.slice(0, 30).map((row) =>
            columns.map((col) => {
              const val = formatCellValue(
                (row as Record<string, unknown>)[col],
              );
              return val.length > 25 ? val.substring(0, 25) + "..." : val;
            }),
          );

          autoTable(doc, {
            head: [columns.map(formatColumnName)],
            body: rows,
            startY: yPos,
            theme: "striped",
            styles: {
              fontSize: 8,
              cellPadding: 3,
              lineColor: [226, 232, 240],
            },
            headStyles: {
              fillColor: [43, 87, 154], // Brand Blue
              textColor: 255,
              fontStyle: "bold",
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
            doc.text(
              `Showing 30 of ${report.tableData.length} rows`,
              14,
              finalY + 6,
            );
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
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 8, {
          align: "right",
        });
      }

      const fileName = `${restaurantName || "Business"}_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);
      toast({ title: "PDF exported successfully", description: fileName });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async () => {
    setExporting("excel");
    try {
      await generateRichExcel(reports, restaurantName, dateRange);
      toast({ title: "Rich Excel exported successfully" });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const handleExportPPTX = async () => {
    setExporting("pptx");
    try {
      await generateEditablePPTX(reports, restaurantName, dateRange);
      toast({ title: "PowerPoint exported successfully" });
    } catch (error) {
      console.error("PPTX export error:", error);
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Export buttons row */}
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end sm:gap-3">
        <button
          onClick={handleExportPPTX}
          disabled={exporting !== null}
          className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-semibold transition-all duration-200 bg-orange-500/10 dark:bg-orange-500/8 border border-orange-500/30 text-orange-500 hover:bg-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting === "pptx" ? (
            <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
          ) : (
            <Presentation className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
          <span className="hidden sm:inline">Export</span> PPT
        </button>
        <button
          onClick={handleExportExcel}
          disabled={exporting !== null}
          className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-semibold transition-all duration-200 bg-emerald-500/10 dark:bg-emerald-500/8 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting === "excel" ? (
            <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
          <span className="hidden sm:inline">Export</span> Excel
        </button>
        <button
          onClick={handleExportPDF}
          disabled={exporting !== null}
          className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-semibold transition-all duration-200 bg-blue-500/10 dark:bg-blue-500/8 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting === "pdf" ? (
            <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
          <span className="hidden sm:inline">Export</span> PDF
        </button>
      </div>

      {/* Reports */}
      {reports.map((report, index) => {
        const displayColumns = getDisplayColumns(
          report.tableData as Record<string, unknown>[],
        );
        const processedData = getSortedAndFilteredData(
          report.tableData as Record<string, unknown>[],
          report.category,
          displayColumns,
        );
        const currentPage = getCurrentPage(report.category);
        const totalPages = Math.ceil(processedData.length / ROWS_PER_PAGE);
        const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
        const endIdx = startIdx + ROWS_PER_PAGE;
        const paginatedData = processedData.slice(startIdx, endIdx);
        const searchTerm = searchTerms[report.category] || "";

        return (
          <div key={`${report.category}-${index}`} className="space-y-5">
            {/* ═══ STAT CARDS ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
              {Object.entries(report.summary).map(([key, value], sIdx) => (
                <div
                  key={key}
                  className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white dark:bg-white/[0.04] backdrop-blur-xl border border-gray-200 dark:border-white/8 shadow-sm dark:shadow-none p-3.5 sm:p-5 transition-all duration-200 hover:border-orange-300 dark:hover:border-orange-400/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/5"
                  style={{ animationDelay: `${sIdx * 0.05}s` }}
                >
                  {/* Decorative radial glow */}
                  <div className="absolute -top-7 -right-7 w-20 h-20 rounded-full bg-orange-500/8 pointer-events-none" />
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 sm:mb-2">
                    {key}
                  </p>
                  <p className={`text-base sm:text-xl md:text-2xl font-extrabold tracking-tight ${
                    sIdx === 1
                      ? "bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500 bg-clip-text text-transparent"
                      : "text-foreground"
                  }`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* ═══ CHART BOX ═══ */}
            {report.chartData && report.chartData.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-white/[0.04] backdrop-blur-xl border border-gray-200 dark:border-white/8 shadow-sm dark:shadow-none p-6">
                <p className="text-sm font-semibold text-muted-foreground mb-5">
                  {report.title} — Visual Breakdown
                </p>
                <ResponsiveContainer width="100%" height={250}>
                  {report.chartData.length <= 6 ? (
                    <PieChart>
                      <Pie
                        data={report.chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) =>
                          `${name}: ${typeof value === "number" ? value.toLocaleString() : value}`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {report.chartData.map((_, i) => (
                          <Cell
                            key={`cell-${i}`}
                            fill={COLORS[i % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "rgba(17,19,32,0.9)",
                          border: "1px solid rgba(249,115,22,0.3)",
                          borderRadius: "12px",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  ) : (
                    <BarChart data={report.chartData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} />
                      <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(17,19,32,0.9)",
                          border: "1px solid rgba(249,115,22,0.3)",
                          borderRadius: "12px",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      />
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" />
                          <stop offset="50%" stopColor="#e85d9b" />
                          <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                      </defs>
                      <Bar dataKey="value" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}

            {/* ═══ DATA TABLE ═══ */}
            {report.tableData.length > 0 && (
              <div className="space-y-4">
                {/* Search */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search in table..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerms((prev) => ({
                          ...prev,
                          [report.category]: e.target.value,
                        }));
                        setCurrentPages((prev) => ({
                          ...prev,
                          [report.category]: 1,
                        }));
                      }}
                      className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400/40 transition-all"
                    />
                    {searchTerm && (
                      <button
                        onClick={() =>
                          setSearchTerms((prev) => ({
                            ...prev,
                            [report.category]: "",
                          }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {searchTerm && (
                    <span className="text-xs text-muted-foreground">
                      {processedData.length} result{processedData.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Table wrapper */}
                <div className="rounded-2xl bg-white dark:bg-white/[0.04] backdrop-blur-xl border border-gray-200 dark:border-white/8 overflow-hidden shadow-sm dark:shadow-none">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-orange-50 dark:bg-orange-500/6">
                          {displayColumns.slice(0, 8).map((key) => (
                            <th
                              key={key}
                              className="text-left p-3.5 font-bold text-[11px] uppercase tracking-wider text-orange-600 dark:text-orange-400 whitespace-nowrap cursor-pointer select-none hover:bg-orange-100 dark:hover:bg-orange-500/10 transition-colors border-b border-orange-200/60 dark:border-orange-500/15"
                              onClick={() => handleSort(report.category, key)}
                            >
                              <div className="flex items-center">
                                {formatColumnName(key)}
                                {renderSortIcon(report.category, key)}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-gray-100 dark:border-white/[0.03] hover:bg-orange-50/50 dark:hover:bg-white/[0.02] transition-colors"
                          >
                            {displayColumns.slice(0, 8).map((key, j) => (
                              <td
                                key={`${i}-${j}`}
                                className={`p-3.5 max-w-[200px] truncate ${
                                  j === 0
                                    ? "font-semibold text-foreground"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {/* Badge rendering for Yes/No values */}
                                {(() => {
                                  const val = formatCellValue(
                                    (row as Record<string, unknown>)[key],
                                  );
                                  if (val === "Yes") {
                                    return (
                                      <span className="inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-500/12 border border-orange-300 dark:border-orange-400/30 text-orange-600 dark:text-orange-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                        ✓ Yes
                                      </span>
                                    );
                                  }
                                  if (val === "No") {
                                    return (
                                      <span className="inline-flex items-center bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-muted-foreground text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                                        No
                                      </span>
                                    );
                                  }
                                  return val;
                                })()}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {paginatedData.length === 0 && (
                          <tr>
                            <td
                              colSpan={Math.min(displayColumns.length, 8)}
                              className="p-8 text-center text-muted-foreground"
                            >
                              No matching records found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-t border-gray-100 dark:border-white/[0.03]">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        Showing {startIdx + 1}–
                        {Math.min(endIdx, processedData.length)} of{" "}
                        {processedData.length} rows
                      </p>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          onClick={() =>
                            setPage(report.category, currentPage - 1)
                          }
                          disabled={currentPage === 1}
                          className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/8 text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-white/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span className="hidden sm:inline">Previous</span>
                        </button>
                        <span className="text-[10px] sm:text-xs text-muted-foreground px-1 sm:px-2 whitespace-nowrap">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() =>
                            setPage(report.category, currentPage + 1)
                          }
                          disabled={currentPage === totalPages}
                          className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/8 text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-white/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <span className="hidden sm:inline">Next</span>
                          <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ReportViewer;
