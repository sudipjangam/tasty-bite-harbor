/**
 * Unified Business Report Templates Engine
 * Generates boardroom-ready, professional business reports in:
 *  1. PDF (via jsPDF + AutoTable) - with letterhead masthead, logo, contact block, KPI cards, styled tables, watermarks, page numbering
 *  2. XLSX (via ExcelJS) - with branded cover sheet, embedded logo, metadata card, frozen header rows, zebra striping, currency formatting, auto-filters
 *  3. Editable PPTX (via pptxgenjs) - 16:9 widescreen, master slides, native editable charts, paginated native tables, contact card
 *
 * 100% client-side, zero backend dependencies, resilient font/currency handling.
 */

import { format } from "date-fns";
import { loadPDFTableEngine } from "@/utils/lazyExportLoaders";
import ExcelJS from "exceljs";
import pptxgen from "pptxgenjs";
import { supabase } from "@/integrations/supabase/client";
import type { ReportData } from "@/hooks/useReportsData";

// ============================================================================
// BRAND & DESIGN SYSTEM TOKENS
// ============================================================================

export const REPORT_THEME = {
  primary: "2B579A",     // Corporate Navy Blue
  accent: "F17A28",      // Brand Orange
  lightBg: "F8FAFC",     // Slate 50
  cardBg: "FFFFFF",      // Pure White
  textDark: "1E293B",    // Slate 800
  textMuted: "64748B",   // Slate 500
  border: "E2E8F0",      // Slate 200
  success: "10B981",
  danger: "EF4444",
};

