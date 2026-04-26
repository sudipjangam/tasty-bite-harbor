import { useState, useEffect } from "react";
import SwadeshiLoader from "@/styles/Loader/SwadeshiLoader";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import AnalyticsHeader from "@/components/Analytics/AnalyticsHeader";
import StatCards from "@/components/Analytics/StatCards";
import ChartCards from "@/components/Analytics/ChartCards";
import ExpandedChartDialog from "@/components/Analytics/ExpandedChartDialog";
import BusinessDashboard from "@/components/Analytics/BusinessDashboard";
import { HotelMetricsCards } from "@/components/Analytics/HotelMetricsCards";
import { ConsolidatedRevenueChart } from "@/components/Analytics/ConsolidatedRevenueChart";
import AIChartBuilder from "@/components/Analytics/AIChartBuilder";
import { format, subDays } from "date-fns";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { useToast } from "@/components/ui/use-toast";
import Watermark from "@/components/Layout/Watermark";
import { fetchAllowedComponents } from "@/utils/subscriptionUtils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, BarChart3, Sparkles, Building2, ChevronDown, ChevronUp } from "lucide-react";
import { useFinancialTabAccess } from "@/hooks/useFinancialTabAccess";
import { usePlanType } from "@/hooks/usePlanType";
import PlanInsightsCard from "@/components/Dashboard/PlanInsightsCard";
import { FeatureLock } from "@/components/Auth/FeatureLock";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";

