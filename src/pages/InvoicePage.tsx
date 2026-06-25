import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileX } from 'lucide-react';
import DOMPurify from 'dompurify';

const InvoicePage = () => {
  const { '*': invoicePath } = useParams();
  const [invoiceHTML, setInvoiceHTML] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoicePath) {
        setError('No invoice path provided');
        setLoading(false);
        return;
      }

      try {
        // Get the public URL from Supabase storage
        const { data } = supabase.storage
          .from('subscription-invoices')
          .getPublicUrl(decodeURIComponent(invoicePath));

        if (!data?.publicUrl) {
          setError('Invoice not found');
          setLoading(false);
          return;
        }

        // Fetch the HTML content
        const response = await fetch(data.publicUrl);
        if (!response.ok) {
          setError('Invoice not found or has been removed');
          setLoading(false);
          return;
        }

        const html = await response.text();
        setInvoiceHTML(html);
      } catch (err) {
        console.error('Error fetching invoice:', err);
        setError('Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoicePath]);

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setDownloading(true);

    try {
      // Dynamic import to avoid SSR issues
      const html2pdf = (await import('html2pdf.js')).default;

      const invoiceNumber = invoicePath?.split('/').pop()?.replace('.html', '') || 'invoice';

      await html2pdf()
        .set({
          margin: [0, 0, 0, 0],
          filename: `${invoiceNumber}.pdf`,
          image: { type: 'jpeg', quality: 1 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
          },
        })
        .from(invoiceRef.current)
        .save();
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-gray-500 text-sm">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoiceHTML) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md">
          <FileX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Invoice Not Found</h2>
          <p className="text-gray-500 text-sm">
            {error || 'The invoice you are looking for does not exist or has been removed.'}
          </p>
        </div>
      </div>
    );
  }

  // Extract just the body content from the stored HTML for embedding
  // We render it inside our own page with a download button
  const bodyMatch = invoiceHTML.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const rawBodyContent = bodyMatch ? bodyMatch[1] : invoiceHTML;

  // Extract styles from the stored HTML
  const styleMatch = invoiceHTML.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const rawStyles = styleMatch ? styleMatch[1] : '';

  // Sanitize HTML to prevent XSS from malicious invoice content
  const bodyContent = DOMPurify.sanitize(rawBodyContent, {
    ALLOWED_TAGS: ['div', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
                   'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i',
                   'br', 'hr', 'ul', 'ol', 'li', 'img', 'section', 'article', 'header',
                   'footer', 'main', 'address'],
    ALLOWED_ATTR: ['class', 'style', 'src', 'alt', 'width', 'height', 'colspan',
                   'rowspan', 'cellpadding', 'cellspacing', 'border', 'align', 'valign'],
    FORBID_TAGS: ['script', 'iframe', 'form', 'input', 'button', 'link', 'meta', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'href'],
  });
  // Strip everything from styles — only allow plain CSS text, no expressions
  const styles = rawStyles
    .replace(/<[^>]*>/g, '')           // remove any tags injected into style block
    .replace(/expression\s*\(/gi, '')  // block CSS expression() (IE attack)
    .replace(/javascript:/gi, '')      // block javascript: URIs in CSS
    .replace(/url\s*\([^)]*\)/gi, (m) =>
      m.replace(/javascript:/gi, '').replace(/data:text\/html/gi, ''));
    // Note: styles are rendered inside a <style> tag. CSS itself can't execute JS
    // in modern browsers, but we sanitize above to remove legacy attack vectors.

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      {/* Download toolbar */}
      <div className="max-w-[700px] mx-auto mb-4 flex justify-between items-center">
        <h1 className="text-lg font-bold text-gray-700">Subscription Invoice</h1>
        <Button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="bg-blue-700 hover:bg-blue-800 text-white gap-2 px-6 rounded-xl shadow-lg"
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download PDF
            </>
          )}
        </Button>
      </div>

      {/* Invoice content */}
      <div ref={invoiceRef}>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div dangerouslySetInnerHTML={{ __html: bodyContent }} />
      </div>
    </div>
  );
};

export default InvoicePage;
