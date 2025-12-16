import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './useAuth';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, format } from 'date-fns';

export type GSTReportPeriod = 
  | 'current_month' 
  | 'last_month' 
  | 'current_quarter' 
  | 'last_quarter' 
  | 'current_year';

export interface GSTSummary {
  gst5: { taxableAmount: number; taxAmount: number; transactions: number };
  gst12: { taxableAmount: number; taxAmount: number; transactions: number };
  gst18: { taxableAmount: number; taxAmount: number; transactions: number };
  gst28: { taxableAmount: number; taxAmount: number; transactions: number };
  exempt: { taxableAmount: number; taxAmount: number; transactions: number };
}

export interface B2BInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerGstin: string;
  placeOfSupply: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  lineItems: Array<{
    description: string;
    hsnCode: string;
    quantity: number;
    unitPrice: number;
    taxableValue: number;
    taxRate: number;
    cgst: number;
    sgst: number;
    igst: number;
  }>;
}

export interface B2CInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  placeOfSupply: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
}

export interface HSNSummaryItem {
  hsnCode: string;
  description: string;
  quantity: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  taxRate: number;
}

export interface GSTData {
  invoices: any[];
  orders: any[];
  summary: GSTSummary;
  b2bInvoices: B2BInvoice[];
  b2cInvoices: B2CInvoice[];
  hsnSummary: HSNSummaryItem[];
  totals: {
    totalTaxable: number;
    totalTax: number;
    totalCGST: number;
    totalSGST: number;
    totalIGST: number;
    effectiveRate: number;
    b2bTaxable: number;
    b2bTax: number;
    b2cTaxable: number;
    b2cTax: number;
  };
  periodLabel: string;
  dateRange: { start: Date; end: Date };
}

// Get date range based on period
export const getDateRange = (period: GSTReportPeriod): { start: Date; end: Date } => {
  const now = new Date();
  
  switch (period) {
    case 'current_month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    case 'current_quarter':
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'last_quarter':
      const lastQuarter = subQuarters(now, 1);
      return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) };
    case 'current_year':
      return { start: startOfYear(now), end: endOfYear(now) };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
};

// Get human-readable period label
export const getPeriodLabel = (period: GSTReportPeriod): string => {
  const { start, end } = getDateRange(period);
  
  switch (period) {
    case 'current_month':
    case 'last_month':
      return format(start, 'MMMM yyyy');
    case 'current_quarter':
    case 'last_quarter':
      const quarter = Math.floor(start.getMonth() / 3) + 1;
      return `Q${quarter} ${format(start, 'yyyy')}`;
    case 'current_year':
      return `FY ${format(start, 'yyyy')}-${format(end, 'yy')}`;
    default:
      return format(start, 'MMMM yyyy');
  }
};