// RGB equivalents for jsPDF
export const REPORT_THEME_RGB = {
  primary: [43, 87, 154] as [number, number, number],
  accent: [241, 122, 40] as [number, number, number],
  lightBg: [248, 250, 252] as [number, number, number],
  textDark: [30, 41, 59] as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface BusinessContactDetails {
  name: string;
  tagline?: string;
  logoUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  gstin?: string;
}

export interface ReportKPI {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
}

export interface ReportColumn {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  isCurrency?: boolean;
  width?: number;
}

export interface ReportSection {
  id?: string;
  title: string;
  subtitle?: string;
  kpis?: ReportKPI[];
  chartData?: { name: string; value: number }[];
  chartType?: "bar" | "doughnut" | "line";
  tableData?: Record<string, unknown>[];
  columns?: ReportColumn[];
  notes?: string[];
}

export interface BusinessReportPayload {
  business?: Partial<BusinessContactDetails>;
  title: string;
  subtitle?: string;
  category?: string;
  dateRange?: { from?: Date; to?: Date };
  generatedBy?: string;
  generatedAt?: Date;
  summaryNotes?: string[];
  kpis?: ReportKPI[];
  sections: ReportSection[];
}

// ============================================================================
// DEFAULT BUSINESS PROFILE
// ============================================================================

export const DEFAULT_BUSINESS_PROFILE: BusinessContactDetails = {
  name: "Tasty Bite Harbor",
  tagline: "Empowering Restaurants, Enabling Growth",
  logoUrl: "/swadeshi-logo.png",
  address: "Near IT Park, Main Commercial Avenue",
  city: "Pune",
  state: "Maharashtra",
  pincode: "411057",
  phone: "+91 98765 43210",
  email: "contact@swadeshisolutions.co.in",
  website: "www.swadeshisolutions.co.in",
  gstin: "27ABCDE1234F1Z5",
};

// ============================================================================
// UTILITY HELPERS
// ============================================================================

export const resolveBusinessProfile = (
  custom?: Partial<BusinessContactDetails>
): BusinessContactDetails => {
  return {
    ...DEFAULT_BUSINESS_PROFILE,
    ...custom,
    name: custom?.name?.trim() || DEFAULT_BUSINESS_PROFILE.name,
    logoUrl: custom?.logoUrl?.trim() || DEFAULT_BUSINESS_PROFILE.logoUrl,
  };
};

/**
 * Fetches real restaurant profile & contact information from Supabase,
 * with graceful fallback to default business profile.
 */
export const fetchBusinessContactDetails = async (
  restaurantId?: string | null
): Promise<BusinessContactDetails> => {
  if (!restaurantId) return { ...DEFAULT_BUSINESS_PROFILE };

  try {
    const { data, error } = await supabase
      .from("restaurants")
      .select("name, address, phone, email, logo_url, gstin, owner_phone, owner_email")
      .eq("id", restaurantId)
      .maybeSingle();

    if (error || !data) {
      return { ...DEFAULT_BUSINESS_PROFILE };
    }

    return {
      name: data.name || DEFAULT_BUSINESS_PROFILE.name,
      tagline: DEFAULT_BUSINESS_PROFILE.tagline,
      logoUrl: data.logo_url || DEFAULT_BUSINESS_PROFILE.logoUrl,
      address: data.address || DEFAULT_BUSINESS_PROFILE.address,
      phone: data.phone || data.owner_phone || DEFAULT_BUSINESS_PROFILE.phone,
      email: data.email || data.owner_email || DEFAULT_BUSINESS_PROFILE.email,
      website: DEFAULT_BUSINESS_PROFILE.website,
      gstin: data.gstin || DEFAULT_BUSINESS_PROFILE.gstin,
    };
  } catch (err) {
    console.error("Error fetching restaurant contact details for report:", err);
    return { ...DEFAULT_BUSINESS_PROFILE };
  }
};

/**
 * Converts legacy useReportsData ReportData[] into a structured BusinessReportPayload
 */
export const convertReportsDataToPayload = (
  reports: ReportData[],
  business?: Partial<BusinessContactDetails>,
  dateRange?: { from?: Date; to?: Date }
): BusinessReportPayload => {
  const sections: ReportSection[] = reports.map((rep) => {
    const kpis: ReportKPI[] = Object.entries(rep.summary || {}).map(([key, val]) => ({
      label: key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      value: val,
    }));

    const chartData = Array.isArray(rep.chartData)
      ? rep.chartData
          .filter((d): d is Record<string, unknown> => typeof d === "object" && d !== null)
          .map((d) => ({
            name: String(d.name || d.label || ""),
            value: Number(d.value || d.amount || 0),
          }))
          .filter((d) => d.name && !isNaN(d.value))
      : undefined;

    return {
      id: rep.category,
      title: rep.title || rep.category,
      kpis,
      chartData: chartData && chartData.length > 0 ? chartData : undefined,
      tableData: rep.tableData || [],
    };
  });

  // Pull first section's top KPIs for master overview
  const topKpis = sections.flatMap((s) => s.kpis || []).slice(0, 4);

  return {
    business,
    title: "Consolidated Business & Operations Report",
    subtitle: business?.name ? `Performance Audit for ${business.name}` : "Executive Business Performance",
    dateRange,
    kpis: topKpis,
    sections,
  };
};

export const formatSafeCurrency = (val: unknown): string => {
  if (val === null || val === undefined || val === "") return "-";
  if (typeof val === "number") {
    return `Rs. ${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const str = String(val).replace(/₹/g, "Rs. ");
  return str;
};

export const formatCellDisplay = (val: unknown): string => {
  if (val === null || val === undefined) return "-";
  if (typeof val === "number") {
    return val.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (val instanceof Date) return format(val, "yyyy-MM-dd");
  if (Array.isArray(val)) {
    return val.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  }
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return "-";
    }
  }
  return String(val).replace(/₹/g, "Rs. ");
};

const colToLetter = (col: number): string => {
  let s = "", n = col;
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
};

// Load image buffer for ExcelJS
const fetchImageBuffer = async (url: string): Promise<ArrayBuffer | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
};

// Load base64 for jsPDF
const fetchImageBase64 = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// Derive default columns from table records if not supplied
const deriveColumns = (data: Record<string, unknown>[]): ReportColumn[] => {
  if (!data || data.length === 0) return [];
  const hiddenKeys = ["id", "restaurant_id", "created_by", "updated_at", "created_at"];
  return Object.keys(data[0])
    .filter((k) => !hiddenKeys.includes(k.toLowerCase()) && !k.toLowerCase().endsWith("_id"))
    .map((k) => ({
      key: k,
      header: k
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .replace(/Id$/i, "ID"),
      align: /price|cost|amount|total|revenue|discount|tax|qty|quantity/i.test(k)
        ? ("right" as const)
        : ("left" as const),
      isCurrency: /price|cost|amount|total|revenue|discount|tax/i.test(k),
    }));
};

// ============================================================================
// 1. PDF BUSINESS REPORT TEMPLATE (jsPDF + AutoTable)
// ============================================================================

export const generateBusinessReportPDF = async (
  payload: BusinessReportPayload
): Promise<string> => {
  const { jsPDF, autoTable } = await loadPDFTableEngine();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const business = resolveBusinessProfile(payload.business);
  const now = payload.generatedAt || new Date();

  // Load logo
  let logoBase64: string | null = null;
  if (business.logoUrl) {
    logoBase64 = await fetchImageBase64(business.logoUrl);
  }

  // --- COVER & HEADER BANNER (Page 1) ---
  // Top brand banner
  doc.setFillColor(...REPORT_THEME_RGB.primary);
  doc.rect(0, 0, pageWidth, 42, "F");
  // Accent divider line
  doc.setFillColor(...REPORT_THEME_RGB.accent);
  doc.rect(0, 42, pageWidth, 3, "F");

  // Logo in banner
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", 14, 8, 36, 26);
    } catch {
      // Fallback text if logo fails to render
    }
  }

  // Business Name & Tagline in Header
  const textLeftX = logoBase64 ? 54 : 14;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(business.name.toUpperCase(), textLeftX, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(230, 235, 245);
  if (business.tagline) {
    doc.text(business.tagline, textLeftX, 24);
  }

  // Business Contact Details (Right-aligned in masthead banner)
  const contactLines: string[] = [];
  if (business.phone) contactLines.push(`Tel: ${business.phone}`);
  if (business.email) contactLines.push(`Email: ${business.email}`);
  if (business.website) contactLines.push(`Web: ${business.website}`);
  if (business.gstin) contactLines.push(`GSTIN: ${business.gstin}`);

  doc.setFontSize(7.5);
  doc.setTextColor(220, 230, 245);
  let contactY = 14;
  contactLines.slice(0, 4).forEach((line) => {
    doc.text(line, pageWidth - 14, contactY, { align: "right" });
    contactY += 5.5;
  });

  // --- REPORT METADATA CARD ---
  let curY = 52;
  doc.setFillColor(...REPORT_THEME_RGB.lightBg);
  doc.roundedRect(14, curY, pageWidth - 28, 28, 2.5, 2.5, "F");
  doc.setDrawColor(...REPORT_THEME_RGB.border);
  doc.roundedRect(14, curY, pageWidth - 28, 28, 2.5, 2.5, "S");

  // Accent vertical pill
  doc.setFillColor(...REPORT_THEME_RGB.accent);
  doc.rect(14, curY, 2.5, 28, "F");

  doc.setTextColor(...REPORT_THEME_RGB.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(payload.title, 20, curY + 9);

  if (payload.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...REPORT_THEME_RGB.textMuted);
    doc.text(payload.subtitle, 20, curY + 15);
  }

  // Metadata items
  doc.setFontSize(8);
  doc.setTextColor(...REPORT_THEME_RGB.textDark);
  const periodText = payload.dateRange?.from && payload.dateRange?.to
    ? `Reporting Period: ${format(payload.dateRange.from, "MMM dd, yyyy")} - ${format(payload.dateRange.to, "MMM dd, yyyy")}`
    : `Generated On: ${format(now, "MMM dd, yyyy hh:mm a")}`;
  doc.text(periodText, 20, curY + 22);

  const addressText = [business.address, business.city, business.state]
    .filter(Boolean)
    .join(", ");
  if (addressText) {
    doc.setTextColor(...REPORT_THEME_RGB.textMuted);
    doc.text(`Location: ${addressText}`, pageWidth - 20, curY + 22, { align: "right" });
  }

  curY += 34;

  // --- HIGH-LEVEL EXECUTIVE KPIS GRID ---
  const allKpis = [
    ...(payload.kpis || []),
    ...payload.sections.flatMap((s) => s.kpis || []),
  ].slice(0, 4);

  if (allKpis.length > 0) {
    const kpiCount = allKpis.length;
    const cardGap = 3;
    const totalAvail = pageWidth - 28;
    const cardW = (totalAvail - (kpiCount - 1) * cardGap) / kpiCount;
    const cardH = 20;

    allKpis.forEach((kpi, idx) => {
      const cardX = 14 + idx * (cardW + cardGap);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cardX, curY, cardW, cardH, 2, 2, "F");
      doc.setDrawColor(...REPORT_THEME_RGB.border);
      doc.roundedRect(cardX, curY, cardW, cardH, 2, 2, "S");

      // Left mini-stripe
      doc.setFillColor(...REPORT_THEME_RGB.accent);
      doc.rect(cardX, curY, 1.8, cardH, "F");

      // KPI Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...REPORT_THEME_RGB.textMuted);
      doc.text(kpi.label.toUpperCase().substring(0, 22), cardX + 4, curY + 6);

      // KPI Value
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...REPORT_THEME_RGB.textDark);
      const valText = formatSafeCurrency(kpi.value);
      doc.text(valText.length > 18 ? valText.substring(0, 18) + "..." : valText, cardX + 4, curY + 14);
    });

    curY += cardH + 7;
  }

  // --- SECTIONS & DATA TABLES ---
  for (let sIdx = 0; sIdx < payload.sections.length; sIdx++) {
    const section = payload.sections[sIdx];
    const rawData = section.tableData || [];
    const columns = section.columns && section.columns.length > 0
      ? section.columns
      : deriveColumns(rawData);

    // If space running low on current page, start new page
    if (curY > pageHeight - 50) {
      doc.addPage();
      curY = 25;
    }

    // Section Title Banner
    doc.setFillColor(...REPORT_THEME_RGB.primary);
    doc.rect(14, curY, pageWidth - 28, 7.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(section.title.toUpperCase(), 18, curY + 5.2);

    if (rawData.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(`${rawData.length} records`, pageWidth - 18, curY + 5.2, { align: "right" });
    }
    curY += 9.5;

    // Render Data Table via AutoTable
    if (rawData.length > 0 && columns.length > 0) {
      const headRows = [columns.map((c) => c.header)];
      const bodyRows = rawData.map((row) =>
        columns.map((c) => {
          const raw = row[c.key];
          if (c.isCurrency) return formatSafeCurrency(raw);
          return formatCellDisplay(raw);
        })
      );

      autoTable(doc, {
        head: headRows,
        body: bodyRows,
        startY: curY,
        margin: { left: 14, right: 14 },
        theme: "striped",
        headStyles: {
          fillColor: REPORT_THEME_RGB.primary,
          textColor: 255,
          fontStyle: "bold",
          fontSize: 8,
          cellPadding: 2.5,
          halign: "left",
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          lineColor: REPORT_THEME_RGB.border,
          lineWidth: 0.1,
          textColor: REPORT_THEME_RGB.textDark,
        },
        alternateRowStyles: {
          fillColor: REPORT_THEME_RGB.lightBg,
        },
        columnStyles: columns.reduce((acc, col, i) => {
          if (col.align === "right") acc[i] = { halign: "right" };
          else if (col.align === "center") acc[i] = { halign: "center" };
          return acc;
        }, {} as Record<number, { halign: "left" | "center" | "right" }>),
      });

      curY = (doc as any).lastAutoTable?.finalY + 8 || curY + 20;
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...REPORT_THEME_RGB.textMuted);
      doc.text("No tabular records available for this section.", 16, curY + 4);
      curY += 12;
    }
  }

  // --- RUNNING HEADERS, FOOTERS & WATERMARKS (All Pages) ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Subtle diagonal watermark
    try {
      const wmState = new (doc as any).GState({ opacity: 0.05 });
      doc.saveGraphicsState();
      doc.setGState(wmState);
      doc.setTextColor(43, 87, 154);
      doc.setFontSize(44);
      doc.setFont("helvetica", "bold");
      doc.text(business.name.toUpperCase(), pageWidth / 2, pageHeight / 2, {
        align: "center",
        angle: 35,
      });
      doc.restoreGraphicsState();
    } catch {
      // GState fallback
    }

    // Top subtle runner on pages 2+
    if (p > 1) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...REPORT_THEME_RGB.textMuted);
      doc.text(`${business.name} • ${payload.title}`, 14, 10);
      doc.text(format(now, "yyyy-MM-dd"), pageWidth - 14, 10, { align: "right" });
      doc.setDrawColor(...REPORT_THEME_RGB.border);
      doc.line(14, 12, pageWidth - 14, 12);
    }

    // Bottom Running Footer
    doc.setDrawColor(...REPORT_THEME_RGB.border);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...REPORT_THEME_RGB.textMuted);
    const footerContact = [business.phone, business.email, business.website]
      .filter(Boolean)
      .join("  |  ");
    doc.text(`${business.name} — ${footerContact}`, 14, pageHeight - 7);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - 14, pageHeight - 7, {
      align: "right",
    });
  }

  // Save / Trigger Download
  const cleanTitle = payload.title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
  const fileName = `${cleanTitle}_${format(now, "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
  return fileName;
};

// ============================================================================
// 2. EXCEL (XLSX) BUSINESS REPORT TEMPLATE (ExcelJS)
// ============================================================================

export const generateBusinessReportXLSX = async (
  payload: BusinessReportPayload
): Promise<string> => {
  const workbook = new ExcelJS.Workbook();
  const business = resolveBusinessProfile(payload.business);
  const now = payload.generatedAt || new Date();

  workbook.creator = business.name;
  workbook.lastModifiedBy = business.name;
  workbook.created = now;

  // Load logo buffer
  let logoBuffer: ArrayBuffer | null = null;
  if (business.logoUrl) {
    logoBuffer = await fetchImageBuffer(business.logoUrl);
  }

  const borderThin: ExcelJS.Border = {
    style: "thin",
    color: { argb: `FF${REPORT_THEME.border}` },
  };

  // --- SHEET 1: EXECUTIVE COVER & SUMMARY ---
  const coverSheet = workbook.addWorksheet("Overview", {
    views: [{ showGridLines: false }],
  });
  coverSheet.properties.tabColor = { argb: `FF${REPORT_THEME.accent}` };

  const totalCols = 6;
  const lastColLetter = colToLetter(totalCols);

  // Row heights
  coverSheet.getRow(1).height = 18;
  coverSheet.getRow(2).height = 24;
  coverSheet.getRow(3).height = 18;
  coverSheet.getRow(4).height = 5;

  // Business Name
  coverSheet.mergeCells(`B2:${lastColLetter}2`);
  const bNameCell = coverSheet.getCell("B2");
  bNameCell.value = business.name.toUpperCase();
  bNameCell.font = { name: "Calibri", size: 18, bold: true, color: { argb: `FF${REPORT_THEME.primary}` } };
  bNameCell.alignment = { vertical: "middle", horizontal: "left" };

  // Tagline
  if (business.tagline) {
    coverSheet.mergeCells(`B3:${lastColLetter}3`);
    const tagCell = coverSheet.getCell("B3");
    tagCell.value = business.tagline;
    tagCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: `FF${REPORT_THEME.accent}` } };
    tagCell.alignment = { vertical: "middle", horizontal: "left" };
  }

  // Embed Logo Image if available
  if (logoBuffer) {
    try {
      const imgId = workbook.addImage({ buffer: logoBuffer, extension: "png" });
      coverSheet.addImage(imgId, {
        tl: { col: 0.1, row: 0.8 },
        ext: { width: 90, height: 48 },
      });
      coverSheet.getColumn(1).width = 16;
    } catch {
      // Fallback
    }
  }

  // Accent divider line (Row 5)
  const sepRow = coverSheet.getRow(5);
  sepRow.height = 4;
  for (let c = 1; c <= totalCols; c++) {
    sepRow.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${REPORT_THEME.accent}` },
    };
  }

  // Business Contact Details Box (Rows 7-11)
  const contactRows = [
    ["Report Title:", payload.title],
    ["Business Entity:", business.name],
    ["Contact Phone:", business.phone || "-"],
    ["Contact Email:", business.email || "-"],
    ["Official Website:", business.website || "-"],
    ["GSTIN / Tax ID:", business.gstin || "-"],
    ["Address / Location:", [business.address, business.city, business.state, business.pincode].filter(Boolean).join(", ") || "-"],
    ["Reporting Period:", payload.dateRange?.from && payload.dateRange?.to
      ? `${format(payload.dateRange.from, "MMM dd, yyyy")} to ${format(payload.dateRange.to, "MMM dd, yyyy")}`
      : format(now, "MMM dd, yyyy")],
    ["Generated Timestamp:", format(now, "yyyy-MM-dd HH:mm:ss")],
  ];

  let curRow = 7;
  contactRows.forEach(([lbl, val]) => {
    const row = coverSheet.getRow(curRow);
    row.height = 20;

    const lblCell = row.getCell(1);
    lblCell.value = lbl;
    lblCell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: `FF${REPORT_THEME.textDark}` } };

    coverSheet.mergeCells(`B${curRow}:${lastColLetter}${curRow}`);
    const valCell = row.getCell(2);
    valCell.value = val;
    valCell.font = { name: "Calibri", size: 9.5, color: { argb: `FF${REPORT_THEME.textDark}` } };

    for (let c = 1; c <= totalCols; c++) {
      row.getCell(c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: curRow % 2 === 0 ? "FFF1F5F9" : "FFFFFFFF" },
      };
      row.getCell(c).border = { bottom: borderThin };
    }
    curRow++;
  });

  curRow += 2;

  // Executive KPI summary block
  const allKpis = [
    ...(payload.kpis || []),
    ...payload.sections.flatMap((s) => s.kpis || []),
  ];

  if (allKpis.length > 0) {
    coverSheet.getCell(`A${curRow}`).value = "KEY PERFORMANCE INDICATORS";
    coverSheet.getCell(`A${curRow}`).font = { name: "Calibri", size: 11, bold: true, color: { argb: `FF${REPORT_THEME.primary}` } };
    curRow++;

    // KPI Table Header
    const kpiHdr = coverSheet.getRow(curRow);
    kpiHdr.height = 24;
    ["#", "Metric Description", "Performance Value"].forEach((h, i) => {
      const cell = kpiHdr.getCell(i + 1);
      cell.value = h;
      cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${REPORT_THEME.primary}` } };
      cell.alignment = { vertical: "middle", horizontal: i === 2 ? "right" : "left" };
    });
    curRow++;

    allKpis.forEach((kpi, idx) => {
      const r = coverSheet.getRow(curRow);
      r.height = 20;
      r.getCell(1).value = idx + 1;
      r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      r.getCell(2).value = kpi.label;
      r.getCell(2).font = { bold: true };

      const vCell = r.getCell(3);
      if (typeof kpi.value === "number") {
        vCell.value = kpi.value;
        vCell.numFmt = "#,##0.00";
        vCell.alignment = { horizontal: "right", vertical: "middle" };
      } else {
        vCell.value = String(kpi.value);
        vCell.alignment = { horizontal: "right", vertical: "middle" };
      }

      for (let c = 1; c <= 3; c++) {
        r.getCell(c).border = { bottom: borderThin, left: borderThin, right: borderThin };
        if (idx % 2 === 1) {
          r.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${REPORT_THEME.lightBg}` } };
        }
      }
      curRow++;
    });

    curRow += 2;
  }

  // Table of Contents / Sections List
  coverSheet.getCell(`A${curRow}`).value = "REPORT CONTENTS & DATA SHEETS";
  coverSheet.getCell(`A${curRow}`).font = { name: "Calibri", size: 11, bold: true, color: { argb: `FF${REPORT_THEME.primary}` } };
  curRow++;

  const tocHdr = coverSheet.getRow(curRow);
  tocHdr.height = 24;
  ["#", "Worksheet Name", "Section Title", "Record Count"].forEach((h, i) => {
    const cell = tocHdr.getCell(i + 1);
    cell.value = h;
    cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${REPORT_THEME.primary}` } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  curRow++;

  payload.sections.forEach((sec, idx) => {
    const sheetName = sec.title.substring(0, 28).replace(/[/\\?*[\]]/g, "");
    const r = coverSheet.getRow(curRow);
    r.height = 20;
    r.getCell(1).value = idx + 1;
    r.getCell(2).value = sheetName;
    r.getCell(3).value = sec.title;
    r.getCell(4).value = sec.tableData?.length || 0;

    for (let c = 1; c <= 4; c++) {
      r.getCell(c).border = { bottom: borderThin };
      r.getCell(c).alignment = { vertical: "middle" };
    }
    curRow++;
  });

  // Auto column widths for overview
  coverSheet.getColumn(1).width = 22;
  coverSheet.getColumn(2).width = 30;
  coverSheet.getColumn(3).width = 35;
  coverSheet.getColumn(4).width = 18;

  // --- SHEET 2+: PER-SECTION DATA WORKSHEETS ---
  for (const section of payload.sections) {
    const sheetName = section.title.substring(0, 28).replace(/[/\\?*[\]]/g, "");
    const rawData = section.tableData || [];
    const columns = section.columns && section.columns.length > 0
      ? section.columns
      : deriveColumns(rawData);

    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }],
    });
    sheet.properties.tabColor = { argb: `FF${REPORT_THEME.primary}` };

    const secTotalCols = Math.max(columns.length, 5);
    const secLastCol = colToLetter(secTotalCols);

    // Section Header Banner
    sheet.mergeCells(`A1:${secLastCol}1`);
    const h1 = sheet.getCell("A1");
    h1.value = `${business.name.toUpperCase()} — ${section.title.toUpperCase()}`;
    h1.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    h1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${REPORT_THEME.primary}` } };
    h1.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    sheet.getRow(1).height = 30;

    // Contact Subtitle Line
    sheet.mergeCells(`A2:${secLastCol}2`);
    const h2 = sheet.getCell("A2");
    h2.value = `Tel: ${business.phone || "-"}  |  Email: ${business.email || "-"}  |  Period: ${
      payload.dateRange?.from && payload.dateRange?.to
        ? `${format(payload.dateRange.from, "MMM dd, yyyy")} - ${format(payload.dateRange.to, "MMM dd, yyyy")}`
        : format(now, "MMM dd, yyyy")
    }`;
    h2.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FFFFFFFF" } };
    h2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${REPORT_THEME.accent}` } };
    h2.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    sheet.getRow(2).height = 18;

    let tableStartRow = 4;

    // Optional Section KPIs
    if (section.kpis && section.kpis.length > 0) {
      section.kpis.forEach((kpi, kIdx) => {
        const kRow = sheet.getRow(tableStartRow);
        kRow.height = 19;
        kRow.getCell(1).value = kpi.label;
        kRow.getCell(1).font = { bold: true, size: 9.5 };
        kRow.getCell(2).value = typeof kpi.value === "number" ? kpi.value : String(kpi.value);
        if (typeof kpi.value === "number") kRow.getCell(2).numFmt = "#,##0.00";
        tableStartRow++;
      });
      tableStartRow++;
    }

    // Render Data Table
    if (columns.length > 0 && rawData.length > 0) {
      const headerRowIndex = tableStartRow;
      const headerRow = sheet.getRow(headerRowIndex);
      headerRow.height = 26;

      columns.forEach((col, cIdx) => {
        const cell = headerRow.getCell(cIdx + 1);
        cell.value = col.header;
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${REPORT_THEME.primary}` } };
        cell.alignment = { vertical: "middle", horizontal: col.align || "left", wrapText: true };
        cell.border = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };
      });

      let dataRowIndex = headerRowIndex + 1;
      rawData.forEach((rowObj, rIdx) => {
        const row = sheet.getRow(dataRowIndex);
        row.height = 20;

        columns.forEach((col, cIdx) => {
          const cell = row.getCell(cIdx + 1);
          const raw = rowObj[col.key];

          if (typeof raw === "number") {
            cell.value = raw;
            cell.alignment = { vertical: "middle", horizontal: "right" };
            if (col.isCurrency || /price|cost|amount|revenue|total/i.test(col.key)) {
              cell.numFmt = "#,##0.00";
            }
          } else {
            cell.value = formatCellDisplay(raw);
            cell.alignment = { vertical: "middle", horizontal: col.align || "left" };
          }

          cell.font = { name: "Calibri", size: 9.5, color: { argb: `FF${REPORT_THEME.textDark}` } };
          if (rIdx % 2 === 1) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${REPORT_THEME.lightBg}` } };
          }
          cell.border = { bottom: borderThin, left: borderThin, right: borderThin };
        });

        dataRowIndex++;
      });

      // Freeze header row
      sheet.views = [{ state: "frozen", xSplit: 0, ySplit: headerRowIndex, showGridLines: true }];
      // Enable autofilter
      sheet.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: dataRowIndex - 1, column: columns.length },
      };

      // Auto-fit column widths
      columns.forEach((col, cIdx) => {
        const maxLen = Math.max(
          col.header.length,
          ...rawData.map((r) => String(formatCellDisplay(r[col.key])).length)
        );
        sheet.getColumn(cIdx + 1).width = Math.min(48, Math.max(14, maxLen + 3));
      });
    }
  }

  // Download buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const cleanTitle = payload.title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
  const fileName = `${cleanTitle}_${format(now, "yyyy-MM-dd")}.xlsx`;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
  return fileName;
};

