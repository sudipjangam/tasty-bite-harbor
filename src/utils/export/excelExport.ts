import ExcelJS from "exceljs";
import { format } from "date-fns";
import { ReportData } from "@/hooks/useReportsData";
import {
  BRAND_ORANGE,
  BRAND_BLUE,
  TEXT_DARK,
  TEXT_MUTED,
  formatColumnName,
  formatCellValue,
  getDisplayColumns,
} from "./exportConstants";

const BRAND_TAGLINE = "Empowering Restaurants, Enabling Growth";

const colToLetter = (col: number): string => {
  let s = "",
    n = col;
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
};

const calcAutoWidth = (values: string[], header: string, min = 12, max = 50): number => {
  const maxLen = Math.max(header.length, ...values.map((v) => v.length));
  return Math.min(max, Math.max(min, Math.ceil(maxLen * 1.1) + 2));
};

const fillRow = (
  sheet: ExcelJS.Worksheet,
  row: number,
  cols: number,
  color: string,
  h = 4
) => {
  const r = sheet.getRow(row);
  r.height = h;
  for (let c = 1; c <= cols; c++)
    r.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${color}` },
    };
};

const thinBorder = (color = "FFE2E8F0"): ExcelJS.Border => ({
  style: "thin",
  color: { argb: color },
});

const addBrandedHeader = (
  sheet: ExcelJS.Worksheet,
  workbook: ExcelJS.Workbook,
  logoBuffer: ArrayBuffer | null,
  totalCols: number,
  title: string,
  restaurant: string | null,
  dateRange?: { from?: Date; to?: Date },
  reportType?: string
): number => {
  const lc = colToLetter(Math.max(totalCols, 6));

  if (logoBuffer) {
    sheet.getColumn(1).width = Math.max(sheet.getColumn(1).width || 0, 15);
    sheet.mergeCells(`B1:${lc}2`);
    const bc = sheet.getCell("B1");
    bc.value = "SWADESHI SOLUTIONS";
    bc.font = {
      name: "Calibri",
      size: 22,
      bold: true,
      color: { argb: `FF${BRAND_BLUE}` },
    };
    bc.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  } else {
    sheet.mergeCells(`A1:${lc}2`);
    const bc = sheet.getCell("A1");
    bc.value = "SWADESHI SOLUTIONS";
    bc.font = {
      name: "Calibri",
      size: 22,
      bold: true,
      color: { argb: `FF${BRAND_BLUE}` },
    };
    bc.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  }
  sheet.getRow(1).height = 22;
  sheet.getRow(2).height = 22;

  // Tagline
  if (logoBuffer) {
    sheet.mergeCells(`B3:${lc}3`);
    const tc = sheet.getCell("B3");
    tc.value = BRAND_TAGLINE;
    tc.font = {
      name: "Calibri",
      size: 11,
      italic: true,
      color: { argb: `FF${BRAND_ORANGE}` },
    };
    tc.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  } else {
    sheet.mergeCells(`A3:${lc}3`);
    const tc = sheet.getCell("A3");
    tc.value = BRAND_TAGLINE;
    tc.font = {
      name: "Calibri",
      size: 11,
      italic: true,
      color: { argb: `FF${BRAND_ORANGE}` },
    };
    tc.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  }
  sheet.getRow(3).height = 18;

  // Add logo image if buffer exists
  if (logoBuffer) {
    try {
      const imageId = workbook.addImage({
        buffer: logoBuffer,
        extension: "png",
      });
      sheet.addImage(imageId, {
        tl: { col: 0.1, row: 0.15 },
        ext: { width: 110, height: 60 },
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
    [
      "Report Period:",
      dateRange?.from && dateRange?.to
        ? `${format(dateRange.from, "MMM dd, yyyy")} — ${format(
            dateRange.to,
            "MMM dd, yyyy"
          )}`
        : format(new Date(), "MMM dd, yyyy"),
    ],
    ["Generated On:", format(new Date(), "MMM dd, yyyy, hh:mm a")],
    ...(reportType ? [["Report Type:", reportType]] : []),
  ];
  const ms = 6;
  meta.forEach(([label, val], i) => {
    const r = ms + i;
    const cA = sheet.getCell(`A${r}`);
    cA.value = label;
    cA.font = {
      name: "Calibri",
      size: 10,
      bold: true,
      color: { argb: `FF${TEXT_DARK}` },
    };
    sheet.mergeCells(`B${r}:${lc}${r}`);
    const cB = sheet.getCell(`B${r}`);
    cB.value = val;
    cB.font = {
      name: "Calibri",
      size: 10,
      color: { argb: `FF${TEXT_DARK}` },
    };
    for (let c = 1; c <= Math.max(totalCols, 6); c++)
      sheet.getRow(r).getCell(c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };
  });
  const am = ms + meta.length;
  sheet.getRow(am).height = 6;
  fillRow(sheet, am + 1, Math.max(totalCols, 6), BRAND_BLUE, 3);
  return am + 3;
};

const writeBrandedTable = (
  sheet: ExcelJS.Worksheet,
  startRow: number,
  columns: string[],
  data: Record<string, unknown>[],
  sectionTitle?: string,
  freeze = false
): number => {
  let cr = startRow;
  if (sectionTitle) {
    sheet.getCell(`A${cr}`).value = sectionTitle;
    sheet.getCell(`A${cr}`).font = {
      name: "Calibri",
      size: 12,
      bold: true,
      color: { argb: `FF${BRAND_ORANGE}` },
    };
    cr++;
  }
  // Header
  const hr = cr;
  const hRow = sheet.getRow(cr);
  hRow.height = 28;
  columns.forEach((col, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = formatColumnName(col);
    cell.font = {
      name: "Calibri",
      size: 10,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${BRAND_BLUE}` },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: thinBorder(`FF${BRAND_BLUE}`),
      bottom: thinBorder(`FF${BRAND_BLUE}`),
      left: thinBorder("FFB0BEC5"),
      right: thinBorder("FFB0BEC5"),
    };
  });
  cr++;
  // Data rows
  data.forEach((dr, ri) => {
    const row = sheet.getRow(cr);
    row.height = 22;
    columns.forEach((col, ci) => {
      const cell = row.getCell(ci + 1);
      const raw = dr[col];
      if (typeof raw === "number") {
        cell.value = raw;
        cell.alignment = { horizontal: "right", vertical: "middle" };
        if (
          /price|cost|amount|revenue|total|value|spent|sales|tax|discount|tip/i.test(
            col
          )
        )
          cell.numFmt = "#,##0.00";
      } else {
        cell.value = formatCellValue(raw);
        cell.alignment = { vertical: "middle", wrapText: true };
      }
      cell.font = {
        name: "Calibri",
        size: 10,
        color: { argb: `FF${TEXT_DARK}` },
      };
      if (ri % 2 === 1)
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      cell.border = {
        bottom: thinBorder(),
        left: thinBorder("FFE2E8F0"),
        right: thinBorder("FFE2E8F0"),
      };
    });
    cr++;
  });

  // Auto column widths
  columns.forEach((col, i) => {
    const vals = data.map((d) => String(formatCellValue(d[col])));
    const currentW = sheet.getColumn(i + 1).width || 12;
    sheet.getColumn(i + 1).width = Math.max(
      currentW,
      calcAutoWidth(vals, formatColumnName(col))
    );
  });

  if (freeze) sheet.views = [{ state: "frozen", ySplit: hr }];
  return cr;
};