const Analytics = () => {
  const { toast } = useToast();
  const { hasHotelAccess } = useFinancialTabAccess();
  const { label: planLabel } = usePlanType();

  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [showDataTable, setShowDataTable] = useState(false);
  const [analyticsView, setAnalyticsView] = useState<"charts" | "business">(
    "charts",
  );
  const [showRevenueBreakdown, setShowRevenueBreakdown] = useState(false);

  // Global date range state — default last 30 days
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Pass date range to hook
  const { data, isLoading } = useAnalyticsData(dateRange);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const { data: allowedComponents = [] } = useQuery({
    queryKey: ["allowedComponents", restaurantId],
    queryFn: () =>
      restaurantId ? fetchAllowedComponents(restaurantId) : Promise.resolve([]),
    enabled: !!restaurantId,
  });

  const hasBusinessDashboardAccess =
    allowedComponents.includes("business_dashboard");

  useEffect(() => {
    getRestaurantId();
  }, []);

  const getRestaurantId = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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

  // Use real category data from the hook, fallback to mock data if needed
  const categoryData = data?.categoryData || [
    { name: "Main Course", value: 45000, percentage: 35 },
    { name: "Appetizers", value: 25000, percentage: 19 },
    { name: "Desserts", value: 18000, percentage: 14 },
    { name: "Beverages", value: 22000, percentage: 17 },
    { name: "Specials", value: 20000, percentage: 15 },
  ];

  // Use real customer time data from database (via useAnalyticsData hook)
  const customerTimeData = data?.customerTimeData || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-purple-950 flex items-center justify-center">
        <SwadeshiLoader
          loadingText="loading"
          words={["charts", "insights", "reports", "analytics", "charts"]}
          size={200}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-purple-950 p-6">
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 transform hover:scale-[1.01] transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 rounded-2xl shadow-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                Analytics & Reports
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                No data available.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use consolidated revenue for accurate totals
  const totalRevenue = data.consolidatedRevenue?.grandTotal || 0;
  const restaurantRevenue =
    data.consolidatedRevenue?.totalRestaurantRevenue || 0;
  const hotelRevenue = data.consolidatedRevenue?.totalHotelRevenue || 0;
  const totalOrders = data.revenueStats.reduce(
    (sum, stat) => sum + stat.order_count,
    0,
  );
  const averageOrderValue =
    totalOrders > 0 ? restaurantRevenue / totalOrders : 0;

  // Calculate orders today
  const today = format(new Date(), "yyyy-MM-dd");
  const ordersToday =
    data.revenueStats.find(
      (stat) => format(new Date(stat.date), "yyyy-MM-dd") === today,
    )?.order_count || 0;

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const revenueData = data.revenueStats.map((item) => ({
        Date: format(new Date(item.date), "MMM dd, yyyy"),
        Revenue: Number(item.total_revenue).toFixed(2),
        Orders: item.order_count,
        "Average Order Value": Number(item.average_order_value).toFixed(2),
      }));

      const revenueSheet = XLSX.utils.json_to_sheet(revenueData);
      XLSX.utils.book_append_sheet(wb, revenueSheet, "Revenue");

      const customerData = data.customerInsights.map((customer) => ({
        Name: customer.customer_name,
        Visits: customer.visit_count,
        "Total Spent": Number(customer.total_spent).toFixed(2),
        "Average Order": Number(customer.average_order_value).toFixed(2),
        "First Visit": format(new Date(customer.first_visit), "MMM dd, yyyy"),
        "Last Visit": format(new Date(customer.last_visit), "MMM dd, yyyy"),
      }));

      const customerSheet = XLSX.utils.json_to_sheet(customerData);
      XLSX.utils.book_append_sheet(wb, customerSheet, "Customer Insights");

      const productData = data.topProducts.map((product) => ({
        Name: product.name,
        Orders: product.orders,
        Revenue: product.revenue.toFixed(2),
        "Profit Margin": `${product.profit_margin}%`,
        "In Stock": product.in_stock ? "Yes" : "No",
        Trend: product.trend,
      }));

      const productSheet = XLSX.utils.json_to_sheet(productData);
      XLSX.utils.book_append_sheet(wb, productSheet, "Top Products");

      const fileName = `Analytics_Report_${format(
        new Date(),
        "yyyy-MM-dd",
      )}.xlsx`;

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
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      doc.setProperties({
        title: "Business Analytics Report",
        author: "Restaurant Management System",
        creator: "Swadeshi Solutions",
        subject: "Analytics Report",
      });

      doc.setFillColor(0, 179, 167);
      doc.rect(0, 0, 210, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("BUSINESS ANALYTICS REPORT", 14, 14);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.text("Analytics Report", 14, 30);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${format(new Date(), "MMMM dd, yyyy")}`, 14, 38);

      doc.setFillColor(240, 240, 240);
      doc.rect(14, 44, 182, 30, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Performance Summary", 18, 52);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`, 18, 60);
      doc.text(`Total Orders: ${totalOrders}`, 90, 60);
      doc.text(`Average Order Value: ₹${averageOrderValue.toFixed(2)}`, 18, 68);
      doc.text(`Active Customers: ${data.customerInsights.length}`, 90, 68);

      try {
        const revenueChartElement = document.getElementById("revenue-chart");
        if (revenueChartElement) {
          const canvas = await html2canvas(revenueChartElement);
          const imgData = canvas.toDataURL("image/png");
          doc.addImage(imgData, "PNG", 14, 80, 180, 90);
          doc.text("Revenue Trend", 14, 78);
        }
      } catch (chartError) {
        console.warn("Could not add chart to PDF:", chartError);
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Revenue Data", 14, 180);

      const revenueTableColumn = [
        "Date",
        "Revenue",
        "Orders",
        "Avg Order Value",
      ];
      const revenueTableRows = data.revenueStats
        .slice(0, 10)
        .map((item) => [
          format(new Date(item.date), "MMM dd, yyyy"),
          `₹${Number(item.total_revenue).toFixed(2)}`,
          item.order_count.toString(),
          `₹${Number(item.average_order_value).toFixed(2)}`,
        ]);

      autoTable(doc, {
        head: [revenueTableColumn],
        body: revenueTableRows,
        startY: 185,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 1 },
        headStyles: { fillColor: [0, 179, 167], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      doc.addPage();

      doc.setFillColor(0, 179, 167);
      doc.rect(0, 0, 210, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("BUSINESS ANALYTICS REPORT", 14, 14);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text("Top Customer Insights", 14, 30);

      const customerTableColumn = [
        "Customer",
        "Visits",
        "Total Spent",
        "Avg Order",
      ];
      const customerTableRows = data.customerInsights
        .slice(0, 15)
        .map((item) => [
          item.customer_name,
          item.visit_count.toString(),
          `₹${Number(item.total_spent).toFixed(2)}`,
          `₹${Number(item.average_order_value).toFixed(2)}`,
        ]);

      autoTable(doc, {
        head: [customerTableColumn],
        body: customerTableRows,
        startY: 35,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 1 },
        headStyles: { fillColor: [0, 179, 167], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Powered by Swadeshi Solutions", 170, 285, { align: "right" });
        doc.setFontSize(10);
        doc.text(`Page ${i} of ${pageCount}`, 100, 285, { align: "center" });
      }

      const fileName = `Analytics_Report_${format(
        new Date(),
        "yyyy-MM-dd",
      )}.pdf`;
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

  return (
    <FeatureLock feature="reports.analytics" interceptClicks={true}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-950 dark:via-purple-950/50 dark:to-indigo-950 animate-fade-in">
      <div className="p-4 md:p-6">
        {/* Compact Header with Date Range */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 rounded-2xl shadow-xl dark:shadow-purple-500/10 p-5 mb-6">
          <AnalyticsHeader
            analyticsView={analyticsView}
            setAnalyticsView={setAnalyticsView}
            hasBusinessDashboardAccess={hasBusinessDashboardAccess}
            exportToExcel={exportToExcel}
            exportToPDF={exportToPDF}
            dateRange={dateRange}
            onDateRangeChange={(range) => {
              if (range) setDateRange(range);
            }}
          />
        </div>

        <div className="space-y-6">
          {analyticsView === "charts" ? (
            <>
              {/* Compact KPI Stats Row */}
              <StatCards
                totalRevenue={totalRevenue}
                totalOrders={totalOrders}
                ordersToday={ordersToday}
                averageOrderValue={averageOrderValue}
                restaurantRevenue={restaurantRevenue}
                hotelRevenue={hasHotelAccess ? hotelRevenue : undefined}
              />

              {/* Hotel Performance Section - Only for plans with hotel access */}
              {hasHotelAccess &&
                data.hotelMetrics &&
                data.hotelMetrics.totalRooms > 0 && (
                  <HotelMetricsCards metrics={data.hotelMetrics} />
                )}

              {/* Collapsible Revenue Breakdown Chart */}
              {data.consolidatedRevenue && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowRevenueBreakdown(!showRevenueBreakdown)}
                  >
                    {showRevenueBreakdown ? (
                      <ChevronUp className="h-4 w-4 mr-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-1" />
                    )}
                    {showRevenueBreakdown ? "Hide" : "Show"} Revenue Breakdown Chart
                  </Button>
                  {showRevenueBreakdown && (
                    <ConsolidatedRevenueChart
                      data={data.consolidatedRevenue}
                      showHotelData={hasHotelAccess}
                    />
                  )}
                </div>
              )}

              {/* Chart Widgets Grid */}
              <ChartCards
                filteredData={data.revenueStats}
                categoryData={categoryData}
                customerTimeData={customerTimeData}
                topProducts={data.topProducts}
                salesPrediction={data.salesPrediction}
                setExpandedChart={setExpandedChart}
                orders={data.recentOrders}
                menuItems={data.menuItems}
              />

              {/* AI Custom Chart Builder */}
              <AIChartBuilder
                orders={data.recentOrders}
                menuItems={data.menuItems}
                revenueStats={data.revenueStats}
                customerInsights={data.customerInsights}
                topProducts={data.topProducts}
                dateRange={dateRange}
              />

              <ExpandedChartDialog
                expandedChart={expandedChart}
                setExpandedChart={setExpandedChart}
                showDataTable={showDataTable}
                setShowDataTable={setShowDataTable}
                filteredData={data.revenueStats}
                categoryData={categoryData}
                customerTimeData={customerTimeData}
                topProducts={data.topProducts}
                salesPrediction={data.salesPrediction}
                orders={data.recentOrders}
                menuItems={data.menuItems}
              />
            </>
          ) : (
            <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 transform hover:scale-[1.01] transition-all duration-300">
              <BusinessDashboard />
            </div>
          )}
        </div>
      </div>
    </div>
    </FeatureLock>
  );
};

export default Analytics;