// ============================================================================
// 3. EDITABLE POWERPOINT (PPTX) TEMPLATE (pptxgenjs)
// ============================================================================

export const generateBusinessReportPPTX = async (
  payload: BusinessReportPayload
): Promise<string> => {
  const pptx = new pptxgen();
  const business = resolveBusinessProfile(payload.business);
  const now = payload.generatedAt || new Date();

  pptx.layout = "LAYOUT_16x9";
  pptx.author = business.name;
  pptx.company = business.name;
  pptx.title = payload.title;

  // --- MASTER SLIDE LAYOUT ---
  pptx.defineSlideMaster({
    title: "BUSINESS_MASTER",
    background: { color: "FFFFFF" },
    objects: [
      // Top Primary Blue Bar
      { rect: { x: 0, y: 0, w: "100%", h: 0.14, fill: { color: REPORT_THEME.primary } } },
      // Top Accent Orange Line
      { rect: { x: 0, y: 0.14, w: "100%", h: 0.04, fill: { color: REPORT_THEME.accent } } },
      // Top-Right Logo if available
      business.logoUrl
        ? { image: { x: 8.8, y: 0.22, w: 0.85, h: 0.42, path: business.logoUrl } }
        : { text: { text: business.name, options: { x: 7.5, y: 0.22, w: 2.2, h: 0.3, color: REPORT_THEME.primary, fontSize: 11, bold: true, align: "right" } } },
      // Diagonal Background Watermark
      {
        text: {
          text: business.name.toUpperCase(),
          options: {
            x: 1.0,
            y: 2.2,
            w: 8.0,
            h: 1.2,
            color: "F1F5F9",
            fontSize: 34,
            bold: true,
            rotate: 335,
            align: "center",
          },
        },
      },
      // Bottom Running Contact Line
      {
        text: {
          text: `${business.name} • Tel: ${business.phone || "-"} • Email: ${business.email || "-"} • Web: ${business.website || "-"}`,
          options: { x: 0.5, y: "93%", w: "70%", h: 0.3, color: REPORT_THEME.textMuted, fontSize: 8.5 },
        },
      },
    ],
    slideNumber: { x: "90%", y: "93%", color: REPORT_THEME.textMuted, fontSize: 8.5 },
  });

  // --- SLIDE 1: EXECUTIVE COVER SLIDE ---
  const coverSlide = pptx.addSlide({ masterName: "BUSINESS_MASTER" });

  // Large decorative background block
  coverSlide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: "28%",
    w: "100%",
    h: "46%",
    fill: { color: REPORT_THEME.lightBg },
  });
  // Orange vertical accent stripe
  coverSlide.addShape(pptx.ShapeType.rect, {
    x: "8%",
    y: "28%",
    w: 0.12,
    h: "46%",
    fill: { color: REPORT_THEME.accent },
  });

  // Brand Logo
  if (business.logoUrl) {
    coverSlide.addImage({ path: business.logoUrl, x: 0.8, y: 0.5, w: 2.2, h: 1.0 });
  }

  // Report Title
  coverSlide.addText(payload.title.toUpperCase(), {
    x: 1.0,
    y: "32%",
    w: "80%",
    h: 0.8,
    fontSize: 30,
    bold: true,
    color: REPORT_THEME.primary,
  });

  // Subtitle / Entity Name
  const subTitleText = payload.subtitle || business.name;
  coverSlide.addText(subTitleText, {
    x: 1.0,
    y: "43%",
    w: "80%",
    h: 0.5,
    fontSize: 16,
    color: REPORT_THEME.textDark,
  });

  // Period / Date
  const periodText = payload.dateRange?.from && payload.dateRange?.to
    ? `Reporting Period: ${format(payload.dateRange.from, "MMM dd, yyyy")} - ${format(payload.dateRange.to, "MMM dd, yyyy")}`
    : `Generated On: ${format(now, "MMMM dd, yyyy")}`;
  coverSlide.addText(periodText, {
    x: 1.0,
    y: "50%",
    w: "80%",
    h: 0.4,
    fontSize: 11,
    color: REPORT_THEME.textMuted,
  });

  // Contact Details Card at Bottom of Cover Slide
  const contactCard = [
    `Phone: ${business.phone || "-"}`,
    `Email: ${business.email || "-"}`,
    `Web: ${business.website || "-"}`,
    `GSTIN: ${business.gstin || "-"}`,
  ].join("   •   ");
  coverSlide.addText(contactCard, {
    x: 1.0,
    y: "58%",
    w: "80%",
    h: 0.4,
    fontSize: 9.5,
    color: REPORT_THEME.accent,
    bold: true,
  });

  // --- SLIDE 2: EXECUTIVE SUMMARY & EDITABLE CHART SLIDE ---
  const allKpis = [
    ...(payload.kpis || []),
    ...payload.sections.flatMap((s) => s.kpis || []),
  ];

  if (allKpis.length > 0 || payload.sections.some((s) => s.chartData && s.chartData.length > 0)) {
    const summarySlide = pptx.addSlide({ masterName: "BUSINESS_MASTER" });

    // Header
    summarySlide.addText("Executive Summary & Performance Dashboard", {
      x: 0.5,
      y: 0.4,
      w: "85%",
      h: 0.5,
      fontSize: 22,
      bold: true,
      color: REPORT_THEME.primary,
    });

    // KPI Cards on Left Side
    let kpiY = 1.1;
    allKpis.slice(0, 4).forEach((kpi) => {
      // Background card
      summarySlide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: kpiY,
        w: 3.3,
        h: 0.82,
        fill: { color: REPORT_THEME.lightBg },
        line: { color: REPORT_THEME.border, width: 1 },
        rectRadius: 0.08,
      });
      // Left Accent Strip
      summarySlide.addShape(pptx.ShapeType.rect, {
        x: 0.5,
        y: kpiY,
        w: 0.08,
        h: 0.82,
        fill: { color: REPORT_THEME.accent },
      });
      // Label
      summarySlide.addText(kpi.label.toUpperCase(), {
        x: 0.65,
        y: kpiY + 0.08,
        w: 3.0,
        h: 0.28,
        fontSize: 9,
        bold: true,
        color: REPORT_THEME.textMuted,
      });
      // Value
      summarySlide.addText(String(kpi.value).replace(/₹/g, "Rs. "), {
        x: 0.65,
        y: kpiY + 0.36,
        w: 3.0,
        h: 0.4,
        fontSize: 16,
        bold: true,
        color: REPORT_THEME.textDark,
      });

      kpiY += 0.95;
    });

    // Native EDITABLE Chart on Right Side
    const firstChartSection = payload.sections.find((s) => s.chartData && s.chartData.length > 0);
    if (firstChartSection && firstChartSection.chartData) {
      const chartLabels = firstChartSection.chartData.map((d) => String(d.name));
      const chartValues = firstChartSection.chartData.map((d) => Number(d.value) || 0);

      const pptxChartData = [
        {
          name: firstChartSection.title || "Performance",
          labels: chartLabels,
          values: chartValues,
        },
      ];

      if (firstChartSection.chartData.length <= 5) {
        // Doughnut / Pie Chart
        summarySlide.addChart(pptx.ChartType.doughnut, pptxChartData, {
          x: 4.2,
          y: 1.1,
          w: 5.3,
          h: 3.7,
          showLegend: true,
          legendPos: "r",
          holeSize: 55,
          chartColors: [
            REPORT_THEME.primary,
            REPORT_THEME.accent,
            "10B981",
            "3B82F6",
            "8B5CF6",
          ],
        });
      } else {
        // Bar Chart
        summarySlide.addChart(pptx.ChartType.bar, pptxChartData, {
          x: 4.2,
          y: 1.1,
          w: 5.3,
          h: 3.7,
          showLegend: false,
          barDir: "col",
          chartColors: [REPORT_THEME.primary],
          showValue: true,
          valGridLine: { color: REPORT_THEME.border, style: "dash" },
        });
      }
    }
  }

  // --- SLIDE 3+: PAGINATED EDITABLE DATA TABLES ---
  const ROWS_PER_SLIDE = 10;
  for (const section of payload.sections) {
    const rawData = section.tableData || [];
    if (rawData.length === 0) continue;

    const columns = (section.columns && section.columns.length > 0
      ? section.columns
      : deriveColumns(rawData)
    ).slice(0, 6);

    const totalSlides = Math.ceil(rawData.length / ROWS_PER_SLIDE);

    for (let pIdx = 0; pIdx < totalSlides; pIdx++) {
      const tableSlide = pptx.addSlide({ masterName: "BUSINESS_MASTER" });
      const sliceStart = pIdx * ROWS_PER_SLIDE;
      const sliceEnd = Math.min(sliceStart + ROWS_PER_SLIDE, rawData.length);
      const pageTag = totalSlides > 1 ? ` (${pIdx + 1}/${totalSlides})` : "";

      // Section Title
      tableSlide.addText(`${section.title}${pageTag}`, {
        x: 0.5,
        y: 0.35,
        w: "85%",
        h: 0.45,
        fontSize: 18,
        bold: true,
        color: REPORT_THEME.primary,
      });

      // Construct Native PowerPoint Table Rows
      const pptxRows: pptxgen.TableRow[] = [];

      // Header Row (Brand Blue background, White bold text)
      pptxRows.push(
        columns.map((c) => ({
          text: c.header,
          options: {
            fill: { color: REPORT_THEME.primary },
            color: "FFFFFF",
            bold: true,
            fontSize: 10,
            align: c.align || "left",
            valign: "middle",
          },
        }))
      );

      // Data Rows
      rawData.slice(sliceStart, sliceEnd).forEach((rowObj, rIdx) => {
        const isAlternate = rIdx % 2 === 1;
        pptxRows.push(
          columns.map((col) => {
            const raw = rowObj[col.key];
            const textVal = col.isCurrency
              ? formatSafeCurrency(raw)
              : formatCellDisplay(raw);

            return {
              text: textVal.length > 35 ? textVal.substring(0, 35) + "..." : textVal,
              options: {
                fill: { color: isAlternate ? REPORT_THEME.lightBg : "FFFFFF" },
                color: REPORT_THEME.textDark,
                fontSize: 9,
                align: col.align || "left",
                valign: "middle",
                border: { type: "solid" as const, color: REPORT_THEME.border, pt: 1 },
              },
            };
          })
        );
      });

      tableSlide.addTable(pptxRows, {
        x: 0.5,
        y: 1.0,
        w: 9.0,
        rowH: 0.32,
      });

      tableSlide.addText(
        `Showing records ${sliceStart + 1}–${sliceEnd} of ${rawData.length}`,
        {
          x: 0.5,
          y: 4.8,
          w: 9.0,
          h: 0.3,
          fontSize: 8.5,
          color: REPORT_THEME.textMuted,
          italic: true,
        }
      );
    }
  }

  // --- FINAL SLIDE: CORPORATE CONTACT & CONCLUSION ---
  const closingSlide = pptx.addSlide({ masterName: "BUSINESS_MASTER" });

  closingSlide.addText("Thank You", {
    x: 0.5,
    y: 0.8,
    w: "90%",
    h: 0.7,
    fontSize: 32,
    bold: true,
    color: REPORT_THEME.primary,
  });

  closingSlide.addText("For audits, management inquiries, or support regarding this report:", {
    x: 0.5,
    y: 1.5,
    w: "90%",
    h: 0.4,
    fontSize: 13,
    color: REPORT_THEME.textMuted,
  });

  // Business Card Box
  closingSlide.addShape(pptx.ShapeType.roundRect, {
    x: 0.5,
    y: 2.1,
    w: 5.5,
    h: 2.4,
    fill: { color: REPORT_THEME.lightBg },
    line: { color: REPORT_THEME.border, width: 1 },
    rectRadius: 0.1,
  });
  closingSlide.addShape(pptx.ShapeType.rect, {
    x: 0.5,
    y: 2.1,
    w: 0.1,
    h: 2.4,
    fill: { color: REPORT_THEME.accent },
  });

  const businessLines = [
    `Organization: ${business.name}`,
    `Address: ${[business.address, business.city, business.state, business.pincode].filter(Boolean).join(", ") || "-"}`,
    `Phone: ${business.phone || "-"}`,
    `Email: ${business.email || "-"}`,
    `Website: ${business.website || "-"}`,
    `GSTIN: ${business.gstin || "-"}`,
  ];

  closingSlide.addText(businessLines.join("\n"), {
    x: 0.8,
    y: 2.25,
    w: 5.0,
    h: 2.1,
    fontSize: 10,
    color: REPORT_THEME.textDark,
    lineSpacing: 18,
  });

  const cleanTitle = payload.title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
  const fileName = `${cleanTitle}_${format(now, "yyyy-MM-dd")}.pptx`;
  await pptx.writeFile({ fileName });
  return fileName;
};

