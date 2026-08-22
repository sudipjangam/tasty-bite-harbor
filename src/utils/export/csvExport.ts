import { getDisplayColumns, formatCellValue } from "./exportConstants";

export const exportToCSV = (data: Record<string, unknown>[], filename: string): boolean => {
  if (!data || data.length === 0) {
    console.warn("No data to export to CSV");
    return false;
  }

  try {
    const columns = getDisplayColumns(data);
    const headers = columns.join(",");
    const rows = data.map((obj) =>
      columns
        .map((col) => {
          const val = formatCellValue(obj[col]);
          const str = String(val);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    );

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename.endsWith(".csv") ? filename : `${filename}.csv`}`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error("Error exporting CSV:", error);
    return false;
  }
};
