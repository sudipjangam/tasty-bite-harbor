/**
 * Safe, resilient lazy-loaders for heavy PDF, Excel, and Canvas export engines.
 * Dual-interop (handles both ESM named and CJS default exports) to ensure
 * PDF, Excel, and PPT generation never throws "is not a constructor" in production.
 */

export async function loadPDFEngine() {
  const [jspdfModule, h2cModule] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const jsPDF = (jspdfModule as any).jsPDF || (jspdfModule as any).default || jspdfModule;
  const html2canvas = (h2cModule as any).default || h2cModule;

  return { jsPDF, html2canvas };
}

export async function loadPDFTableEngine() {
  const [jspdfModule, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const jsPDF = (jspdfModule as any).jsPDF || (jspdfModule as any).default || jspdfModule;
  const autoTable = (autoTableModule as any).default || autoTableModule;

  return { jsPDF, autoTable };
}

export async function loadXLSXEngine() {
  const xlsxModule = await import("xlsx");
  return (xlsxModule as any).default || xlsxModule;
}