// ============================================================================
// 4. UNIFIED EXPORT DISPATCHER & SAMPLE PREVIEW GENERATOR
// ============================================================================

export const exportBusinessReport = async (
  formatType: "pdf" | "xlsx" | "pptx",
  payload: BusinessReportPayload
): Promise<string> => {
  switch (formatType) {
    case "pdf":
      return await generateBusinessReportPDF(payload);
    case "xlsx":
      return await generateBusinessReportXLSX(payload);
    case "pptx":
      return await generateBusinessReportPPTX(payload);
    default:
      throw new Error(`Unsupported report format: ${formatType}`);
  }
};

/**
 * Generates sample boardroom business report payload for instant testing/preview
 */
export const getSampleBusinessReportPayload = (
  customBusiness?: Partial<BusinessContactDetails>
): BusinessReportPayload => {
  return {
    business: customBusiness,
    title: "Executive Business Performance & Sales Report",
    subtitle: "Consolidated Operations, Revenue & Category Breakdown",
    category: "Financial & Operations Audit",
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
    generatedBy: "System Auditor",
    generatedAt: new Date(),
    kpis: [
      { label: "Gross Revenue", value: 485230, trend: "up" },
      { label: "Total Orders", value: 1240, trend: "up" },
      { label: "Average Order Value", value: 391.31, trend: "neutral" },
      { label: "Net Operating Margin", value: "32.4%", trend: "up" },
    ],
    sections: [
      {
        id: "category_breakdown",
        title: "Revenue by Category",
        subtitle: "Performance breakdown across primary food & beverage categories",
        kpis: [
          { label: "Top Category", value: "Main Course (42%)" },
          { label: "Fastest Growing", value: "Beverages (+18%)" },
        ],
        chartData: [
          { name: "Main Course", value: 203800 },
          { name: "Starters & Appetizers", value: 116450 },
          { name: "Beverages", value: 72800 },
          { name: "Desserts", value: 48500 },
          { name: "Combos & Specials", value: 43680 },
        ],
        chartType: "doughnut",
        tableData: [
          { category: "Main Course", items_sold: 480, revenue: 203800, share_pct: "42.0%" },
          { category: "Starters & Appetizers", items_sold: 360, revenue: 116450, share_pct: "24.0%" },
          { category: "Beverages", items_sold: 290, revenue: 72800, share_pct: "15.0%" },
          { category: "Desserts", items_sold: 160, revenue: 48500, share_pct: "10.0%" },
          { category: "Combos & Specials", items_sold: 95, revenue: 43680, share_pct: "9.0%" },
        ],
        columns: [
          { key: "category", header: "Category Name", align: "left" },
          { key: "items_sold", header: "Units Sold", align: "right" },
          { key: "revenue", header: "Total Revenue", align: "right", isCurrency: true },
          { key: "share_pct", header: "Sales Share", align: "right" },
        ],
      },
      {
        id: "daily_trends",
        title: "Recent Transaction Audit",
        subtitle: "Audit sample of recent daily sales ledger",
        tableData: [
          { date: "2026-11-01", orders: 48, gross_sales: 18750, discounts: 950, net_sales: 17800 },
          { date: "2026-11-02", orders: 52, gross_sales: 20400, discounts: 1100, net_sales: 19300 },
          { date: "2026-11-03", orders: 41, gross_sales: 15900, discounts: 600, net_sales: 15300 },
          { date: "2026-11-04", orders: 63, gross_sales: 24800, discounts: 1450, net_sales: 23350 },
          { date: "2026-11-05", orders: 58, gross_sales: 22600, discounts: 1200, net_sales: 21400 },
          { date: "2026-11-06", orders: 74, gross_sales: 29800, discounts: 1800, net_sales: 28000 },
          { date: "2026-11-07", orders: 82, gross_sales: 33500, discounts: 2100, net_sales: 31400 },
        ],
        columns: [
          { key: "date", header: "Date", align: "left" },
          { key: "orders", header: "Order Count", align: "right" },
          { key: "gross_sales", header: "Gross Sales", align: "right", isCurrency: true },
          { key: "discounts", header: "Discounts", align: "right", isCurrency: true },
          { key: "net_sales", header: "Net Sales", align: "right", isCurrency: true },
        ],
      },
    ],
  };
};