// Calculate GST filing due dates
export const getFilingDueDates = () => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // GSTR-1 is due on 11th of next month
  const gstr1DueDate = new Date(currentYear, currentMonth + 1, 11);
  
  // GSTR-3B is due on 20th of next month
  const gstr3bDueDate = new Date(currentYear, currentMonth + 1, 20);
  
  // GSTR-9 (Annual) is due on 31st December of next year
  const gstr9DueDate = new Date(currentYear + 1, 11, 31);
  
  return {
    gstr1: {
      date: gstr1DueDate,
      period: format(now, 'MMMM yyyy'),
      daysRemaining: Math.ceil((gstr1DueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      isOverdue: gstr1DueDate < now
    },
    gstr3b: {
      date: gstr3bDueDate,
      period: format(now, 'MMMM yyyy'),
      daysRemaining: Math.ceil((gstr3bDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      isOverdue: gstr3bDueDate < now
    },
    gstr9: {
      date: gstr9DueDate,
      period: `FY ${currentYear}-${(currentYear + 1).toString().slice(-2)}`,
      daysRemaining: Math.ceil((gstr9DueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      isOverdue: gstr9DueDate < now
    }
  };
};

// Generate GSTR-1 JSON export format
export const generateGSTR1JSON = (data: GSTData, gstin: string, period: string) => {
  const gstr1 = {
    gstin: gstin,
    fp: period.replace('-', ''), // Format: 122024 for Dec 2024
    version: "GST3.0.4",
    hash: "hash",
    b2b: data.b2bInvoices.map(inv => ({
      ctin: inv.customerGstin,
      inv: [{
        inum: inv.invoiceNumber,
        idt: format(new Date(inv.invoiceDate), 'dd-MM-yyyy'),
        val: inv.totalAmount,
        pos: inv.placeOfSupply.split('-')[0],
        rchrg: "N",
        inv_typ: "R",
        itms: inv.lineItems.map((item, idx) => ({
          num: idx + 1,
          itm_det: {
            txval: item.taxableValue,
            rt: item.taxRate,
            camt: item.cgst,
            samt: item.sgst,
            iamt: item.igst,
            csamt: 0
          }
        }))
      }]
    })),
    b2cs: data.b2cInvoices.reduce((acc: any[], inv) => {
      const pos = inv.placeOfSupply.split('-')[0];
      const existing = acc.find(x => x.pos === pos);
      if (existing) {
        existing.txval += inv.taxableAmount;
        existing.camt += inv.cgstAmount;
        existing.samt += inv.sgstAmount;
      } else {
        acc.push({
          pos: pos,
          typ: "OE",
          txval: inv.taxableAmount,
          rt: inv.taxableAmount > 0 ? (inv.cgstAmount * 2 / inv.taxableAmount * 100) : 0,
          camt: inv.cgstAmount,
          samt: inv.sgstAmount,
          csamt: 0
        });
      }
      return acc;
    }, []),
    hsn: {
      data: data.hsnSummary.map((hsn, idx) => ({
        num: idx + 1,
        hsn_sc: hsn.hsnCode,
        desc: hsn.description,
        uqc: "NOS",
        qty: hsn.quantity,
        val: hsn.taxableValue + hsn.totalTax,
        txval: hsn.taxableValue,
        rt: hsn.taxRate,
        camt: hsn.cgstAmount,
        samt: hsn.sgstAmount,
        iamt: hsn.igstAmount,
        csamt: 0
      }))
    },
    doc_issue: {
      doc_det: [{
        doc_num: 1,
        docs: [{
          num: 1,
          from: data.invoices[0]?.invoice_number || "INV-001",
          to: data.invoices[data.invoices.length - 1]?.invoice_number || "INV-001",
          totnum: data.invoices.length,
          cancel: 0,
          net_issue: data.invoices.length
        }]
      }]
    }
  };
  
  return gstr1;
};

export const useGSTData = (period: GSTReportPeriod = 'current_month') => {
  const { user } = useAuth();
  const dateRange = getDateRange(period);
  const periodLabel = getPeriodLabel(period);
  
  return useQuery({
    queryKey: ['gst-data', user?.restaurant_id, period],
    queryFn: async (): Promise<GSTData> => {
      if (!user?.restaurant_id) {
        throw new Error('No restaurant ID');
      }
      
      // Fetch invoices with line items for the period
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_line_items (*)
        `)
        .eq('restaurant_id', user.restaurant_id)
        .gte('invoice_date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('invoice_date', format(dateRange.end, 'yyyy-MM-dd'))
        .neq('status', 'cancelled');
        
      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
      }
      
      // Fetch orders for the period (B2C transactions)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', user.restaurant_id)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .in('status', ['completed', 'paid']);
        
      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      }
      
      // Calculate GST summary from invoice line items
      const summary: GSTSummary = {
        gst5: { taxableAmount: 0, taxAmount: 0, transactions: 0 },
        gst12: { taxableAmount: 0, taxAmount: 0, transactions: 0 },
        gst18: { taxableAmount: 0, taxAmount: 0, transactions: 0 },
        gst28: { taxableAmount: 0, taxAmount: 0, transactions: 0 },
        exempt: { taxableAmount: 0, taxAmount: 0, transactions: 0 }
      };
      
      // B2B and B2C invoice arrays
      const b2bInvoices: B2BInvoice[] = [];
      const b2cInvoices: B2CInvoice[] = [];
      
      // HSN summary map
      const hsnMap = new Map<string, HSNSummaryItem>();
      
      // Process invoices
      (invoices || []).forEach(invoice => {
        const isB2B = invoice.is_b2b || (invoice.customer_gstin && invoice.customer_gstin.length === 15);
        
        let invoiceTaxable = 0;
        let invoiceCGST = 0;
        let invoiceSGST = 0;
        let invoiceIGST = 0;
        const lineItems: B2BInvoice['lineItems'] = [];
        
        (invoice.invoice_line_items || []).forEach((item: any) => {
          const taxableAmount = item.unit_price * item.quantity;
          const taxRate = item.tax_rate || 0;
          const taxAmount = taxableAmount * (taxRate / 100);
          const cgst = item.cgst_amount || taxAmount / 2;
          const sgst = item.sgst_amount || taxAmount / 2;
          const igst = item.igst_amount || 0;
          
          invoiceTaxable += taxableAmount;
          invoiceCGST += cgst;
          invoiceSGST += sgst;
          invoiceIGST += igst;
          
          // Add to line items for B2B
          lineItems.push({
            description: item.description || '',
            hsnCode: item.hsn_code || '996331',
            quantity: item.quantity,
            unitPrice: item.unit_price,
            taxableValue: taxableAmount,
            taxRate: taxRate,
            cgst: cgst,
            sgst: sgst,
            igst: igst
          });
          
          // Update HSN summary
          const hsnCode = item.hsn_code || '996331';
          const existing = hsnMap.get(hsnCode);
          if (existing) {
            existing.quantity += item.quantity;
            existing.taxableValue += taxableAmount;
            existing.cgstAmount += cgst;
            existing.sgstAmount += sgst;
            existing.igstAmount += igst;
            existing.totalTax += cgst + sgst + igst;
          } else {
            hsnMap.set(hsnCode, {
              hsnCode: hsnCode,
              description: item.description || 'Restaurant Services',
              quantity: item.quantity,
              taxableValue: taxableAmount,
              cgstAmount: cgst,
              sgstAmount: sgst,
              igstAmount: igst,
              totalTax: cgst + sgst + igst,
              taxRate: taxRate
            });
          }
          
          // Update GST summary by rate
          if (taxRate === 0) {
            summary.exempt.taxableAmount += taxableAmount;
            summary.exempt.transactions += 1;
          } else if (taxRate === 5) {
            summary.gst5.taxableAmount += taxableAmount;
            summary.gst5.taxAmount += taxAmount;
            summary.gst5.transactions += 1;
          } else if (taxRate === 12) {
            summary.gst12.taxableAmount += taxableAmount;
            summary.gst12.taxAmount += taxAmount;
            summary.gst12.transactions += 1;
          } else if (taxRate === 18) {
            summary.gst18.taxableAmount += taxableAmount;
            summary.gst18.taxAmount += taxAmount;
            summary.gst18.transactions += 1;
          } else if (taxRate === 28) {
            summary.gst28.taxableAmount += taxableAmount;
            summary.gst28.taxAmount += taxAmount;
            summary.gst28.transactions += 1;
          }
        });
        
        if (isB2B) {
          b2bInvoices.push({
            invoiceNumber: invoice.invoice_number,
            invoiceDate: invoice.invoice_date,
            customerName: invoice.customer_name,
            customerGstin: invoice.customer_gstin || '',
            placeOfSupply: invoice.place_of_supply || '27-Maharashtra',
            taxableAmount: invoiceTaxable,
            cgstAmount: invoiceCGST,
            sgstAmount: invoiceSGST,
            igstAmount: invoiceIGST,
            totalAmount: invoice.total_amount,
            lineItems: lineItems
          });
        } else {
          b2cInvoices.push({
            invoiceNumber: invoice.invoice_number,
            invoiceDate: invoice.invoice_date,
            placeOfSupply: invoice.place_of_supply || '27-Maharashtra',
            taxableAmount: invoiceTaxable,
            cgstAmount: invoiceCGST,
            sgstAmount: invoiceSGST,
            totalAmount: invoice.total_amount
          });
        }
      });
      
      // Convert HSN map to array
      const hsnSummary = Array.from(hsnMap.values()).sort((a, b) => b.taxableValue - a.taxableValue);
      
      // Calculate totals
      const totalTaxable = Object.values(summary).reduce((sum, item) => sum + item.taxableAmount, 0);
      const totalTax = Object.values(summary).reduce((sum, item) => sum + item.taxAmount, 0);
      
      const b2bTaxable = b2bInvoices.reduce((sum, inv) => sum + inv.taxableAmount, 0);
      const b2bTax = b2bInvoices.reduce((sum, inv) => sum + inv.cgstAmount + inv.sgstAmount + inv.igstAmount, 0);
      const b2cTaxable = b2cInvoices.reduce((sum, inv) => sum + inv.taxableAmount, 0);
      const b2cTax = b2cInvoices.reduce((sum, inv) => sum + inv.cgstAmount + inv.sgstAmount, 0);
      
      const totalCGST = b2bInvoices.reduce((sum, inv) => sum + inv.cgstAmount, 0) + 
                        b2cInvoices.reduce((sum, inv) => sum + inv.cgstAmount, 0);
      const totalSGST = b2bInvoices.reduce((sum, inv) => sum + inv.sgstAmount, 0) + 
                        b2cInvoices.reduce((sum, inv) => sum + inv.sgstAmount, 0);
      const totalIGST = b2bInvoices.reduce((sum, inv) => sum + inv.igstAmount, 0);
      
      const effectiveRate = totalTaxable > 0 ? (totalTax / totalTaxable) * 100 : 0;
      
      return {
        invoices: invoices || [],
        orders: orders || [],
        summary,
        b2bInvoices,
        b2cInvoices,
        hsnSummary,
        totals: {
          totalTaxable,
          totalTax,
          totalCGST,
          totalSGST,
          totalIGST,
          effectiveRate,
          b2bTaxable,
          b2bTax,
          b2cTaxable,
          b2cTax
        },
        periodLabel,
        dateRange
      };
    },
    enabled: !!user?.restaurant_id
  });
};
