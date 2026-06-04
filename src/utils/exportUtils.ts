import pptxgen from "pptxgenjs";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { ReportData } from "@/hooks/useReportsData";
import { sanitizeOrderItemDisplay } from "@/lib/order-utils";

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
              ? `${parsed.quantity || 1}x ${sanitizeOrderItemDisplay(parsed.name)}`
              : item;
          } catch {
            return item;
          }
        }
        return item?.name
          ? `${item.quantity || 1}x ${sanitizeOrderItemDisplay(item.name)}`
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
      // Diagonal watermark
      {
        text: {
          text: "SWADESHI SOLUTIONS",
          options: { x: 1.2, y: 2.0, w: 7.5, h: 1.5, color: "E8E8E8", fontSize: 36, bold: true, rotate: 330, align: "center" },
        },
      },
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

    // B. Data Table Slides — paginated across multiple slides
    if (report.tableData && report.tableData.length > 0) {
      const columns = getDisplayColumns(report.tableData as Record<string, unknown>[]).slice(0, 6);
      const ROWS_PER_SLIDE = 12;
      const totalDataRows = report.tableData.length;
      const totalTableSlides = Math.ceil(totalDataRows / ROWS_PER_SLIDE);

      for (let slideIdx = 0; slideIdx < totalTableSlides; slideIdx++) {
        const tableSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
        const pageLabel = totalTableSlides > 1 ? ` (${slideIdx + 1}/${totalTableSlides})` : '';

        tableSlide.addText(`${report.title} - Data Table${pageLabel}`, {
          x: 0.5, y: 0.4, w: "80%", h: 0.5,
          fontSize: 20, bold: true, color: BRAND_BLUE,
        });

        // Header Row (Blue background, White text)
        const tableRows: pptxgen.TableRow[] = [
          columns.map(key => ({
            text: formatColumnName(key), 
            options: { fill: { color: BRAND_BLUE }, color: "FFFFFF", bold: true, fontFace: "Helvetica", fontSize: 11, align: "left" }
          }))
        ];

        // Data Rows for this slide
        const sliceStart = slideIdx * ROWS_PER_SLIDE;
        const sliceEnd = Math.min(sliceStart + ROWS_PER_SLIDE, totalDataRows);
        report.tableData.slice(sliceStart, sliceEnd).forEach((row, rowIndex) => {
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

        tableSlide.addText(
          `Showing ${sliceStart + 1}\u2013${sliceEnd} of ${totalDataRows} records`,
          { x: 0.5, y: 5.0, w: 9.0, h: 0.3, fontSize: 9, color: TEXT_MUTED, italic: true }
        );
      }
    }
  }

  // Save the file
  const fileName = `${restaurantName || "Business"}_Report_${format(new Date(), "yyyy-MM-dd")}.pptx`;
  await pptx.writeFile({ fileName });
  return fileName;
};

// ---------------------------------------------------------------------------
// SHARED BRANDED EXCEL HELPERS
// ---------------------------------------------------------------------------

const BRAND_TAGLINE = "Empowering Restaurants, Enabling Growth";

const colToLetter = (col: number): string => {
  let s = "", n = col;
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
};

const calcAutoWidth = (values: string[], header: string, min = 12, max = 50): number => {
  const maxLen = Math.max(header.length, ...values.map(v => v.length));
  return Math.min(max, Math.max(min, Math.ceil(maxLen * 1.1) + 2));
};