const addFooter = (
  sheet: ExcelJS.Worksheet,
  row: number,
  totalCols: number
) => {
  const r = row + 1;
  fillRow(sheet, r, Math.max(totalCols, 4), BRAND_ORANGE, 2);
  sheet.mergeCells(
    `A${r + 1}:${colToLetter(Math.max(totalCols, 4))}${r + 1}`
  );
  const fc = sheet.getCell(`A${r + 1}`);
  fc.value = `Swadeshi Solutions RMS · Generated on ${format(
    new Date(),
    "yyyy-MM-dd HH:mm"
  )} · Confidential`;
  fc.font = {
    name: "Calibri",
    size: 9,
    italic: true,
    color: { argb: `FF${TEXT_MUTED}` },
  };
  fc.alignment = { vertical: "middle", horizontal: "center" };
};

const downloadExcelBuffer = async (
  workbook: ExcelJS.Workbook,
  fileName: string
) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

export const generateBrandedExcel = async (
  reports: ReportData[],
  restaurantName: string | null,
  dateRange?: { from?: Date; to?: Date }
) => {
  let logoBuffer: ArrayBuffer | null = null;
  try {
    const response = await fetch("/swadeshi-logo.png");
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
  const cover = workbook.addWorksheet("Summary", {
    views: [{ showGridLines: false }],
  });
  cover.properties.tabColor = { argb: `FF${BRAND_ORANGE}` };
  let cr = addBrandedHeader(
    cover,
    workbook,
    logoBuffer,
    4,
    "Business Report",
    restaurantName,
    dateRange,
    "Multi-Category Analysis"
  );
  cover.getCell(`A${cr}`).value = "REPORTS INCLUDED";
  cover.getCell(`A${cr}`).font = {
    name: "Calibri",
    size: 12,
    bold: true,
    color: { argb: `FF${BRAND_ORANGE}` },
  };
  cr++;
  const tocHdr = cover.getRow(cr);
  tocHdr.height = 26;
  ["#", "Report Name", "Category", "Records"].forEach((h, i) => {
    const c = tocHdr.getCell(i + 1);
    c.value = h;
    c.font = {
      name: "Calibri",
      size: 10,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${BRAND_BLUE}` },
    };
    c.alignment = { vertical: "middle", horizontal: "center" };
  });
  cr++;
  reports.forEach((r, i) => {
    const row = cover.getRow(cr);
    [i + 1, r.title, r.category, r.tableData?.length || 0].forEach((v, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = v;
      cell.font = {
        name: "Calibri",
        size: 10,
        color: { argb: `FF${TEXT_DARK}` },
      };
      cell.alignment = { vertical: "middle" };
      if (i % 2 === 1)
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      cell.border = { bottom: thinBorder() };
    });
    cr++;
  });
  [6, 20, 18, 12].forEach((w, i) => {
    cover.getColumn(i + 1).width = w;
  });
  addFooter(cover, cr, 4);

  // ═══ PER-REPORT SHEETS ═══
  for (const report of reports) {
    const sheetName = report.category
      .substring(0, 31)
      .replace(/[/\\?*[\]]/g, "");
    const rawData = (report.tableData || []) as Record<string, unknown>[];
    const columns = getDisplayColumns(rawData);
    const totalCols = Math.max(columns.length, 4);
    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: false }],
    });
    sheet.properties.tabColor = { argb: `FF${BRAND_BLUE}` };

    let row = addBrandedHeader(
      sheet,
      workbook,
      logoBuffer,
      totalCols,
      report.title,
      restaurantName,
      dateRange,
      report.category
    );

    const summaryEntries = Object.entries(report.summary);
    if (summaryEntries.length > 0) {
      sheet.getCell(`A${row}`).value = "KEY PERFORMANCE INDICATORS";
      sheet.getCell(`A${row}`).font = {
        name: "Calibri",
        size: 12,
        bold: true,
        color: { argb: `FF${BRAND_ORANGE}` },
      };
      row++;
      const kh = sheet.getRow(row);
      kh.height = 26;
      ["Metric", "Value"].forEach((h, i) => {
        const c = kh.getCell(i + 1);
        c.value = h;
        c.font = {
          name: "Calibri",
          size: 10,
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
        c.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${BRAND_BLUE}` },
        };
        c.alignment = {
          vertical: "middle",
          horizontal: i === 0 ? "left" : "center",
        };
        c.border = {
          top: thinBorder(`FF${BRAND_BLUE}`),
          bottom: thinBorder(`FF${BRAND_BLUE}`),
        };
      });
      row++;
      summaryEntries.forEach(([key, value], idx) => {
        const r = sheet.getRow(row);
        r.height = 24;
        r.getCell(1).value = key;
        r.getCell(1).font = {
          name: "Calibri",
          size: 10,
          bold: true,
          color: { argb: `FF${TEXT_DARK}` },
        };
        r.getCell(2).value = formatCellValue(value);
        r.getCell(2).font = {
          name: "Calibri",
          size: 10,
          color: { argb: `FF${TEXT_DARK}` },
        };
        r.getCell(2).alignment = { horizontal: "right", vertical: "middle" };
        if (idx % 2 === 1) {
          [1, 2].forEach(
            (c) =>
              (r.getCell(c).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF8FAFC" },
              })
          );
        }
        [1, 2].forEach((c) => {
          r.getCell(c).border = {
            top: thinBorder(),
            bottom: thinBorder(),
            left: thinBorder(),
            right: thinBorder(),
          };
        });
        row++;
      });
      sheet.getColumn(1).width = 28;
      sheet.getColumn(2).width = 22;
      row += 2;
    }

    if (rawData.length > 0 && columns.length > 0) {
      const endRow = writeBrandedTable(
        sheet,
        row,
        columns,
        rawData,
        "DETAILED DATA",
        true
      );
      addFooter(sheet, endRow, totalCols);
    } else {
      addFooter(sheet, row, totalCols);
    }
  }

  const fileName = `${restaurantName || "Business"}_Report_${format(
    new Date(),
    "yyyy-MM-dd"
  )}.xlsx`;
  await downloadExcelBuffer(workbook, fileName);
  return fileName;
};

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
    const response = await fetch("/swadeshi-logo.png");
    if (response.ok) {
      logoBuffer = await response.arrayBuffer();
    }
  } catch (e) {
    console.error("Error loading logo for excel", e);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Swadeshi Solutions";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(options.sheetName || "Report", {
    views: [{ showGridLines: false }],
  });
  sheet.properties.tabColor = { argb: `FF${BRAND_BLUE}` };

  const totalCols = Math.max(columns.length, 4);
  let row = addBrandedHeader(
    sheet,
    workbook,
    logoBuffer,
    totalCols,
    options.title,
    options.restaurantName || null,
    options.dateRange,
    options.reportType
  );

  const mappedData = data.map((d) => {
    const mapped: Record<string, unknown> = {};
    columns.forEach((c) => {
      mapped[c.header] = d[c.key];
    });
    return mapped;
  });
  const mappedCols = columns.map((c) => c.header);

  const endRow = writeBrandedTable(
    sheet,
    row,
    mappedCols,
    mappedData,
    "DETAILED DATA",
    true
  );
  addFooter(sheet, endRow, totalCols);

  const fileName =
    options.fileName ||
    `${options.title.replace(/\s+/g, "_")}_${format(
      new Date(),
      "yyyy-MM-dd"
    )}.xlsx`;
  await downloadExcelBuffer(workbook, fileName);
  return fileName;
};

