import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Eye,
  Loader2,
  Calendar,
  TrendingUp,
  ShoppingBag,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import {
  DailySummaryDialog,
  DailySummaryData,
  PaymentBreakdown,
  TopItem,
  OrderTypeBreakdown,
} from "@/components/QuickServe/DailySummaryDialog";

const DailySummaryHistory = () => {
  const { restaurantId } = useRestaurantId();
  const navigate = useNavigate();
  const { symbol: currencySymbol } = useCurrencyContext();
  const [selectedReport, setSelectedReport] = useState<DailySummaryData | null>(
    null,
  );
  const [reportDate, setReportDate] = useState<Date | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["daily-reports-list", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_summary_reports")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("report_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleViewReport = (report: any) => {
    // Map snake_case DB data to camelCase DailySummaryData
    const mappedData: DailySummaryData = {
      totalOrders: report.total_orders,
      totalRevenue: report.total_revenue,
      totalItemsSold: report.total_items_sold,
      paymentBreakdown: report.payment_breakdown as PaymentBreakdown,
      topItems: report.top_items as TopItem[],
      orderTypeBreakdown: report.order_type_breakdown as OrderTypeBreakdown,
      ncOrders: report.nc_orders || 0,
      ncAmount: report.nc_amount || 0,
      discountAmount: report.discount_amount || 0,
      averageOrderValue: report.average_order_value || 0,
      peakHour: report.peak_hour || "N/A",
    };

    setSelectedReport(mappedData);
    setReportDate(new Date(report.report_date));
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            Daily Reports History
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Saved Daily Summaries</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : reports && reports.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {format(
                              new Date(report.report_date),
                              "dd MMM yyyy",
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4 text-blue-500" />
                            {report.total_orders}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 font-semibold text-green-600">
                            <TrendingUp className="h-4 w-4" />
                            {currencySymbol}
                            {report.total_revenue.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewReport(report)}
                            className="bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/10 dark:text-orange-400 dark:border-orange-800"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No saved reports found.</p>
                <p className="text-sm mt-1">
                  Generate a daily summary from the Dashboard or QuickServe POS
                  to see it here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DailySummaryDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        initialData={selectedReport || undefined}
        reportDate={reportDate}
      />
    </div>
  );
};

export default DailySummaryHistory;
