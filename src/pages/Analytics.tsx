
import { useState, useEffect } from "react";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import AnalyticsHeader from "@/components/Analytics/AnalyticsHeader";
import StatCards from "@/components/Analytics/StatCards";
import TimeRangeSelector from "@/components/Analytics/TimeRangeSelector";
import ChartCards from "@/components/Analytics/ChartCards";
import ExpandedChartDialog from "@/components/Analytics/ExpandedChartDialog";
import BusinessDashboard from "@/components/Analytics/BusinessDashboard";
import { format, subDays, subMonths, subYears, startOfDay } from "date-fns";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { useToast } from "@/components/ui/use-toast";
import Watermark from "@/components/Layout/Watermark";
import { fetchAllowedComponents } from "@/utils/subscriptionUtils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Analytics = () => {
  const { toast } = useToast();
  const { data, isLoading } = useAnalyticsData();
  const [timeRange, setTimeRange] = useState("30");
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [showDataTable, setShowDataTable] = useState(false);
  const [analyticsView, setAnalyticsView] = useState<"charts" | "business">("charts");
  
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  
  const { data: allowedComponents = [] } = useQuery({
    queryKey: ["allowedComponents", restaurantId],
    queryFn: () => restaurantId ? fetchAllowedComponents(restaurantId) : Promise.resolve([]),
    enabled: !!restaurantId,
  });
  
  const hasBusinessDashboardAccess = allowedComponents.includes("business_dashboard");

  useEffect(() => {
    getRestaurantId();
  }, []);

  const getRestaurantId = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("restaurant_id")
          .eq("id", session.user.id)
          .single();
          
        if (profile?.restaurant_id) {
          setRestaurantId(profile.restaurant_id);
        }
      }
    } catch (error) {
      console.error("Error fetching restaurant ID:", error);
    }
  };

  const categoryData = [
    { name: "Main Course", value: 45000, percentage: 35 },
    { name: "Appetizers", value: 25000, percentage: 19 },
    { name: "Desserts", value: 18000, percentage: 14 },
    { name: "Beverages", value: 22000, percentage: 17 },
    { name: "Specials", value: 20000, percentage: 15 }
  ];

  const generateTimeSeriesData = (days: number, baseValue: number, volatility: number) => {
    const result = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = subDays(now, i);
      const randomFactor = 1 + ((Math.random() - 0.5) * volatility);
      const value = Math.round(baseValue * randomFactor);
      
      result.push({
        date: format(date, 'yyyy-MM-dd'),
        value: value
      });
    }
    
    return result;
  };

  const customerTimeData = generateTimeSeriesData(365, 50, 0.4);
  const orderTimeData = generateTimeSeriesData(365, 120, 0.3);
  const avgOrderTimeData = generateTimeSeriesData(365, 850, 0.2);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Analytics & Reports
        </h1>
        <p className="text-muted-foreground">No data available.</p>
      </div>
    );
  }

  const totalRevenue = data.revenueStats.reduce((sum, stat) => sum + Number(stat.total_revenue), 0);
  const totalOrders = data.revenueStats.reduce((sum, stat) => sum + stat.order_count, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Calculate orders today
  const today = format(new Date(), 'yyyy-MM-dd');
  const ordersToday = data.revenueStats.find(stat => format(new Date(stat.date), 'yyyy-MM-dd') === today)?.order_count || 0;
  
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      const revenueData = data.revenueStats.map(item => ({
        Date: format(new Date(item.date), 'MMM dd, yyyy'),
        Revenue: Number(item.total_revenue).toFixed(2),
        Orders: item.order_count,
        "Average Order Value": Number(item.average_order_value).toFixed(2)
      }));
      
      const revenueSheet = XLSX.utils.json_to_sheet(revenueData);
      XLSX.utils.book_append_sheet(wb, revenueSheet, "Revenue");
      
      const customerData = data.customerInsights.map(customer => ({
        Name: customer.customer_name,
        Visits: customer.visit_count,
        "Total Spent": Number(customer.total_spent).toFixed(2),
        "Average Order": Number(customer.average_order_value).toFixed(2),
        "First Visit": format(new Date(customer.first_visit), 'MMM dd, yyyy'),
        "Last Visit": format(new Date(customer.last_visit), 'MMM dd, yyyy')
      }));
      
      const customerSheet = XLSX.utils.json_to_sheet(customerData);
      XLSX.utils.book_append_sheet(wb, customerSheet, "Customer Insights");
      
      const productData = data.topProducts.map(product => ({
        Name: product.name,
        Orders: product.orders,
        Revenue: product.revenue.toFixed(2),
        "Profit Margin": `${product.profit_margin}%`,
        "In Stock": product.in_stock ? "Yes" : "No",
        Trend: product.trend
      }));
      
      const productSheet = XLSX.utils.json_to_sheet(productData);
      XLSX.utils.book_append_sheet(wb, productSheet, "Top Products");
      
      const fileName = `Analytics_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      
      XLSX.writeFile(wb, fileName);
      
      toast({
        title: "Excel Export Successful",
        description: `Report saved as ${fileName}`,
      });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({
        title: "Export Failed",
        description: "Could not export to Excel. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const exportToPDF = async () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      doc.setProperties({
        title: 'Business Analytics Report',
        author: 'Restaurant Management System',
        creator: 'Swadeshi Solutions',
        subject: 'Analytics Report',
      });
      
      doc.setFillColor(0, 179, 167);
      doc.rect(0, 0, 210, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("BUSINESS ANALYTICS REPORT", 14, 14);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.text("Analytics Report", 14, 30);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${format(new Date(), 'MMMM dd, yyyy')}`, 14, 38);
      
      doc.setFillColor(240, 240, 240);
      doc.rect(14, 44, 182, 30, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("Performance Summary", 18, 52);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`, 18, 60);
      doc.text(`Total Orders: ${totalOrders}`, 90, 60);
      doc.text(`Average Order Value: ₹${averageOrderValue.toFixed(2)}`, 18, 68);
      doc.text(`Active Customers: ${data.customerInsights.length}`, 90, 68);
      
      try {
        const revenueChartElement = document.getElementById('revenue-chart');
        if (revenueChartElement) {
          const canvas = await html2canvas(revenueChartElement);
          const imgData = canvas.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 14, 80, 180, 90);
          doc.text("Revenue Trend", 14, 78);
        }
      } catch (chartError) {
        console.warn("Could not add chart to PDF:", chartError);
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("Revenue Data (Last 30 days)", 14, 180);
      
      const revenueTableColumn = ["Date", "Revenue", "Orders", "Avg Order Value"];
      const revenueTableRows = data.revenueStats.slice(0, 10).map(item => [
        format(new Date(item.date), 'MMM dd, yyyy'),
        `₹${Number(item.total_revenue).toFixed(2)}`,
        item.order_count.toString(),
        `₹${Number(item.average_order_value).toFixed(2)}`
      ]);
      
      autoTable(doc, {
        head: [revenueTableColumn],
        body: revenueTableRows,
        startY: 185,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1 },
        headStyles: { fillColor: [0, 179, 167], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });
      
      doc.addPage();
      
      doc.setFillColor(0, 179, 167);
      doc.rect(0, 0, 210, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("BUSINESS ANALYTICS REPORT", 14, 14);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text("Top Customer Insights", 14, 30);
      
      try {
        const categoryChartElement = document.getElementById('category-chart');
        if (categoryChartElement) {
          const canvas = await html2canvas(categoryChartElement);
          const imgData = canvas.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 14, 35, 180, 90);
        }
      } catch (chartError) {
        console.warn("Could not add category chart to PDF:", chartError);
      }
      
      const customerTableColumn = ["Customer", "Visits", "Total Spent", "Avg Order"];
      const customerTableRows = data.customerInsights.slice(0, 15).map(item => [
        item.customer_name,
        item.visit_count.toString(),
        `₹${Number(item.total_spent).toFixed(2)}`,
        `₹${Number(item.average_order_value).toFixed(2)}`
      ]);
      
      autoTable(doc, {
        head: [customerTableColumn],
        body: customerTableRows,
        startY: 130,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1 },
        headStyles: { fillColor: [0, 179, 167], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });
      
      doc.addPage();
      
      doc.setFillColor(0, 179, 167);
      doc.rect(0, 0, 210, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("BUSINESS ANALYTICS REPORT", 14, 14);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text("Top Selling Products", 14, 30);
      
      const productTableColumn = ["Product", "Orders", "Revenue", "Profit Margin", "In Stock"];
      const productTableRows = data.topProducts.slice(0, 10).map(item => [
        item.name,
        item.orders.toString(),
        `₹${item.revenue.toFixed(2)}`,
        `${item.profit_margin}%`,
        item.in_stock ? "Yes" : "No"
      ]);
      
      autoTable(doc, {
        head: [productTableColumn],
        body: productTableRows,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1 },
        headStyles: { fillColor: [0, 179, 167], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });
      
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Powered by Swadeshi Solutions", 170, 285, { align: 'right' });
        doc.setFontSize(10);
        doc.text(`Page ${i} of ${pageCount}`, 100, 285, { align: 'center' });
      }
      
      const fileName = `Analytics_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "PDF Export Successful",
        description: `Report saved as ${fileName}`,
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Export Failed",
        description: "Could not export to PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getFilteredData = (days: number) => {
    if (days === 365) return data.revenueStats;
    const date = subDays(new Date(), days);
    return data.revenueStats.filter(stat => new Date(stat.date) >= date);
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 animate-fade-in">
      <AnalyticsHeader 
        analyticsView={analyticsView}
        setAnalyticsView={setAnalyticsView}
        hasBusinessDashboardAccess={hasBusinessDashboardAccess}
        exportToExcel={exportToExcel}
        exportToPDF={exportToPDF}
      />

      {analyticsView === "charts" ? (
        <>
          <StatCards 
            totalRevenue={totalRevenue}
            totalOrders={totalOrders}
            averageOrderValue={averageOrderValue}
            ordersToday={ordersToday}
          />

          <TimeRangeSelector 
            timeRange={timeRange}
            setTimeRange={setTimeRange}
          />

          <ChartCards 
            filteredData={getFilteredData(parseInt(timeRange))}
            categoryData={categoryData}
            customerTimeData={customerTimeData}
            timeRange={timeRange}
            topProducts={data.topProducts}
            salesPrediction={data.salesPrediction}
            setExpandedChart={setExpandedChart}
          />
          
          <ExpandedChartDialog 
            expandedChart={expandedChart}
            setExpandedChart={setExpandedChart}
            showDataTable={showDataTable}
            setShowDataTable={setShowDataTable}
            filteredData={getFilteredData(parseInt(timeRange))}
            categoryData={categoryData}
            customerTimeData={customerTimeData}
            timeRange={timeRange}
            topProducts={data.topProducts}
            salesPrediction={data.salesPrediction}
          />
        </>
      ) : (
        <BusinessDashboard />
      )}
    </div>
  );
};

export default Analytics;