const fillRow = (sheet: ExcelJS.Worksheet, row: number, cols: number, color: string, h = 4) => {
  const r = sheet.getRow(row); r.height = h;
  for (let c = 1; c <= cols; c++) r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${color}` } };
};

const thinBorder = (color = 'FFE2E8F0'): ExcelJS.Border => ({ style: 'thin', color: { argb: color } });

const addBrandedHeader = (
  sheet: ExcelJS.Worksheet, workbook: ExcelJS.Workbook, logoBuffer: ArrayBuffer | null, totalCols: number, title: string,
  restaurant: string | null, dateRange?: { from?: Date; to?: Date }, reportType?: string
): number => {
  const lc = colToLetter(Math.max(totalCols, 6));

  if (logoBuffer) {
    sheet.getColumn(1).width = Math.max(sheet.getColumn(1).width || 0, 12);
  }

  // Company name
  if (logoBuffer) {
    sheet.mergeCells(`B1:${lc}2`);
    const bc = sheet.getCell("B1");
    bc.value = "SWADESHI SOLUTIONS";
    bc.font = { name: "Calibri", size: 22, bold: true, color: { argb: `FF${BRAND_BLUE}` } };
    bc.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  } else {
    sheet.mergeCells(`A1:${lc}2`);
    const bc = sheet.getCell("A1");
    bc.value = "SWADESHI SOLUTIONS";
    bc.font = { name: "Calibri", size: 22, bold: true, color: { argb: `FF${BRAND_BLUE}` } };
    bc.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  }
  sheet.getRow(1).height = 22; sheet.getRow(2).height = 22;

  // Tagline
  if (logoBuffer) {
    sheet.mergeCells(`B3:${lc}3`);
    const tc = sheet.getCell("B3");
    tc.value = BRAND_TAGLINE;
    tc.font = { name: "Calibri", size: 11, italic: true, color: { argb: `FF${BRAND_ORANGE}` } };
    tc.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  } else {
    sheet.mergeCells(`A3:${lc}3`);
    const tc = sheet.getCell("A3");
    tc.value = BRAND_TAGLINE;
    tc.font = { name: "Calibri", size: 11, italic: true, color: { argb: `FF${BRAND_ORANGE}` } };
    tc.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  }
  sheet.getRow(3).height = 18;

  // Add logo image if buffer exists
  if (logoBuffer) {
    try {
      const imageId = workbook.addImage({
        buffer: logoBuffer,
        extension: 'png',
      });
      sheet.addImage(imageId, {
        tl: { col: 0.1, row: 0.1 },
        ext: { width: 55, height: 55 }
      });
    } catch (err) {
      console.error("Error embedding logo in Excel sheet", err);
    }
  }

  // Orange separator
  fillRow(sheet, 4, Math.max(totalCols, 6), BRAND_ORANGE, 4);
  sheet.getRow(5).height = 8;
  // Metadata block
  const meta = [
    ["Report Name:", title],
    ["Generated For:", restaurant || "Restaurant"],
    ["Report Period:", dateRange?.from && dateRange?.to
      ? `${format(dateRange.from, "MMM dd, yyyy")} — ${format(dateRange.to, "MMM dd, yyyy")}`
      : format(new Date(), "MMM dd, yyyy")],
    ["Generated On:", format(new Date(), "MMM dd, yyyy, hh:mm a")],
    ...(reportType ? [["Report Type:", reportType]] : []),
  ];
  const ms = 6;
  meta.forEach(([label, val], i) => {
    const r = ms + i;
    const cA = sheet.getCell(`A${r}`);
    cA.value = label; cA.font = { name: "Calibri", size: 10, bold: true, color: { argb: `FF${TEXT_DARK}` } };
    sheet.mergeCells(`B${r}:${lc}${r}`);
    const cB = sheet.getCell(`B${r}`);
    cB.value = val; cB.font = { name: "Calibri", size: 10, color: { argb: `FF${TEXT_DARK}` } };
    for (let c = 1; c <= Math.max(totalCols, 6); c++)
      sheet.getRow(r).getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  });
  const am = ms + meta.length;
  sheet.getRow(am).height = 6;
  fillRow(sheet, am + 1, Math.max(totalCols, 6), BRAND_BLUE, 3);
  return am + 3;
};

const writeBrandedTable = (
  sheet: ExcelJS.Worksheet, startRow: number, columns: string[],
  data: Record<string, unknown>[], sectionTitle?: string, freeze = false
): number => {
  let cr = startRow;
  if (sectionTitle) {
    sheet.getCell(`A${cr}`).value = sectionTitle;
    sheet.getCell(`A${cr}`).font = { name: "Calibri", size: 12, bold: true, color: { argb: `FF${BRAND_ORANGE}` } };
    cr++;
  }
  // Header
  const hr = cr;
  const hRow = sheet.getRow(cr);
  hRow.height = 28;
  columns.forEach((col, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = formatColumnName(col);
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_BLUE}` } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: thinBorder(`FF${BRAND_BLUE}`), bottom: thinBorder(`FF${BRAND_BLUE}`), left: thinBorder('FFB0BEC5'), right: thinBorder('FFB0BEC5') };
  });
  cr++;
  // Data rows — NO truncation
  data.forEach((dr, ri) => {
    const row = sheet.getRow(cr);
    row.height = 22;
    columns.forEach((col, ci) => {
      const cell = row.getCell(ci + 1);
      const raw = dr[col];
      if (typeof raw === 'number') {
        cell.value = raw;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (/price|cost|amount|revenue|total|value|spent|sales|tax|discount|tip/i.test(col)) cell.numFmt = '#,##0.00';
      } else {
        cell.value = formatCellValue(raw);
        cell.alignment = { vertical: 'middle', wrapText: true };
      }
      cell.font = { name: "Calibri", size: 10, color: { argb: `FF${TEXT_DARK}` } };
      if (ri % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      cell.border = { bottom: thinBorder(), left: thinBorder(), right: thinBorder() };
    });
    cr++;
  });
  // Auto-fit widths
  columns.forEach((col, i) => {
    const vals = data.map(r => String(formatCellValue(r[col])));
    sheet.getColumn(i + 1).width = calcAutoWidth(vals, formatColumnName(col));
  });
  if (freeze) sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: hr, showGridLines: false }];
  sheet.autoFilter = { from: { row: hr, column: 1 }, to: { row: cr - 1, column: columns.length } };
  return cr;
};

