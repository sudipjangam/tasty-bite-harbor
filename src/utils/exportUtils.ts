
import * as XLSX from "xlsx";

/**
 * Exports data to an Excel file (.xlsx)
 * @param data Array of objects to export
 * @param filename Name of the file (without extension)
 * @param sheetName Name of the sheet (defaults to "Sheet1")
 * @returns boolean indicating success
 */
export const exportToExcel = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = "Sheet1"
): boolean => {
  try {
    if (!data || data.length === 0) {
      console.warn("No data to export");
      return false;
    }

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    // Append worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Use XLSX.writeFile which handles browser download compatibility better
    XLSX.writeFile(workbook, `${filename}.xlsx`);

    return true;
  } catch (error) {
    console.error("Export to Excel failed:", error);
    return false;
  }
};
