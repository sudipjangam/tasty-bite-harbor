import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Download, DollarSign, ShoppingCart, Users, Loader2, RefreshCw } from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AdvancedAnalytics = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfWeek(new Date()),
    to: endOfWeek(new Date()),
  });
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();

  const { data: analyticsData, isLoading, error, refetch } = useQuery({
    queryKey: ["analytics-data", restaurantId, dateRange],
    queryFn: async () => {
      if (!restaurantId || !dateRange?.from || !dateRange?.to) return null;

      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");

      try {
        // Try RPC first
        const { data, error } = await supabase.rpc("get_analytics_data", {
          p_restaurant_id: restaurantId,
          p_start_date: startDate,
          p_end_date: endDate,
        });

        if (!error && data) {
          return data;
        }
      } catch (rpcError) {
        console.log("RPC failed, using fallback", rpcError);
      }

      // Fallback: Fetch directly from tables
      const [ordersResult, customersResult] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', `${startDate}T00:00:00`)
          .lte('created_at', `${endDate}T23:59:59`),
        supabase
          .from('customers')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', `${startDate}T00:00:00`)
          .lte('created_at', `${endDate}T23:59:59`)
      ]);

      const orders = ordersResult.data || [];
      const customers = customersResult.data || [];

      // Calculate KPIs
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const newCustomers = customers.length;

      // Group orders by date for daily revenue chart
      const dailyRevenueMap: Record<string, number> = {};
      orders.forEach(order => {
        const date = order.created_at.split('T')[0];
        dailyRevenueMap[date] = (dailyRevenueMap[date] || 0) + (order.total || 0);
      });
      const dailyRevenue = Object.entries(dailyRevenueMap)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Group orders by category (parse items)
      const categoryMap: Record<string, number> = {};
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: string) => {
            try {
              const parsed = typeof item === 'string' ? JSON.parse(item) : item;
              const category = parsed.category || 'Other';
              categoryMap[category] = (categoryMap[category] || 0) + (parsed.price || 0) * (parsed.quantity || 1);
            } catch {
              categoryMap['Other'] = (categoryMap['Other'] || 0) + 0;
            }
          });
        }
      });
      const salesByCategory = Object.entries(categoryMap)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

      // Top products
      const productMap: Record<string, { count: number; revenue: number }> = {};
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: string) => {
            try {
              const parsed = typeof item === 'string' ? JSON.parse(item) : item;
              const name = parsed.name || 'Unknown';
              if (!productMap[name]) {
                productMap[name] = { count: 0, revenue: 0 };
              }
              productMap[name].count += parsed.quantity || 1;
              productMap[name].revenue += (parsed.price || 0) * (parsed.quantity || 1);
            } catch {
              // Skip invalid items
            }
          });
        }
      });
      const topProducts = Object.entries(productMap)
        .map(([name, data]) => ({ name, quantity: data.count, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      return {
        kpis: {
          totalRevenue,
          totalOrders,
          avgOrderValue,
          newCustomers,
        },
        charts: {
          dailyRevenue,
          salesByCategory,
          topProducts,
        }
      };
    },
    enabled: !!restaurantId && !!dateRange?.from && !!dateRange?.to,
    staleTime: 30000, // Cache for 30 seconds
  });

  const { restaurantName } = useRestaurantId();

  const handleExportPDF = async () => {
    if (!analyticsData) return;

    setIsExporting(true);
    toast({ title: "Generating PDF...", description: "Please wait" });

    try {
      const kpis = analyticsData?.kpis || {
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        newCustomers: 0,
      };
      const charts = analyticsData?.charts || {
        dailyRevenue: [],
        salesByCategory: [],
        topProducts: [],
      };

      const doc = new jsPDF();
      
      // Set up document properties
      doc.setProperties({
        title: 'Business Analytics Report',
        author: restaurantName || 'Restaurant Management System',
        creator: 'Swadeshi Solutions',
        subject: 'Analytics Report',
      });
      
      // Add header with teal background
      doc.setFillColor(0, 179, 167);
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text("BUSINESS ANALYTICS REPORT", 105, 16, { align: 'center' });
      
      // Add restaurant name
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(restaurantName || 'Restaurant Management System', 14, 38);
      
      // Add date range
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const dateRangeText = dateRange?.from && dateRange?.to 
        ? `Report Period: ${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
        : 'Report Period: All Time';
      doc.text(dateRangeText, 14, 48);
      doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 14, 56);
      
      // Add Performance Summary section
      doc.setFillColor(240, 240, 240);
      doc.rect(14, 64, 182, 35, 'F');
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text("Performance Summary", 18, 74);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Total Revenue: ₹${Number(kpis.totalRevenue || 0).toFixed(2)}`, 18, 84);
      doc.text(`Total Orders: ${kpis.totalOrders || 0}`, 110, 84);
      doc.text(`Average Order Value: ₹${Number(kpis.avgOrderValue || 0).toFixed(2)}`, 18, 92);
      doc.text(`Active Customers: ${kpis.newCustomers || 0}`, 110, 92);
      
      // Add Revenue Data table
      let startY = 108;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("Revenue Data (Last 30 days)", 14, startY);
      
      const revenueTableData = (charts.dailyRevenue || []).map((day: any) => [
        format(new Date(day.date), 'MMM dd, yyyy'),
        `₹${Number(day.revenue || 0).toFixed(2)}`,
        day.orders || 0,
        `₹${(day.revenue / (day.orders || 1)).toFixed(2)}`
      ]);
      
      autoTable(doc, {
        head: [['Date', 'Revenue', 'Orders', 'Avg Order Value']],
        body: revenueTableData,
        startY: startY + 6,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [0, 179, 167], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });
      
      // Add Sales by Category table on new page if needed
      const finalY = (doc as any).lastAutoTable.finalY || startY + 60;
      
      if (finalY > 240) {
        doc.addPage();
        startY = 20;
      } else {
        startY = finalY + 15;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("Sales by Category", 14, startY);
      
      const categoryTableData = (charts.salesByCategory || []).map((cat: any) => [
        cat.name,
        `₹${Number(cat.value || 0).toFixed(2)}`,
        `${((cat.value / kpis.totalRevenue) * 100).toFixed(1)}%`
      ]);
      
      autoTable(doc, {
        head: [['Category', 'Revenue', 'Percentage']],
        body: categoryTableData,
        startY: startY + 6,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [0, 179, 167], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });
      
      // Add Top Products table
      const finalY2 = (doc as any).lastAutoTable.finalY || startY + 40;
      
      if (finalY2 > 240) {
        doc.addPage();
        startY = 20;
      } else {
        startY = finalY2 + 15;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("Top Performing Products", 14, startY);
      
      const productsTableData = (charts.topProducts || []).map((prod: any) => [
        prod.name,
        `₹${Number(prod.revenue || 0).toFixed(2)}`,
        prod.quantity || 0
      ]);
      
      autoTable(doc, {
        head: [['Product Name', 'Revenue', 'Quantity Sold']],
        body: productsTableData,
        startY: startY + 6,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [0, 179, 167], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });
      
      // Add watermark to all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Powered by Swadeshi Solutions", 160, 285, { align: 'right' });
        doc.setFontSize(10);
        doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
      }
      
      const fileName = `Analytics_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      toast({ 
        title: "PDF Export Successful",
        description: `Report saved as ${fileName}` 
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({ 
        title: "Export Failed", 
        description: "Could not export to PDF. Please try again.",
        variant: "destructive" 
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <StandardizedCard key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </StandardizedCard>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => (
            <StandardizedCard key={i} className="p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-[300px] w-full" />
            </StandardizedCard>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <StandardizedCard className="p-8 text-center">
        <div className="space-y-4">
          <p className="text-destructive text-lg font-semibold">Failed to load analytics data</p>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "An unknown error occurred"}
          </p>
          <StandardizedButton 
            onClick={() => refetch()} 
            variant="secondary"
            className="mx-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </StandardizedButton>
        </div>
      </StandardizedCard>
    );
  }

  const kpis = analyticsData?.kpis || {
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    newCustomers: 0,
  };
  const charts = analyticsData?.charts || {
    dailyRevenue: [],
    salesByCategory: [],
    topProducts: [],
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Advanced Analytics & Reporting</h2>
        <div className="flex gap-2">
          <StandardizedButton 
            variant="secondary" 
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export PDF
          </StandardizedButton>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DatePickerWithRange 
          initialDateRange={dateRange}
          onDateRangeChange={setDateRange} 
        />
      </div>

      <div id="report-content-area" className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StandardizedCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">₹{Number(kpis.totalRevenue || 0).toFixed(2)}</p>
              </div>
            </div>
          </StandardizedCard>

          <StandardizedCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{kpis.totalOrders || 0}</p>
              </div>
            </div>
          </StandardizedCard>

          <StandardizedCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">₹{Number(kpis.avgOrderValue || 0).toFixed(2)}</p>
              </div>
            </div>
          </StandardizedCard>

          <StandardizedCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New Customers</p>
                <p className="text-2xl font-bold">{kpis.newCustomers || 0}</p>
              </div>
            </div>
          </StandardizedCard>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Revenue Chart */}
          <StandardizedCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Daily Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts.dailyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </StandardizedCard>

          {/* Sales by Category */}
          <StandardizedCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Sales by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={charts.salesByCategory || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ₹${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(charts.salesByCategory || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </StandardizedCard>
        </div>

        {/* Top Products */}
        <StandardizedCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Performing Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={charts.topProducts || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </StandardizedCard>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