export const generateBrandedMultiSheetExcel = async (
  sheets: {
    name: string;
    data: Record<string, unknown>[];
    columns: { key: string; header: string }[];
  }[],
  options: {
    title: string;
    restaurantName?: string | null;
    dateRange?: { from?: Date; to?: Date };
    fileName?: string;
  }
) => {
  let logoBuffer: ArrayBuffer | null = null;
  try {
    const response = await fetch("/swadeshi-logo.png");
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
    const sheet = workbook.addWorksheet(s.name.substring(0, 31), {
      views: [{ showGridLines: false }],
    });
    sheet.properties.tabColor = { argb: `FF${BRAND_BLUE}` };
    const totalCols = Math.max(s.columns.length, 4);
    let row = addBrandedHeader(
      sheet,
      workbook,
      logoBuffer,
      totalCols,
      `${options.title} — ${s.name}`,
      options.restaurantName || null,
      options.dateRange
    );

    const mappedData = s.data.map((d) => {
      const m: Record<string, unknown> = {};
      s.columns.forEach((c) => {
        m[c.header] = d[c.key];
      });
      return m;
    });
    const mappedCols = s.columns.map((c) => c.header);
    const endRow = writeBrandedTable(
      sheet,
      row,
      mappedCols,
      mappedData,
      undefined,
      true
    );
    addFooter(sheet, endRow, totalCols);
  }

  const fileName =
    options.fileName ||
    `${options.title.replace(/\s+/g, "_")}_${format(
      new Date(),
      "yyyy-MM-dd"
    )}.xlsx`;
  await downloadExcelBuffer(workbook, fileName);
  return fileName;
};

export const exportToExcel = (
  data: any[],
  filename: string,
  sheetName: string = "Data"
) => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return false;
  }
  return generateBrandedDataExcel(
    data,
    Object.keys(data[0]).map((k) => ({ key: k, header: formatColumnName(k) })),
    { title: filename, sheetName }
  );
};

// Aliases for legacy report viewers
export const generateRichExcel = generateBrandedExcel;