const addFooter = (sheet: ExcelJS.Worksheet, row: number, cols: number) => {
  const lc = colToLetter(Math.max(cols, 6));
  const fr = row + 1;
  sheet.mergeCells(`A${fr}:${lc}${fr}`);
  const cell = sheet.getCell(`A${fr}`);
  cell.value = "Powered by Swadeshi Solutions  •  www.swadeshisolutions.co.in";
  cell.font = { name: "Calibri", size: 9, italic: true, color: { argb: `FF${TEXT_MUTED}` } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
};

const downloadExcelBuffer = async (workbook: ExcelJS.Workbook, fileName: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
  window.URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// RICH EXCEL EXPORT — REPORT VIEWER (multi-report branded)
// ---------------------------------------------------------------------------

export const generateRichExcel = async (
  reports: ReportData[],
  restaurantName: string | null,
  dateRange?: { from?: Date; to?: Date }
) => {
  let logoBuffer: ArrayBuffer | null = null;
  try {
    const response = await fetch('/swadeshi-logo2.png');
    if (response.ok) {
      logoBuffer = await response.arrayBuffer();
    }
  } catch (e) {
    console.error("Error loading logo for excel", e);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Swadeshi Solutions";
  workbook.lastModifiedBy = "Swadeshi Solutions";
  workbook.created = new Date();

  // ═══ COVER SHEET ═══
  const cover = workbook.addWorksheet("Summary", { views: [{ showGridLines: false }] });
  cover.properties.tabColor = { argb: `FF${BRAND_ORANGE}` };
  let cr = addBrandedHeader(cover, workbook, logoBuffer, 4, "Business Report", restaurantName, dateRange, "Multi-Category Analysis");
  // Table of contents
  cover.getCell(`A${cr}`).value = "REPORTS INCLUDED";
  cover.getCell(`A${cr}`).font = { name: "Calibri", size: 12, bold: true, color: { argb: `FF${BRAND_ORANGE}` } };
  cr++;
  const tocHdr = cover.getRow(cr);
  tocHdr.height = 26;
  ["#", "Report Name", "Category", "Records"].forEach((h, i) => {
    const c = tocHdr.getCell(i + 1);
    c.value = h;
    c.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_BLUE}` } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  cr++;
  reports.forEach((r, i) => {
    const row = cover.getRow(cr);
    [i + 1, r.title, r.category, r.tableData?.length || 0].forEach((v, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = v;
      cell.font = { name: "Calibri", size: 10, color: { argb: `FF${TEXT_DARK}` } };
      cell.alignment = { vertical: 'middle' };
      if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      cell.border = { bottom: thinBorder() };
    });
    cr++;
  });
  [6, 20, 18, 12].forEach((w, i) => { cover.getColumn(i + 1).width = w; });
  addFooter(cover, cr, 4);

  // ═══ PER-REPORT SHEETS ═══
  for (const report of reports) {
    const sheetName = report.category.substring(0, 31).replace(/[/\\?*[\]]/g, "");
    const rawData = (report.tableData || []) as Record<string, unknown>[];
    const columns = getDisplayColumns(rawData);
    const totalCols = Math.max(columns.length, 4);
    const sheet = workbook.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    sheet.properties.tabColor = { argb: `FF${BRAND_BLUE}` };

    let row = addBrandedHeader(sheet, workbook, logoBuffer, totalCols, report.title, restaurantName, dateRange, report.category);

    // KPI Summary
    const summaryEntries = Object.entries(report.summary);
    if (summaryEntries.length > 0) {
      sheet.getCell(`A${row}`).value = "KEY PERFORMANCE INDICATORS";
      sheet.getCell(`A${row}`).font = { name: "Calibri", size: 12, bold: true, color: { argb: `FF${BRAND_ORANGE}` } };
      row++;
      const kh = sheet.getRow(row);
      kh.height = 26;
      ["Metric", "Value"].forEach((h, i) => {
        const c = kh.getCell(i + 1);
        c.value = h; c.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_BLUE}` } };
        c.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'center' };
        c.border = { top: thinBorder(`FF${BRAND_BLUE}`), bottom: thinBorder(`FF${BRAND_BLUE}`) };
      });
      row++;
      summaryEntries.forEach(([key, value], idx) => {
        const r = sheet.getRow(row);
        r.height = 24;
        r.getCell(1).value = key;
        r.getCell(1).font = { name: "Calibri", size: 10, bold: true, color: { argb: `FF${TEXT_DARK}` } };
        r.getCell(2).value = formatCellValue(value);
        r.getCell(2).font = { name: "Calibri", size: 10, color: { argb: `FF${TEXT_DARK}` } };
        r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
        if (idx % 2 === 1) {
          [1, 2].forEach(c => r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } });
        }
        [1, 2].forEach(c => {
          r.getCell(c).border = { top: thinBorder(), bottom: thinBorder(), left: thinBorder(), right: thinBorder() };
        });
        row++;
      });
      sheet.getColumn(1).width = 28;
      sheet.getColumn(2).width = 22;
      row += 2;
    }

    // Data table
    if (rawData.length > 0 && columns.length > 0) {
      const endRow = writeBrandedTable(sheet, row, columns, rawData, "DETAILED DATA", true);
      addFooter(sheet, endRow, totalCols);
    } else {
      addFooter(sheet, row, totalCols);
    }
  }

  const fileName = `${restaurantName || "Business"}_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  await downloadExcelBuffer(workbook, fileName);
  return fileName;
};

// ---------------------------------------------------------------------------
// BRANDED EXCEL — SIMPLE DATA EXPORT (for ExportCenter, Inventory, etc.)
// ---------------------------------------------------------------------------

export const generateBrandedDataExcel = async (
  data: Record<string, unknown>[],
  columns: { key: string; header: string }[],
  options: {
    title: string;
    sheetName?: string;
    restaurantName?: string | null;
    dateRange?: { from?: Date; to?: Date };
    reportType?: string;
    fileName?: string;
  }
) => {
  let logoBuffer: ArrayBuffer | null = null;
  try {
    const response = await fetch('/swadeshi-logo2.png');
    if (response.ok) {
      logoBuffer = await response.arrayBuffer();
    }
  } catch (e) {
    console.error("Error loading logo for excel", e);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Swadeshi Solutions";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(options.sheetName || "Report", { views: [{ showGridLines: false }] });
  sheet.properties.tabColor = { argb: `FF${BRAND_BLUE}` };

  const colKeys = columns.map(c => c.key);
  const totalCols = Math.max(columns.length, 4);
  let row = addBrandedHeader(sheet, workbook, logoBuffer, totalCols, options.title, options.restaurantName || null, options.dateRange, options.reportType);

  // Map data to use column keys
  const mappedData = data.map(d => {
    const mapped: Record<string, unknown> = {};
    columns.forEach(c => { mapped[c.header] = d[c.key]; });
    return mapped;
  });
  const mappedCols = columns.map(c => c.header);

  const endRow = writeBrandedTable(sheet, row, mappedCols, mappedData, "DETAILED DATA", true);
  addFooter(sheet, endRow, totalCols);

  const fileName = options.fileName || `${options.title.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  await downloadExcelBuffer(workbook, fileName);
  return fileName;
};

