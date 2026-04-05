declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type: string; quality: number };
    html2canvas?: Record<string, any>;
    jsPDF?: { unit: string; format: string; orientation: string };
    pagebreak?: Record<string, any>;
  }

  interface Html2PdfInstance {
    set(options: Html2PdfOptions): Html2PdfInstance;
    from(element: HTMLElement | string): Html2PdfInstance;
    save(): Promise<void>;
    toPdf(): Html2PdfInstance;
    output(type: string): Promise<any>;
  }

  export default function html2pdf(): Html2PdfInstance;
}
