
import { useState, useEffect } from "react";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import RevenueHighchart from "@/components/Analytics/RevenueHighchart";
import CustomerInsights from "@/components/Analytics/CustomerInsights";
import TopProducts from "@/components/Analytics/TopProducts";
import SalesPrediction from "@/components/Analytics/SalesPrediction";
import RevenueByCategoryChart from "@/components/Analytics/RevenueByCategoryChart";
import TimeSeriesAnalysis from "@/components/Analytics/TimeSeriesAnalysis";
import BusinessDashboard from "@/components/Analytics/BusinessDashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  FileSpreadsheet, 
  FileText, 
  BarChart3, 
  Users, 
  TrendingUp, 
  Calendar, 
  PieChart,
  Maximize,
  Minimize,
  LineChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogClose } from "@/components/ui/dialog";
import { format, subDays } from "date-fns";
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
  const [activeTab, setActiveTab] = useState("revenue");
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

  const filterTimeSeriesData = (data: any[], days: number) => {
    if (days === 365) return data;
    return data.slice(-days);
  };

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
          {hasBusinessDashboardAccess && (
            <div className="flex border rounded-md overflow-hidden mr-2">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-none ${analyticsView === "charts" ? "bg-muted" : ""}`}
                onClick={() => setAnalyticsView("charts")}
              >
                <LineChart className="h-4 w-4 mr-2" />
                Charts
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-none ${analyticsView === "business" ? "bg-muted" : ""}`}
                onClick={() => setAnalyticsView("business")}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Business
              </Button>
            </div>
          )}
          
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

      {analyticsView === "charts" ? (
        <>
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

          <div className="flex flex-col space-y-2">
            <h3 className="text-sm font-medium">Time Range</h3>
            <RadioGroup 
              value={timeRange} 
              onValueChange={setTimeRange}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="7" id="r1" />
                <Label htmlFor="r1">7 Days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="30" id="r2" />
                <Label htmlFor="r2">30 Days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="90" id="r3" />
                <Label htmlFor="r3">90 Days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="365" id="r4" />
                <Label htmlFor="r4">1 Year</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Revenue Analysis</CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setExpandedChart('revenue')}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent id="revenue-chart">
                <RevenueHighchart data={getFilteredData(parseInt(timeRange))} />
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Category Revenue</CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setExpandedChart('category')}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent id="category-chart">
                <RevenueByCategoryChart data={categoryData} />
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Customer Growth</CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setExpandedChart('customer')}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <TimeSeriesAnalysis 
                  data={filterTimeSeriesData(customerTimeData, parseInt(timeRange))} 
                  title="Customer Growth" 
                  description="Daily unique customers over time" 
                  valuePrefix="" 
                  valueSuffix=" customers"
                  color="#6366f1"
                />
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Top Selling Products</CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setExpandedChart('products')}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <TopProducts data={data.topProducts} />
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Sales Forecast</CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setExpandedChart('forecast')}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <SalesPrediction data={data.salesPrediction} />
              </CardContent>
            </Card>
          </div>
          
          <Dialog open={!!expandedChart} onOpenChange={(open) => !open && setExpandedChart(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle className="flex justify-between items-center">
                  <span>
                    {expandedChart === 'revenue' && 'Revenue Analysis'}
                    {expandedChart === 'category' && 'Category Revenue'}
                    {expandedChart === 'customer' && 'Customer Growth'}
                    {expandedChart === 'products' && 'Top Selling Products'}
                    {expandedChart === 'forecast' && 'Sales Forecast'}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDataTable(!showDataTable)}
                    >
                      {showDataTable ? 'Show Chart' : 'Show Data Table'}
                    </Button>
                    <DialogClose asChild>
                      <Button variant="ghost" size="icon">
                        <Minimize className="h-4 w-4" />
                      </Button>
                    </DialogClose>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="py-4">
                {!showDataTable ? (
                  <>
                    {expandedChart === 'revenue' && <RevenueHighchart data={getFilteredData(parseInt(timeRange))} />}
                    {expandedChart === 'category' && <RevenueByCategoryChart data={categoryData} />}
                    {expandedChart === 'customer' && (
                      <TimeSeriesAnalysis 
                        data={filterTimeSeriesData(customerTimeData, parseInt(timeRange))} 
                        title="Customer Growth" 
                        description="Daily unique customers over time" 
                        valuePrefix="" 
                        valueSuffix=" customers"
                        color="#6366f1"
                        height={400}
                      />
                    )}
                    {expandedChart === 'products' && <TopProducts data={data.topProducts} />}
                    {expandedChart === 'forecast' && <SalesPrediction data={data.salesPrediction} />}
                  </>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          {expandedChart === 'revenue' && (
                            <>
                              <th className="p-2 text-left">Date</th>
                              <th className="p-2 text-left">Revenue</th>
                              <th className="p-2 text-left">Orders</th>
                              <th className="p-2 text-left">Avg Order Value</th>
                            </>
                          )}
                          {expandedChart === 'category' && (
                            <>
                              <th className="p-2 text-left">Category</th>
                              <th className="p-2 text-left">Revenue</th>
                              <th className="p-2 text-left">Percentage</th>
                            </>
                          )}
                          {expandedChart === 'customer' && (
                            <>
                              <th className="p-2 text-left">Date</th>
                              <th className="p-2 text-left">Customers</th>
                            </>
                          )}
                          {expandedChart === 'products' && (
                            <>
                              <th className="p-2 text-left">Product</th>
                              <th className="p-2 text-left">Orders</th>
                              <th className="p-2 text-left">Revenue</th>
                              <th className="p-2 text-left">Profit Margin</th>
                              <th className="p-2 text-left">In Stock</th>
                              <th className="p-2 text-left">Trend</th>
                            </>
                          )}
                          {expandedChart === 'forecast' && (
                            <>
                              <th className="p-2 text-left">Date</th>
                              <th className="p-2 text-left">Actual</th>
                              <th className="p-2 text-left">Predicted</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {expandedChart === 'revenue' && getFilteredData(parseInt(timeRange)).map((item, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                            <td className="p-2">{format(new Date(item.date), 'MMM dd, yyyy')}</td>
                            <td className="p-2">₹{Number(item.total_revenue).toFixed(2)}</td>
                            <td className="p-2">{item.order_count}</td>
                            <td className="p-2">₹{Number(item.average_order_value).toFixed(2)}</td>
                          </tr>
                        ))}
                        {expandedChart === 'category' && categoryData.map((item, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                            <td className="p-2">{item.name}</td>
                            <td className="p-2">₹{item.value.toFixed(2)}</td>
                            <td className="p-2">{item.percentage}%</td>
                          </tr>
                        ))}
                        {expandedChart === 'customer' && filterTimeSeriesData(customerTimeData, parseInt(timeRange)).map((item, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                            <td className="p-2">{item.date}</td>
                            <td className="p-2">{item.value}</td>
                          </tr>
                        ))}
                        {expandedChart === 'products' && data.topProducts.map((item, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                            <td className="p-2">{item.name}</td>
                            <td className="p-2">{item.orders}</td>
                            <td className="p-2">₹{item.revenue.toFixed(2)}</td>
                            <td className="p-2">{item.profit_margin}%</td>
                            <td className="p-2">{item.in_stock ? 'Yes' : 'No'}</td>
                            <td className="p-2">{item.trend}</td>
                          </tr>
                        ))}
                        {expandedChart === 'forecast' && data.salesPrediction.map((item, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                            <td className="p-2">{item.date}</td>
                            <td className="p-2">{item.actual ? `₹${item.actual}` : '-'}</td>
                            <td className="p-2">{item.predicted ? `₹${item.predicted}` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <BusinessDashboard />
      )}
    </div>
  );
};

export default Analytics;
