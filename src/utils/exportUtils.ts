import pptxgen from "pptxgenjs";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { ReportData } from "@/hooks/useReportsData";

// Swadeshi Solutions Brand Colors (from the provided logo)
const BRAND_ORANGE = "F17A28";
const BRAND_BLUE = "2B579A";
const BRAND_LIGHT = "F9F9F9";
const TEXT_DARK = "333333";
const TEXT_MUTED = "777777";

// Helper to format column names
const formatColumnName = (key: string) => {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/Id$/i, "ID");
};

// Helper to format cell values for exports
const formatCellValue = (value: unknown): string | number => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          try {
            const parsed = JSON.parse(item);
            return parsed.name
              ? `${parsed.quantity || 1}x ${parsed.name}`
              : item;
          } catch {
            return item;
          }
        }
        return item?.name
          ? `${item.quantity || 1}x ${item.name}`
          : JSON.stringify(item);
      })
      .join(", ");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value).substring(0, 100);
    } catch {
      return "-";
    }
  }
  return String(value);
};

// Columns to hide
const HIDDEN_COLUMNS = [
  "id",
  "restaurant_id",
  "created_by",
  "updated_at",
  "created_at",
];

const getDisplayColumns = (data: Record<string, unknown>[]) => {
  if (data.length === 0) return [];
  return Object.keys(data[0]).filter(
    (key) =>
      !HIDDEN_COLUMNS.includes(key.toLowerCase()) &&
      !key.toLowerCase().endsWith("_id"),
  );
};

// ---------------------------------------------------------------------------
// PPTX EXPORT IMPLEMENTATION (REPLACE PDF/STATIC CHARTS)
// ---------------------------------------------------------------------------