// ---------------------------------------------------------------------------
// BRANDED EXCEL — MULTI-SHEET EXPORT (for BusinessReportExport)
// ---------------------------------------------------------------------------

export const generateBrandedMultiSheetExcel = async (
  sheets: { name: string; data: Record<string, unknown>[]; columns: { key: string; header: string }[] }[],
  options: {
    title: string;
    restaurantName?: string | null;
    dateRange?: { from?: Date; to?: Date };
    fileName?: string;
  }
) => {
  let logoBuffer: ArrayBuffer | null = null;
  try {
    const response = await fetch('/swadeshi-logo2.png');
    if (response.ok) {
      logoBuffer = await response.arrayBuffer();
    }
  } catch (e) {
    console.error("Error loading logo for excel", e);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Swadeshi Solutions";
  workbook.created = new Date();

  for (const s of sheets) {
    if (!s.data || s.data.length === 0) continue;
    const sheet = workbook.addWorksheet(s.name.substring(0, 31), { views: [{ showGridLines: false }] });
    sheet.properties.tabColor = { argb: `FF${BRAND_BLUE}` };
    const totalCols = Math.max(s.columns.length, 4);
    let row = addBrandedHeader(sheet, workbook, logoBuffer, totalCols, `${options.title} — ${s.name}`, options.restaurantName || null, options.dateRange);

    const mappedData = s.data.map(d => {
      const m: Record<string, unknown> = {};
      s.columns.forEach(c => { m[c.header] = d[c.key]; });
      return m;
    });
    const mappedCols = s.columns.map(c => c.header);
    const endRow = writeBrandedTable(sheet, row, mappedCols, mappedData, undefined, true);
    addFooter(sheet, endRow, totalCols);
  }

  const fileName = options.fileName || `${options.title.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  await downloadExcelBuffer(workbook, fileName);
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
