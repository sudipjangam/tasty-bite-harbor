
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import RevenueHighchart from "@/components/Analytics/RevenueHighchart";
import CustomerInsights from "@/components/Analytics/CustomerInsights";
import TopProducts from "@/components/Analytics/TopProducts";
import SalesPrediction from "@/components/Analytics/SalesPrediction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, FileText, BarChart3, Users, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';

const Analytics = () => {
  const { data, isLoading } = useAnalyticsData();

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
  };
  
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Analytics Report", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 14, 30);
    
    doc.setFontSize(14);
    doc.text("Summary", 14, 40);
    
    doc.setFontSize(10);
    doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`, 14, 50);
    doc.text(`Total Orders: ${totalOrders}`, 14, 56);
    doc.text(`Average Order Value: ₹${averageOrderValue.toFixed(2)}`, 14, 62);
    
    doc.setFontSize(14);
    doc.text("Revenue Data (Last 30 days)", 14, 75);
    
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
      startY: 80,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1 },
      headStyles: { fillColor: [128, 0, 128], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    
    doc.addPage();
    
    doc.setFontSize(14);
    doc.text("Top Customer Insights", 14, 20);
    
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
      startY: 25,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1 },
      headStyles: { fillColor: [128, 0, 128], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    
    doc.addPage();
    
    doc.setFontSize(14);
    doc.text("Top Selling Products", 14, 20);
    
    const productTableColumn = ["Product", "Orders", "Revenue", "Profit Margin"];
    const productTableRows = data.topProducts.slice(0, 10).map(item => [
      item.name,
      item.orders.toString(),
      `₹${item.revenue.toFixed(2)}`,
      `${item.profit_margin}%`
    ]);
    
    autoTable(doc, {
      head: [productTableColumn],
      body: productTableRows,
      startY: 25,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1 },
      headStyles: { fillColor: [128, 0, 128], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    
    const fileName = `Analytics_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    
    doc.save(fileName);
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

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="customers">Customer Insights</TabsTrigger>
          <TabsTrigger value="products">Menu Performance</TabsTrigger>
          <TabsTrigger value="forecast">Sales Forecast</TabsTrigger>
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
      </Tabs>
    </div>
  );
};

export default Analytics;