export const generateEditablePPTX = async (
  reports: ReportData[],
  restaurantName: string | null,
  dateRange?: { from?: Date; to?: Date }
) => {
  const pptx = new pptxgen();

  // Set presentation properties
  pptx.author = "Swadeshi Solutions";
  pptx.company = "Swadeshi Solutions";
  pptx.title = "Business Report";
  pptx.layout = "LAYOUT_16x9";

  // Define Master Slide for consistent branding
  pptx.defineSlideMaster({
    title: "MASTER_SLIDE",
    background: { color: "FFFFFF" },
    objects: [
      // Top header bar (Blue)
      { rect: { x: 0, y: 0, w: "100%", h: 0.15, fill: { color: BRAND_BLUE } } },
      // Thin accent bar (Orange)
      { rect: { x: 0, y: 0.15, w: "100%", h: 0.05, fill: { color: BRAND_ORANGE } } },
      // Footer text
      {
        text: {
          text: "Powered by Swadeshi Solutions",
          options: { x: 0.5, y: "92%", w: "40%", h: 0.3, color: TEXT_MUTED, fontSize: 10 },
        },
      },
      // Slide number
      {
        text: {
          text: "Slide ",
          options: { x: "85%", y: "92%", w: 1, h: 0.3, color: TEXT_MUTED, fontSize: 10, align: "right" },
        },
      },
    ],
    slideNumber: { x: "94%", y: "92%", color: TEXT_MUTED, fontSize: 10 },
  });

  // --- 1. COVER SLIDE ---
  const coverSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
  
  // Large decorative shapes
  coverSlide.addShape(pptx.ShapeType.rect, { x: 0, y: "30%", w: "100%", h: "40%", fill: { color: BRAND_LIGHT } });
  coverSlide.addShape(pptx.ShapeType.rect, { x: "10%", y: "30%", w: 0.1, h: "40%", fill: { color: BRAND_ORANGE } });
  
  coverSlide.addText("BUSINESS REPORT", {
    x: 1, y: "40%", w: "80%", h: 1,
    fontSize: 44, bold: true, color: BRAND_BLUE,
  });
  
  coverSlide.addText(restaurantName || "Restaurant Performance", {
    x: 1, y: "52%", w: "80%", h: 0.5,
    fontSize: 24, color: TEXT_DARK,
  });

  const dateText = dateRange?.from && dateRange?.to
    ? `Period: ${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
    : `Generated: ${format(new Date(), "MMM dd, yyyy")}`;
    
  coverSlide.addText(dateText, {
    x: 1, y: "60%", w: "80%", h: 0.5,
    fontSize: 14, color: TEXT_MUTED,
  });

  // --- 2. REPORT SLIDES ---
  for (const report of reports) {
    // A. Dashboard/Summary Slide with Chart
    const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
    
    // Title
    slide.addText(report.title, {
      x: 0.5, y: 0.4, w: "80%", h: 0.5,
      fontSize: 24, bold: true, color: BRAND_BLUE,
    });

    // KPI Cards (Left Side)
    let kpiY = 1.2;
    const summaryEntries = Object.entries(report.summary);
    
    summaryEntries.forEach(([key, value]) => {
      // KPI Box
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y: kpiY, w: 3, h: 0.8, fill: { color: BRAND_LIGHT }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.1
      });
      // Accent line
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.5, y: kpiY, w: 0.05, h: 0.8, fill: { color: BRAND_ORANGE }
      });
      // Label
      slide.addText(key.toUpperCase(), {
        x: 0.6, y: kpiY + 0.1, w: 2.8, h: 0.3,
        fontSize: 10, color: TEXT_MUTED, bold: true,
      });
      // Value
      slide.addText(String(value), {
        x: 0.6, y: kpiY + 0.4, w: 2.8, h: 0.4,
        fontSize: 18, color: TEXT_DARK, bold: true,
      });
      
      kpiY += 0.95;
    });

    // Native Editble Chart (Right Side)
    if (report.chartData && report.chartData.length > 0) {
      const isPie = report.chartData.length <= 6;
      
      // Format data for pptxgenjs
      const chartLabels = report.chartData.map(d => String(d.name));
      const chartValues = report.chartData.map(d => Number(d.value) || 0);

      const pptxChartData = [
        {
          name: "Data",
          labels: chartLabels,
          values: chartValues,
        }
      ];

      if (isPie) {
        slide.addChart(pptx.ChartType.doughnut, pptxChartData, {
          x: 4.0, y: 1.2, w: 5.5, h: 3.5,
          showLegend: true,
          legendPos: "r",
          holeSize: 50,
        });
      } else {
        slide.addChart(pptx.ChartType.bar, pptxChartData, {
          x: 4.0, y: 1.2, w: 5.5, h: 3.5,
          showLegend: false,
          barDir: "col",
          chartColors: [BRAND_BLUE, BRAND_ORANGE, "38BDF8", "34D399", "A78BFA"],
          showValue: true,
          valGridLine: { color: "E2E8F0", style: "dash" },
        });
      }
    }

    // B. Data Table Slide (Only if there are records)
    if (report.tableData && report.tableData.length > 0) {
      const tableSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
      
      tableSlide.addText(`${report.title} - Data Table`, {
        x: 0.5, y: 0.4, w: "80%", h: 0.5,
        fontSize: 20, bold: true, color: BRAND_BLUE,
      });

      const columns = getDisplayColumns(report.tableData as Record<string, unknown>[]).slice(0, 6);
      
      // Header Row (Blue background, White text)
      const tableRows: pptxgen.TableRow[] = [
        columns.map(key => ({
          text: formatColumnName(key), 
          options: { fill: { color: BRAND_BLUE }, color: "FFFFFF", bold: true, fontFace: "Helvetica", fontSize: 11, align: "left" }
        }))
      ];

      // Data Rows (Max 12 rows per slide, alternate background)
      report.tableData.slice(0, 12).forEach((row, rowIndex) => {
        const isAlternate = rowIndex % 2 === 1;
        const rowProps = { 
          fill: { color: isAlternate ? "F8FAFC" : "FFFFFF" }, 
          color: TEXT_DARK, 
          fontSize: 10,
          border: { type: "solid" as const, color: "E2E8F0", pt: 1 },
          fontFace: "Helvetica",
          align: "left" as const,
          bold: false as const
        };

        tableRows.push(
          columns.map(col => ({
            text: String(formatCellValue((row as Record<string, unknown>)[col])).substring(0, 40),
            options: rowProps
          }))
        );
      });

      tableSlide.addTable(tableRows, {
        x: 0.5, y: 1.2, w: 9.0, rowH: 0.3,
        valign: "middle",
      });

      if (report.tableData.length > 12) {
         tableSlide.addText(`Showing first 12 of ${report.tableData.length} records. See Excel export for full dataset.`, {
           x: 0.5, y: 5.0, w: 9.0, h: 0.3,
           fontSize: 9, color: TEXT_MUTED, italic: true
         });
      }
    }
  }

  // Save the file
  const fileName = `${restaurantName || "Business"}_Report_${format(new Date(), "yyyy-MM-dd")}.pptx`;
  await pptx.writeFile({ fileName });
  return fileName;
};

// ---------------------------------------------------------------------------
// RICH EXCEL EXPORT IMPLEMENTATION (REPLACE RAW XLSX)
// ---------------------------------------------------------------------------

export const generateRichExcel = async (
  reports: ReportData[],
  restaurantName: string | null,
  dateRange?: { from?: Date; to?: Date }
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Swadeshi Solutions";
  workbook.lastModifiedBy = "Swadeshi Solutions";
  workbook.created = new Date();

  for (const report of reports) {
    // Create a sheet for each report category
    const sheetName = report.category.substring(0, 31).replace(/[/\\?*[\]]/g, "");
    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: false }] // Clean look
    });

    // A. Title Header
    sheet.mergeCells("A1:E2");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `${report.title} - ${restaurantName || "Restaurant"}`;
    titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: `FF${BRAND_BLUE}` } };
    titleCell.alignment = { vertical: "middle", horizontal: "left" };

    const dateStr = dateRange?.from && dateRange?.to
      ? `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
      : `${format(new Date(), "MMM dd, yyyy")}`;
    
    sheet.getCell("A3").value = `Date: ${dateStr}`;
    sheet.getCell("A3").font = { color: { argb: `FF${TEXT_MUTED}` }, italic: true };

    let currentRow = 5;

    // B. KPI Summary Section
    const summaryEntries = Object.entries(report.summary);
    if (summaryEntries.length > 0) {
      sheet.getCell(`A${currentRow}`).value = "KEY PERFORMANCE INDICATORS";
      sheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: `FF${BRAND_ORANGE}` } };
      currentRow++;

      // Headers for KPIs
      sheet.getCell(`A${currentRow}`).value = "Metric";
      sheet.getCell(`B${currentRow}`).value = "Value";
      
      const kpiHeaderRow = sheet.getRow(currentRow);
      kpiHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      kpiHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_BLUE}` } };
      kpiHeaderRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_BLUE}` } };
      
      currentRow++;

      // Values for KPIs
      summaryEntries.forEach(([key, value]) => {
        sheet.getCell(`A${currentRow}`).value = key;
        sheet.getCell(`B${currentRow}`).value = formatCellValue(value);
        
        // Alternate banding
        if (currentRow % 2 === 0) {
           sheet.getRow(currentRow).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
           sheet.getRow(currentRow).getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
        
        // Borders
        ['A', 'B'].forEach(col => {
          sheet.getCell(`${col}${currentRow}`).border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });
        
        currentRow++;
      });
      
      currentRow += 2; // Add spacing
    }

    // C. Data Table Section
    if (report.tableData && report.tableData.length > 0) {
      sheet.getCell(`A${currentRow}`).value = "DETAILED DATA";
      sheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: `FF${BRAND_ORANGE}` } };
      currentRow++;

      const rawData = report.tableData as Record<string, unknown>[];
      const columns = getDisplayColumns(rawData);

      // Define table headers
      const tableHeaderRow = sheet.getRow(currentRow);
      columns.forEach((col, index) => {
        const cell = tableHeaderRow.getCell(index + 1);
        cell.value = formatColumnName(col);
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_BLUE}` } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });
      currentRow++;

      // Write data
      rawData.forEach((dataRow, rowIndex) => {
        const row = sheet.getRow(currentRow);
        const isAlternate = rowIndex % 2 === 1;

        columns.forEach((col, colIndex) => {
          const cell = row.getCell(colIndex + 1);
          cell.value = formatCellValue(dataRow[col]);
          
          if (isAlternate) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
          
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });
        currentRow++;
      });

      // Auto-fit columns
      columns.forEach((_, index) => {
        sheet.getColumn(index + 1).width = 20; // Default reasonable width
      });
    }
  }

  // Save the file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  
  const fileName = `${restaurantName || "Business"}_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
  
  return fileName;
};

// ---------------------------------------------------------------------------
// LEGACY RAW EXPORT (Kept for compatibility with other components)
// ---------------------------------------------------------------------------

export const exportToExcel = (data: any[], filename: string, sheetName: string = "Data") => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return false;
  }

  try {
    // Fallback if XLSX is available globally or we just use basic CSV
    if (typeof window !== 'undefined' && (window as any).XLSX) {
      const XLSX = (window as any).XLSX;
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      return true;
    } else {
      // Very basic CSV fallback if XLSX isn't loaded
      const headers = Object.keys(data[0]).join(",");
      const rows = data.map(obj => 
        Object.values(obj).map(val => 
          typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : String(val)
        ).join(",")
      ).join("\n");
      
      const csv = `${headers}\n${rows}`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    }
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    return false;
  }
};
