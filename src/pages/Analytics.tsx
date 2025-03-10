
import { useState, useRef, useEffect } from "react";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import RevenueHighchart from "@/components/Analytics/RevenueHighchart";
import CustomerInsights from "@/components/Analytics/CustomerInsights";
import TopProducts from "@/components/Analytics/TopProducts";
import SalesPrediction from "@/components/Analytics/SalesPrediction";
import RevenueByCategoryChart from "@/components/Analytics/RevenueByCategoryChart";
import TimeSeriesAnalysis from "@/components/Analytics/TimeSeriesAnalysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, FileText, BarChart3, Users, TrendingUp, Calendar, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, subDays } from "date-fns";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { useToast } from "@/components/ui/use-toast";

const Analytics = () => {
  const { toast } = useToast();
  const { data, isLoading } = useAnalyticsData();
  const [activeTab, setActiveTab] = useState("revenue");

  // Mock data for revenue by category chart
  const categoryData = [
    { name: "Main Course", value: 45000, percentage: 35 },
    { name: "Appetizers", value: 25000, percentage: 19 },
    { name: "Desserts", value: 18000, percentage: 14 },
    { name: "Beverages", value: 22000, percentage: 17 },
    { name: "Specials", value: 20000, percentage: 15 }
  ];

  // Mock data for time series analysis
  const generateTimeSeriesData = (days: number, baseValue: number, volatility: number) => {
    const result = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = subDays(now, i);
      // Generate some random variation
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
  
  // Calculate additional metrics
  const ordersToday = data.revenueStats.filter(stat => {
    return format(new Date(stat.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  }).reduce((sum, stat) => sum + stat.order_count, 0);

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Revenue data
      const revenueData = data.revenueStats.map(item => ({
        Date: format(new Date(item.date), 'MMM dd, yyyy'),
        Revenue: Number(item.total_revenue).toFixed(2),
        Orders: item.order_count,
        "Average Order Value": Number(item.average_order_value).toFixed(2)
      }));
      
      const revenueSheet = XLSX.utils.json_to_sheet(revenueData);
      XLSX.utils.book_append_sheet(wb, revenueSheet, "Revenue");
      
      // Customer data
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
      
      // Top products
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
  
  const exportToPDF = () => {
    try {
      // Create a new PDF document with A4 size
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Set document properties
      doc.setProperties({
        title: 'Business Analytics Report',
        author: 'Restaurant Management System',
        creator: 'Swadeshi Solutions',
        subject: 'Analytics Report',
      });
      
      // Add a custom header with theme color
      doc.setFillColor(0, 179, 167); // Teal color
      doc.rect(0, 0, 210, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("BUSINESS ANALYTICS REPORT", 14, 14);
      
      // Add regular title and date
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.text("Analytics Report", 14, 30);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${format(new Date(), 'MMMM dd, yyyy')}`, 14, 38);
      
      // Add summary section with a background
      doc.setFillColor(240, 240, 240);
      doc.rect(14, 44, 182, 30, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("Performance Summary", 18, 52);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`, 18, 60);
      doc.text(`Total Orders: ${totalOrders}`, 90, 60);
      doc.text(`Average Order Value: ₹${averageOrderValue.toFixed(2)}`, 150, 60);
      doc.text(`Active Customers: ${data.customerInsights.length}`, 18, 68);
      doc.text(`Top Selling Item: ${data.topProducts[0]?.name || 'N/A'}`, 90, 68);
      
      // Revenue data table with title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("Revenue Data (Last 30 days)", 14, 83);
      
      const revenueTableColumn = ["Date", "Revenue", "Orders", "Avg Order Value"];
      const revenueTableRows = data.revenueStats.slice(0, 10).map(item => [
        format(new Date(item.date), 'MMM dd, yyyy'),
        `₹${Number(item.total_revenue).toFixed(2)}`,
        item.order_count.toString(),
        `₹${Number(item.average_order_value).toFixed(2)}`
      ]);
      
      // @ts-ignore - jspdf-autotable types issue
      autoTable(doc, {
        head: [revenueTableColumn],
        body: revenueTableRows,
        startY: 88,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1 },
        headStyles: { fillColor: [0, 179, 167], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });
      
      // Add a new page for customer insights
      doc.addPage();
      
      // Custom header on the new page
      doc.setFillColor(0, 179, 167);
      doc.rect(0, 0, 210, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("BUSINESS ANALYTICS REPORT", 14, 14);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text("Top Customer Insights", 14, 30);
      
      const customerTableColumn = ["Customer", "Visits", "Total Spent", "Avg Order"];
      const customerTableRows = data.customerInsights.slice(0, 15).map(item => [
        item.customer_name,
        item.visit_count.toString(),
        `₹${Number(item.total_spent).toFixed(2)}`,
        `₹${Number(item.average_order_value).toFixed(2)}`
      ]);
      
      // @ts-ignore - jspdf-autotable types issue
      autoTable(doc, {
        head: [customerTableColumn],
        body: customerTableRows,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1 },
        headStyles: { fillColor: [0, 179, 167], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });
      
      // Add another page for top products
      doc.addPage();
      
      // Custom header on the third page
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
      
      // @ts-ignore - jspdf-autotable types issue
      autoTable(doc, {
        head: [productTableColumn],
        body: productTableRows,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1 },
        headStyles: { fillColor: [0, 179, 167], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });
      
      // Add watermark to all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Powered by Swadeshi Solutions", 170, 285, { align: 'right' });
        doc.setFontSize(10);
        doc.text(`Page ${i} of ${pageCount}`, 100, 285, { align: 'center' });
      }
      
      // Save the PDF with a filename based on the current date
      const fileName = `Analytics_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "PDF Export Successful",
        description: `Report saved as ${fileName}`,
        variant: "success",
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

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Analytics & Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Gain insights into your restaurant's performance
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-green-500 text-green-700 hover:bg-green-50"
            onClick={exportToExcel}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Export to Excel</span>
            <span className="inline sm:hidden">Excel</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-red-500 text-red-700 hover:bg-red-50"
            onClick={exportToPDF}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Export to PDF</span>
            <span className="inline sm:hidden">PDF</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-xl border border-border/5 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="p-2 rounded-full bg-purple-100">
                <BarChart3 className="h-4 w-4 text-purple-700" />
              </div>
              Total Revenue (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Based on all sales in the last 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xl border border-border/5 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="p-2 rounded-full bg-blue-100">
                <FileText className="h-4 w-4 text-blue-700" />
              </div>
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">Number of orders placed in the last 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xl border border-border/5 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="p-2 rounded-full bg-green-100">
                <Users className="h-4 w-4 text-green-700" />
              </div>
              Average Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{averageOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Average spend per order</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur-xl border border-border/5 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-100">
                <Calendar className="h-4 w-4 text-orange-700" />
              </div>
              Today's Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ordersToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Orders received today</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TimeSeriesAnalysis 
          data={customerTimeData} 
          title="Customer Growth" 
          description="Daily unique customers over time" 
          valuePrefix="" 
          valueSuffix=" customers"
          color="#6366f1"
        />
        <TimeSeriesAnalysis 
          data={orderTimeData} 
          title="Order Volume" 
          description="Number of orders processed" 
          valuePrefix="" 
          valueSuffix=" orders"
          color="#8b5cf6"
        />
        <TimeSeriesAnalysis 
          data={avgOrderTimeData} 
          title="Average Order Value" 
          description="Average amount spent per order" 
          valuePrefix="₹" 
          color="#22c55e"
        />
      </div>

      <Tabs defaultValue="revenue" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="customers">Customer Insights</TabsTrigger>
          <TabsTrigger value="products">Menu Performance</TabsTrigger>
          <TabsTrigger value="forecast">Sales Forecast</TabsTrigger>
          <TabsTrigger value="categories">Category Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="revenue" className="space-y-4">
          <RevenueHighchart data={data.revenueStats} />
        </TabsContent>
        
        <TabsContent value="customers" className="space-y-4">
          <CustomerInsights data={data.customerInsights} />
        </TabsContent>
        
        <TabsContent value="products" className="space-y-4">
          <TopProducts data={data.topProducts} />
        </TabsContent>
        
        <TabsContent value="forecast" className="space-y-4">
          <SalesPrediction data={data.salesPrediction} />
        </TabsContent>
        
        <TabsContent value="categories" className="space-y-4">
          <RevenueByCategoryChart data={categoryData} />
        </TabsContent>
      </Tabs>
      
      <div className="fixed bottom-2 right-2 text-xs text-muted-foreground/70">
        Powered by Swadeshi Solutions
      </div>
    </div>
  );
};

export default Analytics;
